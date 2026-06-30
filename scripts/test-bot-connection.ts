/**
 * End-to-end bot-connection smoke test against the LOCAL dev server.
 * Run: npm run test:connect   (server must be up on :3000)
 *
 * It seeds a test bot, gives it an API key (secret encrypted exactly like the real
 * endpoint), then HMAC-signs a prediction and POSTs it to /api/predictions/commit —
 * exercising the real auth + signature + commit path. Proves the connection works.
 */
import crypto from 'crypto'
import { prisma } from '../src/lib/db/prisma'
import { encryptApiKey } from '../src/lib/crypto'

const BASE = process.env.BRIER_BASE_URL || 'http://localhost:3000'

async function main() {
  // 1. Seed a test bot
  const wallet = '0x000000000000000000000000000000000000dEaD'
  const bot = await prisma.bot.upsert({
    where: { slug: 'test-connect-bot' },
    update: {},
    create: { slug: 'test-connect-bot', name: 'Test Connect Bot', walletAddress: wallet },
  })

  // 2. Issue an API key (secret encrypted at rest, like /api/bot/keys does)
  const apiKey = 'br_' + crypto.randomBytes(16).toString('hex')
  const apiSecret = crypto.randomBytes(32).toString('hex')
  const env = encryptApiKey(apiSecret)
  await prisma.bot.update({
    where: { id: bot.id },
    data: { apiKey, apiSecret: [env.encryptedKey, env.keyIv, env.keyAuthTag].join('.') },
  })
  console.log('Bot:', bot.id, '| apiKey:', apiKey)

  // 3. Build + HMAC-sign a prediction (timestamp + rawBody), like the SDK
  const marketId = '0xTESTMARKET' + Date.now() // unique so anti-resubmit doesn't 409
  const body = JSON.stringify({ marketId, forecast: 0.62, marketTitle: 'Will X happen?' })
  const timestamp = String(Date.now())
  const signature = crypto.createHmac('sha256', apiSecret).update(timestamp + body).digest('hex')

  // 4. POST to the real endpoint
  const res = await fetch(`${BASE}/api/predictions/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'x-timestamp': timestamp, 'x-signature': signature },
    body,
  })
  const data = await res.json().catch(() => null)
  console.log('\nPOST /api/predictions/commit →', res.status)
  console.log(JSON.stringify(data, null, 2))

  // 5. Negative test: a bad signature must be rejected (401)
  const bad = await fetch(`${BASE}/api/predictions/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'x-timestamp': timestamp, 'x-signature': 'deadbeef' },
    body,
  })
  console.log('\nBad signature →', bad.status, '(expected 401)')

  await prisma.$disconnect()
  console.log(res.ok && bad.status === 401 ? '\n✅ Connection works: signed commit accepted, forged signature rejected.' : '\n❌ Something is off — check the output above.')
}

main().catch(e => { console.error(e); process.exit(1) })
