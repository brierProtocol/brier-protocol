import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { userId, botId } = await request.json();

    if (!userId || !botId) return NextResponse.json({ error: 'Missing ids' }, { status: 400 });

    // Upsert the user to ensure foreign key constraint doesn't fail
    await prisma.user.upsert({
      where: { walletAddress: userId },
      update: {},
      create: { walletAddress: userId }
    });

    const existing = await prisma.heart.findUnique({
      where: { userId_botId: { userId, botId } }
    });

    if (existing) {
      await prisma.heart.delete({
        where: { userId_botId: { userId, botId } }
      });
      return NextResponse.json({ status: 'unhearted' });
    } else {
      await prisma.heart.create({
        data: { userId, botId }
      });
      return NextResponse.json({ status: 'hearted' });
    }
  } catch (error) {
    console.error('Error toggling heart:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
