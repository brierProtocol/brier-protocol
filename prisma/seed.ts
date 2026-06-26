const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando Brier Protocol Data Seeding (Fase 2)...')

  // Limpieza Idempotente (Borramos data existente para evitar conflictos)
  console.log('🧹 Limpiando base de datos (VaultPosition, VaultDeposit, BotScore, TradeEvent, Bot)...')
  await prisma.vaultPosition.deleteMany()
  await prisma.vaultDeposit.deleteMany()
  await prisma.botScore.deleteMany()
  await prisma.tradeEvent.deleteMany()
  await prisma.bot.deleteMany()

  // Makers (first-class Users) — deben existir ANTES que sus bots (FK ownerWallet).
  const makerWallets = {
    paper: '0x0000000000000000000000000000000000001234',
    live: '0x1111111111111111111111111111111111115678',
    adan: '0xADAN00000000000000000000000000000000PRED',
  }
  for (const [key, wallet] of Object.entries(makerWallets)) {
    await prisma.user.upsert({
      where: { walletAddress: wallet },
      update: {},
      create: { walletAddress: wallet, handle: `maker_${key}`, name: `Maker (${key})` },
    })
  }

  // 1. Crear Bot PAPER (Stats en null, sin TVL)
  const botPaper = await prisma.bot.create({
    data: {
      id: 'paper-quant-v1',
      slug: 'alpha-quant-v1',
      name: 'Alpha Quant V1',
      tagline: 'Model Testing Phase',
      description: 'Backtesting new momentum strategies on mid-cap tokens.',
      walletAddress: '0x0000000000000000000000000000000000001234',
      ownerWallet: makerWallets.paper,
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
      ownerWallet: makerWallets.live,
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
      ownerWallet: makerWallets.adan,
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

  // Generar 10 inversores (User) con su depósito + posición en ADAN-PRED.
  // Wallets/montos DETERMINISTAS para que re-seedear sea idempotente.
  // Shares 1:1 con el monto (NAV génesis = 1). El currentTVL benchmark (125k) es
  // mayor que el total aportado (100k) => navPerShare ≈ 1.25, o sea cada whale
  // arrastra ~25% de ganancia no realizada: data realista para el dashboard.
  console.log('💰 Generando 10 inversores (User + VaultDeposit + VaultPosition) para ADAN-PRED...')
  let adanTotalShares = 0
  for (let i = 0; i < 10; i++) {
    const wallet = `0xWHALE${String(i).padStart(35, '0')}` // 42 chars, tipo address
    const amountUsdc = 1000 + i * 2000                     // 1k..19k, suma = 100k
    const mode = i % 2 === 0 ? 'CONSERVATIVE' : 'DEGEN'
    const shares = amountUsdc                              // NAV génesis = 1 => 1:1
    adanTotalShares += shares

    // Identidad del inversor (cero-fricción: wallet = user).
    await prisma.user.upsert({
      where: { walletAddress: wallet },
      update: {},
      create: { walletAddress: wallet, handle: `whale_${i}`, name: `Whale #${i}` },
    })

    await prisma.vaultDeposit.create({
      data: { botId: botAdan.id, depositorWallet: wallet, amountUsdc, shares, kind: 'DEPOSIT', mode },
    })

    await prisma.vaultPosition.create({
      data: { userWallet: wallet, botId: botAdan.id, shares, costBasisUsdc: amountUsdc, mode },
    })
  }

  // Reflejar las shares minteadas en el bot (para que navPerShare sea consistente).
  await prisma.bot.update({
    where: { id: botAdan.id },
    data: { totalShares: adanTotalShares },
  })
  console.log(`✅ 10 inversores creados (totalShares=${adanTotalShares}).`)

  // Heartbeats (L5): los bots LIVE están "operando"; el PAPER nunca reportó (null).
  await prisma.bot.updateMany({
    where: { id: { in: [botLive.id, botAdan.id] } },
    data: { lastHeartbeatAt: new Date() },
  })

  // Distribuciones demo (L4) — split 60/30/10 para ADAN, así el dashboard del
  // builder y el reporting de protocolo tienen datos reales que leer.
  const profits = [1800, 3200, 950, 4100]
  for (const gross of profits) {
    await prisma.distribution.create({
      data: {
        botId: botAdan.id,
        grossProfitUsdc: gross,
        depositorCut: gross * 0.6,
        builderCut: gross * 0.3,
        protocolCut: gross * 0.1,
      },
    })
  }
  const builderTotal = profits.reduce((a, g) => a + g * 0.3, 0)
  console.log(`✅ ${profits.length} distribuciones creadas (builder earnings ADAN=$${builderTotal}).`)

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
