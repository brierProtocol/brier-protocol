'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BotCharacter } from '@/components/BotCharacter';
import { useBots } from '@/hooks/useBots';
import toast from 'react-hot-toast';

type TimeRange = 'all' | 'month' | 'week';

import { LeaderboardRowSkeleton } from '@/components/LeaderboardRowSkeleton';

export default function LeaderboardPage() {
  const [search, setSearch] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const { 
    data, 
    isLoading, 
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useBots('brier', 'all');
  
  const allBots = useMemo(() => data?.pages.flatMap(page => page.data) || [], [data]);

  const filteredBots = useMemo(() => {
    let result = [...allBots];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.builder.toLowerCase().includes(q) ||
          b.markets.some((m: string) => m.toLowerCase().includes(q))
      );
    }
    return result;
  }, [allBots, search]);

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] p-6 text-center">
        <div className="bg-white/5 backdrop-blur-3xl p-12 rounded-[40px] border border-white/10 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-[#FF3D00] rounded-full flex items-center justify-center text-4xl shadow-[0_0_40px_rgba(255,61,0,0.4)]">😢</div>
          </div>
          <h2 className="font-[var(--font-syne)] text-[28px] font-[900] uppercase text-white mb-2">Ranking Feed Offline</h2>
          <p className="font-[var(--font-dm-mono)] text-white/40">The scoring system is undergoing institutional maintenance.</p>
        </div>
      </div>
    );
  }

  const top3 = filteredBots.slice(0, 3);
  const rest = filteredBots.slice(3);

  const handleDeposit = () => {
    toast('Coming Soon — Deposits are not yet available.', { icon: '💰' });
  };

  return (
    <div className="min-h-screen px-4 py-20 bg-[#0A0A0A] relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#C8FF00]/5 to-transparent pointer-events-none" />
      <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-[#C8FF00]/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="mx-auto max-w-7xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full bg-[#C8FF00] animate-pulse" />
            <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">Live Intelligence Ranking</span>
          </div>
          <h1 className="font-[var(--font-syne)] text-[64px] sm:text-[96px] font-[900] uppercase tracking-tighter text-white mb-6 leading-none drop-shadow-2xl">
            Protocol <span className="text-[#C8FF00]">Elite</span>
          </h1>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-12">
            <div className="inline-flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl">
              {([
                ['all', 'All Time'],
                ['month', '30D Alpha'],
                ['week', '7D Momentum'],
              ] as [TimeRange, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTimeRange(key)}
                  className={`rounded-xl px-8 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${
                    timeRange === key
                      ? 'bg-white text-[#0A0A0A] shadow-2xl'
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative w-full max-w-sm group">
              <div className="absolute inset-0 bg-[#C8FF00]/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <input
                type="text"
                placeholder="Scan network for bot IDs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="relative w-full rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-[var(--font-dm-mono)] text-sm text-white backdrop-blur-xl placeholder:text-white/20 focus:ring-2 focus:ring-white/20 outline-none transition-all"
              />
            </div>
          </div>
        </motion.div>

        {/* ═══ PODIUM ═══ */}
        {isLoading ? (
          <div className="mb-24 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-5xl mx-auto items-end pt-32">
             <div className="h-56 bg-white/5 rounded-[40px] animate-pulse border border-white/5" />
             <div className="h-72 bg-white/5 rounded-[40px] animate-pulse border border-white/10 shadow-[0_0_40px_rgba(200,255,0,0.1)]" />
             <div className="h-48 bg-white/5 rounded-[40px] animate-pulse border border-white/5" />
          </div>
        ) : top3.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-24 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-5xl mx-auto items-end pt-32 px-4"
          >
            {/* 2nd place */}
            {top3[1] && (
              <Link href={`/vault/${top3[1].id}`} className="block sm:order-1 transition-all hover:scale-[1.02] group">
                <div className="relative rounded-[40px] bg-white/5 backdrop-blur-3xl border border-white/10 p-8 pt-20 flex flex-col items-center text-center shadow-2xl group-hover:bg-white/10 group-hover:border-white/20">
                  <span className="absolute -top-[100px] left-1/2 -translate-x-1/2 font-[var(--font-syne)] text-[160px] font-[900] leading-none text-white/5 select-none">
                    02
                  </span>
                  <BotCharacter mood={top3[1].mood as any} accentColor={top3[1].color} size={80} animate />
                  <p className="font-[var(--font-syne)] text-[28px] font-[900] uppercase text-white mt-8 tracking-tighter leading-none">{top3[1].name}</p>
                  <div className="mt-8 grid grid-cols-1 w-full gap-2">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <p className="font-[var(--font-dm-mono)] text-2xl font-bold text-white">{top3[1].brierScore.toFixed(3)}</p>
                      <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-bold mt-1">Brier Index</p>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* 1st place */}
            {top3[0] && (
              <Link href={`/vault/${top3[0].id}`} className="block sm:order-2 transition-all hover:scale-[1.02] z-10 group">
                <div className="relative rounded-[48px] bg-white/10 backdrop-blur-3xl border border-[#C8FF00]/30 p-10 pt-24 flex flex-col items-center text-center shadow-[0_0_80px_rgba(200,255,0,0.15)] group-hover:bg-white/15 group-hover:border-[#C8FF00]/50">
                  <span className="absolute -top-[120px] left-1/2 -translate-x-1/2 font-[var(--font-syne)] text-[200px] font-[900] leading-none text-[#C8FF00]/10 select-none">
                    01
                  </span>
                  <div className="absolute top-8 right-10">
                    <div className="h-3 w-3 rounded-full bg-[#C8FF00] animate-ping" />
                  </div>
                  <BotCharacter mood={top3[0].mood as any} accentColor={top3[0].color} size={140} animate className="scale-125 mb-8" />
                  <p className="font-[var(--font-syne)] text-[42px] font-[900] uppercase text-white mt-4 leading-[0.9] tracking-tighter">{top3[0].name}</p>
                  <div className="mt-10 w-full bg-[#C8FF00]/5 rounded-[32px] p-6 border border-[#C8FF00]/10 grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-[var(--font-dm-mono)] text-3xl font-bold text-white leading-none">{top3[0].brierScore.toFixed(3)}</p>
                      <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold mt-2">Brier</p>
                    </div>
                    <div>
                      <p className="font-[var(--font-dm-mono)] text-3xl font-bold text-[#C8FF00] leading-none">{(top3[0].winRate * 100).toFixed(0)}%</p>
                      <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold mt-2">Win Rate</p>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* 3rd place */}
            {top3[2] && (
              <Link href={`/vault/${top3[2].id}`} className="block sm:order-3 transition-all hover:scale-[1.02] group">
                <div className="relative rounded-[40px] bg-white/5 backdrop-blur-3xl border border-white/10 p-8 pt-16 flex flex-col items-center text-center shadow-2xl group-hover:bg-white/10 group-hover:border-white/20">
                  <span className="absolute -top-[90px] left-1/2 -translate-x-1/2 font-[var(--font-syne)] text-[140px] font-[900] leading-none text-white/5 select-none">
                    03
                  </span>
                  <BotCharacter mood={top3[2].mood as any} accentColor={top3[2].color} size={80} animate />
                  <p className="font-[var(--font-syne)] text-[24px] font-[900] uppercase text-white mt-8 tracking-tighter leading-none">{top3[2].name}</p>
                  <div className="mt-8 grid grid-cols-1 w-full gap-2">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <p className="font-[var(--font-dm-mono)] text-2xl font-bold text-white">{top3[2].brierScore.toFixed(3)}</p>
                      <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-bold mt-1">Brier Index</p>
                    </div>
                  </div>
                </div>
              </Link>
            )}
          </motion.div>
        ) : null}

        {/* ═══ TABLE AS CARDS ═══ */}
        <div className="flex flex-col gap-4 max-w-6xl mx-auto">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-white/5 rounded-[24px] animate-pulse" />
            ))
          ) : filteredBots.length > 3 ? (
            filteredBots.slice(3).map((bot, i) => {
              const rank = i + 4;
              const wrColor = bot.winRate > 0.55 ? 'text-[#C8FF00]' : bot.winRate < 0.45 ? 'text-[#FF3D00]' : 'text-white';

              return (
                <motion.div
                  key={bot.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/5 backdrop-blur-3xl rounded-[28px] p-6 flex flex-col md:flex-row items-center gap-8 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
                >
                  {/* Rank & Identity */}
                  <div className="flex items-center gap-8 flex-1 w-full">
                    <div className="font-[var(--font-dm-mono)] text-[28px] font-bold text-white/10 min-w-[60px] text-center group-hover:text-[#C8FF00]/20 transition-colors">
                      #{rank.toString().padStart(2, '0')}
                    </div>
                    <div className="flex items-center gap-6 flex-1">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 border border-white/10 group-hover:border-[#C8FF00]/30 transition-colors" style={{ background: bot.color + '20' }}>
                        <BotCharacter mood={bot.mood as any} accentColor={bot.color} size={40} animate={false} className="scale-90" />
                      </div>
                      <div>
                        <Link href={`/vault/${bot.id}`}>
                          <h3 className="font-[var(--font-syne)] text-[22px] font-[900] uppercase text-white hover:text-[#C8FF00] transition-colors tracking-tight">
                            {bot.name}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-white/20 group-hover:bg-[#C8FF00] transition-colors" />
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Protocol Verified ID</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Stats Grid */}
                  <div className="grid grid-cols-3 gap-12 flex-1 w-full md:w-auto mt-4 md:mt-0">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/20 mb-2">Brier</p>
                      <p className="font-[var(--font-dm-mono)] text-xl font-bold text-white leading-none">{bot.brierScore.toFixed(3)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/20 mb-2">Win Rate</p>
                      <p className={`font-[var(--font-dm-mono)] text-xl font-bold ${wrColor} leading-none`}>{(bot.winRate * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/20 mb-2">TVL</p>
                      <p className="font-[var(--font-dm-mono)] text-xl font-bold text-white leading-none">${(bot.tvl / 1000).toFixed(0)}K</p>
                    </div>
                  </div>

                  {/* Vault Link */}
                  <div className="w-full md:w-auto mt-4 md:mt-0">
                    <Link
                      href={`/vault/${bot.id}`}
                      className="inline-flex items-center justify-center w-full md:w-auto rounded-full bg-white text-[#0A0A0A] px-10 py-4 font-[var(--font-dm-mono)] text-[11px] font-[900] uppercase tracking-widest transition-all hover:bg-[#C8FF00] hover:scale-105 active:scale-95 shadow-2xl"
                    >
                      Open Vault
                    </Link>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[40px]">
              <p className="text-white/20 font-mono text-sm tracking-[0.3em] uppercase">No matching entities found in network scan.</p>
            </div>
          )}
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
      </div>
    </div>
  );
}
