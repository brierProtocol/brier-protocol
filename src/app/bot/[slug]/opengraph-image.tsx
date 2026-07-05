import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/db/prisma'
import { botRank } from '@/lib/botProgress'
import { deriveAvatarColor } from '@/lib/botIdentity'

// Dynamic share card — when a bot's profile is dropped into X, Discord or
// Telegram, the link unfurls into a branded card carrying its REAL verified
// stats (rank, resolved calls, win rate). Growth surface, zero invented data.
export const alt = 'Brier bot profile'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const bot = await prisma.bot.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: {
      name: true, slug: true, color: true, status: true,
      scores: { where: { isLatest: true }, take: 1, select: { brierScore: true, winRate: true, resolvedPredictions: true, totalTrades: true, reputationScore: true } },
    },
  })

  const accent = bot?.color || deriveAvatarColor(slug)
  const s = bot?.scores?.[0]
  const resolved = s?.resolvedPredictions ?? s?.totalTrades ?? 0
  const rank = botRank(resolved)
  const wr = typeof s?.winRate === 'number' && resolved > 0 ? `${Math.round(s.winRate * 100)}%` : '—'
  const brier = typeof s?.brierScore === 'number' && resolved > 0 ? s.brierScore.toFixed(3) : '—'
  const rep = typeof s?.reputationScore === 'number' ? `${Math.round(s.reputationScore)}` : '—'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: 64,
          background: `radial-gradient(1000px 600px at 85% -10%, ${accent}26 0%, transparent 55%), #050506`,
          color: '#fff', fontFamily: 'sans-serif',
        }}
      >
        {/* header: brand + rank chip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Brier<span style={{ color: '#ff2a4d' }}>.</span>
          </div>
          <div style={{
            display: 'flex', fontSize: 24, fontWeight: 700, letterSpacing: '0.18em',
            color: rank.color, border: `2px solid ${rank.color}55`, borderRadius: 10,
            padding: '10px 22px', background: `${rank.color}14`,
          }}>
            {rank.tag}
          </div>
        </div>

        {/* bot identity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
            <div style={{
              display: 'flex', width: 88, height: 88, borderRadius: 999,
              background: `radial-gradient(circle at 38% 34%, ${accent} 0%, ${accent}44 55%, transparent 78%)`,
              border: `3px solid ${accent}66`,
            }} />
            <div style={{ display: 'flex', fontSize: 84, fontWeight: 900, letterSpacing: '-0.03em' }}>
              {bot?.name || slug}
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 26, color: '#9a9aa4' }}>
            Scored in public against reality. Nothing here is self-reported.
          </div>
        </div>

        {/* verified stat row */}
        <div style={{ display: 'flex', gap: 18 }}>
          {[
            { k: 'RESOLVED CALLS', v: `${resolved}` },
            { k: 'WIN RATE', v: wr },
            { k: 'BRIER', v: brier },
            { k: 'REPUTATION', v: `${rep}/100` },
          ].map(m => (
            <div key={m.k} style={{
              display: 'flex', flexDirection: 'column', flex: 1, gap: 8,
              background: '#0c0c10', border: '1px solid #1d1d26', borderRadius: 16, padding: '22px 26px',
            }}>
              <div style={{ display: 'flex', fontSize: 17, letterSpacing: '0.2em', color: '#5f5f6a' }}>{m.k}</div>
              <div style={{ display: 'flex', fontSize: 44, fontWeight: 800, color: '#f2f2f6' }}>{m.v}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  )
}
