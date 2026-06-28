// Recomputes every bot's BotScore from its RESOLVED on-chain trades, then runs
// tier-promotion logic. This is the real Brier scoring loop (replaces seeded scores).
//
// Vercel cron: {"path": "/api/cron/score", "schedule": "0 * * * *"}  (hourly)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { computeBotMetrics } from '@/lib/score-engine'
import { checkStatusTransitions } from '@/lib/incubation'
import { events } from '@/lib/events/bus'
import { recordCronRun, captureError } from '@/lib/observability'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: { bot: string; brier: number; trades: number; status?: string }[] = []

  try {
    const bots = await prisma.bot.findMany({
      where: { status: { in: ['PAPER', 'LIVE', 'VAULT_ELIGIBLE_T1', 'VAULT_ELIGIBLE_T2'] } },
      select: { id: true, slug: true, status: true },
    })

    for (const bot of bots) {
      // Pull this bot's resolved trades.
      const trades = await prisma.tradeEvent.findMany({
        where: { botId: bot.id, outcome: { in: ['WIN', 'LOSS', 'LIQUIDATED'] } },
        select: { entryPrice: true, outcome: true, amount: true },
      })

      if (trades.length === 0) continue

      const m = computeBotMetrics(trades)

      // Single latest snapshot per bot per day: flip old, upsert today's.
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)

      await prisma.$transaction([
        prisma.botScore.updateMany({ where: { botId: bot.id, isLatest: true }, data: { isLatest: false } }),
        prisma.botScore.upsert({
          where: { botId_snapshotDate: { botId: bot.id, snapshotDate: today } },
          create: {
            botId: bot.id,
            brierScore: m.brierScore,
            winRate: m.winRate,
            sharpe: m.sharpe,
            maxDrawdown: m.maxDrawdown,
            totalTrades: m.totalTrades,
            totalVolume: m.totalVolume,
            snapshotDate: today,
            isLatest: true,
          },
          update: {
            brierScore: m.brierScore,
            winRate: m.winRate,
            sharpe: m.sharpe,
            maxDrawdown: m.maxDrawdown,
            totalTrades: m.totalTrades,
            totalVolume: m.totalVolume,
            isLatest: true,
          },
        }),
      ])

      // Emit ScoreUpdated into the event bus (best-effort, never blocks scoring).
      await events.scoreUpdated(bot.id, {
        brierScore: m.brierScore,
        winRate: m.winRate,
        sharpe: m.sharpe,
        totalTrades: m.totalTrades,
        status: bot.status,
      })

      // Promotion (LIVE -> VAULT_ELIGIBLE_T1, etc.)
      await checkStatusTransitions(bot.id).catch(() => {})

      results.push({ bot: bot.slug, brier: Number(m.brierScore.toFixed(4)), trades: m.totalTrades })
    }

    await recordCronRun('score', 'SUCCESS', { records: results.length })
    return NextResponse.json({ ok: true, scored: results.length, results })
  } catch (err: any) {
    captureError(err, { cron: 'score' })
    await recordCronRun('score', 'FAILED', { error: err?.message })
    return NextResponse.json({ error: err?.message || 'score cron failed' }, { status: 500 })
  }
}
