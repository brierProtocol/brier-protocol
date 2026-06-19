'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import { botEye, makerEye } from '@/lib/botIdentity'
import { motion } from 'framer-motion'
import type { BotListItem } from '@/types'

type SortKey = 'brier' | 'yield' | 'tvl' | 'new'
type MarketKey = 'all' | 'crypto' | 'politics' | 'sports'

const SORT_OPTIONS = [
  { id: 'brier',  label: 'Brier Score' },
  { id: 'tvl',    label: 'TVL' },
  { id: 'new',    label: 'Newest' },
] as const

const MARKET_TABS: { id: MarketKey; label: string }[] = [
  { id: 'all',      label: 'ALL' },
  { id: 'crypto',   label: 'CRYPTO' },
  { id: 'politics', label: 'POLITICS' },
  { id: 'sports',   label: 'SPORTS' },
]

function statusLabel(s: string) {
  if (['LIVE','live'].includes(s)) return { text: 'LIVE', color: '#C8FF00' }
  if (s === 'VAULT_ELIGIBLE_T1') return { text: 'VAULT T1', color: '#3B82F6' }
  if (s === 'VAULT_ELIGIBLE_T2') return { text: 'VAULT T2', color: '#D4AF37' }
  if (s === 'SUSPENDED') return { text: 'SUSPENDED', color: '#FF3B3B' }
  return { text: 'PAPER', color: '#555' }
}

function matchesMarket(bot: BotListItem, market: MarketKey): boolean {
  if (market === 'all') return true
  const m = [bot.market, ...(bot.markets || [])].join(' ').toLowerCase()
  if (market === 'crypto')   return m.includes('crypto') || m.includes('btc') || m.includes('eth') || m.includes('solana')
  if (market === 'politics') return m.includes('polit') || m.includes('elect') || m.includes('president')
  if (market === 'sports')   return m.includes('sport') || m.includes('nba') || m.includes('nfl') || m.includes('soccer')
  return true
}

