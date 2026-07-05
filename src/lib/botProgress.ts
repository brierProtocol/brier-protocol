// Honest shadow-phase progress for a bot, derived ONLY from real fields.
// No invented TVL or PnL. Eligibility gate (v1): 100 resolved predictions,
// LCB > 0, 21 days live. Mirrors the rule shown across the product.

export const SHADOW_RESOLVED_TARGET = 100
export const SHADOW_DAYS_TARGET = 21
export const SHADOW_LCB_TARGET = 0 // Needs to be > 0
export const NEW_GRACE_DAYS = 3

// Rank tiers — honest gamification, earned purely from resolved predictions.
// PROVEN coincides exactly with the shadow gate's resolved requirement, so the
// "game" and the protocol agree by construction. Shared by the profile hero
// and the Signal panel so a bot never wears two different ranks.
export type BotRank = { at: number; tag: string; color: string }
export const BOT_RANKS: BotRank[] = [
  { at: 0, tag: 'UNRANKED', color: '#5a5a64' },
  { at: 1, tag: 'SCOUT', color: '#8b7bff' },
  { at: 10, tag: 'OPERATOR', color: '#4fc3f7' },
  { at: 30, tag: 'SPECIALIST', color: '#c8ff00' },
  { at: 60, tag: 'VETERAN', color: '#ffd400' },
  { at: SHADOW_RESOLVED_TARGET, tag: 'PROVEN', color: '#ff2a4d' },
]
export function botRank(resolved: number): BotRank {
  let r = BOT_RANKS[0]
  for (const cand of BOT_RANKS) if (resolved >= cand.at) r = cand
  return r
}

export interface BotLike {
  status?: string | null
  createdAt?: string | Date | null
  vaultOpen?: boolean | null
  currentTVL?: number | null
  tvl?: number | null
  scores?: Array<{ lcb?: number | null; brierScore?: number | null; winRate?: number; totalTrades?: number } | null> | null
  lcb?: number | null
  brierScore?: number | null
  winRate?: number | null
  tradesIndexed?: number | null
}

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
  lcb: number | null
  winRate: number | null
  tvl: number
  resolvedPass: boolean
  daysPass: boolean
  lcbPass: boolean
  eligible: boolean
  phase: BotPhase
  tradesIndexed: number
  pct: number
}

export function shadowProgress(b: BotLike): ShadowProgress {
  const score = b.scores?.[0] ?? null
  const resolved = score?.totalTrades ?? 0
  const lcbRaw = score?.lcb ?? b.lcb ?? null
  const lcb = resolved > 0 && typeof lcbRaw === 'number' ? lcbRaw : null
  const winRate = score?.winRate ?? b.winRate ?? null
  const tvl = b.currentTVL ?? b.tvl ?? 0
  // Skill vs the market (LCB). This, not raw Brier, is the quality gate.
  const skill = resolved > 0 && typeof score?.lcb === 'number' ? score.lcb : null

  const created = b.createdAt ? new Date(b.createdAt).getTime() : Date.now()
  const days = Math.max(0, Math.floor((Date.now() - created) / 86_400_000))

  const resolvedPass = resolved >= SHADOW_RESOLVED_TARGET
  const daysPass = days >= SHADOW_DAYS_TARGET
  const lcbPass = lcb !== null && lcb > SHADOW_LCB_TARGET

  const rP = clamp01(resolved / SHADOW_RESOLVED_TARGET)
  const dP = clamp01(days / SHADOW_DAYS_TARGET)
  const lP = lcb === null ? 0 : clamp01((lcb + 0.1) / (0.1)) // mapping LCB [-0.1, 0] to [0, 1] for progress

  const live = isBotLive(b)
  const tradesIndexed = b.tradesIndexed ?? (resolved > 0 ? resolved : 0)

  let phase: BotPhase
  if (live) phase = 'live'
  else if (resolved === 0 && tradesIndexed === 0 && days <= NEW_GRACE_DAYS) phase = 'new'
  else phase = 'shadow'

  return {
    live, resolved, days, lcb, winRate, tvl,
    resolvedPass, daysPass, lcbPass,
    eligible: resolvedPass && daysPass && lcbPass,
    phase, tradesIndexed,
    pct: live ? 1 : (rP + dP + lP) / 3,
  }
}

export function phaseMeta(p: ShadowProgress): { tag: string; color: string; metric: string } {
  switch (p.phase) {
    case 'live':
      return { tag: 'LIVE', color: '#eef0f6', metric: p.lcb !== null ? `LCB ${p.lcb.toFixed(3)}` : 'VAULT OPEN' }
    case 'shadow':
      return { tag: 'SHADOW', color: '#8b7bff', metric: `${p.resolved}/${SHADOW_RESOLVED_TARGET}` }
    default:
      return { tag: 'NEW', color: '#ff2a4d', metric: `day ${p.days}` }
  }
}
