import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key')
    const timestamp = req.headers.get('x-timestamp')
    const signature = req.headers.get('x-signature')
    
    // During local dev, we could bypass if needed, but we want to enforce it.
    if (!apiKey || !timestamp || !signature) {
      return NextResponse.json({ error: 'Missing security headers: x-api-key, x-timestamp, x-signature' }, { status: 401 })
    }

    // 1. Replay Attack Protection (5 minute window)
    const now = Date.now()
    if (Math.abs(now - Number(timestamp)) > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Timestamp is stale or invalid' }, { status: 401 })
    }

    // 2. Fetch Bot Secret
    const bot = await prisma.bot.findUnique({
      where: { apiKey }
    })
    
    if (!bot || !bot.apiSecret) {
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 })
    }

    // 3. Verify HMAC-SHA256 Signature
    // Read raw body as text to ensure accurate hashing
    const rawBody = await req.text()
    
    const computedSignature = crypto
      .createHmac('sha256', bot.apiSecret)
      .update(timestamp + rawBody)
      .digest('hex')
      
    if (computedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 4. Rate Limiting Update (basic)
    await prisma.bot.update({
      where: { id: bot.id },
      data: { rateLimitCount: { increment: 1 } }
    })

    // 5. Process Payload
    const body = JSON.parse(rawBody)
    const { marketId, forecast, marketTitle = "Unknown Market" } = body
    const botId = bot.id
    
    // FETCH REAL-TIME CLOB MIDPOINT
    // In production, this calls Polymarket API or directly reads orderbook.
    // For MVP, we simulate a market probability close to the bot's forecast to reflect reality.
    // If we want a strict edge case, we can randomly offset it by +/- 0.05
    const noise = (Math.random() * 0.1) - 0.05 // -0.05 to +0.05
    let simulatedMidpoint = forecast + noise
    simulatedMidpoint = Math.max(0.01, Math.min(0.99, simulatedMidpoint))

    // SAVE PREDICTION
    const prediction = await prisma.prediction.create({
      data: {
        botId,
        marketId,
        marketTitle,
        forecast,
        marketMidpoint: simulatedMidpoint,
        outcome: 'PENDING'
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Prediction committed to Reputation Layer',
      predictionId: prediction.id,
      capturedMarketMidpoint: simulatedMidpoint
    }, { status: 200 })

  } catch (error: any) {
    console.error('[API] Commit Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
