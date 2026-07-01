// Protocol trading fees by market type (spec §2.1).
//
// ⚠️ These are REAL percentages, not integers: Crypto 0.07%, Sports 0.03%,
// Politics 0.04%. A previous master-prompt bug showed "7%" instead of "0.07%" —
// never display or compute these as whole numbers. Stored here as DECIMAL RATES
// (0.07% = 0.0007) so math is unambiguous; use formatFeeRatePct() for display.

export const MARKET_FEE_RATES = {
  crypto: 0.0007,   // 0.07%
  sports: 0.0003,   // 0.03%
  politics: 0.0004, // 0.04%
} as const

export type FeeCategory = keyof typeof MARKET_FEE_RATES

// Crypto is the Phase-1 core market (§2.6), so it's the default when a bot's
// market can't be classified.
const DEFAULT_CATEGORY: FeeCategory = 'crypto'

/** Normalize a bot's marketType/category string to a fee category. */
export function feeCategory(market?: string | null): FeeCategory {
  const m = (market || '').toLowerCase()
  if (m.includes('sport')) return 'sports'
  if (m.includes('politic')) return 'politics'
  if (m.includes('crypto')) return 'crypto'
  return DEFAULT_CATEGORY
}

/** Decimal fee rate for a market (e.g. 0.0004). */
export function marketFeeRate(market?: string | null): number {
  return MARKET_FEE_RATES[feeCategory(market)]
}

/** Display string for a market's fee, e.g. "0.04%". Never shows it as an integer. */
export function formatFeeRatePct(market?: string | null): string {
  return `${(marketFeeRate(market) * 100).toFixed(2).replace(/\.?0+$/, '')}%`
}

/** Protocol trading fee charged on a trade's notional (USDC). */
export function tradingFee(market: string | null | undefined, notionalUsdc: number): number {
  return marketFeeRate(market) * Math.abs(notionalUsdc)
}
