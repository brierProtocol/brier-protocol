'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BotCharacter } from '@/components/BotCharacter';
import { getBotsByRank } from '@/data/bots';
import toast from 'react-hot-toast';

type TimeRange = 'all' | 'month' | 'week';

const crownColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
const crownEmojis = ['👑', '🥈', '🥉'];
const borderColors = ['border-l-[#FFD700]', 'border-l-[#C0C0C0]', 'border-l-[#CD7F32]'];

export default function LeaderboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const rankedBots = getBotsByRank();
  const top3 = rankedBots.slice(0, 3);
  const rest = rankedBots.slice(3);

  const handleDeposit = () => {
    toast('Coming Soon — Deposits are not yet available.', { icon: '💰' });
  };

  return (
    <div className="min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="font-[var(--font-syne)] text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-white mb-2">
            Leaderboard
          </h1>
          <p className="text-sm text-[#666] max-w-lg">
            Ranked by Brier Score — the only tamper-proof performance metric in finance.
          </p>
        </motion.div>

        {/* Time tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-10 flex gap-2"
        >
          {([
            ['all', 'All Time'],
            ['month', 'This Month'],
            ['week', 'This Week'],
          ] as [TimeRange, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTimeRange(key)}
              className={`rounded-lg border px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                timeRange === key
                  ? 'border-[#C8FF00] bg-[#C8FF00]/10 text-[#C8FF00]'
                  : 'border-[#222] bg-[#161616] text-[#888] hover:border-[#444]'
              }`}
            >
              {label}
            </button>
          ))}
        </motion.div>

        {/* ═══ PODIUM ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-14 grid grid-cols-3 gap-4 max-w-3xl mx-auto items-end"
        >
          {/* 2nd place */}
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl">{crownEmojis[1]}</span>
              <BotCharacter color={top3[1].color} mood={top3[1].mood} size="md" animated />
            </div>
            <div className="w-full rounded-t-xl bg-gradient-to-b from-[#C0C0C0]/20 to-[#161616] border border-[#222] border-b-0 p-4 pt-6 text-center" style={{ minHeight: '120px' }}>
              <p className="font-[var(--font-syne)] text-sm font-extrabold uppercase text-white">{top3[1].name}</p>
              <p className="text-[10px] text-[#666] mb-2">{top3[1].builder}</p>
              <p className="text-lg font-bold text-[#C8FF00]">{top3[1].brierScore.toFixed(3)}</p>
              <p className="text-[10px] text-[#666] uppercase tracking-wider">Brier Score</p>
            </div>
          </div>

          {/* 1st place */}
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-3xl">{crownEmojis[0]}</span>
              <BotCharacter color={top3[0].color} mood={top3[0].mood} size="lg" animated />
            </div>
            <div className="w-full rounded-t-xl bg-gradient-to-b from-[#FFD700]/20 to-[#161616] border border-[#FFD700]/30 border-b-0 p-4 pt-6 text-center" style={{ minHeight: '160px' }}>
              <p className="font-[var(--font-syne)] text-base font-extrabold uppercase text-white">{top3[0].name}</p>
              <p className="text-[10px] text-[#666] mb-2">{top3[0].builder}</p>
              <p className="text-2xl font-bold text-[#C8FF00]">{top3[0].brierScore.toFixed(3)}</p>
              <p className="text-[10px] text-[#666] uppercase tracking-wider mb-3">Brier Score</p>
              <p className="text-xs text-[#888]">WR: <span className="text-[#C8FF00]">{(top3[0].winRate * 100).toFixed(1)}%</span></p>
            </div>
          </div>

          {/* 3rd place */}
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl">{crownEmojis[2]}</span>
              <BotCharacter color={top3[2].color} mood={top3[2].mood} size="md" animated />
            </div>
            <div className="w-full rounded-t-xl bg-gradient-to-b from-[#CD7F32]/20 to-[#161616] border border-[#222] border-b-0 p-4 pt-6 text-center" style={{ minHeight: '100px' }}>
              <p className="font-[var(--font-syne)] text-sm font-extrabold uppercase text-white">{top3[2].name}</p>
              <p className="text-[10px] text-[#666] mb-2">{top3[2].builder}</p>
              <p className="text-lg font-bold text-[#C8FF00]">{top3[2].brierScore.toFixed(3)}</p>
              <p className="text-[10px] text-[#666] uppercase tracking-wider">Brier Score</p>
            </div>
          </div>
        </motion.div>

        {/* ═══ FULL TABLE ═══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="overflow-x-auto rounded-xl border border-[#222] bg-[#111]"
        >
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-[#161616] border-b border-[#222]">
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555]">Rank</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555]">Bot</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555]">Builder</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555]">Brier</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555]">Win Rate</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555] hidden sm:table-cell">W/L</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555] hidden sm:table-cell">Trades</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555] hidden md:table-cell">TVL</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555] hidden md:table-cell">7D Return</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555] hidden lg:table-cell">Age</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555]"></th>
              </tr>
            </thead>
            <tbody>
              {rankedBots.map((bot, i) => {
                const rank = i + 1;
                const wrColor = bot.winRate > 0.55 ? 'text-[#C8FF00]' : bot.winRate < 0.45 ? 'text-[#FF3D00]' : 'text-white';
                const brierColor = bot.brierScore < 0.2 ? 'text-[#C8FF00]' : bot.brierScore > 0.3 ? 'text-[#FF3D00]' : 'text-white';
                const isTop3 = rank <= 3;

                return (
                  <motion.tr
                    key={bot.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.04 }}
                    className={`border-b border-[#1a1a1a] transition-colors hover:bg-[#1a1a1a] group ${
                      isTop3 ? `border-l-2 ${borderColors[rank - 1]}` : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-bold text-[#555]">
                      {isTop3 ? crownEmojis[rank - 1] : `#${rank}`}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/vault/${bot.id}`} className="flex items-center gap-2 hover:text-[#C8FF00] transition-colors">
                        <BotCharacter color={bot.color} mood={bot.mood} size="sm" animated={false} className="!w-8 !h-8 scale-[0.4] origin-center" />
                        <span className="font-[var(--font-syne)] font-bold uppercase text-white group-hover:text-[#C8FF00] transition-colors">
                          {bot.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#888]">{bot.builder}</td>
                    <td className={`px-4 py-3 font-bold ${brierColor}`}>{bot.brierScore.toFixed(3)}</td>
                    <td className={`px-4 py-3 font-bold ${wrColor}`}>{(bot.winRate * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-[#888] hidden sm:table-cell">{bot.wins}/{bot.losses}</td>
                    <td className="px-4 py-3 text-[#888] hidden sm:table-cell">{bot.trades}</td>
                    <td className="px-4 py-3 text-white font-medium hidden md:table-cell">${(bot.tvl / 1000).toFixed(0)}K</td>
                    <td className={`px-4 py-3 font-medium hidden md:table-cell ${bot.return7d >= 0 ? 'text-[#C8FF00]' : 'text-[#FF3D00]'}`}>
                      {bot.return7d >= 0 ? '+' : ''}{bot.return7d.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-[#888] hidden lg:table-cell">{bot.publishedDays}d</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={handleDeposit}
                        className="rounded-md border border-[#333] bg-transparent px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C8FF00] transition-all hover:bg-[#C8FF00] hover:text-black hover:border-[#C8FF00]"
                      >
                        Deposit
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      </div>
    </div>
  );
}
