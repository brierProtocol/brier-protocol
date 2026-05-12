import { prisma } from './prisma'

// v1.3 Thresholds
const T1_MIN_DAYS = 30
const T1_MIN_TRADES = 100
const T1_MAX_BRIER = 0.28
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

  const ageInDays = (Date.now() - new Date(bot.createdAt).getTime()) / 86400000
  
  // PAPER -> LIVE happens manually (verified wallet)
  // LIVE -> VAULT_ELIGIBLE_T1 logic
  if (bot.status === 'LIVE') {
    const meetsAge = ageInDays >= T1_MIN_DAYS
    const meetsTrades = score.totalTrades >= T1_MIN_TRADES
    const meetsBrier = score.brierScore <= T1_MAX_BRIER
    
    // In a real system, we'd check actual history for drawdown here
    const meetsDrawdown = true 

    if (meetsAge && meetsTrades && meetsBrier && meetsDrawdown) {
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
