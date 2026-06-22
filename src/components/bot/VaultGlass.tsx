'use client'

import { motion } from 'framer-motion'

/**
 * Squid-Game style glass vault: a transparent urn that fills with capital up to
 * its capacity. Gamified — coins drift inside, the surface shimmers. Every bot
 * shows one; a shadow bot's urn is simply empty (it fills as it earns trust).
 */
export default function VaultGlass({ tvl, cap, live }: { tvl: number; cap: number; live: boolean }) {
  const level = Math.max(0, Math.min(1, cap > 0 ? tvl / cap : 0))
  const fmt = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${Math.round(n).toLocaleString()}`)

  return (
    <div className="relative h-[210px] rounded-2xl overflow-hidden border border-[#242424] bg-gradient-to-b from-[#0c0c0f] to-[#070708]">
      {/* glass ribs */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 25px, #ffffff0a 25px, #ffffff0a 26px)' }} />
      {/* faint star dust */}
      <div className="absolute inset-0 pointer-events-none opacity-50" style={{ backgroundImage: 'radial-gradient(1px 1px at 22% 18%,#ffffff22 50%,transparent),radial-gradient(1px 1px at 78% 12%,#ffffff1a 50%,transparent)' }} />

      {/* fill */}
      <motion.div
        className="absolute left-0 right-0 bottom-0 overflow-hidden"
        initial={{ height: 0 }}
        animate={{ height: `${level * 100}%` }}
        transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
        style={{ background: 'linear-gradient(180deg, #ff2a4d 0%, #b01530 55%, #6a0f20 100%)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-white/40" />
        {live && level > 0.02 && [...Array(7)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ width: 6, height: 6, left: `${8 + i * 13}%`, bottom: `${(i * 17) % 78}%`, background: i % 2 ? '#ffd36b' : '#ffe9b3', boxShadow: '0 0 6px #ffd36b88' }}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2.4 + i * 0.25, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </motion.div>

      {/* glass reflection */}
      <div className="absolute inset-y-0 left-3 w-3 bg-white/[0.06] rounded-full blur-[1px]" />

      {/* readout */}
      <div className="absolute inset-0 grid place-items-center text-center px-4">
        <div>
          <div className="font-sans font-extrabold tracking-[-0.03em] text-[clamp(32px,6vw,48px)] leading-none text-white tabular-nums" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.85)' }}>
            {live ? fmt(tvl) : '$0'}
          </div>
          <div className="font-mono text-[10px] tracking-[0.18em] text-white/70 mt-2" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>
            {live ? `${fmt(tvl)} of ${fmt(cap)} secured` : 'fills as it earns trust'}
          </div>
        </div>
      </div>
    </div>
  )
}
