import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { encryptApiKey } from '@/lib/crypto'

const CreateBotSchema = z.object({
  // Step 1
  name: z.string().min(3).max(50),
  tagline: z.string().min(10).max(120),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  strategyType: z.string().min(2).max(100),
  description: z.string().min(20).max(500),
  // Step 2
  source: z.enum(['KALSHI', 'POLYMARKET']),
  kalshiApiKey: z.string().optional(),
  polyWalletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address").optional(),
  // Step 3
  builderCarry: z.number().min(0).max(30),
  markets: z.array(z.string()).min(1).max(10),
  // Step 4 — builder's wallet (from Wagmi on frontend)
  builderAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = CreateBotSchema.parse(body)

    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Check slug uniqueness
    const existing = await prisma.bot.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'Bot name already taken' }, { status: 409 })
    }

    // Maker identity (first-class User). Must exist before the bot — ownerWallet
    // is a FK to User. Here the maker is builderAddress (walletAddress may hold the
    // Polymarket execution wallet instead).
    const makerWallet = data.builderAddress.toLowerCase()
    await prisma.user.upsert({
      where: { walletAddress: makerWallet },
      create: { walletAddress: makerWallet },
      update: {},
    })

    // Create bot in PAPER status (v1.3 Default)
    const bot = await prisma.bot.create({
      data: {
        slug,
        name: data.name,
        tagline: data.tagline,
        color: data.color,
        strategyType: data.strategyType,
        description: data.description,
        status: 'PAPER',
        tier: 'NONE',
        walletAddress: data.polyWalletAddress || data.builderAddress,
        ownerWallet: makerWallet,
        markets: {
          create: data.markets.map(marketId => ({ marketId, status: 'ACTIVE' }))
        },
      }
    })

    // Connect data source
    if (data.source === 'KALSHI' && data.kalshiApiKey) {
      const encrypted = encryptApiKey(data.kalshiApiKey)
      // Verify key works (Simulated for this demo)
      await prisma.kalshiConnection.create({
        data: { botId: bot.id, ...encrypted, kalshiUserId: 'fake-id' }
      })
    }

    if (data.source === 'POLYMARKET' && data.polyWalletAddress) {
      await prisma.polyConnection.create({
        data: { botId: bot.id, walletAddress: data.polyWalletAddress }
      })
    }

    // Token launch is a separate, owner-initiated step (POST /api/tokens)
    return NextResponse.json({ ok: true, botId: bot.id, slug: bot.slug })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ errors: err.flatten() }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
