const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Brier Protocol Vault Test Suite", function () {
  let mockUSDC;
  let mockCTF;
  let brierFactory;
  let brierVault;
  
  let owner;
  let daemon;
  let builder;
  let whale;
  
  beforeEach(async function () {
    // Get accounts
    [owner, daemon, builder, whale] = await ethers.getSigners();
    
    // Deploy Mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("Mock USDC", "mUSDC");
    await mockUSDC.waitForDeployment();
    
    // Deploy Mock CTF
    const MockCTF = await ethers.getContractFactory("MockCTF");
    mockCTF = await MockCTF.deploy();
    await mockCTF.waitForDeployment();
    
    // Deploy BrierFactory
    const BrierFactory = await ethers.getContractFactory("BrierFactory");
    brierFactory = await BrierFactory.deploy(
      await mockUSDC.getAddress(),
      daemon.address,
      await mockCTF.getAddress()
    );
    await brierFactory.waitForDeployment();
    
    // Deploy a new vault via Factory
    const tx = await brierFactory.deployVault(
      builder.address,
      "alpha-strike",
      "Brier Vault: Alpha Strike",
      "bvALPHA"
    );
    const receipt = await tx.wait();
    
    // Find deployed vault address from events
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
    
    // Bind vault instance
    const BrierVault = await ethers.getContractFactory("BrierVault");
    brierVault = BrierVault.attach(vaultAddress);
    
    // Fund Whale with 10,000 USDC
    const whaleFunding = ethers.parseEther("10000");
    await mockUSDC.mint(whale.address, whaleFunding);
    
    // Approve Vault to spend Whale's USDC
    await mockUSDC.connect(whale).approve(await brierVault.getAddress(), whaleFunding);
  });
  
  describe("Deployment", function () {
    it("Should set correct factory and vault configuration", async function () {
      expect(await brierFactory.usdcToken()).to.equal(await mockUSDC.getAddress());
      expect(await brierVault.brierDaemon()).to.equal(daemon.address);
      expect(await brierVault.builderWallet()).to.equal(builder.address);
      expect(await brierVault.polymarketCTF()).to.equal(await mockCTF.getAddress());
    });
  });
  
  describe("ERC4626 Vault Functionality", function () {
    it("Should allow Whale to deposit USDC and receive shares", async function () {
      const depositAmount = ethers.parseEther("5000");
      
      // Deposit
      await brierVault.connect(whale).deposit(depositAmount, whale.address);
      
      // Asserts
      expect(await brierVault.totalAssets()).to.equal(depositAmount);
      expect(await brierVault.balanceOf(whale.address)).to.equal(depositAmount);
    });
  });
  
  describe("Mirror Trade Execution", function () {
    it("Should reject non-daemon execution attempts", async function () {
      const conditionId = ethers.zeroPadValue(ethers.toBeHex(1), 32);
      const partition = [1, 2];
      const amount = ethers.parseEther("100");
      
      await expect(
        brierVault.connect(whale).executeMirrorTrade(conditionId, partition, amount)
      ).to.be.revertedWith("BrierVault: Caller is not the daemon");
    });
    
    it("Should successfully mirror trade through MockCTF when called by Daemon", async function () {
      // 1. Whale deposits first
      const depositAmount = ethers.parseEther("2000");
      await brierVault.connect(whale).deposit(depositAmount, whale.address);
      
      // 2. Daemon executes trade
      const conditionId = ethers.zeroPadValue(ethers.toBeHex(1), 32);
      const partition = [1, 2];
      const tradeAmount = ethers.parseEther("500");
      
      await expect(
        brierVault.connect(daemon).executeMirrorTrade(conditionId, partition, tradeAmount)
      ).to.emit(mockCTF, "PositionSplit")
       .withArgs(await mockUSDC.getAddress(), ethers.zeroPadValue(ethers.toBeHex(0), 32), conditionId, partition, tradeAmount);
       
      // Check that vault asset balance is reduced (locked in CTF)
      expect(await brierVault.totalAssets()).to.equal(depositAmount - tradeAmount);
    });
  });
  
  describe("Performance Fee & Settlement", function () {
    it("Should route 10% profit to builder upon profitable settlement", async function () {
      // Setup:
      // Whale deposits 1,000 USDC
      const depositAmount = ethers.parseEther("1000");
      await brierVault.connect(whale).deposit(depositAmount, whale.address);
      
      // Simulate win settlement: 500 USDC initial, 800 USDC payout (300 USDC profit)
      const initial = ethers.parseEther("500");
      const payout = ethers.parseEther("800");
      
      // Let's mint payout amount to the vault contract to simulate winnings returned by CTF
      await mockUSDC.mint(await brierVault.getAddress(), payout);
      
      const builderBefore = await mockUSDC.balanceOf(builder.address);
      const conditionId = ethers.zeroPadValue(ethers.toBeHex(2), 32);
      
      // Settle
      await expect(
        brierVault.connect(daemon).settleMarket(conditionId, initial, payout)
      ).to.emit(brierVault, "PerformanceFeePaid")
       .withArgs(builder.address, ethers.parseEther("30")); // 10% of 300 USDC profit = 30 USDC
       
      const builderAfter = await mockUSDC.balanceOf(builder.address);
      expect(builderAfter - builderBefore).to.equal(ethers.parseEther("30"));
    });
  });
  
  describe("Admin Functions", function () {
    it("Should allow owner to rotate daemon key", async function () {
      const [_, __, ___, ____, newDaemon] = await ethers.getSigners();
      
      await brierVault.connect(owner).setDaemon(newDaemon.address);
      expect(await brierVault.brierDaemon()).to.equal(newDaemon.address);
    });
    
    it("Should reject key rotations from non-owner", async function () {
      const [_, __, ___, ____, newDaemon] = await ethers.getSigners();
      
      await expect(
        brierVault.connect(whale).setDaemon(newDaemon.address)
      ).to.be.revertedWithCustomError(brierVault, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to pause and unpause the contract", async function () {
      await brierVault.connect(owner).pause();
      
      const depositAmount = ethers.parseEther("100");
      await expect(
        brierVault.connect(whale).deposit(depositAmount, whale.address)
      ).to.be.revertedWithCustomError(brierVault, "EnforcedPause");
      
      await brierVault.connect(owner).unpause();
      await brierVault.connect(whale).deposit(depositAmount, whale.address);
      expect(await brierVault.totalAssets()).to.equal(depositAmount);
    });

    it("Should allow owner to adjust performance fee", async function () {
      await brierVault.connect(owner).setPerformanceFee(2000); // 20%
      expect(await brierVault.performanceFeeBps()).to.equal(2000);
      
      await expect(
        brierVault.connect(owner).setPerformanceFee(6000) // 60%
      ).to.be.revertedWith("BrierVault: Fee too high");
    });
  });
});
