import { prisma } from './db/prisma'

/**
 * Profit distribution — the 60/30/10 split.
 *
 * When a settlement books POSITIVE profit for a bot, it is split between the
 * depositors (60%), the builder/maker (30%) and the protocol (10%). Losses are
 * never distributed — they hit NAV directly (Darwinism). Builder earnings are
 * the sum of builderCut across the bots a maker owns (Bot.ownerWallet).
 */
export const DISTRIBUTION_SPLIT = {
  depositors: 0.6,
  builder: 0.3,
  protocol: 0.1,
} as const

/** Record one profit-split event. No-op (returns null) for non-positive profit. */
export async function recordDistribution(
  botId: string,
  grossProfitUsdc: number,
  sourceTradeId?: string,
) {
  if (!(grossProfitUsdc > 0)) return null
  return prisma.distribution.create({
    data: {
      botId,
      grossProfitUsdc,
      depositorCut: grossProfitUsdc * DISTRIBUTION_SPLIT.depositors,
      builderCut: grossProfitUsdc * DISTRIBUTION_SPLIT.builder,
      protocolCut: grossProfitUsdc * DISTRIBUTION_SPLIT.protocol,
      sourceTradeId: sourceTradeId ?? null,
    },
  })
}

/** Total USDC a maker has earned (30% cut) across every bot they own. */
export async function builderEarnings(ownerWallet: string): Promise<number> {
  const agg = await prisma.distribution.aggregate({
    where: { bot: { ownerWallet } },
    _sum: { builderCut: true },
  })
  return agg._sum.builderCut ?? 0
}
