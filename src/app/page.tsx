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
    <div className="relative overflow-hidden pb-20">
      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[85vh] flex items-center justify-center px-4 py-20">
        {/* Floating blobs */}
        <FloatingBlob color="#FF6B35" x={10} y={15} delay={0} />
        <FloatingBlob color="#7B2FFF" x={80} y={20} delay={1.5} />
        <FloatingBlob color="#00C2FF" x={15} y={70} delay={3} />
        <FloatingBlob color="#FFD600" x={75} y={65} delay={2} />
        <FloatingBlob color="#FF1493" x={50} y={10} delay={0.8} />

        <div className="relative z-10 max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-[var(--font-syne)] text-[44px] sm:text-[64px] md:text-[80px] font-[900] uppercase leading-[0.95] tracking-tight text-[#0A0A0A] mb-8">
              The Intelligence Layer for{' '}
              <span className="text-[#0A0A0A] inline-block bg-[#C8FF00] px-4 py-1 -rotate-2 rounded-xl border-4 border-[#0A0A0A]">Prediction Markets</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="text-lg sm:text-xl text-[#0A0A0A]/70 max-w-2xl mx-auto mb-12 font-medium"
          >
            Deploy capital into verified quant bots. Every trade resolved by objective reality. No middle men, pure alpha.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/discover"
              className="inline-flex items-center justify-center rounded-[999px] bg-[#0A0A0A] px-8 py-4 font-[var(--font-dm-mono)] text-sm font-bold uppercase tracking-wider text-white transition-all active:scale-[0.97]"
            >
              Explore Vaults
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-[999px] border-2 border-[#0A0A0A] bg-white px-8 py-4 font-[var(--font-dm-mono)] text-sm font-bold uppercase tracking-wider text-[#0A0A0A] transition-all active:scale-[0.97]"
            >
              Submit Your Bot
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══ STATS BENTO ═══ */}
      <section className="px-4 mb-24">
        <div className="mx-auto max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total TVL', value: <AnimatedCounter end={2847293} prefix="$" />, highlight: false },
            { label: 'Active Bots', value: <AnimatedCounter end={24} />, highlight: false },
            { label: 'All-Time Volume', value: <AnimatedCounter end={12.4} decimals={1} prefix="$" suffix="M" />, highlight: false },
            { label: 'Avg Brier Score', value: <AnimatedCounter end={0.187} decimals={3} />, highlight: true },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-[20px] p-8 ${stat.highlight ? 'bg-[#C8FF00]' : 'bg-white'}`}
            >
              <p className={`font-[var(--font-dm-mono)] text-[40px] leading-none font-bold mb-2 ${stat.highlight ? 'text-[#0A0A0A]' : 'text-[#0A0A0A]'}`}>
                {stat.value}
              </p>
              <p className="text-sm font-medium uppercase tracking-wider text-[#0A0A0A]/50">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURED BOTS ═══ */}
      <section className="px-4">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-[var(--font-syne)] text-[40px] font-[900] uppercase tracking-tight text-[#0A0A0A]"
            >
              Top Performers
            </motion.h2>
            <Link
              href="/discover"
              className="text-sm text-[#0A0A0A] font-bold uppercase tracking-wider hover:underline"
            >
              View All Bots →
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {topBots.map((bot, i) => (
              <BotCard key={bot.id} bot={bot} index={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
