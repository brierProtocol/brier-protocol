// Builder console data: every bot THIS wallet deployed, with real capital + PnL.
// Distinct from /api/dashboard (the depositor view). No invented numbers — a bot
// with no PnL history reports pnl=null ("awaiting"), not a fake figure.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

const ACTIVE = ['LIVE', 'VAULT_ELIGIBLE_T1', 'VAULT_ELIGIBLE_T2']

export async function GET(req: NextRequest) {
  const address = new URL(req.url).searchParams.get('address')
  if (!address) {
    return NextResponse.json({ error: 'Address query parameter is required' }, { status: 400 })
  }

  try {
    const bots = await prisma.bot.findMany({
      where: { walletAddress: { equals: address, mode: 'insensitive' } },
      include: {
        scores: { where: { isLatest: true }, take: 1 },
        pnlSnapshots: { orderBy: { date: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (bots.length === 0) {
      return NextResponse.json({
        totalValue: 0, netPnl: 0, activeBots: 0, managedCapital: 0, botCount: 0,
        equitySeries: [], bots: [],
      })
    }

    // Per-bot shape.
    const shaped = bots.map(b => {
      const score = b.scores[0]
      const snaps = b.pnlSnapshots
      const latestPnl = snaps.length ? snaps[snaps.length - 1].cumulativePnl : null
      return {
        id: b.id,
        slug: b.slug,
        name: b.name,
        pfpUrl: b.pfpUrl,
        color: b.color,
        eyeShape: b.eyeShape,
        avatarId: b.avatarId,
        status: b.status,
        tier: b.tier,
        vaultOpen: b.vaultOpen,
        vaultAddress: b.vaultAddress,
        currentTVL: b.currentTVL,
        vaultCap: b.vaultCap,
        brierScore: score && score.brierScore > 0 ? score.brierScore : null,
        winRate: score && score.totalTrades > 0 ? score.winRate : null,
        sharpe: score && score.sharpe !== 0 ? score.sharpe : null,
        resolvedTrades: score?.totalTrades ?? 0,
        pnl: latestPnl,
        // Compact series for the row sparkline (cumulative PnL over time).
        pnlSeries: snaps.map(s => s.cumulativePnl),
      }
    })

    // Aggregates.
    const totalValue = shaped.reduce((a, b) => a + (b.currentTVL || 0), 0)
    const netPnl = shaped.reduce((a, b) => a + (b.pnl || 0), 0)
    const managedCapital = shaped.filter(b => b.vaultOpen).reduce((a, b) => a + (b.currentTVL || 0), 0)
    const activeBots = shaped.filter(b => ACTIVE.includes(b.status)).length

    // Aggregate equity curve: sum each bot's cumulative PnL by date.
    const byDate = new Map<string, number>()
    for (const b of bots) {
      for (const s of b.pnlSnapshots) {
        const key = s.date.toISOString().slice(0, 10)
        byDate.set(key, (byDate.get(key) || 0) + s.cumulativePnl)
      }
    }
    const equitySeries = [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ date, value }))

    return NextResponse.json({
      totalValue, netPnl, activeBots, managedCapital, botCount: shaped.length,
      equitySeries, bots: shaped,
    })
  } catch (err: any) {
    console.error('[api/dashboard/builder]', err)
    return NextResponse.json({ error: 'Failed to fetch builder dashboard' }, { status: 500 })
  }
}
