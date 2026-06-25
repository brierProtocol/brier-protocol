'use client'

import { motion } from 'framer-motion'

/**
 * The vault as a containment cell of red dark matter. Capital pools at the
 * bottom as a dense, self-luminous crimson plasma: layered radial cores drift
 * and breathe, a bright event-horizon line caps the surface, and a vignette
 * sinks the edges into black for depth. A shadow bot's cell is simply empty
 * (it fills as it earns trust).
 */
export default function VaultGlass({ tvl, cap, live }: { tvl: number; cap: number; live: boolean }) {
  const level = Math.max(0, Math.min(1, cap > 0 ? tvl / cap : 0))
  const fmt = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${Math.round(n).toLocaleString()}`)

  return (
    <div className="relative h-[210px] rounded-2xl overflow-hidden border border-[#241016] bg-[radial-gradient(120%_90%_at_50%_-10%,#120608_0%,#070406_55%,#040203_100%)]">
      {/* containment grid */}
      <div className="absolute inset-0 pointer-events-none opacity-60" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 25px, #ffffff08 25px, #ffffff08 26px)' }} />
      {/* far starfield */}
      <div className="absolute inset-0 pointer-events-none opacity-50" style={{ backgroundImage: 'radial-gradient(1px 1px at 22% 18%,#ffffff22 50%,transparent),radial-gradient(1px 1px at 78% 12%,#ffffff14 50%,transparent),radial-gradient(1px 1px at 60% 30%,#ff5a6e22 50%,transparent)' }} />

      {/* ── dark-matter fill ── */}
      <motion.div
        className="absolute left-0 right-0 bottom-0 overflow-hidden"
        initial={{ height: 0 }}
        animate={{ height: `${level * 100}%` }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ background: 'linear-gradient(180deg, #1a0509 0%, #11040a 60%, #060103 100%)' }}
      >
        {/* drifting plasma cores */}
        <motion.div
          className="absolute -inset-[20%] pointer-events-none"
          style={{ background: 'radial-gradient(38% 46% at 32% 78%, rgba(255,42,77,0.85) 0%, rgba(176,21,48,0.35) 38%, transparent 70%)', mixBlendMode: 'screen' }}
          animate={{ x: ['-6%', '8%', '-6%'], y: ['4%', '-5%', '4%'], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -inset-[20%] pointer-events-none"
          style={{ background: 'radial-gradient(34% 40% at 70% 88%, rgba(255,90,110,0.7) 0%, rgba(140,16,40,0.3) 42%, transparent 72%)', mixBlendMode: 'screen' }}
          animate={{ x: ['6%', '-7%', '6%'], y: ['3%', '-4%', '3%'], opacity: [0.65, 0.95, 0.65] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
        />
        <motion.div
          className="absolute -inset-[30%] pointer-events-none"
          style={{ background: 'radial-gradient(50% 55% at 50% 120%, rgba(255,150,90,0.45) 0%, transparent 60%)', mixBlendMode: 'screen' }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* turbulent grain */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.12] mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(1px 1px at 18% 30%,#fff 40%,transparent),radial-gradient(1px 1px at 64% 60%,#fff 40%,transparent),radial-gradient(1px 1px at 40% 85%,#fff 40%,transparent),radial-gradient(1px 1px at 86% 40%,#fff 40%,transparent)' }} />

        {/* event horizon */}
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #ff6a82 18%, #ffd0d8 50%, #ff6a82 82%, transparent)', boxShadow: '0 0 14px 1px rgba(255,42,77,0.7)' }} />
        <div className="absolute top-0 left-0 right-0 h-10" style={{ background: 'linear-gradient(180deg, rgba(255,90,110,0.35), transparent)' }} />

        {/* rising motes when live */}
        {live && level > 0.02 && [...Array(7)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ width: 5, height: 5, left: `${8 + i * 13}%`, bottom: `${(i * 17) % 78}%`, background: i % 2 ? '#ffd36b' : '#ffe9b3', boxShadow: '0 0 8px #ffb86b' }}
            animate={{ y: [0, -7, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.6 + i * 0.25, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </motion.div>

      {/* containment vignette + glass curve */}
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 60px 14px rgba(0,0,0,0.75), inset 0 -20px 40px rgba(0,0,0,0.5)' }} />
      <div className="absolute inset-y-0 left-3 w-3 bg-white/[0.05] rounded-full blur-[1px] pointer-events-none" />

      {/* readout */}
      <div className="absolute inset-0 grid place-items-center text-center px-4">
        <div>
          <div className="font-sans font-black tracking-[-0.035em] text-[clamp(32px,6vw,50px)] leading-none text-white tabular-nums" style={{ textShadow: '0 2px 24px rgba(0,0,0,0.95), 0 0 30px rgba(255,42,77,0.25)' }}>
            {live ? fmt(tvl) : '$0'}
          </div>
          <div className="font-mono text-[10px] tracking-[0.18em] text-white/70 mt-2" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.95)' }}>
            {live ? `${fmt(tvl)} of ${fmt(cap)} secured` : 'fills as it earns trust'}
          </div>
        </div>
      </div>
    </div>
  )
}
