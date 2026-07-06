// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL STOP-LOSS ("LA GUILLOTINA")
// ═══════════════════════════════════════════════════════════════════════════════
// Vercel cron: {"path": "/api/cron/circuit-breaker", "schedule": "0 */6 * * *"}
//
// THREE independent kill triggers (any one = vault closed forever):
//   1. DETERIORATION: Brier worsened by ≥0.08 in 7 days (sudden collapse)
//   2. ABSOLUTE FLOOR: Brier ≥ 0.30 (worse than always guessing 50% = no edge)
//   3. LCB COLLAPSE:  LCB < -0.10 (statistically proven worse than the market)
//
// On trigger:
//   DB  → vaultOpen=false, vaultClosedAt=now, deposits marked CIRCUIT_BREAKER
//   Chain → triggerCircuitBreaker() slashes maker's skin-in-the-game, pauses vault
//
// The vault is TERMINAL once closed: no new deposits, only claims (redeem at NAV).
// This is the core safety guarantee of Brier Protocol.
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { ethers } from 'ethers'
import { recordCronRun, captureError } from '@/lib/observability'
import { closeVault } from '@/lib/vault-lifecycle'

// ── Thresholds ──────────────────────────────────────────────────────────────
const DETERIORATION_THRESHOLD = 0.08  // Brier delta over 7 days
const ABSOLUTE_BRIER_FLOOR    = 0.30  // Worse than random (0.25 = coin flip)
const LCB_COLLAPSE_THRESHOLD  = -0.10 // Statistically worse than market

// ── On-chain ABI (BrierVault.sol) ───────────────────────────────────────────
const GUILLOTINE_ABI = [
  'function triggerCircuitBreaker() external',
  'function paused() view returns (bool)',
  'function skinInGame() view returns (uint256)',
]

type TriggerResult = {
  bot: string
  reason: string
  brierNow: number
  lcbNow: number | null
  vault: string
  chainExecuted: boolean
  skinSlashed: boolean
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const triggered: TriggerResult[] = []
  const errors: string[] = []

  try {
    const bots = await prisma.bot.findMany({
      where: { vaultOpen: true, status: { in: ['VAULT_ELIGIBLE_T1', 'VAULT_ELIGIBLE_T2'] } },
      select: { id: true, slug: true, vaultAddress: true },
    })

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    for (const bot of bots) {
      try {
        const [current, weekAgo] = await Promise.all([
          prisma.botScore.findFirst({
            where: { botId: bot.id, isLatest: true },
            select: { brierScore: true, lcb: true },
          }),
          prisma.botScore.findFirst({
            where: { botId: bot.id, snapshotDate: { lte: sevenDaysAgo } },
            select: { brierScore: true },
            orderBy: { snapshotDate: 'desc' },
          }),
        ])

        if (!current) continue

        // ── Evaluate all three kill triggers ─────────────────────────────
        const delta = weekAgo ? current.brierScore - weekAgo.brierScore : 0
        const killReasons: string[] = []

        if (delta >= DETERIORATION_THRESHOLD) {
          killReasons.push(`Deterioration: +${delta.toFixed(3)} in 7d (${weekAgo!.brierScore.toFixed(3)} → ${current.brierScore.toFixed(3)})`)
        }
        if (current.brierScore >= ABSOLUTE_BRIER_FLOOR) {
          killReasons.push(`Absolute floor: Brier ${current.brierScore.toFixed(3)} ≥ ${ABSOLUTE_BRIER_FLOOR} (worse than random)`)
        }
        if (current.lcb !== null && current.lcb < LCB_COLLAPSE_THRESHOLD) {
          killReasons.push(`LCB collapse: ${current.lcb.toFixed(3)} < ${LCB_COLLAPSE_THRESHOLD} (statistically worse than market)`)
        }

        if (killReasons.length === 0) continue

        // ── GUILLOTINE TRIGGERED ─────────────────────────────────────────
        const reason = `Protocol Stop-Loss: ${killReasons.join('; ')}`

        // DB: close vault permanently
        await closeVault(bot.id, 'CIRCUIT_BREAKER')
        await prisma.$transaction([
          prisma.incubationLog.create({
            data: {
              botId: bot.id,
              fromStatus: 'VAULT_ELIGIBLE_T1',
              toStatus: 'VAULT_ELIGIBLE_T1',
              reason,
              brierAtTransition: current.brierScore,
              triggeredBy: 'CIRCUIT_BREAKER',
            },
          }),
          prisma.vaultDeposit.updateMany({
            where: { botId: bot.id, active: true },
            data: { exitReason: 'CIRCUIT_BREAKER' },
          }),
        ])

        // On-chain: call triggerCircuitBreaker() which slashes skin-in-the-game
        // and pauses the vault. If skin is already 0, falls back to pause().
        let chainExecuted = false
        let skinSlashed = false
        if (bot.vaultAddress && process.env.EXECUTOR_PRIVATE_KEY && process.env.RPC_URL) {
          try {
            const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
            const signer = new ethers.Wallet(process.env.EXECUTOR_PRIVATE_KEY, provider)
            const vault = new ethers.Contract(bot.vaultAddress, GUILLOTINE_ABI, signer)

            const isPaused = await vault.paused()
            if (!isPaused) {
              // Check if there's skin to slash
              const skin = await vault.skinInGame()
              if (skin > 0n) {
                const tx = await vault.triggerCircuitBreaker()
                await tx.wait()
                skinSlashed = true
                chainExecuted = true
              } else {
                // No skin left — just pause
                const pauseVault = new ethers.Contract(
                  bot.vaultAddress,
                  ['function pause() external'],
                  signer
                )
                const tx = await pauseVault.pause()
                await tx.wait()
                chainExecuted = true
              }
            } else {
              chainExecuted = true // already paused
            }
          } catch (chainErr: any) {
            errors.push(`${bot.slug} on-chain guillotine failed: ${chainErr?.message}`)
          }
        }

        triggered.push({
          bot: bot.slug,
          reason,
          brierNow: current.brierScore,
          lcbNow: current.lcb,
          vault: bot.vaultAddress ?? 'no-address',
          chainExecuted,
          skinSlashed,
        })
      } catch (botErr: any) {
        errors.push(`${bot.slug}: ${botErr?.message}`)
      }
    }

    await recordCronRun('circuit_breaker', errors.length ? 'PARTIAL' : 'SUCCESS', {
      records: triggered.length,
      error: errors.join('; ') || undefined,
    })

    return NextResponse.json({
      ok: true,
      checked: bots.length,
      triggered: triggered.length,
      details: triggered,
      errors,
    })
  } catch (err: any) {
    captureError(err, { cron: 'circuit_breaker' })
    await recordCronRun('circuit_breaker', 'FAILED', { error: err?.message })
    return NextResponse.json({ error: err?.message || 'circuit-breaker cron failed' }, { status: 500 })
  }
}
