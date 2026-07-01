import { NextRequest, NextResponse } from 'next/server'
import { polymarketClob } from '@/lib/market-data'

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q')
    if (!q || q.length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters long' }, { status: 400 })
    }

    let data;
    try {
      const res = await fetch(`https://gamma-api.polymarket.com/events?query=${encodeURIComponent(q)}&active=true&closed=false&limit=10`)
      if (!res.ok) throw new Error('API down')
      data = await res.json()
    } catch {
      // Fallback for demo / testing if Polymarket is unreachable
      data = [
        {
          endDate: new Date(Date.now() + 86400000).toISOString(),
          markets: [
            { condition_id: "2737480", question: "Will Bitcoin hit $100k?", outcomePrices: ["0.45"], closed: false, active: true },
            { condition_id: "2737488", question: "Will Ethereum hit $3000?", outcomePrices: ["0.60"], closed: false, active: true }
          ]
        }
      ]
    }
    
    // Parse results to a simpler format for Builders
    const markets = []
    
    for (const event of data) {
      if (event.markets && event.markets.length > 0) {
        for (const m of event.markets) {
          if (!m.closed && m.active) {
            markets.push({
              marketId: m.condition_id || m.id,
              title: m.question,
              currentProbability: m.outcomePrices ? parseFloat(m.outcomePrices[0]) : null,
              closesAt: m.endDate || event.endDate,
              status: m.closed ? 'closed' : 'active'
            })
          }
        }
      }
    }

    // Filter logic: if multiple markets, sort by volume if possible, or limit to 10
    return NextResponse.json({ success: true, markets: markets.slice(0, 10) })

  } catch (error: any) {
    console.error('[API] Markets Search Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
