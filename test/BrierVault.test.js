const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BrierVault Industrial v4 — Full Test Suite", function () {
  let mockUSDC, mockCTF, brierFactory, brierVault;
  let owner, daemon, builder, whale, attacker, feeRecipient;

  const MAX_CAPACITY = ethers.parseEther("100000"); // 100k USDC

  beforeEach(async function () {
    [owner, daemon, builder, whale, attacker, feeRecipient] = await ethers.getSigners();

    // Deploy mocks
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("Mock USDC", "mUSDC");
    await mockUSDC.waitForDeployment();

    const MockCTF = await ethers.getContractFactory("MockCTF");
    mockCTF = await MockCTF.deploy();
    await mockCTF.waitForDeployment();

    // Deploy Factory
    const BrierFactory = await ethers.getContractFactory("BrierFactory");
    brierFactory = await BrierFactory.deploy(
      await mockUSDC.getAddress(),
      daemon.address,
      await mockCTF.getAddress()
    );
    await brierFactory.waitForDeployment();

    // Deploy Vault via Factory (now with maxCapacity)
    const tx = await brierFactory.deployVault(
      builder.address,
      "alpha-strike",
      "Brier Vault: Alpha Strike",
      "bvALPHA",
      MAX_CAPACITY
    );
    const receipt = await tx.wait();

    const event = receipt.logs.find((log) => {
      try { return brierFactory.interface.parseLog(log).name === "VaultDeployed"; }
      catch { return false; }
    });
    const vaultAddress = brierFactory.interface.parseLog(event).args.vaultAddress;

    const BrierVault = await ethers.getContractFactory("BrierVault");
    brierVault = BrierVault.attach(vaultAddress);

    // Fund whale with 50,000 USDC
    const whaleFunding = ethers.parseEther("50000");
    await mockUSDC.mint(whale.address, whaleFunding);
    await mockUSDC.connect(whale).approve(await brierVault.getAddress(), whaleFunding);
  });

  // =========================================================
  // Helpers
  // =========================================================
  const tradeId = (n) => ethers.zeroPadValue(ethers.toBeHex(n), 32);
  const marketId = (n) => ethers.zeroPadValue(ethers.toBeHex(100 + n), 32);

  async function depositAs(signer, amount) {
    await mockUSDC.mint(signer.address, amount);
    await mockUSDC.connect(signer).approve(await brierVault.getAddress(), amount);
    await brierVault.connect(signer).deposit(amount, signer.address);
  }

  async function executeTrade(id, amount) {
    await brierVault.connect(daemon).executeTrade(
      tradeId(id), marketId(id), [1, 2], amount
    );
  }

  // =========================================================
  // 1. PnL Split 60/30/10
  // =========================================================
  describe("PnL Distribution — 60/30/10 Split", function () {
    it("Should distribute profit exactly: 60% pool, 30% builder, 10% platform", async function () {
      const deposit = ethers.parseEther("10000");
      await brierVault.connect(whale).deposit(deposit, whale.address);

      // Execute a trade locking 2000 USDC
      const tradeAmount = ethers.parseEther("2000");
      await executeTrade(1, tradeAmount);

      expect(await brierVault.idleCapital()).to.equal(deposit - tradeAmount);
      expect(await brierVault.activeLockedCapital()).to.equal(tradeAmount);

      // Simulate payout of 3000 USDC (profit = 1000 USDC)
      const payout = ethers.parseEther("3000");
      // Mint the payout to the vault (simulating CTF redemption)
      await mockUSDC.mint(await brierVault.getAddress(), payout);

      const builderBefore = await mockUSDC.balanceOf(builder.address);
      // feeRecipient is owner() in the factory
      const platformBefore = await mockUSDC.balanceOf(owner.address);

      await brierVault.connect(daemon).settleMarket(tradeId(1), payout);

      const builderAfter = await mockUSDC.balanceOf(builder.address);
      const platformAfter = await mockUSDC.balanceOf(owner.address);

      // Profit = 3000 - 2000 = 1000
      const profit = ethers.parseEther("1000");
      const expectedBuilder = (profit * 3000n) / 10000n;  // 300
      const expectedPlatform = (profit * 1000n) / 10000n; // 100
      const expectedDepositor = profit - expectedBuilder - expectedPlatform; // 600

      expect(builderAfter - builderBefore).to.equal(expectedBuilder);
      expect(platformAfter - platformBefore).to.equal(expectedPlatform);

      // Pool should have: original idle (8000) + initialInvestment (2000) + depositorProfit (600) = 10600
      expect(await brierVault.idleCapital()).to.equal(deposit - tradeAmount + tradeAmount + expectedDepositor);
      expect(await brierVault.activeLockedCapital()).to.equal(0n);
      expect(await brierVault.totalAssets()).to.equal(deposit + expectedDepositor);
    });
  });

  // =========================================================
  // 2. Total Loss Scenario
  // =========================================================
  describe("Loss Scenario", function () {
    it("Should handle total loss (payout = 0) correctly", async function () {
      const deposit = ethers.parseEther("10000");
      await brierVault.connect(whale).deposit(deposit, whale.address);

      const tradeAmount = ethers.parseEther("1000");
      await executeTrade(2, tradeAmount);

      // Payout = 0 (total loss). No tokens minted to vault.
      await brierVault.connect(daemon).settleMarket(tradeId(2), 0n);

      // idleCapital should be original - locked + 0 payout = 9000
      expect(await brierVault.idleCapital()).to.equal(deposit - tradeAmount);
      expect(await brierVault.activeLockedCapital()).to.equal(0n);
      // totalAssets = 9000 (1000 USDC permanently lost)
      expect(await brierVault.totalAssets()).to.equal(deposit - tradeAmount);
    });

    it("Should handle partial loss correctly", async function () {
      const deposit = ethers.parseEther("10000");
      await brierVault.connect(whale).deposit(deposit, whale.address);

      const tradeAmount = ethers.parseEther("2000");
      await executeTrade(3, tradeAmount);

      // Partial loss: payout = 500 (lost 1500)
      const payout = ethers.parseEther("500");
      await mockUSDC.mint(await brierVault.getAddress(), payout);

      await brierVault.connect(daemon).settleMarket(tradeId(3), payout);

      // idleCapital = 8000 + 500 = 8500
      expect(await brierVault.idleCapital()).to.equal(deposit - tradeAmount + payout);
      expect(await brierVault.activeLockedCapital()).to.equal(0n);
      expect(await brierVault.totalAssets()).to.equal(deposit - tradeAmount + payout);
    });
  });

  // =========================================================
  // 3. Access Control — onlyExecutor
  // =========================================================
  describe("Access Control", function () {
    it("Should reject executeTrade from non-executor wallet", async function () {
      const deposit = ethers.parseEther("5000");
      await brierVault.connect(whale).deposit(deposit, whale.address);

      await expect(
        brierVault.connect(attacker).executeTrade(tradeId(10), marketId(10), [1, 2], ethers.parseEther("100"))
      ).to.be.revertedWith("BrierVault: caller is not the executor");
    });

    it("Should reject settleMarket from non-executor wallet", async function () {
      await expect(
        brierVault.connect(attacker).settleMarket(tradeId(10), 0n)
      ).to.be.revertedWith("BrierVault: caller is not the executor");
    });

    it("Should reject markTradeStale from non-executor wallet", async function () {
      await expect(
        brierVault.connect(attacker).markTradeStale(tradeId(10))
      ).to.be.revertedWith("BrierVault: caller is not the executor");
    });
  });

  // =========================================================
  // 4. Withdraw vs idleCapital
  // =========================================================
  describe("Withdrawal Restrictions", function () {
    it("Should revert withdraw if assets > idleCapital", async function () {
      const deposit = ethers.parseEther("10000");
      await brierVault.connect(whale).deposit(deposit, whale.address);

      // Lock 8000 via four separate 2000 trades (respecting 20% limit)
      const tradeAmount = ethers.parseEther("2000");
      await executeTrade(20, tradeAmount);
      await executeTrade(21, tradeAmount);
      await executeTrade(22, tradeAmount);
      await executeTrade(23, tradeAmount);

      expect(await brierVault.idleCapital()).to.equal(deposit - tradeAmount * 4n);

      // Try to withdraw 5000 (> 2000 idle) — should revert
      await expect(
        brierVault.connect(whale).withdraw(ethers.parseEther("5000"), whale.address, whale.address)
      ).to.be.revertedWith("BrierVault: only idle capital is withdrawable");
    });

    it("Should allow instant withdrawal up to idleCapital", async function () {
      const deposit = ethers.parseEther("10000");
      await brierVault.connect(whale).deposit(deposit, whale.address);

      const withdrawAmount = ethers.parseEther("3000");
      const balBefore = await mockUSDC.balanceOf(whale.address);

      await brierVault.connect(whale).withdraw(withdrawAmount, whale.address, whale.address);

      const balAfter = await mockUSDC.balanceOf(whale.address);
      expect(balAfter - balBefore).to.equal(withdrawAmount);
      expect(await brierVault.idleCapital()).to.equal(deposit - withdrawAmount);
    });
  });

  // =========================================================
  // 5. FIX-1 — Payout not physically received
  // =========================================================
  describe("[FIX-1] Payout Verification", function () {
    it("Should revert settleMarket if payout tokens are not in the contract", async function () {
      const deposit = ethers.parseEther("10000");
      await brierVault.connect(whale).deposit(deposit, whale.address);

      const tradeAmount = ethers.parseEther("2000");
      await executeTrade(30, tradeAmount);

      // DO NOT mint payout to vault — simulate daemon forgetting to redeem from CTF
      const fakePayout = ethers.parseEther("3000");

      await expect(
        brierVault.connect(daemon).settleMarket(tradeId(30), fakePayout)
      ).to.be.revertedWith("BrierVault: payout not received - redeem from CTF first");
    });

    it("Should succeed when payout tokens ARE physically in the contract", async function () {
      const deposit = ethers.parseEther("10000");
      await brierVault.connect(whale).deposit(deposit, whale.address);

      const tradeAmount = ethers.parseEther("2000");
      await executeTrade(31, tradeAmount);

      // Mint the payout to vault (simulating proper CTF redemption)
      const payout = ethers.parseEther("2500");
      await mockUSDC.mint(await brierVault.getAddress(), payout);

      await expect(
        brierVault.connect(daemon).settleMarket(tradeId(31), payout)
      ).to.not.be.reverted;
    });
  });

  // =========================================================
  // 6. FIX-2 — Duplicate tradeId prevention
  // =========================================================
  describe("[FIX-2] Duplicate TradeId Prevention", function () {
    it("Should revert if the same tradeId is used twice", async function () {
      const deposit = ethers.parseEther("10000");
      await brierVault.connect(whale).deposit(deposit, whale.address);

      const tradeAmount = ethers.parseEther("1000");
      await executeTrade(40, tradeAmount);

      // Attempt same tradeId again
      await expect(
        brierVault.connect(daemon).executeTrade(tradeId(40), marketId(40), [1, 2], tradeAmount)
      ).to.be.revertedWith("BrierVault: tradeId already active");
    });

    it("Should allow reuse of tradeId after settlement", async function () {
      const deposit = ethers.parseEther("10000");
      await brierVault.connect(whale).deposit(deposit, whale.address);

      const tradeAmount = ethers.parseEther("1000");
      await executeTrade(41, tradeAmount);

      // Settle with 0 payout
      await brierVault.connect(daemon).settleMarket(tradeId(41), 0n);

      // Same tradeId should now work again
      await expect(
        brierVault.connect(daemon).executeTrade(tradeId(41), marketId(41), [1, 2], tradeAmount)
      ).to.not.be.reverted;
    });
  });

  // =========================================================
  // 7. 20% Trade Limit
  // =========================================================
  describe("Trade Size Limit", function () {
    it("Should revert if trade exceeds 20% of totalAssets", async function () {
      const deposit = ethers.parseEther("10000");
      await brierVault.connect(whale).deposit(deposit, whale.address);

      // 20% of 10000 = 2000. Try 2001 → revert.
      const overLimit = ethers.parseEther("2001");
      await expect(
        brierVault.connect(daemon).executeTrade(tradeId(50), marketId(50), [1, 2], overLimit)
      ).to.be.revertedWith("BrierVault: exceeds 20% trade limit");
    });

    it("Should allow trade at exactly 20% of totalAssets", async function () {
      const deposit = ethers.parseEther("10000");
      await brierVault.connect(whale).deposit(deposit, whale.address);

      const exactLimit = ethers.parseEther("2000");
      await expect(
        brierVault.connect(daemon).executeTrade(tradeId(51), marketId(51), [1, 2], exactLimit)
      ).to.not.be.reverted;
    });
  });

  // =========================================================
  // 8. Max Capacity
  // =========================================================
  describe("Max Capacity", function () {
    it("Should revert deposit that would exceed maxCapacity", async function () {
      const overCap = MAX_CAPACITY + 1n;
      await mockUSDC.mint(whale.address, overCap);
      await mockUSDC.connect(whale).approve(await brierVault.getAddress(), overCap);

      await expect(
        brierVault.connect(whale).deposit(overCap, whale.address)
      ).to.be.revertedWith("BrierVault: max capacity reached");
    });
  });

  // =========================================================
  // 9. Admin
  // =========================================================
  describe("Admin Functions", function () {
    it("Should allow owner to rotate daemon key with event", async function () {
      const [, , , , , , newDaemon] = await ethers.getSigners();

      await expect(brierVault.connect(owner).setDaemon(newDaemon.address))
        .to.emit(brierVault, "DaemonUpdated")
        .withArgs(daemon.address, newDaemon.address);

      expect(await brierVault.brierDaemon()).to.equal(newDaemon.address);
    });

    it("Should reject admin calls from non-owner", async function () {
      await expect(
        brierVault.connect(attacker).setDaemon(attacker.address)
      ).to.be.revertedWithCustomError(brierVault, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to update maxCapacity", async function () {
      const newCap = ethers.parseEther("500000");
      await expect(brierVault.connect(owner).setMaxCapacity(newCap))
        .to.emit(brierVault, "MaxCapacityUpdated")
        .withArgs(newCap);
      expect(await brierVault.maxCapacity()).to.equal(newCap);
    });

    it("Should pause and unpause correctly", async function () {
      await brierVault.connect(owner).pause();
      await expect(
        brierVault.connect(whale).deposit(ethers.parseEther("100"), whale.address)
      ).to.be.revertedWithCustomError(brierVault, "EnforcedPause");

      await brierVault.connect(owner).unpause();
      await brierVault.connect(whale).deposit(ethers.parseEther("100"), whale.address);
      expect(await brierVault.totalAssets()).to.equal(ethers.parseEther("100"));
    });
  });

  // =========================================================
  // 10. markTradeStale
  // =========================================================
  describe("Stale Trade Reporting", function () {
    it("Should emit TradeStale event for active trades", async function () {
      const deposit = ethers.parseEther("10000");
      await brierVault.connect(whale).deposit(deposit, whale.address);
      await executeTrade(60, ethers.parseEther("1000"));

      await expect(brierVault.connect(daemon).markTradeStale(tradeId(60)))
        .to.emit(brierVault, "TradeStale")
        .withArgs(tradeId(60));
    });

    it("Should revert markTradeStale for non-existent trade", async function () {
      await expect(
        brierVault.connect(daemon).markTradeStale(tradeId(999))
      ).to.be.revertedWith("BrierVault: trade not active");
    });
  });
});
