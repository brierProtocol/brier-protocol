import { PrismaClient } from '@prisma/client'
import { recalculateBotScore } from './src/lib/score-engine'

const prisma = new PrismaClient()

async function main() {
  console.log("==========================================")
  console.log("=   BRIER SCORE LOGIC VERIFICATION       =")
  console.log("==========================================")

  // 1. Create a fresh Bot
  const bot = await prisma.bot.create({
    data: {
      name: "Score Test Bot",
      slug: "score-test-bot-" + Date.now(),
      status: "PAPER",
      color: "#ffffff",
            walletAddress: "0x" + Date.now()
    }
  });
  console.log(`> Bot created. Initial Status: ${bot.status}`);

  // 2. Add 49 Resolved Trades
  console.log(`\n> Simulating 49 resolved trades...`);
  for (let i = 0; i < 49; i++) {
    await prisma.tradeEvent.create({
      data: {
        botId: bot.id,
        marketId: `market-${i}`,
        marketTitle: `Market ${i}`,
        side: "YES",
        outcome: "WIN", // perfect prediction
        amount: 10,
        timestamp: new Date(),
        entryPrice: 0.5,
        executionWallet: "0x123"
      }
    });
  }

  // Add some PENDING trades to prove they are ignored
  for (let i = 0; i < 10; i++) {
    await prisma.tradeEvent.create({
      data: {
        botId: bot.id,
        marketId: `market-pending-${i}`,
        marketTitle: `Pending Market ${i}`,
        side: "NO",
        outcome: "PENDING", 
        amount: 5,
        timestamp: new Date(),
        entryPrice: 0.5,
        executionWallet: "0x123"
      }
    });
  }

  // 3. Recalculate Score
  console.log(`> Recalculating Brier Score...`);
  await recalculateBotScore(bot.id, prisma);
  
  let updatedBot = await prisma.bot.findUnique({ where: { id: bot.id } });
  console.log(`> [ASSERTION 1] Bot Status after 49 trades: ${updatedBot?.status}`);
  if (updatedBot?.status === "PAPER") {
    console.log(`  ✅ Vault correctly remained locked (PAPER phase).`);
  } else {
    console.log(`  ❌ FAIL: Vault unlocked prematurely.`);
  }

  // 4. Add 1 more resolved trade (total 50)
  console.log(`\n> Adding 1 more resolved trade (Total: 50)...`);
  await prisma.tradeEvent.create({
    data: {
      botId: bot.id,
      marketId: `market-50`,
      marketTitle: `Market 50`,
      side: "YES",
      outcome: "WIN",
      amount: 10,
      timestamp: new Date(),
      entryPrice: 0.5,
      executionWallet: "0x123"
    }
  });

  // 5. Recalculate Score again
  console.log(`> Recalculating Brier Score...`);
  const finalScore = await recalculateBotScore(bot.id, prisma);
  
  updatedBot = await prisma.bot.findUnique({ where: { id: bot.id } });
  console.log(`> [ASSERTION 2] Bot Status after 50 trades: ${updatedBot?.status}`);
  console.log(`> Final Brier Score: ${finalScore}`);
  
  if (updatedBot?.status === "VAULT_ELIGIBLE_T1") {
    console.log(`  ✅ Vault correctly unlocked!`);
  } else {
    console.log(`  ❌ FAIL: Vault failed to unlock.`);
  }
  console.log("==========================================")
}

main().catch(console.error).finally(() => prisma.$disconnect());
