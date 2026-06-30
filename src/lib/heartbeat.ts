import { prisma } from './db/prisma'

/**
 * Bot heartbeat / liveness (spec §2.2).
 *
 * Each bot emits a heartbeat roughly every HEARTBEAT_INTERVAL_MS. The dashboard
 * must show a bot as "stale" / disconnected — never "operating" — if no heartbeat
 * arrived within HEARTBEAT_STALE_MS, even if its last known position is still open.
 */
export const HEARTBEAT_INTERVAL_MS = 4_000          // bots beat every ~4s
export const HEARTBEAT_STALE_MS = HEARTBEAT_INTERVAL_MS * 3  // 12s grace (3 missed beats)

/**
 * True when a bot should read as "stale". A bot that never reported
 * (lastHeartbeatAt == null) is stale by definition.
 */
export function isBotStale(
  bot: { lastHeartbeatAt: Date | null },
  now: number = Date.now(),
): boolean {
  if (!bot.lastHeartbeatAt) return true
  return now - bot.lastHeartbeatAt.getTime() > HEARTBEAT_STALE_MS
}

/** Stamp a bot's heartbeat as "now". Called by the bot/executor liveness ping. */
export async function recordHeartbeat(botId: string) {
  return prisma.bot.update({
    where: { id: botId },
    data: { lastHeartbeatAt: new Date() },
  })
}
