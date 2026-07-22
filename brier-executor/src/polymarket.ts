// Polymarket CLOB **V2** integration for the executor.
//
// Migrado desde @polymarket/clob-client (V1) el 22-jul-2026. Polymarket cortó a
// CTF Exchange V2 + colateral pUSD el 28-abr-2026; el cliente V1 ya no describe
// el protocolo vivo.
//
// Requiere (dentro de brier-executor/):
//   npm i @polymarket/clob-client-v2
//   EXECUTOR_PRIVATE_KEY      → wallet que FIRMA las órdenes (necesita algo de POL para gas)
//   POLYMARKET_CLOB_URL       → https://clob.polymarket.com (default; el host no cambió con V2)
//   POLYMARKET_CHAIN_ID       → 137 mainnet | 80002 Amoy
//   POLYMARKET_FUNDER_ADDRESS → opcional. Si está seteada, las órdenes se firman
//                               POLY_1271 con esa dirección como `maker` (la fuente
//                               de fondos), de modo que un BrierVault pueda ser el
//                               maker mientras el executor solo firma.
//
// ⚠️ Amoy: los CONTRATOS existen (el SDK trae un set completo de AMOY_CONTRACTS,
// chainID 80002), pero no se encontró ningún host de CLOB para testnet —
// clob-amoy / amoy / clob-staging / clob-testnet .polymarket.com no resuelven.
// O sea: on-chain se puede probar en Amoy, el order book NO. Confirmar con
// Polymarket antes de planificar un end-to-end en testnet.
//
// ⚠️ POLY_1271 + funder: hay dos issues abiertas upstream donde la auth L1 ata la
// API key a la EOA firmante en vez de al funder, rompiendo el posteo programático
// (Polymarket/py-clob-client-v2#64 y #70). Si `createOrDeriveApiKey()` devuelve
// credenciales atadas a la EOA y el exchange rechaza con "the order signer address
// has to be the address of the API KEY", es ese bug y no un error de config.

import { ethers } from 'ethers'

let _client: any = null

/**
 * Adapta un `ethers.Wallet` v6 a la interfaz `EthersSigner` que espera el SDK.
 *
 * El SDK tipa `EthersSigner._signTypedData` — nomenclatura de ethers **v5**. En
 * ethers v6 el método se llama `signTypedData` (sin guión bajo), así que un Wallet
 * v6 crudo NO satisface la interfaz y el SDK lo trataría como viem WalletClient.
 * Este shim traduce, y evita meter viem como dependencia solo para firmar.
 */
function toClobSigner(wallet: ethers.Wallet) {
  return {
    getAddress: () => wallet.getAddress(),
    _signTypedData: (domain: any, types: any, value: any) =>
      wallet.signTypedData(domain, types, value),
  }
}

export async function getClobClient(): Promise<any> {
  if (_client) return _client

  // Import perezoso para que el executor siga booteando si el paquete no está instalado.
  const clob = await import('@polymarket/clob-client-v2').catch(() => {
    throw new Error('@polymarket/clob-client-v2 not installed — run `npm i @polymarket/clob-client-v2` in brier-executor/')
  })
  const { ClobClient, SignatureTypeV2 } = clob as any

  // El host NO cambió con V2: `clob-v2.polymarket.com` no existe (sin registro A/AAAA/CNAME).
  // El mismo `clob.polymarket.com` sirve V2 — verificado contra la API: /ok, /markets,
  // /midpoint, /tick-size y /book responden 200, y son los mismos paths que usa el SDK v2.
  const host = process.env.POLYMARKET_CLOB_URL || 'https://clob.polymarket.com'
  const chain = Number(process.env.POLYMARKET_CHAIN_ID || 137)
  const pk = process.env.EXECUTOR_PRIVATE_KEY
  if (!pk) throw new Error('EXECUTOR_PRIVATE_KEY is required for CLOB execution')

  const signer = toClobSigner(new ethers.Wallet(pk))

  // Cuando hay funder configurado (el vault), las órdenes van firmadas POLY_1271:
  // el contrato es el `maker` (fuente de fondos) y la EOA solo el `signer`.
  // Sin funder, se opera como EOA pura — la plata es la de la wallet del executor.
  const funderAddress = process.env.POLYMARKET_FUNDER_ADDRESS
  const signatureType = funderAddress ? SignatureTypeV2.POLY_1271 : SignatureTypeV2.EOA

  // L1 (firma de wallet) → deriva credenciales L2 (HMAC). La wallet ES la credencial.
  const bootstrap = new ClobClient({ host, chain, signer, signatureType, funderAddress })
  const creds = await bootstrap.createOrDeriveApiKey()
  _client = new ClobClient({ host, chain, signer, creds, signatureType, funderAddress, throwOnError: true })
  return _client
}

