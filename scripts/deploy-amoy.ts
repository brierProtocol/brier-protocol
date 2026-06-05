const hre = require("hardhat");

async function main() {
  console.log("Starting deployment on Polygon Amoy...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy BrierVault Implementation
  console.log("Deploying BrierVault implementation...");
  const BrierVault = await hre.ethers.getContractFactory("BrierVault");
  const vaultImpl = await BrierVault.deploy();
  await vaultImpl.waitForDeployment();
  const vaultImplAddress = await vaultImpl.getAddress();
  console.log("BrierVault Implementation deployed to:", vaultImplAddress);

  // Deploy BrierVaultFactory
  console.log("Deploying BrierVaultFactory...");
  const adminAddress = deployer.address; // Change to Safe multisig in production
  const BrierVaultFactory = await hre.ethers.getContractFactory("BrierVaultFactory");
  const factory = await BrierVaultFactory.deploy(vaultImplAddress, adminAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("BrierVaultFactory deployed to:", factoryAddress);

  console.log("Deployment complete!");
  console.log("-----------------------------------------");
  console.log("BrierVault Impl:", vaultImplAddress);
  console.log("BrierVaultFactory:", factoryAddress);
  console.log("-----------------------------------------");
  console.log("Remember to update your frontend environment variables!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
