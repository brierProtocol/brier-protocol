import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
    }
    await prisma.waitlist.create({
      data: { email: parsed.data.email.trim().toLowerCase() },
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    // P2002 = unique constraint violation → email already registered
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'duplicate' }, { status: 409 })
    }
    console.error('[waitlist]', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
