import { prisma } from './db/prisma'
import { FEATURES } from './features'
import { SHADOW_RESOLVED_TARGET, SHADOW_DAYS_TARGET, SHADOW_LCB_TARGET } from './botProgress'
import { computeVaultCapacity } from './vault-capacity'

const T1_MAX_DRAWDOWN = 0.25
const MS_PER_DAY = 1000 * 60 * 60 * 24

export async function checkStatusTransitions(botId: string) {
  const bot = await prisma.bot.findUniqueOrThrow({
    where: { id: botId },
    include: {
      scores: { where: { isLatest: true }, take: 1 },
      incubationLogs: { orderBy: { triggeredAt: 'desc' }, take: 1 }
    }
  })

  const score = bot.scores[0]
  if (!score) return

  const meetsTrades = score.totalTrades >= SHADOW_RESOLVED_TARGET
  const meetsLcb = score.lcb !== null && score.lcb > SHADOW_LCB_TARGET
  const meetsDrawdown = Math.abs(score.maxDrawdown) <= T1_MAX_DRAWDOWN
  const daysInShadow = (Date.now() - bot.createdAt.getTime()) / MS_PER_DAY
  const meetsTime = daysInShadow >= SHADOW_DAYS_TARGET
  const gatePassed = meetsTrades && meetsLcb && meetsDrawdown && meetsTime

  // PAPER → LIVE: reputation-only promotion, independent of the capital layer.
  // Without this edge a registered bot stays PAPER forever no matter how well it
  // predicts (the vault gate below only ever evaluated bots already LIVE).
  if (bot.status === 'PAPER') {
    if (!gatePassed) return
    await prisma.$transaction([
      prisma.bot.update({ where: { id: botId }, data: { status: 'LIVE' } }),
      prisma.incubationLog.create({
        data: {
          botId, fromStatus: 'PAPER', toStatus: 'LIVE',
          reason: `Shadow gate passed: ${score.totalTrades} resolved, LCB ${score.lcb?.toFixed(3)}, ${(Math.abs(score.maxDrawdown) * 100).toFixed(1)}% max DD, ${daysInShadow.toFixed(1)}d in shadow.`,
          brierAtTransition: score.lcb ?? 0,
          winRateAtTransition: score.winRate,
          tradesAtTransition: score.totalTrades,
        }
      })
    ])
    return
  }

  if (!FEATURES.CAPITAL_LAYER && bot.status === 'LIVE') return

  if (bot.status === 'LIVE') {
    if (gatePassed) {
      // Capacity is derived from what the bot has PROVEN (reputation, sample size,
      // liquidity of the markets it actually trades), capped by whatever the maker
      // declared at registration. Replaces the old hardcoded 500k.
      const liqAgg = await prisma.prediction.aggregate({
        where: { botId, liquidity: { gt: 0 } },
        _avg: { liquidity: true },
      })
      const computed = computeVaultCapacity({
        reputationScore: score.reputationScore,
        resolvedPredictions: score.totalTrades,
        avgMarketLiquidityUsd: liqAgg._avg.liquidity,
      })
      const vaultCap = bot.vaultCap > 0 ? Math.min(computed, bot.vaultCap) : computed

      let vaultAddress: string | null = null
      if (!bot.vaultAddress) {
        const { createVaultForBot } = await import('./vault-factory')
        vaultAddress = await createVaultForBot({
          id: bot.id, slug: bot.slug, name: bot.name, walletAddress: bot.walletAddress, vaultCap,
        })

        // MVP Fix: If Vault deployment fails on-chain, do not graduate the bot to a phantom state.
        // Returning here ensures the cron will attempt to deploy it again in the next tick.
        if (!vaultAddress) {
            console.error(`[Incubation] Vault deployment failed for bot ${botId}. Aborting transition.`);
            return;
        }
      }

      await prisma.$transaction([
        prisma.bot.update({
          where: { id: botId },
          data: {
            status: 'VAULT_ELIGIBLE_T1', tier: 'TIER1', vaultCap,
            ...(vaultAddress ? { vaultAddress } : {}),
          }
        }),
        prisma.incubationLog.create({
          data: {
            botId, fromStatus: 'LIVE', toStatus: 'VAULT_ELIGIBLE_T1',
            reason: `Met T1 requirements: ${score.totalTrades} trades, LCB ${score.lcb?.toFixed(3)}, ${(Math.abs(score.maxDrawdown) * 100).toFixed(1)}% max DD, ${daysInShadow.toFixed(1)}d in shadow. Cap $${vaultCap.toLocaleString()}.${vaultAddress ? ` Vault: ${vaultAddress}` : ''}`,
            brierAtTransition: score.lcb ?? 0,
            winRateAtTransition: score.winRate,
            tradesAtTransition: score.totalTrades,
          }
        })
      ])
    }
  }
}
