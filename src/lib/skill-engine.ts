export type ResolvedPrediction = {
  forecast: number;        // Bot's probability [0, 1]
  marketMidpoint: number;  // Market's probability at commit time [0, 1]
  outcome: 1 | 0;          // Final outcome
}

/**
 * Calculates the individual Brier score for a single probability.
 */
function calculateBrier(probability: number, outcome: 1 | 0): number {
  return Math.pow(probability - outcome, 2);
}

/**
 * Skill Engine - Calculates Relative Skill with Lower Confidence Bound (LCB)
 * 
 * 1. Relative Skill = Market Brier - Bot Brier
 *    Positive value means the bot was MORE accurate than the market.
 *    Negative value means the bot was LESS accurate than the market.
 * 
 * 2. LCB (Lower Confidence Bound)
 *    Anti-sybil measure to prevent 1 lucky guess from topping the leaderboard.
 *    Formula: Mean - (Z * (StdDev / sqrt(N)))
 *    Z = 1.96 (95% confidence)
 */
export function calculateRelativeSkillWithLCB(predictions: ResolvedPrediction[]): {
  relativeSkill: number;
  lcb: number;
  marketBrier: number;
  botBrier: number;
  normalizedScore: number;
} {
  if (predictions.length === 0) {
    return {
      relativeSkill: 0,
      lcb: 0,
      marketBrier: 0.25,
      botBrier: 0.25,
      normalizedScore: 50 // Neutral score
    };
  }

  const relativeSkills: number[] = [];
  let totalMarketBrier = 0;
  let totalBotBrier = 0;

  for (const p of predictions) {
    const mBrier = calculateBrier(p.marketMidpoint, p.outcome);
    const bBrier = calculateBrier(p.forecast, p.outcome);
    
    totalMarketBrier += mBrier;
    totalBotBrier += bBrier;
    
    relativeSkills.push(mBrier - bBrier);
  }

  const n = relativeSkills.length;
  const meanRelativeSkill = relativeSkills.reduce((a, b) => a + b, 0) / n;
  const marketBrier = totalMarketBrier / n;
  const botBrier = totalBotBrier / n;

  // Calculate standard deviation of relative skills
  let variance = 0;
  if (n > 1) {
    const sumSquaredDiffs = relativeSkills.reduce((sum, val) => sum + Math.pow(val - meanRelativeSkill, 2), 0);
    variance = sumSquaredDiffs / (n - 1); // Sample variance
  } else {
    // If only 1 prediction, penalize heavily with a high assumed variance
    variance = 0.25; 
  }

  const stdDev = Math.sqrt(variance);

  // LCB Calculation (Z = 1.96 for 95% confidence interval)
  const z = 1.96;
  const standardError = stdDev / Math.sqrt(n);
  const lcb = meanRelativeSkill - (z * standardError);

  // Normalize to a 0-100 "Builder Reputation" score
  // LCB typically ranges from -1.0 to +1.0. 
  // Let's map -0.5 to 0, 0 to 50, +0.5 to 100
  let normalizedScore = 50 + (lcb * 100);
  normalizedScore = Math.max(0, Math.min(100, normalizedScore));

  return {
    relativeSkill: meanRelativeSkill,
    lcb,
    marketBrier,
    botBrier,
    normalizedScore
  };
}
