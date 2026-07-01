import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function runAudit() {
  console.log("🔥 INITIATING BRIER PROTOCOL CANONICAL DATA AUDIT...")
  const predictions = await prisma.prediction.findMany()

  let valid = 0
  let broken = 0
  const issues = {
    BROKEN_MARKET_TITLE: 0,
    INVALID_CONFIDENCE: 0,
    MISSING_MARKET_PROB: 0,
    EDGE_MISMATCH: 0,
    BROKEN_RESOLUTION: 0
  }

  for (const p of predictions) {
    let isBroken = false

    if (!p.marketTitle || p.marketTitle === "Unknown Market") {
      issues.BROKEN_MARKET_TITLE++
      isBroken = true
    }

    if (p.confidence == null || p.confidence < 0 || p.confidence > 1) {
      issues.INVALID_CONFIDENCE++
      isBroken = true
    }

    if (p.marketProbabilityAtCommit == null) {
      issues.MISSING_MARKET_PROB++
      isBroken = true
    }

    if (p.status === 'WIN' || p.status === 'LOSS') {
      if (!p.resolvedAt) {
        issues.BROKEN_RESOLUTION++
        isBroken = true
      }
    }

    // Since Edge isn't stored in DB directly (computed by truthGuard), we check 
    // it logically based on DB properties for the sake of the report
    const expectedEdge = (p.confidence || 0) - (p.marketProbabilityAtCommit || 0)
    // Edge mismatch is a simulated flag here since DB doesn't store edge, but we flag it if prob is 0 which causes fake edge
    if (p.marketProbabilityAtCommit === 0 && p.confidence > 0) {
       issues.EDGE_MISMATCH++
       isBroken = true
    }

    if (isBroken) broken++
    else valid++
  }

  console.log("\n📊 SYSTEM HEALTH REPORT")
  console.log(`TOTAL TRADES: ${predictions.length}`)
  console.log(`VALID: ${valid}`)
  console.log(`BROKEN: ${broken}`)

  console.log("\nTOP ISSUES:")
  console.log(`- ${issues.BROKEN_MARKET_TITLE} Unknown Market legacy entries`)
  console.log(`- ${issues.BROKEN_RESOLUTION} missing resolvedAt`)
  console.log(`- ${issues.EDGE_MISMATCH} edge mismatches (0 probability captures)`)
  console.log(`- ${issues.INVALID_CONFIDENCE} invalid confidence values`)

  if (broken > 0) {
    console.log("\nSYSTEM STATUS: DEGRADED ⚠️")
  } else {
    console.log("\nSYSTEM STATUS: OPTIMAL 🟢")
  }
}

runAudit()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
