'use client';

import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { BotCharacter } from '@/components/BotCharacter';
import { BotCard } from '@/components/BotCard';
import { getTopBots } from '@/data/bots';

function AnimatedCounter({ end, prefix = '', suffix = '', decimals = 0 }: { end: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = eased * end;
      setCount(start);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [inView, end]);

  return (
    <span ref={ref}>
      {prefix}{decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString()}{suffix}
    </span>
  );
}

// Floating blob for the hero bg
function FloatingBlob({ color, x, y, delay }: { color: string; x: number; y: number; delay: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none opacity-20"
      style={{ left: `${x}%`, top: `${y}%` }}
      animate={{ y: [0, -30, 0], x: [0, 15, 0], scale: [1, 1.05, 1] }}
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
    <div className="relative overflow-hidden">
      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-20">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-[0.04]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(200,255,0,0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(200,255,0,0.3) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Floating blobs */}
        <FloatingBlob color="#FF6B35" x={10} y={15} delay={0} />
        <FloatingBlob color="#7B2FFF" x={80} y={20} delay={1.5} />
        <FloatingBlob color="#00C2FF" x={15} y={70} delay={3} />
        <FloatingBlob color="#FFD600" x={75} y={65} delay={2} />
        <FloatingBlob color="#FF1493" x={50} y={10} delay={0.8} />

        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#C8FF00] opacity-[0.03] blur-[120px]" />

        <div className="relative z-10 max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-[var(--font-syne)] text-4xl sm:text-5xl md:text-7xl font-extrabold uppercase leading-[1.05] tracking-tight text-white mb-6">
              The Intelligence Layer for{' '}
              <span className="text-[#C8FF00]">Prediction Markets</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="text-base sm:text-lg text-[#888] max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Deploy capital into verified quant bots. Every trade resolved by objective reality.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/discover"
              className="inline-flex items-center justify-center rounded-xl bg-[#C8FF00] px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-black transition-all hover:shadow-[0_0_30px_#C8FF0066] hover:scale-105"
            >
              Explore Vaults
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-[#333] bg-transparent px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-white transition-all hover:border-[#C8FF00] hover:text-[#C8FF00]"
            >
              Submit Your Bot
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="border-y border-[#222] bg-[#111]">
        <div className="mx-auto max-w-6xl grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#222]">
          {[
            { label: 'Total TVL', value: <AnimatedCounter end={2847293} prefix="$" />, },
            { label: 'Active Bots', value: <AnimatedCounter end={24} />, },
            { label: 'All-Time Volume', value: <AnimatedCounter end={12.4} decimals={1} prefix="$" suffix="M" />, },
            { label: 'Avg Brier Score', value: <AnimatedCounter end={0.187} decimals={3} />, },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="px-4 sm:px-8 py-6 sm:py-8 text-center"
            >
              <p className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-[#666] mb-1">
                {stat.label}
              </p>
              <p className="text-lg sm:text-2xl font-bold font-[var(--font-syne)] text-white">
                {stat.value}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-20 sm:py-28 px-4">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-[var(--font-syne)] text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-center text-white mb-16"
          >
            How It Works
          </motion.h2>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Builders Submit Bots',
                desc: 'Verified by on-chain trade history. Every bot proves its edge with real data before going live.',
                icon: '🤖',
              },
              {
                step: '02',
                title: 'Depositors Fund Vaults',
                desc: 'Capital allocated automatically into top-ranked bots. No manual trading, just alpha capture.',
                icon: '💰',
              },
              {
                step: '03',
                title: 'Profits Split',
                desc: '75% to depositors. 20% to builders. 5% protocol fee. Aligned incentives, transparent carry.',
                icon: '📊',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative rounded-2xl border border-[#222] bg-[#161616] p-8 hover:border-[#333] transition-colors"
              >
                <div className="text-3xl mb-4">{item.icon}</div>
                <span className="inline-block mb-3 text-xs font-bold text-[#C8FF00] uppercase tracking-widest">
                  Step {item.step}
                </span>
                <h3 className="font-[var(--font-syne)] text-xl font-bold uppercase text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-sm text-[#888] leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURED BOTS ═══ */}
      <section className="py-20 px-4 border-t border-[#222]">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-[var(--font-syne)] text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white"
            >
              Top Performers
            </motion.h2>
            <Link
              href="/discover"
              className="text-sm text-[#C8FF00] font-medium uppercase tracking-wide hover:underline"
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

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-[#222] bg-[#0A0A0A] py-8 px-4">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#555]">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#C8FF00]" />
            <span className="uppercase tracking-wider font-medium text-[#888]">Brier Protocol</span>
            <span>© 2025</span>
          </div>
          <p>Built on Kalshi + Polymarket</p>
        </div>
      </footer>
    </div>
  );
}
