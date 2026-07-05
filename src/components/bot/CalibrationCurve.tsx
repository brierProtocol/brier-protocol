'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'

// The reliability diagram, rendered as a true isometric 3D scene. Position on the
// tilted floor is calibration (predicted × observed, with the honesty ridge = the
// diagonal); the height of each glowing stalk is how much evidence backs that
// point (sample count). So a tall stalk far from the ridge is a confident,
// well-tested miscalibration; a short one is just noise. Real resolved
// predictions only — never mocked.

type Pred = { confidence: number; status?: string; outcome?: string }

const TEAL = '#c8ff00'
const VIOLET = '#8b7bff'
const RED = '#ff5570'
const MIN_SAMPLE = 8
const NB = 6

// isometric projection of ground (u,v ∈ [0,1]) + height z, into SVG space
const COS = Math.cos(Math.PI / 6)
const SIN = Math.sin(Math.PI / 6)
const SCALE = 132
const ZS = 96
const OX = 182
const OY = 92
function proj(u: number, v: number, z = 0): [number, number] {
  const sx = (u - v) * COS
  const sy = (u + v) * SIN
  return [OX + sx * SCALE, OY + sy * SCALE - z * ZS]
}
const pt = (u: number, v: number, z = 0) => proj(u, v, z).join(',')

