/**
 * Feature flags — single source of truth.
 *
 * v1 is a reputation layer only. The capital layer (vaults, deposits, TVL)
 * is gated behind NEXT_PUBLIC_ENABLE_CAPITAL and defaults to OFF.
 *
 * To re-enable for Phase 3, set NEXT_PUBLIC_ENABLE_CAPITAL=true in .env.
 */
export const FEATURES = {
  /** When false, all deposit/vault/TVL functionality is disabled. */
  CAPITAL_LAYER: process.env.NEXT_PUBLIC_ENABLE_CAPITAL === 'true',
} as const;
