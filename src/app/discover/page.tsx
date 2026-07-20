'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import { botEye, makerEye } from '@/lib/botIdentity'
import { StatusMark } from '@/components/LiveFeedStrip'
import { classifyMarket } from '@/lib/marketCategories'
import { shadowProgress, phaseMeta } from '@/lib/botProgress'
import { FEATURES } from '@/lib/features'
import { motion } from 'framer-motion'
import type { BotListItem } from '@/types'

type SortKey = 'brier' | 'new' | 'oldest' | 'tvl'
type MarketKey = 'all' | 'politics' | 'crypto' | 'sports' | 'economy' | 'culture' | 'tech' | 'world'

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'brier',  label: 'Best Brier' },
  { id: 'new',    label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'tvl',    label: 'Top TVL' },
]

// Every Polymarket category. Bots have no formal category field, so each is
// inferred from its market mandate. White/red identity, 4chan-flat chips.
const MARKET_TABS: { id: MarketKey; label: string }[] = [
  { id: 'all',      label: 'All' },
  { id: 'politics', label: 'Politics' },
  { id: 'crypto',   label: 'Crypto' },
  { id: 'sports',   label: 'Sports' },
  { id: 'economy',  label: 'Economy' },
  { id: 'culture',  label: 'Culture' },
  { id: 'tech',     label: 'Tech' },
  { id: 'world',    label: 'World' },
]

function matchesMarket(bot: BotListItem, market: MarketKey): boolean {
  if (market === 'all') return true
  // Verified categories (derived on-chain by the indexer) win over everything.
  if (Array.isArray(bot.verifiedCategories) && bot.verifiedCategories.length > 0) {
    return bot.verifiedCategories.includes(market)
  }
  // Then the categories the builder declared at deploy.
  if (Array.isArray(bot.categories) && bot.categories.length > 0) {
    return bot.categories.includes(market)
  }
  // Last resort for legacy bots: infer from free-text fields.
  const m = [bot.market, ...(bot.markets || []), bot.description, bot.tagline].join(' ')
  return classifyMarket(m) === market
}

function botCategory(b: BotListItem): string | null {
  for (const c of MARKET_TABS.slice(1)) {
    if (matchesMarket(b, c.id)) return c.label
  }
  return null
}

