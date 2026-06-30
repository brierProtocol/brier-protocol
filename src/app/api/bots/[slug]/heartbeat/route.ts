import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { recordHeartbeat } from '@/lib/heartbeat'

// POST /api/bots/[slug]/heartbeat — liveness ping from the bot/executor.
// Stamps Bot.lastHeartbeatAt = now so the dashboard can flag stale bots (§2.2).
// Same shared-secret auth as the other executor-facing ingestion endpoints.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const key = req.headers.get('x-brier-key')
    if (!process.env.BOT_INGEST_KEY || key !== process.env.BOT_INGEST_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slug } = await params
    const bot = await prisma.bot.findUnique({ where: { slug }, select: { id: true } })
    if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

    await recordHeartbeat(bot.id)
    return NextResponse.json({ ok: true, at: new Date().toISOString() })
  } catch (e: any) {
    console.error('[heartbeat] error', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}
