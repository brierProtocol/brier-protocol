import { prisma } from './db/prisma'

/**
 * Vault lifecycle — Darwinism black-swan handling.
 *
 * A vault is OPEN for deposits once the bot has graduated (it has a vaultAddress)
 * and has not been closed. On a blowup / risk breach the risk engine CLOSES it:
 * new deposits stop forever and depositors can only CLAIM — redeem their shares at
 * the current (now lower) NAV via /api/withdraw. Closing socializes the loss for
 * free: navPerShare already dropped, so claim = shares * navPerShare = what the
 * depositor put in MINUS their proportional share of the loss.
 */

export type VaultCloseReason = 'CIRCUIT_BREAKER' | 'DRAWDOWN_BREACH' | 'MANUAL'

type VaultGateBot = {
  vaultAddress: string | null
  vaultClosedAt: Date | null
  vaultCap: number
  currentTVL: number
}

/** Human-readable reason a vault won't accept a deposit, or null if it will. */
export function depositBlockReason(bot: VaultGateBot): string | null {
  if (!bot.vaultAddress) return 'This bot has not graduated to a live vault yet.'
  if (bot.vaultClosedAt) return 'This vault is closed. You can only claim your remaining balance.'
  if (bot.vaultCap > 0 && bot.currentTVL >= bot.vaultCap) {
    return 'This vault is at capacity and is not accepting new deposits.'
  }
  return null
}

/** True once a vault has been wound down — UI shows "Claim" instead of "Redeem". */
export function isVaultClosed(bot: { vaultClosedAt: Date | null }): boolean {
  return bot.vaultClosedAt !== null
}

/**
 * Close a vault (idempotent on the open→closed edge). Called by the risk engine
 * when its conditions are met — that engine is still a mock (hardcoded price feed,
 * see brier-executor worker). Stops deposits; claims stay open via /api/withdraw.
 */
export async function closeVault(botId: string, reason: VaultCloseReason) {
  return prisma.bot.update({
    where: { id: botId },
    data: { vaultClosedAt: new Date(), vaultCloseReason: reason, vaultOpen: false },
  })
}
