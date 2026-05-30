'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function LeaderboardPage() {
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

  const rankedBots = botsData.sort((a, b) => {
    const brierA = a.scores?.[0]?.brierScore || a.brierScore || 0
    const brierB = b.scores?.[0]?.brierScore || b.brierScore || 0
    return brierA - brierB
  })

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-mono), monospace', color: '#c5c8c6', padding: '2rem 1rem' }}>

      {/* HEADER BAR */}
      <div style={{ maxWidth: 1100, margin: '0 auto', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a1a', paddingBottom: '0.5rem', fontSize: 13 }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/" style={{ color: '#2563EB', textDecoration: 'none' }}>[Return]</Link>
          <span style={{ color: '#C9A84C' }}>/brier/ — Global Rankings</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: 12, color: '#555' }}>
          <Link href="/discover" style={{ color: '#2563EB', textDecoration: 'none' }}>[Catalog]</Link>
          <Link href="/dashboard" style={{ color: '#2563EB', textDecoration: 'none' }}>[Dashboard]</Link>
          <Link href="/list-bot" style={{ color: '#2563EB', textDecoration: 'none' }}>[Submit]</Link>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* DESCRIPTION */}
        <div style={{ marginBottom: '1.5rem', fontSize: 12, color: '#555', lineHeight: 1.6 }}>
          <span style={{ color: '#C9A84C' }}>&gt; INFO:</span> Leaderboard is strictly sorted by <span style={{ color: '#22c55e' }}>Brier Score</span> (lower = more accurate). All metrics are mathematically derived from verified on-chain Polygon transactions. Scores cannot be forged.
        </div>

        {/* TOP 3 PODIUM */}
        {!loading && rankedBots.length >= 3 && (
          <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '1.5rem' }}>
            {rankedBots.slice(0, 3).map((bot, i) => {
              const brier = bot.scores?.[0]?.brierScore ?? bot.brierScore ?? 0
              const wr = bot.scores?.[0]?.winRate ?? bot.winRate ?? 0
              const tvl = bot.currentTVL ?? bot.tvl ?? 0
              const slug = bot.slug || bot.id
              const medals = ['🥇', '🥈', '🥉']
              const accents = ['#C9A84C', '#94A3B8', '#B45309']
              const accent = accents[i]

              return (
                <motion.div key={bot.id} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } } }}>
                <Link href={`/bot/${slug}`} style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  background: '#0d0d0d',
                  border: `1px solid ${accent}30`,
                  padding: '1rem',
                  transition: 'all 0.2s',
                  display: 'block',
                  height: '100%'
                }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = `${accent}60`; e.currentTarget.style.background = '#111' }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = `${accent}30`; e.currentTarget.style.background = '#0d0d0d' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: 20 }}>{medals[i]}</span>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{bot.name}</div>
                      <div style={{ fontSize: 10, color: '#555' }}>#{i + 1} · Brier {brier.toFixed(3)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: 11 }}>
                    <div>
                      <div style={{ color: '#555', fontSize: 9, textTransform: 'uppercase' }}>Win Rate</div>
                      <div style={{ color: '#22c55e', fontWeight: 'bold' }}>{(wr * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <div style={{ color: '#555', fontSize: 9, textTransform: 'uppercase' }}>Vault TVL</div>
                      <div style={{ color: '#fff', fontWeight: 'bold' }}>${tvl.toLocaleString()}</div>
                    </div>
                  </div>
                </Link>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* DATA TABLE */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} style={{ border: '1px solid #1a1a1a', background: '#0a0a0a', overflow: 'hidden', marginBottom: '1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textAlign: 'left' }}>
            <thead>
              <tr style={{ color: '#555', borderBottom: '1px solid #1a1a1a', background: '#050505', letterSpacing: '1px' }}>
                <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>#</th>
                <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>ALGORITHM</th>
                <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>BRIER</th>
                <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>WIN RATE</th>
                <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>SHARPE</th>
                <th style={{ padding: '12px 16px', fontWeight: 'normal', textAlign: 'right' }}>TVL</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#2563EB' }}>&gt; SYNCHRONIZING_ONCHAIN_DATA...</td>
                </tr>
              ) : (
                rankedBots.map((bot, i) => {
                  const brier = bot.scores?.[0]?.brierScore ?? bot.brierScore ?? 0
                  const wr = bot.scores?.[0]?.winRate ?? bot.winRate ?? 0
                  const tvl = bot.currentTVL ?? bot.tvl ?? 0
                  const slug = bot.slug || bot.id
                  const sharpe = bot.scores?.[0]?.sharpeRatio ?? 0
                  const builderId = bot.walletAddress || bot.builder || 'anon'
                  const isTop3 = i < 3
                  const medals = ['🥇', '🥈', '🥉']

                  return (
                    <tr
                      key={bot.id}
                      style={{
                        borderBottom: '1px solid #111',
                        background: isTop3 ? 'rgba(201,168,76,0.02)' : 'transparent',
                        transition: 'background 0.15s',
                        cursor: 'pointer',
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#111'}
                      onMouseOut={e => e.currentTarget.style.background = isTop3 ? 'rgba(201,168,76,0.02)' : 'transparent'}
                      onClick={() => window.location.href=`/bot/${slug}`}
                    >
                      <td style={{ padding: '0.75rem 1rem', color: isTop3 ? '#C9A84C' : '#555', fontWeight: 700 }}>
                        {isTop3 ? medals[i] : `${i + 1}`}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div>
                          <Link href={`/bot/${slug}`} style={{ color: '#fff', textDecoration: 'none', fontWeight: 700 }}>
                            {bot.name}
                          </Link>
                          <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>
                            by{' '}
                            <Link href={`/maker/${builderId}`} style={{ color: '#555', textDecoration: 'none' }}
                              onMouseOver={e => e.currentTarget.style.color = '#C9A84C'}
                              onMouseOut={e => e.currentTarget.style.color = '#555'}
                            >
                              {builderId.substring(0, 6)}...{builderId.substring(builderId.length - 4)}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ color: brier <= 0.15 ? '#22c55e' : brier <= 0.25 ? '#4ade80' : brier <= 0.4 ? '#eab308' : '#ef4444', fontWeight: 700 }}>
                          {brier.toFixed(3)}
                        </span>
                        <div style={{ fontSize: 9, color: brier <= 0.15 ? '#22c55e' : brier <= 0.25 ? '#4ade80' : '#888', opacity: 0.7 }}>
                          {brier <= 0.15 ? 'ELITE' : brier <= 0.25 ? 'STRONG' : brier <= 0.4 ? 'MODERATE' : 'WEAK'}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: wr >= 0.6 ? '#22c55e' : wr >= 0.5 ? '#eab308' : '#888', fontWeight: 600 }}>
                        {(wr * 100).toFixed(1)}%
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: sharpe >= 1.5 ? '#22c55e' : sharpe >= 0.5 ? '#eab308' : '#888', fontWeight: 600 }}>
                        {sharpe.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#fff', fontWeight: 700 }}>
                        ${tvl.toLocaleString()}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </motion.div>

        {/* TRUST FOOTER */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '1.5rem' }}>
          {[
            { icon: '🔒', title: 'Mathematical Enforcement', desc: 'Rankings derived from Brier Score — the gold standard in probabilistic forecasting.' },
            { icon: '⛓️', title: 'On-Chain Settlement', desc: 'Every trade verified and settled through Polygon smart contracts. No manipulation.' },
            { icon: '🛡️', title: 'Zero-Trust Architecture', desc: 'HMAC-SHA256 signed signals. Historic resolution states are immutable.' },
          ].map((item, i) => (
            <div key={i} style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1rem' }}>
              <div style={{ fontSize: 16, marginBottom: '0.5rem' }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#fff', marginBottom: '0.25rem' }}>{item.title}</div>
              <div style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
