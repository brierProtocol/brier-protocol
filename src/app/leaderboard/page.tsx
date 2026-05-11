'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BotCharacter } from '@/components/BotCharacter';
import { getBotsByRank } from '@/data/bots';
import toast from 'react-hot-toast';

type TimeRange = 'all' | 'month' | 'week';

export default function LeaderboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const rankedBots = getBotsByRank();
  const top3 = rankedBots.slice(0, 3);
  const rest = rankedBots.slice(3);

  const handleDeposit = () => {
    toast('Coming Soon — Deposits are not yet available.', { icon: '💰' });
  };

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
            Leaderboard
          </h1>
          
          {/* Time tabs - White Pill style */}
          <div className="inline-flex gap-2 bg-white p-1.5 rounded-full shadow-sm mt-2">
            {([
              ['all', 'All Time'],
              ['month', 'This Month'],
              ['week', 'This Week'],
            ] as [TimeRange, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTimeRange(key)}
                className={`rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                  timeRange === key
                    ? 'bg-[#0A0A0A] text-white'
                    : 'bg-transparent text-[#0A0A0A] hover:bg-[#F5F3EE]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ═══ PODIUM ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto items-end pt-20"
        >
          {/* 2nd place */}
          <Link href={`/vault/${top3[1].id}`} className="block sm:order-1 transition-transform hover:-translate-y-2">
            <div className="relative rounded-[24px] p-6 pt-16 flex flex-col items-center text-center shadow-lg" style={{ background: top3[1].color, minHeight: '260px' }}>
              <span className="absolute -top-[70px] left-1/2 -translate-x-1/2 font-[var(--font-syne)] text-[120px] font-[900] leading-none text-white/90 drop-shadow-md">
                2
              </span>
              <BotCharacter color={top3[1].color} mood={top3[1].mood} size="md" animated />
              <p className="font-[var(--font-syne)] text-[24px] font-[900] uppercase text-white mt-4">{top3[1].name}</p>
              <div className="mt-4 bg-white/20 rounded-[12px] px-4 py-2 backdrop-blur-sm">
                <p className="font-[var(--font-dm-mono)] text-xl font-bold text-white">{top3[1].brierScore.toFixed(3)}</p>
                <p className="text-[10px] text-white/80 uppercase tracking-wider font-bold">Brier</p>
              </div>
            </div>
          </Link>

          {/* 1st place */}
          <Link href={`/vault/${top3[0].id}`} className="block sm:order-2 transition-transform hover:-translate-y-2 z-10">
            <div className="relative rounded-[24px] p-6 pt-20 flex flex-col items-center text-center shadow-2xl" style={{ background: top3[0].color, minHeight: '320px' }}>
              <span className="absolute -top-[80px] left-1/2 -translate-x-1/2 font-[var(--font-syne)] text-[140px] font-[900] leading-none text-white drop-shadow-lg">
                1
              </span>
              <BotCharacter color={top3[0].color} mood={top3[0].mood} size="lg" animated className="scale-110 mb-4" />
              <p className="font-[var(--font-syne)] text-[32px] font-[900] uppercase text-white mt-2 leading-tight">{top3[0].name}</p>
              <span className="bg-white text-[#0A0A0A] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mt-2">
                Top Alpha
              </span>
              <div className="mt-5 w-full bg-white/20 rounded-[16px] px-4 py-3 backdrop-blur-sm grid grid-cols-2 gap-2">
                <div>
                  <p className="font-[var(--font-dm-mono)] text-2xl font-bold text-white">{top3[0].brierScore.toFixed(3)}</p>
                  <p className="text-[10px] text-white/80 uppercase tracking-wider font-bold">Brier</p>
                </div>
                <div>
                  <p className="font-[var(--font-dm-mono)] text-2xl font-bold text-white">{(top3[0].winRate * 100).toFixed(0)}%</p>
                  <p className="text-[10px] text-white/80 uppercase tracking-wider font-bold">Win Rate</p>
                </div>
              </div>
            </div>
          </Link>

          {/* 3rd place */}
          <Link href={`/vault/${top3[2].id}`} className="block sm:order-3 transition-transform hover:-translate-y-2">
            <div className="relative rounded-[24px] p-6 pt-16 flex flex-col items-center text-center shadow-lg" style={{ background: top3[2].color, minHeight: '240px' }}>
              <span className="absolute -top-[65px] left-1/2 -translate-x-1/2 font-[var(--font-syne)] text-[110px] font-[900] leading-none text-white/90 drop-shadow-md">
                3
              </span>
              <BotCharacter color={top3[2].color} mood={top3[2].mood} size="md" animated />
              <p className="font-[var(--font-syne)] text-[20px] font-[900] uppercase text-white mt-4">{top3[2].name}</p>
              <div className="mt-4 bg-white/20 rounded-[12px] px-4 py-2 backdrop-blur-sm">
                <p className="font-[var(--font-dm-mono)] text-lg font-bold text-white">{top3[2].brierScore.toFixed(3)}</p>
                <p className="text-[10px] text-white/80 uppercase tracking-wider font-bold">Brier</p>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* ═══ TABLE AS CARDS ═══ */}
        <div className="flex flex-col gap-3">
          {rest.map((bot, i) => {
            const rank = i + 4;
            const wrColor = bot.winRate > 0.55 ? 'text-[#C8FF00]' : bot.winRate < 0.45 ? 'text-[#FF3D00]' : 'text-[#0A0A0A]';

            return (
              <motion.div
                key={bot.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="bg-white rounded-[20px] p-4 flex flex-col md:flex-row items-center gap-4 md:gap-6 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Rank & Identity */}
                <div className="flex items-center gap-6 flex-1 w-full">
                  <div className="font-[var(--font-syne)] text-[32px] font-[900] text-[#0A0A0A]/20 min-w-[50px] text-right">
                    #{rank}
                  </div>
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{ background: bot.color }}>
                      <BotCharacter color={bot.color} mood={bot.mood} size="sm" animated={false} className="scale-75" />
                    </div>
                    <div>
                      <Link href={`/vault/${bot.id}`}>
                        <h3 className="font-[var(--font-syne)] text-[20px] font-[900] uppercase text-[#0A0A0A] hover:opacity-70 transition-opacity">
                          {bot.name}
                        </h3>
                      </Link>
                      <p className="text-xs font-medium text-[#0A0A0A]/50">by {bot.builder}</p>
                    </div>
                  </div>
                </div>

                {/* Desktop Stats Grid */}
                <div className="grid grid-cols-4 gap-4 md:gap-8 flex-1 w-full md:w-auto mt-4 md:mt-0 text-center md:text-left">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-[#0A0A0A]/40 mb-1">Brier</p>
                    <p className="font-[var(--font-dm-mono)] text-lg font-bold text-[#0A0A0A]">{bot.brierScore.toFixed(3)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-[#0A0A0A]/40 mb-1">Win Rate</p>
                    <p className={`font-[var(--font-dm-mono)] text-lg font-bold ${wrColor}`}>{(bot.winRate * 100).toFixed(1)}%</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-[#0A0A0A]/40 mb-1">TVL</p>
                    <p className="font-[var(--font-dm-mono)] text-lg font-bold text-[#0A0A0A]">${(bot.tvl / 1000).toFixed(0)}K</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-[#0A0A0A]/40 mb-1">7D Return</p>
                    <p className={`font-[var(--font-dm-mono)] text-lg font-bold ${bot.return7d >= 0 ? 'text-[#C8FF00]' : 'text-[#FF3D00]'}`}>
                      {bot.return7d >= 0 ? '+' : ''}{bot.return7d.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Deposit Button */}
                <div className="w-full md:w-auto mt-4 md:mt-0 flex justify-end">
                  <button
                    onClick={handleDeposit}
                    className="w-full md:w-auto rounded-full border-[1.5px] border-[#0A0A0A] bg-transparent px-6 py-2.5 font-[var(--font-dm-mono)] text-xs font-bold uppercase tracking-wider text-[#0A0A0A] transition-all hover:bg-[#0A0A0A] hover:text-white active:scale-[0.97]"
                  >
                    Deposit
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
