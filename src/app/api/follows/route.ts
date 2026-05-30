import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyFollow } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const { followerId, followingId } = await request.json();

    if (!followerId || !followingId) return NextResponse.json({ error: 'Missing ids' }, { status: 400 });
    if (followerId === followingId) return NextResponse.json({ error: 'Cannot follow self' }, { status: 400 });

    // Make sure both users exist in the User table first!
    await prisma.user.upsert({
      where: { walletAddress: followerId },
      update: {},
      create: { walletAddress: followerId }
    });
    
    await prisma.user.upsert({
      where: { walletAddress: followingId },
      update: {},
      create: { walletAddress: followingId }
    });

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } }
    });

    if (existing) {
      await prisma.follow.delete({
        where: { followerId_followingId: { followerId, followingId } }
      });
      return NextResponse.json({ status: 'unfollowed' });
    } else {
      await prisma.follow.create({
        data: { followerId, followingId }
      });
      
      // Dispatch notification to the person being followed
      await notifyFollow(followingId, followerId);

      return NextResponse.json({ status: 'followed' });
    }
  } catch (error) {
    console.error('Error toggling follow:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
