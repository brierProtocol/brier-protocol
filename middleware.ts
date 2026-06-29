import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiting for POST /api/bots/submit.
//
// ⚠️  The in-memory Map below is PER-INSTANCE. On Vercel/serverless every cold
//     start and every concurrent lambda gets its own Map, so the limit is NOT
//     enforced globally — it only works as a single-process dev fallback.
//
// TODO(prod): use Upstash Redis for a distributed, durable limit.
//   1. npm i @upstash/ratelimit @upstash/redis
//   2. set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//   3. uncomment and use the limiter below:
//
//   import { Ratelimit } from '@upstash/ratelimit'
//   import { Redis } from '@upstash/redis'
//   const ratelimit = new Ratelimit({
//     redis: Redis.fromEnv(),
//     limiter: Ratelimit.slidingWindow(LIMIT, '1 m'),
//   })
//   // ...inside middleware:
//   const { success } = await ratelimit.limit(ip)
//   if (!success) return new NextResponse('Too Many Requests', { status: 429 })

const LIMIT = 10 // requests
const WINDOW = 60 * 1000 // 1 minute

// True once Upstash credentials are present. Until @upstash/* is installed and
// the block above is uncommented, we still fall back to the in-memory map.
const UPSTASH_CONFIGURED =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

// Dev-only in-memory fallback (see warning above).
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/bots/submit') || request.nextUrl.pathname.startsWith('/api/predictions/commit')) {
    const ip = (request as any).ip ?? '127.0.0.1'

    // TODO(prod): when UPSTASH_CONFIGURED, route through the Upstash limiter
    // instead of the per-instance map below.
    void UPSTASH_CONFIGURED

    const now = Date.now()
    const record = rateLimitMap.get(ip) ?? { count: 0, lastReset: now }

    if (now - record.lastReset > WINDOW) {
      record.count = 0
      record.lastReset = now
    }

    if (record.count >= LIMIT) {
      return new NextResponse('Too Many Requests', { status: 429 })
    }

    record.count++
    rateLimitMap.set(ip, record)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
