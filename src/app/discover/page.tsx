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
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3EE] p-6">
        <div className="bg-white p-12 rounded-[40px] text-center max-w-md shadow-xl border-4 border-[#FF3D00]">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-[#FF3D00] rounded-full flex items-center justify-center text-4xl">😢</div>
          </div>
          <h2 className="font-[var(--font-syne)] text-[28px] font-[900] uppercase text-[#0A0A0A] mb-2">Feed temporalmente offline</h2>
          <p className="font-[var(--font-dm-mono)] text-[#0A0A0A]/60">No pudimos conectar con los oráculos de datos. Reintentando automáticamente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:py-16 bg-[#F5F3EE]">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <h1 className="font-[var(--font-syne)] text-[48px] sm:text-[64px] font-[900] uppercase tracking-tight text-[#0A0A0A] mb-4 leading-none">
            Discover Vaults
          </h1>
          <p className="text-lg font-medium text-[#0A0A0A]/60">
            Find the best quant bots and deploy your capital.
          </p>
        </motion.div>

        {/* Search + Filters Strip */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 flex flex-col md:flex-row gap-4 items-center"
        >
          {/* Search */}
          <div className="relative w-full md:w-auto md:flex-1">
            <svg
              className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#0A0A0A]/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bots, builders, markets..."
              className="w-full rounded-full bg-white py-4 pl-12 pr-6 font-[var(--font-dm-mono)] text-sm text-[#0A0A0A] placeholder-[#0A0A0A]/40 outline-none shadow-sm transition-shadow focus:shadow-md focus:ring-2 focus:ring-[#0A0A0A]"
            />
          </div>

          {/* Filter pills - Horizontal scroll on mobile */}
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar shrink-0">
            {(
              [
                ['all', 'All'],
                ['top', 'Top Rated'],
                ['hot', '🔥 Hot'],
                ['new', '✨ New'],
              ] as [FilterKey, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`whitespace-nowrap rounded-full px-6 py-4 font-[var(--font-dm-mono)] text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] ${
                  filter === key
                    ? 'bg-[#0A0A0A] text-white shadow-sm'
                    : 'bg-white text-[#0A0A0A] hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}

            {/* Sort Dropdown */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-full bg-white px-6 py-4 font-[var(--font-dm-mono)] text-xs font-bold uppercase tracking-wider text-[#0A0A0A] outline-none cursor-pointer shadow-sm hover:bg-gray-50 shrink-0"
            >
              <option value="brier">Best Brier</option>
              <option value="wr">Highest WR</option>
              <option value="tvl">Most TVL</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </motion.div>

        {/* Results count */}
        <p className="font-[var(--font-dm-mono)] text-xs font-bold text-[#0A0A0A]/40 mb-6 uppercase tracking-wider pl-2">
          {filteredBots.length} vault{filteredBots.length !== 1 ? 's' : ''} found
        </p>
        
        {/* Bot grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <BotCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredBots.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredBots.map((bot, i) => (
                <BotCard key={bot.id} bot={bot} index={i} />
              ))}
            </div>
            
            {/* Load More */}
            {hasNextPage && (
              <div className="mt-12 text-center">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="rounded-full bg-white px-10 py-4 font-[var(--font-dm-mono)] text-sm font-bold uppercase tracking-wider text-[#0A0A0A] shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {isFetchingNextPage ? 'Loading more...' : 'Load More Bots'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-[24px]">
            <p className="text-4xl mb-4">🔍</p>
            <p className="font-[var(--font-syne)] text-[24px] font-[900] uppercase text-[#0A0A0A]">No bots found</p>
            <p className="font-[var(--font-dm-mono)] text-[#0A0A0A]/50 mt-2">Try adjusting your filters or search term.</p>
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
