/**
 * POST /api/bots/publish — one-shot bot creation + key issuance.
 *
 * The simplest path: wallet signature proves ownership, bot exists, keys are issued.
 * No wizard, no multi-step flow. One call, one response: { botId, slug, apiKey }.
 *
 * Creation mirrors /api/bots/register (User upsert for the ownerWallet FK,
 * PolyConnection so the indexer watches the wallet, AgentRegistered event),
 * then issues the API key in the same request.
 *
 * The web wizard (/list-bot) is the canonical UI path and does NOT call this —
 * it goes through /api/bots/register + a separate key-issuance step. This
 * endpoint has no caller yet; it exists for the planned `npx brier publish`
 * CLI and LLM-editor flows (deploying a bot without opening a browser).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { issueApiKey } from '@/lib/api-keys'
import { verifyPublishProof } from '@/lib/owner-auth'
import { deriveAvatarColor } from '@/lib/botIdentity'
import { events } from '@/lib/events/bus'
import { log } from '@/lib/observability'
import crypto from 'node:crypto'

const isUniqueClash = (err: unknown) => (err as { code?: string } | null)?.code === 'P2002'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { name, description, walletAddress, signature, timestamp } = body as Record<string, unknown>

    // Validate inputs
    if (typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Bot name is required (min 2 chars)' }, { status: 400 })
    }
    if (typeof walletAddress !== 'string' || !/^0x[a-f0-9]{40}$/i.test(walletAddress)) {
      return NextResponse.json({ error: 'Valid wallet address is required' }, { status: 400 })
    }
    if (typeof signature !== 'string' || !/^0x[a-f0-9]+$/i.test(signature)) {
      return NextResponse.json({ error: 'Valid signature is required' }, { status: 400 })
    }

    // Verify the wallet signed the canonical publish message, freshly.
    // The message is reconstructed server-side; a client-sent copy is ignored.
    const proof = verifyPublishProof(name, walletAddress, signature, Number(timestamp))
    if (!proof.ok) {
      return NextResponse.json({ error: proof.reason }, { status: 401 })
    }

    const cleanName = name.trim()
    const desc = typeof description === 'string' ? description.slice(0, 500) : ''
    const finalWallet = walletAddress.toLowerCase()

    const baseSlug =
      cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48) || `bot-${Date.now()}`

    // Bot.ownerWallet is a FK to User, so the maker row must exist first.
    await prisma.user.upsert({
      where: { walletAddress: finalWallet },
      create: { walletAddress: finalWallet },
      update: {},
    })

    const moods = ['happy', 'confident', 'neutral', 'thinking', 'intense']
    const mood = moods[Math.floor(Math.random() * moods.length)]

    // Create the bot. On slug collision, retry with a random suffix.
    let bot: { id: string; slug: string; name: string } | null = null
    for (let attempt = 0; attempt < 3 && !bot; attempt++) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`
      try {
        bot = await prisma.bot.create({
          data: {
            slug,
            name: cleanName,
            description: desc || null,
            tagline: desc
              ? (desc.length <= 120 ? desc : `${desc.slice(0, 120).replace(/\s+\S*$/, '')}…`)
              : `${cleanName} prediction algorithm`,
            color: deriveAvatarColor(slug),
            avatarId: slug,
            mood,
            status: 'PAPER',
            tier: 'NONE',
            walletAddress: finalWallet,
            ownerWallet: finalWallet,
            strategyType: 'Polymarket',
          },
          select: { id: true, slug: true, name: true },
        })
      } catch (err) {
        if (!isUniqueClash(err)) throw err
      }
    }
    if (!bot) {
      return NextResponse.json({ error: 'That name is taken, pick another' }, { status: 409 })
    }

    // Register the execution wallet so the indexer watches it on Polymarket.
    await prisma.polyConnection.create({
      data: { botId: bot.id, walletAddress: finalWallet },
    }).catch(() => {})

    await events.agentRegistered(bot.id, { slug: bot.slug, name: bot.name, walletAddress: finalWallet })

    // Issue the API key in the same breath: publish = bot exists + keys in hand.
    const { prefix, secret } = await issueApiKey(bot.id, 'publish-web')

    return NextResponse.json({
      success: true,
      bot: { id: bot.id, slug: bot.slug, name: bot.name },
      credentials: { botId: bot.id, apiKey: prefix, apiSecret: secret },
      message: `Bot ${bot.name} published. Save your API secret, it is shown once.`,
    })
  } catch (err) {
    log('error', 'bots.publish', { message: err instanceof Error ? err.message : String(err), code: (err as { code?: string })?.code })
    return NextResponse.json({ error: 'Failed to publish bot' }, { status: 500 })
  }
}
