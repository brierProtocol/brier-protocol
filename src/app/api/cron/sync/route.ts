// Called by Vercel Cron every 15 minutes
// Add to vercel.json: {"crons": [{"path": "/api/cron/sync", "schedule": "*/15 * * * *"}]}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { indexPolymarketWallet } from '@/lib/polymarket-indexer'
import { checkStatusTransitions } from '@/lib/incubation'

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (retries <= 0) throw error
    await new Promise(resolve => setTimeout(resolve, delay))
    return withRetry(fn, retries - 1, delay * 2)
  }
}

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron, not a random user
  const authHeader = req.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const bots = await prisma.bot.findMany({
      where: {
        status: { in: ['PAPER', 'LIVE', 'VAULT_ELIGIBLE_T1', 'VAULT_ELIGIBLE_T2'] },
        polyConnection: { isNot: null }
      },
      select: { id: true }
    })

    const results = await Promise.allSettled(
      bots.map(async bot => {
        return withRetry(async () => {
          await indexPolymarketWallet(bot.id)
          await checkStatusTransitions(bot.id)
          return bot.id
        })
      })
    )

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    const errorMessages = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => String(r.reason))

    await prisma.cronLog.create({
      data: {
        job: 'FULL_SYNC',
        status: failed === 0 ? 'SUCCESS' : 'FAILED',
        errorMessage: failed > 0 ? errorMessages.join('; ') : null,
      }
    })

    return NextResponse.json({ 
      status: 'OK', 
      synced: succeeded, 
      errors: failed,
      details: errorMessages
    })
  } catch (err) {
    await prisma.cronLog.create({
      data: {
        job: 'FULL_SYNC',
        status: 'FAILED',
        errorMessage: String(err),
      }
    })
    return NextResponse.json({ status: 'ERROR', message: String(err) }, { status: 200 })
  }
}
