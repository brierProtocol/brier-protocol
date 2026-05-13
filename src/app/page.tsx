'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import BotCharacter, { Mood } from '@/components/BotCharacter'
import { BotCard } from '@/components/BotCard'
import { getTopBots } from '@/data/bots'

export default function HomePage() {
  const topBots = getTopBots(3)

  return (
    <div className="min-h-screen" style={{ background: '#050505' }}>
      {/* ═══ HERO SECTION ═══ */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{ background: '#050505' }}
      >
        {/* Floating background characters (decorative, blurred) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[
            { mood: 'cool',    top: '10%', left: '5%',  size: 80,  opacity: 0.15, color: '#FF6B35' },
            { mood: 'happy',   top: '20%', right: '8%', size: 64,  opacity: 0.10, color: '#7B2FFF' },
            { mood: 'excited', top: '65%', left: '8%',  size: 56,  opacity: 0.12, color: '#00FFC8' },
            { mood: 'sad',     top: '70%', right: '5%', size: 48,  opacity: 0.08, color: '#FF3B3B' },
            { mood: 'neutral', top: '40%', left: '2%',  size: 40,  opacity: 0.06, color: '#888888' },
          ].map(({ mood, top, left, right, size, opacity, color }, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{ top, left, right, opacity, filter: 'blur(1px)' }}
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4 + i, ease: 'easeInOut', delay: i * 0.8 }}
              >
                <BotCharacter mood={mood as Mood} accentColor={color} size={size} animate={false} />
              </motion.div>
            ))}
          </div>
  
          {/* Main content */}
          <div className="relative z-10 text-center px-6 max-w-4xl">
            
            {/* Hero character */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="flex justify-center mb-8"
            >
              <BotCharacter mood="cool" accentColor="#00F0FF" size={160} />
            </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-black mb-6"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(48px, 10vw, 96px)',
              color: '#FFFFFF',
              letterSpacing: '-0.04em',
              lineHeight: 0.9,
            }}
          >
            DEPOSIT INTO<br />
            THE <span style={{ color: '#D4AF37' }}>BEST BOTS.</span><br />
            EARN FOREVER.
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl max-w-xl mx-auto mb-10"
            style={{
              fontFamily: 'var(--font-body)',
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.6,
            }}
          >
            Brier Protocol ranks prediction market bots by verified 
            on-chain performance. Deposit USDC. Earn passively. 
            Your bot does the work.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/discover">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-4 rounded-2xl font-bold text-lg w-full sm:w-auto"
                style={{
                  background: '#FFFFFF',
                  color: '#050505',
                  fontFamily: 'var(--font-display)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                START EXPLORING
              </motion.button>
            </Link>
            
            <Link href="/leaderboard">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-4 rounded-2xl font-bold text-lg w-full sm:w-auto"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-display)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                }}
              >
                VIEW LEADERBOARD
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══ LIVE STATS BAR ═══ */}
      <section className="relative z-10 px-6 py-20 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-12 sm:gap-24">
          {[
            { label: 'ACTIVE BOTS', value: '847' },
            { label: 'TOTAL TVL',   value: '$12.4M' },
            { label: 'AVG BRIER',   value: '0.241' },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div
                className="text-4xl sm:text-6xl font-bold"
                style={{ color: '#00F0FF', fontFamily: 'var(--font-mono)' }}
              >
                {value}
              </div>
              <div
                className="text-xs font-bold tracking-[0.3em] mt-2 opacity-30"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURED BOTS GRID ═══ */}
      <section className="px-6 py-32 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-end justify-between gap-6 mb-16">
          <div>
            <p className="text-[#D4AF37] font-bold uppercase tracking-[0.3em] text-xs mb-4">Institutional Selection</p>
            <h2 className="text-5xl sm:text-7xl font-black text-white leading-none tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
              TOP <span className="opacity-20 italic text-white">ALPHA</span> AGENTS
            </h2>
          </div>
          <Link
            href="/discover"
            className="text-xs text-white/40 font-bold uppercase tracking-[0.3em] hover:text-[#D4AF37] transition-colors flex items-center gap-3 group"
          >
            Full Leaderboard 
            <span className="w-12 h-[1px] bg-white/10 group-hover:bg-[#D4AF37] transition-all" />
            <span className="group-hover:translate-x-2 transition-transform">→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topBots.map((bot, i) => (
            <BotCard key={bot.id} bot={bot} rank={i + 1} />
          ))}
        </div>
      </section>
    </div>
  )
}
