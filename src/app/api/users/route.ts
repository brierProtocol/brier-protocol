import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) return NextResponse.json({ error: 'address is required' }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { walletAddress: address },
      include: {
        followers: true,
        following: true
      }
    });

    return NextResponse.json({
      user: user || { walletAddress: address, name: null, bio: null, pfpUrl: null },
      followersCount: user?.followers.length || 0,
      followingCount: user?.following.length || 0
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { walletAddress, name, bio, pfpUrl } = await request.json();

    if (!walletAddress) return NextResponse.json({ error: 'Missing walletAddress' }, { status: 400 });

    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: { name, bio, pfpUrl },
      create: { walletAddress, name, bio, pfpUrl }
    });

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error('Error saving user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
