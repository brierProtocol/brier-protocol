/**
 * Market snapshot at commit time — the exogenous baseline that makes Brier v1
 * measure skill vs the market. Best-effort: the prediction is still committed if
 * the CLOB is unreachable (pMarket = null → skill-ineligible but kept as data).
 *
 * Reads the Polymarket CLOB market by conditionId (same endpoint the resolution
 * watcher uses) and returns P(YES) + whether the market is still open.
 */

const CLOB = process.env.POLYMARKET_CLOB_URL || 'https://clob.polymarket.com'

export type MarketState = 'open' | 'closed' | 'unknown'

export interface MarketSnapshot {
  /** Market's probability of YES (0..1), or null if unavailable. */
  pYes: number | null
  /** Market liquidity, or null if not exposed. */
  liquidity: number | null
  state: MarketState
}

const clip = (p: number) => Math.max(0.01, Math.min(0.99, p))

/**
 * Fetches the market's current YES price + open/closed state. Never throws —
 * returns { pYes: null, state: 'unknown' } on any failure so the caller decides.
 */
export async function captureMarket(marketId: string): Promise<MarketSnapshot> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 3000)
    const res = await fetch(`${CLOB}/markets/${marketId}`, { signal: ctrl.signal }).finally(() => clearTimeout(t))
    if (!res.ok) return { pYes: null, liquidity: null, state: 'unknown' }
    const data: any = await res.json().catch(() => null)
    if (!data) return { pYes: null, liquidity: null, state: 'unknown' }

    const state: MarketState = data.closed === true ? 'closed' : data.closed === false ? 'open' : 'unknown'

    // tokens: [{ outcome: "Yes"|"No", price: number, winner?: boolean }]
    const tokens: Array<{ outcome?: string; price?: number }> = data.tokens || []
    const yes = tokens.find(tk => (tk.outcome || '').toUpperCase() === 'YES')
    const pYes = yes && typeof yes.price === 'number' ? clip(yes.price) : null

    const liquidity = typeof data.liquidity === 'number' ? data.liquidity
      : typeof data.liquidityNum === 'number' ? data.liquidityNum : null

    return { pYes, liquidity, state }
  } catch {
    return { pYes: null, liquidity: null, state: 'unknown' }
  }
}

/** Converts a YES-perspective probability to the perspective of `side`. */
export function toSideProb(pYes: number | null, side: 'YES' | 'NO'): number | null {
  if (pYes === null) return null
  return side === 'YES' ? pYes : clip(1 - pYes)
}
