'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useRef } from 'react'
import BotIrisAvatar from './BotIrisAvatar'

// Honest gamification: every element below derives from REAL protocol data
// (resolved count, heartbeat, win rate). Rank tiers live in lib/botProgress —
// shared with the profile hero so a bot never wears two different ranks.
import { BOT_RANKS as RANKS, botRank as rankOf } from '@/lib/botProgress'

export default function BotUplink({
  eye, status, lastFill, resolved, online, target = 100, winRate,
}: {
  eye: { avatarId: string; accentColor: string; shape?: any }
  status: 'live' | 'awaiting'
  lastFill?: string | null
  resolved?: number
  /** Real-time heartbeat state. When provided, drives the signal (the bot is
   *  "transmitting" when its heartbeat is fresh, regardless of trade history). */
  online?: boolean
  /** Shadow-gate resolved target (100). The reactor ring fills toward it. */
  target?: number
  /** Win rate 0..1 from the latest score row, if any. */
  winRate?: number | null
}) {
  // Signal = the live heartbeat. Falls back to trade-derived status only if the
  // heartbeat state was not passed in.
  const live = online === undefined ? status === 'live' : online
  const accent = live ? '#c8ff00' : '#3a3a4a'
  const n = resolved ?? 0
  const rank = rankOf(n)
  const nextRank = RANKS.find(r => r.at > n) || null
  const progress = Math.max(0, Math.min(1, n / target))
  const containerRef = useRef<HTMLDivElement>(null)

  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const rotateY = useSpring(useTransform(rawX, [-150, 150], [-18, 18]), { stiffness: 80, damping: 14 })
  const rotateX = useSpring(useTransform(rawY, [-80, 80], [12, -12]), { stiffness: 80, damping: 14 })

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    rawX.set(e.clientX - (rect.left + rect.width * 0.22))
    rawY.set(e.clientY - (rect.top + rect.height * 0.5))
  }
  function onMouseLeave() { rawX.set(0); rawY.set(0) }

  // Signal strength (0-5 bars): alive + how much verified evidence exists.
  const bars = !live ? 0 : 1 + Math.min(4, [1, 10, 30, 60].filter(t => n >= t).length)

  // Reactor ring geometry (SVG circle progress)
  const R = 26
  const CIRC = 2 * Math.PI * R

  const metrics = [
    { k: 'Bot', v: live ? 'OPERATING' : 'OFFLINE', c: live ? '#c8ff00' : '#ff5570' },
    { k: 'Signal', v: live ? 'LIVE' : 'SILENT', c: live ? '#c8ff00' : '#444' },
    { k: 'Last trade', v: lastFill || 'never', c: '#ccc' },
    { k: 'Resolved', v: n.toLocaleString(), c: '#8b7bff' },
  ]

  return (
    <div
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="relative rounded-2xl border border-[#16161e] bg-gradient-to-br from-[#0c0c14] via-[#08080d] to-[#050507] overflow-hidden"
    >
      {/* terminal dot grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff07 1px, transparent 0)',
        backgroundSize: '22px 22px',
      }} />
      {/* CRT scanline drifting down the panel — alive, subtle */}
      {live && (
        <motion.div
          className="absolute left-0 right-0 h-[54px] pointer-events-none"
          style={{ background: `linear-gradient(180deg, transparent, ${accent}07, transparent)` }}
          initial={{ top: '-20%' }}
          animate={{ top: '120%' }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'linear' }}
        />
      )}
      {/* accent top line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{
        background: `linear-gradient(90deg, transparent 0%, ${accent}88 30%, ${accent}cc 50%, ${accent}88 70%, transparent 100%)`,
      }} />

      <div className="relative p-5">
        {/* header — rank chip + signal strength bars */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-[#666]">Signal</span>
            {/* rank chip: earned purely from resolved predictions */}
            <span
              className="font-mono text-[9px] font-bold tracking-[0.18em] px-2 py-0.5 rounded-[4px] border"
              style={{ color: rank.color, borderColor: `${rank.color}44`, background: `${rank.color}12` }}
              title={nextRank ? `${nextRank.at - n} resolved to ${nextRank.tag}` : 'Cleared the shadow gate'}
            >
              {rank.tag}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            {/* signal strength — game HUD bars, driven by liveness + evidence */}
            <div className="flex items-end gap-[3px]" aria-label={`signal strength ${bars}/5`}>
              {[0, 1, 2, 3, 4].map(i => (
                <motion.span
                  key={i}
                  className="w-[4px] rounded-[1px]"
                  style={{
                    height: 5 + i * 3,
                    background: i < bars ? accent : '#1a1a24',
                    boxShadow: i < bars ? `0 0 6px ${accent}66` : 'none',
                  }}
                  animate={i === bars - 1 && live ? { opacity: [1, 0.45, 1] } : {}}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
              ))}
            </div>
            <span className="font-mono text-[10px] tracking-[0.16em]" style={{ color: accent }}>
              {live ? 'TRANSMITTING' : 'NO SIGNAL'}
            </span>
          </div>
        </div>

        {/* visual stage */}
        <div className="relative flex items-center gap-4 h-[152px]">

          {/* bot creature — free, no border, floating */}
          <motion.div
            className="relative z-10 shrink-0 flex flex-col items-center"
            style={{ rotateX, rotateY, transformPerspective: 900 }}
          >
            <div className="relative grid place-items-center w-[104px] h-[104px]">
              <div className="absolute inset-0 rounded-full" style={{
                background: `radial-gradient(circle at 50% 42%, ${eye.accentColor}22 0%, ${eye.accentColor}0c 45%, transparent 72%)`,
              }} />
              <div className="absolute rounded-full" style={{ inset: '8px', border: `1px solid ${eye.accentColor}22`, boxShadow: `inset 0 0 24px ${eye.accentColor}10` }} />
              <motion.div
                className="absolute rounded-full blur-2xl"
                style={{ inset: '2px', background: `radial-gradient(circle, ${eye.accentColor}44 0%, transparent 68%)` }}
                animate={{
                  opacity: live ? [0.5, 0.9, 0.5] : [0.12, 0.22, 0.12],
                  scale: live ? [0.9, 1.08, 0.9] : [0.75, 0.9, 0.75],
                }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="relative"
                animate={{ y: live ? [0, -5, 0] : 0 }}
                transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <BotIrisAvatar {...eye} size={84} />
              </motion.div>
            </div>
            <span className="font-mono text-[8px] tracking-[0.22em] text-[#3a3a4a] uppercase mt-2.5">Bot</span>
          </motion.div>

          {/* transmission channel */}
          <div className="relative flex-1 h-full">
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              {[25, 50, 75].map(y => (
                <line key={y} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`}
                  stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.04" strokeDasharray="4 10" />
              ))}
            </svg>

            {/* main carrier wire */}
            <div
              className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2"
              style={live
                ? { background: `linear-gradient(90deg, ${accent}33, ${accent}bb, ${accent}33)` }
                : { background: '#0e0e18', borderTop: '1px dashed #1a1a28' }}
            >
              {/* data packets — prediction payloads leaving the bot for the core */}
              {live && [0, 1, 2, 3].map(i => (
                <motion.span
                  key={i}
                  className="absolute top-1/2 -translate-y-1/2 font-mono font-bold select-none"
                  style={{
                    fontSize: 7,
                    letterSpacing: '0.08em',
                    color: i % 2 ? '#8b7bff' : accent,
                    textShadow: `0 0 8px ${i % 2 ? '#8b7bff' : accent}`,
                  }}
                  initial={{ left: '0%', opacity: 0 }}
                  animate={{ left: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.4, ease: 'linear' }}
                >
                  {i % 2 ? '▓▓' : '01'}
                </motion.span>
              ))}
            </div>

            {/* secondary wires */}
            {live && (
              <>
                {[['30%', 0.15, 1.9], ['70%', 0.55, 2.3]].map(([y, delay, dur], idx) => (
                  <div key={idx} className="absolute left-0 right-0 h-px" style={{ top: y as string, background: `${accent}15` }}>
                    <motion.span
                      className="absolute top-1/2 -translate-y-1/2 rounded-full"
                      style={{ width: 6, height: 2, background: `${accent}99` }}
                      initial={{ left: '0%', opacity: 0 }}
                      animate={{ left: ['0%', '100%'], opacity: [0, 0.9, 0] }}
                      transition={{ duration: dur as number, repeat: Infinity, delay: delay as number, ease: 'linear' }}
                    />
                  </div>
                ))}
              </>
            )}

            {!live && (
              <div className="absolute inset-0 grid place-items-center">
                <span className="bg-[#040406] px-2.5 py-0.5 font-mono text-[9px] tracking-[0.22em] text-[#282832] border border-[#0f0f18] rounded-sm">
                  NO CARRIER
                </span>
              </div>
            )}
          </div>

          {/* brier reactor — progress ring fills toward the shadow gate */}
          <div className="relative z-10 shrink-0 flex flex-col items-center gap-2.5">
            <div className="relative w-[72px] h-[72px] grid place-items-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
                {/* track */}
                <circle cx="32" cy="32" r={R} fill="none" stroke="#ff2a4d1c" strokeWidth="2.5" />
                {/* real progress: resolved / gate target */}
                <motion.circle
                  cx="32" cy="32" r={R} fill="none"
                  stroke="#ff2a4d" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray={CIRC}
                  initial={{ strokeDashoffset: CIRC }}
                  animate={{ strokeDashoffset: CIRC * (1 - progress) }}
                  transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                  style={{ filter: 'drop-shadow(0 0 4px #ff2a4d88)' }}
                />
              </svg>
              {/* counter-rotating dashed ring */}
              <motion.div
                className="absolute rounded-full"
                style={{ inset: '9px', border: '1px dashed #ff2a4d18', borderRight: live ? '1px dashed #ff2a4d44' : '1px dashed #ff2a4d18' }}
                animate={live ? { rotate: -360 } : {}}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              />
              {/* core readout: progress toward the gate, not decoration */}
              <div className="relative text-center leading-none">
                <motion.div
                  className="font-mono font-black text-[15px] tabular-nums text-white"
                  animate={live ? { textShadow: ['0 0 6px #ff2a4d33', '0 0 14px #ff2a4d88', '0 0 6px #ff2a4d33'] } : {}}
                  transition={{ duration: 2.2, repeat: Infinity }}
                >
                  {n}
                </motion.div>
                <div className="font-mono text-[7px] tracking-[0.12em] text-[#5a5a64] mt-0.5">/{target}</div>
              </div>
            </div>
            <span className="font-mono text-[8px] tracking-[0.22em] text-[#3a3a4a] uppercase">Brier gate</span>
          </div>
        </div>

        {/* rank progress — one thin XP bar to the next tier (real resolved counts) */}
        {nextRank && (
          <div className="mt-4 flex items-center gap-3">
            <span className="font-mono text-[8px] tracking-[0.16em] uppercase text-[#3f3f48] shrink-0">next · {nextRank.tag}</span>
            <div className="relative flex-1 h-[3px] rounded-full bg-[#12121a] overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ background: `linear-gradient(90deg, ${rank.color}88, ${nextRank.color})` }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (n / nextRank.at) * 100)}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </div>
            <span className="font-mono text-[9px] tabular-nums text-[#5a5a64] shrink-0">{n}/{nextRank.at}</span>
            {typeof winRate === 'number' && n > 0 && (
              <span className="font-mono text-[9px] tabular-nums shrink-0" style={{ color: winRate >= 0.5 ? '#c8ff00' : '#8a8a94' }}>
                {Math.round(winRate * 100)}% WR
              </span>
            )}
          </div>
        )}

        {/* metrics strip */}
        <div className="grid grid-cols-4 gap-px bg-[#09090f] border border-[#09090f] rounded-lg overflow-hidden mt-4">
          {metrics.map(m => (
            <div key={m.k} className="bg-[#040406] px-3 py-2.5">
              <div className="text-[8px] font-mono text-[#3a3a4a] tracking-[0.18em] uppercase mb-1">{m.k}</div>
              <div className="font-mono font-bold text-[11px] tabular-nums" style={{ color: m.c }}>{m.v}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[10px] text-[#333] font-mono leading-relaxed">
          {live
            ? 'Live heartbeat from the bot. Rank and reactor fill only from resolved predictions — nothing here is decorative.'
            : 'No heartbeat. Start the bot with its credentials to bring the signal online.'}
        </div>
      </div>
    </div>
  )
}
