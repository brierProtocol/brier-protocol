import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { ethers } from 'ethers'
import crypto from 'crypto'
import { encryptApiKey } from '@/lib/crypto'

// The exact message the client must sign. Bound to botId + a fresh timestamp so a
// captured signature can't be replayed for another bot or reused later.
function keyGenMessage(botId: string, timestamp: number) {
  return `Brier: generate API key for bot ${botId} at ${timestamp}`
}
const MAX_SKEW_MS = 5 * 60 * 1000

export async function POST(req: NextRequest) {
  try {
    const { botId, address, signature, timestamp } = await req.json()

    if (!botId || !address || !signature || !timestamp) {
      return NextResponse.json({ error: 'botId, address, signature and timestamp are required' }, { status: 400 })
    }
    if (Math.abs(Date.now() - Number(timestamp)) > MAX_SKEW_MS) {
      return NextResponse.json({ error: 'Signature expired — sign again' }, { status: 401 })
    }

    const bot = await prisma.bot.findUnique({ where: { id: botId } })
    if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

    // CRITICAL: prove control of the owner's private key. The old check compared a
    // self-declared walletAddress in the body against the bot's (public) wallet, so
    // anyone who knew the address could mint/rotate the keys. Now we recover the
    // signer from the signature and require it to BE the bot's owner.
    let recovered: string
    try {
      recovered = ethers.verifyMessage(keyGenMessage(botId, Number(timestamp)), signature)
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    if (
      recovered.toLowerCase() !== String(address).toLowerCase() ||
      recovered.toLowerCase() !== bot.walletAddress.toLowerCase()
    ) {
      return NextResponse.json({ error: 'Unauthorized: signer is not the bot owner' }, { status: 401 })
    }

    // Generate keys. The secret is returned to the user exactly once and stored
    // ENCRYPTED at rest (AES-256-GCM) — never in plaintext. A DB leak alone can no
    // longer forge bot signatures (it would also need ENCRYPTION_SECRET).
    const apiKey = 'br_' + crypto.randomBytes(16).toString('hex')
    const apiSecret = crypto.randomBytes(32).toString('hex')
    const env = encryptApiKey(apiSecret)
    const packed = [env.encryptedKey, env.keyIv, env.keyAuthTag].join('.')

    await prisma.bot.update({ where: { id: botId }, data: { apiKey, apiSecret: packed } })

    return NextResponse.json({
      success: true,
      apiKey,
      apiSecret, // plaintext, shown ONCE
      message: 'Store this apiSecret securely. It will never be shown again.',
    })
  } catch (error: any) {
    console.error('[API Keys] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
