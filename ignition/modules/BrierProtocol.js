/**
 * Brier Protocol — Hardhat Ignition Deploy Module
 *
 * Deploys the full protocol stack to any EVM chain:
 *   1. MockERC20 (USDC) — only on testnets
 *   2. MockCTF — only on testnets
 *   3. BrierFactory
 *   4. BrierVault (via Factory.deployVault)
 *
 * Usage:
 *   npx hardhat ignition deploy ignition/modules/BrierProtocol.js --network sepolia
 *
 * Environment Variables:
 *   DAEMON_ADDRESS    — Executor daemon wallet (required)
 *   BUILDER_ADDRESS   — First bot builder wallet (required)
 *   USDC_ADDRESS      — Real USDC address (mainnet only, skips mock deploy)
 *   CTF_ADDRESS       — Real Polymarket CTF address (mainnet only)
 *   MAX_CAPACITY      — Max vault capacity in USDC (default: 100,000)
 */

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("BrierProtocol", (m) => {
  // ── Parameters ─────────────────────────────────────────
  const daemonAddress = m.getParameter("daemonAddress");
  const builderAddress = m.getParameter("builderAddress");
  const maxCapacity = m.getParameter("maxCapacity", 100_000n * 10n ** 18n); // 100k with 18 decimals

  // ── 1. Mock USDC (testnet only) ────────────────────────
  const mockUSDC = m.contract("MockERC20", ["USD Coin", "USDC"]);

  // ── 2. Mock CTF (testnet only) ─────────────────────────
  const mockCTF = m.contract("MockCTF", []);

  // ── 3. BrierFactory ────────────────────────────────────
  const factory = m.contract("BrierFactory", [
    mockUSDC,
    daemonAddress,
    mockCTF,
  ]);

  // ── 4. Deploy first vault via Factory ──────────────────
  m.call(factory, "deployVault", [
    builderAddress,
    "adan-pred",
    "Brier Vault: ADAN Predictor",
    "bvADAN",
    maxCapacity,
  ]);

  return { mockUSDC, mockCTF, factory };
});
