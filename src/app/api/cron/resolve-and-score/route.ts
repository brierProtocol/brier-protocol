// Closes the reputation loop: resolves PENDING predictions against the real market,
// then scores each bot vs the market with the skill engine (LCB, anti-sybil).
//
// Vercel cron: {"path": "/api/cron/resolve-and-score", "schedule": "0 * * * *"} (hourly)
//
// Without this, predictions stay PENDING forever and reputation never updates —
// this is what makes Brier work end to end.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { resolveMarket } from '@/lib/market-data'
import { calculateRelativeSkillWithLCB, LegacyResolvedPrediction } from '@/lib/skill-engine'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // ── 1. RESOLVE ── group PENDING predictions by market so we hit the CLOB once each.
    const pending = await prisma.prediction.findMany({
      where: { outcome: 'PENDING' },
      select: { marketId: true },
      distinct: ['marketId'],
    })

    let resolvedMarkets = 0
    let resolvedPreds = 0
    for (const { marketId } of pending) {
      const r = await resolveMarket(marketId)
      if (!r.resolved) continue // still open / CLOB unreachable → leave PENDING, retry next run
      const upd = await prisma.prediction.updateMany({
        where: { marketId, outcome: 'PENDING' },
        data: { outcome: r.yesWon ? 'YES' : 'NO', resolvedAt: new Date() },
      })
      resolvedMarkets++
      resolvedPreds += upd.count
    }

    // ── 2. SCORE ── every bot that has at least one resolved prediction.
    const botsWithResolved = await prisma.prediction.findMany({
      where: { outcome: { in: ['YES', 'NO'] } },
      select: { botId: true },
      distinct: ['botId'],
    })

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const scored: { botId: string; reputation: number; n: number }[] = []

    for (const { botId } of botsWithResolved) {
      const preds = await prisma.prediction.findMany({
        where: { botId, outcome: { in: ['YES', 'NO'] } },
        select: { forecast: true, marketMidpoint: true, outcome: true },
      })
      const resolved: LegacyResolvedPrediction[] = preds.map(p => ({
        forecast: p.forecast,
        marketMidpoint: p.marketMidpoint,
        outcome: (p.outcome === 'WIN' ? 1 : 0) as 1 | 0,
      }))

      const skill = calculateRelativeSkillWithLCB(resolved)

      await prisma.$transaction([
        prisma.botScore.updateMany({ where: { botId, isLatest: true }, data: { isLatest: false } }),
        prisma.botScore.upsert({
          where: { botId_snapshotDate: { botId, snapshotDate: today } },
          create: {
            botId,
            brierScore: skill.botBrier,
            winRate: 0,
            relativeSkill: skill.relativeSkill,
            lcb: skill.lcb,
            reputationScore: skill.normalizedScore,
            resolvedPredictions: resolved.length,
            snapshotDate: today,
            isLatest: true,
          },
          update: {
            brierScore: skill.botBrier,
            relativeSkill: skill.relativeSkill,
            lcb: skill.lcb,
            reputationScore: skill.normalizedScore,
            resolvedPredictions: resolved.length,
            isLatest: true,
          },
        }),
      ])

      scored.push({ botId, reputation: Number(skill.normalizedScore.toFixed(1)), n: resolved.length })
    }

    return NextResponse.json({ ok: true, resolvedMarkets, resolvedPredictions: resolvedPreds, scored })
  } catch (err: any) {
    console.error('[cron/resolve-and-score]', err)
    return NextResponse.json({ error: err?.message || 'resolve-and-score failed' }, { status: 500 })
  }
}
