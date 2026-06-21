// Honest shadow-phase progress for a bot, derived ONLY from real fields.
// No invented TVL or PnL. Eligibility gate (v1): 100 resolved predictions,
// Brier 0.20 or lower, 21 days live. Mirrors the rule shown across the product.

export const SHADOW_RESOLVED_TARGET = 100
export const SHADOW_DAYS_TARGET = 21
export const SHADOW_BRIER_TARGET = 0.2

export interface BotLike {
  status?: string | null
  createdAt?: string | Date | null
  vaultOpen?: boolean | null
  currentTVL?: number | null
  tvl?: number | null
  scores?: Array<{ brierScore?: number; winRate?: number; totalTrades?: number } | null> | null
  brierScore?: number | null
  winRate?: number | null
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

export function isBotLive(b: BotLike): boolean {
  if (b.vaultOpen) return true
  const s = (b.status || '').toUpperCase()
  return s === 'LIVE' || s === 'VAULT_ELIGIBLE_T1' || s === 'VAULT_ELIGIBLE_T2'
}

export interface ShadowProgress {
  live: boolean
  resolved: number
  days: number
  brier: number | null
  winRate: number | null
  tvl: number
  resolvedPass: boolean
  daysPass: boolean
  brierPass: boolean
  eligible: boolean
  /** Overall readiness toward opening a vault, 0..1. Live bots read 1. */
  pct: number
}

export function shadowProgress(b: BotLike): ShadowProgress {
  const score = b.scores?.[0] ?? null
  const resolved = score?.totalTrades ?? 0
  const brierRaw = score?.brierScore ?? b.brierScore ?? null
  // Brier only means something once there are resolved predictions behind it.
  const brier = resolved > 0 && typeof brierRaw === 'number' ? brierRaw : null
  const winRate = score?.winRate ?? b.winRate ?? null
  const tvl = b.currentTVL ?? b.tvl ?? 0

  const created = b.createdAt ? new Date(b.createdAt).getTime() : Date.now()
  const days = Math.max(0, Math.floor((Date.now() - created) / 86_400_000))

  const resolvedPass = resolved >= SHADOW_RESOLVED_TARGET
  const daysPass = days >= SHADOW_DAYS_TARGET
  const brierPass = brier !== null && brier <= SHADOW_BRIER_TARGET

  const rP = clamp01(resolved / SHADOW_RESOLVED_TARGET)
  const dP = clamp01(days / SHADOW_DAYS_TARGET)
  // Brier sub-progress: 0.40 reads 0, 0.20 reads 1. Counts only with data.
  const bP = brier === null ? 0 : clamp01((0.4 - brier) / (0.4 - SHADOW_BRIER_TARGET))

  const live = isBotLive(b)
  return {
    live,
    resolved,
    days,
    brier,
    winRate,
    tvl,
    resolvedPass,
    daysPass,
    brierPass,
    eligible: resolvedPass && daysPass && brierPass,
    pct: live ? 1 : (rP + dP + bP) / 3,
  }
}
