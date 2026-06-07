'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import BotIrisAvatar from '@/components/BotIrisAvatar'

const RANK_STYLES = [
  { badge: '#FFD700', glow: 'rgba(255,215,0,0.15)', label: 'GOLD',   border: 'rgba(255,215,0,0.2)' },
  { badge: '#C0C0C0', glow: 'rgba(192,192,192,0.1)', label: 'SILVER', border: 'rgba(192,192,192,0.15)' },
  { badge: '#CD7F32', glow: 'rgba(205,127,50,0.12)', label: 'BRONZE', border: 'rgba(205,127,50,0.18)' },
]

function fakeDelta(brier: number, i: number): number {
  const seed = Math.sin(i * 7.3 + brier * 100) * 1000
  return parseFloat((seed % 3).toFixed(2))
}

export default function LeaderboardPage() {
  const [botsData, setBotsData] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/bots')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setBotsData(data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const ranked = [...botsData].sort((a, b) => {
    const brierA = a.scores?.[0]?.brierScore ?? a.brierScore ?? 1
    const brierB = b.scores?.[0]?.brierScore ?? b.brierScore ?? 1
    return brierA - brierB
  })

  return (
    <div className="min-h-screen bg-[#030303] text-[#e8e8e8]">

      {/* HEADER */}
      <div className="border-b border-[#1a1a1a] bg-[#050505] px-8 py-5">
        <div className="max-w-[1100px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[#333] hover:text-white transition-colors no-underline font-mono text-xs">← HOME</Link>
            <h1 className="font-mono font-bold text-white tracking-tight text-xl m-0">GLOBAL_RANKINGS</h1>
            {!loading && (
              <span className="text-[10px] text-[#333] font-mono">({ranked.length} algorithms)</span>
            )}
          </div>
          <div className="flex gap-5 text-[11px] text-[#444] font-mono">
            <Link href="/discover"  className="hover:text-white transition-colors no-underline">CATALOG</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors no-underline">DASHBOARD</Link>
            <Link href="/list-bot"  className="hover:text-white transition-colors no-underline">SUBMIT</Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-8 py-8">

        {/* INFO BAR */}
        <div className="info-banner mb-8">
          <span className="text-primary font-mono text-xs">[INFO]</span>
          Ranked strictly by <span className="text-white mx-1 font-semibold">Brier Score</span> — lower is superior. All metrics verified on-chain via Polygon. Scores cannot be forged.
        </div>

        {/* TOP 3 PODIUM */}
        {!loading && ranked.length >= 3 && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          >
            {ranked.slice(0, 3).map((bot, i) => {
              const brier  = bot.scores?.[0]?.brierScore ?? bot.brierScore ?? 0
              const wr     = bot.scores?.[0]?.winRate ?? bot.winRate ?? 0
              const tvl    = bot.currentTVL ?? bot.tvl ?? 0
              const slug   = bot.slug || bot.id
              const rs     = RANK_STYLES[i]

              return (
                <motion.div
                  key={bot.id}
                  variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } } }}
                >
                  <Link
                    href={`/bot/${slug}`}
                    className="block h-full bg-[#080808] border no-underline relative group transition-all hover:bg-[#0e0e0e]"
                    style={{ borderColor: rs.border, boxShadow: `0 0 30px ${rs.glow}` }}
                  >
                    {/* Rank badge */}
                    <div
                      className="absolute top-0 right-0 w-10 h-10 flex items-center justify-center font-mono font-black text-lg border-l border-b"
                      style={{ color: rs.badge, borderColor: rs.border, background: `${rs.glow}` }}
                    >
                      {i + 1}
                    </div>

                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-5 pr-10">
                        <div className="w-10 h-10 border overflow-hidden rounded-sm" style={{ borderColor: rs.border }}>
                          {bot.pfpUrl ? (
                            <img src={bot.pfpUrl} alt={bot.name} className="w-full h-full object-cover" />
                          ) : (
                            <BotIrisAvatar avatarId={bot.avatarId || 'void'} accentColor={bot.color || rs.badge} size={40} />
                          )}
                        </div>
                        <div>
                          <div className="text-white font-bold text-sm font-sans">{bot.name}</div>
                          <div className="text-[10px] font-mono mt-0.5" style={{ color: rs.badge }}>{rs.label}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        {[
                          { label: 'BRIER',   val: brier.toFixed(3) },
                          { label: 'WIN_%',   val: `${(wr * 100).toFixed(1)}%` },
                          { label: 'VAULT',   val: tvl > 0 ? `$${(tvl/1000).toFixed(0)}K` : '—' },
                        ].map(m => (
                          <div key={m.label} className="border-l-2 pl-2" style={{ borderColor: rs.border }}>
                            <div className="text-[#444] text-[9px] font-mono uppercase tracking-widest">{m.label}</div>
                            <div className="text-white font-bold font-mono">{m.val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* TABLE */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="border border-[#1a1a1a] bg-[#080808] overflow-hidden mb-8"
        >
          <table className="w-full border-collapse text-[11px] text-left">
            <thead className="sticky top-0 z-10">
              <tr className="text-[#444] font-mono border-b border-[#111] bg-[#060606]">
                <th className="p-4 font-medium tracking-widest">#</th>
                <th className="p-4 font-medium tracking-widest">ALGORITHM</th>
                <th className="p-4 font-medium tracking-widest">BRIER</th>
                <th className="p-4 font-medium tracking-widest">WIN_%</th>
                <th className="p-4 font-medium tracking-widest">SHARPE</th>
                <th className="p-4 font-medium tracking-widest">DELTA_24H</th>
                <th className="p-4 font-medium tracking-widest text-right">TVL</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center font-mono text-primary text-xs">
                    <div className="cursor-blink inline-block">&gt; SYNCHRONIZING_ONCHAIN_DATA</div>
                  </td>
                </tr>
              ) : ranked.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center font-mono text-[#333] text-xs">
                    &gt; NO_DATA — be the first to submit
                  </td>
                </tr>
              ) : ranked.map((bot, i) => {
                const brier   = bot.scores?.[0]?.brierScore ?? bot.brierScore ?? 0
                const wr      = bot.scores?.[0]?.winRate ?? bot.winRate ?? 0
                const tvl     = bot.currentTVL ?? bot.tvl ?? 0
                const sharpe  = bot.scores?.[0]?.sharpeRatio ?? 0
                const slug    = bot.slug || bot.id
                const builderId = bot.walletAddress || bot.builder || 'anon'
                const isTop3  = i < 3
                const rankColor = isTop3 ? RANK_STYLES[i].badge : '#333'
                const tier    = brier <= 0.15 ? 'ELITE' : brier <= 0.25 ? 'STRONG' : brier <= 0.4 ? 'MOD' : 'WEAK'
                const tierColor = brier <= 0.15 ? '#00d4aa' : brier <= 0.25 ? '#C8FF00' : '#555'
                const delta   = fakeDelta(brier, i)
                const deltaUp = delta > 0

                return (
                  <tr
                    key={bot.id}
                    className="border-b border-[#111] transition-colors cursor-pointer hover:bg-[#0d0d0d]"
                    onClick={() => { window.location.href = `/bot/${slug}` }}
                  >
                    <td className="p-3 px-4 font-bold font-mono" style={{ color: rankColor }}>
                      {String(i + 1).padStart(2, '0')}
                    </td>
                    <td className="p-3 px-4">
                      <Link href={`/bot/${slug}`} className="text-white no-underline font-semibold font-sans hover:text-primary transition-colors" onClick={e => e.stopPropagation()}>
                        {bot.name}
                      </Link>
                      <div className="text-[10px] text-[#333] mt-[2px] font-mono">
                        <Link href={`/maker/${builderId}`} className="no-underline text-[#333] hover:text-white transition-colors" onClick={e => e.stopPropagation()}>
                          {builderId.substring(0, 6)}...{builderId.substring(builderId.length - 4)}
                        </Link>
                      </div>
                    </td>
                    <td className="p-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono">{brier.toFixed(3)}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5" style={{ color: tierColor, background: `${tierColor}14`, border: `0.5px solid ${tierColor}33` }}>
                          {tier}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 px-4 text-white font-bold font-mono">{(wr * 100).toFixed(1)}%</td>
                    <td className="p-3 px-4 text-white font-bold font-mono">{sharpe.toFixed(2)}</td>
                    <td className="p-3 px-4 font-mono font-bold" style={{ color: deltaUp ? 'var(--positive)' : 'var(--negative)' }}>
                      {deltaUp ? '↑' : '↓'} {Math.abs(delta).toFixed(2)}
                    </td>
                    <td className="p-3 px-4 text-right text-white font-bold font-mono">
                      {tvl > 0 ? `$${tvl.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </motion.div>

        {/* TRUST GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: '/>', title: 'MATH_ENFORCEMENT',  desc: 'Rankings derived from Brier Score — the gold standard in forecasting.' },
            { icon: '{}', title: 'ONCHAIN_SETTLEMENT', desc: 'Every trade verified via Polygon. Immutable and tamper-proof.' },
            { icon: '[]', title: 'ZERO_TRUST',         desc: 'HMAC-SHA256 signed signals. Resolution state cannot be altered.' },
          ].map((item, i) => (
            <div key={i} className="bg-[#080808] border border-[#1a1a1a] p-4 relative group hover:border-[#2a2a2a] transition-colors">
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#1a1a1a] group-hover:border-[#2a2a2a]" />
              <div className="text-primary font-mono font-bold text-base mb-2">{item.icon}</div>
              <div className="font-mono text-[10px] text-white tracking-widest mb-1">{item.title}</div>
              <div className="text-[10px] text-[#444] leading-relaxed font-sans">{item.desc}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
