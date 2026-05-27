const { ethers } = require("hardhat");
const { PrismaClient } = require("@prisma/client");
const { processDetectedTrade } = require("./shadow_daemon");

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================");
  console.log("=      BRIER END-TO-END SYSTEM SIMULATOR         =");
  console.log("==================================================");

  // 1. Get Ethers accounts
  const [owner, daemon, builder, whale] = await ethers.getSigners();
  console.log(`> Deployer/Admin: ${owner.address}`);
  console.log(`> Brier Daemon:   ${daemon.address}`);
  console.log(`> Bot Builder:    ${builder.address}`);
  console.log(`> Whale Investor: ${whale.address}`);

  // 2. Clear previous simulation runs from SQLite database
  console.log(`\n> Cleaning up local database...`);
  await prisma.vaultDeposit.deleteMany({});
  await prisma.tradeEvent.deleteMany({});
  await prisma.botScore.deleteMany({});
  await prisma.botMarket.deleteMany({});
  await prisma.incubationLog.deleteMany({});
  await prisma.pnlSnapshot.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.heart.deleteMany({});
  await prisma.bot.deleteMany({});
  console.log(`> Database cleared.`);

  // 3. Deploy Mock Contracts
  console.log(`\n> Deploying mock protocols...`);
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockUSDC = await MockERC20.deploy("Mock USDC", "mUSDC");
  await mockUSDC.waitForDeployment();
  const usdcAddr = await mockUSDC.getAddress();
  console.log(`> Mock USDC deployed at: ${usdcAddr}`);

  const MockCTF = await ethers.getContractFactory("MockCTF");
  const mockCTF = await MockCTF.deploy();
  await mockCTF.waitForDeployment();
  const ctfAddr = await mockCTF.getAddress();
  console.log(`> Mock Polymarket CTF deployed at: ${ctfAddr}`);

  // 4. Deploy BrierFactory
  console.log(`\n> Deploying BrierFactory...`);
  const BrierFactory = await ethers.getContractFactory("BrierFactory");
  const brierFactory = await BrierFactory.deploy(usdcAddr, daemon.address, ctfAddr);
  await brierFactory.waitForDeployment();
  const factoryAddr = await brierFactory.getAddress();
  console.log(`> BrierFactory deployed at: ${factoryAddr}`);

  // 5. Seed Bot in Prisma Database
  console.log(`\n> Registering Bot Builder in database...`);
  const bot = await prisma.bot.create({
    data: {
      name: "ADAN-PRED",
      slug: "adan-pred",
      description: "Autonomous Deep Adaptive Network predicting Kalshi & Polymarket volumes.",
      tagline: "BAYESIAN PROBABILITY VOLATILITY MAXIMIZER",
      color: "#00FF00",
      mood: "cool",
      status: "LIVE",
      tier: "TIER1",
      walletAddress: builder.address,
      skinInGame: 1000,
      vaultCap: 500000,
      currentTVL: 10000, // initialized TVL
      vaultOpen: true,
      strategyType: "QUANT"
    }
  });
  console.log(`> Bot seed stored! ID: ${bot.id}`);

  // 6. Deploy BrierVault for the Bot on-chain
  console.log(`\n> Deploying BrierVault on-chain via Factory...`);
  const deployTx = await brierFactory.deployVault(
    builder.address,
    bot.id,
    "Brier Vault: ADAN-PRED",
    "bvADAN"
  );
  const receipt = await deployTx.wait();
  
  const event = receipt.logs.find(
    (log) => {
      try {
        return brierFactory.interface.parseLog(log).name === "VaultDeployed";
      } catch (e) {
        return false;
      }
    }
  );
  const vaultAddress = brierFactory.interface.parseLog(event).args.vaultAddress;
  console.log(`> BrierVault deployed successfully at: ${vaultAddress}`);

  // Save the vault address in the database bot record
  await prisma.bot.update({
    where: { id: bot.id },
    data: { vaultAddress }
  });
  console.log(`> Linked on-chain Vault Address ${vaultAddress} to Bot "${bot.name}" in Prisma!`);

  // 7. Seed Whale Deposit in Vault & Database
  console.log(`\n> Simulating Whale deposit into BrierVault...`);
  const depositAmount = ethers.parseEther("10000"); // $10,000 deposit
  
  // Mint USDC to whale
  await mockUSDC.mint(whale.address, depositAmount);
  // Approve Vault
  await mockUSDC.connect(whale).approve(vaultAddress, depositAmount);
  
  // Connect Vault contract and deposit
  const BrierVault = await ethers.getContractFactory("BrierVault");
  const brierVault = BrierVault.attach(vaultAddress);
  await brierVault.connect(whale).deposit(depositAmount, whale.address);
  console.log(`> Whale deposited $10,000 USDC on-chain.`);

  // Write deposit log into Prisma DB
  const dbDeposit = await prisma.vaultDeposit.create({
    data: {
      botId: bot.id,
      depositorWallet: whale.address,
      amountUsdc: 10000,
      mode: "CONSERVATIVE",
      active: true,
      totalProfitEarned: 0
    }
  });
  console.log(`> Saved deposit record to database! ID: ${dbDeposit.id}`);

  // 8. Simulate Bot Builder Trade on Polymarket CTF
  console.log(`\n> Simulating Bot Builder making a $100 trade on Polymarket...`);
  const builderTradeAmount = ethers.parseEther("100");
  await mockUSDC.mint(builder.address, builderTradeAmount);
  await mockUSDC.connect(builder).approve(ctfAddr, builderTradeAmount);
  
  const conditionId = ethers.zeroPadValue(ethers.toBeHex(12345), 32);
  const partition = [1]; // YES outcome
  
  const builderTx = await mockCTF.connect(builder).splitPosition(
    usdcAddr,
    ethers.zeroPadValue(ethers.toBeHex(0), 32),
    conditionId,
    partition,
    builderTradeAmount
  );
  await builderTx.wait();
  console.log(`> Builder trade completed on Polymarket! Hash: ${builderTx.hash}`);

  // 9. Let the Brier Daemon intercept and mirror the trade
  console.log(`\n> Daemon intercepting trade...`);
  const success = await processDetectedTrade(
    builder.address,
    vaultAddress,
    conditionId,
    partition,
    builderTradeAmount,
    builderTx.hash,
    daemon
  );

  console.log(`\n==================================================`);
  console.log(`=           SIMULATION REPORT                    =`);
  console.log(`==================================================`);
  if (success) {
    console.log(`> STATUS: SUCCESS`);
    
    // Query db to double check logs
    const dbTrades = await prisma.tradeEvent.findMany({ where: { botId: bot.id } });
    console.log(`> Database copy trades verified: ${dbTrades.length} entry logged.`);
    console.log(`  - Market: ${dbTrades[0].marketTitle}`);
    console.log(`  - Mirror size: $${dbTrades[0].amount} USDC`);
    console.log(`  - TX Hash: ${dbTrades[0].externalTradeId}`);
    
    const vaultRemaining = await brierVault.totalAssets();
    console.log(`> Remaining idle vault liquidity: ${ethers.formatUnits(vaultRemaining, 18)} USDC`);
  } else {
    console.log(`> STATUS: FAILED`);
  }
  console.log("==================================================");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
