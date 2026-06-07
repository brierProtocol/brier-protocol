import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readVaultNav } from '@/lib/vault-reader';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const bot = await prisma.bot.findFirst({
      where: {
        OR: [
          { slug: slug },
          { id: slug }
        ]
      },
      include: {
        scores: {
          where: { isLatest: true },
          take: 1
        },
        trades: {
          orderBy: { timestamp: 'desc' },
          take: 50
        },
        pnlSnapshots: {
          orderBy: { date: 'asc' },
          take: 30
        },
        _count: {
          select: { hearts: true }
        }
      }
    });

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Live on-chain NAV when the bot has a deployed vault (null otherwise).
    const liveNav = await readVaultNav(bot.vaultAddress);

    return NextResponse.json({ ...bot, liveNav });
  } catch (error) {
    console.error('Error fetching bot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { walletAddress, name, tagline, description, pfpUrl } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress is required to verify ownership' }, { status: 400 });
    }

    const bot = await prisma.bot.findFirst({
      where: {
        OR: [{ slug: slug }, { id: slug }]
      }
    });
    
    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    if (bot.walletAddress !== walletAddress) {
      return NextResponse.json({ error: 'Unauthorized. Only the maker can edit this bot.' }, { status: 403 });
    }

    const updatedBot = await prisma.bot.update({
      where: { id: bot.id },
      data: {
        name: name !== undefined ? name : bot.name,
        tagline: tagline !== undefined ? tagline : bot.tagline,
        description: description !== undefined ? description : bot.description,
        pfpUrl: pfpUrl !== undefined ? pfpUrl : bot.pfpUrl
      }
    });

    return NextResponse.json(updatedBot, { status: 200 });
  } catch (error) {
    console.error('Error updating bot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
