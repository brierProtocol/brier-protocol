'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import { botEye, makerEye } from '@/lib/botIdentity'
import { StatusMark } from '@/components/LiveFeedStrip'
import { classifyMarket } from '@/lib/marketCategories'
import { shadowProgress, phaseMeta } from '@/lib/botProgress'
import { motion } from 'framer-motion'
import { FEATURES } from '@/lib/features'

export default function DiscoverPage() {
  const router = useRouter()
  const [activeSort, setActiveSort]     = useState<SortKey>('brier')
  const [activeMarket, setActiveMarket] = useState<MarketKey>('all')
  const [search, setSearch]             = useState('')
  const [botsData, setBotsData]         = useState<BotListItem[]>([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    fetch('/api/bots')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setBotsData(data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const getBrier   = (b: BotListItem) => b.scores?.[0]?.brierScore ?? b.brierScore ?? 0
  const getTvl     = (b: BotListItem) => b.currentTVL ?? b.tvl ?? 0
  const getCreated = (b: BotListItem) => new Date(b.createdAt || 0).getTime()
  const brierSort  = (b: BotListItem) => { const v = getBrier(b); return v > 0 ? v : Infinity }

  const filtered = botsData
    .filter(b => matchesMarket(b, activeMarket))
    .filter(b => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        b.name?.toLowerCase().includes(q) ||
        (b.slug || '').toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q) ||
        (b.maker?.handle || '').toLowerCase().includes(q) ||
        (b.walletAddress || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (activeSort === 'brier')  return brierSort(a) - brierSort(b)
      if (activeSort === 'new')    return getCreated(b) - getCreated(a)
      if (activeSort === 'oldest') return getCreated(a) - getCreated(b)
      if (activeSort === 'tvl')    return getTvl(b) - getTvl(a)
      return 0
    })

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans">

      {/* ── HERO ── */}
      <div className="px-6 md:px-12 pt-14 pb-9 border-b border-[#111]">
        <div className="max-w-[1200px] mx-auto">
          <div className="inline-flex items-center gap-3 mb-5">
            <span className="h-px w-9 bg-gradient-to-r from-primary to-primary/0" />
            <span className="font-mono text-[11px] tracking-[0.42em] uppercase text-[#a8a8a8]">The <span className="text-primary">catalog</span></span>
          </div>
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <h1 className="m-0 font-sans font-extrabold tracking-[-0.035em] leading-[1.0] text-[clamp(34px,4.8vw,56px)]">
                Discover algorithms<span className="text-primary">.</span>
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#9a9a9a]">
                Every bot scored in public against reality. Filter by market, sort by edge, back the sharpest.
              </p>
            </div>
            {/* search */}
            <div className="relative w-full sm:w-[330px]">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666] pointer-events-none">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.2-4.2" />
                </svg>
              </span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search algorithms or operators…"
                className="w-full bg-[#0a0a0a] border border-[#1f1f1f] text-white font-sans text-[14px] outline-none pl-11 pr-4 py-3 rounded-xl placeholder:text-[#555] transition-all focus:border-primary/50 focus:bg-[#0c0c0c] focus:shadow-[0_0_24px_rgba(255,42,77,0.08)] hover:border-[#2a2a2a]"
              />
            </div>
          </div>
        </div>
        
        {/* FILTERS */}
        <div className="flex gap-4 mt-6 text-xs items-center">
          <span className="text-[#666] font-sans text-xs">Sort by:</span>
          {[
            { id: 'brier', label: 'Brier Score' },
            { id: 'yield', label: 'Monthly Yield' },
            ...(FEATURES.CAPITAL_LAYER ? [{ id: 'tvl', label: 'TVL' }] : []),
            { id: 'new', label: 'Newest' },
          ].map(s => (
            <button 
              key={s.id} 
              onClick={() => setActiveSort(s.id as any)}
              className={`bg-transparent border-none cursor-pointer tracking-wide transition-colors font-sans text-xs px-2 py-1 rounded ${activeSort === s.id ? 'text-primary font-semibold bg-primary/10' : 'text-[#888] hover:text-white'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── FILTERS: categories + sort ── */}
      <div className="px-6 md:px-12 py-4 border-b border-[#111] bg-[#040404]/80 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {MARKET_TABS.map(t => {
              const active = activeMarket === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveMarket(t.id)}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all border ${
                    active
                      ? 'bg-primary text-[#030303] border-primary shadow-[0_0_14px_rgba(255,42,77,0.35)]'
                      : 'bg-white/[0.03] text-[#9a9a9a] border-white/[0.07] hover:text-white hover:border-white/20'
                  }`}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-[#555] tracking-[0.18em] uppercase">Sort</span>
            <div className="flex items-center gap-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-1">
              {SORT_OPTIONS.map(s => {
                const active = activeSort === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSort(s.id)}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-mono font-semibold transition-all ${
                      active ? 'bg-primary text-[#030303]' : 'text-[#777] hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── GRID ── */}
      <div className="px-6 md:px-12 py-10">
        <div className="max-w-[1200px] mx-auto">
          {loading ? (
            <div className="text-center py-24 font-mono text-xs text-[#444]">
              <div className="cursor-blink inline-block">&gt; synchronizing on-chain data</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="font-mono text-xs text-[#555] mb-4">&gt; no algorithms match this filter</div>
              <Link href="/list-bot" className="inline-flex items-center gap-2 bg-primary text-[#030303] px-5 py-2.5 font-sans font-bold text-[13px] no-underline transition-all hover:shadow-[0_0_18px_rgba(255,42,77,0.5)]">
                Deploy a bot →
              </Link>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
            >
              {filtered.map((b) => {
                const brier  = getBrier(b)
                const wr     = b.scores?.[0]?.winRate ?? b.winRate ?? 0
                const tvl    = getTvl(b)
                const sharpe = b.scores?.[0]?.sharpe ?? b.sharpe ?? 0
                const st     = deriveTag(b)
                const cat    = botCategory(b)

                return (
                  <motion.div
                    key={b.id}
                    variants={{
                      hidden: { opacity: 0, y: 16, scale: 0.97 },
                      show:   { opacity: 1, y: 0, scale: 1, transition: { ease: [0.16, 1, 0.3, 1], duration: 0.4 } },
                    }}
                    whileHover={{ y: -4 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <Link
                      href={`/bot/${b.slug || b.id}`}
                      className="flex flex-col bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg no-underline group relative overflow-hidden transition-all hover:border-[#2c2c2c] hover:shadow-[0_14px_44px_rgba(0,0,0,0.6),0_0_0_0.5px_rgba(255,42,77,0.10)]"
                    >
                      {/* head: name + status */}
                      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#141414]">
                        <span className="text-[13px] font-sans font-bold text-white group-hover:text-primary transition-colors truncate pr-2">
                          {b.name}
                        </span>
                        <StatusMark tag={st.tag} color={st.color} />
                      </div>

                      {/* avatar (square, 4chan) */}
                      <div className="relative flex justify-center py-6 bg-[#060606] border-b border-[#141414]">
                        <span className="w-[76px] h-[76px] rounded-[5px] overflow-hidden border border-[#222] bg-[#050505] group-hover:border-primary/35 transition-colors flex items-center justify-center">
                          {b.pfpUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={b.pfpUrl} alt={b.name} className="w-full h-full object-cover" />
                          ) : (
                            <BotIrisAvatar {...botEye(b)} size={76} />
                          )}
                        </span>
                      </div>

              {/* Data Rows */}
              <div className="p-4 flex flex-col gap-2 text-xs font-sans">
                <div className="flex justify-between">
                  <span className="text-[#666]">Maker</span>
                  <span className="text-white font-mono">{(b.builder || b.walletAddress || 'anon').substring(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">Brier Score</span>
                  <span className={`font-mono font-bold ${brier <= 0.25 ? 'text-primary drop-shadow-[0_0_5px_rgba(255,42,77,0.5)]' : 'text-white'}`}>{brier.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">Win Rate</span>
                  <span className="text-white font-mono">{(wr * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">Mth Yield</span>
                  <span className={`font-mono ${yld > 0 ? 'text-[#00d4aa]' : 'text-[#666]'}`}>{yld > 0 ? '+' : ''}{yld}%</span>
                </div>
                {FEATURES.CAPITAL_LAYER && (
                <div className="flex justify-between border-t border-[#1a1a1a] pt-2 mt-2">
                  <span className="text-[#666]">Vault TVL</span>
                  <span className="text-white font-mono font-bold">${tvl.toLocaleString()}</span>
                </div>
                )}
              </div>
            </Link>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
