import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create ADAN-PRED
  const adan = await prisma.bot.upsert({
    where: { slug: 'adan-pred' },
    update: {},
    create: {
      slug: 'adan-pred',
      name: 'ADAN-PRED',
      builderAddress: '0x1234567890123456789012345678901234567890',
      tagline: 'No es un bot. Es una entidad con algo que perder.',
      color: '#FF6B35',
      mood: 'happy',
      status: 'LIVE',
      builderCarry: 20,
      markets: 'Kalshi, BTC, ETH, SOL',
      strategyType: 'Multi-Agent Ensemble',
      description: 'ADAN-PRED is a consciousness-driven trading entity...',
    }
  })

  // Add initial score
  await prisma.botScore.create({
    data: {
      botId: adan.id,
      brierScore: 0.164,
      winRate: 0.624,
      totalTrades: 143,
      resolvedTrades: 143,
      wins: 89,
      losses: 54,
      pnlUsd: 12847,
      isLatest: true,
    }
  })

  // Add some history
  const history = [0, 1200, 2400, 1800, 3200, 4500, 5200, 6100, 7500, 8900, 10200, 12847]
  for (let i = 0; i < history.length; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (history.length - i))
    await prisma.pnlSnapshot.create({
      data: {
        botId: adan.id,
        date,
        pnlUsd: i === 0 ? 0 : history[i] - history[i-1],
        cumulativePnl: history[i],
        tradesCount: 10 + i,
      }
    })
  }

  console.log('Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
