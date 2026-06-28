/**
 * Real market baseline at commit time. This is the exogenous price that makes
 * Brier measure SKILL VS THE MARKET. It must be the REAL Polymarket CLOB price,
 * never a simulated one — a fake baseline makes the whole reputation signal
 * meaningless. Best-effort + honest: if the CLOB is unreachable we return null and
 * the caller rejects the commit rather than inventing a number.
 */

const CLOB = process.env.POLYMARKET_CLOB_URL || 'https://clob.polymarket.com'

export type MarketState = 'open' | 'closed' | 'unknown'

export interface MarketSnapshot {
  /** Market's real probability of YES (0..1), or null if unavailable. */
  pYes: number | null
  liquidity: number | null
  state: MarketState
}

const clip = (p: number) => Math.max(0.01, Math.min(0.99, p))

/**
 * Fetches the real CLOB market by conditionId: YES price + open/closed state.
 * Never throws — returns { pYes: null, state: 'unknown' } on any failure.
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
