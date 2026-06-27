// Recomputes every bot's BotScore from its RESOLVED on-chain trades, then runs
// tier-promotion logic. This is the real Brier scoring loop (replaces seeded scores).
//
// Vercel cron: {"path": "/api/cron/score", "schedule": "0 * * * *"}  (hourly)
//
// Scale: instead of N+1 (one trade query per bot, sequential), bots are processed
// in batches — one grouped trade query per batch, then the per-bot scoring runs in
// parallel within the batch. That turns ~N sequential round-trips into N/BATCH and
// cuts wall-time so the cron fits a serverless time budget at thousands of bots.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { computeBotMetrics } from '@/lib/score-engine'
import { checkStatusTransitions } from '@/lib/incubation'
import { events } from '@/lib/events/bus'

const BATCH_SIZE = 25
const RESOLVED = ['WIN', 'LOSS', 'LIQUIDATED']

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

  // One UTC day boundary for every snapshot in this run.
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  try {
    const bots = await prisma.bot.findMany({
      where: { status: { in: ['PAPER', 'LIVE', 'VAULT_ELIGIBLE_T1', 'VAULT_ELIGIBLE_T2'] } },
      select: { id: true, slug: true, status: true },
    })

    const results: { bot: string; brier: number; trades: number }[] = []

    for (const batch of chunk(bots, BATCH_SIZE)) {
      const ids = batch.map(b => b.id)

      // ONE query for the whole batch's resolved trades (replaces the per-bot N+1).
      const trades = await prisma.tradeEvent.findMany({
        where: { botId: { in: ids }, outcome: { in: RESOLVED } },
        select: { botId: true, entryPrice: true, outcome: true, amount: true },
      })

      // Group in memory so each bot gets its own trade list.
      const byBot = new Map<string, { entryPrice: number; outcome: string; amount: number }[]>()
      for (const t of trades) {
        const list = byBot.get(t.botId)
        if (list) list.push(t)
        else byBot.set(t.botId, [t])
      }

      // Score every bot in the batch concurrently.
      const batchResults = await Promise.all(batch.map(async bot => {
        const botTrades = byBot.get(bot.id)
        if (!botTrades || botTrades.length === 0) return null

        const m = computeBotMetrics(botTrades)

        // Single latest snapshot per bot per day: flip old, upsert today's.
        await prisma.$transaction([
          prisma.botScore.updateMany({ where: { botId: bot.id, isLatest: true }, data: { isLatest: false } }),
          prisma.botScore.upsert({
            where: { botId_snapshotDate: { botId: bot.id, snapshotDate: today } },
            create: {
              botId: bot.id,
              brierScore: m.brierScore, winRate: m.winRate, sharpe: m.sharpe,
              maxDrawdown: m.maxDrawdown, totalTrades: m.totalTrades, totalVolume: m.totalVolume,
              snapshotDate: today, isLatest: true,
            },
            update: {
              brierScore: m.brierScore, winRate: m.winRate, sharpe: m.sharpe,
              maxDrawdown: m.maxDrawdown, totalTrades: m.totalTrades, totalVolume: m.totalVolume,
              isLatest: true,
            },
          }),
        ])

        // Best-effort side effects — never block or fail the scoring write.
        await events.scoreUpdated(bot.id, {
          brierScore: m.brierScore, winRate: m.winRate, sharpe: m.sharpe,
          totalTrades: m.totalTrades, status: bot.status,
        }).catch(() => {})
        await checkStatusTransitions(bot.id).catch(() => {})

        return { bot: bot.slug, brier: Number(m.brierScore.toFixed(4)), trades: m.totalTrades }
      }))

      for (const r of batchResults) if (r) results.push(r)
    }

    return NextResponse.json({ ok: true, scored: results.length, results })
  } catch (err: any) {
    console.error('[cron/score]', err)
    return NextResponse.json({ error: err?.message || 'score cron failed' }, { status: 500 })
  }
}
