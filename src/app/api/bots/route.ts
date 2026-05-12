import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = (searchParams.get('status') || 'LIVE') as any
  const sort = searchParams.get('sort') || 'brier'
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)
  const cursor = searchParams.get('cursor')

  const [bots, total] = await Promise.all([
    prisma.bot.findMany({
      where: { status },
      take: limit + 1, // Fetch one extra to get next cursor
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      include: {
        markets: true,
        scores: { where: { isLatest: true }, take: 1 },
        pnlSnapshots: {
          orderBy: { date: 'asc' },
          take: 30,
          select: { date: true, cumulativePnl: true }
        }
      },
      orderBy: sort === 'newest' ? { createdAt: 'desc' } : undefined
    }),
    prisma.bot.count({ where: { status } })
  ])

  let nextCursor: string | null = null
  if (bots.length > limit) {
    const nextItem = bots.pop()
    nextCursor = nextItem?.id || null
  }

  // Map to frontend Bot interface with v1.3 Composite Score
  const mapped = bots.map(bot => {
    const score = bot.scores[0]
    const brier = Number(score?.brierScore || 0)
    const wr = Number(score?.winRate || 0)
    const sharpe = Number(score?.sharpe || 0)
    const volume = Number(score?.totalVolume || 0)

    // Composite Score calculation (weights from v1.3)
    // Normalize brier: target < 0.25. 1.0 = brier of 0, 0.0 = brier of 0.5+
    const normBrier = Math.max(0, 1 - (brier / 0.5))
    // Normalize volume: let's assume 100k is a "full score" volume for T1
    const normVolume = Math.min(1, volume / 100000)

    const compositeScore = (
      (0.40 * normBrier) +
      (0.30 * wr) +
      (0.20 * Math.min(1, sharpe / 4)) + // Sharpe 4.0 = 100%
      (0.10 * normVolume)
    )

    return {
      id: bot.slug,
      name: bot.name,
      tagline: bot.tagline,
      color: bot.color,
      mood: bot.mood,
      status: bot.status, 
      tier: bot.tier,
      walletAddress: bot.walletAddress,
      skinInGame: bot.skinInGame,
      vaultCap: bot.vaultCap,
      tvl: bot.currentTVL,
      vaultOpen: bot.vaultOpen,
      brierScore: brier,
      winRate: wr,
      sharpe: sharpe,
      trades: score?.totalTrades || 0,
      volume: volume,
      pnlHistory: bot.pnlSnapshots.map(s => Number(s.cumulativePnl)),
      markets: bot.markets.map(m => m.marketId),
      strategyType: bot.strategyType,
      description: bot.description,
      compositeScore,
      platformFee: 3 // Stream 1: 3% carry
    }
  })

  // Final Sort
  const sorted = mapped.sort((a, b) => {
    if (sort === 'rank' || sort === 'brier') return b.compositeScore - a.compositeScore
    if (sort === 'wr') return b.winRate - a.winRate
    if (sort === 'newest') return 0 // Already handled by Prisma
    return b.compositeScore - a.compositeScore
  })

  return NextResponse.json({
    data: sorted,
    nextCursor,
    total
  })
}
