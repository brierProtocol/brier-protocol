import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { isBotStale } from '@/lib/heartbeat';
import { navPerShare } from '@/lib/portfolio';
import { userEquitySeries, estimatedApy } from '@/lib/equity';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address query parameter is required' }, { status: 400 });
  }

  try {
    // Portfolio is built from VaultPosition (the share-based source of truth), not
    // from summing raw VaultDeposit rows. Case-insensitive: a position may have been
    // stored with a different wallet case than the one the dashboard queries with.
    const positions = await prisma.vaultPosition.findMany({
      where: { userWallet: { equals: address, mode: 'insensitive' } },
      include: { bot: { include: { scores: { where: { isLatest: true }, take: 1 } } } },
    });

    if (positions.length === 0) {
      // Even if they have no positions, they might have creator earnings
      const creatorEarningsResult = await prisma.distribution.aggregate({
        where: { bot: { ownerWallet: { equals: address, mode: 'insensitive' } } },
        _sum: { builderCut: true }
      });
      const creatorEarnings = creatorEarningsResult._sum.builderCut || 0;

      return NextResponse.json({
        portfolioValue: 0,
        totalDeposited: 0,
        yield30d: 0,
        totalEarned: 0,
        annualizedReturn: 0,
        activePositions: 0,
        creatorEarnings,
        allocations: [],
        history: [],
        equityCurve: [],
      });
    }

    const now = Date.now();
    let portfolioValue = 0;   // TOTAL BALANCE — current value of all holdings
    let investedCapital = 0;  // INVESTED CAPITAL — cost basis still at work
    let allTimePnL = 0;       // ALL-TIME PNL — unrealized + realized

    const allocations = positions
      // Aggregate over EVERY position first (closed ones still carry realized PnL),
      // then keep only the currently-held ones for the grid.
      .map((pos) => {
        const bot = pos.bot;
        // navPerShare reflects profit/loss: NAV drops on losses, so a position's
        // value (and a closed-vault claim) is automatically deposited − loss.
        const value = pos.shares * navPerShare(bot);
        const pnl = value - pos.costBasisUsdc + pos.realizedPnlUsdc;

        portfolioValue += value;
        investedCapital += pos.costBasisUsdc;
        allTimePnL += pnl;

        const score = bot.scores[0];
        return {
          held: pos.shares > 0,
          id: bot.id,
          bot: bot.name,
          slug: bot.slug,
          vaultAddress: bot.vaultAddress,
          pfpUrl: bot.pfpUrl,
          color: bot.color,
          eyeShape: bot.eyeShape,
          vaultCap: bot.vaultCap,
          currentTVL: bot.currentTVL,
          shares: pos.shares,
          value: parseFloat(value.toFixed(2)),
          dep: pos.costBasisUsdc,
          prof: parseFloat(pnl.toFixed(2)),
          pct: pos.costBasisUsdc > 0 ? parseFloat(((pnl / pos.costBasisUsdc) * 100).toFixed(1)) : 0,
          mode: pos.mode,
          brierScore: score ? score.brierScore : 0.25,
          // L3 + L5 surfaced to the UI: a closed vault shows "Claim" not "Redeem";
          // a stale bot must not read as "operating".
          vaultClosed: bot.vaultClosedAt !== null,
          stale: isBotStale(bot, now),
        };
      })
      .filter((a) => a.held);

    // Recent activity across the bots the user holds.
    const botIds = positions.map((p) => p.botId);
    const trades = await prisma.tradeEvent.findMany({
      where: { botId: { in: botIds } },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });
    const nameById = new Map(positions.map((p) => [p.botId, p.bot.name]));
    const history = trades.map((trade) => ({
      id: trade.id.substring(0, 8),
      type: trade.outcome === 'WIN' ? 'earn' : trade.outcome === 'LOSS' ? 'loss' : 'mirror',
      bot: nameById.get(trade.botId) || 'Unknown',
      amount: `${trade.outcome === 'WIN' ? '+' : trade.outcome === 'LOSS' ? '-' : ''}$${trade.amount.toLocaleString()}`,
      date: new Date(trade.timestamp).toLocaleDateString('en-US', {
        month: '2-digit', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
      }),
      hash: trade.externalTradeId
        ? `${trade.externalTradeId.substring(0, 6)}...${trade.externalTradeId.substring(trade.externalTradeId.length - 4)}`
        : '0x0000...0000',
    }));

    // Equity curve + honest EST. APY from the daily snapshots (L7).
    const equityCurve = await userEquitySeries(address, 30);
    const annualizedReturn = await estimatedApy(address);
    const yield30d = equityCurve.length >= 2 && equityCurve[0] > 0
      ? parseFloat((((equityCurve[equityCurve.length - 1] - equityCurve[0]) / equityCurve[0]) * 100).toFixed(1))
      : 0;

    const creatorEarningsResult = await prisma.distribution.aggregate({
      where: { bot: { ownerWallet: { equals: address, mode: 'insensitive' } } },
      _sum: { builderCut: true }
    });
    const creatorEarnings = creatorEarningsResult._sum.builderCut || 0;

    return NextResponse.json({
      portfolioValue: parseFloat(portfolioValue.toFixed(2)),
      totalDeposited: parseFloat(investedCapital.toFixed(2)),
      totalEarned: parseFloat(allTimePnL.toFixed(2)),
      yield30d,
      annualizedReturn,
      activePositions: allocations.length,
      creatorEarnings: parseFloat(creatorEarnings.toFixed(2)),
      allocations,
      history,
      equityCurve,
    });
  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard metrics' }, { status: 500 });
  }
}
