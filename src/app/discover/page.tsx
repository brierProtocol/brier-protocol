'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BotCard } from '@/components/BotCard';
import { bots as allBots } from '@/data/bots';

type SortKey = 'brier' | 'wr' | 'tvl' | 'newest';
type FilterKey = 'all' | 'hot' | 'new' | 'top';

export default function DiscoverPage() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('brier');
  const [filter, setFilter] = useState<FilterKey>('all');

  const filteredBots = useMemo(() => {
    let result = [...allBots];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.builder.toLowerCase().includes(q) ||
          b.markets.some((m) => m.toLowerCase().includes(q))
      );
    }

    // Filter
    if (filter === 'hot') {
      result = result.filter((b) => b.return7d > 3);
    } else if (filter === 'new') {
      result = result.filter((b) => b.publishedDays <= 30);
    } else if (filter === 'top') {
      result = result.filter((b) => b.brierScore < 0.2);
    }

    // Sort
    switch (sort) {
      case 'brier':
        result.sort((a, b) => a.brierScore - b.brierScore);
        break;
      case 'wr':
        result.sort((a, b) => b.winRate - a.winRate);
        break;
      case 'tvl':
        result.sort((a, b) => b.tvl - a.tvl);
        break;
      case 'newest':
        result.sort((a, b) => a.publishedDays - b.publishedDays);
        break;
    }

    return result;
  }, [search, sort, filter]);

  return (
    <div className="min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="font-[var(--font-syne)] text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-white mb-2">
            Discover Vaults
          </h1>
          <p className="text-sm text-[#666]">
            Find the best quant bots and deploy your capital.
          </p>
        </motion.div>

        {/* Search + Filters */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 flex flex-col sm:flex-row gap-4"
        >
          {/* Search */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bots, builders, markets..."
              className="w-full rounded-xl border border-[#222] bg-[#161616] py-3 pl-10 pr-4 text-sm text-white placeholder-[#555] outline-none transition-colors focus:border-[#C8FF00] focus:ring-1 focus:ring-[#C8FF00]/20"
            />
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 flex-wrap">
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
                className={`rounded-lg border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                  filter === key
                    ? 'border-[#C8FF00] bg-[#C8FF00]/10 text-[#C8FF00]'
                    : 'border-[#222] bg-[#161616] text-[#888] hover:border-[#444]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-xl border border-[#222] bg-[#161616] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#888] outline-none cursor-pointer hover:border-[#444] focus:border-[#C8FF00]"
          >
            <option value="brier">Best Brier</option>
            <option value="wr">Highest WR</option>
            <option value="tvl">Most TVL</option>
            <option value="newest">Newest</option>
          </select>
        </motion.div>

        {/* Results count */}
        <p className="text-xs text-[#555] mb-6 uppercase tracking-wider">
          {filteredBots.length} vault{filteredBots.length !== 1 ? 's' : ''} found
        </p>

        {/* Bot grid */}
        {filteredBots.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBots.map((bot, i) => (
              <BotCard key={bot.id} bot={bot} index={i} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-[#888] text-sm">No bots match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
