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

    return NextResponse.json(bots);
  } catch (error) {
    console.error('Error fetching bots:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
