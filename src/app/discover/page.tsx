'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import BotCharacter from '@/components/BotCharacter'

export default function DiscoverPage() {
  const [activeSort, setActiveSort] = useState<'brier' | 'yield' | 'tvl' | 'new'>('brier')
  const [search, setSearch] = useState('')

  const [botsData, setBotsData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/bots')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setBotsData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const getBrier = (b: any) => b.scores?.[0]?.brierScore ?? b.brierScore ?? 0
  const getTvl = (b: any) => b.currentTVL ?? b.tvl ?? 0
  const getYield = (b: any) => b.monthlyYield ?? 0
  const getCreated = (b: any) => new Date(b.createdAt || 0).getTime()

  const filteredBots = botsData.filter(b => {
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
    <div style={{ minHeight: '100vh', background: '#000000', color: '#EFEFEF', padding: '3rem 1.5rem', fontFamily: 'var(--font-mono), monospace' }}>
      
      {/* HEADER SECTION */}
      <div style={{ maxWidth: 1200, margin: '0 auto', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px dashed #2563EB', paddingBottom: '1.5rem', flexWrap: 'wrap', gap: '2rem' }}>
          
          <div>
            <div style={{ color: '#2563EB', fontSize: '14px', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.5rem' }}>
              &gt; ALGORITHM_CATALOG.EXE
            </div>
            <p style={{ color: '#888', margin: 0, fontSize: '12px' }}>
              &gt; SYS_MSG: Deploy capital into verified quantitative models.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: 8, color: '#00FF00', fontSize: '12px', fontWeight: 700 }}>&gt;</span>
              <input 
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="SYS_QUERY: [___]" 
                style={{ 
                  background: '#030303', 
                  border: '1px solid #333', 
                  color: '#00FF00', 
                  fontFamily: 'var(--font-mono), monospace', 
                  padding: '8px 10px 8px 24px', 
                  outline: 'none', 
                  width: 260,
                  fontSize: '12px',
                  transition: 'border-color 0.2s ease'
                }} 
                onFocus={e => { e.currentTarget.style.borderColor = '#00FF00'; e.currentTarget.style.boxShadow = '0 0 8px rgba(0,255,0,0.2)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
            
            <Link href="/list-bot" style={{ color: '#00C9C0', textDecoration: 'none', fontSize: '12px', fontWeight: 700 }} onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'} onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}>
              [SUBMIT_ALGORITHM]
            </Link>
          </div>
        </div>
        
        {/* FILTERS */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', fontSize: '12px', alignItems: 'center' }}>
          <span style={{ color: '#666' }}>&gt; SORT_BY:</span>
          {[
            { id: 'brier', label: 'BRIER_SCORE' },
            { id: 'yield', label: 'MONTHLY_YIELD' },
            { id: 'tvl', label: 'TOTAL_VALUE_LOCKED' },
            { id: 'new', label: 'NEWEST' },
          ].map(s => (
            <button 
              key={s.id} 
              onClick={() => setActiveSort(s.id as any)}
              style={{ 
                background: 'transparent',
                border: 'none',
                color: activeSort === s.id ? '#00FF00' : '#555', 
                cursor: 'pointer', 
                fontWeight: activeSort === s.id ? 700 : 400,
                padding: 0,
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '12px'
              }}
            >
              [{s.label}]
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* CATALOG GRID */}
        {loading ? (
          <div style={{ color: '#00FF00', fontSize: '14px', textAlign: 'center', padding: '4rem' }}>
            &gt; Syncing indexer database...
          </div>
        ) : filteredBots.length === 0 ? (
          <div style={{ color: '#555', fontSize: '14px', textAlign: 'center', padding: '4rem' }}>
            &gt; NO_ALGORITHMS_FOUND
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {filteredBots.map((b, i) => {
            const brier = getBrier(b)
            const wr = b.scores?.[0]?.winRate ?? b.winRate ?? 0
            const tvl = getTvl(b)
            const yld = getYield(b)
            const isLive = (b.status || '').toLowerCase() === 'live'
            
            return (
            <Link href={`/bot/${b.slug || b.id}`} key={b.id} style={{ 
              textDecoration: 'none', 
              color: 'inherit', 
              display: 'flex', 
              flexDirection: 'column', 
              background: '#030303',
              border: '1px solid #333',
              transition: 'all 0.2s ease',
            }}
              onMouseOver={e => {
                e.currentTarget.style.borderColor = '#00FF00'
                e.currentTarget.style.background = '#050505'
              }}
              onMouseOut={e => {
                e.currentTarget.style.borderColor = '#333'
                e.currentTarget.style.background = '#030303'
              }}
            >
              <div style={{ color: '#2563EB', padding: '0.75rem 1rem', borderBottom: '1px dashed #333', fontSize: '12px', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                <span>+-- [ {b.name.toUpperCase()} ] --+</span>
                <span style={{ color: isLive ? '#00FF00' : '#00C9C0' }}>[{isLive ? 'LIVE' : 'PAPER'}]</span>
              </div>

              {/* Bot Image Frame */}
              <div style={{ 
                width: '100%', 
                background: '#000', 
                display: 'flex', 
                justifyContent: 'center', 
                padding: '1.5rem 0', 
                borderBottom: '1px dashed #333'
              }}>
                <BotCharacter mood={b.mood as any} size={70} />
              </div>

              {/* Data Rows */}
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>&gt; MAKER:</span>
                  <span style={{ color: '#C9A84C' }}>{(b.builder || b.walletAddress || 'anon').substring(0, 8)}...</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>&gt; BRIER_SCORE:</span>
                  <span style={{ color: brier <= 0.25 ? '#00FF00' : '#ef4444', fontWeight: 700 }}>{brier.toFixed(3)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>&gt; WIN_RATE:</span>
                  <span style={{ color: '#EFEFEF' }}>{(wr * 100).toFixed(1)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>&gt; MTH_YIELD:</span>
                  <span style={{ color: yld > 0 ? '#00FF00' : '#888' }}>{yld > 0 ? '+' : ''}{yld}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #333', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{ color: '#666' }}>&gt; VAULT_TVL:</span>
                  <span style={{ color: '#fff', fontWeight: 700 }}>${tvl.toLocaleString()}</span>
                </div>
              </div>
            </Link>
            )
          })}
          </div>
        )}
      </div>
    </div>
  )
}
