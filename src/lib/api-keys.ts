/**
 * Per-builder API keys — each bot signs its trade signals with ITS OWN secret,
 * replacing the single global BUILDER_SECRET_KEY shared by every bot.
 *
 * The raw secret is shown to the builder exactly once at creation. We store only
 * the AES-256-GCM ciphertext (same envelope as KalshiConnection). The executor
 * resolves a bot's active secrets to verify the HMAC of each incoming signal.
 *
 * Format: bk_live_<48 hex chars>. The `prefix` (first 16 chars) is public — it
 * identifies the key in the UI and is the unique handle. The remainder is secret.
 */
import crypto from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { encryptApiKey, decryptApiKey } from '@/lib/crypto'

const SECRET_ENTROPY_BYTES = 24 // 48 hex chars after the bk_live_ prefix

export type IssuedKey = { id: string; prefix: string; secret: string; label: string }

/** Issues a new signing key for a bot. Returns the RAW secret exactly once. */
export async function issueApiKey(botId: string, label = 'default'): Promise<IssuedKey> {
  const secret = `bk_live_${crypto.randomBytes(SECRET_ENTROPY_BYTES).toString('hex')}`
  const prefix = secret.slice(0, 16) // "bk_live_" + 8 hex

  const env = encryptApiKey(secret)
  const row = await prisma.apiKey.create({
    data: {
      botId,
      prefix,
      label,
      encryptedKey: env.encryptedKey,
      keyIv: env.keyIv,
      keyAuthTag: env.keyAuthTag,
    },
    select: { id: true, prefix: true, label: true },
  })

  return { id: row.id, prefix: row.prefix, secret, label: row.label }
}

/** Lists a bot's keys, masked — never returns the secret. */
export async function listApiKeys(botId: string) {
  const keys = await prisma.apiKey.findMany({
    where: { botId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, prefix: true, label: true, lastUsedAt: true, revokedAt: true, createdAt: true },
  })
  return keys.map(k => ({
    id: k.id,
    label: k.label,
    masked: `${k.prefix}${'•'.repeat(8)}`,
    lastUsedAt: k.lastUsedAt,
    revoked: k.revokedAt != null,
    createdAt: k.createdAt,
  }))
}

/** Revokes a key (soft delete). The executor stops accepting it on its next cache refresh. */
export async function revokeApiKey(botId: string, keyId: string): Promise<boolean> {
  const res = await prisma.apiKey.updateMany({
    where: { id: keyId, botId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  return res.count > 0
}

/**
 * Returns the decrypted secrets of a bot's ACTIVE (non-revoked) keys. Server-side
 * only — used by the executor to verify HMAC. Multiple secrets support key
 * rotation: a new key can be issued and adopted before the old one is revoked.
 */
export async function activeSecretsForBot(botId: string): Promise<string[]> {
  const keys = await prisma.apiKey.findMany({
    where: { botId, revokedAt: null },
    select: { encryptedKey: true, keyIv: true, keyAuthTag: true },
  })
  return keys.map(k => decryptApiKey(k.encryptedKey, k.keyIv, k.keyAuthTag))
}

/** Stamps lastUsedAt for the key with this prefix (best-effort telemetry). */
export async function touchKeyByPrefix(prefix: string): Promise<void> {
  await prisma.apiKey.updateMany({ where: { prefix }, data: { lastUsedAt: new Date() } }).catch(() => {})
}

/**
 * Verifies the HMAC of `${timestamp}.${rawBody}` against any of a bot's active
 * secrets — the same scheme the executor and both SDKs use. Returns the PREFIX of
 * the key that matched (so the caller can stamp lastUsedAt), or null on failure.
 * A bot with no active key fails closed.
 */
export async function verifyBotSignatureWithPrefix(
  botId: string,
  timestamp: string,
  rawBody: string,
  signature: string,
): Promise<string | null> {
  const keys = await prisma.apiKey.findMany({
    where: { botId, revokedAt: null },
    select: { prefix: true, encryptedKey: true, keyIv: true, keyAuthTag: true },
  })
  if (keys.length === 0) return null
  let sig: Buffer
  try { sig = Buffer.from(signature, 'hex') } catch { return null }
  const payload = `${timestamp}.${rawBody}`
  for (const k of keys) {
    let secret: string
    try { secret = decryptApiKey(k.encryptedKey, k.keyIv, k.keyAuthTag) } catch { continue }
    const expected = crypto.createHmac('sha256', secret).update(payload).digest()
    if (expected.length === sig.length && crypto.timingSafeEqual(expected, sig)) return k.prefix
  }
  return null
}

/** Boolean wrapper over verifyBotSignatureWithPrefix (kept for existing callers). */
export async function verifyBotSignature(
  botId: string,
  timestamp: string,
  rawBody: string,
  signature: string,
): Promise<boolean> {
  return (await verifyBotSignatureWithPrefix(botId, timestamp, rawBody, signature)) !== null
}
