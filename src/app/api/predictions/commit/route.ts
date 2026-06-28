import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import crypto from 'crypto'
import { decryptApiKey } from '@/lib/crypto'
import { captureMarket } from '@/lib/market-data'

// Decrypts the bot's signing secret. New keys are stored as "enc.iv.tag"; legacy
// plaintext secrets (pre-encryption) are returned as-is so old bots keep working
// until they rotate. Returns null if it can't be recovered.
function recoverSecret(stored: string): string | null {
  const parts = stored.split('.')
  if (parts.length === 3) {
    try { return decryptApiKey(parts[0], parts[1], parts[2]) } catch { return null }
  }
  return stored // legacy plaintext
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key')
    const timestamp = req.headers.get('x-timestamp')
    const signature = req.headers.get('x-signature')

    if (!apiKey || !timestamp || !signature) {
      return NextResponse.json({ error: 'Missing security headers: x-api-key, x-timestamp, x-signature' }, { status: 401 })
    }

    // 1. Replay-attack protection (5-minute window)
    if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Timestamp is stale or invalid' }, { status: 401 })
    }

    // 2. Resolve the bot + its signing secret
    const bot = await prisma.bot.findUnique({ where: { apiKey } })
    if (!bot || !bot.apiSecret) {
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 })
    }
    const secret = recoverSecret(bot.apiSecret)
    if (!secret) {
      return NextResponse.json({ error: 'Key error — please rotate your API key' }, { status: 401 })
    }

    // 3. Verify HMAC-SHA256 over `${timestamp}${rawBody}` — CONSTANT-TIME compare
    //    (a plain !== leaks the signature byte-by-byte via timing).
    const rawBody = await req.text()
    const expected = crypto.createHmac('sha256', secret).update(timestamp + rawBody).digest()
    let provided: Buffer
    try { provided = Buffer.from(signature, 'hex') } catch { return NextResponse.json({ error: 'Invalid signature' }, { status: 401 }) }
    if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 4. Validate payload
    const body = JSON.parse(rawBody)
    const { marketId, forecast, marketTitle = 'Unknown Market' } = body
    if (!marketId || typeof marketId !== 'string') {
      return NextResponse.json({ error: 'marketId is required' }, { status: 400 })
    }
    const f = Number(forecast)
    if (!Number.isFinite(f) || f <= 0 || f >= 1) {
      return NextResponse.json({ error: 'forecast must be a number strictly between 0 and 1' }, { status: 400 })
    }

    // 5. Capture the REAL market baseline at commit (NOT a simulated one). This is
    //    what makes the score measure skill vs the market. If the CLOB is
    //    unreachable, we reject rather than invent a number — integrity over uptime.
    const snap = await captureMarket(marketId)
    if (snap.state === 'closed') {
      return NextResponse.json({ error: 'Market already closed — predictions must be committed before resolution' }, { status: 409 })
    }

    let marketMidpoint = snap.pYes
    let devFallback = false
    if (marketMidpoint === null) {
      // PRODUCTION NEVER fakes the baseline — it rejects. But in local dev the CLOB
      // is often network-blocked, so we allow a fixed TEST midpoint to make the flow
      // testable end-to-end. Gated hard to non-production and clearly flagged.
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Could not capture the market price right now. Please retry.' }, { status: 503 })
      }
      marketMidpoint = 0.5
      devFallback = true
      console.warn('[commit] DEV market fallback midpoint=0.5 (CLOB unreachable). NOT used in production.')
    }

    // 6. Commit (one prediction per bot per market — the unique constraint blocks
    //    resubmitting after the market moves).
    try {
      const prediction = await prisma.prediction.create({
        data: { botId: bot.id, marketId, marketTitle, forecast: f, marketMidpoint, outcome: 'PENDING' },
      })
      // Best-effort usage counter (not the rate limit; that lives in middleware).
      prisma.bot.update({ where: { id: bot.id }, data: { rateLimitCount: { increment: 1 } } }).catch(() => {})

      return NextResponse.json({
        success: true,
        message: 'Prediction committed to Reputation Layer',
        predictionId: prediction.id,
        capturedMarketMidpoint: marketMidpoint,
        ...(devFallback ? { devFallback: true, note: 'TEST midpoint (CLOB unreachable in dev). Not real.' } : {}),
      }, { status: 200 })
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return NextResponse.json({ error: 'This bot already has a prediction on this market' }, { status: 409 })
      }
      throw e
    }
  } catch (error: any) {
    console.error('[API] Commit Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
