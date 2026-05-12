import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Cleaning database (v2.0)...')
  await prisma.vaultDeposit.deleteMany()
  await prisma.incubationLog.deleteMany()
  await prisma.tradeEvent.deleteMany()
  await prisma.botScore.deleteMany()
  await prisma.pnlSnapshot.deleteMany()
  await prisma.botMarket.deleteMany()
  await prisma.polyConnection.deleteMany()
  await prisma.kalshiConnection.deleteMany()
  await prisma.bot.deleteMany()

  console.log('Seeding Institutional Fleet (v2.0 English)...')

  const botsToSeed = [
    {
      slug: 'adan-pred',
      name: 'ADAN-PRED',
      tagline: 'Not just a bot. An entity with skin in the game.',
      color: '#FF6B35',
      mood: 'cool',
      status: 'VAULT_ELIGIBLE_T1',
      tier: 'TIER1',
      description: 'ADAN-PRED v8.5: The benchmark intelligence layer. 24 integrated quant concepts, 4-voter ensemble, and Platt-calibrated Brier scores.',
      walletAddress: '0x1234567890123456789012345678901234567890',
      skinInGame: 15000, 
      vaultCap: 500000,
      currentTVL: 284000,
      vaultOpen: true,
      brier: 0.164,
      wr: 0.624,
      sharpe: 2.41,
      trades: 1647,
      vol: 284000,
      dd: -0.042
    },
    {
      slug: 'hermes-q',
      name: 'HERMES-Q',
      tagline: 'Speed is truth. Latency is the enemy of alpha.',
      color: '#7B2FFF',
      mood: 'cool',
      status: 'VAULT_ELIGIBLE_T1',
      tier: 'TIER1',
      description: 'Exploits market microstructure inefficiencies. Order flow analysis and liquidity shift detection.',
      walletAddress: '0x8888888888888888888888888888888888888888',
      skinInGame: 25000,
      vaultCap: 1000000,
      currentTVL: 512000,
      vaultOpen: true,
      brier: 0.152,
      wr: 0.671,
      sharpe: 2.87,
      trades: 2741,
      vol: 512000,
      dd: -0.038
    },
    {
      slug: 'atlas-core',
      name: 'ATLAS-CORE',
      tagline: 'Mapping the topology of probability space.',
      color: '#00C2FF',
      mood: 'neutral',
      status: 'LIVE',
      tier: 'NONE',
      description: 'Statistical arbitrage across correlated event markets. Multi-dimensional probability mapping.',
      walletAddress: '0x7777777777777777777777777777777777777777',
      skinInGame: 10000,
      vaultCap: 250000,
      currentTVL: 198000,
      vaultOpen: false,
      brier: 0.198,
      wr: 0.583,
      sharpe: 1.94,
      trades: 1922,
      vol: 198000,
      dd: -0.061
    }
  ]

  for (const b of botsToSeed) {
    const bot = await prisma.bot.create({
      data: {
        slug: b.slug,
        name: b.name,
        tagline: b.tagline,
        color: b.color,
        mood: b.mood,
        status: b.status,
        tier: b.tier,
        description: b.description,
        walletAddress: b.walletAddress,
        skinInGame: b.skinInGame,
        vaultCap: b.vaultCap,
        currentTVL: b.currentTVL,
        vaultOpen: b.vaultOpen,
        scores: {
          create: {
            brierScore: b.brier,
            winRate: b.wr,
            sharpe: b.sharpe,
            totalTrades: b.trades,
            totalVolume: b.vol,
            maxDrawdown: b.dd,
            isLatest: true
          }
        }
      }
    })

    // Create 30 days of PnL snapshots
    const history = Array.from({ length: 30 }, (_, i) => (b.vol / 2) + Math.random() * (b.vol / 2))
    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (30 - i))
      await prisma.pnlSnapshot.create({
        data: {
          botId: bot.id,
          date,
          pnlUsd: Math.random() * 1000,
          cumulativePnl: history[i],
          tradesCount: Math.floor(b.trades / 30) * i
        }
      })
    }
  }

  console.log('v2.0 Institutional Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
