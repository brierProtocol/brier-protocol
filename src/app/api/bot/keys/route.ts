import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { botId, walletAddress } = body

    if (!botId || !walletAddress) {
      return NextResponse.json({ error: 'botId and walletAddress required' }, { status: 400 })
    }

    const bot = await prisma.bot.findUnique({
      where: { id: botId }
    })

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    // Basic authorization check
    if (bot.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized. Wallet does not own this bot.' }, { status: 401 })
    }

    // Generate secure keys
    const apiKey = 'br_' + crypto.randomBytes(16).toString('hex')
    const apiSecret = crypto.randomBytes(32).toString('hex')

    await prisma.bot.update({
      where: { id: botId },
      data: {
        apiKey,
        apiSecret
      }
    })

    // Return the secret ONLY ONCE
    return NextResponse.json({
      success: true,
      apiKey,
      apiSecret,
      message: 'Store this apiSecret securely. It will never be shown again.'
    })

  } catch (error: any) {
    console.error('[API Keys] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
