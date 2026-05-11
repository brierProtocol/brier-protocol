import { Alchemy, Network } from 'alchemy-sdk'
import { prisma } from './prisma'
import { computeBrierContribution } from './brier'
import { recomputeBotScore } from './score-engine'

const alchemy = new Alchemy({
  apiKey: process.env.ALCHEMY_API_KEY!,
  network: Network.MATIC_MAINNET,
})

// Polymarket CTF contract on Polygon
const CTF_CONTRACT = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045'

interface PolyTrade {
  txHash: string
  marketId: string
  direction: 'YES' | 'NO'
  amount: number      // USDC
  entryOdds: number   // 0–1
  timestamp: string
}

export async function indexPolymarketWallet(botId: string) {
  const connection = await prisma.polyConnection.findUniqueOrThrow({
    where: { botId }
  })

  const { walletAddress, lastBlockSynced } = connection

  // Fetch ERC-1155 transfers (conditional tokens) for this wallet
  const transfers = await alchemy.core.getAssetTransfers({
    fromBlock: `0x${BigInt(lastBlockSynced).toString(16)}`,
    toAddress: walletAddress,
    contractAddresses: [CTF_CONTRACT],
    category: ['erc1155'] as any,
    withMetadata: true,
  })

  if (!transfers.transfers.length) {
    await prisma.polyConnection.update({
      where: { botId },
      data: { lastSyncAt: new Date() }
    })
    return
  }

  for (const transfer of transfers.transfers) {
    const trade = parsePolyTransfer(transfer)
    if (!trade) continue

    if (trade.amount < 0.01) continue

    await prisma.tradeEvent.upsert({
      where: {
        source_externalTradeId: {
          source: 'POLYMARKET',
          externalTradeId: trade.txHash,
        }
      },
      update: {},
      create: {
        botId,
        source: 'POLYMARKET',
        externalTradeId: trade.txHash,
        marketTicker: trade.marketId,
        marketTitle: '', 
        direction: trade.direction,
        entryOdds: trade.entryOdds,
        usdAmount: trade.amount,
        result: 'PENDING',
        rawPayload: transfer as any,
      }
    })
  }

  const latestBlock = transfers.transfers[transfers.transfers.length - 1]
  await prisma.polyConnection.update({
    where: { botId },
    data: {
      lastBlockSynced: BigInt(latestBlock.blockNum || 0),
      lastSyncAt: new Date(),
    }
  })

  await resolvePendingTrades(botId)
  await recomputeBotScore(botId)
}

async function resolvePendingTrades(botId: string) {
  const pending = await prisma.tradeEvent.findMany({
    where: { botId, source: 'POLYMARKET', result: 'PENDING' }
  })

  for (const trade of pending) {
    try {
      const res = await fetch(
        `https://gamma-api.polymarket.com/markets/${trade.marketTicker}`
      )
      const market = await res.json()

      if (market.closed && market.winner !== undefined) {
        const resolvedYes = market.winner === 'YES'
        const won =
          (trade.direction === 'YES' && resolvedYes) ||
          (trade.direction === 'NO' && !resolvedYes)

        const brierContrib = computeBrierContribution(
          trade.direction as 'YES' | 'NO',
          Number(trade.entryOdds),
          resolvedYes
        )

        await prisma.tradeEvent.update({
          where: { id: trade.id },
          data: {
            result: won ? 'WIN' : 'LOSS',
            brierContrib,
            resolvedAt: new Date(market.endDate),
            marketTitle: market.question,
          }
        })
      }
    } catch {
      // Market not found or not resolved yet — skip
    }
  }
}

function parsePolyTransfer(transfer: any): PolyTrade | null {
  try {
    const tokenId = BigInt(transfer.tokenId || '0')
    const direction: 'YES' | 'NO' = tokenId % 2n === 0n ? 'YES' : 'NO'
    const amount = Number(transfer.value || 0)
    const entryOdds = amount > 0 ? Math.min(Math.max(amount / 100, 0.01), 0.99) : 0.5

    return {
      txHash: transfer.hash,
      marketId: transfer.rawContract?.address || '',
      direction,
      amount,
      entryOdds,
      timestamp: transfer.metadata?.blockTimestamp || new Date().toISOString(),
    }
  } catch {
    return null
  }
}
