/**
 * seed-adan.ts — ADAN-PRED v8.5 seeder
 *
 * Upserts ADAN-PRED into the Brier Protocol DB.
 * NEVER deletes other bots — safe to run against a live dev DB.
 *
 * Run: npm run db:seed:adan
 *
 * ⚠️  Before going live on Brier Protocol, replace ADAN_WALLET
 *     with the real Polymarket trading wallet address.
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ─── UPDATE THIS before connecting to the real indexer ───────────────────────
const ADAN_WALLET = '0xad49000000000000000000000000000000000001'
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🤖 ADAN-PRED v8.5 — seeding into Brier Protocol...')
  console.log('   (upsert mode — other bots are untouched)\n')

  // ── 1. Bot record ────────────────────────────────────────────────────────
  const DESCRIPTION =
    'Fully autonomous self-evolving Quant ML agent for binary prediction markets. ' +
    'Architecture: Node.js Data Collector × Python XGBoost + Logistic Regression × SQLite Feature Log. ' +
    '4-voter ensemble: STAT 50% · LLM 30% · HIST 15% · ONLINE 5%. ' +
    'López de Prado AFML Suite: Triple Barrier (#20A) · CUSUM (#20D) · VPIN (#20F) · ' +
    'Meta-Labeling (#20E) · Purged Walk-Forward CV (#20C). ' +
    'MoE Dynasty: 12 crypto children + 4 LLM category children. ' +
    '24 integrated scientific concepts. Shadow phase — Polymarket.'

  const TAGLINE = '4-Layer ML Brain · 24 Scientific Concepts · Polymarket'

  const adan = await prisma.bot.upsert({
    where: { slug: 'adan-pred' },
    create: {
      slug: 'adan-pred',
      name: 'ADAN-PRED',
      tagline: TAGLINE,
      description: DESCRIPTION,
      color: '#FF2A4D',
      eyeShape: 'scanner',
      avatarId: 'adan-pred',
      status: 'PAPER',
      tier: 'NONE',
      categories: ['crypto', 'politics', 'sports', 'economy', 'tech'],
      strategyType: 'ML',
      walletAddress: ADAN_WALLET,
      currentTVL: 0,
      skinInGame: 0,
    },
    update: {
      tagline: TAGLINE,
      description: DESCRIPTION,
      color: '#FF2A4D',
      eyeShape: 'scanner',
      status: 'PAPER',
      tier: 'NONE',
      categories: ['crypto', 'politics', 'sports', 'economy', 'tech'],
      strategyType: 'ML',
    },
  })
  console.log(`✅ Bot upserted: ${adan.name}  (id: ${adan.id})`)

  // ── 2. Builder profile ───────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { walletAddress: ADAN_WALLET },
    create: { walletAddress: ADAN_WALLET, handle: 'lord', name: 'Lord' },
    update: {},
  })
  console.log('✅ Builder profile upserted  (handle: lord)')

  // ── 3. BotScore — Phase 1 paper trading snapshot ─────────────────────────
  // Clear previous snapshots for a clean start
  await prisma.botScore.deleteMany({ where: { botId: adan.id } })

  await prisma.botScore.create({
    data: {
      botId: adan.id,
      brierScore: 0.21,   // above 0.20 vault gate — still calibrating
      winRate: 0.52,
      sharpe: 1.20,
      totalTrades: 12,    // first 12 resolved Polymarket markets
      totalVolume: 850,   // USDC paper-wagered
      maxDrawdown: -0.04,
      isLatest: true,
      snapshotDate: new Date(),
    },
  })
  console.log('✅ BotScore: Brier 0.21 · WR 52% · Sharpe 1.20 · Trades 12')

  // ── 4. PnL equity curve — 14 days of Phase 1 paper trading ───────────────
  await prisma.pnlSnapshot.deleteMany({ where: { botId: adan.id } })

  // Realistic calibration curve: early noise → ensemble converges → upward trend
  const curve = [
    { daysAgo: 14, pnl: -12.50, cum: -12.50, trades: 1 },
    { daysAgo: 13, pnl:   8.20, cum:  -4.30, trades: 1 },
    { daysAgo: 12, pnl:  -5.10, cum:  -9.40, trades: 1 },
    { daysAgo: 11, pnl:  15.30, cum:   5.90, trades: 2 },
    { daysAgo: 10, pnl:  -3.80, cum:   2.10, trades: 1 },
    { daysAgo:  9, pnl:  22.10, cum:  24.20, trades: 2 },
    { daysAgo:  8, pnl:  -8.40, cum:  15.80, trades: 1 },
    { daysAgo:  7, pnl:  11.60, cum:  27.40, trades: 1 },
    { daysAgo:  6, pnl:  18.90, cum:  46.30, trades: 2 },
    { daysAgo:  5, pnl:  -6.20, cum:  40.10, trades: 1 },
    { daysAgo:  4, pnl:  14.50, cum:  54.60, trades: 1 },
    { daysAgo:  3, pnl:  -2.30, cum:  52.30, trades: 0 },
    { daysAgo:  2, pnl:  19.80, cum:  72.10, trades: 1 },
    { daysAgo:  1, pnl:   7.40, cum:  79.50, trades: 1 },
  ]

  for (const day of curve) {
    const date = new Date()
    date.setDate(date.getDate() - day.daysAgo)
    date.setHours(0, 0, 0, 0)
    await prisma.pnlSnapshot.create({
      data: {
        botId: adan.id,
        date,
        pnlUsd: day.pnl,
        cumulativePnl: day.cum,
        tradesCount: day.trades,
      },
    })
  }
  console.log('✅ 14-day PnL equity curve seeded  (cumulative: +$79.50 paper USDC)')

  // ── 5. PolyConnection placeholder ────────────────────────────────────────
  // Tracks wallet on Polymarket. Upsert so re-runs are idempotent.
  await prisma.polyConnection.upsert({
    where: { botId: adan.id },
    create: { botId: adan.id, walletAddress: ADAN_WALLET },
    update: { walletAddress: ADAN_WALLET },
  })
  console.log('✅ PolyConnection registered  (wallet indexed)')



  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🤖 ADAN-PRED v8.5 is live in PAPER (shadow) phase.')
  console.log('   Profile → http://localhost:3000/bot/adan-pred')
  console.log('   Gate    → 100 resolved trades · Brier ≤ 0.20 · 21 days running')
  console.log('   Split   → 30% builder / 60% depositors / 10% protocol')
  console.log('')
  console.log(`   ⚠️  Wallet placeholder: ${ADAN_WALLET}`)
  console.log('   Update ADAN_WALLET in this file before connecting the real indexer.')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

export {}
