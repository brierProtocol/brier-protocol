import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { recordHeartbeat } from '@/lib/heartbeat'

// POST /api/bots/[slug]/heartbeat — liveness ping (+ optional live telemetry).
//
// Auth: the bot is identified by its per-bot API KEY (header x-api-key, or
// x-brier-key for existing agents), NOT by the [slug] in the URL. This makes the
// beat name-independent: renaming a bot, or any slug/name mismatch on the agent
// side, never 404s or mis-routes the heartbeat. Absent/unknown key => 401.
//
// This is a low-stakes liveness + display-string endpoint, so it uses per-bot key
// resolution rather than the full HMAC scheme that guards the money/data path
// (predictions/commit). The [slug] is informational only.
export async function POST(req: NextRequest) {
  try {
    const key = req.headers.get('x-api-key') || req.headers.get('x-brier-key')
    if (!key) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
    }

    // Identify the bot by its key, not the URL slug (name-independent).
    const bot = await prisma.bot.findUnique({ where: { apiKey: key }, select: { id: true } })
    if (!bot) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    // Optional live telemetry piggy-backed on the beat: what the bot is doing now
    // and its current risk constraints. Missing/invalid body => plain liveness beat.
    let activity: string | undefined
    let constraints: string | undefined
    try {
      const body = await req.json()
      if (body && typeof body === 'object') {
        if (typeof body.activity === 'string') activity = body.activity
        if (typeof body.constraints === 'string') constraints = body.constraints
      }
    } catch {
      /* empty or non-JSON body — treat as a bare liveness ping */
    }

    await recordHeartbeat(bot.id, activity, constraints)
    return NextResponse.json({ ok: true, at: new Date().toISOString() })
  } catch (e: any) {
    console.error('[heartbeat] error', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}
