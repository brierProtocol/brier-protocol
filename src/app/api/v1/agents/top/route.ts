/**
 * GET /api/v1/agents/top
 *
 * Public leaderboard: agents ranked by Brier Score (lower = better), filtered to
 * those that actually have resolved predictions. The core "who is good" endpoint.
 *
 * Query params:
 *   limit     1..100 (default 20)
 *   category  optional — filter to bots whose VERIFIED categories include it
 *   tier      optional — e.g. TIER1
 */
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { publicJson, preflight, shapeAgent, AGENT_SELECT } from '@/lib/api/public'

export const dynamic = 'force-dynamic'

export function OPTIONS() {
  return preflight()
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 100)
  const category = searchParams.get('category')?.toLowerCase() || undefined
  const tier = searchParams.get('tier')?.toUpperCase() || undefined

  try {
    // Only bots with a latest score that has resolved trades can be ranked.
    const bots = await prisma.bot.findMany({
      where: {
        ...(tier ? { tier } : {}),
        ...(category ? { verifiedCategories: { has: category } } : {}),
        scores: { some: { isLatest: true, totalTrades: { gt: 0 } } },
      },
      select: AGENT_SELECT,
    })

    const ranked = bots
      .map(shapeAgent)
      .filter(a => a.brierScore != null)
      .sort((a, b) => (a.brierScore! - b.brierScore!))
      .slice(0, limit)
      .map((a, i) => ({ rank: i + 1, ...a }))

    return publicJson({ count: ranked.length, agents: ranked })
  } catch (err: any) {
    console.error('[api/v1/agents/top]', err)
    return publicJson({ error: 'Failed to fetch ranking' }, { status: 500 })
  }
}
