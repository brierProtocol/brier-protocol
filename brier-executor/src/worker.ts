import { Worker } from 'bullmq';
import { ethers } from 'ethers';
import { openPerpPosition, closePerpPosition } from './polymarket.js';
import { getLivePrice } from './price-feed.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Redis = require('ioredis');
const BrierVaultArtifact = require('../../artifacts_contracts/contracts/BrierVault.sol/BrierVault.json');
const crypto = require('crypto');

// Helper to sync trade to Postgres via Webhook
async function syncToPostgres(payload: unknown) {
    try {
        const url = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000';
        const secret = process.env.BUILDER_SECRET_KEY;
        if (!secret) throw new Error('BUILDER_SECRET_KEY is missing');
        const t = Date.now().toString();
        const body = JSON.stringify(payload);
        const sig = crypto.createHmac('sha256', secret).update(t + body).digest('hex');
        
        await fetch(`${url}/api/v1/trades/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-timestamp': t,
                'x-signature': sig
            },
            body
        });
    } catch (e) {
        console.error('[Executor Sync] Failed to sync trade to DB:', e);
    }
}


const redisConfig = { host: process.env.REDIS_HOST || '127.0.0.1', port: Number(process.env.REDIS_PORT) || 6379 };
const redis = new Redis(redisConfig);
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const provider = new ethers.JsonRpcProvider(RPC_URL);
// Fail closed: never sign vault calls with the well-known Hardhat test key outside a
// local RPC. In prod a missing EXECUTOR_PRIVATE_KEY must crash, not silently sign with
// a public key anyone can impersonate.
const IS_LOCAL_RPC = /localhost|127\.0\.0\.1/.test(RPC_URL);
const EXECUTOR_KEY = process.env.EXECUTOR_PRIVATE_KEY
  || (IS_LOCAL_RPC ? '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' : undefined);
if (!EXECUTOR_KEY) throw new Error('EXECUTOR_PRIVATE_KEY is required (no test-key fallback outside a local RPC)');
const executorWallet = new ethers.Wallet(EXECUTOR_KEY, provider);

const CTF_ABI = ['function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets) external'];

// Redis Set of tradeIds with an OPEN perp position. The Risk Engine iterates THIS
// instead of scanning the whole keyspace with KEYS 'trade:*' (which is O(N) over
// every key and blocks the Redis shared with BullMQ). Adds on open, removes on
// close / stop-loss; the loop also self-heals any stale members.
const ACTIVE_PERP_SET = 'active_perp_trades';

// =========================================================
// Trade Execution Worker (SPOT + PERP Routing)
// =========================================================
// REAL vs MOCK status:
//   - SPOT path → on-chain CTF via BrierVault.executeTrade ........ REAL
//   - PERP path → Polymarket CLOB via openPerpPosition/closePerpPosition
//                 in polymarket.ts (real @polymarket/clob-client) .. REAL
//   - Risk Engine price feed → src/price-feed.ts polls CLOB /midpoint
//                 (5s Redis cache, null-safe skip if CLOB unreachable) REAL
const executionWorker = new Worker('trade-signals', async job => {
  const { tradeId, botId, vaultAddress, marketId, outcomeIndex, size, marketType, actionType, direction, leverage, stopLossPrice, worstPrice, slippageBps } = job.data;
  
  console.log(`[Executor] Processing ${actionType} trade ${tradeId} for Vault ${vaultAddress} (${marketType})`);
  
  try {
    if (marketType === 'SPOT' || marketType === 'PERP') {
        // --- ROUTING TODOS AL CLOB (SPOT Y PERP) ---
        // FIX: SPOT flow via CTF (executeTrade) is economically inert (zero PnL).
        // Routing SPOT through the CLOB just like PERP to get real directional exposure.
        if (actionType === 'OPEN' || !actionType) {
            const resolvedActionType = 'OPEN';
            console.log(`[Perp Engine] Opening ${leverage}x ${direction} on ${marketId} (worstPrice=${worstPrice}, slip=${slippageBps}bps)...`);
            // [REAL] CLOB execution (Fill-And-Kill bounded by worstPrice, slippage guard)
            // via polymarket.ts → real @polymarket/clob-client. No mock left on this path.
            // marketId here must be the outcome tokenID being traded.
            const result = await openPerpPosition({
                tokenID: marketId,
                direction: (direction || 'LONG') as 'LONG' | 'SHORT',
                size: Number(size),
                worstPrice: Number(worstPrice ?? 0.5),
            });
            await redis.hset(`trade:${tradeId}`, {
                status: 'active_perp',
                orderId: result.orderId ?? '',
                clobStatus: result.status,
                direction: direction,
                leverage: leverage,
                worstPrice: worstPrice ?? 0,
                slippageBps: slippageBps ?? 0,
                stopLoss: stopLossPrice || 0,
                marketId: marketId,
                vaultAddress: vaultAddress
            });
            // Register in the active-perp set so the Risk Engine watches it (no keyspace scan).
            await redis.sadd(ACTIVE_PERP_SET, tradeId);
            console.log(`[Perp Engine] CLOB order ${result.orderId} → ${result.status}. SL: ${stopLossPrice}`);
            
            await syncToPostgres({
                tradeId,
                botId,
                marketId,
                side: direction,
                amount: size,
                entryPrice: worstPrice || 0.5,
                executionWallet: vaultAddress,
                outcome: 'PENDING'
            });
        } else if (actionType === 'CLOSE') {
            console.log(`[Perp Engine] Executing Market CLOSE for ${tradeId}...`);
            // [REAL] CLOB market-close via polymarket.ts → real @polymarket/clob-client.
            const result = await closePerpPosition({
                tokenID: marketId,
                direction: (direction || 'LONG') as 'LONG' | 'SHORT',
                size: Number(size),
                worstPrice: Number(worstPrice ?? 0.5),
            });
            await redis.hset(`trade:${tradeId}`, { status: 'settled', closeOrderId: result.orderId ?? '' });
            await redis.srem(ACTIVE_PERP_SET, tradeId);
            console.log(`[Perp Engine] Position closed via CLOB order ${result.orderId}. Ready for PnL settlement.`);
        }
    }

  } catch (error) {
    console.error(`[Executor] Failed to execute trade ${tradeId}:`, error);
    await redis.hset(`trade:${tradeId}`, 'status', 'failed');
    await redis.srem(ACTIVE_PERP_SET, tradeId); // never leave a failed trade in the watch set
    throw error;
  }
}, { connection: redisConfig });

// =========================================================
// Settlement Worker (SOLO PARA SPOT)
// =========================================================
const settlementWorker = new Worker('trade-settlements', async job => {
    // La lógica de CTF Redeem de su worker.ts anterior se mantiene intacta aquí.
    // Los Perps NO usan este worker, usan el Risk Engine.
    console.log(`[Settlement] Processing CTF settlement for Spot trade...`);
    const { tradeId, botId, vaultAddress, ctfAddress, conditionId, collateralToken, indexSets, payout } = job.data;

    try {
      const vaultContract = new ethers.Contract(vaultAddress as string, BrierVaultArtifact.abi, executorWallet) as any;
      const ctfContract = new ethers.Contract(ctfAddress as string, CTF_ABI, executorWallet) as any;

      console.log(`[Settlement] Step 1: Redeeming positions from CTF...`);
      const redeemTx = await ctfContract.redeemPositions(
        collateralToken,
        ethers.ZeroHash,
        conditionId,
        indexSets
      );
      await redeemTx.wait();
      console.log(`[Settlement] CTF redemption confirmed: ${redeemTx.hash}`);

      console.log(`[Settlement] Step 2: Calling settleMarket on vault...`);
      const tradeIdBytes32 = ethers.encodeBytes32String(tradeId.substring(0, 31));
      const payoutWei = ethers.parseUnits(payout.toString(), 6);

      const settleTx = await vaultContract.settleMarket(tradeIdBytes32, payoutWei);
      await settleTx.wait();
      console.log(`[Settlement] Trade ${tradeId} settled on-chain: ${settleTx.hash}`);

      await redis.hset(`trade:${tradeId}`, 'status', 'settled');
    } catch (error) {
      console.error(`[Settlement] Failed to settle trade ${tradeId}:`, error);
      await redis.hset(`trade:${tradeId}`, 'status', 'settlement_failed');
      throw error;
    }
}, { connection: redisConfig });

// =========================================================
// Risk Engine (Escudo Anti-Liquidación PERPS)
// =========================================================
setInterval(async () => {
    try {
        // Only the open perp positions, not the whole keyspace. O(active) instead of
        // O(all keys), and no blocking KEYS on the Redis shared with BullMQ.
        const ids: string[] = await redis.smembers(ACTIVE_PERP_SET);
        for (const id of ids) {
            const key = `trade:${id}`;
            const trade = await redis.hgetall(key);

            // Self-heal: anything no longer an open perp (closed elsewhere, expired,
            // or missing) is dropped from the watch set so it never accumulates.
            if (trade.status !== 'active_perp') {
                await redis.srem(ACTIVE_PERP_SET, id);
                continue;
            }

            const currentLivePrice = await getLivePrice(trade.marketId, redis);
            if (currentLivePrice === null) continue; // CLOB unreachable — skip, don't fire false SL

            // Si el precio cruza el Stop Loss, DISPARAR MARKET CLOSE INMEDIATO
            if (trade.stopLoss && parseFloat(trade.stopLoss) > 0) {
                const isLong = trade.direction === 'LONG';
                const sl = parseFloat(trade.stopLoss);

                if ((isLong && currentLivePrice <= sl) || (!isLong && currentLivePrice >= sl)) {
                    console.error(`[Risk Engine] STOP LOSS TRIGGERED for ${key}! Price=${currentLivePrice} SL=${sl}. Executing Market Close!`);
                    await redis.hset(key, 'status', 'stop_loss_triggered');
                    await redis.srem(ACTIVE_PERP_SET, id); // leaves the watch set now; don't re-fire while the close is in flight
                    // Close the position via CLOB (best-effort)
                    closePerpPosition({
                        tokenID: trade.marketId,
                        direction: (trade.direction || 'LONG') as 'LONG' | 'SHORT',
                        size: parseFloat(trade.size || '0'),
                        worstPrice: parseFloat(trade.worstPrice || '0.5'),
                    }).then(r => redis.hset(key, { status: 'stop_loss_executed', closeOrderId: r.orderId ?? '' }))
                      .catch(e => console.error(`[Risk Engine] Close order failed for ${key}:`, e));
                }
            }
        }
    } catch (e) {
        console.error('[Risk Engine] Error:', e);
    }
}, 1000); // 1-second loop (idealmente es reactivo por WebSocket, no polling)

// =========================================================
// Event Handlers
// =========================================================
executionWorker.on('completed', job => console.log(`[Executor] Job ${job.id} completed`));
executionWorker.on('failed', (job, err) => console.log(`[Executor] Job ${job?.id} failed: ${err.message}`));

settlementWorker.on('completed', job => console.log(`[Settlement] Job ${job.id} completed`));
settlementWorker.on('failed', (job, err) => console.log(`[Settlement] Job ${job?.id} failed: ${err.message}`));

console.log('[Worker] Executor, Settlement, and Risk Engine workers started');
