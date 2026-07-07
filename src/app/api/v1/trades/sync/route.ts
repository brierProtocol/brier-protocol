import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const timestamp = req.headers.get('x-timestamp')
    const signature = req.headers.get('x-signature')
    
    if (!timestamp || !signature) {
      return NextResponse.json({ error: 'Missing security headers' }, { status: 401 })
    }

    if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Timestamp is stale or invalid' }, { status: 401 })
    }

    const rawBody = await req.text()
    const secret = process.env.BUILDER_SECRET_KEY
    if (!secret) {
      return NextResponse.json({ error: 'Server configuration error: BUILDER_SECRET_KEY missing' }, { status: 500 })
    }
    const expected = crypto.createHmac('sha256', secret).update(timestamp + rawBody).digest('hex')
    
    if (signature !== expected) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    const { tradeId, botId, marketId, side, amount, entryPrice, executionWallet, outcome = 'PENDING' } = body

    if (!tradeId || !botId || !marketId || !side || !amount || !entryPrice || !executionWallet) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Insert or Update the TradeEvent
    const trade = await prisma.tradeEvent.upsert({
      where: { id: tradeId },
      create: {
        id: tradeId,
        botId,
        marketId,
        marketTitle: 'Synced Market', // Could be fetched if needed
        side,
        amount,
        entryPrice,
        executionWallet,
        outcome
      },
      update: {
        outcome
      }
    })

    return NextResponse.json({ success: true, tradeId: trade.id })
  } catch (error: any) {
    console.error('[Trade Sync] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
