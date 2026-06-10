import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const bots = await prisma.bot.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        scores: {
          where: { isLatest: true },
          take: 1
        }
      }
    });

    // Attach maker profiles (Bot.walletAddress has no Prisma relation to User)
    const wallets = [...new Set(bots.map(b => b.walletAddress?.toLowerCase()).filter(Boolean))] as string[];
    const users = await prisma.user.findMany({ where: { walletAddress: { in: wallets } } });
    const byWallet = new Map(users.map(u => [u.walletAddress.toLowerCase(), u]));
    const shaped = bots.map(b => {
      const u = byWallet.get(b.walletAddress?.toLowerCase() || '');
      return { ...b, maker: u ? { handle: u.handle, name: u.name, pfpUrl: u.pfpUrl } : null };
    });

    return NextResponse.json(shaped);
  } catch (error) {
    console.error('Error fetching bots:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
