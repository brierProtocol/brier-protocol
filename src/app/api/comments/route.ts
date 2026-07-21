import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { log } from '@/lib/observability'

const MAX_TEXT = 2000
// Small data: URL uploads or an https image/gif link — same shape User/Bot
// pfpUrl already accepts. 300KB caps a data: URL comfortably under Postgres'
// practical row-size limits without needing real file storage yet.
const isValidMedia = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length < 300_000 &&
  (v.startsWith('data:image/') || v.startsWith('https://'))

export async function POST(request: Request) {
  try {
    const { botId, wallet, text, parentId, mediaUrl } = await request.json()
    const lowerWallet = wallet?.toLowerCase()

    if (!botId || !lowerWallet || (!text?.trim() && !mediaUrl)) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }
    if (typeof text === 'string' && text.length > MAX_TEXT) {
      return NextResponse.json({ error: `Comment text exceeds maximum length of ${MAX_TEXT} characters` }, { status: 400 })
    }
    if (wallet.startsWith('anon_')) {
      return NextResponse.json({ error: 'Anonymous wallets are not allowed to post' }, { status: 403 })
    }
    if (mediaUrl !== undefined && mediaUrl !== null && !isValidMedia(mediaUrl)) {
      return NextResponse.json({ error: 'mediaUrl must be a data:image/ or https:// URL under 300KB' }, { status: 400 })
    }

    // A reply's parent must exist, belong to the same bot, and not itself be a
    // reply — keeps threads exactly one level deep.
    let parentComment: { id: string; parentId: string | null; wallet: string } | null = null
    if (parentId) {
      parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { id: true, botId: true, parentId: true, wallet: true },
      }).then(c => (c && c.botId === botId ? c : null))
      if (!parentComment) {
        return NextResponse.json({ error: 'Parent comment not found on this bot' }, { status: 404 })
      }
      if (parentComment.parentId) {
        return NextResponse.json({ error: 'Cannot reply to a reply' }, { status: 400 })
      }
    }

    await prisma.user.upsert({
      where: { walletAddress: lowerWallet },
      update: {},
      create: { walletAddress: lowerWallet, name: `User_${lowerWallet.substring(0, 6)}` }
    })

    const comment = await prisma.comment.create({
      data: {
        botId,
        wallet: lowerWallet,
        text: text?.trim() || '',
        mediaUrl: mediaUrl || null,
        parentId: parentComment?.id || null,
      },
      include: {
        user: { select: { handle: true, name: true, pfpUrl: true } }
      }
    })

    // Notify the bot's OWNER on a top-level comment, or the parent comment's
    // author on a reply — whichever human should actually see this.
    const notifyWallet = parentComment ? parentComment.wallet : null
    if (notifyWallet && notifyWallet !== lowerWallet) {
      await prisma.notification.create({
        data: {
          walletAddress: notifyWallet,
          type: 'REPLY',
          title: 'New reply',
          message: 'replied to your comment.',
          metadata: JSON.stringify({ actorWallet: lowerWallet }),
        }
      }).catch(() => {})
    }
    if (!parentComment) {
      const bot = await prisma.bot.findUnique({ where: { id: botId }, select: { name: true, ownerWallet: true, walletAddress: true } })
      const ownerWallet = (bot?.ownerWallet || bot?.walletAddress || '').toLowerCase()
      if (bot && ownerWallet && ownerWallet !== lowerWallet) {
        await prisma.notification.create({
          data: {
            walletAddress: ownerWallet,
            type: 'COMMENT',
            title: 'New comment',
            message: `left a comment on ${bot.name}.`,
            metadata: JSON.stringify({ actorWallet: lowerWallet, botName: bot.name }),
          }
        }).catch(() => {})
      }
    }

    return NextResponse.json({ ...comment, replies: [], likedByViewer: false })
  } catch (error) {
    log('error', 'comments.post', { message: error instanceof Error ? error.message : String(error), code: (error as any)?.code })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const botId = searchParams.get('botId')
  const viewer = searchParams.get('viewer')?.toLowerCase() || null

  if (!botId) return NextResponse.json({ error: 'Missing botId' }, { status: 400 })

  try {
    const rows = await prisma.comment.findMany({
      where: { botId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { handle: true, name: true, pfpUrl: true } },
        commentLikes: viewer ? { where: { userId: viewer }, select: { id: true } } : false,
      },
    })

    // Flatten to { ...comment, replies: [...], likedByViewer } — replies sorted
    // oldest-first (a conversation reads top-down), top-level newest-first.
    const byId = new Map(rows.map(r => [r.id, { ...r, replies: [] as typeof rows, likedByViewer: viewer ? r.commentLikes!.length > 0 : false }]))
    const top: (typeof rows[number] & { replies: typeof rows; likedByViewer: boolean })[] = []
    for (const r of rows) {
      const node = byId.get(r.id)!
      if (r.parentId && byId.has(r.parentId)) byId.get(r.parentId)!.replies.push(node as any)
      else if (!r.parentId) top.push(node as any)
    }
    for (const t of top) t.replies.reverse()

    return NextResponse.json(top)
  } catch (error) {
    log('error', 'comments.get', { message: error instanceof Error ? error.message : String(error), code: (error as any)?.code })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/comments?id=...&wallet=... — a comment can only be deleted by the
// wallet that posted it. Deleting a top-level comment cascades its replies
// (schema onDelete: Cascade) — the UI warns before calling this on a comment
// that has replies.
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const wallet = searchParams.get('wallet')?.toLowerCase()
    if (!id || !wallet) return NextResponse.json({ error: 'Missing id or wallet' }, { status: 400 })

    const comment = await prisma.comment.findUnique({ where: { id }, select: { wallet: true } })
    if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    if (comment.wallet !== wallet) {
      return NextResponse.json({ error: 'You can only delete your own comments' }, { status: 403 })
    }

    await prisma.comment.delete({ where: { id } })
    return NextResponse.json({ status: 'deleted' })
  } catch (error) {
    log('error', 'comments.delete', { message: error instanceof Error ? error.message : String(error), code: (error as any)?.code })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
