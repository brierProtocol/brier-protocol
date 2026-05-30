const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // 1. Deploy Mock USDC
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("USD Coin", "USDC");
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("Mock USDC deployed to:", usdcAddress);

  // Mint some USDC to the deployer for testing
  const mintTx = await usdc.mint(deployer.address, ethers.parseUnits("1000000", 6));
  await mintTx.wait();
  console.log("Minted 1,000,000 Mock USDC to deployer");

  // 2. Deploy Mock Polymarket CTF
  const MockCTF = await ethers.getContractFactory("MockCTF");
  const ctf = await MockCTF.deploy();
  await ctf.waitForDeployment();
  const ctfAddress = await ctf.getAddress();
  console.log("Mock Polymarket CTF deployed to:", ctfAddress);

  // 3. Deploy Brier Vault
  const BrierVault = await ethers.getContractFactory("BrierVault");
  const vaultName = "Brier Vault: Local Alpha";
  const vaultSymbol = "bvALPHA";
  const brierDaemon = deployer.address; // For local testing, deployer is daemon
  const builderWallet = deployer.address;
  const gnosisSafeAdmin = deployer.address;
  const feeRecipient = deployer.address;

  const vault = await BrierVault.deploy(
    usdcAddress,
    vaultName,
    vaultSymbol,
    brierDaemon,
    builderWallet,
    ctfAddress,
    gnosisSafeAdmin,
    feeRecipient
  );
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("Brier Vault deployed to:", vaultAddress);

  console.log("\n=========================================");
  console.log("Set these in your .env.local for testing:");
  console.log(`NEXT_PUBLIC_VAULT_ADDRESS="${vaultAddress}"`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS="${usdcAddress}"`);
  console.log("=========================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
