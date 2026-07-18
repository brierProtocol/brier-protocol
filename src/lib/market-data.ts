/**
 * Real market baseline at commit time. This is the exogenous price that makes
 * Brier measure SKILL VS THE MARKET. It must be the REAL Polymarket CLOB price,
 * never a simulated one — a fake baseline makes the whole reputation signal
 * meaningless. Best-effort + honest: if the CLOB is unreachable we return null and
 * the caller rejects the commit rather than inventing a number.
 */

// getJson resolves the CLOB via node:https with a DNS-override table, so dev
// machines whose ISP censors Polymarket still reach the real price. No-op in
// prod (DNS_OVERRIDE_HOSTS unset) — it just becomes a plain https GET.
import { getJson } from './dns-override'

const CLOB = process.env.POLYMARKET_CLOB_URL || 'https://clob.polymarket.com'
const GAMMA = process.env.POLYMARKET_GAMMA_URL || 'https://gamma-api.polymarket.com'

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
    // 1) CLOB by conditionId — has token prices for markets it lists.
    const res = await getJson(`${CLOB}/markets/${encodeURIComponent(marketId)}`, 3000)
    if (res.ok && res.json) {
      const data: any = res.json
      const state: MarketState = data.closed === true ? 'closed' : data.closed === false ? 'open' : 'unknown'
      const tokens: Array<{ outcome?: string; price?: number }> = data.tokens || []
      const yes = tokens.find(tk => (tk.outcome || '').toUpperCase() === 'YES')
      const pYes = yes && typeof yes.price === 'number' ? clip(yes.price) : null
      const liquidity = typeof data.liquidity === 'number' ? data.liquidity
        : typeof data.liquidityNum === 'number' ? data.liquidityNum : null
      // If the CLOB knows the market AND has a price, use it. Otherwise fall
      // through to Gamma (the CLOB 404s / lists no price for the fast-window
      // crypto Up/Down markets that resolve in minutes).
      if (pYes !== null) return { pYes, liquidity, state }
      if (state === 'closed') return { pYes: null, liquidity, state }
    }

    // 2) Gamma fallback — the SAME real source the bots read their price from.
    // outcomePrices[0] is the YES/UP probability. Still a real market baseline,
    // never invented.
    return await captureFromGamma(marketId)
  } catch {
    return { pYes: null, liquidity: null, state: 'unknown' }
  }
}

/** Gamma market by conditionId → YES price from outcomePrices[0] / bestBid. */
async function captureFromGamma(marketId: string): Promise<MarketSnapshot> {
  const res = await getJson(`${GAMMA}/markets?condition_ids=${encodeURIComponent(marketId)}`, 3000)
  if (!res.ok || !res.json) return { pYes: null, liquidity: null, state: 'unknown' }
  const m: any = Array.isArray(res.json) ? res.json[0] : res.json
  if (!m) return { pYes: null, liquidity: null, state: 'unknown' }

  const state: MarketState = m.closed === true ? 'closed' : m.closed === false ? 'open' : 'unknown'
  let pYes: number | null = null
  try {
    const op = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices
    if (Array.isArray(op) && op.length >= 1) {
      const y = parseFloat(op[0])
      if (Number.isFinite(y) && y > 0) pYes = clip(y)
    }
  } catch { /* fall through to bestBid */ }
  if (pYes === null && typeof m.bestBid !== 'undefined') {
    const bb = parseFloat(m.bestBid)
    if (Number.isFinite(bb) && bb > 0) pYes = clip(bb)
  }
  const liquidity = typeof m.liquidityNum === 'number' ? m.liquidityNum
    : typeof m.liquidity === 'number' ? m.liquidity
    : parseFloat(m.liquidityNum ?? m.liquidity) || null
  return { pYes, liquidity, state }
}

/**
 * Resolves a market via the CLOB: is it settled, and did YES win? The winning
 * token carries `winner: true`. Best-effort — returns { resolved:false } if the
 * market is still open or the CLOB is unreachable, so the caller leaves the
 * prediction PENDING and retries next run.
 */
export async function resolveMarket(marketId: string): Promise<{ resolved: boolean; yesWon: boolean | null }> {
  try {
    // 1) CLOB — winning token carries winner: true.
    const res = await getJson(`${CLOB}/markets/${encodeURIComponent(marketId)}`, 4000)
    if (res.ok && res.json && res.json.closed === true) {
      const tokens: Array<{ outcome?: string; winner?: boolean }> = res.json.tokens || []
      const winner = tokens.find(tk => tk.winner === true)
      if (winner) {
        const label = (winner.outcome || '').toUpperCase()
        if (label === 'YES' || label === 'NO') {
          return { resolved: true, yesWon: label === 'YES' }
        }
        // Binary markets whose outcomes are NOT named Yes/No (Up/Down, team
        // names…): the commit frame is "first outcome" — captureMarket takes
        // pYes from outcomePrices[0] and the CLOB lists tokens in that same
        // order — so YES ≡ tokens[0]. Comparing the label against 'YES' here
        // made yesWon false for EVERY Up/Down market: all NO commits scored
        // WIN and all YES commits LOSS regardless of reality (found 18 jul).
        return { resolved: true, yesWon: tokens.indexOf(winner) === 0 }
      }
    }

    // 2) Gamma fallback — the CLOB 404s for the fast Up/Down markets. Gamma
    // reports the settled market with outcomePrices pinned to [1,0] or [0,1].
    const g = await getJson(`${GAMMA}/markets?condition_ids=${encodeURIComponent(marketId)}`, 4000)
    if (!g.ok || !g.json) return { resolved: false, yesWon: null }
    const m: any = Array.isArray(g.json) ? g.json[0] : g.json
    if (!m || m.closed !== true) return { resolved: false, yesWon: null }
    try {
      const op = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices
      if (Array.isArray(op) && op.length >= 2) {
        const yes = parseFloat(op[0]), no = parseFloat(op[1])
        if (yes >= 0.99) return { resolved: true, yesWon: true }
        if (no >= 0.99) return { resolved: true, yesWon: false }
      }
    } catch { /* not finalized */ }
    return { resolved: false, yesWon: null } // closed but not finalized yet
  } catch {
    return { resolved: false, yesWon: null }
  }
}
