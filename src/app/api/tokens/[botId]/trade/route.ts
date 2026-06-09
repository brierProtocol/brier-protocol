import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buy, sell, currentPrice, marketCap, bondingProgress, splitFee } from '@/lib/bondingCurve'

// POST /api/tokens/[botId]/trade  { wallet, side: 'BUY'|'SELL', amount }
// amount = virtual USDC for BUY, shares for SELL.
export async function POST(req: Request, { params }: { params: Promise<{ botId: string }> }) {
  try {
    const { botId } = await params
    const { wallet, side, amount } = await req.json()

    if (!wallet || !['BUY', 'SELL'].includes(side) || !(Number(amount) > 0)) {
      return NextResponse.json({ error: 'wallet, side (BUY|SELL) and positive amount required' }, { status: 400 })
    }

    const token = await prisma.botToken.findFirst({
      where: { OR: [{ botId }, { bot: { slug: botId } }] },
    })
    if (!token) return NextResponse.json({ error: 'No token' }, { status: 404 })
    if (token.status === 'GRADUATED') return NextResponse.json({ error: 'Token graduated — trade on the open market' }, { status: 409 })

    const s = { supply: token.supply, basePrice: token.basePrice, slope: token.slope, graduationMcap: token.graduationMcap }
    const w = String(wallet).toLowerCase()
    const amt = Number(amount)

    let shares = 0, usdc = 0, priceAfter = 0, newSupply = token.supply, newReserve = token.reserve

    if (side === 'BUY') {
      const r = buy(s, amt)
      shares = r.shares; priceAfter = r.priceAfter; newSupply = r.newSupply
      usdc = amt
      newReserve = token.reserve + amt
    } else {
      // SELL: clamp to holder's balance
      const holding = await prisma.tokenHolding.findUnique({ where: { tokenId_wallet: { tokenId: token.id, wallet: w } } })
      const have = holding?.shares ?? 0
      const sellShares = Math.min(amt, have)
      if (sellShares <= 0) return NextResponse.json({ error: 'No shares to sell' }, { status: 400 })
      const r = sell(s, sellShares)
      shares = sellShares; usdc = r.usdc; priceAfter = r.priceAfter; newSupply = r.newSupply
      newReserve = Math.max(0, token.reserve - r.usdc)
    }

    const { fee, ownerCut, protocolCut } = splitFee(usdc)

    // Update holding
    const holding = await prisma.tokenHolding.findUnique({ where: { tokenId_wallet: { tokenId: token.id, wallet: w } } })
    const prevShares = holding?.shares ?? 0
    const nextShares = side === 'BUY' ? prevShares + shares : prevShares - shares

    // Recompute holders count
    const wasHolder = prevShares > 0
    const isHolder = nextShares > 0
    const holdersDelta = (!wasHolder && isHolder) ? 1 : (wasHolder && !isHolder) ? -1 : 0

    const graduates = marketCap({ ...s, supply: newSupply }) >= token.graduationMcap

    await prisma.$transaction([
      prisma.tokenHolding.upsert({
        where: { tokenId_wallet: { tokenId: token.id, wallet: w } },
        create: { tokenId: token.id, wallet: w, shares: Math.max(0, nextShares) },
        update: { shares: Math.max(0, nextShares) },
      }),
      prisma.tokenTrade.create({
        data: { tokenId: token.id, wallet: w, side, usdc, shares, priceAfter },
      }),
      prisma.botToken.update({
        where: { id: token.id },
        data: {
          supply: newSupply,
          reserve: newReserve,
          holdersCount: Math.max(0, token.holdersCount + holdersDelta),
          ...(graduates ? { status: 'GRADUATED' } : {}),
        },
      }),
    ])

    return NextResponse.json({
      ok: true,
      side,
      shares,
      usdc,
      priceAfter,
      fee, ownerCut, protocolCut,
      graduated: graduates,
      marketCap: marketCap({ ...s, supply: newSupply }),
      progress: bondingProgress({ ...s, supply: newSupply }),
      price: currentPrice({ ...s, supply: newSupply }),
    })
  } catch (e: any) {
    console.error('[tokens] trade error', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}
