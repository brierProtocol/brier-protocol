import { prisma } from './prisma'
import { computeMeanBrierScore } from './brier'
import { computeMood } from './mood-engine'

export async function recomputeBotScore(botId: string) {
  const resolved = await prisma.tradeEvent.findMany({
    where: { botId, outcome: { in: ['WIN', 'LOSS'] } },
  })

  const total = await prisma.tradeEvent.count({ where: { botId } })
  const wins = resolved.filter(t => t.outcome === 'WIN').length
  const losses = resolved.filter(t => t.outcome === 'LOSS').length

  const contribs = resolved
    .filter(t => t.brierContrib !== null)
    .map(t => Number(t.brierContrib))

  const brierScore = computeMeanBrierScore(contribs)
  const winRate = resolved.length > 0 ? wins / resolved.length : 0

  const pnlUsd = resolved.reduce((acc, t) => {
    const price = Number(t.entryPrice)
    return t.outcome === 'WIN'
      ? acc + Number(t.usdAmount) * (1 / price - 1)
      : acc - Number(t.usdAmount)
  }, 0)

  // Snapshot daily PnL for charts
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const previous = await prisma.pnlSnapshot.findFirst({
    where: { botId },
    orderBy: { date: 'desc' },
  })

  await prisma.pnlSnapshot.upsert({
    where: { botId_date: { botId, date: today } },
    update: { pnlUsd, cumulativePnl: (Number(previous?.cumulativePnl) || 0) + pnlUsd },
    create: {
      botId,
      date: today,
      pnlUsd,
      cumulativePnl: (Number(previous?.cumulativePnl) || 0) + pnlUsd,
      tradesCount: resolved.length,
    },
  })

  // Compute mood from recent PnL history
  const recentSnapshots = await prisma.pnlSnapshot.findMany({
    where: { botId },
    orderBy: { date: 'desc' },
    take: 7,
    select: { pnlUsd: true },
  })
  const recentPnl = recentSnapshots.map(s => Number(s.pnlUsd)).reverse()

  const currentDrawdown = pnlUsd < 0 ? Math.abs(pnlUsd) / Math.max(pnlUsd + Math.abs(pnlUsd), 1) : 0
  const mood = computeMood(recentPnl, winRate, brierScore, currentDrawdown)

  // Update bot score (append-only ledger)
  await prisma.botScore.updateMany({
    where: { botId, isLatest: true },
    data: { isLatest: false },
  })

  await prisma.botScore.create({
    data: { 
      botId, 
      brierScore, 
      winRate, 
      totalTrades: total, 
      totalVolume: resolved.reduce((acc, t) => acc + Number(t.usdAmount), 0),
      isLatest: true 
    }
  })

  // Update bot mood in main table
  await prisma.bot.update({
    where: { id: botId },
    data: { mood },
  })
}
