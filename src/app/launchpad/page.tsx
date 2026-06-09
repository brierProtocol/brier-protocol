'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import BotIrisAvatar from '@/components/BotIrisAvatar'
import { botEye } from '@/lib/botIdentity'

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  if (n >= 1) return `$${n.toFixed(2)}`
  if (n >= 0.0001) return `$${n.toFixed(5)}`
  return `$${n.toExponential(1)}`
}

export default function LaunchpadPage() {
  const [tokens, setTokens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'mcap' | 'new' | 'progress'>('mcap')

  useEffect(() => {
    fetch('/api/tokens').then(r => r.json()).then(d => { if (Array.isArray(d)) setTokens(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const sorted = [...tokens].sort((a, b) => {
    if (sort === 'mcap') return b.marketCap - a.marketCap
    if (sort === 'progress') return b.progress - a.progress
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="min-h-screen bg-[#030303] text-white p-8 md:p-12">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex justify-between items-end border-b border-[#1a1a1a] pb-6 mb-8 flex-wrap gap-4">
          <div>
            <h1 className="font-mono text-3xl font-bold tracking-tight mb-1">LAUNCHPAD</h1>
            <p className="text-sm text-[#888] font-sans">Back AI trading agents during their shadow phase. Every token has a Brier Score — speculation with fundamentals.</p>
          </div>
          <Link href="/list-bot" className="font-mono text-xs font-bold px-5 py-2.5 bg-[#c8ff00] text-[#030303] no-underline hover:shadow-[0_0_15px_rgba(200,255,0,0.4)] transition-all">
            🚀 LAUNCH_A_BOT
          </Link>
        </div>

        {/* Sort */}
        <div className="flex gap-3 mb-6 text-xs items-center font-mono">
          <span className="text-[#555]">SORT:</span>
          {[['mcap', 'Market Cap'], ['progress', 'Bonding'], ['new', 'Newest']].map(([id, label]) => (
            <button key={id} onClick={() => setSort(id as any)}
              className={`px-2 py-1 transition-colors ${sort === id ? 'text-[#c8ff00]' : 'text-[#666] hover:text-white'}`}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div className="text-center p-16 text-[#555] font-mono text-sm animate-pulse">&gt; loading launchpad…</div>
        ) : sorted.length === 0 ? (
          <div className="text-center p-16 border border-dashed border-[#1a1a1a] bg-[#080808]">
            <div className="text-[#555] font-mono text-sm mb-4">&gt; NO_TOKENS_YET — be the first to launch</div>
            <Link href="/list-bot" className="font-mono text-xs font-bold px-5 py-2.5 bg-[#c8ff00] text-[#030303] no-underline">🚀 LAUNCH_A_BOT</Link>
          </div>
        ) : (
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}>
            {sorted.map((t) => {
              const graduated = t.status === 'GRADUATED'
              const grad = graduated ? '#FFD700' : '#c8ff00'
              return (
                <motion.div key={t.botId} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }} whileHover={{ y: -4 }}>
                  <Link href={`/bot/${t.slug}`} className="block bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#2a2a2a] no-underline relative overflow-hidden transition-all group hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
                    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l transition-colors" style={{ borderColor: grad + '66' }} />
                    {/* top */}
                    <div className="flex items-center gap-3 p-4 border-b border-[#111]">
                      <BotIrisAvatar {...botEye({ slug: t.slug, name: t.botName, color: t.color, eyeShape: t.eyeShape })} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-white">${t.ticker}</span>
                          <span className="text-[8px] font-mono px-1.5 py-0.5" style={{ color: grad, background: grad + '14', border: `0.5px solid ${grad}44` }}>{graduated ? 'GRAD' : 'BOND'}</span>
                        </div>
                        <div className="text-[11px] font-sans text-[#888] truncate group-hover:text-primary transition-colors">{t.botName}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-bold text-white">{fmtUsd(t.price)}</div>
                        <div className="text-[9px] font-mono text-[#555]">MCAP {fmtUsd(t.marketCap)}</div>
                      </div>
                    </div>
                    {/* progress */}
                    <div className="p-4">
                      <div className="flex justify-between text-[9px] font-mono text-[#555] mb-1">
                        <span>BONDING {(t.progress * 100).toFixed(0)}%</span>
                        <span>{t.holders} holders · {t.trades} trades</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#030303] border border-[#1a1a1a] overflow-hidden">
                        <div className="h-full" style={{ width: `${t.progress * 100}%`, background: grad }} />
                      </div>
                      <div className="flex justify-between mt-3 text-[10px] font-mono">
                        <span className="text-[#555]">BRIER <span className={t.brier != null && t.brier <= 0.25 ? 'text-[#c8ff00]' : 'text-white'}>{t.brier != null ? t.brier.toFixed(3) : '—'}</span></span>
                        <span className="text-[#c8ff00] group-hover:underline">BACK →</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}
