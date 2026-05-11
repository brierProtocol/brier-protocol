// Called by Vercel Cron every 15 minutes
// Add to vercel.json: {"crons": [{"path": "/api/cron/sync", "schedule": "*/15 * * * *"}]}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { indexPolymarketWallet } from '@/lib/polymarket-indexer'
import { checkIncubationThreshold } from '@/lib/incubation'

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron, not a random user
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bots = await prisma.bot.findMany({
    where: {
      status: { in: ['INCUBATING', 'PENDING', 'LIVE'] },
      polyConnection: { isNot: null }
    },
    select: { id: true }
  })

  const results = await Promise.allSettled(
    bots.map(async bot => {
      await indexPolymarketWallet(bot.id)
      await checkIncubationThreshold(bot.id)
      return bot.id
    })
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ synced: succeeded, errors: failed })
}
