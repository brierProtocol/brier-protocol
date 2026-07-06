// src/lib/notifications.ts
import { prisma } from './db/prisma'

export type NotificationType =
  | 'VAULT_UNLOCKED'
  | 'TRADE_EXECUTED'
  | 'TRADE_SETTLED'
  | 'DEPOSIT_RECEIVED'
  | 'NEW_FOLLOWER'
  | 'CIRCUIT_BREAKER'

export interface NotificationActor {
  walletAddress: string
  handle: string | null
  name: string | null
  pfpUrl: string | null
}

export interface NotificationRecord {
  id: string
  walletAddress: string
  type: string
  title: string
  message: string
  metadata: Record<string, unknown> | null
  read: boolean
  createdAt: Date
  /** The human who triggered this (depositor, follower, commenter), resolved to
   *  their profile so the bell can show a face and a real name, not a hex stub. */
  actor?: NotificationActor | null
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createNotification(
  walletAddress: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<NotificationRecord> {
  const row = await prisma.notification.create({
    data: {
      walletAddress: walletAddress.toLowerCase(),
      type,
      title,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
      read: false,
    },
  })
  return deserialize(row)
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getUnreadNotifications(
  walletAddress: string,
  limit = 20
): Promise<NotificationRecord[]> {
  const rows = await prisma.notification.findMany({
    where: {
      walletAddress: walletAddress.toLowerCase(),
      read: false,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return withActors(rows.map(deserialize))
}

/** Resolve each notification's actor wallet to their profile (one batched query). */
async function withActors(records: NotificationRecord[]): Promise<NotificationRecord[]> {
  const wallets = new Set<string>()
  for (const r of records) {
    const w = actorWalletOf(r)
    if (w) wallets.add(w)
  }
  if (wallets.size === 0) return records

  const users = await prisma.user.findMany({
    where: { walletAddress: { in: [...wallets] } },
    select: { walletAddress: true, handle: true, name: true, pfpUrl: true },
  })
  const byWallet = new Map(users.map(u => [u.walletAddress.toLowerCase(), u]))

  return records.map(r => {
    const w = actorWalletOf(r)
    if (!w) return r
    const u = byWallet.get(w)
    return {
      ...r,
      actor: {
        walletAddress: w,
        handle: u?.handle ?? null,
        name: u?.name ?? null,
        pfpUrl: u?.pfpUrl ?? null,
      },
    }
  })
}

/** The wallet that triggered a notification, from its metadata (best-effort). */
function actorWalletOf(r: NotificationRecord): string | null {
  const md = r.metadata || {}
  const w = (md.actorWallet || md.depositorWallet || md.followerAddress) as string | undefined
  return typeof w === 'string' && w.startsWith('0x') ? w.toLowerCase() : null
}

export async function getAllNotifications(
  walletAddress: string,
  limit = 50
): Promise<NotificationRecord[]> {
  const rows = await prisma.notification.findMany({
    where: { walletAddress: walletAddress.toLowerCase() },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return rows.map(deserialize)
}

export async function countUnread(walletAddress: string): Promise<number> {
  return prisma.notification.count({
    where: {
      walletAddress: walletAddress.toLowerCase(),
      read: false,
    },
  })
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function markNotificationRead(id: string): Promise<void> {
  await prisma.notification.update({
    where: { id },
    data: { read: true },
  })
}

export async function markAllRead(walletAddress: string): Promise<void> {
  await prisma.notification.updateMany({
    where: {
      walletAddress: walletAddress.toLowerCase(),
      read: false,
    },
    data: { read: true },
  })
}

// ---------------------------------------------------------------------------
// Convenience helpers called by the daemon
// ---------------------------------------------------------------------------

export async function notifyVaultUnlocked(
  walletAddress: string,
  botName: string
): Promise<void> {
  await createNotification(
    walletAddress,
    'VAULT_UNLOCKED',
    '🟢 Vault Unlocked',
    `${botName} completed incubation. Deposits are now open.`,
    { botName }
  )
}

export async function notifyTradeExecuted(
  walletAddress: string,
  botName: string,
  marketTitle: string,
  side: string,
  amount: number
): Promise<void> {
  await createNotification(
    walletAddress,
    'TRADE_EXECUTED',
    '⚡ Trade Executed',
    `${botName} entered ${side} on "${marketTitle}" for $${amount.toFixed(2)} USDC.`,
    { botName, marketTitle, side, amount }
  )
}

export async function notifyTradeSettled(
  walletAddress: string,
  botName: string,
  marketTitle: string,
  outcome: 'WIN' | 'LOSS',
  pnl: number
): Promise<void> {
  const sign = pnl >= 0 ? '+' : ''
  await createNotification(
    walletAddress,
    'TRADE_SETTLED',
    outcome === 'WIN' ? '✅ Position Won' : '❌ Position Lost',
    `${botName}: "${marketTitle}" settled ${outcome}. PnL: ${sign}$${pnl.toFixed(2)} USDC.`,
    { botName, marketTitle, outcome, pnl }
  )
}

export async function notifyFollow(
  walletAddress: string,
  followerAddress: string
): Promise<void> {
  await createNotification(
    walletAddress,
    'NEW_FOLLOWER',
    '🔔 New Follower',
    `${followerAddress.substring(0, 6)}...${followerAddress.substring(38)} started following your trades.`,
    { followerAddress }
  )
}

export async function notifyDeposit(
  builderWallet: string,
  depositorWallet: string,
  botName: string,
  amountUsdc: number
): Promise<void> {
  await createNotification(
    builderWallet,
    'DEPOSIT_RECEIVED',
    '💰 New Vault Deposit',
    `${depositorWallet.substring(0, 6)}...${depositorWallet.substring(38)} deposited $${amountUsdc.toFixed(2)} USDC into ${botName}'s Vault.`,
    { depositorWallet, botName, amountUsdc }
  )
}

export async function notifyCircuitBreaker(
  walletAddress: string,
  botName: string,
  reason: string
): Promise<void> {
  await createNotification(
    walletAddress,
    'CIRCUIT_BREAKER',
    '⚠️ Circuit Breaker Triggered',
    `${botName} was paused automatically. Reason: ${reason}`,
    { botName, reason }
  )
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function deserialize(row: {
  id: string
  walletAddress: string
  type: string
  title: string
  message: string
  metadata: string | null
  read: boolean
  createdAt: Date
}): NotificationRecord {
  return {
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  }
}
