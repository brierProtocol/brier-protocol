import type { MarketResolution, PolymarketAdapter } from './adapter.js';

/** A trade awaiting market resolution (subset of the TradeEvent row + its bot). */
export interface PendingTrade {
  id: string;
  botId: string;
  marketId: string;
  side: string;        // 'YES' | 'NO'
  size: number;        // USDC committed to the position
  entryPrice: number;  // decimal odds at entry, in (0, 1]
  // On-chain settlement metadata (present once the trade is vault-backed).
  vaultAddress?: string | null;
  conditionId?: string | null;
}

/** What the settlement step needs to close a SPOT trade. */
export interface SettlementInstruction {
  tradeId: string;
  botId: string;
  marketId: string;
  side: string;
  won: boolean;
  payoutUsdc: number;
  profitUsdc: number;
  vaultAddress?: string | null;
  conditionId?: string | null;
}

/** Addresses needed to redeem CTF positions on-chain (from config/env). */
export interface SettlementJobConfig {
  ctfAddress: string;
  collateralToken: string; // USDC
}

/** The exact payload the BullMQ settlement worker consumes. */
export interface SettlementJob {
  tradeId: string;
  botId: string;
  vaultAddress: string;
  ctfAddress: string;
  conditionId: string;
  collateralToken: string;
  indexSets: number[];
  payout: number;
}

/**
 * Builds the on-chain settlement job from a resolved instruction + config.
 * For a binary market, the holder redeems the index set of the outcome they
 * bought: YES = 0b01 = 1, NO = 0b10 = 2. Throws if the trade isn't vault-backed
 * yet (no vault / conditionId) — those stay DB-only until graduated.
 */
export function buildSettlementJob(
  s: SettlementInstruction,
  cfg: SettlementJobConfig,
): SettlementJob {
  if (!s.vaultAddress) throw new Error(`trade ${s.tradeId}: missing vaultAddress`);
  if (!s.conditionId) throw new Error(`trade ${s.tradeId}: missing conditionId`);
  const indexSets = [s.side.trim().toUpperCase() === 'NO' ? 2 : 1];
  return {
    tradeId: s.tradeId,
    botId: s.botId,
    vaultAddress: s.vaultAddress,
    ctfAddress: cfg.ctfAddress,
    conditionId: s.conditionId,
    collateralToken: cfg.collateralToken,
    indexSets,
    payout: s.payoutUsdc,
  };
}

/**
 * Binary CTF payout for a SPOT prediction-market position.
 * Buying `size` USDC of an outcome at `entryPrice` yields `size / entryPrice`
 * shares. Each winning share redeems for 1 USDC; losing shares are worth 0.
 */
export function computeBinaryPayout(size: number, entryPrice: number, sideWon: boolean): number {
  if (!(entryPrice > 0 && entryPrice <= 1)) {
    throw new Error(`entryPrice must be in (0, 1], got ${entryPrice}`);
  }
  if (size <= 0) return 0;
  if (!sideWon) return 0;
  return size / entryPrice;
}

/** True if the trade's side matches the market's winning outcome. */
export function isWinningSide(side: string, winningOutcome: 'YES' | 'NO'): boolean {
  return side.trim().toUpperCase() === winningOutcome;
}

/** Builds a settlement instruction, or null if the market hasn't resolved yet. */
export function buildSettlement(
  trade: PendingTrade,
  resolution: MarketResolution,
): SettlementInstruction | null {
  if (!resolution.resolved) return null;
  const won = isWinningSide(trade.side, resolution.winningOutcome);
  const payoutUsdc = computeBinaryPayout(trade.size, trade.entryPrice, won);
  return {
    tradeId: trade.id,
    botId: trade.botId,
    marketId: trade.marketId,
    side: trade.side,
    won,
    payoutUsdc,
    profitUsdc: payoutUsdc - trade.size,
    vaultAddress: trade.vaultAddress ?? null,
    conditionId: trade.conditionId ?? null,
  };
}

/**
 * Flags a short-duration trade that is overdue for resolution. For 5-15 minute
 * Polymarket markets, anything still pending well past its window likely needs a
 * manual look (oracle stall, mis-mapped market id, etc.).
 */
export function isOverdue(openedAtMs: number, nowMs: number, maxAgeMs: number): boolean {
  return nowMs - openedAtMs > maxAgeMs;
}

/**
 * Core resolution loop. Pure of I/O except the injected adapter and sink, which
 * makes it fully unit-testable. Checks each pending trade and emits a settlement
 * instruction for every market that has resolved. A failing adapter call for one
 * market is logged and skipped so it never stalls the batch.
 */
export async function resolvePendingTrades(
  trades: readonly PendingTrade[],
  adapter: PolymarketAdapter,
  onSettlement: (instruction: SettlementInstruction) => Promise<void>,
): Promise<SettlementInstruction[]> {
  const settled: SettlementInstruction[] = [];
  for (const trade of trades) {
    let resolution: MarketResolution;
    try {
      resolution = await adapter.getResolution(trade.marketId);
    } catch (err) {
      console.error(`[resolve] adapter error for market ${trade.marketId}:`, err);
      continue;
    }
    const instruction = buildSettlement(trade, resolution);
    if (instruction) {
      await onSettlement(instruction);
      settled.push(instruction);
    }
  }
  return settled;
}
