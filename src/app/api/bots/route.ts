import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: Request) {
  try {
    const bots = await prisma.bot.findMany({
      orderBy: { createdAt: 'desc' },
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
      // SECURITY: strip signing credentials — never send them to the catalog.
      const { _count, apiKey, apiSecret, ...rest } = b;
      return { ...rest, tradesIndexed: _count?.trades ?? 0, maker: u ? { handle: u.handle, name: u.name, pfpUrl: u.pfpUrl } : null };
    });

    return NextResponse.json(shaped);
  } catch (error) {
    console.error('Error fetching bots:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
