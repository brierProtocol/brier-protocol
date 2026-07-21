'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

// confidence is read null-safe below (`p.confidence ?? 0.5`), so the type is
// nullable/optional to match the profile's committed-call shape (ProfileTrade).
type Pred = { confidence?: number | null; status?: string; outcome?: string }

const LIME = '#c8ff00'
const RED = '#ff5570'
const VIOLET = '#8b7bff'
const MIN_SAMPLE = 8
const NB = 5 // Bins: 50-60, 60-70, 70-80, 80-90, 90-100

// SVG viewbox: a square plot with padding for axis labels.
const VB = 300
const PAD = 34
const PLOT = VB - PAD * 2

// Map a probability (0.5..1) to plot x, and a hit-rate (0..1 within the 0.5..1
// band, but delivered can be anything 0..1) to plot y (inverted: 100% at top).
const px = (claim: number) => PAD + ((claim - 0.5) / 0.5) * PLOT
const py = (rate: number) => PAD + (1 - rate) * PLOT

/** Smooth-ish polyline through the bin points (Catmull-Rom → cubic bezier). */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  const d: string[] = [`M ${points[0].x} ${points[0].y}`]
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`)
  }
  return d.join(' ')
}

export default function CalibrationCurve({ predictions }: { predictions: Pred[] }) {
  const [hover, setHover] = useState<number | null>(null)

  const { n, rows, brier, saysPct, deliversPct } = useMemo(() => {
    const resolved = (predictions || []).filter(p => { const s = p.status || p.outcome; return s === 'WIN' || s === 'LOSS' })
    const pts = resolved.map(p => { const raw = p.confidence ?? 0.5; return { c: raw > 0.5 ? raw : 1 - raw, o: (p.status || p.outcome) === 'WIN' ? 1 : 0 } })
    const n = pts.length
    const bins = Array.from({ length: NB }, () => ({ sum: 0, win: 0, n: 0 }))
    for (const { c, o } of pts) {
      const i = Math.min(NB - 1, Math.max(0, Math.floor(((c - 0.5) / 0.5) * NB)))
      bins[i].sum += c; bins[i].win += o; bins[i].n++
    }
    const rows = bins.map((b, i) => b.n > 0
      ? { i, claim: b.sum / b.n, real: b.win / b.n, n: b.n, mid: 0.55 + i * 0.1 }
      : null).filter(Boolean) as { i: number; claim: number; real: number; n: number; mid: number }[]
    const brier = n ? pts.reduce((a, { c, o }) => a + (c - o) ** 2, 0) / n : 0
    const saysPct = n ? Math.round((pts.reduce((a, { c }) => a + c, 0) / n) * 100) : 0
    const deliversPct = n ? Math.round((pts.reduce((a, { o }) => a + o, 0) / n) * 100) : 0
    return { n, rows, brier, saysPct, deliversPct }
  }, [predictions])

  if (n < MIN_SAMPLE) {
    return (
      <div className="rounded-2xl border border-[#1a1a1a] bg-gradient-to-b from-[#0a0a0e] to-[#040405] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#141414]">
          <span className="font-sans font-bold text-[15px] text-white">Calibration</span>
          <span className="ml-2.5 font-mono text-[10px] text-[#5a5a64]">does its confidence tell the truth?</span>
        </div>
        <div className="px-5 py-14 text-center">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <motion.div className="absolute inset-0 rounded-full border border-[#8b7bff33]"
              animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2.4, repeat: Infinity }} />
            <div className="absolute inset-0 grid place-items-center font-mono text-[11px] text-[#6a6a74] tabular-nums">{n}/{MIN_SAMPLE}</div>
          </div>
          <div className="text-[13px] text-[#6a6a74]">The reliability curve draws itself once ~{MIN_SAMPLE} calls resolve.</div>
          <div className="text-[11px] text-[#3f3f48] mt-1 font-mono">{n} settled so far</div>
        </div>
      </div>
    )
  }

  const honest = saysPct - deliversPct <= 5
  const accent = honest ? LIME : RED

  const claimPts = rows.map(r => ({ x: px(r.claim), y: py(r.claim) })) // on the diagonal
  const realPts = rows.map(r => ({ x: px(r.claim), y: py(r.real) }))   // where it actually landed
  const realPath = smoothPath(realPts)

  // Area between the perfect diagonal and the delivered curve = the "honesty gap".
  const gapArea = realPts.length >= 2
    ? `${smoothPath(realPts)} L ${claimPts[claimPts.length - 1].x} ${claimPts[claimPts.length - 1].y} ` +
      claimPts.slice(0, -1).reverse().map(p => `L ${p.x} ${p.y}`).join(' ') + ' Z'
    : ''

  return (
    <div className="rounded-2xl border border-[#1a1a1a] bg-gradient-to-b from-[#0a0a0e] to-[#040405] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#141414]">
        <div className="flex items-baseline gap-2.5">
          <span className="font-sans font-bold text-[15px] tracking-tight text-white">Calibration</span>
          <span className="font-mono text-[10px] text-[#5a5a64]">claimed vs delivered</span>
        </div>
        <span className="font-mono text-[10px] tabular-nums px-2 py-0.5 rounded border"
          style={{ color: accent, borderColor: `${accent}33`, background: `${accent}0d` }}>
          Brier {brier.toFixed(3)}
        </span>
      </div>

      <div className="p-5 flex flex-col lg:flex-row gap-6 items-center">
        {/* RELIABILITY DIAGRAM */}
        <div className="relative w-full max-w-[340px] shrink-0">
          <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="calGap" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
                <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="calCurve" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={VIOLET} />
                <stop offset="100%" stopColor={accent} />
              </linearGradient>
              <filter id="calGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3.2" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* grid */}
            {[0, 0.25, 0.5, 0.75, 1].map(g => (
              <g key={g}>
                <line x1={PAD} y1={py(g)} x2={PAD + PLOT} y2={py(g)} stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />
                <text x={PAD - 8} y={py(g) + 3} textAnchor="end" fontSize="8" fill="#4a4a54" fontFamily="monospace">{Math.round(g * 100)}</text>
              </g>
            ))}
            {[0.5, 0.625, 0.75, 0.875, 1].map(g => (
              <text key={g} x={px(g)} y={PAD + PLOT + 16} textAnchor="middle" fontSize="8" fill="#4a4a54" fontFamily="monospace">{Math.round(g * 100)}</text>
            ))}
            <text x={PAD + PLOT / 2} y={VB - 2} textAnchor="middle" fontSize="8" fill="#5a5a64" fontFamily="monospace" letterSpacing="2">CLAIMED CONFIDENCE →</text>
            <text x={11} y={PAD + PLOT / 2} textAnchor="middle" fontSize="8" fill="#5a5a64" fontFamily="monospace" letterSpacing="2" transform={`rotate(-90 11 ${PAD + PLOT / 2})`}>← ACTUALLY RIGHT</text>

            {/* perfect-calibration diagonal (the truth line) */}
            <motion.line
              x1={px(0.5)} y1={py(0.5)} x2={px(1)} y2={py(1)}
              stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="5 5"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: 'easeOut' }}
            />
            <text x={px(0.95)} y={py(0.95) - 6} fontSize="7.5" fill="#ffffff" fillOpacity="0.35" fontFamily="monospace">perfect</text>

            {/* honesty-gap area */}
            {gapArea && (
              <motion.path d={gapArea} fill="url(#calGap)"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }} />
            )}

            {/* delivered curve */}
            <motion.path d={realPath} fill="none" stroke="url(#calCurve)" strokeWidth="2.5" strokeLinecap="round"
              filter="url(#calGlow)"
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            />

            {/* bin markers: hollow node on the diagonal (claim) → filled glowing node (real) */}
            {rows.map((r, k) => {
              const cx = px(r.claim)
              const over = r.real < r.claim - 0.05
              const c = over ? RED : LIME
              const rad = 3 + Math.min(4, Math.sqrt(r.n)) // size ∝ sample count
              const active = hover === r.i
              return (
                <g key={r.i} onMouseEnter={() => setHover(r.i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
                  {/* connector claim→real */}
                  <motion.line x1={cx} y1={py(r.claim)} x2={cx} y2={py(r.real)}
                    stroke={c} strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="2 2"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 + k * 0.08 }} />
                  {/* claim node (hollow, on diagonal) */}
                  <circle cx={cx} cy={py(r.claim)} r="3" fill="#0a0a10" stroke="#6a6a78" strokeWidth="1.5" />
                  {/* real node (filled, glowing) */}
                  <motion.circle cx={cx} cy={py(r.real)} r={active ? rad + 2 : rad} fill={c}
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7 + k * 0.08, type: 'spring', stiffness: 300 }}
                    style={{ filter: `drop-shadow(0 0 ${active ? 8 : 5}px ${c})` }} />
                  {/* invisible fat hit-target */}
                  <circle cx={cx} cy={py(r.real)} r="14" fill="transparent" />
                </g>
              )
            })}

            {/* hover tooltip */}
            {hover !== null && (() => {
              const r = rows.find(x => x.i === hover)
              if (!r) return null
              const cx = px(r.claim), cy = py(r.real)
              const over = r.real < r.claim - 0.05
              const boxW = 96, boxH = 40
              const bx = Math.min(VB - boxW, Math.max(0, cx - boxW / 2))
              const by = cy > VB / 2 ? cy - boxH - 14 : cy + 14
              return (
                <g pointerEvents="none">
                  <rect x={bx} y={by} width={boxW} height={boxH} rx="6" fill="#0c0c14" stroke="#26263400" strokeWidth="1" style={{ filter: 'drop-shadow(0 4px 12px #000a)' }} />
                  <rect x={bx} y={by} width={boxW} height={boxH} rx="6" fill="none" stroke={over ? RED : LIME} strokeOpacity="0.4" />
                  <text x={bx + 8} y={by + 15} fontSize="8.5" fill="#8a8a94" fontFamily="monospace">said {Math.round(r.claim * 100)}%</text>
                  <text x={bx + 8} y={by + 27} fontSize="8.5" fill={over ? RED : LIME} fontFamily="monospace">right {Math.round(r.real * 100)}%</text>
                  <text x={bx + boxW - 8} y={by + 27} fontSize="8" fill="#5a5a64" fontFamily="monospace" textAnchor="end">{r.n} calls</text>
                </g>
              )
            })()}
          </svg>
        </div>

        {/* VERDICT */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center gap-2 mb-2">
            <motion.span className="w-2 h-2 rounded-full" style={{ background: accent }}
              animate={{ boxShadow: [`0 0 0px ${accent}`, `0 0 10px ${accent}`, `0 0 0px ${accent}`] }} transition={{ duration: 2, repeat: Infinity }} />
            <div className="font-sans font-black text-[20px] tracking-tight leading-tight" style={{ color: accent }}>
              {honest ? 'Keeps its word' : 'Talks bigger than it plays'}
            </div>
          </div>
          <p className="text-[13px] text-[#b4b4be] leading-relaxed m-0 mb-5">
            {honest
              ? 'When this bot sounds sure, it is right about as often as it claims. The delivered curve tracks the truth line.'
              : `When it sounds sure it is right ${deliversPct}% of the time — while claiming ${saysPct}%. The curve sags below the truth line: overconfidence.`}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: 'Claims', v: `${saysPct}%`, c: '#c9c9d2', sub: 'avg stated confidence' },
              { k: 'Delivers', v: `${deliversPct}%`, c: accent, sub: 'how often it is right' },
            ].map(m => (
              <div key={m.k} className="rounded-xl border border-[#161620] bg-[#08080c] p-3.5">
                <div className="font-mono text-[9px] text-[#5a5a64] tracking-[0.12em] uppercase mb-1.5">{m.k}</div>
                <div className="font-sans font-bold text-[22px] leading-none tabular-nums mb-1" style={{ color: m.c }}>{m.v}</div>
                <div className="font-mono text-[8px] text-[#3f3f48]">{m.sub}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 font-mono text-[10px] text-[#48484f]">
            <span>{n} resolved calls</span>
            <span className="text-[#26262e]">·</span>
            <span>dot size = sample count</span>
            <span className="text-[#26262e]">·</span>
            <span>hover a point</span>
          </div>
        </div>
      </div>
    </div>
  )
}
