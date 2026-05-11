'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BotCharacter } from './BotCharacter';
import type { Bot } from '@/data/bots';

interface BotCardProps {
  bot: Bot;
  index?: number;
}

export function BotCard({ bot, index = 0 }: BotCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      whileHover={{ y: -4 }}
      className="group rounded-[20px] overflow-hidden transition-transform duration-200"
      style={{ background: bot.color }}
    >
      <Link href={`/vault/${bot.id}`} className="block">
        {/* Character section — full bleed bot color */}
        <div className="flex flex-col items-center pt-8 pb-4 px-5">
          <BotCharacter color={bot.color} mood={bot.mood} size="md" animated />
          <h3 className="mt-4 font-[var(--font-syne)] text-2xl font-[900] uppercase tracking-tight text-white">
            {bot.name}
          </h3>
          <p className="text-xs text-white/70 mt-0.5 font-medium">by {bot.builder}</p>
          {/* Mood pill */}
          <motion.span
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
            className="mt-3 inline-block rounded-full bg-white px-3.5 py-1 text-[11px] font-bold capitalize"
            style={{ color: bot.color }}
          >
            {bot.mood}
          </motion.span>
        </div>

        {/* Stats strip — white bottom card */}
        <div className="mx-2 mb-2 rounded-[16px] bg-white p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-[var(--font-dm-mono)] text-lg font-bold text-[#0A0A0A]">
                {bot.brierScore.toFixed(3)}
              </p>
              <p className="text-[10px] font-medium text-[#0A0A0A]/40 uppercase tracking-wider">Brier</p>
            </div>
            <div>
              <p className="font-[var(--font-dm-mono)] text-lg font-bold text-[#0A0A0A]">
                {(bot.winRate * 100).toFixed(1)}%
              </p>
              <p className="text-[10px] font-medium text-[#0A0A0A]/40 uppercase tracking-wider">Win Rate</p>
            </div>
            <div>
              <p className="font-[var(--font-dm-mono)] text-lg font-bold text-[#0A0A0A]">
                ${(bot.tvl / 1000).toFixed(0)}K
              </p>
              <p className="text-[10px] font-medium text-[#0A0A0A]/40 uppercase tracking-wider">TVL</p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
