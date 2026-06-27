import { prisma } from './db/prisma'
import {
  SHADOW_RESOLVED_TARGET,
  SHADOW_DAYS_TARGET,
  SHADOW_BRIER_TARGET,
} from './botProgress'

/**
 * Bot status state machine — Tier-1 (T1) promotion.
 *
 * Flow:  PAPER ──(manual, verified wallet)──► LIVE ──(meets ALL T1 gates)──►
 *        VAULT_ELIGIBLE_T1  (tier = TIER1, auto-deploys the on-chain clone vault)
 *
 * A LIVE bot graduates to T1 only when it clears EVERY gate below: enough
 * resolved trades, a low-enough Brier (proven edge), a bounded drawdown, AND a
 * minimum time in the shadow phase (so a lucky streak can't graduate).
 * checkStatusTransitions() is the single place that performs this transition.
 *
 * The resolved/Brier/days gates are imported from botProgress.ts (CEO rule:
 * 100 resolved, Brier <= 0.20, 21 days live) so the graduation logic and the
 * UI readiness bars can NEVER drift apart.
 */

// v1.5 T1 thresholds — alineados con la visión del producto (100 predicciones / 21 días)
const T1_MIN_TRADES = 100         // mínimo 100 predicciones resueltas (era 50)
const T1_MAX_BRIER = 0.20
const T1_MAX_DRAWDOWN = 0.25       // máx 25% de drawdown histórico
const SHADOW_MIN_DAYS = 21         // mínimo 21 días en fase shadow antes de habilitar vault (era 7)
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
  if (bot.status === 'LIVE') {
    const meetsTrades = score.totalTrades >= SHADOW_RESOLVED_TARGET
    const meetsBrier = score.brierScore <= SHADOW_BRIER_TARGET

    // Drawdown real: maxDrawdown se guarda como % negativo (p.ej. -0.18 = -18%).
    const meetsDrawdown = Math.abs(score.maxDrawdown) <= T1_MAX_DRAWDOWN

    // Tiempo mínimo en shadow: al menos SHADOW_DAYS_TARGET desde la creación del bot.
    const daysInShadow = (Date.now() - bot.createdAt.getTime()) / MS_PER_DAY
    const meetsTime = daysInShadow >= SHADOW_DAYS_TARGET

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
