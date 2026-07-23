/**
 * Smoke test del CLOB de Polymarket — valida la migración a V2 por etapas.
 *
 * Uso:
 *   npx tsx scripts/clob-smoke.ts            # etapas 1 y 2 (gratis, sin riesgo)
 *   npx tsx scripts/clob-smoke.ts --balance  # + etapa 3 (lee saldos, sigue sin gastar)
 *   npx tsx scripts/clob-smoke.ts --order     # + etapa 4 (APRUEBA + POSTEA una orden real)
 *
 * Etapas:
 *   1. Conectividad + market data pública. No requiere wallet ni credenciales.
 *   2. Auth L1→L2 (createOrDeriveApiKey). Requiere una wallet, pero NO fondos.
 *      Es la etapa que valida el shim de firma ethers v6 → EthersSigner del SDK,
 *      que es la parte más frágil de la migración.
 *   3. Saldos y allowances del funder. Requiere que el funder tenga algo.
 *   4. ⚠️ GASTA PLATA REAL: aprueba pUSD al exchange (tx on-chain) y postea un
 *      BUY FAK mínimo. Cierra el flujo de punta a punta. Requiere TRIPLE confirmación
 *      (ver más abajo) — es imposible dispararla sin querer.
 *
 * Etapas 1-3 NUNCA postean una orden. Solo la 4, y solo con todo lo siguiente:
 *
 * Env para la etapa 4:
 *   EXECUTOR_PRIVATE_KEY       (obligatoria) wallet que firma Y que tiene los fondos.
 *   RPC_URL                    (obligatoria) RPC de Polygon mainnet — el approve es on-chain.
 *   ORDER_TOKEN_ID             (obligatoria) token_id del outcome a COMPRAR. Vos elegís
 *                              el mercado; el script no decide qué comprar con tu plata.
 *   CONFIRM_SPEND=SI-GASTAR-PLATA-REAL   (obligatoria) el pestillo. Sin esto, la etapa 4 aborta.
 *   ORDER_USDC                 monto en USDC/pUSD. Default 2.
 *   ORDER_SLIPPAGE_BPS         tolerancia sobre el best ask. Default 100 (1%).
 *
 * Env comunes:
 *   POLYMARKET_CLOB_URL        default https://clob.polymarket.com (el host no cambió con V2)
 *   POLYMARKET_CHAIN_ID        default 137
 *   POLYMARKET_FUNDER_ADDRESS  opcional; si está, se firma POLY_1271 con ese maker
 *   DNS_OVERRIDE_HOSTS         "host=ip,host2=ip2" — para ISPs que censuran
 *                              polymarket.com a nivel resolver (ver src/lib/dns-override.ts)
 */

import dns from 'node:dns'
import { ethers } from 'ethers'

// ── DNS override ────────────────────────────────────────────────────────────
// Tiene que aplicarse ANTES de importar el SDK: axios resuelve vía dns.lookup.
const overrides = new Map<string, string>()
for (const pair of (process.env.DNS_OVERRIDE_HOSTS || '').split(',')) {
  const [h, ip] = pair.split('=').map(s => s?.trim())
  if (h && ip) overrides.set(h.toLowerCase(), ip)
}
if (overrides.size) {
  const real = dns.lookup.bind(dns)
  // @ts-expect-error — firma variádica de dns.lookup
  dns.lookup = (hostname: string, options: any, callback: any) => {
    const ip = overrides.get(String(hostname).toLowerCase())
    if (!ip) return real(hostname, options, callback)
    const cb = typeof options === 'function' ? options : callback
    const opts = typeof options === 'object' && options !== null ? options : {}
    if (opts.all) return cb(null, [{ address: ip, family: 4 }])
    return cb(null, ip, 4)
  }
  console.log(`[dns] override activo: ${[...overrides.keys()].join(', ')}`)
}

const HOST = process.env.POLYMARKET_CLOB_URL || 'https://clob.polymarket.com'
const CHAIN = Number(process.env.POLYMARKET_CHAIN_ID || 137)

function ok(msg: string) { console.log(`  ✅ ${msg}`) }
function bad(msg: string) { console.log(`  ❌ ${msg}`) }

