/**
 * POST /api/bots/:slug/starter — assemble the ready-to-run bot starter zip.
 *
 * The client sends the credentials it just received from the keys endpoint
 * (secret shown once, held in browser memory); this route only packages them
 * together with the bundled SDK and an example bot. Nothing is read from or
 * written to the database, and no secret is stored or logged.
 */
import { NextRequest, NextResponse } from 'next/server'
import { buildZip } from '@/lib/zip'
import { starterFiles } from '@/lib/bot-starter'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { botId, apiKey, baseUrl } = (body ?? {}) as { botId?: string; apiKey?: string; baseUrl?: string }

  if (!botId || typeof botId !== 'string') {
    return NextResponse.json({ error: 'botId is required' }, { status: 400 })
  }
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('bk_live_')) {
    return NextResponse.json({ error: 'apiKey must be your bk_live_ secret' }, { status: 400 })
  }

  const safeSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60) || 'my-bot'
  const origin =
    typeof baseUrl === 'string' && /^https?:\/\/[\w.:-]+$/.test(baseUrl) ? baseUrl : req.nextUrl.origin

  const zip = buildZip(starterFiles({ slug: safeSlug, botId, apiKey, baseUrl: origin }))

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeSlug}-brier-bot.zip"`,
      'Cache-Control': 'no-store',
    },
  })
}
