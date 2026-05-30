import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const existing = await prisma.waitlist.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ ok: true, message: 'Already on waitlist' })
    }

    await prisma.waitlist.create({ data: { email } })

    return NextResponse.json({ ok: true, message: 'Added to waitlist' })
  } catch (err) {
    console.error('Waitlist error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
