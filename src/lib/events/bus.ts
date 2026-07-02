/**
 * EVENT BUS — the spine of the protocol.
 *
 * Every meaningful thing that happens emits an event into an append-only log
 * (ProtocolEvent). Today the only consumer is the public /api/v1/events feed,
 * but the contract is designed so that tomorrow's consumers — alerts, analytics,
 * dashboards, the oracle, audits — all read the SAME events without changing the
 * producers. Producers emit; they never know who listens.
 *
 * Design rules:
 *  - Append-only. We never update or delete events. The history is the asset.
 *  - Emitting is best-effort: a failed emit must NEVER break the business action
 *    that triggered it (a trade settles even if the event log is momentarily down).
 *  - The payload is JSON so new event types add fields without a schema migration.
 */
import { prisma } from '@/lib/db/prisma'

// Canonical event catalog. Add new types here; this is the single source of truth.
export const EVENT_TYPES = {
  AgentRegistered: 'AgentRegistered',
  PredictionCreated: 'PredictionCreated',
  PredictionResolved: 'PredictionResolved',
  TradeOpened: 'TradeOpened',
  TradeClosed: 'TradeClosed',
  ScoreUpdated: 'ScoreUpdated',
  VaultOpened: 'VaultOpened',
  VaultPaused: 'VaultPaused',
  VaultResumed: 'VaultResumed',
  CapitalDeposited: 'CapitalDeposited',
  CapitalWithdrawn: 'CapitalWithdrawn',
} as const

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES]

export interface EmitInput {
  type: EventType
  botId?: string | null
  vaultAddress?: string | null
  /** Arbitrary structured body for this event. */
  payload?: Record<string, unknown>
}

/**
 * Emit a protocol event. Best-effort: never throws — on failure it logs and
 * returns null so the caller's main flow is unaffected.
 */
export async function emit(input: EmitInput): Promise<{ id: string } | null> {
  try {
    const ev = await prisma.protocolEvent.create({
      data: {
        type: input.type,
        botId: input.botId ?? null,
        vaultAddress: input.vaultAddress ?? null,
        payload: (input.payload ?? {}) as object,
      },
      select: { id: true },
    })
    return ev
  } catch (err: any) {
    // If the table does not exist yet (migration not applied in this env) or the
    // DB hiccups, we swallow it — the business action must still succeed.
    console.warn(`[event-bus] emit ${input.type} failed (non-fatal):`, err?.message || err)
    return null
  }
}

/** Convenience wrappers for the common events (typed call sites). */
export const events = {
  scoreUpdated: (botId: string, p: { brierScore: number; winRate: number; sharpe: number; totalTrades: number; status?: string }) =>
    emit({ type: EVENT_TYPES.ScoreUpdated, botId, payload: p }),

  agentRegistered: (botId: string, p: { slug: string; name: string; walletAddress: string }) =>
    emit({ type: EVENT_TYPES.AgentRegistered, botId, payload: p }),

  predictionResolved: (botId: string, p: { marketId: string; side: string; outcome: string; resolvedPrice: number }) =>
    emit({ type: EVENT_TYPES.PredictionResolved, botId, payload: p }),

  vaultPaused: (botId: string, vaultAddress: string | null, p: { reason: string; brierDelta?: number }) =>
    emit({ type: EVENT_TYPES.VaultPaused, botId, vaultAddress, payload: p }),

  capitalDeposited: (botId: string, vaultAddress: string | null, p: { depositorWallet: string; amountUsdc: number; txHash?: string | null }) =>
    emit({ type: EVENT_TYPES.CapitalDeposited, botId, vaultAddress, payload: p }),
}
