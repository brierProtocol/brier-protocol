export type Mood = 'happy' | 'neutral' | 'nervous' | 'sad' | 'cool' | 'sleeping' | 'surprised'

export function computeMood(
  recentPnl: number[],    // Last 7 daily PnL values, chronological
  winRate: number,
  brierScore: number,
  currentDrawdown: number  // 0–1
): Mood {
  const last3 = recentPnl.slice(-3)
  const onStreak = last3.length === 3 && last3.every(v => v > 0)
  const onLosing = last3.length === 3 && last3.every(v => v < 0)
  const flatline = last3.every(v => Math.abs(v) < 0.5)

  if (currentDrawdown >= 0.20) return 'sad'
  if (currentDrawdown >= 0.10) return 'nervous'
  if (flatline && recentPnl.length >= 3) return 'sleeping'
  if (onStreak && winRate > 0.60 && brierScore < 0.15) return 'cool'
  if (onStreak) return 'happy'
  if (onLosing) return 'nervous'
  if (brierScore < 0.10 && winRate > 0.60) return 'surprised'
  return 'neutral'
}
