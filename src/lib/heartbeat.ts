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

/** Max length persisted for the live telemetry lines (a short human sentence). */
export const LIVE_LINE_MAX = 280

/**
 * Stamp a bot's heartbeat as "now". Called by the bot/executor liveness ping.
 * Optionally piggy-backs live telemetry: a one-line description of what the bot
 * is doing and its current risk constraints, shown on the profile "Operating"
 * strip. Both are clamped to LIVE_LINE_MAX; undefined leaves the column untouched.
 */
export async function recordHeartbeat(
  botId: string,
  liveActivity?: string | null,
  liveConstraints?: string | null,
) {
  const clamp = (s: string | null | undefined) =>
    typeof s === 'string' ? s.slice(0, LIVE_LINE_MAX) : undefined

  return prisma.bot.update({
    where: { id: botId },
    data: {
      lastHeartbeatAt: new Date(),
      ...(liveActivity !== undefined ? { liveActivity: clamp(liveActivity) ?? null } : {}),
      ...(liveConstraints !== undefined ? { liveConstraints: clamp(liveConstraints) ?? null } : {}),
    },
  })
}
