const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const bot = await prisma.bot.findUnique({ where: { slug: 'adan-pred' } })
  if (!bot) {
    console.error("Bot adan-pred no encontrado.")
    return
  }

  console.log("Limpiando datos viejos para adan-pred...")
  await prisma.prediction.deleteMany({ where: { botId: bot.id } })
  await prisma.botScore.deleteMany({ where: { botId: bot.id } })
  await prisma.pnlSnapshot.deleteMany({ where: { botId: bot.id } })

  console.log("Insertando 45 predicciones...")
  const markets = [
    "Will Bitcoin reach $100k in 2026?", "Fed to cut rates by 25bps?", "Ethereum ETF inflows > $1B?",
    "Will Solana flip BNB by market cap?", "Inflation print below 2.5% YoY?", "Kalshi legal battle ends?"
  ]
  const preds = []
  for (let i = 0; i < 45; i++) {
    const isWin = Math.random() > 0.4
    const status = i < 35 ? (isWin ? 'WIN' : 'LOSS') : 'PENDING'
    preds.push({
      botId: bot.id,
      marketTitle: markets[i % markets.length] + ` (Vol ${i})`,
      marketUrl: "https://brier.world",
      side: Math.random() > 0.5 ? 'YES' : 'NO',
      confidence: 0.6 + Math.random() * 0.3,
      marketProbabilityAtCommit: 0.4 + Math.random() * 0.4,
      status: status,
      outcome: status,
      timestamp: new Date(Date.now() - (45 - i) * 86400000),
    })
  }
  await prisma.prediction.createMany({ data: preds })

  console.log("Insertando BotScores (LCB curve)...")
  const scores = []
  let currentLcb = 10
  for (let i = 0; i < 15; i++) {
    currentLcb += (Math.random() * 8 - 3)
    scores.push({
      botId: bot.id,
      brierScore: 0.22 - (i * 0.002),
      winRate: 0.55 + (i * 0.005),
      sharpe: 1.1 + (i * 0.02),
      lcb: Math.max(0, currentLcb),
      reputationScore: Math.min(100, currentLcb * 1.5),
      totalTrades: 10 + i * 2,
      maxDrawdown: -0.05,
      isLatest: i === 14,
      snapshotDate: new Date(Date.now() - (15 - i) * 86400000)
    })
  }
  await prisma.botScore.createMany({ data: scores })

  console.log("Insertando PnL Snapshots...")
  const pnl = []
  let cumPnl = 0
  for (let i = 0; i < 30; i++) {
    const dayPnl = (Math.random() * 20) - 8
    cumPnl += dayPnl
    pnl.push({
      botId: bot.id,
      date: new Date(Date.now() - (30 - i) * 86400000),
      pnlUsd: dayPnl,
      cumulativePnl: cumPnl,
      tradesCount: Math.floor(Math.random() * 5)
    })
  }
  await prisma.pnlSnapshot.createMany({ data: pnl })

  // Actualizar stats del bot
  await prisma.bot.update({
    where: { id: bot.id },
    data: { lastHeartbeatAt: new Date(), liveActivity: 'Evaluating SOL metrics' }
  })

  console.log("✅ ADAN rellenado con datos falsos de test para visualización.")
}

main().catch(console.error).finally(() => prisma.$disconnect())
