import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { botReputation } from '@/lib/skill-engine';
import { sanitizePrediction } from '@/lib/truthGuard';

export const dynamic = 'force-dynamic';



export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const bot = await prisma.bot.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      include: {
        scores: { orderBy: { snapshotDate: 'asc' }, take: 90 },
        predictions: { orderBy: { timestamp: 'desc' } },
        trades: { orderBy: { timestamp: 'desc' } },
        pnlSnapshots: { orderBy: { date: 'asc' }, take: 90 },
        _count: { select: { hearts: true } }
      }
    });

    if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 });

    const user = bot.walletAddress ? await prisma.user.findUnique({ where: { walletAddress: bot.walletAddress.toLowerCase() } }) : null;

    let builderReputation = 0;
    if (bot.ownerWallet) {
      const allBots = await prisma.bot.findMany({
        where: { ownerWallet: bot.ownerWallet },
        include: { scores: { orderBy: { snapshotDate: 'desc' }, take: 1 } }
      });
      for (const b of allBots) {
        if (b.scores.length > 0 && b.scores[0].lcb != null && b.scores[0].lcb > 0) {
          builderReputation += b.scores[0].lcb;
        }
      }
    }

    // ── PERFORMANCE METRICS ──
    const allPredictions = [...bot.predictions]
      .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map(sanitizePrediction)
      .filter(p => p !== null)

    const resolvedPreds = allPredictions.filter(p => p!.status === 'WIN' || p!.status === 'LOSS');
    const latestScore = bot.scores.length > 0 ? bot.scores[bot.scores.length - 1] : null;
    const latestPnl = bot.pnlSnapshots.length > 0 ? bot.pnlSnapshots[bot.pnlSnapshots.length - 1] : null;

    return NextResponse.json({
      ...bot,
      predictions: allPredictions,
      user: user ? { handle: user.handle, name: user.name, pfpUrl: user.pfpUrl, reputation: builderReputation } : null,
      performance: {
        roi: latestPnl && latestScore && latestScore.totalVolume > 0 ? (latestPnl.cumulativePnl / latestScore.totalVolume) * 100 : 0,
        winRate: latestScore ? latestScore.winRate : 0,
        predictions: allPredictions.length,
        resolved: resolvedPreds.length,
        pending: allPredictions.length - resolvedPreds.length
      },
      reputation: {
        lcb: latestScore ? latestScore.lcb : 0,
        maxDrawdown: latestScore ? latestScore.maxDrawdown : 0
      }
    });
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

    const bot = await prisma.bot.findFirst({
      where: { OR: [{ slug }, { id: slug }] }
    });

    if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    if (bot.ownerWallet?.toLowerCase() !== walletAddress?.toLowerCase() && bot.walletAddress?.toLowerCase() !== walletAddress?.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updated = await prisma.bot.update({
      where: { id: bot.id },
      data: {
        name: name !== undefined ? name : bot.name,
        tagline: tagline !== undefined ? tagline : bot.tagline,
        description: description !== undefined ? description : bot.description,
        pfpUrl: pfpUrl !== undefined ? pfpUrl : bot.pfpUrl,
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating bot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
