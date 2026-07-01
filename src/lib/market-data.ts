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
    const res = await fetch(`${CLOB}/markets/${marketId}`, { signal: ctrl.signal }).finally(() => clearTimeout(t))
    if (!res.ok) return { resolved: false, yesWon: null }
    const data: any = await res.json().catch(() => null)
    if (!data || data.closed !== true) return { resolved: false, yesWon: null }

    const tokens: Array<{ outcome?: string; winner?: boolean }> = data.tokens || []
    const winner = tokens.find(tk => tk.winner === true)
    if (!winner) return { resolved: false, yesWon: null } // closed but not finalized yet
    return { resolved: true, yesWon: (winner.outcome || '').toUpperCase() === 'YES' }
  } catch {
    return { resolved: false, yesWon: null }
  }
}

export interface MarketMetadata {
  title: string
  slug: string | null
  category: string | null
  image: string | null
}

/**
 * Fetches market metadata from Gamma API to enrich the trade display.
 * Falls back gracefully to "Loading market metadata..." if unreachable.
 */
export async function fetchMarketMetadata(marketId: string): Promise<MarketMetadata> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 3000)
    // Gamma API uses /events?id=... or /markets/...
    const res = await fetch(`https://gamma-api.polymarket.com/markets/${marketId}`, { signal: ctrl.signal }).finally(() => clearTimeout(t))
    
    if (!res.ok) {
      return { title: 'Loading market metadata...', slug: null, category: null, image: null }
    }
    const data: any = await res.json().catch(() => null)
    if (!data) return { title: 'Loading market metadata...', slug: null, category: null, image: null }

    return {
      title: data.question || data.title || 'Loading market metadata...',
      slug: data.slug || null,
      category: data.category || null,
      image: data.image || data.icon || null
    }
  } catch (error) {
    return { title: 'Loading market metadata...', slug: null, category: null, image: null }
  }
}
