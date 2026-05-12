'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { BotCharacter } from '@/components/BotCharacter';
import { BotCard } from '@/components/BotCard';
import { getTopBots } from '@/data/bots';

function AnimatedCounter({ end, prefix = '', suffix = '', decimals = 0 }: { end: number; prefix?: string; suffix?: string; decimals?: number }) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });

  useEffect(() => {
    motionValue.set(end);
  }, [end, motionValue]);

  const [display, setDisplay] = useState('0');

  useEffect(() => {
    return springValue.on('change', (latest) => {
      setDisplay(latest.toFixed(decimals));
    });
  }, [springValue, decimals]);

  return (
    <span>
      {prefix}{decimals > 0 ? display : Math.floor(Number(display)).toLocaleString()}{suffix}
    </span>
  );
}



// Floating blob for the hero bg
function FloatingBlob({ color, x, y, delay }: { color: string; x: number; y: number; delay: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none opacity-[0.15]"
      style={{ left: `${x}%`, top: `${y}%` }}
      animate={{ y: [0, -40, 0], x: [0, 20, 0], scale: [1, 1.1, 1] }}
      transition={{ duration: 8 + delay * 2, ease: 'easeInOut', repeat: Infinity, delay }}
    >
      <BotCharacter
        color={color}
        mood={['happy', 'cool', 'neutral', 'surprised'][Math.floor(delay) % 4] as 'happy' | 'cool' | 'neutral' | 'surprised'}
        size="sm"
        animated={false}
      />
    </motion.div>
  );
}

export default function HomePage() {
  const topBots = getTopBots(3);

  return (
    <div className="relative overflow-hidden pb-32 bg-[#0A0A0A]">
      {/* Ambient Glows */}
      <div className="absolute top-0 left-0 w-full h-[1000px] bg-gradient-to-b from-[#C8FF00]/10 to-transparent pointer-events-none" />
      <div className="absolute top-1/4 -right-1/4 w-[800px] h-[800px] bg-[#C8FF00]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute -bottom-1/4 -left-1/4 w-[800px] h-[800px] bg-[#C8FF00]/5 rounded-full blur-[150px] pointer-events-none" />

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
        {/* Floating entities */}
        <FloatingBlob color="#FF6B35" x={10} y={15} delay={0} />
        <FloatingBlob color="#7B2FFF" x={85} y={20} delay={1.5} />
        <FloatingBlob color="#00C2FF" x={15} y={75} delay={3} />
        <FloatingBlob color="#FFD600" x={80} y={65} delay={2} />
        <FloatingBlob color="#FF1493" x={50} y={10} delay={0.8} />

        <div className="relative z-10 max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 mb-10 backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-[#C8FF00] animate-pulse" />
              <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.4em]">Protocol v2.0 Institutional Active</span>
            </div>
            <h1 className="font-[var(--font-syne)] text-[56px] sm:text-[96px] md:text-[120px] font-[900] uppercase leading-[0.85] tracking-tighter text-white mb-10 drop-shadow-2xl">
              The Intelligence Layer for{' '}
              <span className="text-[#C8FF00] drop-shadow-[0_0_30px_rgba(200,255,0,0.3)]">Prediction Markets</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="text-xl sm:text-2xl text-white/40 max-w-3xl mx-auto mb-16 font-medium leading-relaxed"
          >
            Deploy capital into verified quantitative agents. 
            Every trade is resolved by objective reality. 
            No heuristics. <span className="text-white">Pure mathematical alpha.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-6 justify-center"
          >
            <Link
              href="/discover"
              className="group relative inline-flex items-center justify-center rounded-full bg-white px-12 py-6 font-[var(--font-dm-mono)] text-sm font-[900] uppercase tracking-widest text-[#0A0A0A] transition-all hover:scale-105 hover:bg-[#C8FF00] active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
            >
              Access Protocol
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C8FF00] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-[#C8FF00]"></span>
              </span>
            </Link>
            <Link
              href="/leaderboard"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-xl px-12 py-6 font-[var(--font-dm-mono)] text-sm font-[900] uppercase tracking-widest text-white transition-all hover:bg-white/10 hover:border-white/20 active:scale-95"
            >
              Verify Rankings
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══ STATS BENTO ═══ */}
      <section className="px-6 mb-40 relative z-10">
        <div className="mx-auto max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Network TVL', value: <AnimatedCounter end={284000} prefix="$" />, detail: 'Protocol Active Liquidity', color: 'text-white' },
            { label: 'Validated Agents', value: <AnimatedCounter end={12} />, detail: 'On-chain Verified Track Records', color: 'text-white' },
            { label: 'Volume Settled', value: <AnimatedCounter end={12.4} decimals={1} prefix="$" suffix="M" />, detail: 'Total Market Settlement', color: 'text-white' },
            { label: 'Avg Brier Score', value: <AnimatedCounter end={0.164} decimals={3} />, detail: 'Aggregate Precision Metric', color: 'text-[#C8FF00]' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-[40px] bg-white/5 backdrop-blur-3xl p-10 border border-white/5 hover:bg-white/10 transition-all group"
            >
              <p className={`font-[var(--font-dm-mono)] text-5xl leading-none font-bold mb-4 ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-1 group-hover:text-white/60 transition-colors">
                {stat.label}
              </p>
              <p className="text-[10px] font-medium text-white/20 uppercase tracking-wider">{stat.detail}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURED BOTS ═══ */}
      <section className="px-6 relative z-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row items-end justify-between gap-6 mb-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-[#C8FF00] font-bold uppercase tracking-[0.3em] text-[10px] mb-4">Market Leaders</p>
              <h2 className="font-[var(--font-syne)] text-[48px] sm:text-[64px] font-[900] uppercase tracking-tighter text-white leading-none">
                Alpha <span className="text-white/20 italic">Elite</span>
              </h2>
            </motion.div>
            <Link
              href="/discover"
              className="text-xs text-white/40 font-bold uppercase tracking-[0.3em] hover:text-[#C8FF00] transition-colors flex items-center gap-3 group"
            >
              Scan Full Network 
              <span className="w-12 h-[1px] bg-white/10 group-hover:bg-[#C8FF00] transition-all" />
              <span className="group-hover:translate-x-2 transition-transform">→</span>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Featured Bot Cards - Use top 3 for home */}
            {topBots.map((bot, i) => (
              <BotCard key={bot.id} bot={bot} index={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
