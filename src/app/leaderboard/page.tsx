'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import BotIrisAvatar from '@/components/BotIrisAvatar'
import { FEATURES } from '@/lib/features'

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
    <div className="min-h-screen bg-[#030303] text-[#e8e8e8] p-8">

      {/* HEADER BAR */}
      <div className="max-w-[1100px] mx-auto mb-6 flex justify-between items-center border-b border-[#1a1a1a] pb-4 text-[13px]">
        <div className="flex gap-3 items-center">
          <Link href="/" className="text-[#666] hover:text-white transition-colors no-underline font-sans text-sm">← Back</Link>
          <h1 className="font-sans font-extrabold text-white tracking-tight text-2xl m-0">Global Rankings</h1>
        </div>
        <div className="flex gap-4 text-xs text-[#888] font-sans font-medium">
          <Link href="/discover" className="hover:text-white transition-colors no-underline">Catalog</Link>
          <Link href="/dashboard" className="hover:text-white transition-colors no-underline">Dashboard</Link>
          <Link href="/list-bot" className="hover:text-white transition-colors no-underline">Submit</Link>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto">

        {/* DESCRIPTION */}
        <div className="mb-6 text-xs text-[#e8e8e8] leading-relaxed p-4 border border-[#1a1a1a] bg-[#0a0a0a] font-sans">
          <span className="text-[#888] font-medium">INFO:</span> Leaderboard is strictly sorted by <span className="text-white font-semibold">Brier Score</span> (lower = more accurate). All metrics are mathematically derived from verified on-chain Polygon transactions. Scores cannot be forged.
        </div>

        {/* TOP 3 PODIUM */}
        {!loading && rankedBots.length >= 3 && (
          <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {rankedBots.slice(0, 3).map((bot, i) => {
              const brier = bot.scores?.[0]?.brierScore ?? bot.brierScore ?? 0
              const wr = bot.scores?.[0]?.winRate ?? bot.winRate ?? 0
              const tvl = bot.currentTVL ?? bot.tvl ?? 0
              const slug = bot.slug || bot.id

              return (
                <motion.div key={bot.id} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } } }}>
                <Link href={`/bot/${slug}`} className="block h-full bg-[#0a0a0a] border border-[#1a1a1a] p-5 transition-all hover:bg-[#111] hover:border-[#333] no-underline relative group">
                  <div className="absolute top-0 right-0 w-8 h-8 bg-[#111] border-l border-b border-[#1a1a1a] flex items-center justify-center font-bold text-primary font-mono text-sm">
                    {i+1}
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4 pr-10">
                    {bot.pfpUrl ? (
                      <img src={bot.pfpUrl} alt={bot.name} className="w-10 h-10 rounded-full border border-[#222] object-cover" />
                    ) : (
                      <div className="w-10 h-10 border border-[#222] bg-[#030303] flex items-center justify-center rounded-full overflow-hidden">
                        <BotIrisAvatar avatarId={bot.avatarId || 'void-eye'} accentColor={bot.color || '#ff2a4d'} size={32} />
                      </div>
                    )}
                    <div>
                      <div className="text-white font-semibold text-sm font-sans">{bot.name}</div>
                      <div className="text-[10px] text-[#888] mt-1 font-mono">Brier: {brier.toFixed(3)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="border-l-2 border-[#222] pl-2 group-hover:border-[#444]">
                      <div className="text-[#666] text-[9px] uppercase font-sans">Win Rate</div>
                      <div className="text-white font-bold font-mono">{(wr * 100).toFixed(1)}%</div>
                    </div>
                    {FEATURES.CAPITAL_LAYER && (
                    <div className="border-l-2 border-[#222] pl-2 group-hover:border-[#444]">
                      <div className="text-[#666] text-[9px] uppercase font-sans">Vault TVL</div>
                      <div className="text-white font-bold font-mono">${tvl.toLocaleString()}</div>
                    </div>
                    )}
                  </div>
                </Link>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* DATA TABLE */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="border border-[#1a1a1a] bg-[#0a0a0a] overflow-hidden mb-6">
          <table className="w-full border-collapse text-[11px] text-left">
            <thead>
              <tr className="text-[#666] font-sans font-medium border-b border-[#1a1a1a] bg-[#080808]">
                <th className="p-4 font-normal">#</th>
                <th className="p-4 font-normal">ALGORITHM</th>
                <th className="p-4 font-normal">BRIER</th>
                <th className="p-4 font-normal">WIN_RATE</th>
                <th className="p-4 font-normal">SHARPE</th>
                {FEATURES.CAPITAL_LAYER && <th className="p-4 font-normal text-right">TVL</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-primary animate-pulse tracking-widest">&gt; SYNCHRONIZING_ONCHAIN_DATA...</td>
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

                  return (
                    <tr
                      key={bot.id}
                      className={`border-b border-[#1a1a1a] transition-colors cursor-pointer hover:bg-[#111] ${isTop3 ? 'bg-[#0a0a0a]' : 'bg-transparent'}`}
                      onClick={() => window.location.href=`/bot/${slug}`}
                    >
                      <td className={`p-3 px-4 font-bold font-mono ${isTop3 ? 'text-primary' : 'text-[#666]'}`}>
                        {String(i + 1).padStart(2, '0')}
                      </td>
                      <td className="p-3 px-4">
                        <div>
                          <Link href={`/bot/${slug}`} className="text-white no-underline font-semibold font-sans hover:text-primary transition-colors">
                            {bot.name}
                          </Link>
                          <div className="text-[10px] text-[#444] mt-[2px]">
                            by{' '}
                            <Link href={`/maker/${builderId}`} className="text-[#666] no-underline hover:text-white transition-colors font-mono">
                              {builderId.substring(0, 6)}...{builderId.substring(builderId.length - 4)}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 px-4">
                        <span className="font-bold text-white font-mono">
                          {brier.toFixed(3)}
                        </span>
                        <div className={`text-[9px] mt-1 font-sans font-medium ${brier <= 0.15 ? 'text-[#00d4aa]' : 'text-[#666]'}`}>
                          {brier <= 0.15 ? 'ELITE' : brier <= 0.25 ? 'STRONG' : brier <= 0.4 ? 'MODERATE' : 'WEAK'}
                        </div>
                      </td>
                      <td className="p-3 px-4 text-white font-bold font-mono">
                        {(wr * 100).toFixed(1)}%
                      </td>
                      <td className="p-3 px-4 text-white font-bold font-mono">
                        {sharpe.toFixed(2)}
                      </td>
                      {FEATURES.CAPITAL_LAYER && (
                      <td className="p-3 px-4 text-right text-white font-bold font-mono">
                        ${tvl.toLocaleString()}
                      </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </motion.div>

        {/* TRUST FOOTER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-6">
          {[
            { icon: '/>', title: 'MATH_ENFORCEMENT', desc: 'Rankings strictly derived from Brier Score. The gold standard in forecasting.' },
            { icon: '{}', title: 'ONCHAIN_SETTLEMENT', desc: 'Every trade is verified via Polygon contracts. Immutable and tamper-proof.' },
            { icon: '[]', title: 'ZERO_TRUST', desc: 'HMAC-SHA256 signed signals. Resolution state cannot be altered.' },
          ].map((item, i) => (
            <div key={i} className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 relative group hover:border-[#333] transition-colors">
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#1a1a1a] group-hover:border-[#333]" />
              <div className="text-primary font-bold text-lg mb-2">{item.icon}</div>
              <div className="font-semibold text-[11px] text-white font-sans tracking-wide mb-1">{item.title}</div>
              <div className="text-[10px] text-[#888] leading-relaxed font-sans">{item.desc}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
