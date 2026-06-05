import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')

  if (!q || q.length < 2) {
    return NextResponse.json({ bots: [], users: [] })
  }

  try {
    const qLike = `%${q}%`
    const bots = await prisma.$queryRaw`
      SELECT id, name, slug, status, tier 
      FROM Bot 
      WHERE name LIKE ${qLike} 
         OR slug LIKE ${qLike} 
         OR description LIKE ${qLike}
      LIMIT 5
    `

    const users = await prisma.$queryRaw`
      SELECT walletAddress, name, pfpUrl 
      FROM User 
      WHERE name LIKE ${qLike} 
         OR walletAddress LIKE ${qLike}
      LIMIT 5
    `

    return NextResponse.json({ bots, users })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
