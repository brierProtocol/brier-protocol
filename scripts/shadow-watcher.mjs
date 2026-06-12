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

const prisma = new PrismaClient()
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

      const winner = (data.tokens || []).find(t => t.winner === true)
      if (!winner) { console.log(`[WATCHER] ${trade.marketId} closed, winner not finalized (UMA window)`); continue }

      const winningOutcome = (winner.outcome || '').toUpperCase()
      const bet = (trade.side || '').toUpperCase()
      const normalized = bet === 'LONG' ? 'YES' : bet === 'SHORT' ? 'NO' : bet
      const didWin = normalized === winningOutcome

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
await settlePending()
setInterval(settlePending, INTERVAL_MS)
