import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { snapshotAllEquity } from '@/lib/equity'

// POST /api/cron/snapshot-equity — daily job that stamps every investor's portfolio
// (balance/invested/pnl) so the dashboard equity curve + EST. APY read from history.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  try {
    const count = await snapshotAllEquity()
    await prisma.cronLog.create({
      data: { job: 'snapshot_equity', status: 'SUCCESS', recordsProcessed: count, durationMs: Date.now() - startedAt },
    })
    return NextResponse.json({ ok: true, snapshotted: count })
  } catch (err: any) {
    await prisma.cronLog.create({
      data: { job: 'snapshot_equity', status: 'FAILED', errorMessage: err?.message ?? 'unknown', durationMs: Date.now() - startedAt },
    }).catch(() => {})
    console.error('[cron/snapshot-equity] error', err)
    return NextResponse.json({ error: 'snapshot failed' }, { status: 500 })
  }
}
