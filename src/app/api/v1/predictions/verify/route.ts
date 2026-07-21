// ═══════════════════════════════════════════════════════════════════════════════
// PREDICTION VERIFICATION API
// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/predictions/verify?id=<predictionId>
//
// Public endpoint (no auth). Returns the full verification chain for a prediction:
//   - The raw prediction data
//   - The canonical payload and recomputed hash
//   - Whether the hash matches what's stored
//   - The Merkle anchor batch (if anchored)
//   - The on-chain transaction (if published)
//
// This is the endpoint an auditor, investor, or competitor would use to verify
// that Brier Protocol predictions are real and weren't modified after the fact.
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const predictionId = req.nextUrl.searchParams.get('id')
  if (!predictionId) {
    return NextResponse.json({ error: 'id parameter required' }, { status: 400 })
  }

  const prediction = await prisma.prediction.findUnique({
    where: { id: predictionId },
    include: {
      anchor: true,
      bot: { select: { id: true, slug: true, name: true } },
    },
  })

  if (!prediction) {
    return NextResponse.json({ error: 'Prediction not found' }, { status: 404 })
  }

  // Recompute the commitment hash from the raw fields
  const canonicalPayload = [
    prediction.botId,
    prediction.marketId,
    prediction.side.toUpperCase(),
    prediction.confidence.toFixed(8),
    prediction.timestamp.toISOString(),
  ].join('|')
  const recomputedHash = crypto.createHash('sha256').update(canonicalPayload).digest('hex')
  const hashMatches = prediction.commitHash === recomputedHash

  return NextResponse.json({
    prediction: {
      id: prediction.id,
      botId: prediction.botId,
      botSlug: prediction.bot.slug,
      botName: prediction.bot.name,
      marketId: prediction.marketId,
      marketTitle: prediction.marketTitle,
      side: prediction.side,
      confidence: prediction.confidence,
      marketProbabilityAtCommit: prediction.marketProbabilityAtCommit,
      status: prediction.status,
      resolution: prediction.resolution,
      committedAt: prediction.timestamp,
    },
    verification: {
      commitHash: prediction.commitHash,
      canonicalPayload,
      recomputedHash,
      hashMatches,
      // If no commitHash was stored (legacy prediction), mark as unverifiable
      verifiable: prediction.commitHash !== null,
    },
    anchor: prediction.anchor ? {
      id: prediction.anchor.id,
      merkleRoot: prediction.anchor.merkleRoot,
      leafCount: prediction.anchor.leafCount,
      status: prediction.anchor.status,
      chainId: prediction.anchor.chainId,
      txHash: prediction.anchor.txHash,
      blockNumber: prediction.anchor.blockNumber,
      anchoredAt: prediction.anchor.createdAt,
    } : null,
  })
}
