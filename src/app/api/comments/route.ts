import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { botId, wallet, text } = await request.json()

    if (!botId || !wallet || !text) {
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
      where: { walletAddress: wallet },
      update: {},
      create: { walletAddress: wallet, name: `User_${wallet.substring(0, 6)}` }
    })

    const comment = await prisma.comment.create({
      data: {
        botId,
        wallet,
        text
      }
    })

    // Notify bot owner
    const bot = await prisma.bot.findUnique({ where: { id: botId } })
    if (bot && bot.walletAddress && bot.walletAddress !== wallet) {
      await prisma.notification.create({
        data: {
          walletAddress: bot.walletAddress,
          type: 'COMMENT',
          title: 'NEW FEEDBACK LOG',
          message: `Wallet ${wallet.substring(0,6)}... left a log on [${bot.name}].`
        }
      })
    }

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Comment error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
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
        user: { select: { name: true, pfpUrl: true } }
      }
    })
    return NextResponse.json(comments)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}
