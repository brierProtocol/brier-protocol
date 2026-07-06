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

// Polymarket crypto markets label their outcomes "Up"/"Down" (and some markets
// "Yes"/"No" or "True"/"False"). The affirmative side maps to our pYes.
const AFFIRMATIVE = ['YES', 'UP', 'TRUE', 'LONG']
const isAffirmative = (o?: string) => AFFIRMATIVE.includes((o || '').toUpperCase())

/**
 * The live order-book midpoint for a token — the REAL price, not the stale
 * `price` field on /markets. Returns null on any failure.
 */
async function tokenMidpoint(tokenId: string): Promise<number | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 3000)
    const res = await fetch(`${CLOB}/midpoint?token_id=${encodeURIComponent(tokenId)}`, { signal: ctrl.signal }).finally(() => clearTimeout(t))
    if (!res.ok) return null
    const d: any = await res.json().catch(() => null)
    const mid = d ? parseFloat(d.mid) : NaN
    return Number.isFinite(mid) ? mid : null
  } catch { return null }
}

/**
 * Fetches the real CLOB market by conditionId: YES price + open/closed state.
 * Reads the affirmative (Up/Yes) token's live order-book midpoint — the exogenous
 * baseline Brier scores skill against. Never throws.
 */
export async function captureMarket(marketId: string): Promise<MarketSnapshot> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 3000)
    const res = await fetch(`${CLOB}/markets/${encodeURIComponent(marketId)}`, { signal: ctrl.signal }).finally(() => clearTimeout(t))
    if (!res.ok) return { pYes: null, liquidity: null, state: 'unknown' }
    const data: any = await res.json().catch(() => null)
    if (!data) return { pYes: null, liquidity: null, state: 'unknown' }

    const state: MarketState = data.closed === true ? 'closed' : data.closed === false ? 'open' : 'unknown'
    const tokens: Array<{ outcome?: string; price?: number; token_id?: string }> = data.tokens || []
    // affirmative side = Up/Yes; fall back to the first token if labels are odd
    const yes = tokens.find(tk => isAffirmative(tk.outcome)) || tokens[0]

    let pYes: number | null = null
    if (yes?.token_id) {
      const mid = await tokenMidpoint(yes.token_id)   // real live price (0.695), not stale 0.505
      if (mid != null) pYes = clip(mid)
    }
    if (pYes == null && typeof yes?.price === 'number') pYes = clip(yes.price) // fallback to snapshot price

    const liquidity = typeof data.liquidity === 'number' ? data.liquidity
      : typeof data.liquidityNum === 'number' ? data.liquidityNum : null

    return { pYes, liquidity, state }
  } catch {
    return { pYes: null, liquidity: null, state: 'unknown' }
  }
}

/**
 * Resolves a market via the CLOB: is it settled, and did YES win? The winning
 * token carries `winner: true`. Best-effort — returns { resolved:false } if the
 * market is still open or the CLOB is unreachable, so the caller leaves the
 * prediction PENDING and retries next run.
 */
export async function resolveMarket(marketId: string): Promise<{ resolved: boolean; yesWon: boolean | null }> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 4000)
    const res = await fetch(`${CLOB}/markets/${encodeURIComponent(marketId)}`, { signal: ctrl.signal }).finally(() => clearTimeout(t))
    if (!res.ok) return { resolved: false, yesWon: null }
    const data: any = await res.json().catch(() => null)
    if (!data || data.closed !== true) return { resolved: false, yesWon: null }

    const tokens: Array<{ outcome?: string; winner?: boolean }> = data.tokens || []
    const winner = tokens.find(tk => tk.winner === true)
    if (!winner) return { resolved: false, yesWon: null } // closed but not finalized yet
    // "yesWon" = the affirmative (Up/Yes) side won. Matching only 'YES' resolved
    // every Up/Down market backwards, because their outcome is "Up", not "Yes".
    return { resolved: true, yesWon: isAffirmative(winner.outcome) }
  } catch {
    return { resolved: false, yesWon: null }
  }
}
