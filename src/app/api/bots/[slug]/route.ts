import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { botReputation } from '@/lib/skill-engine';

function categorizeTitle(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('bitcoin') || t.includes('btc') || t.includes('ethereum') || t.includes('eth') || t.includes('crypto') || t.includes('solana') || t.includes('token') || t.includes('defi')) return 'Crypto';
  if (t.includes('election') || t.includes('trump') || t.includes('biden') || t.includes('democrat') || t.includes('republican') || t.includes('president') || t.includes('senate') || t.includes('house') || t.includes('vote') || t.includes('kamala')) return 'Politics';
  if (t.includes('rate') || t.includes('fed') || t.includes('inflation') || t.includes('cpi') || t.includes('gdp') || t.includes('economy') || t.includes('interest')) return 'Macro';
  if (t.includes('nba') || t.includes('nfl') || t.includes('soccer') || t.includes('football') || t.includes('tennis') || t.includes('champion') || t.includes('super bowl') || t.includes('world cup')) return 'Sports';
  return 'Other';
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const bot = await prisma.bot.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      include: {
        scores: { orderBy: { snapshotDate: 'asc' }, take: 90 },
        predictions: { orderBy: { timestamp: 'desc' } },
        // On-chain fills for the profile's execution panel (hidden while empty).
        trades: { orderBy: { timestamp: 'desc' }, take: 50 },
        pnlSnapshots: { orderBy: { date: 'asc' }, take: 90 },
        _count: { select: { hearts: true } }
      }
    });

    if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 });

    // The MAKER is ownerWallet (FK to User) — walletAddress can be the bot's
    // Polymarket EXECUTION wallet, which has no human profile behind it.
    const makerWallet = (bot.ownerWallet || bot.walletAddress || '').toLowerCase();
    const user = makerWallet ? await prisma.user.findUnique({ where: { walletAddress: makerWallet } }) : null;

    // ── Quant DNA and Categories ──
    const resolvedPreds = bot.predictions.filter(p => p.status === 'WIN' || p.status === 'LOSS');
    
    // Frequency
    const firstPred = bot.predictions[bot.predictions.length - 1];
    const daysActive = firstPred ? Math.max(1, (Date.now() - new Date(firstPred.timestamp).getTime()) / 86400000) : 1;
    const frequency = bot.predictions.length / daysActive;
    
    // Horizon (using createdAt if resolvedAt is missing, or just simple average days)
    // Predictions don't have resolvedAt stored directly in the current MVP schema, 
    // so we assume time between timestamp and now for resolved ones, or use a heuristic.
    // For now, let's mock it based on frequency as a proxy if we don't have exact resolution times.
    const horizonLabel = frequency > 2 ? 'Short Horizon' : 'Long Horizon';
    const frequencyLabel = frequency > 5 ? 'High Frequency' : 'Low Frequency';
    
    // Confidence
    const avgConfidence = resolvedPreds.length > 0 
      ? resolvedPreds.reduce((sum, p) => sum + (p.confidence > 0.5 ? p.confidence : (1 - p.confidence)), 0) / resolvedPreds.length 
      : 0;
    const confidenceLabel = avgConfidence > 0.8 ? 'High Conviction' : (avgConfidence > 0.6 ? 'Measured Conviction' : 'Balanced');

    // Categories
    const catMap = new Map<string, typeof resolvedPreds>();
    for (const p of bot.predictions) {
      const cat = categorizeTitle(p.marketTitle);
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat)!.push(p);
    }

    const categoriesData = Array.from(catMap.entries()).map(([name, preds]) => {
      const resolved = preds.filter(p => p.status === 'WIN' || p.status === 'LOSS');
      let skill = 0;
      if (resolved.length > 0) {
        const rp = resolved.map(p => ({
          pBot: p.confidence, pMarket: p.marketProbabilityAtCommit, outcome: (p.status === 'WIN' ? 1 : 0) as 1 | 0, liquidity: p.liquidity
        }));
        skill = botReputation(rp).skill;
      }
      return {
        name,
        volumePct: bot.predictions.length > 0 ? (preds.length / bot.predictions.length) * 100 : 0,
        skill: skill,
        resolvedCount: resolved.length
      };
    }).sort((a, b) => b.volumePct - a.volumePct);

    // Current Rank calculation (mocked for this endpoint, real rank comes from leaderboard)
    const rank = bot.tier === 'TIER1' ? 1 : bot.tier === 'TIER2' ? 2 : bot.tier === 'TIER3' ? 3 : 'Unranked';

    // SECURITY: never serialize the signing credentials to the client.
    const { apiKey: _apiKey, apiSecret: _apiSecret, ...safeBot } = bot;

    return NextResponse.json({
      ...safeBot,
      user: user ? { walletAddress: user.walletAddress, handle: user.handle, name: user.name, bio: user.bio, pfpUrl: user.pfpUrl, xHandle: user.xHandle, xVerified: user.xVerified } : null,
      makerWallet,
      quantDna: {
        frequencyLabel,
        horizonLabel,
        confidenceLabel,
        avgConfidence
      },
      categoriesData,
      rank
    });
  } catch (error) {
    console.error('Error fetching bot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
