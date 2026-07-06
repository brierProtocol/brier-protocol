'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'

// Honesty as a floating 3D orb — the Brier "eye". The iris ring fills to what the
// bot DELIVERS; a bright tick marks what it CLAIMS; the letter grade glows in the
// core. The orb floats and tilts to the cursor. Plain verdict + numbers beside it;
// per-bucket breakdown a tap away. All from real resolved predictions.

type Pred = { confidence: number; status?: string; outcome?: string }

const TEAL = '#c8ff00'
const AMBER = '#ffb000'
const RED = '#ff5570'
const MIN_SAMPLE = 8
const NB = 6

function gradeFor(brier: number) {
  if (brier <= 0.12) return { letter: 'A', label: 'Sharp and honest', color: TEAL }
  if (brier <= 0.18) return { letter: 'B', label: 'Reliable', color: TEAL }
  if (brier <= 0.24) return { letter: 'C', label: 'Rough', color: AMBER }
  if (brier <= 0.30) return { letter: 'D', label: 'Overconfident', color: RED }
  return { letter: 'F', label: 'Talks big, misses', color: RED }
}

const RC = 78 // ring radius
const CIRC = 2 * Math.PI * RC

export default function CalibrationCurve({ predictions }: { predictions: Pred[] }) {
  const [detail, setDetail] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const rx = useSpring(useMotionValue(0), { stiffness: 70, damping: 12 })
  const ry = useSpring(useMotionValue(0), { stiffness: 70, damping: 12 })
  function onMove(e: React.PointerEvent) {
    const el = wrapRef.current; if (!el) return
    const r = el.getBoundingClientRect()
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 26)
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 26)
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
  const claimAngle = -90 + (saysPct / 100) * 360

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
        <div className="flex flex-col md:flex-row items-center gap-7">
          {/* floating orb */}
          <div ref={wrapRef} onPointerMove={onMove} onPointerLeave={onLeave} className="relative shrink-0 grid place-items-center" style={{ width: 200, height: 200, perspective: 700 }}>
            {/* ambient glow */}
            <motion.div className="absolute w-[150px] h-[150px] rounded-full blur-3xl" style={{ background: `radial-gradient(circle, ${g.color}44, transparent 70%)` }}
              animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.9, 1.06, 0.9] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }} />
            {/* faint stars for depth */}
            {[[30, 24], [168, 40], [150, 168], [26, 150], [96, 12], [186, 110]].map(([x, y], i) => (
              <motion.span key={i} className="absolute w-[2px] h-[2px] rounded-full bg-white" style={{ left: x, top: y }}
                animate={{ opacity: [0.1, 0.5, 0.1] }} transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut' }} />
            ))}

            <motion.div className="relative grid place-items-center" style={{ width: 176, height: 176, rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
              animate={{ y: [0, -6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
              {/* the sphere */}
              <div className="absolute rounded-full" style={{
                inset: 20,
                background: `radial-gradient(circle at 34% 28%, ${g.color}38, #0c0c14 62%), radial-gradient(circle at 70% 80%, ${g.color}18, transparent 60%)`,
                boxShadow: `inset 0 0 40px ${g.color}22, 0 10px 40px rgba(0,0,0,0.6)`,
                border: `1px solid ${g.color}22`,
              }} />
              {/* iris ring — delivered fill + claim tick */}
              <svg viewBox="0 0 176 176" className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="88" cy="88" r={RC} fill="none" stroke="#17171f" strokeWidth={7} />
                <motion.circle cx="88" cy="88" r={RC} fill="none" stroke={g.color} strokeWidth={7} strokeLinecap="round"
                  strokeDasharray={CIRC} initial={{ strokeDashoffset: CIRC }} animate={{ strokeDashoffset: CIRC * (1 - dFrac) }}
                  transition={{ duration: 1.2, ease: 'easeOut' }} style={{ filter: `drop-shadow(0 0 6px ${g.color})` }} />
              </svg>
              {/* claim tick (rotated to its angle) */}
              <div className="absolute left-1/2 top-1/2" style={{ transform: `rotate(${claimAngle}deg)` }}>
                <div className="absolute w-[3px] h-3 bg-white rounded-full" style={{ left: -1.5, top: -(RC) - 6, boxShadow: '0 0 6px #fff' }} />
              </div>
              {/* core grade */}
              <div className="relative text-center" style={{ transform: 'translateZ(30px)' }}>
                <div className="font-sans font-black leading-none" style={{ fontSize: 58, color: g.color, textShadow: `0 0 24px ${g.color}66` }}>{g.letter}</div>
                <div className="font-mono text-[10px] text-[#8a8a94] mt-1">{deliversPct}% delivered</div>
              </div>
            </motion.div>
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
