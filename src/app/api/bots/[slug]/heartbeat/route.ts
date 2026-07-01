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

    let liveActivity: string | undefined
    let liveConstraints: string | undefined
    
    // Parse body if present
    try {
      const text = await req.text()
      if (text) {
        const body = JSON.parse(text)
        liveActivity = body.activity
        liveConstraints = body.constraints
      }
    } catch (e) {
      // Ignore body parse errors for backward compatibility
    }

    await recordHeartbeat(bot.id, liveActivity, liveConstraints)
    return NextResponse.json({ ok: true, at: new Date().toISOString() })
  } catch (e: any) {
    console.error('[heartbeat] error', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}
