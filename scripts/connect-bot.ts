/**
 * One-command bot onboarding (local dev).
 *
 * Registers a fresh bot, issues its apiKey + apiSecret (secret encrypted at
 * rest), and — if TARGET_ENV points at a bot's .env — writes the 4 connection
 * vars into it (backing the file up first). This is the whole "connect a new
 * bot" flow in one shot.
 *
 * Run:
 *   BOT_NAME="ADAN Pred" BOT_WALLET=0x... BOT_CATEGORIES=crypto \
 *   TARGET_ENV=~/adan-pred/.env BRIER_URL=http://localhost:3000 \
 *   ts-node scripts/connect-bot.ts
 */
import { prisma } from '../src/lib/db/prisma'
import { encryptApiKey } from '../src/lib/crypto'
import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'

const ALLOWED = ['politics', 'crypto', 'sports', 'economy', 'culture', 'tech', 'world', 'climate']

function upsertEnv(file: string, vars: Record<string, string>) {
  const resolved = file.replace(/^~/, os.homedir())
  let text = ''
  try {
    text = fs.readFileSync(resolved, 'utf8')
    fs.copyFileSync(resolved, `${resolved}.bak.${Math.round(process.hrtime()[0])}`)
  } catch { /* new file */ }
  for (const [k, v] of Object.entries(vars)) {
    const line = `${k}=${v}`
    text = new RegExp(`^${k}=.*$`, 'm').test(text)
      ? text.replace(new RegExp(`^${k}=.*$`, 'm'), line)
      : (text.endsWith('\n') || text === '' ? text : text + '\n') + line + '\n'
  }
  fs.writeFileSync(resolved, text)
  return resolved
}

async function main() {
  const name = process.env.BOT_NAME
  const wallet = process.env.BOT_WALLET
  if (!name || !wallet || !wallet.startsWith('0x')) throw new Error('BOT_NAME and 0x BOT_WALLET are required')

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const categories = (process.env.BOT_CATEGORIES || '').split(',').map(c => c.trim()).filter(c => ALLOWED.includes(c))
  const finalWallet = wallet.toLowerCase()

  const apiKey = 'br_' + crypto.randomBytes(16).toString('hex')
  const apiSecret = crypto.randomBytes(32).toString('hex')
  const enc = encryptApiKey(apiSecret)

  const bot = await prisma.bot.upsert({
    where: { slug },
    update: { walletAddress: finalWallet, categories, apiKey, apiSecret: [enc.encryptedKey, enc.keyIv, enc.keyAuthTag].join('.') },
    create: {
      slug, name, walletAddress: finalWallet, categories,
      tagline: `${name} prediction algorithm`, status: 'PAPER', tier: 'NONE',
      apiKey, apiSecret: [enc.encryptedKey, enc.keyIv, enc.keyAuthTag].join('.'),
    },
  })
  await prisma.user.upsert({ where: { walletAddress: finalWallet }, create: { walletAddress: finalWallet }, update: {} })
  await prisma.polyConnection.upsert({
    where: { botId: bot.id }, create: { botId: bot.id, walletAddress: finalWallet }, update: { walletAddress: finalWallet },
  }).catch(() => {})

  console.log(`\n✅ Bot "${bot.name}" ready.  slug=${bot.slug}`)
  console.log(`   BRIER_API_KEY=${apiKey}`)
  console.log(`   BRIER_API_SECRET=${apiSecret}  (shown once)\n`)

  if (process.env.TARGET_ENV) {
    const written = upsertEnv(process.env.TARGET_ENV, {
      BRIER_URL: process.env.BRIER_URL || 'http://localhost:3000',
      BRIER_BOT_SLUG: bot.slug,
      BRIER_API_KEY: apiKey,
      BRIER_API_SECRET: apiSecret,
    })
    console.log(`   Wrote connection vars into ${written} (backup saved).`)
  }
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
