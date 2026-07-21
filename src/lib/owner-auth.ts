/**
 * Lightweight wallet-ownership proof for sensitive bot actions (issuing/revoking
 * API keys). The caller signs a structured message with the bot's wallet; we
 * recover the signer and check it matches. No session/cookie needed — the wallet
 * IS the credential, consistent with the rest of the app's wallet-native model.
 *
 * Not full SIWE (no nonce store yet) but it binds the signature to the bot id and
 * a fresh timestamp, so a signature can't be replayed for a different bot or
 * reused after the window. Upgrading to SIWE with a server nonce is a P1 follow-up.
 */
import { ethers } from 'ethers'

const MAX_SKEW_MS = 5 * 60 * 1000 // 5 minutes

export function ownershipMessage(botId: string, address: string, timestamp: number): string {
  return [
    'Brier API key management',
    `Bot: ${botId}`,
    `Wallet: ${address}`,
    `Time: ${timestamp}`,
  ].join('\n')
}

export type OwnershipProof = { address: string; signature: string; timestamp: number }

export function publishMessage(name: string, timestamp: number): string {
  return `I confirm this wallet trades for the Brier bot ${name}. Timestamp: ${timestamp}`
}

/**
 * Verifies the one-shot publish signature: the wallet signed the canonical
 * publish message (reconstructed server-side, never trusted from the client)
 * within the freshness window. Same guarantees as verifyOwnership but bound
 * to the bot name instead of a bot id, since the bot doesn't exist yet.
 */
export function verifyPublishProof(
  name: string,
  walletAddress: string,
  signature: string,
  timestamp: number,
): { ok: true } | { ok: false; reason: string } {
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > MAX_SKEW_MS) {
    return { ok: false, reason: 'Signature expired, sign again' }
  }
  let recovered: string
  try {
    recovered = ethers.verifyMessage(publishMessage(name, timestamp), signature)
  } catch {
    return { ok: false, reason: 'Invalid signature' }
  }
  if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
    return { ok: false, reason: 'Signer is not the provided wallet' }
  }
  return { ok: true }
}

/**
 * Verifies that `proof` is a fresh signature by `expectedWallet` for this bot.
 * Returns { ok: true } or { ok: false, reason } — never throws.
 */
export function verifyOwnership(
  botId: string,
  expectedWallet: string | null | undefined,
  proof: Partial<OwnershipProof> | undefined,
): { ok: true } | { ok: false; reason: string } {
  if (!expectedWallet) return { ok: false, reason: 'Bot has no owner wallet on record' }
  if (!proof?.address || !proof?.signature || !proof?.timestamp) {
    return { ok: false, reason: 'Missing ownership proof (address, signature, timestamp)' }
  }

  if (Math.abs(Date.now() - proof.timestamp) > MAX_SKEW_MS) {
    return { ok: false, reason: 'Signature expired — sign again' }
  }

  let recovered: string
  try {
    recovered = ethers.verifyMessage(ownershipMessage(botId, proof.address, proof.timestamp), proof.signature)
  } catch {
    return { ok: false, reason: 'Invalid signature' }
  }

  // The signer must be the address they claim AND that address must be the bot owner.
  if (recovered.toLowerCase() !== proof.address.toLowerCase()) {
    return { ok: false, reason: 'Signature does not match the provided address' }
  }
  if (recovered.toLowerCase() !== expectedWallet.toLowerCase()) {
    return { ok: false, reason: 'Signer is not the bot owner' }
  }

  return { ok: true }
}
