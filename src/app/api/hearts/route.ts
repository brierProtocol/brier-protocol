import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// GET /api/hearts?botId=...&userId=...
// Devuelve el total de likes del bot y, si se pasa userId, si ese usuario ya dio like.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const botId = searchParams.get('botId')
  // Wallets live lowercased in the DB; normalize or the "already hearted"
  // check misses for checksummed addresses.
  const userId = searchParams.get('userId')?.toLowerCase() || null

  if (!botId) {
    return NextResponse.json({ error: 'Missing botId' }, { status: 400 })
  }

  try {
    const count = await prisma.heart.count({ where: { botId } })

    let hearted = false
    if (userId) {
      const existing = await prisma.heart.findUnique({
        where: { userId_botId: { userId, botId } },
      })
      hearted = !!existing
    }

    return NextResponse.json({ count, hearted })
  } catch (error) {
    console.error('Heart fetch error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const botId = body.botId
    // Canonical lowercase, like the rest of the social layer. A checksummed
    // address here used to create a second heart from the "same" user.
    const userId = typeof body.userId === 'string' ? body.userId.toLowerCase() : ''

    if (!userId || !botId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Ensure user exists
    await prisma.user.upsert({
      where: { walletAddress: userId },
      update: {},
      create: { walletAddress: userId, name: `User_${userId.substring(0, 6)}` }
    })

    const existingHeart = await prisma.heart.findUnique({
      where: {
        userId_botId: {
          userId,
          botId
        }
      }
    })

    if (existingHeart) {
      // Unlike
      await prisma.heart.delete({
        where: { id: existingHeart.id }
      })
      const count = await prisma.heart.count({ where: { botId } })
      return NextResponse.json({ status: 'unhearted', count })
    } else {
      // Like
      await prisma.heart.create({
        data: {
          userId,
          botId
        }
      })

      // Notify the bot's OWNER (ownerWallet is the human; walletAddress may be
      // the bot's execution wallet). Best-effort: a notification failure must
      // never break the like itself. actorWallet lets the bell show a face.
      try {
        const bot = await prisma.bot.findUnique({ where: { id: botId }, select: { name: true, ownerWallet: true, walletAddress: true } })
        const ownerWallet = (bot?.ownerWallet || bot?.walletAddress || '').toLowerCase()
        if (bot && ownerWallet && ownerWallet !== userId) {
          await prisma.notification.create({
            data: {
              walletAddress: ownerWallet,
              type: 'LIKE',
              title: 'ALGORITHM LIKED',
              message: `liked ${bot.name}.`,
              metadata: JSON.stringify({ actorWallet: userId, botName: bot.name }),
            }
          })
        }
      } catch (notifyErr) {
        console.error('Heart notification failed (like still saved):', notifyErr)
      }

      const count = await prisma.heart.count({ where: { botId } })
      return NextResponse.json({ status: 'hearted', count })
    }
  } catch (error) {
    console.error('Heart error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
