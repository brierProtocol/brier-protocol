/**
 * GET /api/health — the dead-man's-switch.
 *
 * PUBLIC and unauthenticated so an external uptime monitor (UptimeRobot, Better
 * Uptime, etc.) can ping it every few minutes. Returns 200 when healthy, 503 when
 * degraded, with a compact per-check body. Point a monitor here and you'll be paged
 * the moment the DB goes down or a critical cron stops running — no silent death.
 */
import { NextResponse } from 'next/server'
import { healthReport } from '@/lib/observability'

export const dynamic = 'force-dynamic'

export async function GET() {
  const report = await healthReport()
  return NextResponse.json(report, {
    status: report.ok ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  })
}
