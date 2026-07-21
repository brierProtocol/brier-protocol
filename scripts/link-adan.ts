/**
 * One-off: link the adan-pred bot to ADAN's existing credentials.
 * Stores the apiKey (public) and the apiSecret ENCRYPTED at rest (enc.iv.tag),
 * exactly like /api/bot/keys does, so /api/predictions/commit can verify ADAN's
 * HMAC signatures.
 *
 * Run:  ADAN_API_KEY=... ADAN_API_SECRET=... ts-node scripts/link-adan.ts
 */
import { prisma } from '../src/lib/db/prisma'
import { encryptApiKey } from '../src/lib/crypto'

async function main() {
  const slug = process.env.ADAN_SLUG || 'adan-pred'
  const apiKey = process.env.ADAN_API_KEY
  const apiSecret = process.env.ADAN_API_SECRET
  if (!apiKey || !apiSecret) throw new Error('Missing ADAN_API_KEY / ADAN_API_SECRET')

  const enc = encryptApiKey(apiSecret)
  const bot = await prisma.bot.update({
    where: { slug },
    data: { apiKey, apiSecret: [enc.encryptedKey, enc.keyIv, enc.keyAuthTag].join('.') },
    select: { id: true, slug: true, apiKey: true },
  })
  console.log(`Linked ${bot.slug} (${bot.id}) — apiKey ${bot.apiKey?.slice(0, 10)}… secret stored encrypted.`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
