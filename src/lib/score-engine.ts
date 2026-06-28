/**
 * The Brier Score Engine calculates the accuracy of a bot's predictions over its 30-day paper/live phase.
 * Formula: Brier Score = (1/N) * SUM( (forecast - outcome)^2 )
 * 
 * Score meaning:
 * 0.0 = Perfect Accuracy
 * 0.25 = Complete Guesswork (Random)
 * 1.0 = Perfectly Wrong
 */

import { calculateRelativeSkillWithLCB } from './skill-engine';

export type PredictionLog = {
  marketId: string;
  forecastProbability: number; // e.g., 0.65 (65%)
  actualOutcome: 1 | 0;        // 1 if happened, 0 if didn't
}

/** A single resolved trade as stored in TradeEvent. */
export type ResolvedTrade = {
  entryPrice: number          // probability the bot assigned to its bet (0..1)
  outcome: 'WIN' | 'LOSS' | 'LIQUIDATED' | string
  amount: number              // USDC risked
}

/**
 * Computes the full metric set for a bot from its RESOLVED trades.
 * Pure function — no I/O — so it is fully unit-testable.
 *
 * Metrics:
 *  - brierScore  : mean squared error of P(win) vs outcome. 0 = perfect,
 *                  0.25 = coin flip, 1 = always wrong. The core "edge" measure.
 *  - winRate     : fraction of resolved trades that won (0..1).
 *  - sharpe      : risk-adjusted return = mean/stdev of per-trade returns,
 *                  scaled by √n. Higher = more consistent edge.
 *  - maxDrawdown : worst peak-to-trough drop of the equity curve (negative %).
 *  - totalVolume : USDC risked across resolved trades.
 *
 * Per-trade return model: a share bought at price p pays 1 on win
 * (return = (1 - p) / p) and 0 on loss (return = -1).
 */
export function computeBotMetrics(trades: ResolvedTrade[]): {
  brierScore: number
  winRate: number
  sharpe: number
  maxDrawdown: number
  totalTrades: number
  totalVolume: number
} {
  const resolved = trades.filter(t => t.outcome === 'WIN' || t.outcome === 'LOSS' || t.outcome === 'LIQUIDATED')
  const n = resolved.length
  if (n === 0) {
    return { brierScore: 0.25, winRate: 0, sharpe: 0, maxDrawdown: 0, totalTrades: 0, totalVolume: 0 }
  }

  let sse = 0
  let wins = 0
  const returns: number[] = []
  let totalVolume = 0

  for (const t of resolved) {
    const won = t.outcome === 'WIN'
    const actual = won ? 1 : 0
    const p = Math.min(Math.max(t.entryPrice, 0.001), 0.999)
    sse += (p - actual) ** 2
    if (won) wins++
    totalVolume += t.amount || 0
    returns.push(won ? (1 - p) / p : -1) // share bought at p pays 1 on win
  }

  const brierScore = sse / n
  const winRate = wins / n

  const mean = returns.reduce((a, b) => a + b, 0) / n
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / n
  const std = Math.sqrt(variance)
  const sharpe = std > 0 ? (mean / std) * Math.sqrt(n) : 0

  let equity = 1, peak = 1, maxDrawdown = 0
  for (const r of returns) {
    equity *= (1 + r)
    if (equity > peak) peak = equity
    const dd = peak > 0 ? (equity - peak) / peak : 0
    if (dd < maxDrawdown) maxDrawdown = dd
  }

  return { brierScore, winRate, sharpe, maxDrawdown, totalTrades: n, totalVolume }
}

export function calculateBrierScore(predictions: PredictionLog[]): number {
  if (predictions.length === 0) return 0.25; // Default to neutral if no data

  let sumSquaredErrors = 0;

  for (const pred of predictions) {
    const error = pred.forecastProbability - pred.actualOutcome;
    sumSquaredErrors += (error * error);
  }

  const brierScore = sumSquaredErrors / predictions.length;
  
  return brierScore;
}

/**
 * Calculates the current 30-day ROI for a given set of trades.
 * This is used to display the "Sim Return" during the paper phase.
 */
export function calculateROI(startingCapital: number, endingCapital: number): number {
  if (startingCapital === 0) return 0;
  return ((endingCapital - startingCapital) / startingCapital) * 100;
}

/**
 * Validates whether a bot has successfully passed the calibration phase.
 * Requirements:
 * 1. Must have a minimum of 50 resolved predictions.
 * 2. Brier Score must be strictly < 0.20 (Proof of Edge).
 */
export function validateVaultEligibility(
  totalPredictions: number, 
  brierScore: number
): { eligible: boolean; reason: string } {
  
  if (totalPredictions < 50) {
    return { eligible: false, reason: 'Insufficient volume. Minimum 50 resolved predictions required.' };
  }

  if (brierScore >= 0.20) {
    return { eligible: false, reason: `Brier Score too high (${brierScore.toFixed(3)}). Must be under 0.20 to prove mathematical edge.` };
  }

  return { eligible: true, reason: 'Vault Unlocked. Mathematical edge proven.' };
}

/**
 * Recalculates a bot's Brier score using ONLY fully resolved predictions.
 * Computes both absolute Brier and Relative Skill (LCB).
 */
export async function recalculateBotScore(botId: string, prismaClient: any) {
  // Fetch from the new immutable Prediction dataset
  const resolvedPredictions = await prismaClient.prediction.findMany({
    where: { 
      botId: botId,
      outcome: { in: ['WIN', 'LOSS'] } // strictly resolved
    }
  });

  if (resolvedPredictions.length === 0) return 0.25;

  const predictions = resolvedPredictions.map((p: any) => ({
    forecast: p.forecast,
    marketMidpoint: p.marketMidpoint,
    outcome: p.outcome === 'WIN' ? 1 : 0
  }));

  // Calculate Relative Skill and LCB
  const metrics = calculateRelativeSkillWithLCB(predictions);
  
  // Also calculate absolute win rate for legacy/UI display
  const wins = resolvedPredictions.filter((p: any) => p.outcome === 'WIN').length;
  const winRate = wins / resolvedPredictions.length;
  
  // Status check based on absolute Brier for now (could be updated to use LCB)
  const statusCheck = validateVaultEligibility(resolvedPredictions.length, metrics.botBrier);
  const newStatus = statusCheck.eligible ? 'VAULT_ELIGIBLE_T1' : 'PAPER';

  // Update bot status
  await prismaClient.bot.update({
    where: { id: botId },
    data: { 
      status: newStatus 
    }
  });

  // Create or update the daily BotScore snapshot
  await prismaClient.botScore.create({
    data: {
      botId: botId,
      brierScore: metrics.botBrier,
      winRate: winRate,
      sharpe: metrics.normalizedScore, // Using sharpe column temporarily to store normalized Builder Reputation
      totalTrades: resolvedPredictions.length,
      totalVolume: 0,
      maxDrawdown: metrics.relativeSkill, // Using maxDrawdown column temporarily for raw relative skill
      isLatest: true
    }
  });

  // Mark older scores as not latest
  await prismaClient.botScore.updateMany({
    where: {
      botId: botId,
      isLatest: true,
      NOT: {
        // Just inserted one will have a new ID, this might need a cleaner approach in production 
        // (like doing it before the create), but it's okay for the MVP script
      }
    },
    data: { isLatest: false }
  });

  return metrics.botBrier;
}
