import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { log } from '@/lib/observability'

// GET /api/follows?address=...&viewerId=...
// Devuelve los seguidores y seguidos de `address`, sus contadores, y
// (si se pasa viewerId) si el visitante ya sigue a `address`.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')
  const viewerId = searchParams.get('viewerId')

  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 })
  }

  try {
    // followers = quienes siguen a `address` (followingId == address)
    // following = a quienes sigue `address` (followerId == address)
    const [followerRows, followingRows] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: address },
        include: { follower: { select: { walletAddress: true, name: true, handle: true, pfpUrl: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.follow.findMany({
        where: { followerId: address },
        include: { following: { select: { walletAddress: true, name: true, handle: true, pfpUrl: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    let isFollowing = false
    if (viewerId && viewerId !== address) {
      const existing = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: address } },
      })
      isFollowing = !!existing
    }

    return NextResponse.json({
      followers: followerRows.map((r) => r.follower),
      following: followingRows.map((r) => r.following),
      followersCount: followerRows.length,
      followingCount: followingRows.length,
      isFollowing,
    })
  } catch (error) {
    log('error', 'follows.get', { message: error instanceof Error ? error.message : String(error), code: (error as any)?.code })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

      // Best-effort notification — a failure here must never break the follow.
      try {
        await prisma.notification.create({
          data: {
            walletAddress: followingId,
            type: 'FOLLOW',
            title: 'NEW FOLLOWER',
            message: `Wallet ${followerId.substring(0,6)}...${followerId.substring(followerId.length-4)} started following you.`
          }
        })
      } catch (notifyErr) {
        log('warn', 'follows.notify', { message: notifyErr instanceof Error ? notifyErr.message : String(notifyErr) })
      }

      const followersCount = await prisma.follow.count({ where: { followingId } })
      return NextResponse.json({ status: 'followed', followersCount })
    }
  } catch (error) {
    log('error', 'follows.post', { message: error instanceof Error ? error.message : String(error), code: (error as any)?.code })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
