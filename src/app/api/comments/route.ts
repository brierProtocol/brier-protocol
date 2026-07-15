import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { log } from '@/lib/observability'

export async function POST(request: Request) {
  try {
    const { botId, wallet, text } = await request.json()
    const lowerWallet = wallet?.toLowerCase()

    if (!botId || !lowerWallet || !text) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // SECURITY: Limit text length to prevent DoS via massive payloads
    if (text.length > 2000) {
      return NextResponse.json({ error: 'Comment text exceeds maximum length of 2000 characters' }, { status: 400 })
    }

    // SECURITY: Block obvious 'anon_' spoofing from API (must use real wallet or verified SIWE later)
    if (wallet.startsWith('anon_')) {
       return NextResponse.json({ error: 'Anonymous wallets are not allowed to post' }, { status: 403 })
    }

    // Ensure user exists
    await prisma.user.upsert({
      where: { walletAddress: lowerWallet },
      update: {},
      create: { walletAddress: lowerWallet, name: `User_${lowerWallet.substring(0, 6)}` }
    })

    const comment = await prisma.comment.create({
      data: {
        botId,
        wallet: lowerWallet,
        text
      },
      include: {
        user: { select: { handle: true, name: true, pfpUrl: true } }
      }
    })

    // Notify bot owner
    // Notify the bot's OWNER (ownerWallet is the human; walletAddress may be the
    // bot's execution wallet). Store the commenter as actorWallet so the bell
    // resolves their photo + name instead of showing a raw hex stub.
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
      })
    }

    return NextResponse.json(comment)
  } catch (error) {
    log('error', 'comments.post', { message: error instanceof Error ? error.message : String(error), code: (error as any)?.code })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const botId = searchParams.get('botId')

  if (!botId) return NextResponse.json({ error: 'Missing botId' }, { status: 400 })

  try {
    const comments = await prisma.comment.findMany({
      where: { botId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { handle: true, name: true, pfpUrl: true } }
      }
    })
    return NextResponse.json(comments)
  } catch (error) {
    log('error', 'comments.get', { message: error instanceof Error ? error.message : String(error), code: (error as any)?.code })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
