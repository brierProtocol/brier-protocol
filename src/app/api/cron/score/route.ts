import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkStatusTransitions } from '@/lib/incubation'
import { events } from '@/lib/events/bus'
import { recordCronRun, captureError } from '@/lib/observability'
import { botReputation, absoluteBotBrier, reputationScoreFromLcb, ResolvedPrediction } from '@/lib/skill-engine'

const BATCH_SIZE = 25
const RESOLVED = ['WIN', 'LOSS']

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  try {
    const bots = await prisma.bot.findMany({
      where: { status: { in: ['PAPER', 'LIVE', 'VAULT_ELIGIBLE_T1', 'VAULT_ELIGIBLE_T2'] } },
      select: { id: true, slug: true, status: true },
    })

    const results: { bot: string; lcb: number; trades: number }[] = []

    for (const batch of chunk(bots, BATCH_SIZE)) {
      const ids = batch.map(b => b.id)

      const predictions = await prisma.prediction.findMany({
        where: { botId: { in: ids }, status: { in: RESOLVED } },
        select: { botId: true, confidence: true, marketProbabilityAtCommit: true, status: true, liquidity: true },
      })

      const byBot = new Map<string, ResolvedPrediction[]>()
      for (const p of predictions) {
        if (p.status === 'VOID') continue;
        const resolvedP: ResolvedPrediction = {
          pBot: p.confidence,
          pMarket: p.marketProbabilityAtCommit,
          outcome: p.status === 'WIN' ? 1 : 0,
          liquidity: p.liquidity
        };
        const list = byBot.get(p.botId)
        if (list) list.push(resolvedP)
        else byBot.set(p.botId, [resolvedP])
      }

      const batchResults = await Promise.all(batch.map(async bot => {
        const botPreds = byBot.get(bot.id) || []
        if (botPreds.length === 0) return null

        const rep = botReputation(botPreds)
        // brierScore = Brier ABSOLUTO (0..1, mayor=peor) para el circuit-breaker y el
        // gate; relativeSkill/lcb = skill vs mercado; reputationScore = 0..100 del LCB.
        const absBrier = absoluteBotBrier(botPreds)
        const repScore = reputationScoreFromLcb(rep.lcb)
        const winRate = botPreds.length > 0 ? botPreds.filter(p => p.outcome === 1).length / botPreds.length : 0

        await prisma.$transaction([
          prisma.botScore.updateMany({ where: { botId: bot.id, isLatest: true }, data: { isLatest: false } }),
          prisma.botScore.upsert({
            where: { botId_snapshotDate: { botId: bot.id, snapshotDate: today } },
            create: {
              botId: bot.id,
              brierScore: absBrier,
              winRate: winRate,
              sharpe: 0, 
              maxDrawdown: 0,
              totalTrades: rep.n,
              totalVolume: 0,
              relativeSkill: rep.skill,
              lcb: rep.lcb,
              reputationScore: repScore, 
              resolvedPredictions: rep.n,
              snapshotDate: today, isLatest: true,
            },
            update: {
              brierScore: absBrier,
              winRate: winRate,
              totalTrades: rep.n,
              relativeSkill: rep.skill,
              lcb: rep.lcb,
              reputationScore: repScore,
              resolvedPredictions: rep.n,
              isLatest: true,
            },
          }),
        ])

        await events.scoreUpdated(bot.id, {
          brierScore: rep.skill, winRate: winRate, sharpe: 0,
          totalTrades: rep.n, status: bot.status,
        }).catch(() => {})
        await checkStatusTransitions(bot.id).catch(() => {})

        return { bot: bot.slug, lcb: Number(rep.lcb.toFixed(4)), trades: rep.n }
      }))

      for (const r of batchResults) if (r) results.push(r)
    }

    await recordCronRun('score', 'SUCCESS', { records: results.length })
    return NextResponse.json({ ok: true, scored: results.length, results })
  } catch (err: any) {
    captureError(err, { cron: 'score' })
    await recordCronRun('score', 'FAILED', { error: err?.message })
    return NextResponse.json({ error: 'score cron failed' }, { status: 500 })
  }
}
