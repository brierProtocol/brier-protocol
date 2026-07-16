import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifyBotSignatureWithPrefix, touchKeyByPrefix } from '@/lib/api-keys'

export async function POST(req: NextRequest) {
  try {
    const timestamp = req.headers.get('x-timestamp')
    const signature = req.headers.get('x-signature')
    
    if (!timestamp || !signature) {
      return NextResponse.json({ error: 'Missing security headers (x-timestamp, x-signature)' }, { status: 401 })
    }
    
    if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Timestamp is stale or invalid' }, { status: 401 })
    }

    const rawBody = await req.text()
    let body: any
    try { 
      body = JSON.parse(rawBody) 
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { botId } = body
    if (!botId || typeof botId !== 'string') {
      return NextResponse.json({ error: 'botId is required' }, { status: 400 })
    }

    const bot = await prisma.bot.findUnique({ where: { id: botId }, select: { id: true, slug: true } })
    if (!bot) return NextResponse.json({ error: 'Unknown botId' }, { status: 401 })

    // Verify signature
    const matchedPrefix = await verifyBotSignatureWithPrefix(botId, timestamp, rawBody, signature)
    if (!matchedPrefix) {
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
    }
    
    // Update lastPingAt and touch key
    touchKeyByPrefix(matchedPrefix).catch(() => {})
    
    await prisma.bot.update({
      where: { id: bot.id },
      data: { lastPingAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      message: 'Ping received',
      botSlug: bot.slug,
      lastPingAt: new Date().toISOString()
    })
  } catch (err: any) {
    console.error('[v1/ping]', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
