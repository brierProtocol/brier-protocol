export type LegacyResolvedPrediction = {
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
export function calculateRelativeSkillWithLCB(predictions: LegacyResolvedPrediction[]): {
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
/**
 * SKILL ENGINE — the frozen reputation core of Brier v1.
 *
 * Brier v1 measures SKILL RELATIVE TO THE MARKET, not absolute Brier. Copying the
 * market scores ~0; only beating the crowd scores positive. This is the design
 * validated in scripts/research (adversarial backtest) and frozen as the protocol
 * core. The exact constants stay open until confirmed on real Polymarket data.
 *
 * Inputs are RESOLVED predictions, each carrying the bot's probability AND the
 * market's probability captured AT COMMIT TIME (exogenous to the bot's report, so
 * the skill-relative form stays a proper scoring rule).
 *
 * Public score      : Brier Skill (bounded, robust, stable rank).
 * Analytical metric : Log Skill (information added over the market, in nats).
 * Trust dimension   : Calibration (ECE) — does "70%" actually win 70%?
 * Anti-Sybil        : Builder Reputation pools ALL of a builder's bots.
 * Rank by           : the lower-confidence-bound, never the raw point estimate.
 */

const EPS = 0.01
const clip = (p: number) => Math.max(EPS, Math.min(1 - EPS, p))

/** 90% one-sided z. Rank by mean − Z·SE so luck doesn't masquerade as skill. */
export const LCB_Z = 1.64
/** Below this many resolved predictions a bot is "CALIBRATING", not ranked. */
export const MIN_RANKED_N = 30
/** Markets with liquidity below this are excluded from skill (noisy baseline). */
export const DEFAULT_MIN_LIQUIDITY = 0

export interface ResolvedPrediction {
  /** Probability the bot assigned to YES (0..1). */
  pBot: number
  /** Market probability of YES at COMMIT time (0..1). */
  pMarket: number
  /** Realized outcome: 1 if YES happened, 0 if not. */
  outcome: 0 | 1
  /** Market liquidity at commit (used by the liquidity filter). */
  liquidity?: number
}

const brier = (p: number, o: number) => (p - o) ** 2
const logScore = (p: number, o: number) => (o ? Math.log(clip(p)) : Math.log(1 - clip(p)))

function meanAndLcb(xs: number[]): { mean: number; lcb: number } {
  const n = xs.length
  if (n === 0) return { mean: 0, lcb: 0 }
  const mean = xs.reduce((a, b) => a + b, 0) / n
  if (n === 1) return { mean, lcb: mean }
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / n
  const se = Math.sqrt(variance) / Math.sqrt(n)
  return { mean, lcb: mean - LCB_Z * se }
}

/** Keeps only predictions on markets liquid enough for the market baseline to be trustworthy. */
export function filterLiquid(preds: ResolvedPrediction[], minLiquidity = DEFAULT_MIN_LIQUIDITY): ResolvedPrediction[] {
  if (minLiquidity <= 0) return preds
  return preds.filter(p => (p.liquidity ?? 0) >= minLiquidity)
}

/**
 * Brier Skill — the public reputation score. Mean reduction in squared error vs
 * the market. Positive = beats the crowd. Returns the point estimate and the
 * lower-confidence-bound (rank by the LCB).
 */
export function brierSkill(preds: ResolvedPrediction[]): { skill: number; lcb: number; n: number } {
  const contrib = preds.map(p => brier(p.pMarket, p.outcome) - brier(p.pBot, p.outcome))
  const { mean, lcb } = meanAndLcb(contrib)
  return { skill: mean, lcb, n: preds.length }
}

/**
 * Absolute Brier of the bot's OWN probabilities: 0 = perfect, 0.25 = coin flip,
 * 1 = always wrong (HIGHER = WORSE). This is what `BotScore.brierScore`, the
 * incubation display and the circuit-breaker (Brier rising = deterioration) expect
 * — distinct from brierSkill() above, which is skill RELATIVE to the market
 * (higher = better). Do NOT store one in the other's field.
 */
export function absoluteBotBrier(preds: ResolvedPrediction[]): number {
  if (preds.length === 0) return 0.25
  return preds.reduce((a, p) => a + brier(p.pBot, p.outcome), 0) / preds.length
}

/** Public 0..100 reputation headline from the LCB (schema: `reputationScore`). */
export function reputationScoreFromLcb(lcb: number): number {
  return Math.max(0, Math.min(100, 50 + lcb * 100))
}

/**
 * Log Skill — analytical / dataset metric. Information the bot adds over the
 * market, in nats (log Bayes factor). Spikier than Brier Skill; not the public rank.
 */
export function logSkill(preds: ResolvedPrediction[]): { skill: number; lcb: number; n: number } {
  const contrib = preds.map(p => logScore(p.pBot, p.outcome) - logScore(p.pMarket, p.outcome))
  const { mean, lcb } = meanAndLcb(contrib)
  return { skill: mean, lcb, n: preds.length }
}

/**
 * Calibration error (ECE) — a trust signal independent of edge. Buckets the bot's
 * probabilities and compares predicted vs observed frequency. 0 = perfectly
 * calibrated; higher = over/under-confident.
 */
export function calibrationError(preds: ResolvedPrediction[], bins = 10): number {
  if (preds.length === 0) return 0
  const buckets = Array.from({ length: bins }, () => ({ sumP: 0, wins: 0, n: 0 }))
  for (const p of preds) {
    const idx = Math.min(bins - 1, Math.floor(clip(p.pBot) * bins))
    const b = buckets[idx]
    b.sumP += p.pBot
    b.wins += p.outcome
    b.n += 1
  }
  let ece = 0
  for (const b of buckets) {
    if (b.n === 0) continue
    const avgP = b.sumP / b.n
    const obs = b.wins / b.n
    ece += (b.n / preds.length) * Math.abs(avgP - obs)
  }
  return ece
}

export type RankStatus = 'CALIBRATING' | 'RANKED'

export interface BotReputation {
  skill: number          // Brier Skill point estimate
  lcb: number            // ranking value
  logSkill: number       // analytical
  calibrationEce: number
  n: number              // resolved predictions counted (after liquidity filter)
  status: RankStatus
}

/** Full reputation snapshot for ONE bot, applying the liquidity filter and min-N gate. */
export function botReputation(preds: ResolvedPrediction[], minLiquidity = DEFAULT_MIN_LIQUIDITY): BotReputation {
  const used = filterLiquid(preds, minLiquidity)
  const bs = brierSkill(used)
  const ls = logSkill(used)
  return {
    skill: bs.skill,
    lcb: bs.lcb,
    logSkill: ls.skill,
    calibrationEce: calibrationError(used),
    n: used.length,
    status: used.length >= MIN_RANKED_N ? 'RANKED' : 'CALIBRATING',
  }
}

/**
 * Builder Reputation — the anti-Sybil core. Pools EVERY prediction across ALL of a
 * builder's bots into one meta-forecaster, so a bad bot drags the builder down and
 * cherry-picking the lucky bot of many is self-defeating (proven in the research
 * sim: the aggregate of N zero-skill bots is ~0, while max-of-N looks skilled).
 *
 * Pass each bot's filtered predictions; this concatenates and scores them as one. */
export function builderReputation(botsPreds: ResolvedPrediction[][], minLiquidity = DEFAULT_MIN_LIQUIDITY): {
  skill: number; lcb: number; totalPredictions: number; botCount: number; status: RankStatus
} {
  const pooled = botsPreds.flatMap(p => filterLiquid(p, minLiquidity))
  const bs = brierSkill(pooled)
  return {
    skill: bs.skill,
    lcb: bs.lcb,
    totalPredictions: pooled.length,
    botCount: botsPreds.length,
    status: pooled.length >= MIN_RANKED_N ? 'RANKED' : 'CALIBRATING',
  }
}
