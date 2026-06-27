/**
 * GET /api/v1/agents/{id}/score
 *
 * Current reputation snapshot for one agent. `{id}` resolves by bot id, slug,
 * or wallet address. Returns the stable PublicAgent shape (metrics are null
 * until the bot has resolved predictions).
 */
import { NextRequest } from 'next/server'
import { publicJson, preflight, shapeAgent, resolveAgent } from '@/lib/api/public'

export const dynamic = 'force-dynamic'

export function OPTIONS() {
  return preflight()
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const bot = await resolveAgent(id)
    if (!bot) return publicJson({ error: 'Agent not found' }, { status: 404 })
    return publicJson(shapeAgent(bot))
  } catch (err: any) {
    console.error('[api/v1/agents/[id]/score]', err)
    return publicJson({ error: 'Failed to fetch agent score' }, { status: 500 })
  }
}
