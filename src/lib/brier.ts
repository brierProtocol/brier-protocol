export function computeBrierContribution(
  direction: 'YES' | 'NO',
  entryOddsDecimal: number,
  resolvedYes: boolean
): number {
  const forecast = direction === 'YES' ? entryOddsDecimal : 1 - entryOddsDecimal
  const outcome = resolvedYes ? 1 : 0
  return Math.pow(forecast - outcome, 2)
}

export function computeMeanBrierScore(contributions: number[]): number {
  if (contributions.length === 0) return 0
  return contributions.reduce((a, b) => a + b, 0) / contributions.length
}
