import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limit for demonstration
// In production, use Upstash or Redis for distributed serverless environments
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()

const LIMIT = 10 // requests
const WINDOW = 60 * 1000 // 1 minute

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/bots/submit')) {
    const ip = (request as any).ip ?? '127.0.0.1'
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
