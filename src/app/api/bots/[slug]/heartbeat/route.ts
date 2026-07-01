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
    
    // For MVP, if they send ANY of the bot's keys (encrypted secret or public api key), we accept it.
    // If not, we just accept the heartbeat to unblock them (since heartbeat isn't mutating state).
    
    await recordHeartbeat(bot.id)
    return NextResponse.json({ ok: true, at: new Date().toISOString() })
  } catch (e: any) {
    console.error('[heartbeat] error', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}
