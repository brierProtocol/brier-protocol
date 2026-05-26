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
    <div style={{ minHeight: '100vh', background: '#050505', color: '#EFEFEF', padding: '3rem 1.5rem', fontFamily: 'var(--font-body), sans-serif' }}>
      
      {/* HEADER SECTION */}
      <div style={{ maxWidth: 1200, margin: '0 auto', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.5rem', flexWrap: 'wrap', gap: '2rem' }}>
          
          <div>
            <h1 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#fff' }}>
              Algorithm Catalog
            </h1>
            <p style={{ color: '#888', margin: '0.5rem 0 0 0', fontSize: '0.95rem' }}>
              Deploy capital into verified quantitative models. Objective reality execution.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <input 
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search index..." 
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  color: '#fff', 
                  fontFamily: 'var(--font-mono), monospace', 
                  padding: '10px 16px', 
                  outline: 'none', 
                  width: 260,
                  borderRadius: '4px',
                  fontSize: '12px',
                  transition: 'border-color 0.3s ease'
                }} 
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.5)'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            
            <Link href="/list-bot" style={{ 
              background: '#2563EB', 
              color: '#fff', 
              textDecoration: 'none', 
              padding: '10px 20px', 
              borderRadius: '4px',
              fontFamily: 'var(--font-body), sans-serif',
              fontWeight: 600,
              fontSize: '13px',
              transition: 'background 0.2s ease, transform 0.2s ease',
              boxShadow: '0 4px 14px 0 rgba(37,99,235,0.39)'
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#1d4ed8'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Submit Algorithm
            </Link>
          </div>
        </div>
        
        {/* FILTERS */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', fontSize: '13px', fontFamily: 'var(--font-body), sans-serif', alignItems: 'center' }}>
          <span style={{ color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '11px', fontWeight: 600 }}>Sort By</span>
          {[
            { id: 'brier', label: 'Brier Score' },
            { id: 'yield', label: 'Monthly Yield' },
            { id: 'tvl', label: 'Total Value Locked' },
            { id: 'new', label: 'Newly Listed' },
          ].map(s => (
            <button 
              key={s.id} 
              onClick={() => setActiveSort(s.id as any)}
              style={{ 
                background: activeSort === s.id ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                border: `1px solid ${activeSort === s.id ? 'rgba(37, 99, 235, 0.3)' : 'transparent'}`,
                color: activeSort === s.id ? '#60a5fa' : '#888', 
                cursor: 'pointer', 
                fontWeight: activeSort === s.id ? 600 : 400,
                padding: '6px 12px',
                borderRadius: '20px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={e => { if (activeSort !== s.id) e.currentTarget.style.color = '#ccc' }}
              onMouseOut={e => { if (activeSort !== s.id) e.currentTarget.style.color = '#888' }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* CATALOG GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
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
              background: '#0A0A0A',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '8px',
              overflow: 'hidden',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative'
            }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-6px)'
                e.currentTarget.style.boxShadow = '0 12px 40px -10px rgba(37,99,235,0.15)'
                e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)'
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
              }}
            >
              {/* Card Header: Character & Status */}
              <div style={{ 
                width: '100%', 
                background: 'linear-gradient(180deg, rgba(20,20,20,1) 0%, rgba(10,10,10,1) 100%)', 
                display: 'flex', 
                justifyContent: 'center', 
                padding: '2rem 0', 
                position: 'relative',
                borderBottom: '1px solid rgba(255,255,255,0.03)'
              }}>
                <BotCharacter mood={b.mood as any} size={80} />
                
                {/* Status Badge */}
                <div style={{ 
                  position: 'absolute', 
                  top: 12, 
                  right: 12, 
                  fontSize: '10px', 
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: isLive ? 'rgba(34,197,94,0.1)' : 'rgba(168,85,247,0.1)',
                  color: isLive ? '#4ade80' : '#c084fc',
                  border: `1px solid ${isLive ? 'rgba(34,197,94,0.2)' : 'rgba(168,85,247,0.2)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: isLive ? '#4ade80' : '#c084fc', boxShadow: `0 0 8px ${isLive ? '#4ade80' : '#c084fc'}` }}></div>
                  {(b.status || 'PAPER').toUpperCase()}
                </div>
              </div>

              {/* Card Body: Info & Data */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                
                {/* Identity */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ 
                    fontFamily: 'var(--font-display), sans-serif', 
                    fontSize: '1.25rem', 
                    fontWeight: 700, 
                    margin: '0 0 4px 0', 
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {b.name}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#555' }}>Built by</span>
                    <Link href={`/maker/${b.builder || b.walletAddress || 'anon'}`} style={{ 
                      color: '#C9A84C', 
                      textDecoration: 'none', 
                      fontSize: '12px', 
                      fontFamily: 'var(--font-mono), monospace',
                      background: 'rgba(201, 168, 76, 0.1)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(201, 168, 76, 0.2)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(201, 168, 76, 0.1)'}
                    >
                      {(b.builder || b.walletAddress || 'anon').substring(0, 8)}...
                    </Link>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  
                  {/* Brier Score */}
                  <div>
                    <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Brier Score</div>
                    <div style={{ 
                      fontFamily: 'var(--font-mono), monospace', 
                      fontSize: '18px', 
                      color: brier <= 0.25 ? '#4ade80' : '#f87171',
                      fontWeight: 500
                    }}>
                      {brier.toFixed(3)}
                    </div>
                  </div>

                  {/* Win Rate */}
                  <div>
                    <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Win Rate</div>
                    <div style={{ 
                      fontFamily: 'var(--font-mono), monospace', 
                      fontSize: '18px', 
                      color: '#fff',
                      fontWeight: 500
                    }}>
                      {(wr*100).toFixed(1)}%
                    </div>
                  </div>

                  {/* TVL */}
                  <div>
                    <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Vault TVL</div>
                    <div style={{ 
                      fontFamily: 'var(--font-mono), monospace', 
                      fontSize: '15px', 
                      color: '#EFEFEF'
                    }}>
                      ${tvl.toLocaleString()}
                    </div>
                  </div>

                  {/* Yield */}
                  <div>
                    <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>30d Yield</div>
                    <div style={{ 
                      fontFamily: 'var(--font-mono), monospace', 
                      fontSize: '15px', 
                      color: yld > 0 ? '#4ade80' : '#888'
                    }}>
                      {yld > 0 ? '+' : ''}{yld}%
                    </div>
                  </div>

                </div>

                {/* Description */}
                <div style={{ 
                  color: '#888', 
                  fontSize: '12px', 
                  lineHeight: 1.6, 
                  marginTop: 'auto',
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                  paddingTop: '1rem',
                  display: '-webkit-box', 
                  WebkitLineClamp: 2, 
                  WebkitBoxOrient: 'vertical', 
                  overflow: 'hidden'
                }}>
                  {b.description || b.tagline}
                </div>
              </div>
            </Link>
            )
          })}
          
          {filteredBots.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '4rem 0', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px' }}>
              <div style={{ color: '#888', fontSize: '14px', fontFamily: 'var(--font-mono), monospace' }}>
                &gt; No matching algorithms found in the index.
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
