/**
 * Observability — so Brier can run unattended for months without dying silently.
 *
 * Three primitives:
 *  - captureError: structured error logging, plus Sentry IF configured (lazy, optional).
 *  - runCron / recordCronRun: every cron heartbeats into CronLog with status + timing.
 *  - healthReport: DB check + cron freshness, surfaced at /api/health for an external
 *    uptime monitor to ping (the dead-man's-switch).
 *
 * Sentry is opt-in: set SENTRY_DSN and `npm i @sentry/node`. Without it, everything
 * still works and errors are structured-logged to stdout (captured by Vercel / the host).
 */
import { prisma } from '@/lib/db/prisma'

let _sentry: any = null
let _sentryTried = false
function sentry(): any | null {
  if (_sentryTried) return _sentry
  _sentryTried = true
  if (!process.env.SENTRY_DSN) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node')
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 })
    _sentry = Sentry
  } catch {
    _sentry = null // @sentry/node not installed yet — structured logs still flow
  }
  return _sentry
}

/** Structured JSON line to stdout. The host/Vercel ships these to its log drain. */
export function log(level: 'info' | 'warn' | 'error', event: string, data?: Record<string, unknown>) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...data })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

/** Records an error: structured log + Sentry (if configured). Never throws. */
export function captureError(err: unknown, context?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  log('error', 'exception', { message, ...context })
  try { sentry()?.captureException(err, { extra: context }) } catch { /* never break the caller */ }
}

export type CronStatus = 'SUCCESS' | 'FAILED' | 'PARTIAL'

/** Heartbeats a cron run into CronLog. Best-effort — a logging failure never fails the job. */
export async function recordCronRun(
  job: string, status: CronStatus, opts: { records?: number; durationMs?: number; error?: string } = {},
): Promise<void> {
  try {
    await prisma.cronLog.create({
      data: {
        job, status,
        recordsProcessed: opts.records ?? 0,
        durationMs: opts.durationMs ?? 0,
        errorMessage: opts.error ?? null,
      },
    })
  } catch (e) {
    log('warn', 'cronlog_write_failed', { job, reason: e instanceof Error ? e.message : String(e) })
  }
}

/** Wraps a cron handler: times it, records SUCCESS/FAILED to CronLog, captures errors. */
export async function runCron<T>(job: string, fn: () => Promise<{ result: T; records?: number }>): Promise<T> {
  const started = Date.now()
  try {
    const { result, records } = await fn()
    await recordCronRun(job, 'SUCCESS', { records, durationMs: Date.now() - started })
    return result
  } catch (err) {
    captureError(err, { job })
    await recordCronRun(job, 'FAILED', { durationMs: Date.now() - started, error: err instanceof Error ? err.message : String(err) })
    throw err
  }
}

// Critical crons and how stale (minutes) a last-SUCCESS may be before we call it unhealthy.
// Generous vs the schedule so a single skipped run doesn't page; a real outage does.
//
// Estos umbrales asumen las frecuencias REALES, que las restaura .github/workflows/cron.yml.
// Los crons de vercel.json solos NO alcanzan: el plan Hobby los limita a 1 vez por dia, y con
// eso este health check se quedaba en rojo casi 24/7 — un dead-man's-switch que grita siempre
// no despierta a nadie.
//
// `aliases`: nombres historicos del mismo job en CronLog, para no perder el heartbeat al
// renombrar (sync escribia 'FULL_SYNC' y este check buscaba 'sync_polymarket' → "never ran").
export const CRITICAL_CRONS: { job: string; maxAgeMin: number; aliases?: string[] }[] = [
  { job: 'score', maxAgeMin: 180 },                  // hourly → stale after 3h
  { job: 'circuit_breaker', maxAgeMin: 60 * 9 },     // 6h → stale after 9h
  { job: 'resolve_and_score', maxAgeMin: 180 },      // 30min → stale after 3h
  { job: 'sync_polymarket', maxAgeMin: 60 * 30, aliases: ['FULL_SYNC'] }, // daily → stale after 30h
]

export interface HealthCheck { name: string; healthy: boolean; detail?: string }
export interface HealthReport { ok: boolean; checks: HealthCheck[]; at: string }

/** DB reachability + every critical cron's freshness. Powers /api/health. */
export async function healthReport(): Promise<HealthReport> {
  const checks: HealthCheck[] = []

  // 1. Database
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.push({ name: 'database', healthy: true })
  } catch (e) {
    checks.push({ name: 'database', healthy: false, detail: e instanceof Error ? e.message : 'unreachable' })
  }

  // 2. Cron freshness (skip if DB is down — we can't read CronLog)
  if (checks[0].healthy) {
    for (const { job, maxAgeMin, aliases } of CRITICAL_CRONS) {
      try {
        const last = await prisma.cronLog.findFirst({
          where: { job: { in: [job, ...(aliases ?? [])] }, status: 'SUCCESS' },
          orderBy: { ranAt: 'desc' }, select: { ranAt: true },
        })
        if (!last) {
          checks.push({ name: `cron:${job}`, healthy: false, detail: 'never ran' })
          continue
        }
        const ageMin = (Date.now() - last.ranAt.getTime()) / 60000
        checks.push({
          name: `cron:${job}`,
          healthy: ageMin <= maxAgeMin,
          detail: `last success ${Math.round(ageMin)}m ago (limit ${maxAgeMin}m)`,
        })
      } catch (e) {
        checks.push({ name: `cron:${job}`, healthy: false, detail: 'check failed' })
      }
    }
  }

  return { ok: checks.every(c => c.healthy), checks, at: new Date().toISOString() }
}
