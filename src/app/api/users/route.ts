import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const lowerAddress = address?.toLowerCase();

    if (!lowerAddress) return NextResponse.json({ error: 'address is required' }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { walletAddress: lowerAddress },
      include: {
        followers: true,
        following: true
      }
    });

    return NextResponse.json({
      user: user || { walletAddress: address, handle: null, name: null, bio: null, pfpUrl: null },
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
    const { walletAddress, handle, name, bio, pfpUrl, xHandle } = await request.json();
    const lowerAddress = walletAddress?.toLowerCase();

    if (!lowerAddress) return NextResponse.json({ error: 'Missing walletAddress' }, { status: 400 });

    const finalHandle = handle === undefined ? undefined : (handle?.trim() || null);

    if (finalHandle) {
      // Check if handle is already taken by someone else
      const existing = await prisma.user.findUnique({ where: { handle: finalHandle } });
      if (existing && existing.walletAddress !== walletAddress) {
        return NextResponse.json({ error: 'Handle already taken' }, { status: 400 });
      }
    }

    // Normalize an X handle: strip a leading @ or an x.com/twitter.com URL.
    const cleanX = xHandle === undefined ? undefined
      : (xHandle === null || xHandle === '')
        ? null
        : String(xHandle).trim().replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '').replace(/^@/, '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15)

    // A manual link is never auto-verified; clearing it resets verification too.
    const xData = cleanX === undefined ? {} : { xHandle: cleanX, xVerified: false }

    const user = await prisma.user.upsert({
      where: { walletAddress: lowerAddress },
      update: { handle: finalHandle, name, bio, pfpUrl, ...xData },
      create: { walletAddress: lowerAddress, handle: finalHandle, name, bio, pfpUrl, ...xData }
    });

    return NextResponse.json(user, { status: 200 });
  } catch (error: any) {
    console.error('Error saving user:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
