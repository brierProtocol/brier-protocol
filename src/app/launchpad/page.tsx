'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const [tokens, setTokens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'mcap' | 'new' | 'progress'>('mcap')

  useEffect(() => {
    const load = () =>
      fetch('/api/tokens')
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setTokens(d); setLoading(false) })
        .catch(() => setLoading(false))
    load()
    const iv = setInterval(load, 15_000) // live board — prices move, the page moves
    return () => clearInterval(iv)
  }, [])

  const sorted = [...tokens].sort((a, b) => {
    if (sort === 'mcap') return b.marketCap - a.marketCap
    if (sort === 'progress') return b.progress - a.progress
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="min-h-screen bg-[#030303] text-white p-8 md:p-12">
      <div className="max-w-[1200px] mx-auto">

        {/* HERO */}
        <div className="flex justify-between items-end pb-8 mb-8 border-b border-[#1a1a1a] flex-wrap gap-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <h1 className="m-0 font-sans font-extrabold tracking-[-0.03em] leading-none text-[clamp(30px,4.5vw,44px)] text-white">
                Shadow Market<span className="text-primary">.</span>
              </h1>
            </div>
            <div className="mt-4 text-[13px] text-[#888] font-sans leading-relaxed flex flex-col gap-1.5">
              <div className="flex gap-2"><span className="text-primary">–</span> Tokenize agents from day zero — back them before the math proves them.</div>
              <div className="flex gap-2"><span className="text-primary">–</span> Every token wears its <span className="text-white font-semibold">Brier Score</span>. Speculation with fundamentals.</div>
              <div className="flex gap-2"><span className="text-primary">–</span> 1% fee per trade — half to the bot&apos;s creator, half to the protocol.</div>
            </div>
          </div>
          <Link href="/list-bot" className="font-mono text-xs font-bold px-5 py-2.5 bg-primary text-[#030303] no-underline hover:bg-[#ff1438] hover:shadow-[0_0_15px_rgba(255,42,77,0.5)] transition-all tracking-widest">
            DEPLOY A BOT →
          </Link>
        </div>

        {/* Sort */}
        <div className="flex gap-3 mb-6 text-xs items-center font-mono">
          <span className="text-[#555]">SORT</span>
          {[['mcap', 'Market Cap'], ['progress', 'Bonding'], ['new', 'Newest']].map(([id, label]) => (
            <button key={id} onClick={() => setSort(id as any)}
              className={`px-2.5 py-1 transition-all border ${sort === id ? 'text-white border-primary/50 bg-primary/10' : 'text-[#666] border-transparent hover:text-white'}`}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div className="text-center p-16 text-[#555] font-mono text-sm animate-pulse">&gt; loading shadow market…</div>
        ) : sorted.length === 0 ? (
          <div className="text-center p-16 border border-dashed border-[#1a1a1a] bg-[#080808]">
            <div className="text-[#555] font-mono text-sm mb-4">&gt; No tokens yet — be the first to launch</div>
            <Link href="/list-bot" className="font-mono text-xs font-bold px-5 py-2.5 bg-primary text-[#030303] no-underline tracking-widest">DEPLOY A BOT →</Link>
          </div>
        ) : (
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}>
            {sorted.map((t) => {
              const graduated = t.status === 'GRADUATED'
              const grad = graduated ? '#FFD700' : '#c8ff00'
              return (
                <motion.div key={t.botId} layout variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }} whileHover={{ y: -4 }}>
                  <Link href={`/bot/${t.slug}`} className="block bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#2a2a2a] no-underline relative overflow-hidden transition-all group hover:shadow-[0_8px_30px_rgba(0,0,0,0.6),0_0_0_0.5px_rgba(255,42,77,0.08)]">
                    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#1a1a1a] group-hover:border-primary/40 transition-colors" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#1a1a1a] group-hover:border-primary/40 transition-colors" />
                    {/* top */}
                    <div className="flex items-center gap-3 p-4 border-b border-[#111]">
                      {t.pfpUrl ? (
                        <img src={t.pfpUrl} alt={t.botName} className="w-12 h-12 object-cover border border-[#1a1a1a]" />
                      ) : (
                        <div className="border border-[#1a1a1a]">
                          <BotIrisAvatar {...botEye({ slug: t.slug, name: t.botName, color: t.color, eyeShape: t.eyeShape })} size={46} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-white">${t.ticker}</span>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 ${graduated ? '' : 'animate-pulse'}`} style={{ color: grad, background: grad + '14', border: `0.5px solid ${grad}44` }}>{graduated ? 'GRADUATED' : 'BONDING'}</span>
                        </div>
                        <div className="text-[11px] font-sans text-[#888] truncate group-hover:text-primary transition-colors">{t.botName}</div>
                        {t.makerWallet && (
                          <span
                            role="link"
                            tabIndex={0}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/maker/${t.makerWallet}`) }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); router.push(`/maker/${t.makerWallet}`) } }}
                            className="text-[9px] font-mono text-[#444] hover:text-primary transition-colors cursor-pointer truncate block w-fit"
                          >
                            by {t.makerHandle ? `@${t.makerHandle}` : (t.makerName || `${t.makerWallet.substring(0, 6)}…`)}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[8px] font-mono text-[#555] tracking-widest">MCAP</div>
                        <div className="font-mono text-[17px] font-bold text-white leading-tight">{fmtUsd(t.marketCap)}</div>
                      </div>
                    </div>
                    {/* progress */}
                    <div className="p-4">
                      <div className="flex justify-between text-[9px] font-mono text-[#555] mb-1">
                        <span>BONDING {(t.progress * 100).toFixed(0)}%</span>
                        <span>{t.holders} holders · {t.trades} trades</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#030303] border border-[#1a1a1a] overflow-hidden">
                        <div className="h-full transition-all duration-700" style={{ width: `${t.progress * 100}%`, background: grad }} />
                      </div>
                      <div className="flex justify-between mt-3 text-[10px] font-mono">
                        {t.brier != null ? (
                          <span className="text-[#555]">BRIER <span className={t.brier <= 0.25 ? 'text-[#00d4aa]' : 'text-white'}>{t.brier.toFixed(3)}</span></span>
                        ) : (
                          <span className="text-[#ffb000] animate-pulse" title="Shadow phase: collecting resolved trades">AWAITING DATA{t.resolvedTrades > 0 ? ` (${t.resolvedTrades})` : ''}</span>
                        )}
                        <span className="text-primary group-hover:underline">BACK →</span>
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
