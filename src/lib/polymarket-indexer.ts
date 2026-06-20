import { prisma } from './db/prisma'

// Polymarket exposes a public Data API that returns a wallet's executed trades.
// This is far more reliable than decoding raw CTF ERC-1155 transfers, and it's the
// real source the shadow indexer uses to populate TradeEvent rows.
const DATA_API = process.env.POLYMARKET_DATA_API || 'https://data-api.polymarket.com'

type PolyTrade = {
  proxyWallet?: string
  conditionId?: string
  asset?: string            // outcome tokenId
  side?: string             // BUY | SELL
  outcome?: string          // "Yes" | "No"
  title?: string
  slug?: string
  size?: number | string
  price?: number | string
  timestamp?: number        // unix seconds
  transactionHash?: string
}

/**
 * Pulls a bot's recent Polymarket trades and mirrors any new ones into TradeEvent
 * (as PENDING — the ResolutionWatcher settles them later). Idempotent via the
 * @@unique([source, externalTradeId]) constraint.
 */
export async function indexPolymarketWallet(botId: string): Promise<boolean> {
  const conn = await prisma.polyConnection.findUnique({ where: { botId } })
  const wallet = conn?.walletAddress?.toLowerCase()
  if (!wallet) return false

  let trades: PolyTrade[] = []
  try {
    const res = await fetch(`${DATA_API}/trades?user=${wallet}&limit=100`, {
      headers: { accept: 'application/json' },
    })
    if (!res.ok) {
      console.warn(`[Indexer] data-api ${res.status} for ${wallet}`)
      return false
    }
    trades = await res.json()
  } catch (err: any) {
    console.error(`[Indexer] fetch failed for ${wallet}:`, err?.message || err)
    return false
  }

  if (!Array.isArray(trades) || trades.length === 0) {
    await prisma.polyConnection.update({ where: { botId }, data: { lastSyncAt: new Date() } }).catch(() => {})
    return true
  }

  const rows = trades
    .filter(t => t.transactionHash && t.conditionId)
    .map(t => {
      const price = Number(t.price ?? 0)
      const size = Number(t.size ?? 0)
      const outcome = (t.outcome || '').toUpperCase() // YES | NO
      return {
        botId,
        marketId: t.conditionId!,
        marketTitle: t.title || t.slug || 'Polymarket market',
        side: outcome || (t.side === 'SELL' ? 'NO' : 'YES'),
        amount: size * price,
        entryPrice: price,
        outcome: 'PENDING',
        executionWallet: t.proxyWallet || wallet,
        timestamp: t.timestamp ? new Date(t.timestamp * 1000) : new Date(),
        source: 'POLYMARKET',
        externalTradeId: `${t.transactionHash}-${t.asset ?? '0'}`,
      }
    })

  // skipDuplicates relies on the unique (source, externalTradeId) index.
  const created = await prisma.tradeEvent.createMany({ data: rows, skipDuplicates: true })

  await prisma.polyConnection.update({
    where: { botId },
    data: { lastSyncAt: new Date() },
  }).catch(() => {})

  console.log(`[Indexer] ${wallet}: ${created.count} new trades indexed (of ${rows.length} fetched)`)
  return true
}

/**
 * Frontend helper: a bot's recent resolved trade history for display.
 * Reads from our own indexed TradeEvent table (the shadow indexer is the source of truth).
 */
export async function getBotTradeHistory(botAddressOrId: string) {
  const bot = await prisma.bot.findFirst({
    where: {
      OR: [
        { id: botAddressOrId },
        { walletAddress: botAddressOrId.toLowerCase() },
      ],
    },
    select: { id: true },
  })
  if (!bot) return []

  const trades = await prisma.tradeEvent.findMany({
    where: { botId: bot.id },
    orderBy: { timestamp: 'desc' },
    take: 30,
  })

  return trades.map(t => ({
    market: t.marketTitle,
    predicted: t.side,
    probability: t.entryPrice,
    actualOutcome: t.outcome === 'PENDING' ? null : t.outcome === 'WIN' ? 1 : 0,
    date: t.timestamp.toISOString().slice(0, 10),
  }))
}
