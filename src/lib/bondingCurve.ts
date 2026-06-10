// Pump.fun-style bonding curve for a bot's conviction token.
//
// Fixed total supply (1B). The curve is a constant-product AMM with VIRTUAL
// reserves — price has no ceiling: the market can pump a shadow-phase bot to
// any mcap (and dump it just as hard). Darwinism does the maturing, not a cap.
//
//   vUsdc · vTokens = K            (constant product)
//   price = vUsdc / vTokens        (marginal)
//   mcap  = price × TOTAL_SUPPLY   (fully-diluted, pump.fun display)
//
// `supply` in CurveState = tokens SOLD from the curve so far (starts at 0).
// Graduation triggers at GRADUATION mcap (~77% of supply sold with these
// numbers) — the reserve then seeds the bot's vault.
//
// Virtual (off-chain) MVP. The same math maps 1:1 to an on-chain contract later.

export const TOTAL_SUPPLY = 1_000_000_000      // fixed, pump.fun-style
export const VIRTUAL_USDC_0 = 5_000            // virtual USDC reserve at launch
export const VIRTUAL_TOKENS_0 = 1_100_000_000  // virtual token reserve at launch
export const K = VIRTUAL_USDC_0 * VIRTUAL_TOKENS_0
export const DEFAULT_GRADUATION_MCAP = 50_000  // $50k mcap → graduates to vault
export const INITIAL_PRICE = VIRTUAL_USDC_0 / VIRTUAL_TOKENS_0
// Safety clamp: never sell the entire virtual reserve through the curve
const MAX_CURVE_SOLD = TOTAL_SUPPLY * 0.95

export type CurveState = {
  supply: number          // tokens sold from the curve
  graduationMcap: number
  // legacy fields from the old linear curve — ignored by the math
  basePrice?: number
  slope?: number
}

function vTokens(sold: number): number {
  return Math.max(VIRTUAL_TOKENS_0 - sold, VIRTUAL_TOKENS_0 - MAX_CURVE_SOLD)
}

/** Marginal price after `sold` tokens have left the curve. */
export function priceAt(sold: number): number {
  const vT = vTokens(sold)
  const vU = K / vT
  return vU / vT
}

export function currentPrice(s: CurveState): number {
  return priceAt(s.supply)
}

/** Fully-diluted market cap = price × 1B total supply (pump.fun display). */
export function marketCap(s: CurveState): number {
  return currentPrice(s) * TOTAL_SUPPLY
}

export function bondingProgress(s: CurveState): number {
  return Math.min(1, marketCap(s) / (s.graduationMcap || DEFAULT_GRADUATION_MCAP))
}

/** Buy with `usdcIn` virtual USDC → tokens out (constant-product swap). */
export function buy(s: CurveState, usdcIn: number): { shares: number; newSupply: number; priceAfter: number; avgPrice: number } {
  const vT0 = vTokens(s.supply)
  const vU0 = K / vT0
  const vU1 = vU0 + usdcIn
  const vT1 = K / vU1
  let tokensOut = vT0 - vT1
  // clamp so the curve never sells past the safety limit
  const room = MAX_CURVE_SOLD - s.supply
  tokensOut = Math.max(0, Math.min(tokensOut, room))
  const newSupply = s.supply + tokensOut
  return {
    shares: tokensOut,
    newSupply,
    priceAfter: priceAt(newSupply),
    avgPrice: tokensOut > 0 ? usdcIn / tokensOut : currentPrice(s),
  }
}

/** Sell `tokensIn` tokens back to the curve → virtual USDC out. */
export function sell(s: CurveState, tokensIn: number): { usdc: number; newSupply: number; priceAfter: number; avgPrice: number } {
  const tokens = Math.min(Math.max(0, tokensIn), s.supply)
  const vT0 = vTokens(s.supply)
  const vU0 = K / vT0
  const vT1 = vT0 + tokens
  const vU1 = K / vT1
  const usdc = vU0 - vU1
  const newSupply = s.supply - tokens
  return {
    usdc,
    newSupply,
    priceAfter: priceAt(newSupply),
    avgPrice: tokens > 0 ? usdc / tokens : currentPrice(s),
  }
}

// Fee split: 1% per trade → 50% bot owner, 50% protocol.
export const TRADE_FEE_BPS = 100 // 1%
export function splitFee(usdc: number): { fee: number; ownerCut: number; protocolCut: number } {
  const fee = (usdc * TRADE_FEE_BPS) / 10_000
  return { fee, ownerCut: fee / 2, protocolCut: fee / 2 }
}
