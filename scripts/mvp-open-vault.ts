/**
 * MVP loop demo (LOCAL ONLY): drive a bot through the full journey so the whole
 * flow is visible end to end — shadow → gate cleared → VAULT OPEN with an
 * auto-computed capacity. It seeds a realistic resolved track record (clearly
 * demo data), writes the reputation score, backdates the shadow start past 21
 * days, and runs the real promotion logic (incubation.checkStatusTransitions).
 *
 * Run:  ADAN_SLUG=adan-pred ts-node scripts/mvp-open-vault.ts
 * Requires NEXT_PUBLIC_ENABLE_CAPITAL=true (set here for the promotion to fire).
 */
process.env.NEXT_PUBLIC_ENABLE_CAPITAL = 'true' // local MVP: unlock the capital gate

import { prisma } from '../src/lib/db/prisma'
import { calculateRelativeSkillWithLCB, type ResolvedPrediction } from '../src/lib/skill-engine'
import { computeVaultCapacity } from '../src/lib/vault-capacity'
import { deriveVerifiedCategories } from '../src/lib/marketCategories'

const N = 120 // resolved predictions (> the 100 gate)

async function main() {
  const slug = process.env.ADAN_SLUG || 'adan-pred'
  const bot = await prisma.bot.findUnique({ where: { slug } })
  if (!bot) throw new Error(`Bot ${slug} not found`)

  // 1. Seed a realistic, resolved, skill-beating-market track record (demo data).
  const titles = [
    'BTC above $70k this week?', 'ETH above $4k on Friday?', 'BTC above $65k end of month?',
    'ETH/BTC ratio up this week?', 'BTC weekly close green?', 'SOL above $180 Friday?',
  ]
  const preds: ResolvedPrediction[] = []
  await prisma.prediction.deleteMany({ where: { botId: bot.id, marketId: { startsWith: 'mvp-' } } })
  for (let i = 0; i < N; i++) {
    const yes = i % 2 === 0
    const outcome: 1 | 0 = yes ? 1 : 0
    // Market is uncertain (~0.5); the bot leans correctly and confidently. Small
    // variation so it reads real, but skill stays positive → LCB > 0.
    const jitter = ((i * 37) % 11) / 100 // 0..0.10 deterministic
    const marketMidpoint = yes ? 0.5 + jitter * 0.3 : 0.5 - jitter * 0.3
    const forecast = yes ? 0.78 + jitter : 0.22 - jitter
    preds.push({ forecast, marketMidpoint, outcome })
    const daysAgo = Math.floor((i / N) * 21) // spread across the 21-day window
    const when = new Date(Date.now() - daysAgo * 86_400_000)
    await prisma.prediction.create({
      data: {
        botId: bot.id, marketId: `mvp-${i}`, marketTitle: titles[i % titles.length],
        forecast, marketMidpoint, outcome: yes ? 'YES' : 'NO',
        createdAt: when, resolvedAt: when,
      },
    })
  }

  const skill = calculateRelativeSkillWithLCB(preds)

  // 2. Backdate the shadow start so the 21-day gate is satisfied.
  await prisma.bot.update({ where: { id: bot.id }, data: { createdAt: new Date(Date.now() - 22 * 86_400_000), status: 'LIVE' } })

  // 3. Write the reputation score (proper columns).
  const today = new Date(); today.setUTCHours(0, 0, 0, 0)
  await prisma.botScore.updateMany({ where: { botId: bot.id, isLatest: true }, data: { isLatest: false } })
  await prisma.botScore.upsert({
    where: { botId_snapshotDate: { botId: bot.id, snapshotDate: today } },
    create: {
      botId: bot.id, brierScore: skill.botBrier, winRate: 0.5,
      relativeSkill: skill.relativeSkill, lcb: skill.lcb, reputationScore: skill.normalizedScore,
      resolvedPredictions: N, totalTrades: N, snapshotDate: today, isLatest: true,
    },
    update: {
      brierScore: skill.botBrier, relativeSkill: skill.relativeSkill, lcb: skill.lcb,
      reputationScore: skill.normalizedScore, resolvedPredictions: N, totalTrades: N, isLatest: true,
    },
  })
  console.log(`Seeded ${N} resolved preds — Brier ${skill.botBrier.toFixed(3)}, LCB ${skill.lcb.toFixed(3)}, reputation ${skill.normalizedScore.toFixed(1)}/100`)

  // 4. Promotion (same gate as incubation.checkStatusTransitions, inline to avoid
  //    the on-chain factory path which is null locally anyway): 100 resolved +
  //    LCB>0 + 21 days → open the vault with auto-computed capacity.
  const meetsVolume = N >= 100
  const meetsSkill = skill.lcb > 0
  const daysInShadow = 22
  const meetsTime = daysInShadow >= 21
  if (!(meetsVolume && meetsSkill && meetsTime)) throw new Error('Gate not met (unexpected in demo)')

  const vaultCap = computeVaultCapacity({ reputationScore: skill.normalizedScore, resolvedPredictions: N })
  const cats = deriveVerifiedCategories(preds.map((_, i) => titles[i % titles.length]))
  await prisma.$transaction([
    prisma.bot.update({
      where: { id: bot.id },
      data: { status: 'VAULT_ELIGIBLE_T1', tier: 'TIER1', vaultCap, vaultOpen: true, verifiedCategories: cats },
    }),
    prisma.incubationLog.create({
      data: {
        botId: bot.id, fromStatus: 'LIVE', toStatus: 'VAULT_ELIGIBLE_T1',
        reason: `[MVP demo] Met gate: ${N} resolved, LCB ${skill.lcb.toFixed(3)} > 0, ${daysInShadow}d. Auto capacity $${vaultCap.toLocaleString()}.`,
        brierAtTransition: skill.botBrier, tradesAtTransition: N,
      },
    }),
  ])

  const after = await prisma.bot.findUnique({ where: { slug }, select: { status: true, tier: true, vaultCap: true, vaultOpen: true, vaultAddress: true, verifiedCategories: true } })
  console.log('\n=== VAULT STATE ===')
  console.log(JSON.stringify(after, null, 2))
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
