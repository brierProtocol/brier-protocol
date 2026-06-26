/**
 * GET /api/v1/agents/{id}/history
 *
 * An agent's prediction history (from indexed TradeEvent rows). This is the raw
 * evidence behind the Brier Score — every prediction, its probability, and how
 * reality resolved it. The dataset that makes the reputation verifiable.
 *
 * Query params:
 *   limit    1..200 (default 50)
 *   status   optional — PENDING | WIN | LOSS | LIQUIDATED
 */
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { publicJson, preflight, resolveAgent } from '@/lib/api/public'

export const dynamic = 'force-dynamic'

export function OPTIONS() {
  return preflight()
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 200)
  const status = searchParams.get('status')?.toUpperCase()

  try {
    const bot = await resolveAgent(id)
    if (!bot) return publicJson({ error: 'Agent not found' }, { status: 404 })

    const trades = await prisma.tradeEvent.findMany({
      where: {
        botId: bot.id,
        ...(status ? { outcome: status } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        marketId: true, marketTitle: true, side: true, entryPrice: true,
        amount: true, outcome: true, resolvedPrice: true, brierContrib: true,
        timestamp: true, resolvedAt: true, source: true,
      },
    })

    const predictions = trades.map(t => ({
      marketId: t.marketId,
      market: t.marketTitle,
      predicted: t.side,                                  // YES | NO | LONG | SHORT
      probability: t.entryPrice,                          // 0..1 the bot assigned
      stake: t.amount,
      outcome: t.outcome,                                 // PENDING | WIN | LOSS | LIQUIDATED
      resolvedProbability: t.outcome === 'PENDING' ? null : t.resolvedPrice,
      brierContribution: t.brierContrib || null,
      source: t.source,
      predictedAt: t.timestamp.toISOString(),
      resolvedAt: t.resolvedAt ? t.resolvedAt.toISOString() : null,
    }))

    return publicJson({ agent: { id: bot.id, slug: bot.slug }, count: predictions.length, predictions })
  } catch (err: any) {
    console.error('[api/v1/agents/[id]/history]', err)
    return publicJson({ error: 'Failed to fetch agent history' }, { status: 500 })
  }
}
