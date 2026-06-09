// Linear bonding curve for a bot's conviction token.
//   price(supply) = basePrice + slope * supply
// Buying mints shares and pushes price up; selling burns and pushes it down.
// The curve is always liquid — you can sell back to it at any time.
//
// Virtual (off-chain) MVP. The same math maps 1:1 to an on-chain Polygon contract later.

export type CurveState = {
  supply: number
  basePrice: number
  slope: number
  graduationMcap: number
}

export function priceAt(supply: number, basePrice: number, slope: number): number {
  return basePrice + slope * supply
}

export function currentPrice(s: CurveState): number {
  return priceAt(s.supply, s.basePrice, s.slope)
}

/** Market cap = current price × supply (standard launchpad display). */
export function marketCap(s: CurveState): number {
  return currentPrice(s) * s.supply
}

export function bondingProgress(s: CurveState): number {
  return Math.min(1, marketCap(s) / s.graduationMcap)
}

/** Buy with `usdcIn` virtual USDC → shares minted. Solves the curve integral. */
export function buy(s: CurveState, usdcIn: number): { shares: number; newSupply: number; priceAfter: number; avgPrice: number } {
  const { supply: s0, basePrice: P0, slope: k } = s
  // (k/2)·d² + (P0 + k·s0)·d − usdcIn = 0  →  solve for d (shares)
  const a = k / 2
  const b = P0 + k * s0
  const c = -usdcIn
  const disc = b * b - 4 * a * c
  const d = a === 0 ? usdcIn / b : (-b + Math.sqrt(disc)) / (2 * a)
  const shares = Math.max(0, d)
  const newSupply = s0 + shares
  return {
    shares,
    newSupply,
    priceAfter: priceAt(newSupply, P0, k),
    avgPrice: shares > 0 ? usdcIn / shares : currentPrice(s),
  }
}

/** Sell `sharesIn` shares → virtual USDC returned. */
export function sell(s: CurveState, sharesIn: number): { usdc: number; newSupply: number; priceAfter: number; avgPrice: number } {
  const { supply: s0, basePrice: P0, slope: k } = s
  const shares = Math.min(Math.max(0, sharesIn), s0)
  const sNew = s0 - shares
  // ∫ from sNew to s0 of (P0 + k·s) ds
  const usdc = P0 * shares + (k / 2) * (s0 * s0 - sNew * sNew)
  return {
    usdc,
    newSupply: sNew,
    priceAfter: priceAt(sNew, P0, k),
    avgPrice: shares > 0 ? usdc / shares : currentPrice(s),
  }
}

// Fee split: 1% per trade → 50% bot owner, 50% protocol.
export const TRADE_FEE_BPS = 100 // 1%
export function splitFee(usdc: number): { fee: number; ownerCut: number; protocolCut: number } {
  const fee = (usdc * TRADE_FEE_BPS) / 10_000
  return { fee, ownerCut: fee / 2, protocolCut: fee / 2 }
}