export default function DiscoverPage() {
  const router = useRouter()
  const [activeSort, setActiveSort]   = useState<SortKey>('brier')
  const [activeMarket, setActiveMarket] = useState<MarketKey>('all')
  const [search, setSearch]           = useState('')
  const [botsData, setBotsData]       = useState<BotListItem[]>([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    fetch('/api/bots')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setBotsData(data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const getBrier    = (b: BotListItem) => b.scores?.[0]?.brierScore ?? b.brierScore ?? 0
  const getTvl      = (b: BotListItem) => b.currentTVL ?? b.tvl ?? 0
  const getYield    = (b: BotListItem) => b.monthlyYield ?? 0
  const getCreated  = (b: BotListItem) => new Date(b.createdAt || 0).getTime()

  const filtered = botsData
    .filter(b => matchesMarket(b, activeMarket))
    .filter(b => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        b.name?.toLowerCase().includes(q) ||
        (b.slug || '').toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q) ||
        (b.walletAddress || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (activeSort === 'brier') return getBrier(a) - getBrier(b)
      if (activeSort === 'yield') return getYield(b) - getYield(a)
      if (activeSort === 'tvl')   return getTvl(b) - getTvl(a)
      if (activeSort === 'new')   return getCreated(b) - getCreated(a)
      return 0
    })

  return (
    <div className="min-h-screen bg-[#030303] text-white">

      {/* HEADER */}
      <div className="border-b border-[#1a1a1a] bg-[#050505] px-12 py-6">
        <div className="max-w-[1200px] mx-auto flex justify-between items-end flex-wrap gap-6">
          <div>
            <h1 className="font-mono font-bold text-white text-xl tracking-tight mb-1">
              DISCOVER_ALGORITHMS
            </h1>
            <p className="text-[#555] text-xs font-mono m-0">
              {loading ? 'Loading...' : `${filtered.length} algorithm${filtered.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-[#444] text-xs font-mono">⌕</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, slug..."
                className="bg-[#080808] border border-[#1a1a1a] text-white font-mono py-2 pr-3 pl-8 outline-none w-[240px] text-xs transition-colors focus:border-[#333] placeholder-[#333]"
              />
            </div>
            <Link href="/list-bot" className="text-primary text-xs font-mono font-bold tracking-widest hover:drop-shadow-[0_0_8px_rgba(255,42,77,0.5)] transition-all">
              SUBMIT →
            </Link>
          </div>
        </div>
      </div>

      {/* MARKET TABS + SORT */}
      <div className="border-b border-[#111] px-12 bg-[#030303]">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between py-3">
          <div className="flex gap-1">
            {MARKET_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveMarket(t.id)}
                className={`mkt-tab ${activeMarket === t.id ? 'active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 items-center">
            <span className="text-[#333] font-mono text-[10px] mr-2">SORT:</span>
            {SORT_OPTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSort(s.id as SortKey)}
                className={`mkt-tab ${activeSort === s.id ? 'active' : ''}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="max-w-[1200px] mx-auto px-12 py-10">
        {loading ? (
          <div className="text-center py-24 font-mono text-xs text-[#333]">
            <div className="cursor-blink inline-block">&gt; SYNCHRONIZING_ONCHAIN_DATA</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 font-mono text-xs text-[#333]">
            <div className="mb-4">&gt; NO_ALGORITHMS_FOUND</div>
            <Link href="/list-bot" className="text-primary hover:underline">submit one →</Link>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          >
            {filtered.map((b) => {
              const brier  = getBrier(b)
              const wr     = b.scores?.[0]?.winRate ?? b.winRate ?? 0
              const tvl    = getTvl(b)
              const yld    = getYield(b)
              const sharpe = b.scores?.[0]?.sharpeRatio ?? b.sharpe ?? 0
              const st     = statusLabel(b.status || 'PAPER')

              return (
                <motion.div
                  key={b.id}
                  variants={{
                    hidden: { opacity: 0, y: 16, scale: 0.97 },
                    show:   { opacity: 1, y: 0, scale: 1, transition: { ease: [0.16,1,0.3,1], duration: 0.4 } },
                  }}
                  whileHover={{ y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <Link
                    href={`/bot/${b.slug || b.id}`}
                    className="flex flex-col bg-[#080808] border border-[#1a1a1a] no-underline group relative overflow-hidden transition-all hover:border-[#2a2a2a] hover:shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_0_0.5px_rgba(255,42,77,0.08)]"
                  >
                    {/* Corner brackets */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#1a1a1a] group-hover:border-primary/30 transition-colors" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#1a1a1a] group-hover:border-primary/30 transition-colors" />

                    {/* Status bar */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[#111]">
                      <span className="text-[11px] font-mono text-white font-semibold group-hover:text-primary transition-colors truncate pr-2">
                        {b.name}
                      </span>
                      <span className="text-[9px] font-mono flex items-center gap-1 shrink-0" style={{ color: st.color }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: st.color }} />
                        {st.text}
                      </span>
                    </div>

                    {/* Avatar */}
                    <div className="flex justify-center items-center py-6 bg-[#050505] border-b border-[#111]">
                      {b.pfpUrl ? (
                        <img src={b.pfpUrl} alt={b.name} className="w-16 h-16 object-cover border border-[#1a1a1a] group-hover:border-primary/30 transition-colors" />
                      ) : (
                        <BotIrisAvatar {...botEye(b)} size={64} />
                      )}
                    </div>

                    {/* Stats */}
                    <div className="p-3 flex flex-col gap-2">
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { lbl: 'BRIER', val: brier.toFixed(3), good: brier <= 0.25 && brier > 0 },
                          { lbl: 'WIN %', val: `${(wr * 100).toFixed(1)}%`, good: wr > 0.54 },
                          { lbl: 'SHARPE', val: sharpe > 0 ? sharpe.toFixed(2) : '—', good: sharpe > 1.5 },
                        ].map(({ lbl, val, good }) => (
                          <div key={lbl} className="bg-[#060606] border border-[#111] p-2 flex flex-col gap-0.5">
                            <span className="text-[9px] font-mono text-[#333] tracking-widest">{lbl}</span>
                            <span className={`text-xs font-mono font-bold ${good ? 'text-[#C8FF00]' : 'text-white'}`}>{val}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center text-[11px] font-mono pt-1 border-t border-[#111] mt-1">
                        <span className="text-[#333]">VAULT TVL</span>
                        <span className={`font-bold ${tvl > 0 ? 'text-white' : 'text-[#333]'}`}>
                          {tvl > 0 ? `$${tvl.toLocaleString()}` : '—'}
                        </span>
                      </div>

                      {yld > 0 && (
                        <div className="flex justify-between items-center text-[11px] font-mono">
                          <span className="text-[#333]">MTH YIELD</span>
                          <span className="text-[#C8FF00] font-bold">+{yld}%</span>
                        </div>
                      )}

                      {/* Maker attribution — clickable, navigates to the maker profile */}
                      <span
                        role="link"
                        tabIndex={0}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (b.walletAddress) router.push(`/maker/${b.walletAddress}`) }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && b.walletAddress) { e.preventDefault(); e.stopPropagation(); router.push(`/maker/${b.walletAddress}`) } }}
                        className="flex items-center gap-1.5 text-[10px] font-mono text-[#444] truncate hover:text-primary transition-colors cursor-pointer w-fit"
                      >
                        <span className="rounded-full overflow-hidden shrink-0 inline-flex">
                          {b.maker?.pfpUrl
                            ? <img src={b.maker.pfpUrl} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                            : <BotIrisAvatar {...makerEye(b.walletAddress || 'anon')} size={14} />}
                        </span>
                        by {b.maker?.handle ? `@${b.maker.handle}` : (b.maker?.name || `${(b.walletAddress || 'anon').substring(0, 6)}…`)}
                      </span>
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