/** Direcciones oficiales (exchange V2/V3, pUSD, ConditionalTokens) para la red activa. */
export async function getPolymarketContracts(): Promise<Record<string, string>> {
  const clob = await import('@polymarket/clob-client-v2')
  const { getContractConfig } = clob as any
  return getContractConfig(Number(process.env.POLYMARKET_CHAIN_ID || 137))
}

export type BuyArgs = {
  /** positionId ERC-1155 del outcome que se compra. */
  tokenID: string
  /** Monto en **USDC** a gastar. Es la unidad que usa el risk engine (`lockedCapital`). */
  usdcAmount: number
  /** Precio límite (0..1) que acota el slippage. */
  worstPrice: number
}

export type SellArgs = {
  tokenID: string
  /** Cantidad de **shares** (conditional tokens) a vender, NO USDC. */
  shares: number
  worstPrice: number
}

/**
 * Compra un outcome con una orden Fill-And-Kill: llena lo que haya en el book
 * dentro de `worstPrice` y cancela el resto — nunca barre el book más allá de la
 * tolerancia de slippage.
 *
 * UNIDADES (esto era un bug en V1): `UserMarketOrderV2.amount` en un BUY es
 * "$$$ Amount to buy" — dólares. El código V1 pasaba el capital del risk engine
 * al campo `size`, que el SDK define como "Size in terms of the ConditionalToken",
 * o sea shares. A precio 0.4 eso bloqueaba $100 de capital y compraba $40.
 */
export async function buyOutcome(o: BuyArgs): Promise<{ orderId?: string; status: string }> {
  const client = await getClobClient()
  const clob = await import('@polymarket/clob-client-v2') as any
  const { Side, OrderType } = clob

  const res = await client.createAndPostMarketOrder(
    {
      tokenID: o.tokenID,
      amount: o.usdcAmount,
      side: Side.BUY,
      price: clampPrice(o.worstPrice),
      orderType: OrderType.FAK,
    },
    undefined,           // tickSize lo resuelve el cliente contra el mercado
    OrderType.FAK,
  )
  return { orderId: res?.orderID, status: res?.status || 'submitted' }
}

/** Vende shares ya tenidas, FAK acotado por `worstPrice`. */
export async function sellOutcome(o: SellArgs): Promise<{ orderId?: string; status: string }> {
  const client = await getClobClient()
  const clob = await import('@polymarket/clob-client-v2') as any
  const { Side, OrderType } = clob

  const res = await client.createAndPostMarketOrder(
    {
      tokenID: o.tokenID,
      amount: o.shares,
      side: Side.SELL,
      price: clampPrice(o.worstPrice),
      orderType: OrderType.FAK,
    },
    undefined,
    OrderType.FAK,
  )
  return { orderId: res?.orderID, status: res?.status || 'submitted' }
}

/**
 * Shares de `tokenID` que el funder tiene realmente en su poder.
 *
 * Necesario para cerrar: un SELL se expresa en shares, y vender lo que no se tiene
 * lo rechaza el exchange al validar balance/allowance.
 */
export async function getHeldShares(tokenID: string): Promise<number> {
  const client = await getClobClient()
  const clob = await import('@polymarket/clob-client-v2') as any
  const { AssetType } = clob

  const res = await client.getBalanceAllowance({ asset_type: AssetType.CONDITIONAL, token_id: tokenID })
  const raw = parseFloat(res?.balance ?? '0')
  if (!isFinite(raw)) return 0
  // El balance viene en unidades base del conditional token (6 decimales).
  return raw / 1e6
}

/** Cierra una posición vendiendo todas las shares que el funder tenga de ese token. */
export async function closePosition(o: { tokenID: string; worstPrice: number }): Promise<{ orderId?: string; status: string }> {
  const shares = await getHeldShares(o.tokenID)
  if (shares <= 0) return { status: 'no_position' }
  return sellOutcome({ tokenID: o.tokenID, shares, worstPrice: o.worstPrice })
}

function clampPrice(p: number): number {
  return Math.min(Math.max(p, 0.001), 0.999)
}
