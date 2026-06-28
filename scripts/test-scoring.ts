// Unit test for the Brier scoring engine. Run: npm run test:scoring
import { computeBotMetrics } from '../src/lib/score-engine'

let failed = 0
function assert(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ✓ ${name}`)
  else { console.error(`  ✗ ${name} ${detail ?? ''}`); failed++ }
}

console.log('Brier scoring engine — tests')

// 1. Empty input → neutral defaults
const empty = computeBotMetrics([])
assert('empty → brier 0.25', empty.brierScore === 0.25)
assert('empty → 0 trades', empty.totalTrades === 0)

// 2. A perfect forecaster (always confident & correct) → brier near 0, winRate 1
const perfect = computeBotMetrics([
  { entryPrice: 0.99, outcome: 'WIN', amount: 100 },
  { entryPrice: 0.99, outcome: 'WIN', amount: 100 },
])
assert('perfect → brier < 0.01', perfect.brierScore < 0.01, `got ${perfect.brierScore}`)
assert('perfect → winRate 1', perfect.winRate === 1)

// 3. A coin-flipper at 0.5 → brier 0.25
const coin = computeBotMetrics([
  { entryPrice: 0.5, outcome: 'WIN', amount: 100 },
  { entryPrice: 0.5, outcome: 'LOSS', amount: 100 },
])
assert('coinflip → brier ≈ 0.25', Math.abs(coin.brierScore - 0.25) < 1e-9, `got ${coin.brierScore}`)
assert('coinflip → winRate 0.5', coin.winRate === 0.5)

// 4. Mixed realistic set (the 6-trade adan sample)
const mixed = computeBotMetrics([
  { entryPrice: 0.62, outcome: 'WIN', amount: 100 },
  { entryPrice: 0.71, outcome: 'WIN', amount: 100 },
  { entryPrice: 0.55, outcome: 'WIN', amount: 100 },
  { entryPrice: 0.68, outcome: 'WIN', amount: 100 },
  { entryPrice: 0.45, outcome: 'LOSS', amount: 100 },
  { entryPrice: 0.40, outcome: 'LOSS', amount: 100 },
])
assert('mixed → 6 trades', mixed.totalTrades === 6)
assert('mixed → winRate 4/6', Math.abs(mixed.winRate - 4 / 6) < 1e-9)
assert('mixed → brier in (0,0.25)', mixed.brierScore > 0 && mixed.brierScore < 0.25, `got ${mixed.brierScore}`)
assert('mixed → volume 600', mixed.totalVolume === 600)
assert('mixed → maxDrawdown <= 0', mixed.maxDrawdown <= 0)

console.log(failed === 0 ? '\nALL PASSED ✅' : `\n${failed} FAILED ❌`)
process.exit(failed === 0 ? 0 : 1)
