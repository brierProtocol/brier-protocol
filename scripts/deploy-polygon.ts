import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying BrierVault to Polygon Mainnet with the account:", deployer.address);

  // REAL POLYGON MAINNET USDC CONTRACT
  const USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"; 
  
  // POLYGON MAINNET CTF EXCHANGE (Polymarket CTF Exchange)
  const CTF_EXCHANGE = "0x4bFB41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E"; 

  // BRIER PROTOCOL TREASURY
  const FEE_RECIPIENT = process.env.FEE_RECIPIENT_ADDRESS || deployer.address;

  // INITIAL VAULT CONFIGURATION
  const VAULT_CAP = ethers.parseUnits("50000", 6); // $50k USDC Max
  const BOT_IDENTIFIER = "cuid-brier-adan-pred-v8";

  console.log("-----------------------------------------");
  console.log("USDC Token:", USDC_ADDRESS);
  console.log("CTF Exchange:", CTF_EXCHANGE);
  console.log("Fee Recipient:", FEE_RECIPIENT);
  console.log("-----------------------------------------");

  const BrierVault = await ethers.getContractFactory("BrierVault");
  const vault = await BrierVault.deploy(
    USDC_ADDRESS,
    CTF_EXCHANGE,
    FEE_RECIPIENT,
    VAULT_CAP,
    BOT_IDENTIFIER
  );

  await vault.waitForDeployment();
  const address = await vault.getAddress();
  
  console.log("✅ BrierVault successfully deployed to Polygon Mainnet!");
  console.log("Vault Address:", address);
  console.log("Update NEXT_PUBLIC_VAULT_ADDRESS with this address.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
