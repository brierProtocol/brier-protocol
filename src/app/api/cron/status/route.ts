import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  // SECURITY: Protect cron status from unauthorized access
  const authHeader = req.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const logs = await prisma.cronLog.findMany({
      orderBy: { ranAt: 'desc' },
      take: 10
    })
    
    return NextResponse.json(logs)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch cron logs' }, { status: 500 })
  }
}
