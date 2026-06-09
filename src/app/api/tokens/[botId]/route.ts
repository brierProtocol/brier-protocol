import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentPrice, marketCap, bondingProgress, priceAt } from '@/lib/bondingCurve'

// GET /api/tokens/[botId] — token state + price history + holders
export async function GET(_req: Request, { params }: { params: Promise<{ botId: string }> }) {
  try {
    const { botId } = await params

    const token = await prisma.botToken.findFirst({
      where: { OR: [{ botId }, { bot: { slug: botId } }] },
      include: {
        bot: { select: { id: true, slug: true, name: true, color: true, eyeShape: true, status: true, walletAddress: true } },
        trades: { orderBy: { createdAt: 'asc' }, take: 200 },
        holdings: { orderBy: { shares: 'desc' }, take: 10 },
      },
    })
    if (!token) return NextResponse.json({ error: 'No token' }, { status: 404 })

    const s = { supply: token.supply, basePrice: token.basePrice, slope: token.slope, graduationMcap: token.graduationMcap }

    // Price history series for the chart (start point + every trade)
    const history = [
      { t: token.createdAt, price: token.basePrice },
      ...token.trades.map(tr => ({ t: tr.createdAt, price: tr.priceAfter })),
    ]

    return NextResponse.json({
      botId: token.bot.id,
      slug: token.bot.slug,
      botName: token.bot.name,
      color: token.bot.color,
      eyeShape: token.bot.eyeShape,
      ticker: token.ticker,
      name: token.name,
      status: token.status,
      price: currentPrice(s),
      marketCap: marketCap(s),
      progress: bondingProgress(s),
      graduationMcap: token.graduationMcap,
      supply: token.supply,
      reserve: token.reserve,
      basePrice: token.basePrice,
      slope: token.slope,
      holders: token.holdersCount,
      history,
      topHolders: token.holdings.map(h => ({ wallet: h.wallet, shares: h.shares })),
      // bonding curve shape for the visual (sampled)
      curve: Array.from({ length: 24 }, (_, i) => {
        const sup = (token.supply * 1.8 / 23) * i + 1
        return { supply: sup, price: priceAt(sup, token.basePrice, token.slope) }
      }),
    })
  } catch (e: any) {
    console.error('[tokens] get error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
