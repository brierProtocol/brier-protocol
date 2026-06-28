/**
 * Shared helpers for the PUBLIC reputation API (/api/v1/*).
 *
 * This is the surface third parties build on: read-only, CORS-open, versioned,
 * and shaped from real Prisma data only. No invented metrics — a field is null
 * when the evidence does not exist yet ("AWAITING" semantics).
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
}

/** JSON response with the public CORS + cache headers attached. */
export function publicJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...CORS_HEADERS, ...(init?.headers || {}) } })
}

/** CORS preflight handler — re-export as `OPTIONS` from each route. */
export function preflight() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

/**
 * Stable public shape for an agent. The contract third parties depend on.
 * Brier/winRate/sharpe are null until the bot has a scored snapshot.
 */
export type PublicAgent = {
  id: string
  slug: string
  name: string
  status: string
  tier: string
  brierScore: number | null
  winRate: number | null
  sharpe: number | null
  maxDrawdown: number | null
  resolvedPredictions: number
  vaultOpen: boolean
  vaultAddress: string | null
  declaredCategories: string[]
  verifiedCategories: string[]
  createdAt: string
}

type BotWithScore = {
  id: string; slug: string; name: string; status: string; tier: string
  vaultOpen: boolean; vaultAddress: string | null
  categories: string[]; verifiedCategories: string[]; createdAt: Date
  scores: { brierScore: number; winRate: number; sharpe: number; maxDrawdown: number; totalTrades: number }[]
}

export function shapeAgent(bot: BotWithScore): PublicAgent {
  const s = bot.scores[0]
  return {
    id: bot.id,
    slug: bot.slug,
    name: bot.name,
    status: bot.status,
    tier: bot.tier,
    brierScore: s && s.brierScore > 0 ? s.brierScore : null,
    winRate: s && s.totalTrades > 0 ? s.winRate : null,
    sharpe: s && s.sharpe !== 0 ? s.sharpe : null,
    maxDrawdown: s ? s.maxDrawdown : null,
    resolvedPredictions: s?.totalTrades ?? 0,
    vaultOpen: bot.vaultOpen,
    vaultAddress: bot.vaultAddress ?? null,
    declaredCategories: bot.categories,
    verifiedCategories: bot.verifiedCategories,
    createdAt: bot.createdAt.toISOString(),
  }
}

const AGENT_SELECT = {
  id: true, slug: true, name: true, status: true, tier: true,
  vaultOpen: true, vaultAddress: true, categories: true, verifiedCategories: true, createdAt: true,
  scores: {
    where: { isLatest: true },
    take: 1,
    select: { brierScore: true, winRate: true, sharpe: true, maxDrawdown: true, totalTrades: true },
  },
} as const

/** Resolve an agent by id, slug, or (lowercased) wallet address. */
export async function resolveAgent(idOrSlugOrWallet: string) {
  const key = idOrSlugOrWallet.trim()
  const bot = await prisma.bot.findFirst({
    where: {
      OR: [
        { id: key },
        { slug: key },
        { walletAddress: key.toLowerCase() },
      ],
    },
    select: AGENT_SELECT,
  })
  return bot
}

export { AGENT_SELECT }
