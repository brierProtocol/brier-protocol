import crypto from 'crypto'

const KEY = Buffer.from(process.env.ENCRYPTION_SECRET!, 'hex')

export function encryptApiKey(raw: string) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const encrypted = Buffer.concat([cipher.update(raw, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return {
    encryptedKey: encrypted.toString('base64'),
    keyIv: iv.toString('base64'),
    keyAuthTag: authTag.toString('base64'),
  }
}

export function decryptApiKey(encryptedKey: string, keyIv: string, keyAuthTag: string): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(keyIv, 'base64'))
  decipher.setAuthTag(Buffer.from(keyAuthTag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedKey, 'base64')),
    decipher.final()
  ]).toString('utf8')
}
