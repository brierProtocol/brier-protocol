import { prisma } from './db/prisma'

/**
 * Shared portfolio math (single source of truth). Both GET /api/dashboard and the
 * equity-snapshot cron use these so the NAV/PnL formula can never drift.
 */

/** USDC value of one vault share. Losses drop it; a vault with no shares is 1:1. */
export function navPerShare(bot: { totalShares: number; currentTVL: number }): number {
  return bot.totalShares > 0 ? bot.currentTVL / bot.totalShares : 1
}

export interface PortfolioTotals {
  balanceUsdc: number   // TOTAL BALANCE — current value of all holdings
  investedUsdc: number  // INVESTED CAPITAL — cost basis still at work
  pnlUsdc: number       // ALL-TIME PNL — unrealized + realized
}

/** Aggregate an investor's portfolio across all their vault positions. */
export async function userPortfolioTotals(userWallet: string): Promise<PortfolioTotals> {
  const positions = await prisma.vaultPosition.findMany({
    where: { userWallet: { equals: userWallet, mode: 'insensitive' } },
    include: { bot: { select: { totalShares: true, currentTVL: true } } },
  })

  let balance = 0
  let invested = 0
  let pnl = 0
  for (const p of positions) {
    const value = p.shares * navPerShare(p.bot)
    balance += value
    invested += p.costBasisUsdc
    pnl += value - p.costBasisUsdc + p.realizedPnlUsdc
  }

  return {
    balanceUsdc: parseFloat(balance.toFixed(2)),
    investedUsdc: parseFloat(invested.toFixed(2)),
    pnlUsdc: parseFloat(pnl.toFixed(2)),
  }
}
