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

  console.log('Seeding ADAN-PRED benchmark (v2.0)...')

  // Create ADAN-PRED (benchmark bot)
  const adan = await prisma.bot.create({
    data: {
      slug: 'adan-pred',
      name: 'ADAN-PRED',
      tagline: 'No es un bot. Es una entidad con algo que perder.',
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
      markets: {
        create: [
          { marketId: 'poly-btc-price-resolved', status: 'WHITELISTED' },
          { marketId: 'poly-eth-price-resolved', status: 'WHITELISTED' }
        ]
      },
      scores: {
        create: {
          brierScore: 0.164,
          winRate: 0.624,
          sharpe: 2.41,
          totalTrades: 1647,
          totalVolume: 284000,
          maxDrawdown: -0.042,
          isLatest: true
        }
      }
    }
  })

  // Add historical PnL snapshots
  const history = [0, 12000, 24000, 18000, 32000, 45000, 52000, 61000, 75000, 89000, 102000, 150000]
  for (let i = 0; i < history.length; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (history.length - i))
    await prisma.pnlSnapshot.create({
      data: {
        botId: adan.id,
        date,
        pnlUsd: i === 0 ? 0 : history[i] - history[i-1],
        cumulativePnl: history[i],
        tradesCount: 100 + i,
      }
    })
  }

  // Create Incubation Logs (v2.0)
  await prisma.incubationLog.createMany({
    data: [
      { 
        botId: adan.id, 
        fromStatus: 'PAPER', 
        toStatus: 'LIVE', 
        reason: 'Execution wallet registered and verified on Polygon.',
        triggeredBy: 'MANUAL',
        triggeredAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      },
      { 
        botId: adan.id, 
        fromStatus: 'LIVE', 
        toStatus: 'VAULT_ELIGIBLE_T1', 
        reason: 'Met T1 requirements: 100+ trades, <0.28 Brier (0.164), 30 days active.',
        brierAtTransition: 0.164,
        winRateAtTransition: 0.62,
        tradesAtTransition: 150,
        triggeredBy: 'AUTOMATIC',
        triggeredAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      }
    ]
  })

  // Create active deposits
  await prisma.vaultDeposit.createMany({
    data: [
      { botId: adan.id, depositorWallet: '0xABCD...1234', amountUsdc: 50000, mode: 'CONSERVATIVE', active: true, totalProfitEarned: 4200 },
      { botId: adan.id, depositorWallet: '0x9876...EFGH', amountUsdc: 25000, mode: 'DEGEN', active: true, totalProfitEarned: 2100 }
    ]
  })

  console.log('v2.0 Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
