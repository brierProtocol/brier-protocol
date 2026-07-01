import { prisma } from './db/prisma'
import { FEATURES } from './features'
import { SHADOW_RESOLVED_TARGET, SHADOW_DAYS_TARGET, SHADOW_BRIER_TARGET } from './botProgress'

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

  if (!FEATURES.CAPITAL_LAYER && bot.status === 'LIVE') return

  if (bot.status === 'LIVE') {
    const meetsTrades = score.totalTrades >= SHADOW_RESOLVED_TARGET
    const meetsLcb = score.brierScore !== null && score.brierScore <= SHADOW_BRIER_TARGET
    const meetsDrawdown = Math.abs(score.maxDrawdown) <= T1_MAX_DRAWDOWN
    const daysInShadow = (Date.now() - bot.createdAt.getTime()) / MS_PER_DAY
    const meetsTime = daysInShadow >= SHADOW_DAYS_TARGET

    if (meetsTrades && meetsLcb && meetsDrawdown && meetsTime) {
      let vaultAddress: string | null = null
      if (!bot.vaultAddress) {
        const { createVaultForBot } = await import('./vault-factory')
        vaultAddress = await createVaultForBot({
          id: bot.id, slug: bot.slug, name: bot.name, walletAddress: bot.walletAddress, vaultCap: 500000,
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
            status: 'VAULT_ELIGIBLE_T1', tier: 'TIER1', vaultCap: 500000,
            ...(vaultAddress ? { vaultAddress } : {}),
          }
        }),
        prisma.incubationLog.create({
          data: {
            botId, fromStatus: 'LIVE', toStatus: 'VAULT_ELIGIBLE_T1',
            reason: `Met T1 requirements: ${score.totalTrades} trades, LCB ${score.lcb?.toFixed(3)}, ${(Math.abs(score.maxDrawdown) * 100).toFixed(1)}% max DD, ${daysInShadow.toFixed(1)}d in shadow.${vaultAddress ? ` Vault: ${vaultAddress}` : ''}`,
            brierAtTransition: score.lcb ?? 0,
            winRateAtTransition: score.winRate,
            tradesAtTransition: score.totalTrades,
          }
        })
      ])
    }
  }
}
