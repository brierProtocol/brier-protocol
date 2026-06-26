/**
 * GET /api/v1/markets
 *
 * The distinct Polymarket markets Brier agents have actually traded, with how
 * many agents and predictions touched each. Lets third parties see coverage:
 * which real-world events the agent economy is forecasting.
 *
 * Query params:
 *   limit   1..100 (default 50)
 */
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { publicJson, preflight } from '@/lib/api/public'

export const dynamic = 'force-dynamic'

export function OPTIONS() {
  return preflight()
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 100)

  try {
    // Group predictions by market. One row per distinct market with counts.
    const grouped = await prisma.tradeEvent.groupBy({
      by: ['marketId', 'marketTitle'],
      _count: { _all: true },
      _max: { timestamp: true },
      orderBy: { _max: { timestamp: 'desc' } },
      take: limit,
    })

    // Distinct agent count per market (groupBy can't count distinct botId inline).
    const markets = await Promise.all(
      grouped.map(async g => {
        const agents = await prisma.tradeEvent.findMany({
          where: { marketId: g.marketId },
          select: { botId: true },
          distinct: ['botId'],
        })
        return {
          marketId: g.marketId,
          title: g.marketTitle,
          predictions: g._count._all,
          agents: agents.length,
          lastPredictionAt: g._max.timestamp ? g._max.timestamp.toISOString() : null,
        }
      }),
    )

    return publicJson({ count: markets.length, markets })
  } catch (err: any) {
    console.error('[api/v1/markets]', err)
    return publicJson({ error: 'Failed to fetch markets' }, { status: 500 })
  }
}
