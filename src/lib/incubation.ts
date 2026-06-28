import { prisma } from './db/prisma'
import { FEATURES } from './features'

/**
 * Bot status state machine — Tier-1 (T1) promotion.
 *
 * Flow:  PAPER ──(manual, verified wallet)──► LIVE ──(meets ALL T1 gates)──►
 *        VAULT_ELIGIBLE_T1  (tier = TIER1, auto-deploys the on-chain clone vault)
 *
 * A LIVE bot graduates to T1 only when it clears EVERY gate below: enough
 * resolved trades, a low-enough Brier (proven edge), a bounded drawdown, AND a
 * minimum time in the shadow phase (so a lucky 1-day streak can't graduate).
 * checkStatusTransitions() is the single place that performs this transition.
 */

// v1.4 T1 thresholds
const T1_MIN_TRADES = 50
const T1_MAX_BRIER = 0.20
const T1_MAX_DRAWDOWN = 0.25       // máx 25% de drawdown histórico
const SHADOW_MIN_DAYS = 7          // mínimo 1 semana en fase shadow antes de habilitar vault
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

  // PAPER -> LIVE happens manually (verified wallet)
  // LIVE -> VAULT_ELIGIBLE_T1 logic
  // v1: capital layer disabled — reputation builds but no vault is created
  if (!FEATURES.CAPITAL_LAYER && bot.status === 'LIVE') {
    return // Reputation-only mode: bot stays LIVE, vault promotion is skipped
  }
  if (bot.status === 'LIVE') {
    const meetsTrades = score.totalTrades >= T1_MIN_TRADES
    const meetsBrier = score.brierScore <= T1_MAX_BRIER

    // Drawdown real: maxDrawdown se guarda como % negativo (p.ej. -0.18 = -18%).
    const meetsDrawdown = Math.abs(score.maxDrawdown) <= T1_MAX_DRAWDOWN

    // Tiempo mínimo en shadow: al menos SHADOW_MIN_DAYS desde la creación del bot.
    const daysInShadow = (Date.now() - bot.createdAt.getTime()) / MS_PER_DAY
    const meetsTime = daysInShadow >= SHADOW_MIN_DAYS

    if (meetsTrades && meetsBrier && meetsDrawdown && meetsTime) {
      // Deploy the bot's on-chain clone vault (no-op/null if factory not configured yet).
      let vaultAddress: string | null = null
      if (!bot.vaultAddress) {
        const { createVaultForBot } = await import('./vault-factory')
        vaultAddress = await createVaultForBot({
          id: bot.id, slug: bot.slug, name: bot.name, walletAddress: bot.walletAddress, vaultCap: 500000,
        })
      }

      await prisma.$transaction([
        prisma.bot.update({
          where: { id: botId },
          data: {
            status: 'VAULT_ELIGIBLE_T1',
            tier: 'TIER1',
            vaultCap: 500000,
            ...(vaultAddress ? { vaultAddress } : {}),
          }
        }),
        prisma.incubationLog.create({
          data: {
            botId,
            fromStatus: 'LIVE',
            toStatus: 'VAULT_ELIGIBLE_T1',
            reason: `Met T1 requirements: ${score.totalTrades} trades, ${score.brierScore.toFixed(3)} Brier, ${(Math.abs(score.maxDrawdown) * 100).toFixed(1)}% max DD, ${daysInShadow.toFixed(1)}d in shadow.${vaultAddress ? ` Vault: ${vaultAddress}` : ''}`,
            brierAtTransition: score.brierScore,
            winRateAtTransition: score.winRate,
            tradesAtTransition: score.totalTrades,
          }
        })
      ])
    }
  }
}
