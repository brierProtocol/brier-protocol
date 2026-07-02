import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { resolveMarket } from '@/lib/market-data'
import { botReputation, absoluteBotBrier, reputationScoreFromLcb, ResolvedPrediction } from '@/lib/skill-engine'
import { checkStatusTransitions } from '@/lib/incubation'
import { settleResolvedTrades } from '@/lib/settlement'
import { deriveVerifiedCategories } from '@/lib/marketCategories'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // ── 1. RESOLVE ── group PENDING predictions by market so we hit the CLOB once each.
    const pending = await prisma.prediction.findMany({
      where: { status: 'PENDING' },
      select: { marketId: true },
      distinct: ['marketId'],
    })

    let resolvedMarkets = 0
    let resolvedPreds = 0
    for (const { marketId } of pending) {
      const r = await resolveMarket(marketId)
      if (!r.resolved) continue // still open / CLOB unreachable
      
      const upd = await prisma.prediction.updateMany({
        where: { marketId, status: 'PENDING' },
        data: { status: r.yesWon ? 'WIN' : 'LOSS', resolution: r.yesWon ? 'YES' : 'NO' },
      })
      resolvedMarkets++
      resolvedPreds += upd.count

      // --- INTEGRACIÓN EXECUTOR (SETTLEMENT) ---
      try {
        const pendingTrades = await prisma.tradeEvent.findMany({
          where: { marketId, outcome: 'PENDING' }
        })
        
        for (const trade of pendingTrades) {
          // Calculate payout (simplified for MVP: if win, payout = amount * (1/entryPrice). If loss, 0)
          // Note: entryPrice must be > 0
          let payout = 0;
          if ((trade.side === 'YES' && r.yesWon) || (trade.side === 'NO' && !r.yesWon)) {
             payout = trade.entryPrice > 0 ? trade.amount / trade.entryPrice : trade.amount;
          }

          const executorUrl = process.env.EXECUTOR_URL || 'http://127.0.0.1:3001'
          const executorSecret = process.env.BUILDER_SECRET_KEY || 'your-64-char-hex-secret'
          const t = Date.now().toString()
          
          const executorBody = JSON.stringify({
            tradeId: trade.id,
            botId: trade.botId,
            vaultAddress: trade.executionWallet,
            ctfAddress: process.env.CTF_EXCHANGE_ADDRESS || '0x4bFB41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E', // standard polymarket CTF
            conditionId: trade.conditionId || "",
            collateralToken: process.env.USDC_ADDRESS || '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            indexSets: trade.side === 'YES' ? [1] : [2], // 1 for YES, 2 for NO (usually)
            payout: payout
          })

          const sig = require('crypto').createHmac('sha256', executorSecret).update(t + executorBody).digest('hex')

          await fetch(`${executorUrl}/api/v1/settle`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-timestamp': t,
              'x-signature': sig,
            },
            body: executorBody
          }).catch(err => console.error('[resolve] Executor settle error (network):', err))
          
          await prisma.tradeEvent.update({
             where: { id: trade.id },
             data: { outcome: payout > 0 ? 'WIN' : 'LOSS', resolvedPrice: r.yesWon ? 1 : 0, resolvedAt: new Date() }
          })
        }
      } catch (e) {
        console.error('[resolve] Executor settlement integration error:', e)
      }
      // -----------------------------------------
    }

    // ── 1b. BOOK SETTLEMENTS INTO NAV ── mirror the 60/30/10 split off-chain for
    // every resolved-but-unbooked trade (idempotent via TradeEvent.vaultBookedAt).
    // Without this the dashboard NAV/PnL never reflected trading (audit FAIL-1/2).
    const settlement = await settleResolvedTrades()

    // ── 2. SCORE ── every bot that has at least one resolved prediction.
    const botsWithResolved = await prisma.prediction.findMany({
      where: { status: { in: ['WIN', 'LOSS'] } },
      select: { botId: true },
      distinct: ['botId'],
    })

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const scored: { botId: string; lcb: number; n: number }[] = []

    for (const { botId } of botsWithResolved) {
      const preds = await prisma.prediction.findMany({
        where: { botId, status: { in: ['WIN', 'LOSS'] } },
        select: { confidence: true, marketProbabilityAtCommit: true, status: true, liquidity: true },
      })
      
      const resolved: ResolvedPrediction[] = preds.map(p => ({
        pBot: p.confidence,
        pMarket: p.marketProbabilityAtCommit,
        outcome: (p.status === 'WIN' ? 1 : 0) as 1 | 0,
        liquidity: p.liquidity,
      }))

      const rep = botReputation(resolved)
      // brierScore = Brier ABSOLUTO (0..1, mayor=peor); relativeSkill/lcb = skill vs
      // mercado; reputationScore = 0..100 del LCB (ver skill-engine).
      const absBrier = absoluteBotBrier(resolved)
      const repScore = reputationScoreFromLcb(rep.lcb)
      const winRate = resolved.length > 0 ? resolved.filter(p => p.outcome === 1).length / resolved.length : 0

      await prisma.$transaction([
        prisma.botScore.updateMany({ where: { botId, isLatest: true }, data: { isLatest: false } }),
        prisma.botScore.upsert({
          where: { botId_snapshotDate: { botId, snapshotDate: today } },
          create: {
            botId,
            brierScore: absBrier,
            winRate: winRate,
            relativeSkill: rep.skill,
            lcb: rep.lcb,
            reputationScore: repScore,
            resolvedPredictions: rep.n,
            totalTrades: rep.n,
            snapshotDate: today,
            isLatest: true,
          },
          update: {
            brierScore: absBrier,
            winRate: winRate,
            relativeSkill: rep.skill,
            lcb: rep.lcb,
            reputationScore: repScore,
            resolvedPredictions: rep.n,
            totalTrades: rep.n,
            isLatest: true,
          },
        }),
      ])
      
      await checkStatusTransitions(botId).catch(() => {})

      scored.push({ botId, lcb: Number(rep.lcb.toFixed(4)), n: rep.n })
    }

    // ── 3. CATEGORIES ── derive each bot's category from WHERE it actually bets
    // (its market titles). No maker ever picks a category; this is the honest signal.
    // The indexer covers on-chain traders; this covers shadow-phase bots that only
    // commit predictions and have no trades yet.
    const botsWithPreds = await prisma.prediction.findMany({ select: { botId: true }, distinct: ['botId'] })
    let categorized = 0
    for (const { botId } of botsWithPreds) {
      const titles = await prisma.prediction.findMany({ where: { botId }, select: { marketTitle: true }, take: 500 })
      const cats = deriveVerifiedCategories(titles.map(t => t.marketTitle))
      if (cats.length) {
        await prisma.bot.update({ where: { id: botId }, data: { verifiedCategories: cats } })
        categorized++
      }
    }

    return NextResponse.json({ ok: true, resolvedMarkets, resolvedPredictions: resolvedPreds, settlement, scored, categorized })
  } catch (err: any) {
    console.error('[cron/resolve-and-score]', err)
    return NextResponse.json({ error: err?.message || 'resolve-and-score failed' }, { status: 500 })
  }
}
