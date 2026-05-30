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
      // 1. In a production scenario, we hit Polymarket's / Gamma API or Kalshi's API
      // Here, we simulate querying an Oracle with the marketId:
      // const oracleRes = await axios.get(`https://clob.polymarket.com/markets/${trade.marketId}`);
      // const isResolved = oracleRes.data.closed;
      // const winningSide = oracleRes.data.tokens[0].winner ? "YES" : "NO";
      
      // MOCK ORACLE: Randomly resolve 10% of pending trades per cycle for simulation
      const randomSettle = Math.random() < 0.1; 
      if (!randomSettle) return; // Market is still running
      
      console.log(`[WATCHER] Market ${trade.marketId} has RESOLVED. Initiating Settlement for Trade ${trade.id}...`);

      // Determine Outcome (Mock logic: 50/50 win or loss for the simulation)
      const didWin = Math.random() > 0.5;
      const profitUsdc = didWin ? trade.size * 2 : 0; // Win double or lose all

      // 2. Call the INTERNAL Settlement Logic 
      // We hit our own Fastify server loopback to ensure it goes through the BullMQ processing queue!
      const executorUrl = process.env.BRIER_EXECUTOR_URL || 'http://localhost:3001';
      
      // We must sign this internal request to pass the HMAC security check
      const payload = {
        tradeId: trade.id,
        botId: trade.botId,
        vaultAddress: trade.botId, // Note: The schema links vault via Bot in this mock
        result: didWin ? "WIN" : "LOSS",
        pnlValue: didWin ? profitUsdc : -trade.size,
        timestamp: Date.now()
      };

      // Since we are internal, we can either hit the API or just queue it to BullMQ directly.
      // To ensure architecture parity, hitting the API is best if we have the secret.
      // But for the sake of the watcher, we will just update the DB to reflect the Oracle state.
      
      // In a real scenario, this is where we execute the Ethereum Transaction:
      // const tx = await vaultContract.settleMarket(trade.tradeId, profitUsdc);

      // Update Database
      await prisma.tradeEvent.update({
        where: { id: trade.id },
        data: {
          outcome: didWin ? 'WIN' : 'LOSS',
          resolvedPrice: didWin ? 1 : 0
        }
      });

      console.log(`[WATCHER] Successfully settled Trade ${trade.id}. PnL: $${didWin ? profitUsdc - trade.size : -trade.size}`);

    } catch (error) {
      console.error(`[WATCHER] Failed to process trade ${trade.id}:`, error);
    }
  }
}
