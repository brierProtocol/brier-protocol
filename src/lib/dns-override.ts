// DNS override for dev machines whose ISP censors a hostname at the resolver
// level (NXDOMAIN). Polymarket is blocked by some LatAm ISPs, so captureMarket
// / resolveMarket can never reach the CLOB from localhost and every commit
// falls back to the fake 0.5 midpoint.
//
// We deliberately do NOT patch global fetch / undici: Next 16 wraps fetch with
// its own instrumented dispatcher that ignores setGlobalDispatcher, and route
// handlers run in a worker separate from instrumentation.ts. Instead this
// exposes a tiny node:https GET that takes a per-request `lookup`, so the CLOB
// caller resolves the host itself with SNI intact. No-op in prod.
//
// Format: DNS_OVERRIDE_HOSTS="host=ip,host2=ip2" in .env.local.

import https from 'node:https'
import { lookup as dnsLookup } from 'node:dns'

function parseOverrides(): Map<string, string> {
  const raw = process.env.DNS_OVERRIDE_HOSTS
  const m = new Map<string, string>()
  if (!raw) return m
  for (const pair of raw.split(',')) {
    const [host, ip] = pair.split('=').map(s => s.trim())
    if (host && ip) m.set(host.toLowerCase(), ip)
  }
  return m
}

const OVERRIDES = parseOverrides()

// dns.lookup-compatible resolver that returns the override IP for censored
// hosts and defers to the real resolver for everything else. SNI still uses the
// original hostname, so TLS validates correctly against the pinned IP.
const overrideLookup = (hostname: string, options: any, callback: any) => {
  const ip = OVERRIDES.get(String(hostname).toLowerCase())
  if (!ip) return dnsLookup(hostname, options, callback)
  const opts = typeof options === 'object' && options !== null ? options : {}
  if (opts.all) return callback(null, [{ address: ip, family: 4 }])
  return callback(null, ip, 4)
}

export interface HttpResult { ok: boolean; status: number; json: any }

/**
 * GET a JSON URL, resolving censored hosts via the override table. Uses
 * node:https directly (not fetch) so Next's fetch instrumentation can't strip
 * the custom resolver. Never throws — returns { ok:false } on any failure.
 */
export function getJson(url: string, timeoutMs = 4000): Promise<HttpResult> {
  return new Promise(resolve => {
    let done = false
    const finish = (r: HttpResult) => { if (!done) { done = true; resolve(r) } }
    try {
      const u = new URL(url)
      const req = https.get(
        {
          hostname: u.hostname,
          path: u.pathname + u.search,
          port: 443,
          servername: u.hostname, // SNI — validate cert against the real host
          lookup: OVERRIDES.size ? overrideLookup : undefined,
          headers: { accept: 'application/json', 'user-agent': 'brier/1.0' },
        },
        res => {
          const status = res.statusCode || 0
          let body = ''
          res.setEncoding('utf8')
          res.on('data', c => { body += c })
          res.on('end', () => {
            let json: any = null
            try { json = JSON.parse(body) } catch { /* non-JSON */ }
            finish({ ok: status >= 200 && status < 300, status, json })
          })
        },
      )
      req.setTimeout(timeoutMs, () => { req.destroy(); finish({ ok: false, status: 0, json: null }) })
      req.on('error', () => finish({ ok: false, status: 0, json: null }))
    } catch {
      finish({ ok: false, status: 0, json: null })
    }
  })
}