// Display state per bot, from the shared phase ladder (new / shadow / live).
// Same source of truth as the live feed, so a bot reads identically everywhere.
function deriveTag(b: BotListItem): { tag: string; color: string } {
  const { tag, color } = phaseMeta(shadowProgress(b))
  return { tag, color }
}

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
  // v1 is reputation-only: with the capital layer OFF there is no real TVL, so
  // never show a number (a seeded demo value would be a fabricated metric).
  const getTvl     = (b: BotListItem) => FEATURES.CAPITAL_LAYER ? (b.currentTVL ?? b.tvl ?? 0) : 0
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
    <div className="min-h-screen bg-[#030303] text-white font-sans scroll-smooth">

      {/* ── 1. HERO ── */}
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
              
              {!loading && (
                <div className="flex items-center gap-6 mt-6">
                  <div className="flex flex-col">
                    <span className="text-[20px] font-mono font-bold text-white tabular-nums">{botsData.length}</span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#666]">Live Algorithms</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[20px] font-mono font-bold text-white tabular-nums">
                      {botsData.reduce((acc, b) => acc + (b.scores?.[0]?.totalTrades ?? 0), 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#666]">Resolved Predictions</span>
                  </div>
                </div>
              )}
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
      </div>

      {/* Quick Actions (only showing existing list routes) */}
      <div className="grid grid-cols-2 gap-3 max-w-[1200px] mx-auto px-6 md:px-12 mt-6 mb-2">
        <Link
          href="/discover"
          className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md transition-all duration-300 hover:bg-white/[0.05] hover:border-white/20 hover:-translate-y-1 no-underline"
        >
          <span className="text-[12px] font-semibold text-[#e8e8e8]">Algorithms</span>
        </Link>
        <Link
          href="/leaderboard"
          className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md transition-all duration-300 hover:bg-white/[0.05] hover:border-white/20 hover:-translate-y-1 no-underline"
        >
          <span className="text-[12px] font-semibold text-[#e8e8e8]">Builders</span>
        </Link>
      </div>

      <div className="px-6 md:px-12 py-6">
        <div className="max-w-[1200px] mx-auto">
          {loading ? (
            <div className="text-center py-24 font-mono text-xs text-[#444]">
              <div className="cursor-blink inline-block">&gt; synchronizing on-chain data</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="font-mono text-xs text-[#555] mb-4">&gt; no algorithms match this filter</div>
              <Link href="/list-bot" className="inline-flex items-center gap-2 bg-primary text-[#030303] px-6 py-3 font-sans font-bold text-[14px] no-underline transition-all hover:shadow-[0_0_24px_rgba(255,42,77,0.7)] hover:scale-[1.02] rounded-full">
                Deploy a bot →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-10">
              
              {/* ── 2. FEATURED (#1 BOT) ── */}
              {(() => {
                const featured = filtered[0]
                const brier = getBrier(featured)
                const wr = featured.scores?.[0]?.winRate ?? featured.winRate ?? 0
                const trades = featured.scores?.[0]?.totalTrades ?? 0
                const st = deriveTag(featured)
                const cat = botCategory(featured)
                // Comparación matemática real contra el coin-flip (0.25)
                const edgeVsCoinFlip = brier > 0 && brier < 0.25 ? Math.round((1 - brier / 0.25) * 100) : null

                return (
                  <div className="border-b border-[#111] pb-10">
                    <div className="flex items-center gap-3 mb-5">
                      <span className="h-px w-9 bg-gradient-to-r from-primary to-primary/0" />
                      <span className="font-mono text-[11px] tracking-[0.42em] uppercase text-[#a8a8a8]">Featured</span>
                    </div>
                    <Link
                      href={`/bot/${featured.slug || featured.id}`}
                      className="group relative flex flex-col md:flex-row items-center gap-8 md:gap-12 p-8 md:p-12 rounded-3xl
                                 bg-white/[0.02] backdrop-blur-xl border border-white/[0.07] no-underline overflow-hidden
                                 transition-all duration-500 hover:border-primary/40
                                 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_32px_64px_-24px_rgba(0,0,0,0.7)]
                                 hover:shadow-[0_40px_80px_-20px_rgba(255,42,77,0.18)]"
                    >
                      <div className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px]
                                      bg-[radial-gradient(circle,rgba(255,42,77,0.14),transparent_70%)]
                                      opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                      <div className="relative shrink-0">
                        {featured.pfpUrl ? (
                          <span className="block w-[140px] h-[140px] rounded-3xl overflow-hidden border border-white/10
                                           shadow-[0_20px_48px_-12px_rgba(0,0,0,0.6)]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={featured.pfpUrl} alt={featured.name} className="w-full h-full object-cover" />
                          </span>
                        ) : (
                          <span className="block transition-transform duration-500 group-hover:scale-105">
                            <BotIrisAvatar {...botEye(featured)} size={140} />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 relative">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h2 className="text-[26px] md:text-[32px] font-extrabold text-white tracking-[-0.02em] m-0">
                            {featured.name}
                          </h2>
                          <StatusMark tag={st.tag} color={st.color} />
                          {cat && (
                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#888] border border-[#1f1f1f] rounded px-2 py-0.5">
                              {cat}
                            </span>
                          )}
                        </div>
                        <p className="text-[14px] text-[#9a9a9a] mb-6 max-w-md">
                          {featured.description || featured.tagline || 'Ranked #1 by resolved Brier Score.'}
                        </p>
                        <div className="flex items-end gap-8 flex-wrap">
                          <div>
                            <div className="text-[44px] font-mono font-extrabold text-white leading-none tabular-nums">
                              {brier > 0 ? brier.toFixed(3) : '—'}
                            </div>
                            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#666] mt-2">
                              Average Brier{edgeVsCoinFlip !== null && edgeVsCoinFlip > 0 ? ` · beats coin-flip by ${edgeVsCoinFlip}%` : ''}
                            </div>
                          </div>
                          {wr > 0 && (
                            <div>
                              <div className="text-[20px] font-mono font-bold text-white tabular-nums">{(wr * 100).toFixed(0)}%</div>
                              <div className="text-[9px] font-mono uppercase tracking-widest text-[#666] mt-1">Win rate</div>
                            </div>
                          )}
                          {trades > 0 && (
                            <div>
                              <div className="text-[20px] font-mono font-bold text-white tabular-nums">{trades.toLocaleString()}</div>
                              <div className="text-[9px] font-mono uppercase tracking-widest text-[#666] mt-1">Trades</div>
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="hidden md:inline-flex items-center gap-2 shrink-0 font-bold text-[14px] text-white
                                       border border-white/15 rounded-full px-5 py-3 transition-all
                                       group-hover:bg-primary group-hover:border-primary group-hover:text-[#030303]">
                        Open →
                      </span>
                    </Link>
                  </div>
                )
              })()}

              {/* ── 3. CATEGORIES & FILTERS ── */}
              <div className="flex items-center justify-between gap-4 flex-wrap pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {MARKET_TABS.map(t => {
                    const active = activeMarket === t.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => setActiveMarket(t.id)}
                        className={`relative px-4 py-2 rounded-full text-[12px] font-semibold transition-all duration-300 border ${
                          active
                            ? 'bg-primary text-[#030303] border-primary shadow-[0_0_0_1px_rgba(255,42,77,0.4),0_8px_20px_-6px_rgba(255,42,77,0.5)]'
                            : 'bg-white/[0.02] text-[#9a9a9a] border-white/[0.06] backdrop-blur-sm hover:text-white hover:border-white/20 hover:bg-white/[0.05]'
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

              {/* ── 4. TOP AGENTS (#2 to #6) ── */}
              {filtered.length > 1 && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <span className="h-px w-9 bg-gradient-to-r from-primary to-primary/0" />
                      <span className="font-mono text-[11px] tracking-[0.42em] uppercase text-[#a8a8a8]">Top agents</span>
                    </div>
                    <a href="#all-agents" className="text-[12px] font-mono text-[#777] hover:text-primary transition-colors">
                      View full ranking ↓
                    </a>
                  </div>

                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    initial="hidden"
                    animate="show"
                    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
                  >
                    {filtered.slice(1, 6).map((b, idx) => {
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
                            className="flex flex-col bg-[#0a0a0f] border border-[#1a1a24] rounded-xl no-underline group relative overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-[0_12px_40px_rgba(255,42,77,0.12)] hover:-translate-y-1"
                          >
                            <div className="absolute top-0 left-0 bg-[#12121a]/80 backdrop-blur-md text-[#888] font-mono text-[10px] px-2.5 py-1 rounded-br-xl z-10 border-r border-b border-[#1a1a24] group-hover:text-primary transition-colors">
                              #{idx + 2}
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a24] pl-12 bg-gradient-to-r from-[#0a0a0f] to-[#12121a]">
                              <span className="text-[14px] font-sans font-bold text-[#e8e8e8] group-hover:text-white transition-colors truncate pr-2">
                                {b.name}
                              </span>
                              <StatusMark tag={st.tag} color={st.color} />
                            </div>

                            <div className="relative flex justify-center py-6 border-b border-[#1a1a24] bg-[#050508] overflow-hidden">
                              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl" />
                              {b.pfpUrl ? (
                                <span className="relative w-[60px] h-[60px] rounded-full overflow-hidden border border-[#2a2a34] group-hover:border-primary/50 transition-colors flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] z-10 group-hover:scale-105 duration-300">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={b.pfpUrl} alt={b.name} className="w-full h-full object-cover" />
                                </span>
                              ) : (
                                <span className="relative transition-transform duration-500 group-hover:scale-[1.12] z-10 drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">
                                  <BotIrisAvatar {...botEye(b)} size={60} />
                                </span>
                              )}
                            </div>

                            <div className="p-4 flex flex-col gap-3 bg-[#0a0a0f]">
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { lbl: 'BRIER',  val: brier > 0 ? brier.toFixed(3) : '—', good: brier <= 0.25 && brier > 0 },
                                  { lbl: 'WIN %',  val: wr > 0 ? `${(wr * 100).toFixed(0)}%` : '—', good: wr > 0.54 },
                                  { lbl: 'SHARPE', val: sharpe > 0 ? sharpe.toFixed(2) : '—', good: sharpe > 1.5 },
                                ].map(({ lbl, val, good }) => (
                                  <div key={lbl} className="bg-[#101016] border border-[#1a1a24] rounded-lg p-2.5 flex flex-col gap-1 transition-colors group-hover:border-[#2a2a34]">
                                    <span className="text-[9px] font-mono text-[#6a6a74] tracking-widest">{lbl}</span>
                                    <span className={`text-[14px] font-mono font-bold ${good ? 'text-primary drop-shadow-[0_0_8px_rgba(255,42,77,0.4)]' : 'text-[#e8e8e8]'}`}>{val}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="flex items-center justify-between gap-2 border-t border-[#1a1a24] pt-3 mt-1">
                                <span
                                  role="link"
                                  tabIndex={0}
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (b.walletAddress) router.push(`/maker/${b.walletAddress}`) }}
                                  onKeyDown={(e) => { if (e.key === 'Enter' && b.walletAddress) { e.preventDefault(); e.stopPropagation(); router.push(`/maker/${b.walletAddress}`) } }}
                                  className="flex items-center gap-1.5 text-[10px] font-mono text-[#555] truncate hover:text-primary transition-colors cursor-pointer min-w-0"
                                >
                                  <span className="rounded-full overflow-hidden shrink-0 inline-flex">
                                    {b.maker?.pfpUrl
                                      ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={b.maker.pfpUrl} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                                      : <BotIrisAvatar {...makerEye(b.walletAddress || 'anon')} size={14} bg="transparent" />}
                                  </span>
                                  <span className="truncate">by {b.maker?.handle ? `@${b.maker.handle}` : (b.maker?.name || `${(b.walletAddress || 'anon').substring(0, 6)}…`)}</span>
                                </span>
                                {cat && (
                                  <span className="shrink-0 text-[9px] font-mono uppercase tracking-widest text-[#888] border border-[#1f1f1f] rounded px-1.5 py-0.5">
                                    {cat}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                </div>
              )}

              {/* ── 5. ALL AGENTS (LIST) ── */}
              {filtered.length > 0 && (
                <div id="all-agents" className="flex flex-col border border-[#141414] rounded-xl overflow-hidden bg-[#0a0a0a] mt-8">
                  {/* List Header */}
                  <div className="hidden sm:grid grid-cols-[60px_2fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[#141414] bg-[#0c0c0c] text-[10px] font-mono tracking-widest text-[#666] uppercase">
                    <div>Rank</div>
                    <div>Algorithm</div>
                    <div>Brier Score</div>
                    <div>Win Rate</div>
                    <div>Status</div>
                  </div>
                  {/* List Rows */}
                  <div className="flex flex-col divide-y divide-[#141414]">
                    {filtered.map((b, idx) => {
                      const brier = getBrier(b)
                      const wr    = b.scores?.[0]?.winRate ?? b.winRate ?? 0
                      const st    = deriveTag(b)
                      
                      return (
                        <Link
                          key={b.id}
                          href={`/bot/${b.slug || b.id}`}
                          className="group grid grid-cols-[40px_1fr] sm:grid-cols-[60px_2fr_1fr_1fr_1fr] gap-4 px-5 py-4 items-center no-underline hover:bg-[#0f0f0f] transition-colors"
                        >
                          <div className="text-[12px] font-mono text-[#555]">
                            #{idx + 1}
                          </div>
                          
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-[#222]">
                              {b.pfpUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={b.pfpUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <BotIrisAvatar {...botEye(b)} size={32} />
                              )}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[14px] font-bold text-white group-hover:text-primary transition-colors truncate">
                                {b.name}
                              </span>
                              <span className="text-[11px] text-[#666] truncate">
                                by {b.maker?.handle ? `@${b.maker.handle}` : (b.maker?.name || `${(b.walletAddress || 'anon').substring(0, 6)}…`)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="hidden sm:flex flex-col">
                            <span className={`text-[13px] font-mono ${brier <= 0.25 && brier > 0 ? 'text-primary font-bold' : 'text-[#aaa]'}`}>
                              {brier > 0 ? brier.toFixed(4) : '—'}
                            </span>
                          </div>
                          
                          <div className="hidden sm:flex flex-col">
                            <span className={`text-[13px] font-mono ${wr > 0.54 ? 'text-primary font-bold' : 'text-[#aaa]'}`}>
                              {wr > 0 ? `${(wr * 100).toFixed(1)}%` : '—'}
                            </span>
                          </div>
                          
                          <div className="hidden sm:flex items-center">
                            <StatusMark tag={st.tag} color={st.color} />
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
