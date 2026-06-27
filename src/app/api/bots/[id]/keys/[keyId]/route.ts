/**
 * DELETE /api/bots/:id/keys/:keyId → revoke a key.
 *
 * Same wallet-ownership signature as issuing. Revocation is a soft delete
 * (revokedAt set); the executor stops accepting the key on its next cache
 * refresh. The ownership proof is passed as query params since DELETE bodies are
 * not universally supported by clients.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { revokeApiKey } from '@/lib/api-keys'
import { verifyOwnership } from '@/lib/owner-auth'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; keyId: string }> }) {
  const { id, keyId } = await params

  const bot = await prisma.bot.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true, walletAddress: true },
  })
  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const auth = verifyOwnership(bot.id, bot.walletAddress, {
    address: searchParams.get('address') ?? undefined,
    signature: searchParams.get('signature') ?? undefined,
    timestamp: Number(searchParams.get('timestamp')),
  })
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 })

  const revoked = await revokeApiKey(bot.id, keyId)
  if (!revoked) return NextResponse.json({ error: 'Key not found or already revoked' }, { status: 404 })

  return NextResponse.json({ ok: true, revoked: keyId })
}
