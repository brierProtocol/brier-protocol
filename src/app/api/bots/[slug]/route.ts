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
      markets: true,
      scores: { where: { isLatest: true }, take: 1 },
      pnlSnapshots: {
        orderBy: { date: 'asc' },
        take: 30,
        select: { date: true, cumulativePnl: true }
      },
      trades: {
        orderBy: { timestamp: 'desc' },
        take: 20
      },
      incubationLogs: {
        orderBy: { triggeredAt: 'desc' }
      }
    }
  })

  if (!bot) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const score = bot.scores[0]

  const result = {
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
    brierScore: Number(score?.brierScore || 0),
    winRate: Number(score?.winRate || 0),
    sharpe: Number(score?.sharpe || 0),
    maxDrawdown: Number(score?.maxDrawdown || 0),
    trades: score?.totalTrades || 0,
    volume: Number(score?.totalVolume || 0),
    pnlHistory: bot.pnlSnapshots.map(s => Number(s.cumulativePnl)),
    recentTrades: bot.trades.map(t => ({
      id: t.id,
      market: t.marketTitle,
      result: t.outcome,
      direction: t.side,
      odds: t.entryPrice,
      pnl: t.brierContrib || 0,
      time: t.timestamp.toISOString()
    })),
    incubationLogs: bot.incubationLogs.map(l => ({
      from: l.fromStatus,
      to: l.toStatus,
      reason: l.reason,
      time: l.triggeredAt.toISOString(),
      brier: l.brierAtTransition,
      wr: l.winRateAtTransition
    })),
    markets: bot.markets.map(m => m.marketId),
    strategyType: bot.strategyType,
    description: bot.description,
    platformFee: 3 // Stream 1: 3% carry
  }

  return NextResponse.json(result)
}
