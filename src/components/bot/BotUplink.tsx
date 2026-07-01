'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useRef } from 'react'
import BotIrisAvatar from './BotIrisAvatar'

export default function BotUplink({
  eye, status, lastFill, resolved, online,
}: {
  eye: { avatarId: string; accentColor: string; shape?: any }
  status: 'live' | 'awaiting'
  lastFill?: string | null
  resolved?: number
  /** Real-time heartbeat state. When provided, drives the signal (the bot is
   *  "transmitting" when its heartbeat is fresh, regardless of trade history). */
  online?: boolean
}) {
  // Signal = the live heartbeat. Falls back to trade-derived status only if the
  // heartbeat state was not passed in.
  const live = online === undefined ? status === 'live' : online
  const accent = live ? '#c8ff00' : '#3a3a4a'
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

  const metrics = [
    { k: 'Bot', v: live ? 'OPERATING' : 'OFFLINE', c: live ? '#c8ff00' : '#ff5570' },
    { k: 'Signal', v: live ? 'LIVE' : 'SILENT', c: live ? '#c8ff00' : '#444' },
    { k: 'Last trade', v: lastFill || 'never', c: '#ccc' },
    { k: 'Resolved', v: resolved != null ? resolved.toLocaleString() : '0', c: '#8b7bff' },
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
      {/* accent top line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{
        background: `linear-gradient(90deg, transparent 0%, ${accent}88 30%, ${accent}cc 50%, ${accent}88 70%, transparent 100%)`,
      }} />

      <div className="relative p-5">
        {/* header */}
        <div className="flex items-center justify-between mb-5">
          <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-[#666]">Signal</span>
          <div className="flex items-center gap-2">
            {live && (
              <motion.span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: accent }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
            )}
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
            {/* premium HD portrait: soft radial disc + ring so the creature reads
                as an intentional portrait, not floating on hard black */}
            <div className="relative grid place-items-center w-[104px] h-[104px]">
              {/* radial base disc */}
              <div className="absolute inset-0 rounded-full" style={{
                background: `radial-gradient(circle at 50% 42%, ${eye.accentColor}22 0%, ${eye.accentColor}0c 45%, transparent 72%)`,
              }} />
              {/* faint ring */}
              <div className="absolute rounded-full" style={{ inset: '8px', border: `1px solid ${eye.accentColor}22`, boxShadow: `inset 0 0 24px ${eye.accentColor}10` }} />
              {/* animated halo */}
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
            {/* scan grid lines in channel */}
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
              {live && [0, 1, 2, 3, 4].map(i => (
                <motion.span
                  key={i}
                  className="absolute top-1/2 -translate-y-1/2 rounded-[1px]"
                  style={{
                    width: 3 + (i % 3),
                    height: 3 + (i % 3),
                    background: accent,
                    boxShadow: `0 0 10px ${accent}, 0 0 20px ${accent}66`,
                  }}
                  initial={{ left: '0%', opacity: 0 }}
                  animate={{ left: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.26, ease: 'linear' }}
                />
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

          {/* brier core */}
          <div className="relative z-10 shrink-0 flex flex-col items-center gap-2.5">
            <div className="relative w-16 h-16 grid place-items-center">
              {/* rotating outer ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: `1px solid #ff2a4d22`, borderTop: live ? '1px solid #ff2a4d66' : '1px solid #ff2a4d22' }}
                animate={live ? { rotate: 360 } : {}}
                transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
              />
              {/* second ring (counter) */}
              <motion.div
                className="absolute rounded-full"
                style={{ inset: '5px', border: '1px dashed #ff2a4d18', borderRight: live ? '1px dashed #ff2a4d44' : '1px dashed #ff2a4d18' }}
                animate={live ? { rotate: -360 } : {}}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              />
              {/* core orb */}
              <motion.div
                className="w-5 h-5 rounded-full bg-primary"
                animate={live ? {
                  boxShadow: ['0 0 8px #ff2a4d55', '0 0 28px #ff2a4daa', '0 0 8px #ff2a4d55'],
                } : { boxShadow: '0 0 4px #ff2a4d22' }}
                transition={{ duration: 2.2, repeat: Infinity }}
              />
            </div>
            <span className="font-mono text-[8px] tracking-[0.22em] text-[#3a3a4a] uppercase">Brier</span>
          </div>
        </div>

        {/* metrics strip */}
        <div className="grid grid-cols-4 gap-px bg-[#09090f] border border-[#09090f] rounded-lg overflow-hidden mt-5">
          {metrics.map(m => (
            <div key={m.k} className="bg-[#040406] px-3 py-2.5">
              <div className="text-[8px] font-mono text-[#3a3a4a] tracking-[0.18em] uppercase mb-1">{m.k}</div>
              <div className="font-mono font-bold text-[11px] tabular-nums" style={{ color: m.c }}>{m.v}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[10px] text-[#333] font-mono leading-relaxed">
          {live
            ? 'Live heartbeat from the bot. Predictions are scored on real resolutions.'
            : 'No heartbeat. Start the bot with its credentials to bring the signal online.'}
        </div>
      </div>
    </div>
  )
}
