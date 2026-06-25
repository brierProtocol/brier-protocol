'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useRef } from 'react'
import BotIrisAvatar from './BotIrisAvatar'

export default function BotUplink({
  eye, status, lastFill,
}: {
  eye: { avatarId: string; accentColor: string; shape?: any }
  status: 'live' | 'awaiting'
  lastFill?: string | null
}) {
  const live = status === 'live'
  const accent = live ? '#00d4aa' : '#5a5a5a'
  const containerRef = useRef<HTMLDivElement>(null)

  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const rotateY = useSpring(useTransform(rawX, [-100, 100], [-14, 14]), { stiffness: 100, damping: 15 })
  const rotateX = useSpring(useTransform(rawY, [-80, 80], [10, -10]), { stiffness: 100, damping: 15 })

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const alienX = rect.left + rect.width * 0.14
    const alienY = rect.top + rect.height * 0.5
    rawX.set(e.clientX - alienX)
    rawY.set(e.clientY - alienY)
  }
  function onMouseLeave() {
    rawX.set(0)
    rawY.set(0)
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="relative rounded-2xl border border-[#1a1a1a] bg-[#070708] overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none opacity-70" style={{
        backgroundImage: 'radial-gradient(1px 1px at 15% 30%,#ffffff22 50%,transparent),radial-gradient(1px 1px at 80% 22%,#ffffff1a 50%,transparent),radial-gradient(1px 1px at 62% 70%,#ffffff22 50%,transparent),radial-gradient(1px 1px at 38% 82%,#ff2a4d33 50%,transparent)'
      }} />
      <div className="relative p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-[#888]">Signal</span>
          <span className="font-mono text-[10px] tracking-widest" style={{ color: accent }}>
            {live ? 'TRANSMITTING' : 'NO SIGNAL'}
          </span>
        </div>

        <div className="relative flex items-center justify-between h-[92px] px-1">
          {/* alien — free, no border, 3D mouse tracking */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-1.5"
            style={{ opacity: live ? 1 : 0.4, rotateX, rotateY, transformPerspective: 500 }}
          >
            <motion.div
              animate={live ? {
                filter: [
                  `drop-shadow(0 0 6px ${accent}55)`,
                  `drop-shadow(0 0 16px ${accent}99)`,
                  `drop-shadow(0 0 6px ${accent}55)`,
                ],
              } : { filter: 'none' }}
              transition={{ duration: 2.2, repeat: Infinity }}
            >
              <BotIrisAvatar {...eye} size={48} />
            </motion.div>
            <span className="font-mono text-[8px] tracking-[0.2em] text-[#777]">ALIEN</span>
          </motion.div>

          {/* wire */}
          <div
            className="absolute left-[78px] right-[78px] top-[26px] h-px"
            style={live ? { background: `${accent}55` } : { borderTop: '1px dashed #242424' }}
          >
            {live
              ? [0, 1, 2, 3].map(i => (
                  <motion.span
                    key={i}
                    className="absolute top-1/2 w-1.5 h-1.5 rounded-[1px]"
                    style={{ background: accent, marginTop: -3, boxShadow: `0 0 6px ${accent}` }}
                    initial={{ left: '0%', opacity: 0 }}
                    animate={{ left: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.4, ease: 'linear' }}
                  />
                ))
              : (
                  <span className="absolute left-1/2 -translate-x-1/2 -top-[7px] bg-[#070708] px-2 font-mono text-[8px] tracking-[0.2em] text-[#555]">
                    link down
                  </span>
                )
            }
          </div>

          {/* brier core */}
          <div className="relative z-10 flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-full grid place-items-center border border-primary/20">
              <motion.span
                className="rounded-full bg-primary"
                style={{ width: 18, height: 18 }}
                animate={live ? { boxShadow: ['0 0 6px #ff2a4d', '0 0 18px #ff2a4d', '0 0 6px #ff2a4d'] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <span className="font-mono text-[8px] tracking-[0.2em] text-[#777]">BRIER</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px bg-[#161616] border border-[#161616] rounded-lg overflow-hidden mt-3">
          {([
            ['Node', live ? 'ONLINE' : 'OFFLINE', live ? '#00d4aa' : '#ff5570'],
            ['Signal', live ? 'RECEIVING' : 'SILENT', live ? '#00d4aa' : '#777'],
            ['Last fill', lastFill || 'never', '#e8e8e8'],
          ] as [string, string, string][]).map(([k, v, c]) => (
            <div key={k} className="bg-[#070708] px-3 py-2">
              <div className="text-[8px] font-mono text-[#555] tracking-[0.18em] uppercase mb-0.5">{k}</div>
              <div className="font-mono font-bold text-[12px] tabular-nums" style={{ color: c }}>{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-2.5 text-[10px] text-[#555] leading-relaxed">
          Inferred from on-chain activity. Brier watches the wallet, not the machine.
        </div>
      </div>
    </div>
  )
}
