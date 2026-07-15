import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { runBotIndex } from '@/lib/polymarket-indexer'
import { log } from '@/lib/observability'

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
  } catch (err) {
    log('error', 'bots.index', { message: err instanceof Error ? err.message : String(err), code: (err as any)?.code })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
