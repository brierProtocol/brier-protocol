import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const status = searchParams.get('status');
    const limitParam = searchParams.get('limit');
    // Optional server-side filtering so the query can use @@index([status]) and a
    // bounded take instead of scanning the whole Bot table. With no params the
    // response is unchanged (full list) for the existing catalog/leaderboard consumers.
    const take = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 0, 1), 100) : undefined;

    const whereClause: Record<string, unknown> = owner ? {
      OR: [
        { walletAddress: { equals: owner, mode: 'insensitive' as const } },
        { ownerWallet: { equals: owner, mode: 'insensitive' as const } }
      ]
    } : {};
    if (status) whereClause.status = status;

    const bots = await prisma.bot.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      ...(take ? { take } : {}),
      include: {
        scores: {
          where: { isLatest: true },
          take: 1
        },
        // Total indexed trades (incl. unresolved) so the UI can tell a bot that
        // is trading-but-unresolved from one whose wallet never traded.
        _count: { select: { trades: true } }
      }
    });

    // Attach maker profiles (Bot.walletAddress has no Prisma relation to User)
    const wallets = [...new Set(bots.map(b => b.walletAddress?.toLowerCase()).filter(Boolean))] as string[];
    const users = await prisma.user.findMany({ where: { walletAddress: { in: wallets } } });
    const byWallet = new Map(users.map(u => [u.walletAddress.toLowerCase(), u]));
    const shaped = bots.map(b => {
      const u = byWallet.get(b.walletAddress?.toLowerCase() || '');
      const { _count, ...rest } = b;
      return { ...rest, tradesIndexed: _count?.trades ?? 0, maker: u ? { handle: u.handle, name: u.name, pfpUrl: u.pfpUrl } : null };
    });

    return NextResponse.json(shaped);
  } catch (error) {
    console.error('Error fetching bots:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
