import { prisma } from './prisma'
import { FEATURES } from './features'

// v1.4 Thresholds
const T1_MIN_TRADES = 50
const T1_MAX_BRIER = 0.20
const T1_MAX_DRAWDOWN = 0.25

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

    // maxDrawdown is stored as a negative fraction (e.g. -0.18 = -18%).
    // A bot graduates only if its worst drawdown is within the T1 ceiling.
    const meetsDrawdown = Math.abs(score.maxDrawdown) <= T1_MAX_DRAWDOWN

    if (meetsTrades && meetsBrier && meetsDrawdown) {
      await prisma.$transaction([
        prisma.bot.update({ 
          where: { id: botId }, 
          data: { status: 'VAULT_ELIGIBLE_T1', tier: 'TIER1', vaultCap: 500000 } 
        }),
        prisma.incubationLog.create({
          data: {
            botId,
            fromStatus: 'LIVE',
            toStatus: 'VAULT_ELIGIBLE_T1',
            reason: `Met T1 requirements: ${score.totalTrades} trades, ${score.brierScore.toFixed(3)} Brier Score.`,
          }
        })
      ])
    }
  }
}
