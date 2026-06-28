// Real Polymarket CLOB integration for the executor.
//
// Requires (mainnet only — Polymarket does not run on Amoy):
//   npm i @polymarket/clob-client      (inside brier-executor/)
//   EXECUTOR_PRIVATE_KEY  → a funded Polygon wallet (USDC + small MATIC)
//   POLYMARKET_CLOB_URL   → https://clob.polymarket.com (default)
//
// The client lazily derives L2 API credentials from the wallet signature, so no
// API key needs to be stored — the wallet IS the credential.

import { ethers } from 'ethers'

let _client: any = null

export async function getClobClient(): Promise<any> {
  if (_client) return _client

  // Lazy import so the executor still boots if the package isn't installed yet.
  const clob = await import('@polymarket/clob-client').catch(() => {
    throw new Error('@polymarket/clob-client not installed — run `npm i @polymarket/clob-client` in brier-executor/')
  })
  const { ClobClient } = clob as any

  const host = process.env.POLYMARKET_CLOB_URL || 'https://clob.polymarket.com'
  const chainId = Number(process.env.POLYMARKET_CHAIN_ID || 137) // Polygon mainnet
  const pk = process.env.EXECUTOR_PRIVATE_KEY
  if (!pk) throw new Error('EXECUTOR_PRIVATE_KEY is required for CLOB execution')

  const signer = new ethers.Wallet(pk)

  // Derive (or create) L2 API credentials from the wallet, then build the authed client.
  const bootstrap = new ClobClient(host, chainId, signer)
  const creds = await bootstrap.createOrDeriveApiKey()
  _client = new ClobClient(host, chainId, signer, creds)
  return _client
}

export type PerpOrder = {
  tokenID: string        // ERC-1155 positionId of the outcome being bought
  direction: 'LONG' | 'SHORT'
  size: number           // USDC notional
  worstPrice: number     // slippage-bounded limit price (0..1)
}

/**
 * Posts a Fill-And-Kill order: fills whatever the book offers within `worstPrice`
 * and cancels the rest — never sweeps the book beyond the slippage tolerance.
 */
export async function openPerpPosition(o: PerpOrder): Promise<{ orderId?: string; status: string }> {
  const client = await getClobClient()
  const clob = await import('@polymarket/clob-client') as any
  const { Side, OrderType } = clob

  const side = o.direction === 'LONG' ? Side.BUY : Side.SELL
  const price = Math.min(Math.max(o.worstPrice, 0.001), 0.999)

  const order = await client.createOrder({
    tokenID: o.tokenID,
    price,
    side,
    size: o.size,
    feeRateBps: 0,
  })

  const res = await client.postOrder(order, OrderType.FAK)
  return { orderId: res?.orderID, status: res?.status || 'submitted' }
}

/** Closes a position with an opposite FAK order. */
export async function closePerpPosition(o: PerpOrder): Promise<{ orderId?: string; status: string }> {
  return openPerpPosition({ ...o, direction: o.direction === 'LONG' ? 'SHORT' : 'LONG' })
}
