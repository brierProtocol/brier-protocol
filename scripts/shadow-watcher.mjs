// Shadow-phase resolution watcher (standalone, no deps beyond @prisma/client).
// Polls PENDING TradeEvents and settles them against the Polymarket CLOB:
// once a market closes with a winner, the trade becomes WIN/LOSS and the
// hourly score cron recomputes the bot's real Brier from it.
//
// Run:  set -a && source .env.local && set +a && node scripts/shadow-watcher.mjs

import { PrismaClient } from '@prisma/client'
import dns from 'dns'
import https from 'https'
import { promisify } from 'util'

// A background poller needs very few DB connections. Cap the pool low so this
// daemon can never starve the shared local Postgres (which also serves Next dev).
const DB_URL = process.env.DATABASE_URL
  ? process.env.DATABASE_URL + (process.env.DATABASE_URL.includes('?') ? '&' : '?') + 'connection_limit=3&pool_timeout=20'
  : undefined
const prisma = new PrismaClient(DB_URL ? { datasources: { db: { url: DB_URL } } } : undefined)
const INTERVAL_MS = 5 * 60 * 1000

// ISP blocks *.polymarket.com at resolver level — resolve via 1.1.1.1 and
// connect by IP with explicit SNI (same bypass as ADAN's polymarket.js).
dns.setServers(['1.1.1.1', '8.8.8.8'])
const resolve4 = promisify(dns.resolve4)
const CLOB_HOST = 'clob.polymarket.com'
let _clobIP = null

async function clobGet(path) {
  if (!_clobIP) {
    try { _clobIP = (await resolve4(CLOB_HOST))[0] } catch { _clobIP = null }
  }
  if (!_clobIP) throw new Error('CLOB DNS unresolved')
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: _clobIP, port: 443, path, method: 'GET',
      servername: CLOB_HOST,
      headers: { Host: CLOB_HOST, Accept: 'application/json' },
      timeout: 15000,
    }, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve({ status: res.statusCode, json: () => JSON.parse(data) }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.end()
  })
}

async function settlePending() {
  const pending = await prisma.tradeEvent.findMany({ where: { outcome: 'PENDING' } })
  console.log(`[WATCHER] ${new Date().toISOString()} — ${pending.length} PENDING trade(s)`)

  for (const trade of pending) {
    try {
      const res = await clobGet(`/markets/${trade.marketId}`)
      if (res.status === 404) { console.warn(`[WATCHER] ${trade.marketId} not on CLOB — skipping`); continue }
      if (res.status !== 200) continue
      const data = res.json()
      if (data?.closed !== true) continue // still open

      const tokens = data.tokens || []
      const winnerIdx = tokens.findIndex(t => t.winner === true)
      if (winnerIdx === -1) { console.log(`[WATCHER] ${trade.marketId} closed, winner not finalized (UMA window)`); continue }

      // Outcome names vary by market ("Yes/No", "Up/Down"). ADAN's YES always
      // means the FIRST outcome (its entryPrice is outcomePrices[0]), so we
      // match by token index, not by name.
      const winningOutcome = (tokens[winnerIdx].outcome || '').toUpperCase()
      const bet = (trade.side || '').toUpperCase()
      const normalized = bet === 'LONG' ? 'YES' : bet === 'SHORT' ? 'NO' : bet
      const didWin = normalized === 'YES' ? winnerIdx === 0 : winnerIdx === 1

      await prisma.tradeEvent.update({
        where: { id: trade.id },
        data: { outcome: didWin ? 'WIN' : 'LOSS', resolvedPrice: didWin ? 1 : 0, resolvedAt: new Date() },
      })
      console.log(`[WATCHER] ✅ ${trade.marketTitle?.slice(0, 40)} → ${winningOutcome} | bet ${normalized} = ${didWin ? 'WIN' : 'LOSS'}`)
    } catch (e) {
      console.error(`[WATCHER] error on ${trade.id}: ${e.message}`)
    }
  }
}

console.log('[WATCHER] Shadow resolution watcher started. Interval: 5m')
// A transient DB/network error must never kill the daemon.
const safeSettle = () => settlePending().catch(e => console.error(`[WATCHER] cycle error: ${e.message?.slice(0, 200)}`))

// Self-scheduling loop: the NEXT cycle is only queued AFTER the current one
// finishes. The old setInterval fired blindly every 5m, so when a cycle stalled
// on a hung CLOB call, runs overlapped and each held a DB connection until the
// pool was exhausted ("Timed out fetching a new connection from the pool").
async function loop() {
  await safeSettle()
  setTimeout(loop, INTERVAL_MS)
}

// Clean shutdown so connections are released on Ctrl-C / kill.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => { await prisma.$disconnect().catch(() => {}); process.exit(0) })
}

loop()
