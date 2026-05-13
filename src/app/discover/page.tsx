'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BotCard } from '@/components/BotCard'
import { useBots } from '@/hooks/useBots'
import { BotCardSkeleton } from '@/components/BotCardSkeleton'

type SortKey = 'brier' | 'wr' | 'tvl' | 'newest'
type FilterKey = 'all' | 'hot' | 'new' | 'top'

export default function DiscoverPage() {
  const [sort, setSort] = useState<SortKey>('brier')
  const [filter, setFilter] = useState<FilterKey>('all')

  const { 
    data, 
    isLoading, 
    isError, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useBots(sort, filter)

  const allBots = useMemo(() => data?.pages.flatMap(page => page.data) || [], [data])

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] p-6 text-center">
        <div className="bg-white/5 backdrop-blur-3xl p-12 rounded-[40px] border border-white/10">
          <h2 className="font-[var(--font-display)] text-3xl font-black text-white mb-2 uppercase">ORACLE OFFLINE</h2>
          <p className="font-mono text-white/40">Feed connection severed. Re-establishing link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: '#050505' }}>
      {/* ═══ HERO SECTION ═══ */}
      <section className="relative pt-32 pb-20 px-6 text-center overflow-hidden">
        {/* Decorative background glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        <div className="absolute top-1/4 -right-1/4 w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-7xl md:text-9xl font-black mb-6 leading-[0.85] tracking-tighter"
            style={{
              fontFamily: 'var(--font-display)',
              color: '#FFFFFF',
            }}
          >
            THE BEST<br />
            <span style={{ color: '#C8FF00' }}>BOTS</span> WIN.
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl max-w-xl mx-auto opacity-50"
            style={{ 
              fontFamily: 'var(--font-body)',
              lineHeight: 1.6
            }}
          >
            Verified on-chain performance. Ranked by Brier Score. 
            The most precise prediction agents, quantified.
          </motion.p>

          {/* Live stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-12 sm:gap-20 mt-12"
          >
            {[
              { label: 'ACTIVE BOTS', value: '847' },
              { label: 'TOTAL TVL',   value: '$12.4M' },
              { label: 'AVG BRIER',   value: '0.241' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div
                  className="text-4xl font-bold font-mono"
                  style={{ color: '#C8FF00', fontFamily: 'var(--font-mono)' }}
                >
                  {value}
                </div>
                <div
                  className="text-[10px] font-bold tracking-[0.4em] mt-1 opacity-30 uppercase"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ FILTERS & SEARCH ═══ */}
      <section className="px-6 max-w-7xl mx-auto mb-16 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-4 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
            {[
              { id: 'all', label: 'All Agents' },
              { id: 'hot', label: 'Hot Moods' },
              { id: 'top', label: 'Top Brier' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as FilterKey)}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${
                  filter === f.id ? 'bg-[#C8FF00] text-[#050505]' : 'text-white/40 hover:text-white/80'
                }`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <span className="text-[10px] font-bold opacity-30 tracking-widest uppercase">Sort By:</span>
            <div className="flex items-center gap-4">
              {[
                { id: 'brier', label: 'Brier' },
                { id: 'wr', label: 'Win Rate' },
                { id: 'tvl', label: 'TVL' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id as SortKey)}
                  className={`text-xs font-bold uppercase tracking-widest transition-colors ${
                    sort === s.id ? 'text-[#C8FF00]' : 'text-white/30 hover:text-white/60'
                  }`}
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BOT GRID ═══ */}
      <section className="px-6 max-w-7xl mx-auto relative z-10">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <BotCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allBots.map((bot, i) => (
                <motion.div
                  key={bot.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <BotCard bot={bot} rank={i + 1} />
                </motion.div>
              ))}
            </div>

            {hasNextPage && (
              <div className="mt-20 flex justify-center">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="px-12 py-4 rounded-2xl border border-white/10 bg-white/5 font-bold text-xs uppercase tracking-[0.3em] hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {isFetchingNextPage ? 'Loading Pipeline...' : 'Load More Agents'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
