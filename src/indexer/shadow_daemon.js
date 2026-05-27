const { ethers } = require('ethers');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const POLYGON_RPC = process.env.POLYGON_RPC_URL || 'http://127.0.0.1:8545';
const POLYMARKET_CTF_ADDRESS = process.env.POLYMARKET_CTF_ADDRESS || '0x4D97DCd97eC945f40CF65F87097ACe5EA0476045';
const PRIVATE_KEY = process.env.DAEMON_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const CTF_ABI = [
  "function splitPosition(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint[] partition, uint amount) external"
];

const VAULT_ABI = [
  "function executeMirrorTrade(bytes32 conditionId, uint256[] calldata partition, uint256 amount) external",
  "function settleMarket(bytes32 conditionId, uint256 initialInvestment, uint256 payout) external",
  "function totalAssets() external view returns (uint256)",
  "function asset() external view returns (address)"
];

async function processDetectedTrade(
  builderWallet,
  vaultAddress,
  conditionId,
  partition,
  amount,
  txHash,
  walletSigner
) {
  console.log(`\n[SHADOW DAEMON] >>> INTERCEPTED BUILDER TRADE <<<`);
  console.log(`> Builder: ${builderWallet}`);
  console.log(`> Vault:   ${vaultAddress}`);
  console.log(`> Market:  ${conditionId}`);
  console.log(`> Amount:  ${ethers.formatUnits(amount, 18)} USDC`);

  // Query bot metadata from Prisma DB
  const bot = await prisma.bot.findFirst({
    where: { walletAddress: { equals: builderWallet } }
  });

  if (!bot) {
    console.log(`[!] CRITICAL: Transaction from builder ${builderWallet} has no registered Bot in Brier!`);
    return false;
  }

  console.log(`> Match Found: Bot "${bot.name}" (Status: ${bot.status})`);
  
  if (bot.status !== 'LIVE' && bot.status !== 'VAULT_ELIGIBLE_T1' && bot.status !== 'VAULT_ELIGIBLE_T2') {
    console.log(`[!] SKIPPING: Bot is in paper/suspended state.`);
    return false;
  }

  // Bind Ethers contract instance for our vault
  const vaultContract = new ethers.Contract(vaultAddress, VAULT_ABI, walletSigner);
  
  // Calculate mirroring multiplier based on vault TVL
  const totalAssets = await vaultContract.totalAssets();
  console.log(`> Vault Liquidity Available: ${ethers.formatUnits(totalAssets, 18)} USDC`);

  if (totalAssets === 0n) {
    console.log(`[!] SKIPPING: Vault has $0 deposits.`);
    return false;
  }

  // Determine mirror amount (10x builder's bet, constrained by max TVL)
  let mirrorAmount = amount * 10n; // 10x leverage copy
  if (mirrorAmount > totalAssets) {
    mirrorAmount = totalAssets / 2n; // Cap at 50% of vault size
  }

  console.log(`> MIRROR RULE TRIGGERED: Copying at 10x size -> deploying ${ethers.formatUnits(mirrorAmount, 18)} USDC`);

  try {
    // Submit transaction to BrierVault
    console.log(`> Submitting mirror trade to BrierVault on-chain...`);
    const tx = await vaultContract.executeMirrorTrade(conditionId, partition, mirrorAmount);
    console.log(`> Tx Submitted: ${tx.hash}`);
    await tx.wait();
    console.log(`> [SUCCESS] On-chain shadow copy completed!`);

    // Log the trade event in Prisma DB
    const trade = await prisma.tradeEvent.create({
      data: {
        botId: bot.id,
        marketId: conditionId,
        marketTitle: `Will Trump YES outcome resolve in ${conditionId.substring(0, 10)}?`,
        side: partition[0] === 1 ? 'YES' : 'NO',
        amount: parseFloat(ethers.formatUnits(mirrorAmount, 18)),
        entryPrice: 0.55,
        outcome: 'PENDING',
        executionWallet: vaultAddress,
        fraudFlag: false,
        source: 'POLYMARKET',
        externalTradeId: tx.hash
      }
    });

    console.log(`> Saved copied trade to Database. ID: ${trade.id}`);
    return true;
  } catch (err) {
    console.error(`[!] Mirror transaction failed: ${err.message}`);
    return false;
  }
}

async function startDaemon() {
  console.log("==========================================");
  console.log("=       BRIER SHADOW DAEMON              =");
  console.log("==========================================");
  console.log(`> Connecting to Polygon RPC: ${POLYGON_RPC}`);

  const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`> Indexer account active: ${wallet.address}`);
  console.log(`> Dynamic Bot Registry loaded from Prisma.`);
  
  // Start the background settlement loop
  startSettlementCron(wallet);
  
  console.log("> Monitoring blockchain tx queue...");
}

async function startSettlementCron(walletSigner) {
  console.log(`> Initializing Market Settlement Cron...`);
  
  setInterval(async () => {
    try {
      const pendingTrades = await prisma.tradeEvent.findMany({
        where: { outcome: 'PENDING' },
        include: { bot: true }
      });

      if (pendingTrades.length === 0) return;
      console.log(`\n[CRON] Found ${pendingTrades.length} pending markets. Checking resolution...`);

      for (const trade of pendingTrades) {
        // Mock Resolution for Testing: 50% chance the market resolves on this tick.
        const isResolved = Math.random() > 0.5; 
        
        if (isResolved) {
          console.log(`> Market ${trade.marketId.substring(0, 10)}... resolved!`);
          const didWin = Math.random() > 0.4; // 60% win rate simulation
          
          const vaultAddress = trade.bot.vaultAddress;
          if (!vaultAddress) continue;

          const vaultContract = new ethers.Contract(vaultAddress, VAULT_ABI, walletSigner);
          
          const initialInvestment = ethers.parseEther(trade.amount.toString());
          const payout = didWin ? (initialInvestment * 2n) : 0n;
          
          try {
            console.log(`> Triggering settleMarket on Vault: ${vaultAddress}`);
            const tx = await vaultContract.settleMarket(trade.marketId, initialInvestment, payout);
            await tx.wait();
            console.log(`> Settle Tx Success: ${tx.hash}`);

            await prisma.tradeEvent.update({
              where: { id: trade.id },
              data: {
                outcome: didWin ? 'WIN' : 'LOSS',
                resolvedPrice: didWin ? 1.0 : 0.0,
                resolvedAt: new Date()
              }
            });
            console.log(`> Trade ${trade.id} marked as ${didWin ? 'WIN' : 'LOSS'}`);
          } catch (e) {
            console.error(`> Settle failed for ${trade.marketId}:`, e.message || e);
          }
        }
      }
    } catch (e) {
      console.error("[CRON] Error in settlement loop:", e);
    }
  }, 10000); // Check every 10 seconds
}

module.exports = {
  processDetectedTrade,
  startDaemon
};
