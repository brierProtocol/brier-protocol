require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc.ankr.com/eth_sepolia";
const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    polygonAmoy: {
      url: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts_contracts"
  }
};
