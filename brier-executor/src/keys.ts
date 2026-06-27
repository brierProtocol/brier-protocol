/**
 * Per-bot signing secret resolution for the executor.
 *
 * Each bot's HMAC secret lives encrypted in Postgres (ApiKey table, written by
 * the Next.js app). The executor resolves a bot's ACTIVE secrets to verify the
 * signature of each incoming signal, so every bot signs with its OWN key instead
 * of one global shared secret.
 *
 * Secrets are cached in-process for CACHE_TTL_MS so the hot path is a Map lookup,
 * not a DB round-trip per signal. Revocation/rotation takes effect on the next
 * refresh (<= TTL). No coupling to Redis (which here is BullMQ's, possibly a
 * different instance) and no plaintext secret ever leaves this process.
 */
import crypto from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CACHE_TTL_MS = 60_000
const cache = new Map<string, { secrets: string[]; exp: number }>()

// Legacy global secret — only honored if explicitly set to a real value. The old
// placeholder default is treated as "unset" so a misconfigured deploy fails closed.
const LEGACY_GLOBAL = process.env.BUILDER_SECRET_KEY
const LEGACY_VALID = !!LEGACY_GLOBAL && LEGACY_GLOBAL !== 'your-64-char-hex-secret'

function decrypt(encryptedKey: string, keyIv: string, keyAuthTag: string): string | null {
  const secret = process.env.ENCRYPTION_SECRET
  if (!secret) return null
  try {
    const key = Buffer.from(secret, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(keyIv, 'base64'))
    decipher.setAuthTag(Buffer.from(keyAuthTag, 'base64'))
    return Buffer.concat([decipher.update(Buffer.from(encryptedKey, 'base64')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

/**
 * Returns every secret that may sign for this bot: the bot's active per-key
 * secrets, plus the legacy global secret if one is validly configured (migration
 * bridge). Empty array => no valid credential => the caller must reject.
 */
export async function candidateSecrets(botId: string): Promise<string[]> {
  const now = Date.now()
  const hit = cache.get(botId)
  if (hit && hit.exp > now) return hit.secrets

  let secrets: string[] = []
  try {
    const keys = await prisma.apiKey.findMany({
      where: { botId, revokedAt: null },
      select: { encryptedKey: true, keyIv: true, keyAuthTag: true },
    })
    secrets = keys.map(k => decrypt(k.encryptedKey, k.keyIv, k.keyAuthTag)).filter((s): s is string => !!s)
  } catch (err) {
    // DB down — fall back to legacy only (if valid), never to an open default.
    secrets = []
  }

  if (LEGACY_VALID) secrets.push(LEGACY_GLOBAL as string)

  cache.set(botId, { secrets, exp: now + CACHE_TTL_MS })
  return secrets
}

/** Verifies the HMAC of `${timestamp}.${rawBody}` against any of the bot's secrets. */
export function verifyAgainst(secrets: string[], timestamp: string, rawBody: string, signature: string): boolean {
  const payload = `${timestamp}.${rawBody}`
  let sig: Buffer
  try {
    sig = Buffer.from(signature, 'hex')
  } catch {
    return false
  }
  for (const secret of secrets) {
    const expected = crypto.createHmac('sha256', secret).update(payload).digest()
    if (expected.length === sig.length && crypto.timingSafeEqual(expected, sig)) return true
  }
  return false
}
