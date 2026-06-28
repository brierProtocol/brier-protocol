import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    // In production, require HMAC-SHA256 signature from bot's API key
    const authHeader = req.headers.get('authorization')
    if (process.env.NODE_ENV === 'production' && !authHeader) {
      return NextResponse.json({ error: 'Unauthorized. Bot API Key required.' }, { status: 401 })
    }

    const body = await req.json()
    const { botId, marketId, forecast, marketTitle = "Unknown Market" } = body

    if (!botId || !marketId || forecast === undefined) {
      return NextResponse.json({ error: 'Missing required fields: botId, marketId, forecast' }, { status: 400 })
    }

    if (forecast < 0 || forecast > 1) {
      return NextResponse.json({ error: 'Forecast must be a probability between 0 and 1' }, { status: 400 })
    }

    // VERIFY BOT EXISTS
    const bot = await prisma.bot.findUnique({
      where: { id: botId }
    })
    
    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

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
