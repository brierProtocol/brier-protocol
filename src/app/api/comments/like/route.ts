import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { log } from '@/lib/observability'

// POST /api/comments/like — toggle a like on a comment or reply (same shape
// as /api/hearts, scoped to CommentLike). Notifies the comment's author.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const commentId = body.commentId
    const userId = typeof body.userId === 'string' ? body.userId.toLowerCase() : ''

    if (!userId || !commentId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    await prisma.user.upsert({
      where: { walletAddress: userId },
      update: {},
      create: { walletAddress: userId, name: `User_${userId.substring(0, 6)}` }
    })

    const existing = await prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    })

    if (existing) {
      await prisma.$transaction([
        prisma.commentLike.delete({ where: { id: existing.id } }),
        prisma.comment.update({ where: { id: commentId }, data: { likes: { decrement: 1 } } }),
      ])
      const count = await prisma.comment.findUnique({ where: { id: commentId }, select: { likes: true } })
      return NextResponse.json({ status: 'unliked', count: Math.max(0, count?.likes ?? 0) })
    }

    const [, updated] = await prisma.$transaction([
      prisma.commentLike.create({ data: { userId, commentId } }),
      prisma.comment.update({ where: { id: commentId }, data: { likes: { increment: 1 } }, select: { likes: true, wallet: true } }),
    ])

    if (updated.wallet && updated.wallet !== userId) {
      await prisma.notification.create({
        data: {
          walletAddress: updated.wallet,
          type: 'COMMENT_LIKE',
          title: 'Comment liked',
          message: 'liked your comment.',
          metadata: JSON.stringify({ actorWallet: userId }),
        }
      }).catch(() => {})
    }

    return NextResponse.json({ status: 'liked', count: updated.likes })
  } catch (error) {
    log('error', 'comments.like', { message: error instanceof Error ? error.message : String(error), code: (error as any)?.code })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
