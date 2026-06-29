import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { resolveMarket } from '@/lib/market-data'
import { botReputation, ResolvedPrediction } from '@/lib/skill-engine'
import { checkStatusTransitions } from '@/lib/incubation'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // ── 1. RESOLVE ── group PENDING predictions by market so we hit the CLOB once each.
    const pending = await prisma.prediction.findMany({
      where: { status: 'PENDING' },
      select: { marketId: true },
      distinct: ['marketId'],
    })

    let resolvedMarkets = 0
    let resolvedPreds = 0
    for (const { marketId } of pending) {
      const r = await resolveMarket(marketId)
      if (!r.resolved) continue // still open / CLOB unreachable
      const upd = await prisma.prediction.updateMany({
        where: { marketId, status: 'PENDING' },
        data: { status: r.yesWon ? 'WIN' : 'LOSS', resolution: r.yesWon ? 'YES' : 'NO' },
      })
      resolvedMarkets++
      resolvedPreds += upd.count
    }

    // ── 2. SCORE ── every bot that has at least one resolved prediction.
    const botsWithResolved = await prisma.prediction.findMany({
      where: { status: { in: ['WIN', 'LOSS'] } },
      select: { botId: true },
      distinct: ['botId'],
    })

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const scored: { botId: string; lcb: number; n: number }[] = []

    for (const { botId } of botsWithResolved) {
      const preds = await prisma.prediction.findMany({
        where: { botId, status: { in: ['WIN', 'LOSS'] } },
        select: { confidence: true, marketProbabilityAtCommit: true, status: true, liquidity: true },
      })
      
      const resolved: ResolvedPrediction[] = preds.map(p => ({
        pBot: p.confidence,
        pMarket: p.marketProbabilityAtCommit,
        outcome: (p.status === 'WIN' ? 1 : 0) as 1 | 0,
        liquidity: p.liquidity,
      }))

      const rep = botReputation(resolved)
      const winRate = resolved.length > 0 ? resolved.filter(p => p.outcome === 1).length / resolved.length : 0

      await prisma.$transaction([
        prisma.botScore.updateMany({ where: { botId, isLatest: true }, data: { isLatest: false } }),
        prisma.botScore.upsert({
          where: { botId_snapshotDate: { botId, snapshotDate: today } },
          create: {
            botId,
            brierScore: rep.skill,
            winRate: winRate,
            relativeSkill: rep.skill,
            lcb: rep.lcb,
            reputationScore: rep.skill,
            resolvedPredictions: rep.n,
            totalTrades: rep.n,
            snapshotDate: today,
            isLatest: true,
          },
          update: {
            brierScore: rep.skill,
            winRate: winRate,
            relativeSkill: rep.skill,
            lcb: rep.lcb,
            reputationScore: rep.skill,
            resolvedPredictions: rep.n,
            totalTrades: rep.n,
            isLatest: true,
          },
        }),
      ])
      
      await checkStatusTransitions(botId).catch(() => {})

      scored.push({ botId, lcb: Number(rep.lcb.toFixed(4)), n: rep.n })
    }

    return NextResponse.json({ ok: true, resolvedMarkets, resolvedPredictions: resolvedPreds, scored })
  } catch (err: any) {
    console.error('[cron/resolve-and-score]', err)
    return NextResponse.json({ error: err?.message || 'resolve-and-score failed' }, { status: 500 })
  }
}
