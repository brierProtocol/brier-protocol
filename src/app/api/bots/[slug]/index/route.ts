import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { runBotIndex } from '@/lib/polymarket-indexer'

/**
 * POST /api/bots/[slug]/index
 *
 * Triggers an on-chain index pass for a bot: pulls its wallet's Polymarket
 * trades and recomputes its verified categories. Idempotent. Meant to be called
 * after deploy and periodically by a cron.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const bot = await prisma.bot.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: { id: true },
  })
  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

  try {
    const result = await runBotIndex(bot.id)
    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    console.error('Index error:', err)
    return NextResponse.json({ error: err?.message || 'Index failed' }, { status: 500 })
  }
}