async function main() {
  const wantOrder = process.argv.includes('--order')
  const wantBalance = process.argv.includes('--balance') || wantOrder
  console.log(`\nCLOB smoke test → ${HOST} (chain ${CHAIN})\n`)

  const sdk: any = await import('@polymarket/clob-client-v2')
  const { ClobClient, SignatureTypeV2, AssetType, getContractConfig, Side, OrderType } = sdk
  const clampPrice = (p: number) => Math.min(Math.max(p, 0.001), 0.999)

  // ── Etapa 1: público ──────────────────────────────────────────────────────
  console.log('── Etapa 1: conectividad + market data (sin auth)')
  const pub = new ClobClient({ host: HOST, chain: CHAIN })
  try {
    await pub.getOk()
    ok('GET /ok responde')
  } catch (e: any) { bad(`GET /ok falló: ${e?.message}`); process.exit(1) }

  let tokenID: string | null = null
  try {
    const page = await pub.getSamplingMarkets()
    const mkt = (page?.data || []).find((m: any) => m?.tokens?.[0]?.token_id)
    tokenID = mkt?.tokens?.[0]?.token_id ?? null
    ok(`markets: ${(page?.data || []).length} devueltos${tokenID ? `, token de prueba ${String(tokenID).slice(0, 12)}…` : ''}`)
  } catch (e: any) { bad(`getSamplingMarkets falló: ${e?.message}`) }

  if (tokenID) {
    try { ok(`tickSize = ${await pub.getTickSize(tokenID)}`) }
    catch (e: any) { bad(`getTickSize falló: ${e?.message}`) }
  }

  const cfg = getContractConfig(CHAIN)
  ok(`contratos: exchangeV2=${cfg.exchangeV2} colateral(pUSD)=${cfg.collateral}`)

  // ── Etapa 2: auth ─────────────────────────────────────────────────────────
  console.log('\n── Etapa 2: auth L1→L2 (valida el shim de firma ethers v6)')
  let pk = process.env.EXECUTOR_PRIVATE_KEY
  if (!pk) {
    pk = ethers.Wallet.createRandom().privateKey
    console.log('  ℹ️  sin EXECUTOR_PRIVATE_KEY — usando una wallet efímera (sin fondos)')
  }
  const wallet = new ethers.Wallet(pk)
  const signer = {
    getAddress: () => wallet.getAddress(),
    _signTypedData: (d: any, t: any, v: any) => wallet.signTypedData(d, t, v),
  }
  console.log(`  signer: ${wallet.address}`)

  const funderAddress = process.env.POLYMARKET_FUNDER_ADDRESS
  const signatureType = funderAddress ? SignatureTypeV2.POLY_1271 : SignatureTypeV2.EOA
  console.log(`  modo: ${funderAddress ? `POLY_1271, maker=${funderAddress}` : 'EOA (la plata es la del signer)'}`)

  let creds: any = null
  try {
    const boot = new ClobClient({ host: HOST, chain: CHAIN, signer, signatureType, funderAddress })
    creds = await boot.createOrDeriveApiKey()
    ok(`credenciales L2 derivadas (key ${String(creds?.key).slice(0, 8)}…)`)
    ok('el shim de firma ethers v6 FUNCIONA — el SDK aceptó la firma EIP-712')
  } catch (e: any) {
    bad(`createOrDeriveApiKey falló: ${e?.message}`)
    console.log('     Si dice "signer address has to be the address of the API KEY",')
    console.log('     es el bug upstream de POLY_1271 (py-clob-client-v2#64/#70), no tu config.')
    process.exit(1)
  }

  // ── Etapa 3: saldos ───────────────────────────────────────────────────────
  if (!wantBalance) {
    console.log('\n(etapa 3 omitida — pasá --balance para leer saldos, --order para operar)')
    return
  }
  console.log('\n── Etapa 3: saldos y allowances del funder')
  const authed = new ClobClient({ host: HOST, chain: CHAIN, signer, creds, signatureType, funderAddress, throwOnError: true })
  try {
    const col = await authed.getBalanceAllowance({ asset_type: AssetType.COLLATERAL })
    ok(`colateral (pUSD): balance=${col?.balance} allowances=${JSON.stringify(col?.allowances)}`)
    if (Number(col?.balance || 0) === 0) {
      console.log('     Balance 0: esperado si la wallet no está fondeada. Para operar hace falta pUSD.')
    }
  } catch (e: any) { bad(`getBalanceAllowance falló: ${e?.message}`) }

  // ── Etapa 4: aprobar + postear una orden real ─────────────────────────────
  if (!wantOrder) {
    console.log('\n(etapa 4 omitida — pasá --order + las env de confirmación para operar de verdad)')
    return
  }
  console.log('\n── Etapa 4: ⚠️  ORDEN REAL (gasta plata)')

  // Triple pestillo: flag + env de confirmación literal + token explícito.
  const confirm = process.env.CONFIRM_SPEND
  const tokenId = process.env.ORDER_TOKEN_ID
  const rpc = process.env.RPC_URL
  const usdc = Number(process.env.ORDER_USDC || 2)
  const slipBps = Number(process.env.ORDER_SLIPPAGE_BPS || 100)
  const missing: string[] = []
  if (confirm !== 'SI-GASTAR-PLATA-REAL') missing.push('CONFIRM_SPEND=SI-GASTAR-PLATA-REAL')
  if (!tokenId) missing.push('ORDER_TOKEN_ID=<token del outcome a comprar>')
  if (!rpc) missing.push('RPC_URL=<RPC de Polygon mainnet>')
  if (!process.env.EXECUTOR_PRIVATE_KEY) missing.push('EXECUTOR_PRIVATE_KEY=<wallet con fondos>')
  if (missing.length) {
    bad('faltan variables para operar — abortado ANTES de tocar la cadena:')
    for (const m of missing) console.log(`     - ${m}`)
    process.exit(1)
  }

  const provider = new ethers.JsonRpcProvider(rpc)
  const onchain = wallet.connect(provider)
  const spender = cfg.exchangeV2 as string      // exchange V2 = el que matchea órdenes estándar
  const pusd = cfg.collateral as string          // pUSD, ERC-20, 6 decimales
  const need = ethers.parseUnits(String(usdc), 6)

  // 4a. Chequeos on-chain: pUSD suficiente + algo de POL para gas.
  const erc20 = new ethers.Contract(pusd, [
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address,address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)',
  ], onchain) as any
  const [pBal, pAllow, gasBal] = await Promise.all([
    erc20.balanceOf(wallet.address),
    erc20.allowance(wallet.address, spender),
    provider.getBalance(wallet.address),
  ])
  ok(`pUSD on-chain: ${ethers.formatUnits(pBal, 6)}  |  POL (gas): ${ethers.formatEther(gasBal)}`)
  if (pBal < need) { bad(`pUSD insuficiente: tenés ${ethers.formatUnits(pBal, 6)}, necesitás ${usdc}. Depositá USDC en Polymarket (se envuelve a pUSD).`); process.exit(1) }
  if (gasBal === 0n) { bad('sin POL para gas. Mandá un poco de POL a la wallet.'); process.exit(1) }

  // 4b. Approve on-chain SOLO si el allowance no alcanza (idempotente).
  if (pAllow < need) {
    console.log(`  ⏳ approve pUSD → exchangeV2 (allowance actual ${ethers.formatUnits(pAllow, 6)} < ${usdc})…`)
    const tx = await erc20.approve(spender, ethers.MaxUint256)
    console.log(`     tx ${tx.hash} — esperando confirmación…`)
    await tx.wait()
    ok('approve confirmado')
  } else {
    ok(`allowance ya suficiente (${ethers.formatUnits(pAllow, 6)} pUSD) — sin approve`)
  }

  // 4c. Refrescar la vista de allowance del lado de la API (no es on-chain).
  try { await authed.updateBalanceAllowance({ asset_type: AssetType.COLLATERAL }); ok('API allowance refrescado') }
  catch (e: any) { bad(`updateBalanceAllowance falló (seguimos igual): ${e?.message}`) }

  // 4d. Book del token → best ask + precio límite con slippage.
  // El best ask es el precio MÍNIMO de venta; lo calculo así en vez de asumir el
  // orden del array (Polymarket ordena asks descendente, pero no dependo de eso).
  const book = await authed.getOrderBook(tokenId!)
  const askPrices = (book?.asks ?? []).map((a: any) => Number(a.price)).filter((p: number) => isFinite(p) && p > 0)
  const bestAsk = askPrices.length ? Math.min(...askPrices) : NaN
  if (!isFinite(bestAsk)) { bad('el book no tiene asks — mercado sin liquidez de venta. Elegí otro token.'); process.exit(1) }
  const limit = clampPrice(bestAsk * (1 + slipBps / 10_000))
  ok(`book: best ask ${bestAsk} → precio límite ${limit.toFixed(4)} (slip ${slipBps}bps)`)

  // 4e. Confirmación final impresa antes de firmar.
  console.log(`\n  Voy a postear:  BUY FAK  $${usdc}  token ${String(tokenId).slice(0, 16)}…  @ ≤${limit.toFixed(4)}`)
  console.log('  (FAK: llena lo que haya dentro del límite y cancela el resto — no barre el book)\n')

  const res = await authed.createAndPostMarketOrder(
    { tokenID: tokenId!, amount: usdc, side: Side.BUY, price: limit, orderType: OrderType.FAK },
    undefined,
    OrderType.FAK,
  )
  if (res?.success) {
    ok(`orden aceptada: id=${res?.orderID || '(instant match)'}`)
    if (res?.tradeIDs?.length) ok(`trades: ${res.tradeIDs.join(', ')}`)
    if (res?.transactionsHashes?.length) ok(`tx settlement: ${res.transactionsHashes.join(', ')}`)
    console.log('\n🎉 Flujo CLOB V2 cerrado de punta a punta: approve → book → BUY FAK → fill.')
  } else {
    bad(`el exchange rechazó la orden: ${res?.errorMsg || JSON.stringify(res).slice(0, 300)}`)
    if (String(res?.errorMsg || '').includes('API KEY')) {
      console.log('     "signer address has to be the address of the API KEY" → bug upstream POLY_1271 (#64/#70).')
    }
    process.exit(1)
  }
}

main().catch(e => { console.error('\nfallo inesperado:', e); process.exit(1) })
