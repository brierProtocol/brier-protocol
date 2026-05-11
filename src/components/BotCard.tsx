'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BotCharacter } from './BotCharacter';
import { MiniChart } from './MiniChart';
import type { Bot } from '@/data/bots';

interface BotCardProps {
  bot: Bot;
  index?: number;
}

export function BotCard({ bot, index = 0 }: BotCardProps) {
  const wrColor = bot.winRate >= 0.55 ? 'text-[#C8FF00]' : bot.winRate < 0.45 ? 'text-[#FF3D00]' : 'text-white';
  const brierColor = bot.brierScore < 0.2 ? 'text-[#C8FF00]' : bot.brierScore > 0.3 ? 'text-[#FF3D00]' : 'text-white';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="group relative overflow-hidden rounded-2xl border border-[#222] bg-[#161616] transition-all hover:border-[#444] hover:shadow-[0_0_30px_rgba(200,255,0,0.05)]"
    >
      {/* Character section with unique bg */}
      <div
        className="flex items-center justify-center py-6"
        style={{ background: `${bot.color}15` }}
      >
        <BotCharacter color={bot.color} mood={bot.mood} size="md" animated />
      </div>

      {/* Content */}
      <div className="px-5 pb-5">
        {/* Name + Builder */}
        <div className="mt-3 mb-1">
          <h3 className="font-[var(--font-syne)] text-lg font-extrabold uppercase tracking-wide text-white">
            {bot.name}
          </h3>
          <p className="text-xs text-[#666]">
            by <span className="text-[#999]">{bot.builder}</span>
          </p>
        </div>

        {/* Status + age */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              bot.status === 'live' ? 'bg-[#C8FF00]' : bot.status === 'paused' ? 'bg-[#FF8F00]' : 'bg-[#666]'
            }`}
          />
          <span className="text-[11px] text-[#888] uppercase tracking-wide">
            {bot.status}
          </span>
          <span className="text-[11px] text-[#444]">·</span>
          <span className="text-[11px] text-[#888]">{bot.publishedDays} days old</span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-3 text-xs">
          <div className="flex justify-between">
            <span className="text-[#666]">WR</span>
            <span className={`font-medium ${wrColor}`}>{(bot.winRate * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666]">Brier</span>
            <span className={`font-medium ${brierColor}`}>{bot.brierScore.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666]">W/L</span>
            <span className="text-white font-medium">{bot.wins} / {bot.losses}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666]">Trades</span>
            <span className="text-white font-medium">{bot.trades}</span>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-[#222] my-3" />

        {/* Vault stats */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-4 text-xs">
          <div className="flex justify-between">
            <span className="text-[#666]">Vault TVL</span>
            <span className="text-white font-medium">${(bot.tvl / 1000).toFixed(0)}K</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666]">Carry</span>
            <span className="text-white font-medium">{bot.builderCarry}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666]">Depositors</span>
            <span className="text-white font-medium">{bot.depositors}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666]">7D Return</span>
            <span className={`font-medium ${bot.return7d >= 0 ? 'text-[#C8FF00]' : 'text-[#FF3D00]'}`}>
              {bot.return7d >= 0 ? '+' : ''}{bot.return7d.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Mini chart */}
        <div className="mb-4 rounded-lg bg-[#111] p-2">
          <MiniChart data={bot.pnlHistory} />
        </div>

        {/* CTA */}
        <Link
          href={`/vault/${bot.id}`}
          className="block w-full rounded-lg border border-[#333] bg-[#1a1a1a] py-2.5 text-center text-xs font-bold uppercase tracking-wider text-[#C8FF00] transition-all hover:bg-[#C8FF00] hover:text-black hover:border-[#C8FF00]"
        >
          View Vault
        </Link>
      </div>
    </motion.div>
  );
}
