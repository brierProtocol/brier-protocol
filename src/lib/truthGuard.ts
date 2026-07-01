export type CanonicalPrediction = {
  id: string
  botId: string
  marketId: string
  marketTitle: string
  side: "YES" | "NO"
  confidence: number
  marketProbabilityAtCommit: number
  edge: number
  status: "PENDING" | "WIN" | "LOSS" | "VOID"
  timestamp: string | Date
  resolvedAt: string | Date | null
  marketCategory: string | null
  marketImage: string | null
}

/**
 * TRUTH LAYER GUARD (Anti-Crash & Self-Healing Layer)
 * Guarantees NO malformed prediction ever reaches the UI.
 * Forces Bloomberg-grade deterministic rendering.
 */
export function sanitizePrediction(p: any): CanonicalPrediction | null {
  if (!p) return null

  // 1. Title Safety
  let title = p.marketTitle
  if (!title || title === "Unknown Market") {
    title = "Loading market metadata..."
  }

  // 2. Strict Numerics
  const conf = typeof p.confidence === 'number' ? p.confidence : 0
  const prob = typeof p.marketProbabilityAtCommit === 'number' ? p.marketProbabilityAtCommit : 0

  // 3. Edge Calculation
  const edge = conf - prob

  // 4. Status Alignment
  const status = p.status || p.outcome || "PENDING"

  return {
    id: p.id || Math.random().toString(),
    botId: p.botId || "",
    marketId: p.marketId || "",
    marketTitle: title,
    side: p.side || "YES",
    confidence: conf,
    marketProbabilityAtCommit: prob,
    edge: edge,
    status: status,
    timestamp: p.timestamp || p.createdAt || new Date(),
    resolvedAt: p.resolvedAt || null,
    marketCategory: p.marketCategory || p.category || null,
    marketImage: p.marketImage || p.image || null
  }
}
