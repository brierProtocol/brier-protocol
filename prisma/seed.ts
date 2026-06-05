const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando Brier Protocol Data Seeding (Fase 2)...')

  // Limpieza Idempotente (Borramos data existente para evitar conflictos)
  console.log('🧹 Limpiando base de datos (VaultDeposit, BotScore, TradeEvent, Bot)...')
  await prisma.vaultDeposit.deleteMany()
  await prisma.botScore.deleteMany()
  await prisma.tradeEvent.deleteMany()
  await prisma.bot.deleteMany()

  // 1. Crear Bot PAPER (Stats en null, sin TVL)
  const botPaper = await prisma.bot.create({
    data: {
      id: 'paper-quant-v1',
      slug: 'alpha-quant-v1',
      name: 'Alpha Quant V1',
      tagline: 'Model Testing Phase',
      description: 'Backtesting new momentum strategies on mid-cap tokens.',
      walletAddress: '0x0000000000000000000000000000000000001234',
      status: 'PAPER',
      marketType: 'SPOT',
      currentTVL: 0,
      vaultAddress: null
    }
  })
  console.log(`✅ Creado Bot PAPER: ${botPaper.name}`)

  // 2. Crear Bot LIVE (Tier T2, SPOT)
  const botLive = await prisma.bot.create({
    data: {
      id: 'beta-sports-arb',
      slug: 'beta-sports-arb',
      name: 'Beta Sports Arb',
      tagline: 'Live Sports Arbitrage',
      description: 'Arbitrage between Polymarket sports lines and offshore books.',
      walletAddress: '0x1111111111111111111111111111111111115678',
      status: 'LIVE',
      marketType: 'SPORTS',
      currentTVL: 14500.50,
      vaultAddress: '0x1234567890123456789012345678901234567890',
      scores: {
        create: {
          brierScore: 0.185,
          winRate: 0.61,
          sharpe: 1.8,
          maxDrawdown: 0.08,
          isLatest: true
        }
      }
    }
  })
  console.log(`✅ Creado Bot LIVE (SPOT): ${botLive.name}`)

  // 3. Crear Bot ADAN-PRED (Tier T1, PERP, 125k TVL Benchmark)
  const botAdan = await prisma.bot.create({
    data: {
      id: 'adan-pred',
      slug: 'adan-pred',
      name: 'ADAN-PRED',
      tagline: 'Perp-based Predictive Engine',
      description: 'HFT predictive market engine leveraging Tier-1 infrastructure. Aggressive latency and Fill-And-Kill execution.',
      walletAddress: '0xADAN00000000000000000000000000000000PRED',
      status: 'VAULT_ELIGIBLE_T1',
      marketType: 'POLITICS', // Can be CRYPTO or POLITICS, politics fee = 0.04%
      currentTVL: 125000.00,
      vaultAddress: '0x75537828f2ce51be7289709686A69CbFDbB714F1',
      scores: {
        create: {
          brierScore: 0.082, // Extremely low/good score
          winRate: 0.74,
          sharpe: 3.1,
          maxDrawdown: 0.04,
          isLatest: true
        }
      }
    }
  })
  console.log(`✅ Creado Bot ADAN-PRED (PERP): ${botAdan.name}`)

  // Generar 10 VaultDeposits para ADAN-PRED
  console.log('💰 Generando 10 VaultDeposits para ADAN-PRED...')
  for (let i = 0; i < 10; i++) {
    await prisma.vaultDeposit.create({
      data: {
        botId: botAdan.id,
        depositorWallet: `0xWhale${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        amountUsdc: Math.floor(Math.random() * 20000) + 1000, // Deposits between 1k and 21k
        mode: i % 2 === 0 ? 'CONSERVATIVE' : 'DEGEN'
      }
    })
  }
  console.log('✅ 10 VaultDeposits creados exitosamente.')

  console.log('🚀 SEEDING COMPLETADO CON ÉXITO.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

export {}
