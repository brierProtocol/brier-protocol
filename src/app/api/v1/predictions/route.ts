/**
 * POST /api/v1/predictions — submit a prediction (no capital, no vault, no CLOB).
 *
 * THIS is how a bot builds a verifiable track record: it commits a probability on
 * a REAL market BEFORE the market resolves. The outcome is resolved independently
 * by the oracle (the executor's watcher, which reads Polymarket's settled market),
 * and the scoring cron folds it into the Brier Score. No trading, no money, no
 * on-chain anything — just "I predict 62% YES on market X", verified later.
 *
 * Stored as a TradeEvent with source=PREDICTION and amount=0, so the existing
 * resolution + scoring pipeline picks it up unchanged.
 *
 * Auth: HMAC-SHA256 of `${timestamp}.${rawBody}` with the bot's API key (#68),
 * the same scheme as trade signals. Fails closed if the bot has no active key.
 *
 * Integrity:
 *  - One prediction per (bot, market): the unique (source, externalTradeId)
 *    constraint blocks resubmitting after seeing the market move.
 *  - Commit-before-close: we reject markets the CLOB already reports as closed
 *    (best-effort; if the CLOB is unreachable we accept and let the oracle resolve).
 *
 * GET /api/v1/predictions?botId=... — public list of a bot's predictions (transparency).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifyBotSignature } from '@/lib/api-keys'
import { emit, EVENT_TYPES } from '@/lib/events/bus'

export const dynamic = 'force-dynamic'

const REPLAY_WINDOW_MS = 5 * 60 * 1000
const CLOB_BASE = process.env.POLYMARKET_CLOB_URL || 'https://clob.polymarket.com'

/** Best-effort check: is this market still open? Returns 'open' | 'closed' | 'unknown'. */
async function marketState(marketId: string): Promise<'open' | 'closed' | 'unknown'> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 3000)
    const res = await fetch(`${CLOB_BASE}/markets/${marketId}`, { signal: ctrl.signal }).finally(() => clearTimeout(t))
    if (!res.ok) return 'unknown'
    const data = await res.json().catch(() => null)
    if (data && typeof data.closed === 'boolean') return data.closed ? 'closed' : 'open'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

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
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { botId, marketId, probability, side, marketTitle } = body ?? {}

  if (!botId || typeof botId !== 'string') {
    return NextResponse.json({ error: 'botId is required' }, { status: 400 })
  }
  // Verify the signature against the bot's OWN key. rawBody is the exact signed bytes.
  if (!(await verifyBotSignature(botId, timestamp, rawBody, signature))) {
    return NextResponse.json({ error: 'Invalid signature or no active API key for this bot' }, { status: 401 })
  }

  // Input validation
  const p = Number(probability)
  if (!Number.isFinite(p) || p <= 0 || p >= 1) {
    return NextResponse.json({ error: 'probability must be a number strictly between 0 and 1' }, { status: 400 })
  }
  const normalizedSide = String(side || '').toUpperCase()
  if (normalizedSide !== 'YES' && normalizedSide !== 'NO') {
    return NextResponse.json({ error: "side must be 'YES' or 'NO'" }, { status: 400 })
  }
  if (!marketId || typeof marketId !== 'string') {
    return NextResponse.json({ error: 'marketId is required (the market conditionId)' }, { status: 400 })
  }

  const bot = await prisma.bot.findFirst({ where: { OR: [{ id: botId }, { slug: botId }] }, select: { id: true, walletAddress: true } })
  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

  // Commit-before-close: refuse markets the CLOB already reports as closed.
  const state = await marketState(marketId)
  if (state === 'closed') {
    return NextResponse.json({ error: 'Market is already closed — predictions must be committed before resolution' }, { status: 409 })
  }

  try {
    const prediction = await prisma.tradeEvent.create({
      data: {
        botId: bot.id,
        marketId,
        marketTitle: typeof marketTitle === 'string' && marketTitle ? marketTitle.slice(0, 200) : marketId,
        side: normalizedSide,
        amount: 0, // a prediction risks no capital
        entryPrice: p,
        outcome: 'PENDING',
        executionWallet: bot.walletAddress,
        source: 'PREDICTION',
        externalTradeId: `${bot.id}:${marketId}`, // one prediction per bot per market
      },
      select: { id: true },
    })

    await emit({
      type: EVENT_TYPES.PredictionCreated,
      botId: bot.id,
      payload: { marketId, side: normalizedSide, probability: p, predictionId: prediction.id },
    })

    return NextResponse.json(
      { ok: true, predictionId: prediction.id, status: 'PENDING', resolves: 'when the market settles on Polymarket' },
      { status: 201 },
    )
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
  const predictions = await prisma.tradeEvent.findMany({
    where: { botId: bot.id, source: 'PREDICTION' },
    orderBy: { timestamp: 'desc' },
    take: limit,
    select: { id: true, marketId: true, marketTitle: true, side: true, entryPrice: true, outcome: true, resolvedPrice: true, timestamp: true, resolvedAt: true },
  })

  return NextResponse.json({
    count: predictions.length,
    predictions: predictions.map(p => ({
      id: p.id,
      marketId: p.marketId,
      marketTitle: p.marketTitle,
      side: p.side,
      probability: p.entryPrice,
      outcome: p.outcome,
      resolvedAt: p.resolvedAt?.toISOString() ?? null,
      at: p.timestamp.toISOString(),
    })),
  })
}
