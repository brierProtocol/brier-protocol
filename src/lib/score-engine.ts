/**
 * The Brier Score Engine calculates the accuracy of a bot's predictions over its 30-day paper/live phase.
 * Formula: Brier Score = (1/N) * SUM( (forecast - outcome)^2 )
 * 
 * Score meaning:
 * 0.0 = Perfect Accuracy
 * 0.25 = Complete Guesswork (Random)
 * 1.0 = Perfectly Wrong
 */

export type PredictionLog = {
  marketId: string;
  forecastProbability: number; // e.g., 0.65 (65%)
  actualOutcome: 1 | 0;        // 1 if happened, 0 if didn't
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
 * Recalculates a bot's Brier score using ONLY fully resolved markets.
 * Never includes pending predictions.
 */
export async function recalculateBotScore(botId: string, prismaClient: any) {
  const resolvedTrades = await prismaClient.tradeEvent.findMany({
    where: { 
      botId: botId,
      outcome: { in: ['WIN', 'LOSS'] } // strictly resolved
    }
  });

  if (resolvedTrades.length === 0) return 0.25;

  const predictions: PredictionLog[] = resolvedTrades.map((t: any) => ({
    marketId: t.marketId,
    forecastProbability: t.entryPrice || 0.5,
    actualOutcome: t.outcome === 'WIN' ? 1 : 0
  }));

  const newScore = calculateBrierScore(predictions);
  
  const statusCheck = validateVaultEligibility(resolvedTrades.length, newScore);
  const newStatus = statusCheck.eligible ? 'VAULT_ELIGIBLE_T1' : 'PAPER';

  await prismaClient.bot.update({
    where: { id: botId },
    data: { 
      status: newStatus 
      // Update score in related table if necessary
    }
  });

  return newScore;
}
