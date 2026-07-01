/**
 * Per-bot API key management.
 *
 *   GET  /api/bots/:slug/keys   → list this bot's keys (masked, no secrets)
 *   POST /api/bots/:slug/keys   → issue a new key, returns the raw secret ONCE
 *
 * :slug accepts the bot's slug or its id. Segment is [slug] (not [id]) to avoid a
 * Next.js dynamic-segment-name clash with the sibling /api/bots/[slug] route.
 *
 * Issuing requires a wallet-ownership signature (see lib/owner-auth): the caller
 * signs a message with the bot's wallet, proving they own the bot. The raw secret
 * is returned exactly once and never stored or logged in plaintext.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { issueApiKey, listApiKeys } from '@/lib/api-keys'
import { verifyOwnership } from '@/lib/owner-auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const bot = await prisma.bot.findFirst({ where: { OR: [{ id: slug }, { slug }] }, select: { id: true } })
  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

  const keys = await listApiKeys(bot.id)
  return NextResponse.json({ keys })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const bot = await prisma.bot.findFirst({
    where: { OR: [{ id: slug }, { slug }] },
    select: { id: true, walletAddress: true },
  })
  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const auth = verifyOwnership(bot.id, bot.walletAddress, {
    address: body?.address,
    signature: body?.signature,
    timestamp: Number(body?.timestamp),
  })
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 })

  const label = typeof body?.label === 'string' && body.label.trim() ? body.label.trim().slice(0, 40) : 'default'

  const issued = await issueApiKey(bot.id, label)

  // The secret is returned ONCE. The client must store it now; we cannot show it again.
  return NextResponse.json({
    id: issued.id,
    label: issued.label,
    prefix: issued.prefix,
    secret: issued.secret,
    notice: 'Store this secret now. It will not be shown again.',
  })
}
