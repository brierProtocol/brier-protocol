// Unit tests for the Brier skill engine — the frozen reputation core.
// Run: npm run test:skill
//
// These encode the research conclusions (scripts/research) as protocol invariants:
// copying the market scores ~0, easy-market farming scores ~0, only real edge
// scores positive, noise scores negative, builder aggregation defeats cherry-picking,
// and the LCB suppresses small-sample luck.
import {
  brierSkill, logSkill, calibrationError, botReputation, builderReputation,
  type ResolvedPrediction,
} from '../src/lib/skill-engine'

let failed = 0
function assert(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ✓ ${name}`)
  else { console.error(`  ✗ ${name} ${detail ?? ''}`); failed++ }
}

// Deterministic RNG (mulberry32) so the statistical tests are reproducible.
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const clip = (p: number) => Math.max(0.01, Math.min(0.99, p))
function gauss(r: () => number, sd: number) {
  // Box-Muller
  const u = Math.max(1e-9, r()), v = r()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sd
}

// Build a universe of markets: true prob, market price (good but noisy), outcome.
function universe(r: () => number, n: number) {
  const mk: { theta: number; pMarket: number; outcome: 0 | 1 }[] = []
  for (let i = 0; i < n; i++) {
    const theta = r() < 0.5 ? 0.4 + r() * 0.2 : (r() < 0.5 ? 0.02 + r() * 0.1 : 0.88 + r() * 0.1)
    const pMarket = clip(theta + gauss(r, 0.06))
    const outcome: 0 | 1 = r() < theta ? 1 : 0
    mk.push({ theta, pMarket, outcome })
  }
  return mk
}

console.log('Brier skill engine — tests')

// ── 1. Basic correctness ──────────────────────────────────────────────
// A bot that beats the market on every point has positive skill.
const beats: ResolvedPrediction[] = [
  { pBot: 0.9, pMarket: 0.6, outcome: 1 },  // bot more confident & right
  { pBot: 0.1, pMarket: 0.4, outcome: 0 },
]
assert('beating the market → skill > 0', brierSkill(beats).skill > 0, `got ${brierSkill(beats).skill}`)

// Copying the market → exactly zero skill.
const copy: ResolvedPrediction[] = Array.from({ length: 50 }, (_, i) => ({
  pBot: 0.3 + (i % 5) * 0.1, pMarket: 0.3 + (i % 5) * 0.1, outcome: (i % 2) as 0 | 1,
}))
assert('copying the market → skill == 0', Math.abs(brierSkill(copy).skill) < 1e-9, `got ${brierSkill(copy).skill}`)

// ── 2. The exploits the design must defeat (from the research) ─────────
const r = rng(42)
const mk = universe(r, 4000)

const skilled = mk.map(m => ({ pBot: clip(m.theta + gauss(r, 0.03)), pMarket: m.pMarket, outcome: m.outcome }))
const copier  = mk.map(m => ({ pBot: m.pMarket, pMarket: m.pMarket, outcome: m.outcome }))
const noise   = mk.map(m => ({ pBot: clip(0.5 + gauss(r, 0.3)), pMarket: m.pMarket, outcome: m.outcome }))
// Easy-market farmer: only predicts extreme markets, copies the market there.
const easyIdx = mk.map((m, i) => ({ m, i })).filter(({ m }) => Math.abs(m.theta - 0.5) > 0.4)
const easy = easyIdx.map(({ m }) => ({ pBot: m.pMarket, pMarket: m.pMarket, outcome: m.outcome }))

const sSkill = brierSkill(skilled).skill
const cSkill = brierSkill(copier).skill
const nSkill = brierSkill(noise).skill
const eSkill = brierSkill(easy).skill

assert('SKILLED → positive skill', sSkill > 0.001, `got ${sSkill.toFixed(5)}`)
assert('COPY-MARKET → ~0 skill', Math.abs(cSkill) < 1e-9, `got ${cSkill}`)
assert('NOISE → negative skill', nSkill < -0.01, `got ${nSkill.toFixed(5)}`)
assert('EASY-FARMER → ~0 skill (not high)', Math.abs(eSkill) < 1e-9, `got ${eSkill}`)
assert('SKILLED ranks above EASY-FARMER (raw Brier would invert this)', sSkill > eSkill)

// ── 3. Builder reputation defeats cherry-picking ──────────────────────
// 50 zero-skill bots (each a random fixed tilt off the market). Cherry-picking the
// best looks skilled; the builder aggregate must be ~0 or negative.
const r2 = rng(7)
const mk2 = universe(r2, 1500)
const bots: ResolvedPrediction[][] = []
let bestBotSkill = -Infinity
const N_BOTS = 200
for (let b = 0; b < N_BOTS; b++) {
  const tilt = gauss(r2, 0.05)
  const preds = mk2.slice(0, 80).map(m => ({ pBot: clip(m.pMarket + tilt), pMarket: m.pMarket, outcome: m.outcome }))
  bots.push(preds)
  bestBotSkill = Math.max(bestBotSkill, brierSkill(preds).skill)
}
const builder = builderReputation(bots)
// The real invariant: cherry-picking the luckiest bot looks skilled, but the honest
// builder aggregate (all bots pooled) does not — so farming is self-defeating.
assert('cherry-pick: best zero-skill bot LOOKS skilled (positive)', bestBotSkill > 0, `best ${bestBotSkill.toFixed(5)}`)
assert('builder aggregate is NOT skilled (~0 or negative)', builder.skill < 0.001, `builder ${builder.skill.toFixed(5)}`)
assert('cherry-pick beats the honest builder aggregate', bestBotSkill > builder.skill, `best ${bestBotSkill.toFixed(5)} vs agg ${builder.skill.toFixed(5)}`)
assert('builder pools all predictions', builder.totalPredictions === N_BOTS * 80)

// ── 4. LCB is conservative + min-N gating ─────────────────────────────
assert('LCB <= point estimate', brierSkill(skilled).lcb <= brierSkill(skilled).skill)
assert('few predictions → CALIBRATING', botReputation(beats).status === 'CALIBRATING')
assert('many predictions → RANKED', botReputation(skilled).status === 'RANKED')

// ── 5. Calibration ────────────────────────────────────────────────────
// Perfectly calibrated: at p=0.7, exactly 70% win.
const calPreds: ResolvedPrediction[] = []
for (let i = 0; i < 100; i++) calPreds.push({ pBot: 0.7, pMarket: 0.5, outcome: (i < 70 ? 1 : 0) as 0 | 1 })
assert('well-calibrated → low ECE', calibrationError(calPreds) < 0.02, `ece ${calibrationError(calPreds).toFixed(3)}`)
// Overconfident: says 0.99 but only wins half.
const over: ResolvedPrediction[] = []
for (let i = 0; i < 100; i++) over.push({ pBot: 0.99, pMarket: 0.5, outcome: (i < 50 ? 1 : 0) as 0 | 1 })
assert('overconfident → high ECE', calibrationError(over) > 0.4, `ece ${calibrationError(over).toFixed(3)}`)

// ── 6. Log skill agrees in direction ──────────────────────────────────
assert('log skill: SKILLED positive', logSkill(skilled).skill > 0, `got ${logSkill(skilled).skill.toFixed(4)}`)
assert('log skill: NOISE negative', logSkill(noise).skill < 0, `got ${logSkill(noise).skill.toFixed(4)}`)

console.log(failed === 0 ? '\nAll skill-engine tests passed.' : `\n${failed} test(s) failed.`)
process.exit(failed === 0 ? 0 : 1)
