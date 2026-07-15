import { personLabel as sharedPersonLabel } from '@/lib/identity'
import { codename } from '@/lib/botIdentity'

// ── Shared types + helpers for the bot profile page and its extracted panels ──

export interface Post {
  id: string; wallet: string; text: string; createdAt: string;
  user?: { handle?: string | null; name?: string | null; pfpUrl?: string | null } | null
}

// A single committed call as the profile consumes it. The list can hold either
// Prediction rows or indexed TradeEvent rows, so fields that only exist on one
// shape are optional and read defensively (status ?? outcome, confidence ?? entryPrice).
export interface ProfileTrade {
  id?: string
  externalTradeId?: string | null
  status?: string
  outcome?: string
  marketTitle?: string | null
  side?: string
  confidence?: number | null
  entryPrice?: number | null
  marketProbabilityAtCommit?: number | null
  timestamp?: string | Date | null
}

// A historical score snapshot as mapped from the API. Loose on purpose:
// pre-reputation rows may lack lcb / reputationScore.
export interface ProfileScore {
  brierScore?: number | null
  lcb?: number | null
  reputationScore?: number | null
  snapshotDate?: string | null
  isLatest?: boolean
}

export interface ProfilePnlSnapshot {
  cumulativePnl?: number | null
  pnlUsd?: number | null
  date?: string | null
}

export interface ProfileMaker {
  handle?: string | null
  name?: string | null
  pfpUrl?: string | null
}

// The view-model the page builds from the raw /api/bots/[slug] response. This is
// deliberately NOT the global `Bot` type: the page flattens the DB bot + its
// latest score into one object the UI reads directly (bot.brierScore, bot.tvl…).
export interface BotProfileVM {
  id: string
  name: string
  builder: string
  tagline?: string | null
  pfpUrl?: string | null
  maker: ProfileMaker | null
  description?: string | null
  status: string
  color?: string | null
  eyeShape?: string | null
  createdAt: string
  vaultOpen?: boolean
  vaultAddress?: string | null
  vaultCap: number
  tvl: number
  sharePrice: number
  categories: string[]
  verified: boolean
  brierScore: number | null
  winRate: number | null
  sharpe: number | null
  lcb: number | null
  maxDrawdown: number | null
  totalTrades: number
  totalVolume: number | null
  reputationScore: number | null
  resolvedPredictions: number
  reputationHistory: number[]
  lastHeartbeatAt: string | null
  liveActivity: string | null
  scoreHistory: { brier: number | null; date: string | null }[]
  allScores: ProfileScore[]
  predictions: ProfileTrade[]
  pnlSnapshots: ProfilePnlSnapshot[]
  tradesIndexed: number
  skinInGame: number
  categoriesData: unknown[]
}

// One color per Polymarket category — used by the hunting-grounds panel and the
// per-call dots in the prediction book so a bot from ANY category reads as
// first-class on this page.
export const CATEGORY_COLORS: Record<string, string> = {
  politics: '#8b7bff', crypto: '#c8ff00', sports: '#4fc3f7', economy: '#ffd400',
  culture: '#ff5ccd', tech: '#4285f0', world: '#ff8a3c', other: '#8a8a94',
}

export const relDay = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null

export function txOf(t: ProfileTrade): string | null {
  const hash = String(t.externalTradeId || '').split('-')[0]
  return hash.startsWith('0x') && hash.length >= 40 ? hash : null
}

// Universal identity: the SAME resolver the navbar and maker page use, so one
// wallet never reads as two different people. Anonymous commenters keep their
// deterministic codename (more human than a hex stub in a conversation).
export const personLabel = (u?: Post['user'], wallet = '') => {
  const label = sharedPersonLabel(u, wallet)
  return label.startsWith('0x') || label === '—' ? codename(wallet) : label
}
