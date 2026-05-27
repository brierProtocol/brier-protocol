'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function LeaderboardPage() {
  const [filter, setFilter] = useState<'all'|'polymarket'|'kalshi'>('all')
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

  const rankedBots = botsData
    .sort((a, b) => {
      const brierA = a.scores?.[0]?.brierScore || a.brierScore || 0
      const brierB = b.scores?.[0]?.brierScore || b.brierScore || 0
      return brierA - brierB
    })

  return (
    <div style={{ minHeight: '100vh', background: '#000000', fontFamily: 'var(--font-mono), monospace', color: '#EFEFEF', padding: '3rem 1.5rem' }}>
      
      {/* HEADER */}
      <div style={{ maxWidth: 1000, margin: '0 auto', marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #2563EB', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ color: '#2563EB', fontSize: '14px', fontWeight: 700, letterSpacing: '1px' }}>
          &gt; GLOBAL_RANKINGS.EXE
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '12px' }}>
          <Link href="/discover" style={{ color: '#00C9C0', textDecoration: 'none' }}>[CATALOG]</Link>
          <Link href="/dashboard" style={{ color: '#00FF00', textDecoration: 'none' }}>[DASHBOARD]</Link>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        <div style={{ border: '1px solid #333', background: '#030303', padding: '1.5rem', overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#00FF00', animation: 'pulse-badge 1s infinite' }}>&gt; SYNCING_ONCHAIN_METRICS...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px dashed #333', color: '#666' }}>
                  <th style={{ padding: '0.5rem 0.5rem 1rem 0.5rem', fontWeight: 'normal', width: 60 }}>[RANK]</th>
                  <th style={{ padding: '0.5rem 0.5rem 1rem 0.5rem', fontWeight: 'normal' }}>[ALGORITHM]</th>
                  <th style={{ padding: '0.5rem 0.5rem 1rem 0.5rem', fontWeight: 'normal' }}>[BRIER]</th>
                  <th style={{ padding: '0.5rem 0.5rem 1rem 0.5rem', fontWeight: 'normal' }}>[WIN_RATE]</th>
                  <th style={{ padding: '0.5rem 0.5rem 1rem 0.5rem', fontWeight: 'normal' }}>[YIELD]</th>
                  <th style={{ padding: '0.5rem 0.5rem 1rem 0.5rem', fontWeight: 'normal', textAlign: 'right' }}>[VAULT_TVL]</th>
                </tr>
              </thead>
              <tbody>
                {rankedBots.map((bot, i) => {
                  const brier = bot.scores?.[0]?.brierScore ?? bot.brierScore ?? 0
                  const wr = bot.scores?.[0]?.winRate ?? bot.winRate ?? 0
                  const yld = bot.monthlyYield ?? 0
                  const tvl = bot.currentTVL ?? bot.tvl ?? 0
                  const builderId = bot.walletAddress || bot.builder || 'anon'
                  const slug = bot.slug || bot.id

                  return (
                    <tr 
                      key={bot.id} 
                      style={{ 
                        borderBottom: '1px solid #111', 
                        background: i === 0 ? 'rgba(201,168,76,0.1)' : 'transparent',
                        cursor: 'pointer'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#111'}
                      onMouseOut={e => e.currentTarget.style.background = i === 0 ? 'rgba(201,168,76,0.1)' : 'transparent'}
                    >
                      <td style={{ padding: '1rem 0.5rem', color: i === 0 ? '#C9A84C' : '#666', fontWeight: 700 }}>
                        #{i + 1}
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <Link href={`/bot/${slug}`} style={{ color: '#EFEFEF', textDecoration: 'none', fontWeight: 700 }}>
                            [{bot.name}]
                          </Link>
                          <span style={{ fontSize: '11px', color: '#666' }}>
                            &gt; MAKER: <Link href={`/maker/${builderId}`} style={{ color: '#C9A84C', textDecoration: 'none' }} onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'} onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}>
                              {builderId.substring(0, 8)}...
                            </Link>
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 0.5rem', color: brier <= 0.25 ? '#00FF00' : '#ef4444', fontWeight: 700 }}>
                        {brier.toFixed(3)}
                      </td>
                      <td style={{ padding: '1rem 0.5rem', color: '#EFEFEF' }}>
                        {(wr * 100).toFixed(1)}%
                      </td>
                      <td style={{ padding: '1rem 0.5rem', color: yld > 0 ? '#00FF00' : '#888' }}>
                        {yld > 0 ? '+' : ''}{yld}%
                      </td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#EFEFEF' }}>
                        ${tvl.toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        
        {/* EXPLANATION TERMINAL */}
        <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #2563EB', background: '#030303', fontSize: '12px', color: '#888', lineHeight: 1.6 }}>
          <div style={{ color: '#2563EB', marginBottom: '1rem' }}>+-- [ SYSTEM PROTOCOLS ] --------------------------+</div>
          <span style={{ color: '#00C9C0' }}>&gt; RANKING_ALGORITHM:</span> Leaderboard is strictly sorted by Brier Score (lower is better).<br/>
          <span style={{ color: '#00C9C0' }}>&gt; PROOF_OF_WORK:</span> All scores are mathematically derived from verified on-chain Polygon transactions.<br/>
          <span style={{ color: '#00C9C0' }}>&gt; FRAUD_PROTECTION:</span> BrierVault mathematically enforces that bots cannot alter historic resolution states.
        </div>

      </div>
    </div>
  )
}
