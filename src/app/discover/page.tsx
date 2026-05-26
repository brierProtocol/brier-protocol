'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { bots } from '@/data/bots'
import BotCharacter from '@/components/BotCharacter'

export default function DiscoverPage() {
  const [activeSort, setActiveSort] = useState<'brier' | 'yield' | 'tvl' | 'new'>('brier')
  const [search, setSearch] = useState('')

  const [botsData, setBotsData] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/bots')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setBotsData(data)
      })
      .catch(console.error)
  }, [])

  const getBrier = (b: any) => b.scores?.[0]?.brierScore ?? b.brierScore ?? 0
  const getTvl = (b: any) => b.currentTVL ?? b.tvl ?? 0
  const getYield = (b: any) => b.monthlyYield ?? 0
  const getCreated = (b: any) => new Date(b.createdAt || 0).getTime()

  const filteredBots = (botsData.length > 0 ? botsData : bots).filter(b => {
    if (search && !b.name.toLowerCase().includes(search.toLowerCase()) && !(b.builder || b.walletAddress || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  }).sort((a, b) => {
    if (activeSort === 'brier') return getBrier(a) - getBrier(b)
    if (activeSort === 'yield') return getYield(b) - getYield(a)
    if (activeSort === 'tvl') return getTvl(b) - getTvl(a)
    if (activeSort === 'new') return getCreated(b) - getCreated(a)
    return 0
  })

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-mono), monospace', color: '#c5c8c6', padding: '2rem 1rem' }}>
      
      {/* HEADER BAR */}
      <div style={{ maxWidth: 1200, margin: '0 auto', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a1a', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', fontSize: 16, fontWeight: 'bold' }}>
          <span style={{ color: '#2563EB' }}>/catalog/ - Active Vaults & Bots</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input 
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search catalog..." 
            style={{ background: '#0a0a0a', border: '1px solid #333', color: '#fff', fontFamily: 'inherit', padding: '4px 8px', outline: 'none', width: 200 }} 
          />
          <div style={{ fontSize: 12, color: '#555' }}>
            [<Link href="/dashboard" style={{ color: '#2563EB', textDecoration: 'none' }}>Dashboard</Link>] 
            [<Link href="/list-bot" style={{ color: '#2563EB', textDecoration: 'none' }}>Submit Algorithm</Link>]
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* FILTERS / SORT */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', fontSize: 12 }}>
          <span style={{ color: '#555' }}>Sort By:</span>
          {[
            { id: 'brier', label: 'Brier Score' },
            { id: 'yield', label: 'Yield' },
            { id: 'tvl', label: 'TVL' },
            { id: 'new', label: 'Newest' },
          ].map(s => (
            <span 
              key={s.id} 
              onClick={() => setActiveSort(s.id as any)}
              style={{ color: activeSort === s.id ? '#2563EB' : '#c5c8c6', cursor: 'pointer', fontWeight: activeSort === s.id ? 'bold' : 'normal' }}
            >
              [{s.label}]
            </span>
          ))}
        </div>

        {/* CATALOG GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
          {filteredBots.map((b, i) => {
            const brier = getBrier(b)
            const wr = b.scores?.[0]?.winRate ?? b.winRate ?? 0
            const tvl = getTvl(b)
            const yld = getYield(b)
            return (
            <Link href={`/bot/${b.slug || b.id}`} key={b.id} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'transform 0.2s' }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ width: '100%', border: '1px solid #1a1a1a', background: '#0a0a0a', display: 'flex', justifyContent: 'center', padding: '1rem 0', position: 'relative' }}>
                <BotCharacter mood={b.mood as any} size={80} />
                <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 9, color: (b.status || '').toLowerCase() === 'live' ? '#22c55e' : '#a855f7' }}>
                  [{(b.status || 'PAPER').toUpperCase()}]
                </div>
              </div>
              <div style={{ width: '100%', fontSize: 11, marginTop: '0.5rem', lineHeight: 1.4 }}>
                <div style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-body), sans-serif' }}>
                  {b.name}
                </div>
                <Link href={`/maker/${b.builder || b.walletAddress || 'anon'}`} style={{ color: '#117743', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', textDecoration: 'none', fontSize: 11, fontFamily: 'var(--font-mono), monospace' }}
                  onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}
                >
                  ID: {b.builder || b.walletAddress || 'anon'}
                </Link>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#777', marginTop: 4, fontFamily: 'var(--font-mono), monospace' }}>
                  <span>Br: <span style={{ color: brier < 0.25 ? '#22c55e' : '#FF6B1A' }}>{brier.toFixed(3)}</span></span>
                  <span>Wr: <span style={{ color: '#22c55e' }}>{(wr*100).toFixed(0)}%</span></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#777', fontFamily: 'var(--font-mono), monospace' }}>
                  <span>Yld: <span style={{ color: '#22c55e' }}>+{yld}%</span></span>
                  <span>TVL: ${tvl >= 1000 ? (tvl/1000).toFixed(0)+'K' : tvl}</span>
                </div>
                <div style={{ color: '#aaa', marginTop: 8, height: 45, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', fontFamily: 'var(--font-body), sans-serif', fontSize: 12, lineHeight: 1.5 }}>
                  {b.description || b.tagline}
                </div>
              </div>
            </Link>
            )
          })}
          {filteredBots.length === 0 && (
            <div style={{ gridColumn: '1 / -1', color: '#777', padding: '2rem 0', textAlign: 'center' }}>
              &gt; No results found.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
