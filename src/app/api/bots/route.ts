import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'LIVE'
  const sort = searchParams.get('sort') || 'brier'

  const bots = await prisma.bot.findMany({
    where: { status: status as any },
    include: {
      scores: { where: { isLatest: true }, take: 1 },
      pnlSnapshots: {
        orderBy: { date: 'asc' },
        take: 30,
        select: { date: true, cumulativePnl: true }
      }
    }
  })

  // Sort
  const sorted = bots.sort((a, b) => {
    const sa = a.scores[0]
    const sb = b.scores[0]
    if (!sa || !sb) return 0
    if (sort === 'brier') return Number(sa.brierScore) - Number(sb.brierScore)
    if (sort === 'wr') return Number(sb.winRate) - Number(sa.winRate)
    if (sort === 'tvl') return 0  // TVL comes from vault contract later
    return 0
  })

  // Map to frontend Bot interface
  const result = sorted.map(bot => ({
    id: bot.slug,
    name: bot.name,
    builder: bot.builderAddress,
    tagline: bot.tagline,
    color: bot.color,
    mood: bot.mood,
    status: bot.status.toLowerCase(),
    brierScore: Number(bot.scores[0]?.brierScore || 0),
    winRate: Number(bot.scores[0]?.winRate || 0),
    wins: bot.scores[0]?.wins || 0,
    losses: bot.scores[0]?.losses || 0,
    trades: bot.scores[0]?.totalTrades || 0,
    tvl: 0,  // TODO: from vault contract
    builderCarry: bot.builderCarry,
    pnlHistory: bot.pnlSnapshots.map(s => Number(s.cumulativePnl)),
    markets: typeof bot.markets === 'string' ? bot.markets.split(',').map(m => m.trim()) : bot.markets,
    strategyType: bot.strategyType,
    description: bot.description,
  }))

  return NextResponse.json(result)
}
