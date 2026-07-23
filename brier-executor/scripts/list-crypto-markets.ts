/**
 * Lista los mercados crypto de 5 min ("Up or Down") ACTIVOS y con liquidez real,
 * con el token_id de cada outcome — para elegir cuál operar en clob-smoke.ts.
 *
 * Estos mercados rotan cada 5 minutos, así que la lista es válida "ahora": corré
 * el script justo antes de operar.
 *
 * Uso:
 *   npx tsx scripts/list-crypto-markets.ts
 *   ASSET=bitcoin npx tsx scripts/list-crypto-markets.ts   # filtra por activo
 *
 * Env:
 *   ASSET               bitcoin | ethereum | solana (default: todos)
 *   DNS_OVERRIDE_HOSTS  "host=ip,host2=ip2" para ISPs que censuran polymarket.com
 *                       (ver src/lib/dns-override.ts). Necesitás override para
 *                       gamma-api.polymarket.com Y clob.polymarket.com.
 */

import dns from 'node:dns'
import https from 'node:https'

// ── DNS override (mismo patrón que src/lib/dns-override.ts) ──────────────────
const overrides = new Map<string, string>()
for (const pair of (process.env.DNS_OVERRIDE_HOSTS || '').split(',')) {
  const [h, ip] = pair.split('=').map(s => s?.trim())
  if (h && ip) overrides.set(h.toLowerCase(), ip)
}
const lookup = (hostname: string, options: any, callback: any) => {
  const ip = overrides.get(String(hostname).toLowerCase())
  if (!ip) return dns.lookup(hostname, options, callback)
  const cb = typeof options === 'function' ? options : callback
  const opts = typeof options === 'object' && options !== null ? options : {}
  if (opts.all) return cb(null, [{ address: ip, family: 4 }])
  return cb(null, ip, 4)
}

function getJson(host: string, path: string): Promise<any> {
  return new Promise(resolve => {
    const req = https.request({ host, servername: host, path, method: 'GET', lookup, timeout: 12000 }, r => {
      let d = ''
      r.on('data', c => (d += c))
      r.on('end', () => { try { resolve(JSON.parse(d)) } catch { resolve(null) } })
    })
    req.on('error', () => resolve(null))
    req.on('timeout', () => { req.destroy(); resolve(null) })
    req.end()
  })
}

const GAMMA = 'gamma-api.polymarket.com'
const CLOB = 'clob.polymarket.com'

async function main() {
  const asset = (process.env.ASSET || '').toLowerCase()
  const rx = asset
    ? new RegExp(asset, 'i')
    : /bitcoin|btc|ethereum|\beth\b|solana|\bsol\b/i

  // Traemos activos que cierran en el FUTURO (end_date_min=ahora — sin esto gamma
  // devuelve mercados viejos que siguen flagueados active), ordenados por cierre
  // más próximo. Nos quedamos con los "Up or Down" (la serie de 5 min).
  const nowISO = new Date().toISOString()
  const raw = await getJson(GAMMA, `/markets?closed=false&active=true&limit=100&order=endDate&ascending=true&end_date_min=${nowISO}`)
  const arr: any[] = Array.isArray(raw) ? raw : (raw?.data ?? [])
  if (!arr.length) {
    console.log('gamma no devolvió mercados (¿falta el override de DNS para gamma-api.polymarket.com?)')
    process.exit(1)
  }

  const now = Date.now()
  const candidates = arr
    .filter(m => /up or down/i.test(m.question || ''))
    .filter(m => rx.test(m.question || ''))
    .filter(m => m.acceptingOrders !== false)
    .map(m => ({ m, mins: (new Date(m.endDate).getTime() - now) / 60000 }))
    .filter(x => x.mins > 0.5 && x.mins < 30)     // vivos, no los ya cerrados
    .sort((a, b) => a.mins - b.mins)
    .slice(0, 6)

  if (!candidates.length) {
    console.log('No hay mercados "Up or Down" abriendo en los próximos 30 min ahora mismo.')
    console.log('Reintentá en un momento (rotan cada 5 min), o buscá a mano en polymarket.com.')
    return
  }

  console.log(`\nMercados crypto 5min activos (cierran pronto) — token_id para clob-smoke.ts:\n`)
  for (const { m, mins } of candidates) {
    let toks: string[] = []
    try { toks = JSON.parse(m.clobTokenIds || '[]') } catch { /* noop */ }
    let outcomes: string[] = []
    try { outcomes = JSON.parse(m.outcomes || '[]') } catch { /* noop */ }

    console.log(`▸ ${m.question}`)
    console.log(`  cierra en ~${mins.toFixed(1)} min`)

    // Liquidez real desde el CLOB: best ask por outcome (lo que pagarías en un BUY).
    for (let i = 0; i < toks.length; i++) {
      const book = await getJson(CLOB, `/book?token_id=${toks[i]}`)
      const asks = (book?.asks ?? []).map((a: any) => Number(a.price)).filter((p: number) => isFinite(p) && p > 0)
      const bestAsk = asks.length ? Math.min(...asks) : null
      const label = (outcomes[i] || `outcome ${i}`).padEnd(5)
      const liq = bestAsk !== null ? `best ask ${bestAsk}` : 'SIN liquidez de venta'
      console.log(`    ${label}  ${liq}`)
      console.log(`      ORDER_TOKEN_ID=${toks[i]}`)
    }
    console.log('')
  }
  console.log('Elegí un token con best ask real (≈0.5 = líquido) y pasalo como ORDER_TOKEN_ID.\n')
}

main().catch(e => { console.error('fallo:', e); process.exit(1) })
