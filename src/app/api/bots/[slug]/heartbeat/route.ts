import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { decryptApiKey } from '@/lib/crypto'
import { recordHeartbeat } from '@/lib/heartbeat'
import { log } from '@/lib/observability'

// POST /api/bots/[slug]/heartbeat — liveness ping from the bot (e.g. ADAN).
// Stamps Bot.lastHeartbeatAt = now so the dashboard can flag stale bots and
// show the live activity ticker. Auth: a VALID key is required — the bot's own
// apiKey (legacy), a full bk_live_ secret (ApiKey table), or the shared
// BOT_INGEST_KEY. The body writes liveActivity/liveConstraints straight into
// the profile UI, so an unauthenticated ping would let anyone inject content
// onto someone else's bot.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const key = req.headers.get('x-brier-key') || req.headers.get('x-api-key')
    if (!key) {
      return NextResponse.json({ error: 'Missing API key (x-brier-key or x-api-key)' }, { status: 401 })
    }

    // Identify the bot by its API KEY first (the credential the page issues), and
    // fall back to the slug only for the shared ingest key. As long as the key is
    // right, the heartbeat lands on the correct bot regardless of the slug — kills
    // the whole class of "wrong slug -> 404 -> offline" bugs.
    let bot = await prisma.bot.findFirst({ where: { apiKey: key }, select: { id: true } })

    // New-style keys (bk_live_..., ApiKey table): locate by public 16-char prefix,
    // then verify the FULL secret. Prefix-only matching let anyone who saw a prefix
    // spoof liveness and write activity text onto the bot's profile.
    if (!bot && key.startsWith('bk_live_')) {
      const row = await prisma.apiKey.findUnique({
        where: { prefix: key.slice(0, 16) },
        select: { botId: true, revokedAt: true, encryptedKey: true, keyIv: true, keyAuthTag: true },
      })
      if (row && !row.revokedAt) {
        try {
          const secret = decryptApiKey(row.encryptedKey, row.keyIv, row.keyAuthTag)
          const a = Buffer.from(secret)
          const b = Buffer.from(key)
          if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
            bot = await prisma.bot.findUnique({ where: { id: row.botId }, select: { id: true } })
          }
        } catch { /* undecryptable key row — treat as no match */ }
      }
    }

    // Shared ingest key: trusted internal caller, bot identified by slug.
    if (!bot && process.env.BOT_INGEST_KEY && key === process.env.BOT_INGEST_KEY) {
      bot = await prisma.bot.findUnique({ where: { slug }, select: { id: true } })
    }

    if (!bot) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
  } catch (e) {
    log('error', 'bots.heartbeat', { message: e instanceof Error ? e.message : String(e), code: (e as any)?.code })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
