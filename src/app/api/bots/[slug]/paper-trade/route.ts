import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/bots/[slug]/paper-trade — shadow-phase ingestion.
// The bot's brain (e.g. ADAN) reports each paper bet here; the ResolutionWatcher
// settles it against the Polymarket CLOB and the score cron recomputes Brier.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const key = req.headers.get('x-brier-key')
    if (!process.env.BOT_INGEST_KEY || key !== process.env.BOT_INGEST_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slug } = await params
    const body = await req.json()
    const { marketId, marketTitle, side, amount, entryPrice, externalTradeId } = body

    // marketId must be the CTF conditionId (0x…) — it's what the watcher resolves
    if (!marketId || !/^0x[0-9a-fA-F]{10,}$/.test(String(marketId))) {
      return NextResponse.json({ error: 'marketId must be a Polymarket conditionId (0x…)' }, { status: 400 })
    }
    const cleanSide = String(side || '').toUpperCase()
    if (!['YES', 'NO'].includes(cleanSide)) {
      return NextResponse.json({ error: 'side must be YES or NO' }, { status: 400 })
    }
    const price = Number(entryPrice)
    const size = Number(amount)
    if (!(price > 0 && price < 1) || !(size > 0)) {
      return NextResponse.json({ error: 'entryPrice must be (0,1) and amount > 0' }, { status: 400 })
    }

    const bot = await prisma.bot.findUnique({ where: { slug } })
    if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

    const trade = await prisma.tradeEvent.upsert({
      where: { source_externalTradeId: { source: 'SHADOW_PAPER', externalTradeId: String(externalTradeId || `${slug}-${Date.now()}`) } },
      create: {
        botId: bot.id,
        marketId: String(marketId),
        marketTitle: String(marketTitle || 'Unknown market').slice(0, 200),
        side: cleanSide,
        amount: size,
        entryPrice: price,
        outcome: 'PENDING',
        executionWallet: bot.walletAddress,
        source: 'SHADOW_PAPER',
        externalTradeId: String(externalTradeId || `${slug}-${Date.now()}`),
      },
      update: {}, // idempotent: re-sends of the same trade are no-ops
    })

    return NextResponse.json({ ok: true, tradeId: trade.id, outcome: trade.outcome })
  } catch (e: any) {
    console.error('[paper-trade] error', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}
