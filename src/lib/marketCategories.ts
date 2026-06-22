// Single source of truth for mapping a Polymarket market to one of Brier's
// categories. Used by Discover (filtering) and the indexer (verified categories),
// so a market is always bucketed the same way everywhere.

export const MARKET_CATEGORY_IDS = ['politics', 'crypto', 'sports', 'economy', 'culture', 'tech', 'world'] as const
export type MarketCategoryId = typeof MARKET_CATEGORY_IDS[number]

const PATTERNS: Record<MarketCategoryId, RegExp> = {
  politics: /polit|elect|president|senate|congress|vote|governor/,
  crypto:   /crypto|btc|bitcoin|eth|ethereum|solana|\bsol\b|defi|token|altcoin/,
  sports:   /sport|nba|nfl|soccer|football|mlb|nhl|ufc|tennis|\bf1\b|olympic/,
  economy:  /econ|inflation|\bfed\b|rate|gdp|jobs|\bcpi\b|recession|tariff/,
  culture:  /cultur|\bpop\b|celebr|movie|music|award|oscar|grammy|box office/,
  tech:     /tech|\bai\b|science|space|nasa|spacex|\bgpt\b|openai|chip/,
  world:    /world|geopol|\bwar\b|ukrain|china|russia|israel|global|nato/,
}

// Classify one market by its free text (title/slug/tags). Returns the first
// matching category, or null when nothing matches.
export function classifyMarket(text: string): MarketCategoryId | null {
  const t = (text || '').toLowerCase()
  for (const id of MARKET_CATEGORY_IDS) {
    if (PATTERNS[id].test(t)) return id
  }
  return null
}

// Derive a bot's verified categories from the markets it actually traded.
// Tallies category hits across market texts and keeps those with a meaningful
// share (>= 10% of classified trades), most-traded first, capped to 4. This is
// the honest signal: it comes from on-chain activity, not what was declared.
export function deriveVerifiedCategories(marketTexts: string[]): MarketCategoryId[] {
  const counts = new Map<MarketCategoryId, number>()
  let classified = 0
  for (const text of marketTexts) {
    const c = classifyMarket(text)
    if (!c) continue
    classified++
    counts.set(c, (counts.get(c) || 0) + 1)
  }
  if (classified === 0) return []
  return [...counts.entries()]
    .filter(([, n]) => n / classified >= 0.1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id]) => id)
}
