// Core domain types for Brier Protocol.
//
// These mirror the Prisma models but are plain front-end-facing shapes: data
// that crosses the API boundary is JSON, so DateTime fields arrive as ISO
// strings (typed `string` here, not `Date`).

export type BotStatus = 'PAPER' | 'LIVE' | 'VAULT_ELIGIBLE_T1' | (string & {})
export type Tier = 'NONE' | 'TIER1' | (string & {})
export type TradeOutcome = 'WIN' | 'LOSS' | 'PENDING' | 'LIQUIDATED' | (string & {})

export interface Bot {
  id: string
  slug: string
  name: string
  description?: string | null
  tagline?: string | null
  color: string
  mood: string
  status: BotStatus
  tier: Tier
  pfpUrl?: string | null
  avatarId: string
  eyeShape: string
  marketType: string
  resolution: string
  mandate: string
  maxLeverage: number
  walletAddress: string
  vaultAddress?: string | null
  skinInGame: number
  vaultCap: number
  currentTVL: number
  vaultOpen: boolean
  strategyType: string
  createdAt: string
  updatedAt: string
  scores?: BotScore[]
}

export interface BotScore {
  id: string
  botId: string
  brierScore: number
  winRate: number
  sharpe: number
  totalTrades: number
  totalVolume: number
  // Max drawdown stored as a negative fraction (e.g. -0.18 = -18%).
  maxDrawdown: number
  snapshotDate: string
  isLatest: boolean
}

export interface VaultDeposit {
  id: string
  botId: string
  depositorWallet: string
  amountUsdc: number
  txHash?: string | null
  mode: string
  active: boolean
  totalProfitEarned: number
  depositedAt: string
  exitedAt?: string | null
  exitReason?: string | null
}

export interface TradeEvent {
  id: string
  botId: string
  marketId: string
  marketTitle: string
  side: string
  actionType: string
  leverage: number
  stopLossPrice?: number | null
  takeProfitPrice?: number | null
  amount: number
  entryPrice: number
  resolvedPrice: number
  outcome: TradeOutcome
  brierContrib: number
  executionWallet: string
  fraudFlag: boolean
  timestamp: string
  resolvedAt?: string | null
  source: string
  externalTradeId?: string | null
}

export interface User {
  walletAddress: string
  handle?: string | null
  name?: string | null
  bio?: string | null
  pfpUrl?: string | null
}

// ── Dashboard API (/api/dashboard) response shapes ──

export interface Allocation {
  bot: string
  slug: string
  vaultAddress: string | null
  dep: number
  prof: number
  pct: number
  mode: string
  brierScore: number
}

export interface DashboardHistoryItem {
  id: string
  type: 'earn' | 'loss' | 'mirror' | (string & {})
  bot: string
  amount: string
  date: string
  hash: string
}

export interface DashboardData {
  portfolioValue: number
  totalDeposited: number
  yield30d: number
  totalEarned: number
  annualizedReturn: number
  activePositions: number
  allocations: Allocation[]
  history: DashboardHistoryItem[]
}
