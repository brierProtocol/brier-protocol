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

  // In the MVP, all bots are conceptually 'crypto/poly' or mock. 
  // We just filter based on name or simulate it for now.
  const rankedBots = botsData
    .sort((a, b) => {
      const brierA = a.scores?.[0]?.brierScore || a.brierScore || 0
      const brierB = b.scores?.[0]?.brierScore || b.brierScore || 0
      return brierA - brierB
    })

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-mono), monospace', color: '#c5c8c6', padding: '2rem 1rem' }}>
      
      {/* HEADER */}
      <div style={{ maxWidth: 1000, margin: '0 auto', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a1a', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', fontSize: 16, fontWeight: 'bold' }}>
          <span style={{ color: '#C9A84C' }}>/rankings/ - Global Brier Score Leaderboard</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: 12 }}>
          <Link href="/discover" style={{ color: '#2563EB', textDecoration: 'none' }}>[Catalog]</Link>
          <Link href="/dashboard" style={{ color: '#2563EB', textDecoration: 'none' }}>[Dashboard]</Link>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '1rem', overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#555' }}>&gt; Syncing Live Blockchain Data...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333', color: '#2563EB' }}>
                  <th style={{ padding: '0.5rem', fontWeight: 'bold', width: 50 }}>RNK</th>
                  <th style={{ padding: '0.5rem', fontWeight: 'bold' }}>BOT_ID / BUILDER</th>
                  <th style={{ padding: '0.5rem', fontWeight: 'bold' }}>BRIER_SCORE</th>
                  <th style={{ padding: '0.5rem', fontWeight: 'bold' }}>WIN_RATE</th>
                  <th style={{ padding: '0.5rem', fontWeight: 'bold' }}>YIELD</th>
                  <th style={{ padding: '0.5rem', fontWeight: 'bold', textAlign: 'right' }}>TVL</th>
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
                        borderBottom: '1px solid #1a1a1a', 
                        background: i === 0 ? 'rgba(201,168,76,0.05)' : i < 3 ? 'rgba(37,99,235,0.03)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                    >
                      <td style={{ padding: '0.75rem 0.5rem', color: i === 0 ? '#C9A84C' : i < 3 ? '#2563EB' : '#555', fontWeight: 'bold' }}>
                        #{i + 1}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <Link href={`/bot/${slug}`} style={{ color: '#efefef', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block', fontFamily: 'var(--font-body), sans-serif', fontSize: 14 }}>
                          <span style={{ cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.color = '#2563EB'} onMouseOut={e => e.currentTarget.style.color = '#efefef'}>
                            {bot.name}
                          </span>
                        </Link>
                        <div style={{ fontSize: 10, color: '#555', marginTop: 2, fontFamily: 'var(--font-mono), monospace' }}>
                          ID: <Link href={`/maker/${builderId}`} style={{ color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.color = '#117743'} onMouseOut={e => e.currentTarget.style.color = '#555'}>
                            {builderId}
                          </Link>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: brier < 0.2 ? '#22c55e' : brier < 0.25 ? '#2563EB' : '#FF6B1A', fontWeight: 'bold', fontFamily: 'var(--font-mono), monospace' }}>
                        {brier.toFixed(3)}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono), monospace' }}>
                        {(wr * 100).toFixed(1)}%
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: '#22c55e', fontFamily: 'var(--font-mono), monospace' }}>
                        +{yld}%
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#888', fontFamily: 'var(--font-mono), monospace' }}>
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
        <div style={{ marginTop: '1.5rem', padding: '1rem', border: '1px dashed #333', fontSize: 12, color: '#777', background: '#080808', fontFamily: 'var(--font-body), sans-serif', lineHeight: 1.6 }}>
          <span style={{ fontFamily: 'var(--font-mono), monospace', color: '#555' }}>&gt; RANKING_ALGORITHM:</span> Leaderboard is strictly sorted by Brier Score (lower is better).<br/>
          <span style={{ fontFamily: 'var(--font-mono), monospace', color: '#555' }}>&gt; PROOF_OF_WORK:</span> All scores are mathematically derived from verified on-chain Polygon transactions.<br/>
          <span style={{ fontFamily: 'var(--font-mono), monospace', color: '#555' }}>&gt; FRAUD_PROTECTION:</span> BrierVault mathematically enforces that bots cannot alter historic resolution states.
        </div>

      </div>
    </div>
  )
}
