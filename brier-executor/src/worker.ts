import { Worker } from 'bullmq';
import { ethers } from 'ethers';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Redis = require('ioredis');
const BrierVaultArtifact = require('../../artifacts_contracts/contracts/BrierVault.sol/BrierVault.json');

// =========================================================
// Configuration
// =========================================================

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
};

const redis = new Redis(redisConfig);

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
// In production, inject via HSM or secrets manager — never hardcode.
const executorPrivateKey = process.env.EXECUTOR_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const executorWallet = new ethers.Wallet(executorPrivateKey, provider);

// Polymarket CTF ABI (minimal — only redeemPositions)
const CTF_ABI = [
  'function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets) external'
];

// =========================================================
// Trade Execution Worker
// =========================================================

const executionWorker = new Worker('trade-signals', async job => {
  const { tradeId, botId, vaultAddress, marketId, outcomeIndex, size } = job.data;
  
  console.log(`[Executor] Processing trade ${tradeId} for Vault ${vaultAddress}`);

  try {
    const vaultContract = new ethers.Contract(vaultAddress as string, BrierVaultArtifact.abi, executorWallet) as any;

    await redis.hset(`trade:${tradeId}`, 'status', 'active');

    const tradeIdBytes32 = ethers.encodeBytes32String(tradeId.substring(0, 31));
    const marketIdBytes32 = marketId.startsWith('0x') ? marketId : ethers.encodeBytes32String(marketId.substring(0, 31));
    const outcomeArray = [0, 0];
    outcomeArray[outcomeIndex] = 1;

    const tx = await vaultContract.executeTrade(
      tradeIdBytes32,
      marketIdBytes32,
      outcomeArray,
      ethers.parseUnits(size.toString(), 6)
    );

    console.log(`[Executor] Tx sent: ${tx.hash}`);
    await tx.wait();
    console.log(`[Executor] Trade ${tradeId} confirmed on-chain`);

  } catch (error) {
    console.error(`[Executor] Failed to execute trade ${tradeId}:`, error);
    await redis.hset(`trade:${tradeId}`, 'status', 'failed');

    const currentLockedRaw = await redis.hget(`bot:${botId}:state`, 'activeLockedCapital');
    const currentLocked = currentLockedRaw ? parseFloat(currentLockedRaw) : 0;
    await redis.hset(`bot:${botId}:state`, 'activeLockedCapital', Math.max(0, currentLocked - size));

    throw error;
  }
}, { connection: redisConfig });

// =========================================================
// Settlement Worker
// =========================================================

const settlementWorker = new Worker('trade-settlements', async job => {
  const { tradeId, botId, vaultAddress, ctfAddress, conditionId, collateralToken, indexSets, payout } = job.data;

  console.log(`[Settlement] Processing settlement for trade ${tradeId}`);

  try {
    const vaultContract = new ethers.Contract(vaultAddress as string, BrierVaultArtifact.abi, executorWallet) as any;
    const ctfContract = new ethers.Contract(ctfAddress as string, CTF_ABI, executorWallet) as any;

    // STEP 1: Redeem conditional tokens from Polymarket CTF back to USDC
    // The daemon must do this BEFORE calling settleMarket (FIX-1).
    console.log(`[Settlement] Step 1: Redeeming positions from CTF...`);
    const redeemTx = await ctfContract.redeemPositions(
      collateralToken,
      ethers.ZeroHash,      // parentCollectionId
      conditionId,
      indexSets
    );
    await redeemTx.wait();
    console.log(`[Settlement] CTF redemption confirmed: ${redeemTx.hash}`);

    // STEP 2: Call settleMarket on BrierVault
    // The contract will verify the payout arrived physically (FIX-1).
    console.log(`[Settlement] Step 2: Calling settleMarket on vault...`);
    const tradeIdBytes32 = ethers.encodeBytes32String(tradeId.substring(0, 31));
    const payoutWei = ethers.parseUnits(payout.toString(), 6);

    const settleTx = await vaultContract.settleMarket(tradeIdBytes32, payoutWei);
    await settleTx.wait();
    console.log(`[Settlement] Trade ${tradeId} settled on-chain: ${settleTx.hash}`);

    // STEP 3: Update Redis state
    await redis.hset(`trade:${tradeId}`, 'status', 'settled');

    const currentLockedRaw = await redis.hget(`bot:${botId}:state`, 'activeLockedCapital');
    const currentLocked = currentLockedRaw ? parseFloat(currentLockedRaw) : 0;
    const lockedCapRaw = await redis.hget(`trade:${tradeId}`, 'lockedCapital');
    const lockedCap = lockedCapRaw ? parseFloat(lockedCapRaw) : 0;
    await redis.hset(`bot:${botId}:state`, 'activeLockedCapital', Math.max(0, currentLocked - lockedCap));

    console.log(`[Settlement] Redis state updated for trade ${tradeId}`);

  } catch (error) {
    console.error(`[Settlement] Failed to settle trade ${tradeId}:`, error);
    await redis.hset(`trade:${tradeId}`, 'status', 'settlement_failed');
    throw error;
  }
}, { connection: redisConfig });

// =========================================================
// Recovery Job — Runs every 5 minutes
// =========================================================

setInterval(async () => {
  console.log('[Recovery] Scanning for stale trades...');
  try {
    const keys = await redis.keys('trade:*');
    const now = Date.now();

    for (const key of keys) {
      const trade = await redis.hgetall(key);
      if (trade.status === 'active' && trade.timestamp) {
        const ageInMinutes = (now - parseInt(trade.timestamp)) / (1000 * 60);

        if (ageInMinutes > 30) {
          console.log(`[Recovery] Marking trade ${trade.tradeId} as STALE (Age: ${ageInMinutes.toFixed(1)} min)`);

          await redis.hset(key, 'status', 'stale');

          const vaultContract = new ethers.Contract(trade.vaultAddress as string, BrierVaultArtifact.abi, executorWallet) as any;
          const tradeIdBytes32 = ethers.encodeBytes32String((trade.tradeId as string).substring(0, 31));

          try {
            const tx = await vaultContract.markTradeStale(tradeIdBytes32);
            await tx.wait();
            console.log(`[Recovery] Stale trade ${trade.tradeId} reported on-chain`);
          } catch (e) {
            console.error(`[Recovery] Failed to report stale on-chain:`, e);
          }
        }
      }
    }
  } catch (e) {
    console.error('[Recovery] Job failed:', e);
  }
}, 5 * 60 * 1000);

// =========================================================
// Event Handlers
// =========================================================

executionWorker.on('completed', job => console.log(`[Executor] Job ${job.id} completed`));
executionWorker.on('failed', (job, err) => console.log(`[Executor] Job ${job?.id} failed: ${err.message}`));

settlementWorker.on('completed', job => console.log(`[Settlement] Job ${job.id} completed`));
settlementWorker.on('failed', (job, err) => console.log(`[Settlement] Job ${job?.id} failed: ${err.message}`));

console.log('[Worker] Executor and Settlement workers started');
