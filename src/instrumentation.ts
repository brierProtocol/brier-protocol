// Runs once at server boot (Next instrumentation hook).
//
// DNS_OVERRIDE_HOSTS — opt-in resolver override for dev machines whose ISP
// censors a hostname at the DNS level (NXDOMAIN). Polymarket is blocked by
// some LatAm ISPs: without this, captureMarket/resolveMarket can never reach
// the CLOB from localhost and every commit falls back to the fake 0.5
// midpoint. Format: "host=ip,host2=ip2" in .env.local. Unset (prod) = no-op.
//
// Only registered for the nodejs runtime — `dns` isn't available on edge and
// this override is meaningless there anyway.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const raw = process.env.DNS_OVERRIDE_HOSTS
  if (!raw) return

  const overrides = new Map<string, string>()
  for (const pair of raw.split(',')) {
    const [host, ip] = pair.split('=').map(s => s.trim())
    if (host && ip) overrides.set(host.toLowerCase(), ip)
  }
  if (overrides.size === 0) return

  try {
    // `import * as dns from 'node:dns'` returns a frozen ESM namespace —
    // even plain assignment to its properties throws ("has only a getter").
    // createRequire gets the real, mutable CJS module.exports object, the
    // SAME singleton undici/fetch resolve through internally, so patching it
    // here actually affects outbound requests.
    const { createRequire } = await import('node:module')
    const require = createRequire(import.meta.url)
    const dns = require('dns')

    const realLookup = dns.lookup.bind(dns)
    dns.lookup = (hostname: string, options: any, callback?: any) => {
      const ip = overrides.get(String(hostname).toLowerCase())
      if (!ip) return realLookup(hostname, options, callback)
      const cb = typeof options === 'function' ? options : callback
      const opts = typeof options === 'object' && options !== null ? options : {}
      const addr = { address: ip, family: 4 }
      if (opts.all) return process.nextTick(() => cb(null, [addr]))
      return process.nextTick(() => cb(null, ip, 4))
    }

    if (dns.promises) {
      const realPromises = dns.promises.lookup.bind(dns.promises)
      dns.promises.lookup = async (hostname: string, options?: any) => {
        const ip = overrides.get(String(hostname).toLowerCase())
        if (!ip) return realPromises(hostname, options)
        if (options?.all) return [{ address: ip, family: 4 }]
        return { address: ip, family: 4 }
      }
    }

    console.log(`[instrumentation] DNS override active for: ${[...overrides.keys()].join(', ')}`)
  } catch (e: any) {
    console.warn(`[instrumentation] DNS override failed to install: ${e?.message}`)
  }
}
