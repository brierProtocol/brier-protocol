/**
 * POST /api/v1/predictions — commit a prediction (Brier v1 reputation layer).
 *
 * A bot commits a probability on a REAL market BEFORE it resolves. No capital, no
 * vault. We snapshot the market's own probability AT COMMIT (the exogenous baseline
 * that lets us score skill vs the market, not raw accuracy). The oracle resolves it
 * later; the skill engine scores it. Stored in the append-only `Prediction` dataset.
 *
 * Auth: per-bot HMAC (#68). Integrity: one prediction per (bot, market), and we
 * reject markets the CLOB already reports closed (commit-before-resolution).
 *
 * GET /api/v1/predictions?botId=… — public list (transparency).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifyBotSignature } from '@/lib/api-keys'
import { captureMarket, toSideProb } from '@/lib/market-data'
import { emit, EVENT_TYPES } from '@/lib/events/bus'

export const dynamic = 'force-dynamic'
const REPLAY_WINDOW_MS = 5 * 60 * 1000

export async function POST(req: NextRequest) {
  const timestamp = req.headers.get('x-timestamp')
  const signature = req.headers.get('x-signature')
  if (!timestamp || !signature) {
    return NextResponse.json({ error: 'Missing x-timestamp or x-signature headers' }, { status: 400 })
  }
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > REPLAY_WINDOW_MS) {
    return NextResponse.json({ error: 'Request expired or invalid timestamp' }, { status: 401 })
  }

  const rawBody = await req.text()
  let body: any
  try { body = JSON.parse(rawBody) } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const { botId, marketId, probability, side, marketTitle, category } = body ?? {}
  if (!botId || typeof botId !== 'string') return NextResponse.json({ error: 'botId is required' }, { status: 400 })
  if (!(await verifyBotSignature(botId, timestamp, rawBody, signature))) {
    return NextResponse.json({ error: 'Invalid signature or no active API key for this bot' }, { status: 401 })
  }

  const p = Number(probability)
  if (!Number.isFinite(p) || p <= 0 || p >= 1) {
    return NextResponse.json({ error: 'probability must be a number strictly between 0 and 1' }, { status: 400 })
  }
  const sd = String(side || '').toUpperCase()
  if (sd !== 'YES' && sd !== 'NO') return NextResponse.json({ error: "side must be 'YES' or 'NO'" }, { status: 400 })
  if (!marketId || typeof marketId !== 'string') {
    return NextResponse.json({ error: 'marketId is required (the market conditionId)' }, { status: 400 })
  }

  const bot = await prisma.bot.findFirst({
    where: { OR: [{ id: botId }, { slug: botId }] },
    select: { id: true, walletAddress: true },
  })
  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

  // Snapshot the market AT COMMIT. Reject if already closed (commit-before-resolution).
  const snap = await captureMarket(marketId)
  if (snap.state === 'closed') {
    return NextResponse.json({ error: 'Market already closed — predictions must be committed before resolution' }, { status: 409 })
  }
  const pMarketSide = toSideProb(snap.pYes, sd as 'YES' | 'NO') // null if CLOB unreachable → skill-ineligible

  try {
    const pred = await prisma.prediction.create({
      data: {
        botId: bot.id,
        builderWallet: bot.walletAddress,
        marketId,
        marketTitle: typeof marketTitle === 'string' ? marketTitle.slice(0, 200) : null,
        category: typeof category === 'string' ? category.slice(0, 40) : null,
        side: sd,
        pBot: p,
        pMarket: pMarketSide,
        liquidity: snap.liquidity,
      },
      select: { id: true },
    })

    await emit({
      type: EVENT_TYPES.PredictionCreated,
      botId: bot.id,
      payload: { marketId, side: sd, pBot: p, pMarket: pMarketSide, predictionId: pred.id },
    })

    return NextResponse.json({
      ok: true,
      predictionId: pred.id,
      pMarketCaptured: pMarketSide !== null,
      status: 'PENDING',
      resolves: 'when the market settles on Polymarket',
    }, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'This bot already has a prediction on this market' }, { status: 409 })
    }
    console.error('[api/v1/predictions]', e)
    return NextResponse.json({ error: 'Failed to record prediction' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const botId = searchParams.get('botId')
  if (!botId) return NextResponse.json({ error: 'botId query param is required' }, { status: 400 })

  const bot = await prisma.bot.findFirst({ where: { OR: [{ id: botId }, { slug: botId }] }, select: { id: true } })
  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 200)
  const preds = await prisma.prediction.findMany({
    where: { botId: bot.id },
    orderBy: { committedAt: 'desc' },
    take: limit,
    select: {
      id: true, marketId: true, marketTitle: true, side: true, pBot: true, pMarket: true,
      outcome: true, skillContribution: true, committedAt: true, resolvedAt: true,
    },
  })

  return NextResponse.json({
    count: preds.length,
    predictions: preds.map(p => ({
      id: p.id, marketId: p.marketId, marketTitle: p.marketTitle, side: p.side,
      pBot: p.pBot, pMarket: p.pMarket, outcome: p.outcome, skill: p.skillContribution,
      committedAt: p.committedAt.toISOString(), resolvedAt: p.resolvedAt?.toISOString() ?? null,
    })),
  })
}
