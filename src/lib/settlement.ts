import { prisma } from './db/prisma'
import { DISTRIBUTION_SPLIT } from './distribution'
import { tradingFee } from '../constants/fees'

/**
 * Settlement → NAV mirror (L6).
 *
 * The REAL settlement happens on-chain: the executor calls vault.settleMarket()
 * and USDC moves in the ERC-4626 vault. This module mirrors that into the
 * off-chain NAV (Bot.currentTVL) so the dashboard reads a fresh balance, and books
 * the 60/30/10 split (L4).
 *
 * Economics:
 *  - WIN  → profit P. Only the depositors' 60% stays in the vault NAV; the builder
 *           30% + protocol 10% leave (recorded as a Distribution).
 *  - LOSS → depositors bear the FULL hit; losses are not split (Darwinism).
 *
 * Idempotent: TradeEvent.vaultBookedAt guarantees each trade hits NAV exactly once.
 */

const RESOLVED = new Set(['WIN', 'LOSS', 'LIQUIDATED'])

type SettleableTrade = {
  id: string
  botId: string
  outcome: string
  amount: number
  entryPrice: number
  vaultBookedAt: Date | null
  externalTradeId: string | null
  // The bot's market type, so we can charge the right §2.1 trading fee.
  marketType?: string | null
}

/**
 * Net USDC PnL of a resolved binary trade. entryPrice is the price paid (0..1):
 * a WIN pays $1 per share (shares = amount / entryPrice); a LOSS/LIQUIDATION loses
 * the stake. Unresolved trades are 0.
 *
 * Example — WIN at $0.60 on $100 staked: shares = 100 / 0.60, each pays $1, so
 * profit = 100 * ((1 - 0.60) / 0.60) = 100 * (0.40 / 0.60) = $66.67.
 */
export function tradePnl(t: { outcome: string; amount: number; entryPrice: number }): number {
  if (t.outcome === 'WIN') {
    const p = t.entryPrice > 0 && t.entryPrice < 1 ? t.entryPrice : 0.5
    return t.amount * ((1 - p) / p)
  }
  if (t.outcome === 'LOSS' || t.outcome === 'LIQUIDATED') return -t.amount
  return 0
}

/**
 * Book one resolved trade into the bot's NAV (once). Returns { pnl, navDelta } or
 * null if the trade is unresolved or already booked.
 */
export async function bookTradeSettlement(trade: SettleableTrade) {
  if (trade.vaultBookedAt || !RESOLVED.has(trade.outcome)) return null

  const pnl = tradePnl(trade)
  // §2.1 protocol trading fee, charged on the notional of every resolved trade.
  const fee = tradingFee(trade.marketType, trade.amount)
  // Net result after the trading fee; the 60/30/10 split applies to net PROFIT.
  const net = pnl - fee
  // On net profit only the depositors' cut stays in NAV; on a loss (or net loss)
  // depositors eat it all, fee included.
  const navDelta = net > 0 ? net * DISTRIBUTION_SPLIT.depositors : net

  const ops: any[] = [
    // NOTE: increment can in theory drive a mirror below 0 if a single loss exceeds
    // TVL; in practice amount << TVL. Clamping would need a read (breaks atomicity).
    prisma.bot.update({ where: { id: trade.botId }, data: { currentTVL: { increment: navDelta } } }),
    prisma.tradeEvent.update({ where: { id: trade.id }, data: { vaultBookedAt: new Date() } }),
  ]
  if (net > 0) {
    ops.push(
      prisma.distribution.create({
        data: {
          botId: trade.botId,
          grossProfitUsdc: net,
          depositorCut: net * DISTRIBUTION_SPLIT.depositors,
          builderCut: net * DISTRIBUTION_SPLIT.builder,
          protocolCut: net * DISTRIBUTION_SPLIT.protocol,
          sourceTradeId: trade.externalTradeId ?? trade.id,
        },
      }),
    )
  }
  await prisma.$transaction(ops)
  return { pnl, fee, net, navDelta }
}

/** Book every resolved-but-unbooked trade into NAV. Returns counts for the cron log. */
export async function settleResolvedTrades(): Promise<{ booked: number; totalNavDelta: number }> {
  const trades = await prisma.tradeEvent.findMany({
    where: { outcome: { in: ['WIN', 'LOSS', 'LIQUIDATED'] }, vaultBookedAt: null },
    select: {
      id: true, botId: true, outcome: true, amount: true, entryPrice: true,
      vaultBookedAt: true, externalTradeId: true,
      bot: { select: { marketType: true } },
    },
  })

  let booked = 0
  let totalNavDelta = 0
  for (const t of trades) {
    const r = await bookTradeSettlement({ ...t, marketType: t.bot.marketType })
    if (r) {
      booked += 1
      totalNavDelta += r.navDelta
    }
  }
  return { booked, totalNavDelta: parseFloat(totalNavDelta.toFixed(2)) }
}
