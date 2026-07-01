import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import crypto from 'crypto'
import { decryptApiKey } from '@/lib/crypto'
import { captureMarket } from '@/lib/market-data'

function recoverSecret(stored: string): string | null {
  const parts = stored.split('.')
  if (parts.length === 3) {
    try { return decryptApiKey(parts[0], parts[1], parts[2]) } catch { return null }
  }
  return stored
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key')
    const timestamp = req.headers.get('x-timestamp')
    const signature = req.headers.get('x-signature')

    if (!apiKey || !timestamp || !signature) {
      return NextResponse.json({ error: 'Missing security headers' }, { status: 401 })
    }

    if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Timestamp is stale or invalid' }, { status: 401 })
    }

    const bot = await prisma.bot.findUnique({ where: { apiKey } })
    if (!bot || !bot.apiSecret) {
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 })
    }
    const secret = recoverSecret(bot.apiSecret)
    if (!secret) {
      return NextResponse.json({ error: 'Key error — please rotate your API key' }, { status: 401 })
    }

    const rawBody = await req.text()
    const expected = crypto.createHmac('sha256', secret).update(timestamp + rawBody).digest()
    let provided: Buffer
    try { provided = Buffer.from(signature, 'hex') } catch { return NextResponse.json({ error: 'Invalid signature' }, { status: 401 }) }
    if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    const { marketId, conditionId = "", side = "YES", confidence, marketTitle = 'Loading market metadata...', marketSlug = null, category = null } = body
    if (!marketId || typeof marketId !== 'string') {
      return NextResponse.json({ error: 'marketId is required' }, { status: 400 })
    }
    const f = Number(confidence || body.forecast) // fallback for legacy bots
    if (!Number.isFinite(f) || f < 0 || f > 1) {
      return NextResponse.json({ error: 'confidence must be between 0 and 1' }, { status: 400 })
    }

    const snap = await captureMarket(marketId)
    if (snap.state === 'closed') {
      return NextResponse.json({ error: 'Market already closed' }, { status: 409 })
    }

    let marketMidpoint = snap.pYes
    let liquidity = snap.liquidity || 0
    let devFallback = false
    if (marketMidpoint === null) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Could not capture the market price right now. Please retry.' }, { status: 503 })
      }
      marketMidpoint = 0.5
      devFallback = true
      console.warn('[commit] DEV market fallback midpoint=0.5 (CLOB unreachable). NOT used in production.')
    }

    // append-only prediction insertion
    const prediction = await prisma.prediction.create({
      data: { 
        botId: bot.id, 
        builderId: bot.walletAddress,
        marketId, 
        conditionId,
        side,
        marketTitle: finalMarketTitle, 
        marketSlug: metadata.slug || marketSlug,
        marketCategory: metadata.category || category,
        marketImage: metadata.image,
        confidence: f, 
        marketProbabilityAtCommit: marketMidpoint, 
        liquidity,
        status: 'PENDING' 
      },
    })
    
    // --- INTEGRACIÓN EXECUTOR (LIVE PHASE) ---
    if (bot.vaultOpen && bot.vaultAddress) {
      try {
        const executorUrl = process.env.EXECUTOR_URL || 'http://127.0.0.1:3001'
        const executorSecret = process.env.BUILDER_SECRET_KEY || 'your-64-char-hex-secret'
        const t = Date.now().toString()
        const executorBody = JSON.stringify({
          tradeId: prediction.id,
          botId: bot.id,
          vaultAddress: bot.vaultAddress,
          direction: side === 'YES' ? 'LONG' : 'SHORT',
          entryPrice: marketMidpoint,
          size: 10, // MVP: Fixed size for now. Later: dynamic sizing via Risk Engine
          confidence: f,
          marketId,
          outcomeIndex: side === 'YES' ? 0 : 1,
        })
        const sig = crypto.createHmac('sha256', executorSecret).update(t + executorBody).digest('hex')

        await fetch(`${executorUrl}/api/v1/signals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-timestamp': t,
            'x-signature': sig,
          },
          body: executorBody
        }).catch(err => console.error('[commit] Executor push error (network):', err))
      } catch (e) {
        console.error('[commit] Executor integration error:', e)
      }
    }
    // -----------------------------------------

    prisma.bot.update({ where: { id: bot.id }, data: { rateLimitCount: { increment: 1 } } }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: 'Prediction committed',
      predictionId: prediction.id,
      capturedMarketMidpoint: marketMidpoint,
      ...(devFallback ? { devFallback: true, note: 'TEST midpoint' } : {}),
    }, { status: 200 })
    
  } catch (error: any) {
    console.error('[API] Commit Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
