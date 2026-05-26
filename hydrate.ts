import { PrismaClient } from '@prisma/client'
import { bots } from './src/data/bots'

const prisma = new PrismaClient()

async function main() {
  console.log('Surgical wipe and sync...')
  await prisma.comment.deleteMany()
  await prisma.vaultDeposit.deleteMany()
  await prisma.incubationLog.deleteMany()
  await prisma.tradeEvent.deleteMany()
  await prisma.botScore.deleteMany()
  await prisma.pnlSnapshot.deleteMany()
  await prisma.botMarket.deleteMany()
  await prisma.polyConnection.deleteMany()
  await prisma.kalshiConnection.deleteMany()
  await prisma.bot.deleteMany()

  for (const b of bots) {
    await prisma.bot.create({
      data: {
        id: b.id, // FORCE ID MATCH
        slug: b.id,
        name: b.name,
        tagline: b.tagline,
        color: b.color,
        mood: b.mood,
        status: b.status,
        tier: b.tier,
        description: b.description,
        walletAddress: b.builder,
        skinInGame: b.vaultCap * 0.05,
        vaultCap: b.vaultCap,
        currentTVL: b.tvl,
        vaultOpen: true,
        scores: {
          create: {
            brierScore: b.brierScore,
            winRate: b.winRate,
            sharpe: b.sharpe || 1.0,
            totalTrades: b.trades,
            totalVolume: b.tvl,
            maxDrawdown: b.maxDrawdown,
            isLatest: true
          }
        }
      }
    })
  }

  console.log('Surgical sync complete. Database perfectly matches mock data.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
