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
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative rounded-[40px] bg-[#111111] border border-white/5 overflow-hidden transition-all duration-300 hover:border-white/20 shadow-2xl"
    >
      <Link href={`/vault/${bot.id}`} className="block relative p-2">
        {/* Tier / Status Badge */}
        <div className="absolute top-6 left-6 flex flex-col gap-2 z-20">
          {(bot as any).tier !== 'NONE' && (
            <div className="flex items-center gap-2 bg-[#C8FF00] px-3 py-1 rounded-lg shadow-[0_0_20px_rgba(200,255,0,0.4)]">
              <span className="text-[#0A0A0A] text-[10px] font-[900] uppercase tracking-widest italic">
                {(bot as any).tier}
              </span>
            </div>
          )}
          <div className="bg-white/5 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
            <span className="text-white/60 text-[9px] font-bold uppercase tracking-[0.2em]">
              {bot.status}
            </span>
          </div>
        </div>

        {/* Hero Character section — Dynamic Glow */}
        <div className="flex flex-col items-center pt-16 pb-8 px-6 relative overflow-hidden rounded-[32px] bg-[#0A0A0A]">
          {/* Ambient Glow from bot color */}
          <div 
            className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-64 h-64 blur-[80px] opacity-20 pointer-events-none"
            style={{ backgroundColor: bot.color }}
          />
          
          <div className="relative z-10 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <BotCharacter color={bot.color} mood={bot.mood} size="lg" animated />
          </div>
          
          <h3 className="mt-8 font-[var(--font-syne)] text-[28px] font-[900] uppercase tracking-tighter text-white relative z-10 leading-none">
            {bot.name}
          </h3>
          <p className="mt-3 text-[10px] text-white/30 font-bold uppercase tracking-[0.3em] relative z-10 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C8FF00] animate-pulse shadow-[0_0_8px_rgba(200,255,0,0.8)]" />
            Active Entity
          </p>
        </div>

        {/* Metrics Grid — Institutional Precision */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-left">
              <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-2">Brier</p>
              <p className="font-[var(--font-dm-mono)] text-xl font-bold text-white leading-none">
                {bot.brierScore.toFixed(3)}
              </p>
            </div>
            <div className="text-left">
              <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-2">WR</p>
              <p className="font-[var(--font-dm-mono)] text-xl font-bold text-white leading-none">
                {(bot.winRate * 100).toFixed(0)}%
              </p>
            </div>
            <div className="text-left">
              <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-2">AUM</p>
              <p className="font-[var(--font-dm-mono)] text-xl font-bold text-[#C8FF00] leading-none">
                ${(bot.tvl / 1000).toFixed(0)}K
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Reveal Action */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-[#C8FF00] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 shadow-[0_0_15px_rgba(200,255,0,0.6)]" />
      </Link>
    </motion.div>
  );
}
