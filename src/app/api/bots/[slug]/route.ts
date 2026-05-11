import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const bot = await prisma.bot.findUnique({
    where: { slug },
    include: {
      scores: { where: { isLatest: true }, take: 1 },
      pnlSnapshots: {
        orderBy: { date: 'asc' },
        take: 30,
        select: { date: true, cumulativePnl: true }
      }
    }
  })

  if (!bot) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const result = {
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
    tvl: 0,
    builderCarry: bot.builderCarry,
    pnlHistory: bot.pnlSnapshots.map(s => Number(s.cumulativePnl)),
    markets: typeof bot.markets === 'string' ? bot.markets.split(',').map(m => m.trim()) : bot.markets,
    strategyType: bot.strategyType,
    description: bot.description,
  }

  return NextResponse.json(result)
}
