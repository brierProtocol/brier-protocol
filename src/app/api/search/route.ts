import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ bots: [], users: [] })
  }

  try {
    // Prisma `contains` con mode 'insensitive' => ILIKE en Postgres.
    // (El SQL crudo anterior usaba `FROM Bot` sin comillas y `LIKE`, que en
    //  Postgres falla: identificadores sin comillas se pasan a minúsculas y
    //  LIKE distingue mayúsculas => 0 resultados / error de relación.)
    const [bots, users] = await Promise.all([
      prisma.bot.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, slug: true, status: true, tier: true, pfpUrl: true },
        take: 5,
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { handle: { contains: q, mode: 'insensitive' } },
            { walletAddress: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { walletAddress: true, name: true, handle: true, pfpUrl: true },
        take: 5,
      }),
    ])

    return NextResponse.json({ bots, users })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
