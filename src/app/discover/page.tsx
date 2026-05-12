'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BotCard } from '@/components/BotCard';
import { useBots } from '@/hooks/useBots';

type SortKey = 'brier' | 'wr' | 'tvl' | 'newest';
type FilterKey = 'all' | 'hot' | 'new' | 'top';

import { BotCardSkeleton } from '@/components/BotCardSkeleton';

export default function DiscoverPage() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('brier');
  const [filter, setFilter] = useState<FilterKey>('all');

  const { 
    data, 
    isLoading, 
    isError, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useBots(sort, filter);

  const allBots = useMemo(() => data?.pages.flatMap(page => page.data) || [], [data]);

  const filteredBots = useMemo(() => {
    let result = [...allBots];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.builder.toLowerCase().includes(q) ||
          b.markets.some((m: string) => m.toLowerCase().includes(q))
      );
    }

    // Filter
    if (filter === 'hot') {
      result = result.filter((b) => b.mood === 'happy' || b.mood === 'cool');
    } else if (filter === 'top') {
      result = result.filter((b) => b.brierScore < 0.2);
    }

    return result;
  }, [allBots, search, filter]);

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] p-6 text-center">
        <div className="bg-white/5 backdrop-blur-3xl p-12 rounded-[40px] border border-white/10 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-[#FF3D00] rounded-full flex items-center justify-center text-4xl shadow-[0_0_40px_rgba(255,61,0,0.4)]">😢</div>
          </div>
          <h2 className="font-[var(--font-syne)] text-[28px] font-[900] uppercase text-white mb-2">Feed Offline</h2>
          <p className="font-[var(--font-dm-mono)] text-white/40">Oracle connection severed. Re-establishing link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-20 bg-[#0A0A0A] relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#C8FF00]/5 to-transparent pointer-events-none" />
      
      <div className="mx-auto max-w-7xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-20 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full bg-[#C8FF00] animate-pulse" />
            <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">Institutional Feed Active</span>
          </div>
          <h1 className="font-[var(--font-syne)] text-[64px] sm:text-[84px] font-[900] uppercase tracking-tighter text-white mb-6 leading-none">
            Discovery <span className="text-[#C8FF00]">Matrix</span>
          </h1>
          <p className="text-xl font-medium text-white/40 max-w-2xl mx-auto">
            Scan the protocol for validated quantitative agents and deploy capital into verified vaults.
          </p>
        </motion.div>

        {/* Search + Filters Strip */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12 flex flex-col lg:flex-row gap-6 items-center"
        >
          {/* Search */}
          <div className="relative w-full lg:w-auto lg:flex-1 group">
            <div className="absolute inset-0 bg-[#C8FF00]/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <input
              type="text"
              placeholder="Search by bot ID, strategy, or builder..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="relative w-full rounded-2xl border border-white/10 bg-white/5 px-8 py-5 font-[var(--font-dm-mono)] text-sm text-white backdrop-blur-xl placeholder:text-white/20 focus:ring-2 focus:ring-white/20 outline-none transition-all"
            />
            <svg
              className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            {(
              [
                ['all', 'All'],
                ['top', 'Top Alpha'],
                ['hot', 'Trending'],
                ['new', 'Recent'],
              ] as [FilterKey, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`whitespace-nowrap rounded-xl px-8 py-4 font-[var(--font-dm-mono)] text-[10px] font-bold uppercase tracking-widest transition-all ${
                  filter === key
                    ? 'bg-white text-[#0A0A0A] shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                    : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-xl bg-white/5 border border-white/5 px-8 py-4 font-[var(--font-dm-mono)] text-[10px] font-bold uppercase tracking-widest text-white outline-none cursor-pointer hover:bg-white/10 transition-all"
            >
              <option value="brier" className="bg-[#0A0A0A]">Rank by Brier</option>
              <option value="wr" className="bg-[#0A0A0A]">Rank by Winrate</option>
              <option value="tvl" className="bg-[#0A0A0A]">Rank by TVL</option>
              <option value="newest" className="bg-[#0A0A0A]">Newest Entities</option>
            </select>
          </div>
        </motion.div>

        {/* Results count */}
        <p className="font-[var(--font-dm-mono)] text-[10px] font-bold text-white/20 mb-10 uppercase tracking-[0.3em] pl-2 flex items-center gap-3">
          <span className="h-1 w-1 rounded-full bg-[#C8FF00]" />
          {filteredBots.length} validated entit{filteredBots.length !== 1 ? 'ies' : 'y'} active
        </p>
        
        {/* Bot grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <BotCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredBots.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredBots.map((bot, i) => (
                <BotCard key={bot.id} bot={bot} index={i} />
              ))}
            </div>
            
            {/* Load More */}
            {hasNextPage && (
              <div className="mt-20 text-center">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="rounded-full border border-white/10 bg-white/5 backdrop-blur-xl px-12 py-5 font-[var(--font-dm-mono)] text-sm font-[900] uppercase tracking-[0.3em] text-white transition-all hover:bg-white hover:text-[#0A0A0A] disabled:opacity-50"
                >
                  {isFetchingNextPage ? 'Decoding...' : 'Load More Entities'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 text-center bg-white/5 rounded-[40px] border border-dashed border-white/10">
            <p className="text-4xl mb-6 opacity-40">🔍</p>
            <p className="font-[var(--font-syne)] text-[24px] font-[900] uppercase text-white tracking-tighter">No Entities Found</p>
            <p className="font-[var(--font-dm-mono)] text-white/30 text-xs uppercase tracking-widest mt-4">Adjust network scan parameters</p>
          </div>
        )}
      </div>

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
