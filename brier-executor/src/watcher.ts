import { PrismaClient } from '@prisma/client';
import axios from 'axios';

// Initialize Prisma client specifically for the Watcher to read the DB
const prisma = new PrismaClient();

export class ResolutionWatcher {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkIntervalMs = 5 * 60 * 1000; // 5 minutes

  constructor() {
    console.log('[WATCHER] Initialized Resolution Watcher. Polling interval: 5m');
  }

  public start() {
    if (this.intervalId) return;
    
    console.log('[WATCHER] Starting Oracle Polling Service...');
    
    // Initial check on boot
    this.checkPendingMarkets();

    this.intervalId = setInterval(() => {
      this.checkPendingMarkets();
    }, this.checkIntervalMs);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[WATCHER] Stopped Oracle Polling Service.');
    }
  }

  private async checkPendingMarkets() {
    console.log(`[WATCHER] [${new Date().toISOString()}] Scanning for PENDING trades...`);
    try {
      // Find trades that are PENDING to see if their market has resolved
      const pendingTrades = await prisma.tradeEvent.findMany({
        where: { outcome: 'PENDING' }
      });

      if (pendingTrades.length === 0) {
        console.log('[WATCHER] No pending trades found.');
        return;
      }

      console.log(`[WATCHER] Found ${pendingTrades.length} pending trades. Checking Oracles...`);

      for (const trade of pendingTrades) {
        await this.processTrade(trade);
      }

    } catch (error) {
      console.error('[WATCHER] Error scanning markets:', error);
    }
  }

  private async processTrade(trade: any) {
    try {
      // ── REAL ORACLE: query Polymarket's CLOB for the market's resolution ──
      // marketId is the CTF conditionId. The CLOB market endpoint returns `closed`
      // and a `tokens` array; once resolved, exactly one token has `winner: true`.
      const base = process.env.POLYMARKET_CLOB_URL || 'https://clob.polymarket.com';
      const { data } = await axios.get(`${base}/markets/${trade.marketId}`, { timeout: 15000 });

      if (!data || data.closed !== true) {
        return; // market still open — leave PENDING
      }

      const tokens: Array<{ outcome?: string; winner?: boolean; price?: number }> = data.tokens || [];
      const winningToken = tokens.find(t => t.winner === true);
      if (!winningToken) {
        // Closed but winner not finalized yet (UMA dispute window) — retry next cycle.
        console.log(`[WATCHER] Market ${trade.marketId} closed but winner not finalized yet.`);
        return;
      }

      // Map the bot's recorded side to the winning outcome.
      const winningOutcome = (winningToken.outcome || '').toUpperCase();   // "YES" / "NO"
      const betSide = (trade.side || '').toUpperCase();                    // YES | NO | LONG | SHORT
      const normalizedBet = betSide === 'LONG' ? 'YES' : betSide === 'SHORT' ? 'NO' : betSide;
      const didWin = normalizedBet === winningOutcome;

      console.log(`[WATCHER] Market ${trade.marketId} RESOLVED → ${winningOutcome}. Trade ${trade.id} (${normalizedBet}) = ${didWin ? 'WIN' : 'LOSS'}`);

      await prisma.tradeEvent.update({
        where: { id: trade.id },
        data: {
          outcome: didWin ? 'WIN' : 'LOSS',
          resolvedPrice: didWin ? 1 : 0,
          resolvedAt: new Date(),
        },
      });

      // On-chain settlement (vaultContract.settleMarket) is handled by the settlement
      // worker once the trade is marked resolved — the scoring cron then recomputes Brier.
    } catch (error: any) {
      if (error?.response?.status === 404) {
        console.warn(`[WATCHER] Market ${trade.marketId} not found on CLOB (skipping).`);
      } else {
        console.error(`[WATCHER] Failed to process trade ${trade.id}:`, error?.message || error);
      }
    }
  }
}
