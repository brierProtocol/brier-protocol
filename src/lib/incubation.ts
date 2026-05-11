import { prisma } from './prisma'

const MIN_DAYS = 30
const MIN_TRADES = 50
const DRAWDOWN_LOCK = 0.30

export async function checkIncubationThreshold(botId: string) {
  const bot = await prisma.bot.findUniqueOrThrow({
    where: { id: botId },
    include: { scores: { where: { isLatest: true }, take: 1 } }
  })

  if (bot.status !== 'INCUBATING') return

  const score = bot.scores[0]
  if (!score) return

  const ageInDays = (Date.now() - new Date(bot.createdAt).getTime()) / 86400000
  const meetsAge = ageInDays >= MIN_DAYS
  const meetsTrades = score.resolvedTrades >= MIN_TRADES

  if (meetsAge && meetsTrades) {
    await prisma.$transaction([
      prisma.bot.update({ where: { id: botId }, data: { status: 'PENDING' } }),
      prisma.incubationLog.create({
        data: {
          botId,
          event: 'THRESHOLD_MET',
          fromStatus: 'INCUBATING',
          toStatus: 'PENDING',
          reason: `Age: ${ageInDays.toFixed(1)}d | Trades: ${score.resolvedTrades} | WR: ${(Number(score.winRate) * 100).toFixed(1)}% | Brier: ${Number(score.brierScore).toFixed(3)}`,
          triggeredBy: 'SYSTEM',
        }
      })
    ])
  }
}

export async function checkDrawdownLock(botId: string, currentTvl: number, peakTvl: number) {
  if (peakTvl === 0) return
  const drawdown = (peakTvl - currentTvl) / peakTvl
  if (drawdown < DRAWDOWN_LOCK) return

  const bot = await prisma.bot.findUniqueOrThrow({ where: { id: botId } })
  if (bot.status === 'PAUSED') return

  await prisma.$transaction([
    prisma.bot.update({ where: { id: botId }, data: { status: 'PAUSED' } }),
    prisma.incubationLog.create({
      data: {
        botId,
        event: 'DRAWDOWN_LOCK',
        fromStatus: bot.status,
        toStatus: 'PAUSED',
        reason: `Drawdown ${(drawdown * 100).toFixed(1)}% exceeded ${DRAWDOWN_LOCK * 100}% threshold. Vault locked. Depositor redemption queued.`,
        triggeredBy: 'SYSTEM',
      }
    })
  ])
}
