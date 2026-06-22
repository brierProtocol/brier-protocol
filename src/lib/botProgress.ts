// Honest shadow-phase progress for a bot, derived ONLY from real fields.
// No invented TVL or PnL. Eligibility gate (v1): 100 resolved predictions,
// Brier 0.20 or lower, 21 days live. Mirrors the rule shown across the product.

export const SHADOW_RESOLVED_TARGET = 100
export const SHADOW_DAYS_TARGET = 21
export const SHADOW_BRIER_TARGET = 0.2
// A freshly deployed bot gets a short grace window to make its first trade
// before we stop calling it "new" and start calling it idle.
export const NEW_GRACE_DAYS = 3

export interface BotLike {
  status?: string | null
  createdAt?: string | Date | null
  vaultOpen?: boolean | null
  currentTVL?: number | null
  tvl?: number | null
  scores?: Array<{ brierScore?: number; winRate?: number; totalTrades?: number } | null> | null
  brierScore?: number | null
  winRate?: number | null
  // Total trades indexed on-chain (incl. unresolved). Distinguishes a bot that
  // is trading-but-unresolved from one whose wallet has never traded.
  tradesIndexed?: number | null
}

// The honest lifecycle of a bot, kept deliberately simple:
//  new    — just deployed, grace window, nothing on-chain yet
//  shadow — proving in the open, vault still locked (the default pre-vault state)
//  live   — vault open / eligible
export type BotPhase = 'new' | 'shadow' | 'live'

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
  phase: BotPhase
  tradesIndexed: number
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
  // Total on-chain trades. Fall back to resolved when the caller did not load
  // the count, so we never wrongly flag an active bot as idle.
  const tradesIndexed = b.tradesIndexed ?? (resolved > 0 ? resolved : 0)

  let phase: BotPhase
  if (live) phase = 'live'
  else if (resolved === 0 && tradesIndexed === 0 && days <= NEW_GRACE_DAYS) phase = 'new'
  else phase = 'shadow'

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
    phase,
    tradesIndexed,
    pct: live ? 1 : (rP + dP + bP) / 3,
  }
}

// Single source of truth for how a phase reads in the UI: the pill label, its
// colour, and an honest one-line metric. Used by the feed and the catalog so a
// bot looks identical everywhere. No invented numbers.
export function phaseMeta(p: ShadowProgress): { tag: string; color: string; metric: string } {
  switch (p.phase) {
    case 'live':
      return { tag: 'LIVE', color: '#00d4aa', metric: p.brier !== null ? `BRIER ${p.brier.toFixed(3)}` : 'VAULT OPEN' }
    case 'shadow':
      return { tag: 'SHADOW', color: '#8b7bff', metric: `${p.resolved}/${SHADOW_RESOLVED_TARGET}` }
    default:
      return { tag: 'NEW', color: '#ff2a4d', metric: `day ${p.days}` }
  }
}
