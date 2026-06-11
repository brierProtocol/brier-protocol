// Shadow-phase resolution watcher (standalone, no deps beyond @prisma/client).
// Polls PENDING TradeEvents and settles them against the Polymarket CLOB:
// once a market closes with a winner, the trade becomes WIN/LOSS and the
// hourly score cron recomputes the bot's real Brier from it.
//
// Run:  set -a && source .env.local && set +a && node scripts/shadow-watcher.mjs

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const CLOB = process.env.POLYMARKET_CLOB_URL || 'https://clob.polymarket.com'
const INTERVAL_MS = 5 * 60 * 1000

async function settlePending() {
  const pending = await prisma.tradeEvent.findMany({ where: { outcome: 'PENDING' } })
  console.log(`[WATCHER] ${new Date().toISOString()} — ${pending.length} PENDING trade(s)`)

  for (const trade of pending) {
    try {
      const res = await fetch(`${CLOB}/markets/${trade.marketId}`, { signal: AbortSignal.timeout(15000) })
      if (res.status === 404) { console.warn(`[WATCHER] ${trade.marketId} not on CLOB — skipping`); continue }
      if (!res.ok) continue
      const data = await res.json()
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
