import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding adan-pred data...')
  
  // 1. Create or update the bot
  const bot = await prisma.bot.upsert({
    where: { slug: 'adan-pred' },
    update: {},
    create: {
      slug: 'adan-pred',
      name: 'ADAN',
      status: 'LIVE',
      description: 'Autonomous Decentralized Alpha Network. A generalized crypto-quant agent predicting on high-liquidity Polymarket events.',
      pfpUrl: 'https://cdn.stamp.fyi/avatar/eth:0x87d6f8eeec5c73bb006a88db641e73998b36d0b3?s=300',
      walletAddress: '0x1234567890123456789012345678901234567890',
      vaultOpen: true,
      currentTVL: 245000,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    }
  })

  // 2. Clear old scores and predictions to avoid duplicates on multiple runs
  await prisma.botScore.deleteMany({ where: { botId: bot.id } })
  await prisma.prediction.deleteMany({ where: { botId: bot.id } })
  await prisma.pnlSnapshot.deleteMany({ where: { botId: bot.id } })

  // 3. Create mock historical scores for the LCB chart (last 30 days)
  const scores = []
  const pnlSnapshots = []
  let currentLcb = 0.05
  let currentBrier = 0.22
  let currentWinRate = 0.65
  let currentPnl = 0

  
  for (let i = 30; i >= 0; i--) {
    // Add some random walk for the chart
    currentLcb = Math.max(0, currentLcb + (Math.random() * 0.04 - 0.015))
    currentBrier = Math.max(0.1, currentBrier + (Math.random() * 0.02 - 0.01))
    currentWinRate = Math.min(1, Math.max(0.4, currentWinRate + (Math.random() * 0.04 - 0.02)))
    currentPnl += (Math.random() * 800 - 200) // general upward trend
    
    const snapshotDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000)

    scores.push({
      botId: bot.id,
      brierScore: currentBrier,
      winRate: currentWinRate,
      sharpe: 1.5 + Math.random(),
      maxDrawdown: -(0.05 + Math.random() * 0.1),
      totalTrades: 120 + (30 - i) * 2,
      totalVolume: 50000 + (30 - i) * 5000,
      lcb: currentLcb,
      snapshotDate
    })

    pnlSnapshots.push({
      botId: bot.id,
      date: snapshotDate,
      pnlUsd: currentPnl,
      cumulativePnl: currentPnl,
      tradesCount: 120 + (30 - i) * 2
    })
  }
  await prisma.botScore.createMany({ data: scores })
  await prisma.pnlSnapshot.createMany({ data: pnlSnapshots })

  // 4. Create mock predictions for the order book
  const categories = ['Crypto', 'Politics', 'Macro', 'Sports']
  const predictions = []
  
  for (let i = 0; i < 40; i++) {
    const isResolved = i > 5 // first 5 are pending
    const isWin = Math.random() > 0.4
    const category = categories[Math.floor(Math.random() * categories.length)]
    
    predictions.push({
      botId: bot.id,
      builderId: bot.walletAddress,
      marketId: `0x${Math.random().toString(16).slice(2, 10)}`,
      conditionId: `0x${Math.random().toString(16).slice(2, 10)}`,
      marketTitle: `${category} Market: Will ${['BTC hit $100k', 'ETH flip BTC', 'Trump win', 'Fed cut rates', 'Argentina win Copa America'][Math.floor(Math.random() * 5)]}?`,
      side: Math.random() > 0.5 ? 'YES' : 'NO',
      confidence: 0.5 + (Math.random() * 0.4), // 0.5 to 0.9
      marketProbabilityAtCommit: 0.5,
      status: isResolved ? (isWin ? 'WIN' : 'LOSS') : 'PENDING',
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 10 * 24 * 60 * 60 * 1000))
    })
  }
  
  // Sort by timestamp desc to make it realistic
  predictions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  await prisma.prediction.createMany({ data: predictions })

  console.log('Successfully seeded adan-pred with mock LCB history and predictions!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
