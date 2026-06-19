import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { currentPrice, marketCap, bondingProgress } from '@/lib/bondingCurve'

// GET /api/tokens — all launchpad tokens (for the board)
export async function GET() {
  try {
    const tokens = await prisma.botToken.findMany({
      include: {
        bot: { select: { slug: true, name: true, color: true, eyeShape: true, status: true, walletAddress: true, pfpUrl: true, scores: { where: { isLatest: true }, take: 1 } } },
        _count: { select: { trades: true } },
      },
      orderBy: { reserve: 'desc' },
    })

    // Maker handles (Bot.walletAddress has no Prisma relation to User)
    const wallets = [...new Set(tokens.map(t => t.bot.walletAddress?.toLowerCase()).filter(Boolean))] as string[]
    const users = await prisma.user.findMany({ where: { walletAddress: { in: wallets } } })
    const byWallet = new Map(users.map(u => [u.walletAddress.toLowerCase(), u]))

    const shaped = tokens.map(t => {
      const s = { supply: t.supply, basePrice: t.basePrice, slope: t.slope, graduationMcap: t.graduationMcap }
      const maker = byWallet.get(t.bot.walletAddress?.toLowerCase() || '')
      return {
        botId: t.botId,
        slug: t.bot.slug,
        botName: t.bot.name,
        color: t.bot.color,
        eyeShape: t.bot.eyeShape,
        pfpUrl: t.bot.pfpUrl,
        botStatus: t.bot.status,
        makerWallet: t.bot.walletAddress,
        makerHandle: maker?.handle || null,
        makerName: maker?.name || null,
        ticker: t.ticker,
        name: t.name,
        status: t.status,
        price: currentPrice(s),
        marketCap: marketCap(s),
        progress: bondingProgress(s),
        supply: t.supply,
        holders: t.holdersCount,
        trades: t._count.trades,
        brier: t.bot.scores[0]?.brierScore ?? null,
        resolvedTrades: t.bot.scores[0]?.totalTrades ?? 0,
        createdAt: t.createdAt,
      }
    })

    return NextResponse.json(shaped)
  } catch (e: any) {
    console.error('[tokens] list error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/tokens — create a bot's token (idempotent per bot)
export async function POST(req: Request) {
  try {
    const { botId, slug, ticker, name } = await req.json()

    const bot = await prisma.bot.findFirst({
      where: { OR: [{ id: botId || '' }, { slug: slug || '' }] },
      include: { token: true },
    })
    if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    if (bot.token) return NextResponse.json({ error: 'Token already exists', token: bot.token }, { status: 409 })

    const cleanTicker = String(ticker || bot.name).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'BOT'

    const token = await prisma.botToken.create({
      data: {
        botId: bot.id,
        ticker: cleanTicker,
        name: name || bot.name,
      },
    })

    return NextResponse.json({ ok: true, token })
  } catch (e: any) {
    console.error('[tokens] create error', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}
