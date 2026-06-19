import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// GET /api/hearts?botId=...&userId=...
// Devuelve el total de likes del bot y, si se pasa userId, si ese usuario ya dio like.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const botId = searchParams.get('botId')
  const userId = searchParams.get('userId')

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
    const { userId, botId } = await request.json()

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
      return NextResponse.json({ status: 'unhearted' })
    } else {
      // Like
      await prisma.heart.create({
        data: {
          userId,
          botId
        }
      })

      // Send Notification to bot owner
      const bot = await prisma.bot.findUnique({ where: { id: botId } })
      if (bot && bot.walletAddress) {
        // Don't notify if liking own bot
        if (bot.walletAddress !== userId) {
          await prisma.notification.create({
            data: {
              walletAddress: bot.walletAddress,
              type: 'LIKE',
              title: 'ALGORITHM LIKED',
              message: `Wallet ${userId.substring(0,6)}... liked your bot [${bot.name}].`
            }
          })
        }
      }

      return NextResponse.json({ status: 'hearted' })
    }
  } catch (error) {
    console.error('Heart error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
