'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import BotCharacter from '@/components/BotCharacter'

const ASCII_LOGO = `
    ____       _               ____             __                 __
   / __ )_____(_)__  _____    / __ \\_________  / /_____  _________/ /
  / __  / ___/ / _ \\/ ___/   / /_/ / ___/ __ \\/ __/ __ \\/ ___/ __  / 
 / /_/ / /  / /  __/ /      / ____/ /  / /_/ / /_/ /_/ / /__/ /_/ /  
/_____/_/  /_/\\___/_/      /_/   /_/   \\____/\\__/\\____/\\___/\\__,_/   
`

export default function Home() {
  const [topBots, setTopBots] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/bots')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Sort by Brier Score and take top 5
          const sorted = data.sort((a: any, b: any) => {
            const brierA = a.scores?.[0]?.brierScore ?? a.brierScore ?? 1
            const brierB = b.scores?.[0]?.brierScore ?? b.brierScore ?? 1
            return brierA - brierB
          })
          setTopBots(sorted.slice(0, 5))
        }
      })
      .catch(console.error)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#c5c8c6', fontFamily: 'var(--font-mono), monospace', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        {/* ASCII HEADER */}
        <div style={{ color: '#2563EB', whiteSpace: 'pre', fontSize: 'clamp(8px, 1.5vw, 14px)', fontWeight: 'bold', marginBottom: '2rem', lineHeight: 1.2 }}>
          {ASCII_LOGO}
          <div style={{ color: '#555', marginTop: '0.5rem' }}>
            &gt; INSTITUTIONAL PREDICTION MARKET INFRASTRUCTURE
            <br />
            &gt; POLYGON NETWORK TARGET ACQUIRED
          </div>
        </div>

        {/* MOTD */}
        <div style={{ border: '1px solid #1a1a1a', background: '#0a0a0a', padding: '1rem', marginBottom: '2rem' }}>
          <div style={{ color: '#2563EB', fontWeight: 'bold', borderBottom: '1px solid #1a1a1a', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
            --- MESSAGE OF THE DAY ---
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, fontFamily: 'var(--font-body), sans-serif' }}>
            <span style={{ color: '#7ec87e' }}>&gt;Welcome to Brier V1.</span><br/>
            Humans are terrible at probability. Machines are not.<br/>
            Brier is a decentralized index of algorithmic trading bots executing on prediction markets (Polymarket, Kalshi).<br/>
            <br/>
            <span style={{ color: '#cc0000', fontWeight: 'bold' }}>RULES OF ENGAGEMENT:</span><br/>
            1. All bots must survive a 30-day on-chain paper trading phase.<br/>
            2. Bots are ranked strictly by their Brier Score (lower = better).<br/>
            3. Vaults open automatically for top-tier bots. Depositors yield profits. Builders earn 10% performance fees.<br/>
          </div>
        </div>

        {/* DIRECTORY LINKS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
          
          <div style={{ border: '1px solid #1a1a1a', background: '#0a0a0a', padding: '1rem' }}>
            <div style={{ color: '#2563EB', fontWeight: 'bold', marginBottom: '0.5rem', fontFamily: 'var(--font-body), sans-serif' }}>[ INVESTORS ]</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: '1rem', height: 40, fontFamily: 'var(--font-body), sans-serif' }}>
              Deploy capital into verified algorithmic prediction vaults. Zero emotion, fully transparent.
            </div>
            <Link href="/discover" style={{ display: 'inline-block', background: '#2563EB', color: '#000', textDecoration: 'none', padding: '6px 16px', fontWeight: 'bold', fontSize: 13 }}>
              &gt; ENTER CATALOG
            </Link>
          </div>

          <div style={{ border: '1px dashed #333', background: '#0a0a0a', padding: '1rem' }}>
            <div style={{ color: '#22c55e', fontWeight: 'bold', marginBottom: '0.5rem', fontFamily: 'var(--font-body), sans-serif' }}>[ BUILDERS ]</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: '1rem', height: 40, fontFamily: 'var(--font-body), sans-serif' }}>
              Submit your prediction model. Prove your Brier Score on-chain. Attract capital.
            </div>
            <Link href="/list-bot" style={{ display: 'inline-block', border: '1px solid #22c55e', color: '#22c55e', textDecoration: 'none', padding: '6px 16px', fontWeight: 'bold', fontSize: 13 }}>
              &gt; SUBMIT ALGORITHM
            </Link>
          </div>

        </div>

        {/* TOP BOTS — LIVE DATA */}
        <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ color: '#C9A84C', fontWeight: 'bold' }}>&gt;&gt; TOP ALGORITHMS</div>
            <div style={{ fontSize: 12, color: '#555', fontFamily: 'var(--font-mono), monospace' }}>Network: Polygon | Currency: USDC</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', color: '#555' }}>
                <th style={{ padding: '0.5rem', fontWeight: 'normal' }}>BOT_ID</th>
                <th style={{ padding: '0.5rem', fontWeight: 'normal' }}>BRIER_SCORE</th>
                <th style={{ padding: '0.5rem', fontWeight: 'normal' }}>WIN_RATE</th>
                <th style={{ padding: '0.5rem', fontWeight: 'normal' }}>STATUS</th>
                <th style={{ padding: '0.5rem', fontWeight: 'normal', textAlign: 'right' }}>TVL</th>
              </tr>
            </thead>
            <tbody>
              {topBots.length > 0 ? topBots.map((bot, i) => {
                const brier = bot.scores?.[0]?.brierScore ?? bot.brierScore ?? 0
                const wr = bot.scores?.[0]?.winRate ?? bot.winRate ?? 0
                const tvl = bot.currentTVL ?? bot.tvl ?? 0
                return (
                  <tr key={bot.id} style={{ borderBottom: '1px solid #1a1a1a', background: i === 0 ? 'rgba(37,99,235,0.03)' : 'transparent' }}>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <Link href={`/bot/${bot.slug || bot.id}`} style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 'bold' }}>[{bot.name}]</Link>
                      <span style={{ color: '#555', marginLeft: 8, fontSize: 10 }}>
                        by <Link href={`/maker/${bot.walletAddress || 'anon'}`} style={{ color: '#555', textDecoration: 'none' }}
                          onMouseOver={e => e.currentTarget.style.color = '#117743'}
                          onMouseOut={e => e.currentTarget.style.color = '#555'}
                        >{(bot.walletAddress || 'anon').substring(0, 6)}...{(bot.walletAddress || 'anon').slice(-4)}</Link>
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: brier < 0.25 ? '#22c55e' : '#FF6B1A', fontFamily: 'var(--font-mono), monospace' }}>{brier.toFixed(3)}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono), monospace' }}>{(wr * 100).toFixed(1)}%</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{ 
                        fontSize: 10, padding: '2px 6px', 
                        background: (bot.status || '').toLowerCase() === 'live' ? 'rgba(34,197,94,0.15)' : 'rgba(168,85,247,0.15)',
                        color: (bot.status || '').toLowerCase() === 'live' ? '#22c55e' : '#a855f7',
                        border: `1px solid ${(bot.status || '').toLowerCase() === 'live' ? '#22c55e33' : '#a855f733'}`
                      }}>{(bot.status || 'PAPER').toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono), monospace' }}>${tvl.toLocaleString()}</td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#555' }}>Loading algorithms...</td>
                </tr>
              )}
            </tbody>
          </table>
          <div style={{ textAlign: 'right', marginTop: '1rem' }}>
            <Link href="/discover" style={{ color: '#555', textDecoration: 'none', fontSize: 12 }}>
              [View full directory...]
            </Link>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ marginTop: '4rem', borderTop: '1px solid #1a1a1a', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#555' }}>
          <div>Brier v1.0.0-rc</div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span style={{ cursor: 'pointer' }}>[Docs]</span>
            <span style={{ cursor: 'pointer' }}>[Twitter]</span>
            <span style={{ cursor: 'pointer' }}>[GitHub]</span>
          </div>
        </div>

      </div>
    </div>
  )
}

