'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'

// Honesty as a floating 3D orb — the Brier "eye". The iris ring fills to what the
// bot DELIVERS; a bright tick marks what it CLAIMS; the core shows the real
// delivered % over the claimed %. The orb floats and tilts to the cursor over a
// starfield. Numbers, not a grade. Real resolved predictions only.

type Pred = { confidence: number; status?: string; outcome?: string }

const TEAL = '#c8ff00'
const RED = '#ff5570'
const VIOLET = '#8b7bff'
const MIN_SAMPLE = 8
const NB = 6
const RC = 74
const CIRC = 2 * Math.PI * RC

export default function CalibrationCurve({ predictions }: { predictions: Pred[] }) {
  const [detail, setDetail] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const rx = useSpring(useMotionValue(0), { stiffness: 70, damping: 12 })
  const ry = useSpring(useMotionValue(0), { stiffness: 70, damping: 12 })
  function onMove(e: React.PointerEvent) {
    const el = wrapRef.current; if (!el) return
    const r = el.getBoundingClientRect()
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 30)
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 30)
  }
  function onLeave() { rx.set(0); ry.set(0) }

  const resolved = (predictions || []).filter(p => { const s = p.status || p.outcome; return s === 'WIN' || s === 'LOSS' })
  const pts = resolved.map(p => { const raw = p.confidence ?? 0.5; return { c: raw > 0.5 ? raw : 1 - raw, o: (p.status || p.outcome) === 'WIN' ? 1 : 0 } })
  const n = pts.length

  if (n < MIN_SAMPLE) {
    return (
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#080809] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#141414]"><span className="font-sans font-bold text-[15px] text-white">Honesty check</span></div>
        <div className="px-5 py-16 text-center">
          <div className="text-[13px] text-[#6a6a74]">Needs ~{MIN_SAMPLE} resolved predictions.</div>
          <div className="text-[11px] text-[#3f3f48] mt-1 font-mono">{n} settled so far</div>
        </div>
      </div>
    )
  }

  const brier = pts.reduce((a, { c, o }) => a + (c - o) ** 2, 0) / n
  const saysPct = Math.round((pts.reduce((a, { c }) => a + c, 0) / n) * 100)
  const deliversPct = Math.round((pts.reduce((a, { o }) => a + o, 0) / n) * 100)
  const honest = saysPct - deliversPct <= 5
  const accent = honest ? TEAL : RED
  const dFrac = Math.max(0, Math.min(1, deliversPct / 100))
  const claimAngle = -90 + (saysPct / 100) * 360

  const bins = Array.from({ length: NB }, () => ({ sum: 0, win: 0, n: 0 }))
  for (const { c, o } of pts) { const i = Math.min(NB - 1, Math.max(0, Math.floor(((c - 0.5) / 0.5) * NB))); bins[i].sum += c; bins[i].win += o; bins[i].n++ }
  const rows = bins.map(b => b.n > 0 ? { said: Math.round((b.sum / b.n) * 100), real: Math.round((b.win / b.n) * 100), n: b.n } : null).filter(Boolean) as { said: number; real: number; n: number }[]

  return (
    <div className="rounded-2xl border border-[#1a1a1a] bg-gradient-to-b from-[#0c0c14] to-[#060608] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#141414]">
        <div className="flex items-baseline gap-2.5">
          <span className="font-sans font-bold text-[15px] tracking-tight text-white">Honesty check</span>
          <span className="font-mono text-[10px] text-[#5a5a64]">claims vs delivers</span>
        </div>
        <button onClick={() => setDetail(v => !v)} className="font-mono text-[10px] text-[#7a7a84] hover:text-white transition-colors">{detail ? 'hide −' : 'breakdown +'}</button>
      </div>

      <div className="p-5">
        <div className="flex flex-col md:flex-row items-center gap-7">
          {/* floating 3D orb */}
          <div ref={wrapRef} onPointerMove={onMove} onPointerLeave={onLeave} className="relative shrink-0 grid place-items-center" style={{ width: 210, height: 210, perspective: 700 }}>
            <motion.div className="absolute w-[160px] h-[160px] rounded-full blur-3xl" style={{ background: `radial-gradient(circle, ${accent}44, transparent 70%)` }}
              animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.9, 1.06, 0.9] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }} />
            {[[34, 26], [176, 44], [158, 176], [28, 158], [100, 12], [196, 116]].map(([x, y], i) => (
              <motion.span key={i} className="absolute w-[2px] h-[2px] rounded-full bg-white" style={{ left: x, top: y }}
                animate={{ opacity: [0.1, 0.55, 0.1] }} transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut' }} />
            ))}
            <motion.div className="relative grid place-items-center" style={{ width: 176, height: 176, rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
              animate={{ y: [0, -7, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
              <div className="absolute rounded-full" style={{
                inset: 22,
                background: `radial-gradient(circle at 34% 28%, ${accent}3a, #0c0c14 62%), radial-gradient(circle at 70% 80%, ${accent}18, transparent 60%)`,
                boxShadow: `inset 0 0 42px ${accent}22, 0 14px 46px rgba(0,0,0,0.6)`, border: `1px solid ${accent}22`,
              }} />
              <svg viewBox="0 0 176 176" className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="88" cy="88" r={RC} fill="none" stroke="#17171f" strokeWidth={7} />
                <motion.circle cx="88" cy="88" r={RC} fill="none" stroke={accent} strokeWidth={7} strokeLinecap="round"
                  strokeDasharray={CIRC} initial={{ strokeDashoffset: CIRC }} animate={{ strokeDashoffset: CIRC * (1 - dFrac) }}
                  transition={{ duration: 1.2, ease: 'easeOut' }} style={{ filter: `drop-shadow(0 0 6px ${accent})` }} />
              </svg>
              <div className="absolute left-1/2 top-1/2" style={{ transform: `rotate(${claimAngle}deg)` }}>
                <div className="absolute w-[3px] h-3 bg-white rounded-full" style={{ left: -1.5, top: -(RC) - 6, boxShadow: '0 0 6px #fff' }} />
              </div>
              <div className="relative text-center" style={{ transform: 'translateZ(30px)' }}>
                <div className="font-sans font-black leading-none tabular-nums" style={{ fontSize: 46, color: accent, textShadow: `0 0 24px ${accent}66` }}>{deliversPct}%</div>
                <div className="font-mono text-[10px] text-[#8a8a94] mt-1">delivered</div>
                <div className="font-mono text-[9px] text-[#5a5a64] mt-0.5">claims {saysPct}%</div>
              </div>
            </motion.div>
          </div>

          {/* verdict + numbers */}
          <div className="flex-1 min-w-0 w-full">
            <div className="font-sans font-black text-[20px] tracking-tight leading-tight mb-2" style={{ color: accent }}>{honest ? 'Keeps its word' : 'Talks bigger than it delivers'}</div>
            <p className="text-[12.5px] text-[#b4b4be] leading-relaxed m-0 mb-4">
              {honest
                ? 'When it sounds sure, it is right about as often as it claims.'
                : `When it sounds sure it is right ${deliversPct}% of the time — but it claims ${saysPct}%.`}
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { k: 'Claims', v: `${saysPct}%`, c: '#e8e8e8' },
                { k: 'Delivers', v: `${deliversPct}%`, c: accent },
                { k: 'Brier', v: brier.toFixed(3), c: brier <= 0.25 ? TEAL : RED },
              ].map(m => (
                <div key={m.k} className="rounded-xl border border-[#161620] bg-[#08080c] p-3">
                  <div className="font-mono text-[8px] text-[#5a5a64] tracking-[0.12em] uppercase mb-1">{m.k}</div>
                  <div className="font-sans font-black text-[20px] leading-none tabular-nums" style={{ color: m.c }}>{m.v}</div>
                </div>
              ))}
            </div>
            <div className="mt-2.5 font-mono text-[10px] text-[#48484f]">{n} resolved calls · <span className="text-[#5a5a64]">tick = claim, ring = delivered</span></div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {detail && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-5 pt-4 border-t border-[#141414] flex flex-col gap-1.5">
                <div className="font-mono text-[10px] text-[#5a5a64] mb-1">By confidence level — <span className="text-[#8a8a94]">claims</span> vs <span style={{ color: accent }}>delivers</span></div>
                {rows.map((r, i) => {
                  const over = r.real < r.said - 1
                  const c = over ? RED : TEAL
                  const lo = Math.min(r.said, r.real), hi = Math.max(r.said, r.real)
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-[#8a8a94]">{r.said}%</span>
                      <div className="relative flex-1 h-6">
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#141420] rounded-full" />
                        <div className="absolute top-1/2 -translate-y-1/2 h-[2px] rounded-full" style={{ left: `${lo}%`, width: `${hi - lo}%`, background: c }} />
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-[#6a6a78] bg-[#0a0a10]" style={{ left: `${r.said}%` }} />
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ left: `${r.real}%`, background: c, boxShadow: `0 0 8px ${c}` }} />
                      </div>
                      <span className="w-12 shrink-0 font-mono text-[8px] text-[#48484f] tabular-nums">{r.n} calls</span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
