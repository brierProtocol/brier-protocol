import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { recordHeartbeat } from '@/lib/heartbeat'

// POST /api/bots/[slug]/heartbeat — liveness ping from the bot (e.g. ADAN).
// Stamps Bot.lastHeartbeatAt = now so the dashboard can flag stale bots and
// show the live activity ticker. Auth: the bot's own apiKey (per-bot) or the
// shared BOT_INGEST_KEY. A missing key is tolerated for MVP liveness, but a
// WRONG key is rejected so one bot can't spoof another's heartbeat.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const key = req.headers.get('x-brier-key') || req.headers.get('x-api-key')

    // Identify the bot by its API KEY first (the credential the page issues), and
    // fall back to the slug. This way the bot NAME/slug never has to match — as long
    // as the key is right, the heartbeat lands on the correct bot. Kills the whole
    // class of "wrong slug -> 404 -> offline" bugs.
    // New-style keys (bk_live_..., ApiKey table) are matched by their public
    // 16-char prefix; legacy bot.apiKey still works.
    let bot = key ? await prisma.bot.findFirst({ where: { apiKey: key }, select: { id: true, apiKey: true } }) : null
    let matchedByNewKey = false
    if (!bot && key && key.startsWith('bk_live_')) {
      const row = await prisma.apiKey.findUnique({
        where: { prefix: key.slice(0, 16) },
        select: { botId: true, revokedAt: true },
      })
      if (row && !row.revokedAt) {
        bot = await prisma.bot.findUnique({ where: { id: row.botId }, select: { id: true, apiKey: true } })
        matchedByNewKey = !!bot
      }
    }
    if (!bot) bot = await prisma.bot.findUnique({ where: { slug }, select: { id: true, apiKey: true } })
    if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

    // If matched by slug (not key), still reject a wrong key so one bot cannot spoof another.
    if (key && !matchedByNewKey && key !== bot.apiKey && key !== process.env.BOT_INGEST_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let liveActivity: string | undefined
    let liveConstraints: string | undefined
    try {
      const text = await req.text()
      if (text) {
        const body = JSON.parse(text)
        liveActivity = typeof body.activity === 'string' ? body.activity.slice(0, 280) : undefined
        liveConstraints = typeof body.constraints === 'string' ? body.constraints.slice(0, 280) : undefined
      }
    } catch {
      // Ignore body parse errors for backward compatibility
    }

    await recordHeartbeat(bot.id, liveActivity, liveConstraints)
    return NextResponse.json({ ok: true, at: new Date().toISOString() })
  } catch (e: any) {
    console.error('[heartbeat] error', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}
