// src/lib/mood-engine.ts

export type Mood = 'sleeping' | 'cool' | 'anxious' | 'excited' | 'neutral';

export interface BotLiveState {
  recentDrawdown: number;      // e.g., 0.16 (16% drawdown)
  winRate: number;             // e.g., 0.60 (60% win rate)
  recentPositives: number;     // e.g., 10 (Last 10 trades were positive)
}

export interface MoodState {
  mood: Mood;
  label: string;
  retailExplanation: string;
  terminalLog: string;
}

export function computeQuantitativeMood(state: BotLiveState): MoodState {
  // 1. SLEEPING: drawdown > 15%
  if (state.recentDrawdown > 0.15) {
    return { 
      mood: 'sleeping', 
      label: 'SLEEPING',
      retailExplanation: 'Drawdown threshold exceeded. Operations halted to protect capital.',
      terminalLog: `SYS_WARN: Drawdown at ${(state.recentDrawdown * 100).toFixed(1)}% > 15%. Halting trading. Sleeping.`
    };
  }

  // 2. DEFENSIVE: drawdown between 8% and 15%
  if (state.recentDrawdown >= 0.08 && state.recentDrawdown <= 0.15) {
    return { 
      mood: 'anxious', 
      label: 'DEFENSIVE',
      retailExplanation: 'Elevated drawdown detected. Entering capital protection and risk-off regime.',
      terminalLog: `SYS_WARN: Drawdown at ${(state.recentDrawdown * 100).toFixed(1)}%. Entering Defensive regime.`
    };
  }
  
  // 3. AGGRESSIVE: winRate > 65% and last 10 trades positive
  if (state.winRate > 0.65 && state.recentPositives >= 10) {
    return { 
      mood: 'excited', 
      label: 'AGGRESSIVE',
      retailExplanation: 'High conviction streak detected. Authorizing maximum position sizing.',
      terminalLog: `SYS_ALPHA: Win rate > 65% with 10+ streak. Activating Aggressive execution.`
    };
  }

  // 4. FOCUSED: drawdown < 8% and winRate > 55%
  if (state.recentDrawdown < 0.08 && state.winRate > 0.55) {
    return { 
      mood: 'cool', 
      label: 'FOCUSED',
      retailExplanation: 'Nominal market conditions. Executing standard probability arbitrage.',
      terminalLog: `SYS_NOMINAL: Win rate > 55% and Drawdown < 8%. Status: Focused.`
    };
  }

  // Fallback
  return { 
    mood: 'neutral', 
    label: 'STANDBY',
    retailExplanation: 'Waiting for distinct market signals.',
    terminalLog: `SYS_IDLE: Awaiting statistically significant opportunities.`
  };
}
