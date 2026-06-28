import { Worker } from 'bullmq';
import { ethers } from 'ethers';
import { openPerpPosition, closePerpPosition } from './polymarket.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Redis = require('ioredis');
const BrierVaultArtifact = require('../../artifacts_contracts/contracts/BrierVault.sol/BrierVault.json');

const redisConfig = { host: process.env.REDIS_HOST || '127.0.0.1', port: Number(process.env.REDIS_PORT) || 6379 };
const redis = new Redis(redisConfig);
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
const executorWallet = new ethers.Wallet(process.env.EXECUTOR_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);

const CTF_ABI = ['function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets) external'];

// =========================================================
// Trade Execution Worker (SPOT + PERP Routing)
// =========================================================
// REAL vs MOCK status:
//   - SPOT path → on-chain CTF via BrierVault.executeTrade ........ REAL
//   - PERP path → Polymarket CLOB via openPerpPosition/closePerpPosition
//                 in polymarket.ts (real @polymarket/clob-client) .. REAL
//   - Risk Engine price feed (further below) ..................... MOCK
//                 hardcoded 0.50; TODO: wire a live CLOB WebSocket
//                 price before trusting stop-loss execution in prod.
const executionWorker = new Worker('trade-signals', async job => {
  const { tradeId, botId, vaultAddress, marketId, outcomeIndex, size, marketType, actionType, direction, leverage, stopLossPrice, worstPrice, slippageBps } = job.data;
  
  console.log(`[Executor] Processing ${actionType} trade ${tradeId} for Vault ${vaultAddress} (${marketType})`);
  
  try {
    if (marketType === 'SPOT') {
        // --- LÓGICA SPOT ORIGINAL (CTF) ---
        const vaultContract = new ethers.Contract(vaultAddress as string, BrierVaultArtifact.abi, executorWallet) as any;
        await redis.hset(`trade:${tradeId}`, 'status', 'active');
        const tradeIdBytes32 = ethers.encodeBytes32String(tradeId.substring(0, 31));
        const marketIdBytes32 = marketId.startsWith('0x') ? marketId : ethers.encodeBytes32String(marketId.substring(0, 31));
        
        const outcomeArray = [0, 0];
        outcomeArray[outcomeIndex] = 1;
        
        const tx = await vaultContract.executeTrade(tradeIdBytes32, marketIdBytes32, outcomeArray, ethers.parseUnits(size.toString(), 6));
        await tx.wait();
        console.log(`[Executor] Spot Trade ${tradeId} confirmed: ${tx.hash}`);

    } else if (marketType === 'PERP') {
        // --- NUEVA LÓGICA PERP (CLOB Polymarket) ---
        if (actionType === 'OPEN') {
            console.log(`[Perp Engine] Opening ${leverage}x ${direction} on ${marketId} (worstPrice=${worstPrice}, slip=${slippageBps}bps)...`);
            // Real CLOB execution: Fill-And-Kill bounded by worstPrice (slippage guard).
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
            console.log(`[Perp Engine] CLOB order ${result.orderId} → ${result.status}. SL: ${stopLossPrice}`);
        } else if (actionType === 'CLOSE') {
            console.log(`[Perp Engine] Executing Market CLOSE for ${tradeId}...`);
            const result = await closePerpPosition({
                tokenID: marketId,
                direction: (direction || 'LONG') as 'LONG' | 'SHORT',
                size: Number(size),
                worstPrice: Number(worstPrice ?? 0.5),
            });
            await redis.hset(`trade:${tradeId}`, { status: 'settled', closeOrderId: result.orderId ?? '' });
            console.log(`[Perp Engine] Position closed via CLOB order ${result.orderId}. Ready for PnL settlement.`);
        }
    }

  } catch (error) {
    console.error(`[Executor] Failed to execute trade ${tradeId}:`, error);
    await redis.hset(`trade:${tradeId}`, 'status', 'failed');
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
    // console.log('[Risk Engine] Scanning active PERP positions...');
    try {
        // En producción esto se alimentaría de un WebSocket en vivo desde el CLOB
        const keys = await redis.keys('trade:*');
        for (const key of keys) {
            const trade = await redis.hgetall(key);
            if (trade.status === 'active_perp') {
                const currentLivePrice = 0.50; // Mock: precio obtenido vía WS
                
                // Si el precio cruza el Stop Loss, DISPARAR MARKET CLOSE INMEDIATO
                if (trade.stopLoss && parseFloat(trade.stopLoss) > 0) {
                    const isLong = trade.direction === 'LONG';
                    const sl = parseFloat(trade.stopLoss);
                    
                    if ((isLong && currentLivePrice <= sl) || (!isLong && currentLivePrice >= sl)) {
                        console.error(`[Risk Engine] STOP LOSS TRIGGERED for ${key}! Executing Market Close!`);
                        // TODO: Disparar ejecución IOC al CLOB
                        await redis.hset(key, 'status', 'stop_loss_executed');
                    }
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
