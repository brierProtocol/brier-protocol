/**
 * GET /api/v1/markets/open — open YES/NO Polymarket markets a bot can predict
 * on right now, served same-origin and CORS-open.
 *
 * This is the one market-discovery door for every client: the in-page runner,
 * the downloaded starter, and any language hitting the REST API. Proxying
 * Polymarket's public list here means clients never depend on reaching
 * polymarket.com themselves (some networks block it) and never need to learn
 * its response shape: they get `{ marketId, title, pYes }` ready to use.
 */
import { publicJson, preflight } from '@/lib/api/public'

export const dynamic = 'force-dynamic'

interface OpenMarket {
  marketId: string
  title: string
  /** Current market probability of YES, when Polymarket reports it. */
  pYes: number | null
  volume24h: number | null
  endDate: string | null
}

const GAMMA_URL =
  'https://gamma-api.polymarket.com/markets' +
  '?active=true&closed=false&limit=60&order=volume24hr&ascending=false'

let cache: { at: number; markets: OpenMarket[] } | null = null
const CACHE_TTL_MS = 60_000

export function OPTIONS() {
  return preflight()
}

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return publicJson({ count: cache.markets.length, markets: cache.markets })
  }

  try {
    const res = await fetch(GAMMA_URL, { signal: AbortSignal.timeout(6000), cache: 'no-store' })
    const raw = await res.json()
    const markets: OpenMarket[] = (Array.isArray(raw) ? raw : []).flatMap((m: any) => {
      if (typeof m?.conditionId !== 'string' || !m.conditionId.startsWith('0x')) return []
      let outcomes: unknown = []
      try { outcomes = JSON.parse(m.outcomes || '[]') } catch { /* not binary */ }
      if (!Array.isArray(outcomes) || outcomes.length !== 2 || outcomes[0] !== 'Yes') return []
      let pYes: number | null = null
      try {
        const p = Number(JSON.parse(m.outcomePrices || '[]')[0])
        if (Number.isFinite(p) && p > 0 && p < 1) pYes = p
      } catch { /* price unknown */ }
      return [{
        marketId: m.conditionId,
        title: typeof m.question === 'string' ? m.question : 'Unknown market',
        pYes,
        volume24h: Number.isFinite(Number(m.volume24hr)) ? Number(m.volume24hr) : null,
        endDate: typeof m.endDate === 'string' ? m.endDate : null,
      }]
    }).slice(0, 50)

    if (markets.length > 0) cache = { at: Date.now(), markets }
    return publicJson({ count: markets.length, markets })
  } catch {
    // Stale cache beats an empty answer; an empty answer beats an error.
    if (cache) return publicJson({ count: cache.markets.length, markets: cache.markets, stale: true })
    return publicJson({ count: 0, markets: [], note: 'Polymarket unreachable right now; retry shortly.' })
  }
}
