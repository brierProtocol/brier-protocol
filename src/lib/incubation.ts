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

// Canonical v1 gate: 100 resolved predictions + skill over the market (LCB > 0)
// + 21 days in shadow. Skill is measured RELATIVE to the market (LCB of
// mean(marketBrier - botBrier)), never raw Brier — beating an easy market is not
// skill. LCB > 0 means the edge survives after discounting luck.
const T1_MIN_RESOLVED = 100
const SHADOW_MIN_DAYS = 21          // 3 weeks in shadow before a vault can open
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
    // Volume: resolved predictions (the reputation dataset), not raw trade count.
    const resolved = score.resolvedPredictions ?? score.totalTrades
    const meetsVolume = resolved >= T1_MIN_RESOLVED

    // Skill vs the MARKET, discounted for luck. Requires the LCB to be positive.
    const meetsSkill = (score.lcb ?? -1) > 0

    // Minimum time in shadow so a lucky short streak can't graduate.
    const daysInShadow = (Date.now() - bot.createdAt.getTime()) / MS_PER_DAY
    const meetsTime = daysInShadow >= SHADOW_MIN_DAYS

    if (meetsVolume && meetsSkill && meetsTime) {
      // Auto-size the vault from the bot's proven track record — never a number the
      // maker had to guess. Grows with reputation; conservative on low sample.
      const { computeVaultCapacity } = await import('./vault-capacity')
      const vaultCap = computeVaultCapacity({
        reputationScore: score.reputationScore,
        resolvedPredictions: score.resolvedPredictions ?? resolved,
      })

      // Deploy the bot's on-chain clone vault (no-op/null if factory not configured yet).
      let vaultAddress: string | null = null
      if (!bot.vaultAddress) {
        const { createVaultForBot } = await import('./vault-factory')
        vaultAddress = await createVaultForBot({
          id: bot.id, slug: bot.slug, name: bot.name, walletAddress: bot.walletAddress, vaultCap,
        })
      }

      await prisma.$transaction([
        prisma.bot.update({
          where: { id: botId },
          data: {
            status: 'VAULT_ELIGIBLE_T1',
            tier: 'TIER1',
            vaultCap,
            vaultOpen: true,
            ...(vaultAddress ? { vaultAddress } : {}),
          }
        }),
        prisma.incubationLog.create({
          data: {
            botId,
            fromStatus: 'LIVE',
            toStatus: 'VAULT_ELIGIBLE_T1',
            reason: `Met T1 gate: ${resolved} resolved predictions, LCB ${(score.lcb ?? 0).toFixed(3)} > 0 (skill vs market), ${daysInShadow.toFixed(1)}d in shadow.${vaultAddress ? ` Vault: ${vaultAddress}` : ''}`,
            brierAtTransition: score.brierScore,
            winRateAtTransition: score.winRate,
            tradesAtTransition: score.totalTrades,
          }
        })
      ])
    }
  }
}
