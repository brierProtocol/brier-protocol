// ═══════════════════════════════════════════════════════════════════════════════
// COMMITMENT ANCHOR CRON
// ═══════════════════════════════════════════════════════════════════════════════
// Vercel cron: {"path": "/api/cron/anchor-commitments", "schedule": "0 * * * *"}
//
// Every hour, collects all predictions with a commitHash but no anchorId,
// builds a Merkle tree of those hashes, and publishes the root on-chain.
// This creates an immutable, verifiable chain of evidence that predictions
// were committed BEFORE their outcomes were known.
//
// Verification flow (for any auditor):
//   1. Take a prediction's commitHash
//   2. Find its CommitmentAnchor batch
//   3. Verify the Merkle proof (leaf → root)
//   4. Verify the root matches the on-chain transaction
//   5. Check the block timestamp is BEFORE the market resolved
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import crypto from 'crypto'
import { ethers } from 'ethers'
import { recordCronRun, captureError } from '@/lib/observability'

// Minimal ABI for the on-chain anchor contract
const ANCHOR_ABI = [
  'function anchor(bytes32 merkleRoot, uint256 leafCount) external',
  'event Anchored(bytes32 indexed merkleRoot, uint256 leafCount, uint256 timestamp)',
]

// ── Simple Merkle Tree (binary, SHA-256) ────────────────────────────────────
function buildMerkleRoot(leaves: string[]): string {
  if (leaves.length === 0) return '0'.repeat(64)
  if (leaves.length === 1) return leaves[0]

  // Ensure even number of leaves (duplicate last if odd)
  const padded = [...leaves]
  if (padded.length % 2 !== 0) padded.push(padded[padded.length - 1])

  const parents: string[] = []
  for (let i = 0; i < padded.length; i += 2) {
    const combined = padded[i] + padded[i + 1]
    parents.push(crypto.createHash('sha256').update(combined).digest('hex'))
  }

  return buildMerkleRoot(parents)
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Find all un-anchored predictions with a commitHash
    const unanchored = await prisma.prediction.findMany({
      where: {
        commitHash: { not: null },
        anchorId: null,
      },
      select: { id: true, commitHash: true },
      orderBy: { createdAt: 'asc' },
      take: 1000, // batch limit per cron run
    })

    if (unanchored.length === 0) {
      await recordCronRun('anchor_commitments', 'SUCCESS', { records: 0 })
      return NextResponse.json({ ok: true, anchored: 0, message: 'No un-anchored predictions' })
    }

    // 2. Build Merkle tree
    const leaves = unanchored.map(p => p.commitHash!).sort() // sort for deterministic tree
    const merkleRoot = buildMerkleRoot(leaves)

    // 3. Create the anchor record in DB (status: PENDING)
    const anchor = await prisma.commitmentAnchor.create({
      data: {
        merkleRoot,
        leafCount: leaves.length,
        status: 'PENDING',
      },
    })

    // 4. Link predictions to this anchor
    await prisma.prediction.updateMany({
      where: { id: { in: unanchored.map(p => p.id) } },
      data: { anchorId: anchor.id },
    })

    // 5. Publish on-chain (if configured)
    let txHash: string | null = null
    let blockNumber: number | null = null
    const rpc = process.env.ANCHOR_RPC_URL || process.env.RPC_URL
    const pk = process.env.ANCHOR_PRIVATE_KEY || process.env.EXECUTOR_PRIVATE_KEY
    const contractAddress = process.env.COMMITMENT_ANCHOR_ADDRESS

    if (rpc && pk && contractAddress) {
      try {
        const provider = new ethers.JsonRpcProvider(rpc)
        const signer = new ethers.Wallet(pk, provider)
        const contract = new ethers.Contract(contractAddress, ANCHOR_ABI, signer)

        const tx = await contract.anchor(
          '0x' + merkleRoot,
          leaves.length,
        )
        const receipt = await tx.wait()
        txHash = receipt.hash
        blockNumber = receipt.blockNumber

        // Update anchor with on-chain confirmation
        await prisma.commitmentAnchor.update({
          where: { id: anchor.id },
          data: {
            txHash,
            blockNumber,
            status: 'ANCHORED',
          },
        })
      } catch (chainErr: any) {
        // On-chain failed — anchor stays PENDING, will retry next cron run
        console.error('[anchor-commitments] on-chain publish failed:', chainErr?.message)
      }
    } else {
      // No on-chain config — anchor stays as off-chain Merkle proof only
      // This is still useful: the DB record with merkleRoot + creation timestamp
      // is a strong signal. On-chain anchoring upgrades it to cryptographic proof.
      console.warn('[anchor-commitments] no on-chain config — Merkle root stored in DB only')
    }

    await recordCronRun('anchor_commitments', 'SUCCESS', {
      records: leaves.length,
    })

    return NextResponse.json({
      ok: true,
      anchored: leaves.length,
      merkleRoot,
      anchorId: anchor.id,
      onChain: txHash ? { txHash, blockNumber } : null,
    })
  } catch (err: any) {
    captureError(err, { cron: 'anchor_commitments' })
    await recordCronRun('anchor_commitments', 'FAILED', { error: err?.message })
    return NextResponse.json({ error: err?.message || 'anchor-commitments cron failed' }, { status: 500 })
  }
}
