/**
 * Smoke test del CLOB de Polymarket — valida la migración a V2 por etapas.
 *
 * Uso:
 *   npx tsx scripts/clob-smoke.ts            # etapas 1 y 2 (gratis, sin riesgo)
 *   npx tsx scripts/clob-smoke.ts --balance  # + etapa 3 (lee saldos, sigue sin gastar)
 *
 * Etapas:
 *   1. Conectividad + market data pública. No requiere wallet ni credenciales.
 *   2. Auth L1→L2 (createOrDeriveApiKey). Requiere una wallet, pero NO fondos.
 *      Es la etapa que valida el shim de firma ethers v6 → EthersSigner del SDK,
 *      que es la parte más frágil de la migración.
 *   3. Saldos y allowances del funder. Requiere que el funder tenga algo.
 *
 * Este script NUNCA postea una orden. Gastar plata es una decisión manual.
 *
 * Env:
 *   EXECUTOR_PRIVATE_KEY       wallet que firma. Si falta, la etapa 2 genera una
 *                              efímera al vuelo (sirve para validar la firma).
 *   POLYMARKET_CLOB_URL        default https://clob.polymarket.com
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
  const wantBalance = process.argv.includes('--balance')
  console.log(`\nCLOB smoke test → ${HOST} (chain ${CHAIN})\n`)

  const sdk: any = await import('@polymarket/clob-client-v2')
  const { ClobClient, SignatureTypeV2, AssetType, getContractConfig } = sdk

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
    console.log('\n(etapa 3 omitida — pasá --balance para leer saldos)')
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
}

main().catch(e => { console.error('\nfallo inesperado:', e); process.exit(1) })
