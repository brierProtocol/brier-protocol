import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// POST /api/bots/[slug]/paper-trade — shadow-phase ingestion.
// The bot's brain (e.g. ADAN) reports each paper bet here; the ResolutionWatcher
// settles it against the Polymarket CLOB and the score cron recomputes Brier.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const key = req.headers.get('x-brier-key')
    const validKey = process.env.BOT_INGEST_KEY
    if (!validKey) throw new Error('Missing BOT_INGEST_KEY environment variable')
    if (key !== validKey) {
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

    // ── Integrity: the claimed entryPrice is verified against the live CLOB
    // at receipt. Investors score the bot on this price — a bot cannot report
    // a price the market never showed. Deviation > 7¢ ⇒ we record the price
    // the market actually had and flag the trade.
    let finalPrice = price
    let fraudFlag = false
    try {
      const clobRes = await fetch(`https://clob.polymarket.com/markets/${marketId}`, {
        signal: AbortSignal.timeout(6000),
      })
      if (clobRes.ok) {
        const m = await clobRes.json()
        const yesTok = (m.tokens || [])[0]
        if (yesTok?.price != null) {
          const liveSidePrice = cleanSide === 'YES' ? Number(yesTok.price) : 1 - Number(yesTok.price)
          if (liveSidePrice > 0 && liveSidePrice < 1 && Math.abs(liveSidePrice - price) > 0.07) {
            finalPrice = liveSidePrice
            fraudFlag = true
            console.warn(`[paper-trade] price mismatch ${slug}: claimed ${price}, live ${liveSidePrice} — using live, flagged`)
          }
        }
      }
    } catch { /* CLOB unreachable → accept claimed price; the watcher still verifies the outcome */ }

    const trade = await prisma.tradeEvent.upsert({
      where: { source_externalTradeId: { source: 'SHADOW_PAPER', externalTradeId: String(externalTradeId || `${slug}-${Date.now()}`) } },
      create: {
        botId: bot.id,
        marketId: String(marketId),
        marketTitle: String(marketTitle || 'Unknown market').slice(0, 200),
        side: cleanSide,
        amount: size,
        entryPrice: finalPrice,
        outcome: 'PENDING',
        fraudFlag,
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
