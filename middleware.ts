import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Ratelimit } from '@upstash/ratelimit'

// Distributed rate-limit via Upstash Redis.
// Requires UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN env vars.
// Falls back to an in-memory per-instance Map in local dev / if not configured.

const LIMIT = 10        // requests per window
const WINDOW = '1 m'   // sliding window

// Lazily initialise the Upstash limiter the first time it's needed so the
// middleware still boots even when the env vars aren't set.
let _ratelimit: Ratelimit | null = null

async function getUpstashLimiter() {
  if (_ratelimit) return _ratelimit
  const { Ratelimit } = await import('@upstash/ratelimit')
  const { Redis } = await import('@upstash/redis')
  _ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(LIMIT, WINDOW),
    analytics: false,
  })
  return _ratelimit
}

// In-memory fallback (dev only — not distributed across serverless instances).
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()
const WINDOW_MS = 60_000

function inMemoryCheck(ip: string): boolean {
  const now = Date.now()
  const r = rateLimitMap.get(ip) ?? { count: 0, lastReset: now }
  if (now - r.lastReset > WINDOW_MS) { r.count = 0; r.lastReset = now }
  if (r.count >= LIMIT) return false
  r.count++
  rateLimitMap.set(ip, r)
  return true
}

const WRITE_ROUTES = ['/api/bots/submit', '/api/bots/register', '/api/deposits', '/api/withdraw', '/api/predictions/commit', '/api/v1/predictions']

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (!WRITE_ROUTES.some(r => pathname.startsWith(r))) return NextResponse.next()

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'

  const upstashReady =
    !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

  if (upstashReady) {
    try {
      const limiter = await getUpstashLimiter()
      const { success } = await limiter.limit(ip)
      if (!success) return new NextResponse('Too Many Requests', { status: 429 })
    } catch {
      // If Upstash is misconfigured, fall through rather than blocking all traffic.
    }
  } else {
    if (!inMemoryCheck(ip)) return new NextResponse('Too Many Requests', { status: 429 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
