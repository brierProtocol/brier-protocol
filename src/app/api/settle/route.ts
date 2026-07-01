import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { bookTradeSettlement } from '@/lib/settlement'

// POST /api/settle — EVENT-DRIVEN NAV booking (§2.6). The executor's resolution
// watcher calls this the instant it sees a market resolve, so the dashboard NAV
// moves on the settlement event, not on a timer/poll. Idempotent; POST /api/cron/settle
// is the reconciliation backstop for any missed events.
// Body: { tradeId } or { source, externalTradeId }
export async function POST(req: NextRequest) {
  try {
    const key = req.headers.get('x-brier-key')
    if (!process.env.BOT_INGEST_KEY || key !== process.env.BOT_INGEST_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tradeId, source, externalTradeId } = await req.json()
    if (!tradeId && !(source && externalTradeId)) {
      return NextResponse.json({ error: 'tradeId or (source, externalTradeId) required' }, { status: 400 })
    }

    const trade = await prisma.tradeEvent.findFirst({
      where: tradeId ? { id: tradeId } : { source, externalTradeId },
      select: {
        id: true, botId: true, outcome: true, amount: true, entryPrice: true,
        vaultBookedAt: true, externalTradeId: true,
        bot: { select: { marketType: true } },
      },
    })
    if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 })

    const result = await bookTradeSettlement({ ...trade, marketType: trade.bot.marketType })
    return NextResponse.json({ ok: true, booked: result !== null, result })
  } catch (e: any) {
    console.error('[settle] error', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}
