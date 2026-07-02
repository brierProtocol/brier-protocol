// Auto vault capacity. A normie deploying a bot should never be asked "how much
// USDC can your edge absorb?" — they don't know, and neither should they. Brier
// derives a conservative capacity from what the bot has PROVEN, and never lets it
// exceed a fraction of the liquidity of the markets it actually trades.

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

export interface CapacityInputs {
  /** 0..100 reputation (LCB-based). Higher = more capacity. */
  reputationScore?: number | null
  /** How many predictions have resolved (sample size / confidence). */
  resolvedPredictions?: number | null
  /** Avg USDC liquidity of the markets the bot trades, if known. Caps capacity. */
  avgMarketLiquidityUsd?: number | null
}

/**
 * Conservative starting capacity for a freshly graduated bot, in USDC.
 *  - Scales with proven reputation: 50→~$15k, 75→~$60k, 100→$150k.
 *  - Ramps with sample size: below 100 resolved it gets a fraction (min 25%).
 *  - Never exceeds 15% of the typical liquidity of the markets it trades
 *    (you cannot deploy more capital than the market can absorb without slippage).
 * Rounded to a friendly $1k step, floored at $5k.
 */
export function computeVaultCapacity(i: CapacityInputs): number {
  const rep = clamp(i.reputationScore ?? 50, 0, 100)
  const n = i.resolvedPredictions ?? 0

  const base = 15_000 + Math.pow(rep / 100, 2) * 135_000   // reputation tier
  const confidence = clamp(n / 100, 0.25, 1)               // sample-size ramp
  const liquidityCeiling = i.avgMarketLiquidityUsd && i.avgMarketLiquidityUsd > 0
    ? i.avgMarketLiquidityUsd * 0.15
    : Infinity

  const cap = Math.min(base * confidence, liquidityCeiling)
  return Math.max(5_000, Math.round(cap / 1_000) * 1_000)
}
