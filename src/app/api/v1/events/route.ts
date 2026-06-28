/**
 * GET /api/v1/events
 *
 * The public protocol event feed — the append-only stream every consumer reads.
 * Third parties poll this to build alerts, analytics, or dashboards without
 * touching the database directly.
 *
 * Query params:
 *   type    optional — filter by event type (e.g. ScoreUpdated)
 *   botId   optional — filter to one agent
 *   since   optional — ISO timestamp; only events strictly after it
 *   limit   1..200 (default 50)
 *
 * Self-contained CORS (no shared helper) so this ships independently of the
 * other /api/v1 routes.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 200)
  const type = searchParams.get('type') || undefined
  const botId = searchParams.get('botId') || undefined
  const since = searchParams.get('since')
  const sinceDate = since ? new Date(since) : null

  try {
    const events = await prisma.protocolEvent.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(botId ? { botId } : {}),
        ...(sinceDate && !isNaN(sinceDate.getTime()) ? { createdAt: { gt: sinceDate } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, type: true, botId: true, vaultAddress: true, payload: true, createdAt: true },
    })

    return NextResponse.json(
      {
        count: events.length,
        events: events.map(e => ({
          id: e.id,
          type: e.type,
          botId: e.botId,
          vaultAddress: e.vaultAddress,
          payload: e.payload,
          at: e.createdAt.toISOString(),
        })),
      },
      { headers: CORS },
    )
  } catch (err: any) {
    console.error('[api/v1/events]', err)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500, headers: CORS })
  }
}
