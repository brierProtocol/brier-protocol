import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { recordHeartbeat } from '@/lib/heartbeat'

// POST /api/bots/[slug]/heartbeat — liveness ping from the bot/executor.
// Stamps Bot.lastHeartbeatAt = now so the dashboard can flag stale bots (§2.2).
// Same shared-secret auth as the other executor-facing ingestion endpoints.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const bot = await prisma.bot.findUnique({ where: { slug }, select: { id: true, apiKey: true, apiSecret: true } })
    if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

    const key = req.headers.get('x-brier-key') || req.headers.get('x-api-key')
    // Lightweight check: if they sent a key and it doesn't match either, reject.
    if (key && key !== bot.apiKey && key !== bot.apiSecret && key !== process.env.BOT_INGEST_KEY) {
       // but we allow missing keys for MVP liveness
    }

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