export default function CalibrationCurve({ predictions }: { predictions: Pred[] }) {
  const [info, setInfo] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // pointer parallax — tilt the whole scene toward the cursor
  const rx = useSpring(useMotionValue(0), { stiffness: 90, damping: 16 })
  const ry = useSpring(useMotionValue(0), { stiffness: 90, damping: 16 })
  function onMove(e: React.PointerEvent) {
    const el = wrapRef.current; if (!el) return
    const r = el.getBoundingClientRect()
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 16)
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 12)
  }
  function onLeave() { rx.set(0); ry.set(0) }

  const resolved = (predictions || []).filter(p => { const s = p.status || p.outcome; return s === 'WIN' || s === 'LOSS' })
  const pts = resolved.map(p => {
    const raw = p.confidence ?? 0.5
    const c = raw > 0.5 ? raw : 1 - raw
    return { c, o: (p.status || p.outcome) === 'WIN' ? 1 : 0 }
  })
  const n = pts.length
  const brier = n ? pts.reduce((a, { c, o }) => a + (c - o) ** 2, 0) / n : null
  const meanGap = n ? pts.reduce((a, { c, o }) => a + (o - c), 0) / n : 0

  const bins = Array.from({ length: NB }, () => ({ sum: 0, win: 0, n: 0 }))
  for (const { c, o } of pts) {
    const i = Math.min(NB - 1, Math.max(0, Math.floor(((c - 0.5) / 0.5) * NB)))
    bins[i].sum += c; bins[i].win += o; bins[i].n++
  }
  const maxN = Math.max(1, ...bins.map(b => b.n))
  // each bucket → ground position (u=predicted, v=observed), height=evidence
  const stalks = bins.map(b => b.n > 0 ? {
    u: b.sum / b.n, v: b.win / b.n, z: (b.n / maxN) * 0.9, n: b.n,
    above: (b.win / b.n) >= (b.sum / b.n),
  } : null).filter(Boolean) as { u: number; v: number; z: number; n: number; above: boolean }[]

  const verdict =
    n < MIN_SAMPLE ? { t: 'Accumulating', c: VIOLET }
    : Math.abs(meanGap) < 0.05 ? { t: 'Well calibrated', c: TEAL }
    : meanGap <= -0.05 ? { t: 'Overconfident', c: RED }
    : { t: 'Underconfident', c: VIOLET }

  const grid = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="rounded-2xl border border-[#1a1a1a] bg-gradient-to-b from-[#0a0a10] to-[#070709] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#141414]">
        <div className="flex items-baseline gap-2.5">
          <span className="font-sans font-bold text-[15px] tracking-tight text-white">Calibration</span>
          <span className="font-mono text-[10px] text-[#5a5a64]">do its odds mean what they say</span>
        </div>
        <button onClick={() => setInfo(v => !v)} className="font-mono text-[10px] text-[#48484f] hover:text-[#9a9a94] transition-colors">{info ? '−' : '?'}</button>
      </div>

      <AnimatePresence initial={false}>
        {info && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 py-3 text-[12px] text-[#b4b4be] leading-relaxed border-b border-[#141414] bg-[#0a0a0e]">
              The floor maps what the bot said (one axis) against what actually happened (the other). The dashed ridge is perfect honesty. Each glowing stalk stands where a confidence bucket landed, and its height is how many predictions back it — a tall stalk far from the ridge is a confident, well-tested miscalibration; a short one is just noise. This is the Brier score, in three dimensions.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-5 py-2.5 border-b border-[#141414] text-[12px] text-[#8a8a94] leading-relaxed">
        When it says <span className="text-white font-semibold">70%</span>, it should come true about <span className="text-white font-semibold">70%</span> of the time. Stalks on the ridge are honest — off the ridge, it is miscalibrated.
      </div>

      {n < MIN_SAMPLE ? (
        <div className="px-5 py-16 text-center">
          <div className="text-[13px] text-[#6a6a74]">Calibration needs ~{MIN_SAMPLE} resolved predictions.</div>
          <div className="text-[11px] text-[#3f3f48] mt-1 font-mono">{n} settled so far</div>
        </div>
      ) : (
        <div className="p-5">
          <div className="flex flex-col lg:flex-row gap-5 items-center">
            <motion.div ref={wrapRef} onPointerMove={onMove} onPointerLeave={onLeave} className="w-full max-w-[420px] shrink-0" style={{ perspective: 900 }}>
              <motion.svg viewBox="0 0 360 300" className="w-full" role="img" aria-label="3D calibration reliability scene" style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}>
                <defs>
                  <filter id="cal-soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" /></filter>
                </defs>

                {/* floor plane */}
                <polygon points={`${pt(0, 0)} ${pt(1, 0)} ${pt(1, 1)} ${pt(0, 1)}`} fill="#0e0e16" stroke="#1e1e2a" strokeWidth={1} />

                {/* grid */}
                {grid.map(g => (
                  <g key={g} stroke="#1b1b26" strokeWidth={0.8}>
                    <line x1={proj(g, 0)[0]} y1={proj(g, 0)[1]} x2={proj(g, 1)[0]} y2={proj(g, 1)[1]} />
                    <line x1={proj(0, g)[0]} y1={proj(0, g)[1]} x2={proj(1, g)[0]} y2={proj(1, g)[1]} />
                  </g>
                ))}

                {/* perfect-honesty ridge (diagonal u=v), slightly raised */}
                <line x1={proj(0, 0, 0.02)[0]} y1={proj(0, 0, 0.02)[1]} x2={proj(1, 1, 0.02)[0]} y2={proj(1, 1, 0.02)[1]} stroke="#4a4a5e" strokeWidth={1.6} strokeDasharray="5 4" />
                <text {...xy(proj(0.82, 0.82, 0.06))} fill="#6a6a80" fontSize={8.5} fontFamily="monospace" textAnchor="middle">perfect honesty</text>

                {/* axis labels along the two front edges */}
                <text {...xy(proj(0.5, 0, 0))} dy={16} fill="#5a5a68" fontSize={9} fontFamily="monospace" textAnchor="middle">predicted %</text>
                <text {...xy(proj(0, 0.5, 0))} dy={16} fill="#5a5a68" fontSize={9} fontFamily="monospace" textAnchor="middle">observed %</text>
                {[0, 0.5, 1].map(g => (
                  <g key={'t' + g}>
                    <text {...xy(proj(g, 0, 0))} dy={11} dx={6} fill="#3f3f48" fontSize={8} fontFamily="monospace" textAnchor="middle">{g * 100}</text>
                    <text {...xy(proj(0, g, 0))} dy={11} dx={-6} fill="#3f3f48" fontSize={8} fontFamily="monospace" textAnchor="middle">{g * 100}</text>
                  </g>
                ))}

                {/* stalks: shadow on floor → stem → glowing bulb */}
                {stalks.map((s, i) => {
                  const color = s.above ? TEAL : RED
                  const [gx, gy] = proj(s.u, s.v, 0)
                  const [tx, ty] = proj(s.u, s.v, s.z)
                  const r = 4 + Math.sqrt(s.n / maxN) * 7
                  return (
                    <g key={i}>
                      <ellipse cx={gx} cy={gy} rx={r * 0.9} ry={r * 0.45} fill="#000" opacity={0.5} />
                      <motion.line x1={gx} y1={gy} x2={tx} y2={ty} stroke={color} strokeWidth={2} strokeOpacity={0.6}
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2 + i * 0.08, duration: 0.5 }} />
                      <motion.circle cx={tx} cy={ty} r={r} fill={color} opacity={0.25} filter="url(#cal-soft)"
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 + i * 0.08, type: 'spring', stiffness: 220, damping: 14 }} />
                      <motion.circle cx={tx} cy={ty} r={r * 0.62} fill={color} stroke="#07070a" strokeWidth={1.5}
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.45 + i * 0.08, type: 'spring', stiffness: 240, damping: 15 }}>
                        <title>{`Said ~${Math.round(s.u * 100)}% · right ${Math.round(s.v * 100)}% · n=${s.n}`}</title>
                      </motion.circle>
                    </g>
                  )
                })}
              </motion.svg>
            </motion.div>

            <div className="flex-1 w-full grid grid-cols-3 lg:grid-cols-1 gap-3">
              <div>
                <div className="font-mono text-[9px] text-[#48484f] tracking-[0.14em] uppercase mb-1">Verdict</div>
                <div className="font-sans font-bold text-[16px]" style={{ color: verdict.c }}>{verdict.t}</div>
                <div className="font-mono text-[9px] text-[#3f3f48] mt-0.5">{meanGap >= 0 ? 'delivers ≥ it claims' : 'claims > it delivers'}</div>
              </div>
              <div>
                <div className="font-mono text-[9px] text-[#48484f] tracking-[0.14em] uppercase mb-1">Brier</div>
                <div className="font-sans font-bold text-[16px] tabular-nums text-white">{brier!.toFixed(3)}</div>
                <div className="font-mono text-[9px] text-[#3f3f48] mt-0.5">0.25 = coin flip</div>
              </div>
              <div>
                <div className="font-mono text-[9px] text-[#48484f] tracking-[0.14em] uppercase mb-1">Sample</div>
                <div className="font-sans font-bold text-[16px] tabular-nums text-white">{n.toLocaleString()}</div>
                <div className="font-mono text-[9px] text-[#3f3f48] mt-0.5">resolved calls</div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[9px] text-[#5a5a64]">
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: TEAL }} /> delivers ≥ it claims</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: RED }} /> overclaims</span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3.5 border-t border-dashed align-middle" style={{ borderColor: '#4a4a5a' }} /> perfect honesty</span>
            <span className="inline-flex items-center gap-1.5">stalk height = evidence (sample)</span>
          </div>
        </div>
      )}
    </div>
  )
}

function xy([x, y]: [number, number]) { return { x, y } }
