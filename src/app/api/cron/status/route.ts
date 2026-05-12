import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
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
