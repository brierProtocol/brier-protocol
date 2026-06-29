// Pausa automática de vaults cuando el Brier Score de un bot se deteriora bruscamente.
// Vercel cron: {"path": "/api/cron/circuit-breaker", "schedule": "0 */6 * * *"} (c/6h)
//
// Lógica: si el Brier Score empeoró más de DETERIORATION_THRESHOLD en 7 días,
// el vault se marca cerrado en DB y se llama vault.pause() on-chain.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { ethers } from 'ethers'
import { recordCronRun, captureError } from '@/lib/observability'

const DETERIORATION_THRESHOLD = 0.08
const PAUSE_ABI = ['function pause() external', 'function paused() view returns (bool)']

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const triggered: { bot: string; delta: number; vault: string; chainPaused: boolean }[] = []
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
            select: { brierScore: true },
          }),
          prisma.botScore.findFirst({
            where: { botId: bot.id, snapshotDate: { lte: sevenDaysAgo } },
            select: { brierScore: true },
            orderBy: { snapshotDate: 'desc' },
          }),
        ])

        if (!current || !weekAgo) continue

        const delta = current.brierScore - weekAgo.brierScore
        if (delta < DETERIORATION_THRESHOLD) continue

        // CIRCUIT BREAKER DISPARADO
        await prisma.$transaction([
          prisma.bot.update({ where: { id: bot.id }, data: { vaultOpen: false } }),
          prisma.incubationLog.create({
            data: {
              botId: bot.id,
              fromStatus: 'VAULT_ELIGIBLE_T1',
              toStatus: 'VAULT_ELIGIBLE_T1',
              reason: `Circuit breaker: Brier deterioró +${delta.toFixed(3)} en 7d (${weekAgo.brierScore.toFixed(3)} → ${current.brierScore.toFixed(3)}). Vault pausado.`,
              brierAtTransition: current.brierScore,
              triggeredBy: 'CIRCUIT_BREAKER',
            },
          }),
          prisma.vaultDeposit.updateMany({
            where: { botId: bot.id, active: true },
            data: { exitReason: 'CIRCUIT_BREAKER' },
          }),
        ])

        // Pausa on-chain: requiere vault address + signer configurado
        let chainPaused = false
        if (bot.vaultAddress && process.env.EXECUTOR_PRIVATE_KEY && process.env.RPC_URL) {
          try {
            const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
            const signer = new ethers.Wallet(process.env.EXECUTOR_PRIVATE_KEY, provider)
            const vault = new ethers.Contract(bot.vaultAddress, PAUSE_ABI, signer)
            const isPaused = await vault.paused()
            if (!isPaused) {
              const tx = await vault.pause()
              await tx.wait()
              chainPaused = true
            } else {
              chainPaused = true
            }
          } catch (chainErr: any) {
            errors.push(`${bot.slug} pause on-chain fallida: ${chainErr?.message}`)
          }
        }

        triggered.push({ bot: bot.slug, delta, vault: bot.vaultAddress ?? 'sin-address', chainPaused })
      } catch (botErr: any) {
        errors.push(`${bot.slug}: ${botErr?.message}`)
      }
    }

    await recordCronRun('circuit_breaker', errors.length ? 'PARTIAL' : 'SUCCESS', { records: triggered.length, error: errors.join('; ') || undefined })
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
