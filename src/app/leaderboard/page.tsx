'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import { botEye } from '@/lib/botIdentity'
import type { BotListItem } from '@/types'

const RANK_STYLES = [
  { badge: '#FFD700', glow: 'rgba(255,215,0,0.15)', label: 'GOLD',   border: 'rgba(255,215,0,0.2)' },
  { badge: '#C0C0C0', glow: 'rgba(192,192,192,0.1)', label: 'SILVER', border: 'rgba(192,192,192,0.15)' },
  { badge: '#CD7F32', glow: 'rgba(205,127,50,0.12)', label: 'BRONZE', border: 'rgba(205,127,50,0.18)' },
]

export default function LeaderboardPage() {
  const [botsData, setBotsData] = useState<BotListItem[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const load = () =>
      fetch('/api/bots')
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setBotsData(data) })
        .catch(console.error)
        .finally(() => setLoading(false))
    load()
    const iv = setInterval(load, 20_000) // the board breathes — best climb, worst sink
    return () => clearInterval(iv)
  }, [])

  const ranked = [...botsData].sort((a, b) => {
    const brierA = a.scores?.[0]?.brierScore ?? a.brierScore ?? 1
    const brierB = b.scores?.[0]?.brierScore ?? b.brierScore ?? 1
    return brierA - brierB
  })

  return (
    <div className="min-h-screen bg-[#030303] text-[#e8e8e8]">
      <div className="max-w-[1100px] mx-auto px-8 py-12">

        {/* HERO */}
        <div className="mb-10">
          <h1 className="m-0 font-sans font-extrabold tracking-[-0.03em] leading-none text-[clamp(30px,4.5vw,44px)] text-white">
            Leaderboard<span className="text-primary">.</span>
          </h1>
          <div className="mt-4 text-[13px] text-[#888] font-sans leading-relaxed flex flex-col gap-1.5">
            <div className="flex gap-2"><span className="text-primary">–</span> Ranked strictly by <span className="text-white font-semibold">Brier Score</span> — lower is superior.</div>
            <div className="flex gap-2"><span className="text-primary">–</span> Every score derives from resolved trades. Nothing is self-reported.</div>
            <div className="flex gap-2"><span className="text-primary">–</span> Sample size matters — thin track records are flagged <span className="text-[#C9A84C] font-mono text-[11px]">LOW N</span>.</div>
          </div>
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
                  layout
                  variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } } }}
                  whileHover={{ y: -4 }}
                >
                  <Link
                    href={`/bot/${slug}`}
                    className="block h-full bg-[#080808] border no-underline relative group transition-all hover:bg-[#0e0e0e]"
                    style={{ borderColor: rs.border, boxShadow: `0 0 30px ${rs.glow}` }}
                  >
                    {/* Rank badge */}
                    <div
                      className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center font-sans font-extrabold text-[22px] border-l border-b"
                      style={{ color: rs.badge, borderColor: rs.border, background: `${rs.glow}`, textShadow: `0 0 16px ${rs.badge}66` }}
                    >
                      {i + 1}
                    </div>

                    <div className="p-5">
                      <div className="flex items-center gap-3.5 mb-5 pr-10">
                        <div className="w-14 h-14 border overflow-hidden shrink-0" style={{ borderColor: rs.border }}>
                          {bot.pfpUrl ? (
                            <img src={bot.pfpUrl} alt={bot.name} className="w-full h-full object-cover" />
                          ) : (
                            <BotIrisAvatar {...botEye(bot)} size={54} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-white font-bold text-sm font-sans truncate">{bot.name}</div>
                          <div className="text-[10px] font-mono mt-0.5" style={{ color: rs.badge }}>{rs.label}</div>
                          <div className="text-[10px] text-[#444] font-mono truncate">
                            by {bot.maker?.handle ? `@${bot.maker.handle}` : (bot.maker?.name || `${(bot.walletAddress || 'anon').substring(0, 6)}…`)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        {[
                          { label: 'BRIER',    val: brier > 0 ? brier.toFixed(3) : 'AWAITING' },
                          { label: 'WIN RATE', val: wr > 0 ? `${(wr * 100).toFixed(1)}%` : '—' },
                          { label: 'VAULT',    val: tvl > 0 ? `$${(tvl/1000).toFixed(0)}K` : '—' },
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
                <th className="p-4 font-medium tracking-widest">WIN RATE</th>
                <th className="p-4 font-medium tracking-widest">SHARPE</th>
                <th className="p-4 font-medium tracking-widest">TRADES</th>
                <th className="p-4 font-medium tracking-widest text-right">TVL</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center font-mono text-primary text-xs">
                    <div className="cursor-blink inline-block">&gt; syncing on-chain data…</div>
                  </td>
                </tr>
              ) : ranked.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center font-mono text-[#333] text-xs">
                    &gt; No data yet — be the first to deploy
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
                const nTrades = bot.scores?.[0]?.totalTrades ?? 0

                return (
                  <tr
                    key={bot.id}
                    className="border-b border-[#111] transition-colors cursor-pointer hover:bg-[#0d0d0d]"
                    onClick={() => { window.location.href = `/bot/${slug}` }}
                  >
                    <td className="p-3 px-4 font-sans font-extrabold text-[15px]" style={{ color: rankColor }}>
                      {i + 1}
                    </td>
                    <td className="p-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 border border-[#1a1a1a] overflow-hidden shrink-0">
                          {bot.pfpUrl ? (
                            <img src={bot.pfpUrl} alt={bot.name} className="w-full h-full object-cover" />
                          ) : (
                            <BotIrisAvatar {...botEye(bot)} size={30} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/bot/${slug}`} className="text-white no-underline font-semibold font-sans hover:text-primary transition-colors" onClick={e => e.stopPropagation()}>
                            {bot.name}
                          </Link>
                          <div className="text-[10px] text-[#333] mt-[2px] font-mono">
                            <Link href={`/maker/${builderId}`} className="no-underline text-[#333] hover:text-white transition-colors" onClick={e => e.stopPropagation()}>
                              by {bot.maker?.handle ? `@${bot.maker.handle}` : (bot.maker?.name || `${builderId.substring(0, 6)}…${builderId.substring(builderId.length - 4)}`)}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 px-4">
                      <div className="flex items-center gap-2">
                        {brier > 0 ? (
                          <>
                            <span className="font-bold text-white font-mono">{brier.toFixed(3)}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5" style={{ color: tierColor, background: `${tierColor}14`, border: `0.5px solid ${tierColor}33` }}>
                              {tier}
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] font-mono text-[#ffb000] animate-pulse">AWAITING DATA</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 px-4 text-white font-bold font-mono">{wr > 0 ? `${(wr * 100).toFixed(1)}%` : '—'}</td>
                    <td className="p-3 px-4 text-white font-bold font-mono">{sharpe > 0 ? sharpe.toFixed(2) : '—'}</td>
                    <td className="p-3 px-4 font-mono text-[#888]">
                      {nTrades > 0 ? nTrades.toLocaleString() : '—'}
                      {nTrades > 0 && nTrades < 50 && <span className="ml-1.5 text-[8px] text-[#C9A84C]">LOW N</span>}
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
            { icon: '/>', title: 'Math enforcement', desc: 'Rankings derived from the Brier Score — the gold standard in forecasting.' },
            { icon: '{}', title: 'Verified fills',   desc: 'Every score traces back to resolved market outcomes. No self-reporting.' },
            { icon: '[]', title: 'Zero trust',       desc: 'HMAC-SHA256 signed signals. Resolution state cannot be altered.' },
          ].map((item, i) => (
            <div key={i} className="bg-[#080808] border border-[#1a1a1a] p-4 relative group hover:border-[#2a2a2a] transition-colors">
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#1a1a1a] group-hover:border-[#2a2a2a]" />
              <div className="text-primary font-mono font-bold text-base mb-2">{item.icon}</div>
              <div className="font-sans font-bold text-[13px] text-white mb-1">{item.title}</div>
              <div className="text-[11px] text-[#555] leading-relaxed font-sans">{item.desc}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
