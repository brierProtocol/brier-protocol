import { prisma } from './db/prisma'
import { userPortfolioTotals } from './portfolio'

/**
 * Equity snapshots — daily portfolio history per investor.
 *
 * A daily cron stamps each investor's balance/invested/pnl. The dashboard reads
 * the series for [30D_EQUITY_CURVE] and an honest EST. APY (annualized from the
 * real holding period — no fabricated multipliers).
 */

const MS_PER_DAY = 86_400_000
const MIN_DAYS_TO_ANNUALIZE = 7 // below this, show the simple period return, not a wild extrapolation

/** Midnight-UTC bucket for a given time, so there is one snapshot per user per day. */
function dayKey(at: number = Date.now()): Date {
  const d = new Date(at)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/** Upsert today's snapshot for one investor. Returns the snapshot. */
export async function snapshotUserEquity(userWallet: string, at: number = Date.now()) {
  const totals = await userPortfolioTotals(userWallet)
  const date = dayKey(at)
  return prisma.userEquitySnapshot.upsert({
    where: { userWallet_date: { userWallet, date } },
    update: { balanceUsdc: totals.balanceUsdc, investedUsdc: totals.investedUsdc, pnlUsdc: totals.pnlUsdc },
    create: { userWallet, date, ...totals },
  })
}

/** Snapshot every investor that currently holds at least one position. */
export async function snapshotAllEquity(at: number = Date.now()): Promise<number> {
  const holders = await prisma.vaultPosition.findMany({
    where: { shares: { gt: 0 } },
    distinct: ['userWallet'],
    select: { userWallet: true },
  })
  for (const h of holders) await snapshotUserEquity(h.userWallet, at)
  return holders.length
}

/** Last `days` daily balances for the equity curve, oldest → newest. */
export async function userEquitySeries(userWallet: string, days = 30): Promise<number[]> {
  const since = dayKey(Date.now() - (days - 1) * MS_PER_DAY)
  const rows = await prisma.userEquitySnapshot.findMany({
    where: { userWallet: { equals: userWallet, mode: 'insensitive' }, date: { gte: since } },
    orderBy: { date: 'asc' },
    select: { balanceUsdc: true },
  })
  return rows.map((r) => r.balanceUsdc)
}

/**
 * Honest EST. APY: the real holding-period return, annualized. Holding period is
 * measured from the investor's earliest deposit. Under MIN_DAYS_TO_ANNUALIZE we
 * return the plain period return (%) instead of extrapolating a tiny window.
 */
export async function estimatedApy(userWallet: string, now: number = Date.now()): Promise<number> {
  const totals = await userPortfolioTotals(userWallet)
  if (totals.investedUsdc <= 0) return 0

  const earliest = await prisma.vaultPosition.findFirst({
    where: { userWallet: { equals: userWallet, mode: 'insensitive' } },
    orderBy: { firstDepositAt: 'asc' },
    select: { firstDepositAt: true },
  })
  const days = earliest ? Math.max(1, (now - earliest.firstDepositAt.getTime()) / MS_PER_DAY) : 1
  const periodReturn = totals.pnlUsdc / totals.investedUsdc
  const annualized = days >= MIN_DAYS_TO_ANNUALIZE ? periodReturn * (365 / days) : periodReturn
  return parseFloat((annualized * 100).toFixed(1))
}
