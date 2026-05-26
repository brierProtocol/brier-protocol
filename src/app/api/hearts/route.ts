import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { userId, makerId } = await request.json();

    if (!userId || !makerId) return NextResponse.json({ error: 'Missing ids' }, { status: 400 });

    const existing = await prisma.heart.findUnique({
      where: { userId_makerId: { userId, makerId } }
    });

    if (existing) {
      await prisma.heart.delete({
        where: { userId_makerId: { userId, makerId } }
      });
      return NextResponse.json({ status: 'unhearted' });
    } else {
      await prisma.heart.create({
        data: { userId, makerId }
      });
      return NextResponse.json({ status: 'hearted' });
    }
  } catch (error) {
    console.error('Error toggling heart:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
