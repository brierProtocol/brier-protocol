import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { deriveAvatarColor } from '@/lib/botIdentity'
import { events } from '@/lib/events/bus'
import { ethers } from 'ethers'

/**
 * POST /api/bots/register
 * 
 * Simplified bot registration endpoint.
 * Called after the user signs a wallet message on the /list-bot page.
 * Creates a new bot in PAPER status linked to the builder's wallet.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description, market, walletAddress, color, eyeShape, pfpUrl, categories, vaultCap, signature, timestamp, message } = body

    // Declared capacity: the max USDC this strategy can absorb. Parsed defensively
    // (the form sends a string). Negative/NaN => 0 (uncapped / "Open").
    const parsedCap = Number(vaultCap)
    const declaredCap = Number.isFinite(parsedCap) && parsedCap > 0 ? parsedCap : 0

    // Optional uploaded PFP — data-URL or https URL, capped to ~300KB of text
    const chosenPfp = typeof pfpUrl === 'string'
      && pfpUrl.length < 300_000
      && (pfpUrl.startsWith('data:image/') || pfpUrl.startsWith('https://'))
      ? pfpUrl : null

    // Eye color: honor an explicit vivid hex if the maker sent one, otherwise
    // DERIVE it from the name (the same color the live preview shows). Never force
    // red — that was making every bot render crimson regardless of its preview.
    const explicitColor = typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color : null

    // Eye shape chosen at creation — validated against the allowed set
    const allowedShapes = ['round', 'aperture', 'cat', 'diamond', 'scanner', 'ring', 'star', 'triangle', 'cross', 'spiral', 'nova', 'void']
    const chosenShape = allowedShapes.includes(eyeShape) ? eyeShape : 'round'

    // Validate categories against allowed set
    const ALLOWED_CATEGORIES = ['politics', 'crypto', 'sports', 'economy', 'culture', 'tech', 'world']
    const validCategories: string[] = Array.isArray(categories)
      ? categories.filter((c: unknown) => typeof c === 'string' && ALLOWED_CATEGORIES.includes(c))
      : []

    // Validation
    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Bot name is required (min 2 chars)' }, { status: 400 })
    }
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      return NextResponse.json({ error: 'Valid wallet address is required' }, { status: 400 })
    }
    if (!signature || !timestamp || !message) {
      return NextResponse.json({ error: 'Missing wallet ownership proof (signature)' }, { status: 400 })
    }

    // Cryptographic signature validation
    const MAX_SKEW_MS = 5 * 60 * 1000 // 5 minutes
    if (Math.abs(Date.now() - timestamp) > MAX_SKEW_MS) {
      return NextResponse.json({ error: 'Signature expired — sign again' }, { status: 400 })
    }
    try {
      const recovered = ethers.verifyMessage(message, signature)
      if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
        return NextResponse.json({ error: 'Signature does not match the provided wallet address' }, { status: 403 })
      }
    } catch (e) {
      return NextResponse.json({ error: 'Invalid signature proof' }, { status: 400 })
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Check for duplicate slug
    const existing = await prisma.bot.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'An algorithm with that name already exists. Try a different name.' }, { status: 409 })
    }

    // Handle wallet uniqueness — allow multiple bots per wallet by suffixing
    const finalWallet = walletAddress.toLowerCase()

    // Assign a random mood for the bot character
    const moods = ['happy', 'confident', 'neutral', 'thinking', 'intense']
    const mood = moods[Math.floor(Math.random() * moods.length)]

    // Ensure the maker exists as a first-class User BEFORE creating the bot:
    // Bot.ownerWallet is a FK to User, so the row must exist first.
    await prisma.user.upsert({
      where: { walletAddress: finalWallet },
      create: { walletAddress: finalWallet },
      update: {},
    })

    // Create the bot, linked to its maker via ownerWallet.
    const bot = await prisma.bot.create({
      data: {
        slug,
        name,
        description: description || null,
        // Cut at a word boundary — a hard substring(0,120) sliced words in half
        // ("…evolutionary DNA, Kelly sizing. By" on the public profile).
        tagline: description
          ? (description.length <= 120 ? description : `${description.slice(0, 120).replace(/\s+\S*$/, '')}…`)
          : `${name} prediction algorithm`,
        color: explicitColor || deriveAvatarColor(slug),
        avatarId: slug,
        eyeShape: chosenShape,
        pfpUrl: chosenPfp,
        mood,
        status: 'PAPER',
        tier: 'NONE',
        walletAddress: finalWallet,
        ownerWallet: finalWallet,
        strategyType: market || 'Polymarket',
        categories: validCategories,
        vaultCap: declaredCap,
      }
    })

    // Register the execution wallet so the indexer watches it on Polymarket.
    // This is what turns the bot from a claim into something verified on-chain.
    await prisma.polyConnection.create({
      data: { botId: bot.id, walletAddress: finalWallet },
    }).catch(() => {})

    // Emit AgentRegistered into the event bus (best-effort).
    await events.agentRegistered(bot.id, { slug: bot.slug, name: bot.name, walletAddress: finalWallet })

    // Token launch is a separate, owner-initiated step (POST /api/tokens)
    return NextResponse.json({
      ok: true,
      botId: bot.id,
      slug: bot.slug,
      message: `Algorithm "${bot.name}" registered. Entering shadow phase, Brier detects its category and sizing automatically as it trades.`
    })

  } catch (err: any) {
    console.error('Bot registration error:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
