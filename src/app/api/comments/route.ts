import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('botId');

    if (!botId) {
      return NextResponse.json({ error: 'botId is required' }, { status: 400 });
    }

    const comments = await prisma.comment.findMany({
      where: { botId },
      orderBy: { createdAt: 'asc' },
      include: { user: true }
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { botId, wallet, text } = body;

    if (!botId || !wallet || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await prisma.user.upsert({
      where: { walletAddress: wallet },
      update: {},
      create: { walletAddress: wallet }
    });

    const comment = await prisma.comment.create({
      data: {
        botId,
        wallet,
        text,
      },
      include: { user: true }
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error posting comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
