'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'

// Honesty as a cinematic 3D gauge. A glowing arc fills to what the bot actually
// DELIVERS; a bright tick marks what it CLAIMS. The letter grade sits in the
// core. The whole rig floats in 3D and tilts to the cursor. Plain-language verdict
// underneath. Optional per-bucket breakdown for the curious. Real data only.

type Pred = { confidence: number; status?: string; outcome?: string }

const TEAL = '#c8ff00'
const AMBER = '#ffb000'
const RED = '#ff5570'
const VIOLET = '#8b7bff'
const MIN_SAMPLE = 8
const NB = 6

function gradeFor(brier: number) {
  if (brier <= 0.12) return { letter: 'A', label: 'Sharp and honest', color: TEAL }
  if (brier <= 0.18) return { letter: 'B', label: 'Reliable', color: TEAL }
  if (brier <= 0.24) return { letter: 'C', label: 'Rough', color: AMBER }
  if (brier <= 0.30) return { letter: 'D', label: 'Overconfident', color: RED }
  return { letter: 'F', label: 'Talks big, misses', color: RED }
}

// gauge geometry — a 270° arc, gap at the bottom
const CX = 130, CY = 128, R = 92
const A0 = 135 // start angle (deg, clockwise from +x)
const SWEEP = 270
const polar = (frac: number, r = R) => {
  const rad = ((A0 + frac * SWEEP) * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}
const arcPath = (f0: number, f1: number) => {
  const p0 = polar(f0), p1 = polar(f1)
  const large = (f1 - f0) * SWEEP > 180 ? 1 : 0
  return `M ${p0.x} ${p0.y} A ${R} ${R} 0 ${large} 1 ${p1.x} ${p1.y}`
}

export default function CalibrationCurve({ predictions }: { predictions: Pred[] }) {
  const [detail, setDetail] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const rx = useSpring(useMotionValue(8), { stiffness: 80, damping: 14 })
  const ry = useSpring(useMotionValue(0), { stiffness: 80, damping: 14 })
  function onMove(e: React.PointerEvent) {
    const el = wrapRef.current; if (!el) return
    const r = el.getBoundingClientRect()
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 20)
    rx.set(8 - ((e.clientY - r.top) / r.height - 0.5) * 16)
  }
  function onLeave() { rx.set(8); ry.set(0) }

  const resolved = (predictions || []).filter(p => { const s = p.status || p.outcome; return s === 'WIN' || s === 'LOSS' })
  const pts = resolved.map(p => { const raw = p.confidence ?? 0.5; return { c: raw > 0.5 ? raw : 1 - raw, o: (p.status || p.outcome) === 'WIN' ? 1 : 0 } })
  const n = pts.length

  if (n < MIN_SAMPLE) {
    return (
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#080809] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#141414]"><span className="font-sans font-bold text-[15px] text-white">Honesty check</span></div>
        <div className="px-5 py-16 text-center">
          <div className="text-[13px] text-[#6a6a74]">Needs ~{MIN_SAMPLE} resolved predictions before we can grade it.</div>
          <div className="text-[11px] text-[#3f3f48] mt-1 font-mono">{n} settled so far</div>
        </div>
      </div>
    )
  }

  const brier = pts.reduce((a, { c, o }) => a + (c - o) ** 2, 0) / n
  const saysPct = Math.round((pts.reduce((a, { c }) => a + c, 0) / n) * 100)
  const deliversPct = Math.round((pts.reduce((a, { o }) => a + o, 0) / n) * 100)
  const gap = saysPct - deliversPct
  const g = gradeFor(brier)
  const dFrac = Math.max(0, Math.min(1, deliversPct / 100))
  const cFrac = Math.max(0, Math.min(1, saysPct / 100))
  const tIn = polar(cFrac, R - 12), tOut = polar(cFrac, R + 12)

  const sentence = gap <= 5
    ? `When it sounds sure, it is right about as often as it claims. It keeps its word.`
    : `When it sounds sure, it is right ${deliversPct}% of the time — but it claims ${saysPct}%. It talks bigger than it delivers.`

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
        <button onClick={() => setDetail(v => !v)} className="font-mono text-[10px] text-[#7a7a84] hover:text-white transition-colors">{detail ? 'hide breakdown −' : 'breakdown +'}</button>
      </div>

      <div className="p-5">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* 3D gauge */}
          <div ref={wrapRef} onPointerMove={onMove} onPointerLeave={onLeave} className="relative shrink-0" style={{ perspective: 800 }}>
            {/* depth glow rings */}
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <motion.div className="w-[150px] h-[150px] rounded-full blur-2xl" style={{ background: `radial-gradient(circle, ${g.color}33, transparent 70%)` }}
                animate={{ opacity: [0.4, 0.75, 0.4], scale: [0.92, 1.04, 0.92] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
            </div>
            <motion.svg viewBox="0 0 260 236" width="260" height="236" className="relative" style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}>
              <defs>
                <filter id="g-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" /></filter>
              </defs>
              {/* track */}
              <path d={arcPath(0, 1)} fill="none" stroke="#16161f" strokeWidth={14} strokeLinecap="round" />
              {/* scale ticks 0/50/100 */}
              {[0, 0.5, 1].map(f => {
                const a = polar(f, R - 15), b = polar(f, R - 22)
                return <line key={f} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#33333f" strokeWidth={1.5} />
              })}
              {/* value arc — glow + solid, animated draw */}
              <motion.path d={arcPath(0, dFrac)} fill="none" stroke={g.color} strokeWidth={14} strokeLinecap="round" strokeOpacity={0.35} filter="url(#g-glow)"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeOut' }} />
              <motion.path d={arcPath(0, dFrac)} fill="none" stroke={g.color} strokeWidth={10} strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeOut' }} />
              {/* claim tick (what it promised) */}
              <motion.line x1={tIn.x} y1={tIn.y} x2={tOut.x} y2={tOut.y} stroke="#ffffff" strokeWidth={3} strokeLinecap="round"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} />
              {/* core: grade */}
              <text x={CX} y={CY - 2} textAnchor="middle" fontSize={64} fontWeight={900} fill={g.color} fontFamily="ui-sans-serif, system-ui">{g.letter}</text>
              <text x={CX} y={CY + 26} textAnchor="middle" fontSize={11} fill="#8a8a94" fontFamily="ui-monospace, monospace">{deliversPct}% delivered</text>
            </motion.svg>
          </div>

          {/* verdict + numbers */}
          <div className="flex-1 min-w-0 w-full">
            <div className="font-sans font-black text-[22px] tracking-tight leading-none mb-2" style={{ color: g.color }}>{g.label}</div>
            <p className="text-[13px] text-[#b4b4be] leading-relaxed m-0 mb-4">{sentence}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#161620] bg-[#08080c] p-3.5">
                <div className="font-mono text-[9px] text-[#5a5a64] tracking-[0.14em] uppercase mb-1 flex items-center gap-1.5"><span className="inline-block w-2.5 h-[3px] bg-white rounded" /> It claims</div>
                <div className="font-sans font-black text-[26px] leading-none tabular-nums text-[#e8e8e8]">{saysPct}%</div>
              </div>
              <div className="rounded-xl border p-3.5" style={{ borderColor: `${g.color}33`, background: `${g.color}0a` }}>
                <div className="font-mono text-[9px] tracking-[0.14em] uppercase mb-1 flex items-center gap-1.5" style={{ color: `${g.color}bb` }}><span className="inline-block w-2.5 h-[3px] rounded" style={{ background: g.color }} /> It delivers</div>
                <div className="font-sans font-black text-[26px] leading-none tabular-nums" style={{ color: g.color }}>{deliversPct}%</div>
              </div>
            </div>
            <div className="mt-3 font-mono text-[10px] text-[#5a5a64] flex items-center gap-4">
              <span>Brier <span className="text-white font-bold tabular-nums">{brier.toFixed(3)}</span></span>
              <span className="text-[#3f3f48]">0.25 = coin flip</span>
              <span>· {n} calls</span>
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {detail && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-4 pt-4 border-t border-[#141414] flex flex-col gap-1.5">
                <div className="font-mono text-[10px] text-[#5a5a64] mb-1">By confidence level — <span className="text-[#8a8a94]">claims</span> vs <span style={{ color: g.color }}>delivers</span></div>
                {rows.map((r, i) => {
                  const over = r.real < r.said - 1
                  const c = over ? RED : TEAL
                  const lo = Math.min(r.said, r.real), hi = Math.max(r.said, r.real)
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-[#8a8a94]">{r.said}%</span>
                      <div className="relative flex-1 h-5">
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#141420] rounded-full" />
                        <div className="absolute top-1/2 -translate-y-1/2 h-[2px] rounded-full" style={{ left: `${lo}%`, width: `${hi - lo}%`, background: c }} />
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-[#6a6a78] bg-[#0a0a10]" style={{ left: `${r.said}%` }} />
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ left: `${r.real}%`, background: c, boxShadow: `0 0 8px ${c}` }} />
                      </div>
                      <span className="w-14 shrink-0 font-mono text-[9px] text-[#48484f] tabular-nums">{r.n} call{r.n === 1 ? '' : 's'}</span>
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
