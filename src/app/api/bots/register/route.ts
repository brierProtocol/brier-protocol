import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    const { name, description, market, walletAddress, color, eyeShape } = body

    // Eye color chosen at creation — validated, vivid hex only (else a sane default)
    const chosenColor = typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color)
      ? color
      : '#ff2a4d'

    // Eye shape chosen at creation — validated against the allowed set
    const allowedShapes = ['round', 'aperture', 'cat', 'diamond', 'scanner', 'ring', 'star', 'triangle', 'cross', 'spiral', 'nova', 'void']
    const chosenShape = allowedShapes.includes(eyeShape) ? eyeShape : 'round'

    // Validation
    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Bot name is required (min 2 chars)' }, { status: 400 })
    }
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      return NextResponse.json({ error: 'Valid wallet address is required' }, { status: 400 })
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

    // Create the bot
    const bot = await prisma.bot.create({
      data: {
        slug,
        name,
        description: description || null,
        tagline: description ? description.substring(0, 120) : `${name} prediction algorithm`,
        color: chosenColor,
        avatarId: slug,
        eyeShape: chosenShape,
        mood,
        status: 'PAPER',
        tier: 'NONE',
        walletAddress: finalWallet,
        strategyType: market || 'Polymarket',
      }
    })

    // Also ensure the user profile exists
    await prisma.user.upsert({
      where: { walletAddress: walletAddress.toLowerCase() },
      create: { walletAddress: walletAddress.toLowerCase() },
      update: {}
    })

    return NextResponse.json({ 
      ok: true, 
      botId: bot.id, 
      slug: bot.slug,
      message: `Algorithm "${bot.name}" registered successfully. Entering calibration phase (50 resolved trades).`
    })

  } catch (err: any) {
    console.error('Bot registration error:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
