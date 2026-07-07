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
            <div className="flex flex-col gap-10">
              {/* TOP 5 BOTS (CARDS) */}
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
              >
                {filtered.slice(0, 5).map((b, idx) => {
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
                        {/* rank badge */}
                        <div className="absolute top-0 left-0 bg-[#111] text-[#777] font-mono text-[10px] px-2 py-1 rounded-br-lg z-10 border-r border-b border-[#1a1a1a]">
                          #{idx + 1}
                        </div>
                        {/* head: name + status */}
                        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#141414] pl-10">
                          <span className="text-[13px] font-sans font-bold text-white group-hover:text-primary transition-colors truncate pr-2">
                            {b.name}
                          </span>
                          <StatusMark tag={st.tag} color={st.color} />
                        </div>

                        {/* avatar: the creature floats; photos get a round frame */}
                        <div className="relative flex justify-center py-6 border-b border-[#141414]">
                          {b.pfpUrl ? (
                            <span className="relative w-[76px] h-[76px] rounded-full overflow-hidden border border-[#222] group-hover:border-primary/35 transition-colors flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={b.pfpUrl} alt={b.name} className="w-full h-full object-cover" />
                            </span>
                          ) : (
                            <span className="relative transition-transform duration-300 group-hover:scale-110">
                              <BotIrisAvatar {...botEye(b)} size={76} />
                            </span>
                          )}
                        </div>

                        {/* stats */}
                        <div className="p-3.5 flex flex-col gap-2.5">
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { lbl: 'BRIER',  val: brier > 0 ? brier.toFixed(3) : '—', good: brier <= 0.25 && brier > 0 },
                              { lbl: 'WIN %',  val: wr > 0 ? `${(wr * 100).toFixed(0)}%` : '—', good: wr > 0.54 },
                              { lbl: 'SHARPE', val: sharpe > 0 ? sharpe.toFixed(2) : '—', good: sharpe > 1.5 },
                            ].map(({ lbl, val, good }) => (
                              <div key={lbl} className="bg-[#070707] border border-[#141414] rounded p-2 flex flex-col gap-0.5">
                                <span className="text-[8px] font-mono text-[#555] tracking-widest">{lbl}</span>
                                <span className={`text-[13px] font-mono font-bold ${good ? 'text-primary' : 'text-white'}`}>{val}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
                            <span className="text-[#555] tracking-widest">VAULT TVL</span>
                            <span className={tvl > 0 ? 'text-white font-bold' : 'text-[#444]'}>
                              {tvl > 0 ? `$${tvl.toLocaleString()}` : '—'}
                            </span>
                          </div>

                          {/* footer: maker + category */}
                          <div className="flex items-center justify-between gap-2 border-t border-[#141414] pt-2.5">
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

              {/* REST OF BOTS (LIST) */}
              {filtered.length > 5 && (
                <div className="flex flex-col border border-[#141414] rounded-xl overflow-hidden bg-[#0a0a0a]">
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
                    {filtered.slice(5).map((b, idx) => {
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
                            #{idx + 6}
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
