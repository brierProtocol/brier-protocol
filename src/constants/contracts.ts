// Centralized on-chain constants.
//
// Network-specific values come from env so the same build can target Polygon
// Amoy (dev) or Polygon mainnet (prod). NOTE: only NEXT_PUBLIC_* vars are
// readable inside client components.

import { polygon, polygonAmoy } from 'wagmi/chains'
import type { Chain } from 'viem'

// Active EVM chain, selected by env so one build targets Amoy (dev) or Polygon
// mainnet (prod). Defaults to Amoy testnet — a missing/invalid value must NOT
// silently point real wallets at mainnet. When set to 137 (Polygon), also set
// NEXT_PUBLIC_DEPOSIT_RPC_URL + NEXT_PUBLIC_USDC_ADDRESS to mainnet values.
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || polygonAmoy.id
export const ACTIVE_CHAIN: Chain = CHAIN_ID === polygon.id ? polygon : polygonAmoy

// Raw USDC address from env — may be `undefined`. `undefined` means
// "not configured", which the deposit/withdraw routes treat as
// "token validation disabled" (don't give this a fallback: a fallback would
// silently enable mainnet-USDC validation and reject valid testnet deposits).
export const USDC_ADDRESS_ENV = process.env.NEXT_PUBLIC_USDC_ADDRESS

// Concrete USDC address with a Polygon-mainnet fallback, for transaction
// building (deposits/redeem) and the vault-factory default.
export const USDC_ADDRESS = (USDC_ADDRESS_ENV ||
  '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359') as `0x${string}`

// USDC has 6 decimals (NOT 18) — critical for every amount calculation.
export const USDC_DECIMALS = 6

// Polymarket Conditional-Tokens Framework (CTF) exchange.
export const CTF_EXCHANGE_ADDRESS =
  process.env.POLYMARKET_CTF_EXCHANGE || '0x4bFB41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E'

// RPC for the chain where vaults live. Defaults to Polygon Amoy (testnet);
// set NEXT_PUBLIC_DEPOSIT_RPC_URL to Polygon mainnet for production.
export const DEPOSIT_RPC_URL =
  process.env.NEXT_PUBLIC_DEPOSIT_RPC_URL ||
  process.env.NEXT_PUBLIC_AMOY_RPC_URL ||
  'https://rpc-amoy.polygon.technology'
