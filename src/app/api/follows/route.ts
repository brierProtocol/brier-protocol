import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { followerId, followingId } = await request.json()

    if (!followerId || !followingId) {
      return NextResponse.json({ error: 'Missing addresses' }, { status: 400 })
    }

    if (followerId === followingId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    // Ensure users exist
    await prisma.user.upsert({
      where: { walletAddress: followerId },
      update: {},
      create: { walletAddress: followerId, name: `User_${followerId.substring(0, 6)}` }
    })

    await prisma.user.upsert({
      where: { walletAddress: followingId },
      update: {},
      create: { walletAddress: followingId, name: `User_${followingId.substring(0, 6)}` }
    })

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    })

    if (existingFollow) {
      // Unfollow
      await prisma.follow.delete({
        where: { id: existingFollow.id }
      })
      return NextResponse.json({ status: 'unfollowed' })
    } else {
      // Follow
      await prisma.follow.create({
        data: {
          followerId,
          followingId
        }
      })

      // Send Notification to followingId
      await prisma.notification.create({
        data: {
          walletAddress: followingId,
          type: 'FOLLOW',
          title: 'NEW FOLLOWER',
          message: `Wallet ${followerId.substring(0,6)}...${followerId.substring(followerId.length-4)} started following you.`
        }
      })

      return NextResponse.json({ status: 'followed' })
    }
  } catch (error) {
    console.error('Follow error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
