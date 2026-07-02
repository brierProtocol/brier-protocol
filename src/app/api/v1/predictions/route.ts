import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifyBotSignatureWithPrefix, touchKeyByPrefix } from '@/lib/api-keys'
import { captureMarket } from '@/lib/market-data'

/**
 * POST /api/v1/predictions — the endpoint both SDKs (@brier/sdk, brier-sdk-py)
 * actually call. The bot identifies itself via `botId` in the body and proves it
 * with an HMAC-SHA256 of `${timestamp}.${rawBody}` using one of its ACTIVE
 * per-builder keys (ApiKey table, issued from the profile's "Connect your bot"
 * panel). The legacy /api/predictions/commit stays for old bots on bot.apiKey.
 *
 * Body: { botId, marketId, probability, side: 'YES'|'NO', marketTitle? }
 * `probability` is P(chosen side wins). We store BOTH confidence and the market
 * probability in the SAME side frame so the skill engine compares like with like.
 */
export async function POST(req: NextRequest) {
  try {
    const timestamp = req.headers.get('x-timestamp')
    const signature = req.headers.get('x-signature')
    if (!timestamp || !signature) {
      return NextResponse.json({ error: 'Missing security headers (x-timestamp, x-signature)' }, { status: 401 })
    }
    if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Timestamp is stale or invalid' }, { status: 401 })
    }

    const rawBody = await req.text()
    let body: any
    try { body = JSON.parse(rawBody) } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { botId, marketId, marketTitle = 'Unknown Market' } = body
    if (!botId || typeof botId !== 'string') {
      return NextResponse.json({ error: 'botId is required' }, { status: 400 })
    }
    if (!marketId || typeof marketId !== 'string') {
      return NextResponse.json({ error: 'marketId is required' }, { status: 400 })
    }
    const side = String(body.side || 'YES').toUpperCase()
    if (side !== 'YES' && side !== 'NO') {
      return NextResponse.json({ error: "side must be 'YES' or 'NO'" }, { status: 400 })
    }
    const p = Number(body.probability ?? body.confidence)
    if (!Number.isFinite(p) || p <= 0 || p >= 1) {
      return NextResponse.json({ error: 'probability must be a number strictly between 0 and 1' }, { status: 400 })
    }

    const bot = await prisma.bot.findUnique({ where: { id: botId }, select: { id: true, walletAddress: true } })
    if (!bot) return NextResponse.json({ error: 'Unknown botId' }, { status: 401 })

    // Signature proves possession of one of the bot's active keys (fail closed).
    const matchedPrefix = await verifyBotSignatureWithPrefix(botId, timestamp, rawBody, signature)
    if (!matchedPrefix) {
      return NextResponse.json({ error: 'Invalid signature. Issue a key from your bot profile ("Connect your bot") and sign `${timestamp}.${body}` with it.' }, { status: 401 })
    }
    touchKeyByPrefix(matchedPrefix).catch(() => {})

    // One prediction per bot per market: re-committing after the price moves is
    // free cherry-picking, and duplicates inflate n with correlated predictions.
    const dup = await prisma.prediction.findFirst({
      where: { botId: bot.id, marketId, status: 'PENDING' },
      select: { id: true },
    })
    if (dup) {
      return NextResponse.json({ error: 'Prediction already committed for this market', predictionId: dup.id }, { status: 409 })
    }

    // Capture the market at commit time — the price the bot must beat.
    const snap = await captureMarket(marketId)
    if (snap.state === 'closed') {
      return NextResponse.json({ error: 'Market already closed' }, { status: 409 })
    }
    let pYes = snap.pYes
    let devFallback = false
    if (pYes === null) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Could not capture the market price right now. Please retry.' }, { status: 503 })
      }
      pYes = 0.5
      devFallback = true
      console.warn('[v1/predictions] DEV market fallback midpoint=0.5 (CLOB unreachable). NOT used in production.')
    }
    // Same frame as `confidence`: probability of the CHOSEN side at commit time.
    const marketProbabilityAtCommit = side === 'NO' ? 1 - pYes : pYes

    const prediction = await prisma.prediction.create({
      data: {
        botId: bot.id,
        builderId: bot.walletAddress,
        marketId,
        conditionId: marketId,
        side,
        marketTitle,
        confidence: p,
        marketProbabilityAtCommit,
        liquidity: snap.liquidity || 0,
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Prediction committed',
      predictionId: prediction.id,
      capturedMarketProbability: marketProbabilityAtCommit,
      ...(devFallback ? { devFallback: true, note: 'TEST midpoint' } : {}),
    })
  } catch (err: any) {
    console.error('[v1/predictions]', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
