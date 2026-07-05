'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// The reliability diagram: the single chart that proves a forecaster's
// probabilities mean what they say. For each confidence bucket we plot the
// bot's stated probability (x) against the frequency it was actually right (y).
// Points on the diagonal = perfectly calibrated. Below = overconfident. This is
// what a Brier score measures, made visible — and it is computed only from real
// resolved predictions, never mocked.

type Pred = { confidence: number; status?: string; outcome?: string }

const TEAL = '#c8ff00'
const VIOLET = '#8b7bff'
const RED = '#ff5570'
const MIN_SAMPLE = 8
const NB = 5

export default function CalibrationCurve({ predictions }: { predictions: Pred[] }) {
  const [info, setInfo] = useState(false)

  const resolved = (predictions || []).filter(p => {
    const s = p.status || p.outcome
    return s === 'WIN' || s === 'LOSS'
  })
  // Fold to the chosen side: "when the bot is c% sure of its pick, how often is
  // it right?" c always lives in [0.5, 1].
  const pts = resolved.map(p => {
    const raw = p.confidence ?? 0.5
    const c = raw > 0.5 ? raw : 1 - raw
    const o = (p.status || p.outcome) === 'WIN' ? 1 : 0
    return { c, o }
  })

  const n = pts.length
  const brier = n ? pts.reduce((a, { c, o }) => a + (c - o) ** 2, 0) / n : null
  const meanGap = n ? pts.reduce((a, { c, o }) => a + (o - c), 0) / n : 0 // >0 under-, <0 overconfident

  const bins = Array.from({ length: NB }, () => ({ sum: 0, win: 0, n: 0 }))
  for (const { c, o } of pts) {
    const idx = Math.min(NB - 1, Math.max(0, Math.floor(((c - 0.5) / 0.5) * NB)))
    bins[idx].sum += c; bins[idx].win += o; bins[idx].n++
  }
  const binPts = bins
    .map(b => (b.n > 0 ? { pred: b.sum / b.n, obs: b.win / b.n, n: b.n } : null))
    .filter(Boolean) as { pred: number; obs: number; n: number }[]

  // geometry (SVG, crisp at any size)
  const S = 260, pad = 30
  const px = (v: number) => pad + v * (S - 2 * pad)
  const py = (v: number) => (S - pad) - v * (S - 2 * pad)
  const maxN = Math.max(1, ...binPts.map(b => b.n))
  const r = (cnt: number) => 3 + Math.sqrt(cnt / maxN) * 6

  const verdict =
    n < MIN_SAMPLE ? { t: 'Accumulating', c: VIOLET }
    : Math.abs(meanGap) < 0.05 ? { t: 'Well calibrated', c: TEAL }
    : meanGap <= -0.05 ? { t: 'Overconfident', c: RED }
    : { t: 'Underconfident', c: VIOLET }

  return (
    <div className="rounded-2xl border border-[#1a1a1a] bg-[#080809] overflow-hidden">
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
              Each dot is a confidence bucket: the horizontal axis is how sure the bot said it was, the vertical axis is how often it was actually right. Dots on the dashed line are perfectly honest. Below the line means it talks a bigger game than it delivers. This is the Brier score, drawn.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {n < MIN_SAMPLE ? (
        <div className="px-5 py-12 text-center">
          <div className="text-[13px] text-[#6a6a74]">Calibration needs ~{MIN_SAMPLE} resolved predictions.</div>
          <div className="text-[11px] text-[#3f3f48] mt-1 font-mono">{n} settled so far</div>
        </div>
      ) : (
        <div className="p-5 flex flex-col sm:flex-row gap-5 items-center">
          <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[260px] shrink-0" role="img" aria-label="Calibration reliability diagram">
            {/* grid */}
            {[0.25, 0.5, 0.75].map(g => (
              <g key={g}>
                <line x1={px(g)} y1={py(0)} x2={px(g)} y2={py(1)} stroke="#141420" strokeWidth={1} />
                <line x1={px(0)} y1={py(g)} x2={px(1)} y2={py(g)} stroke="#141420" strokeWidth={1} />
              </g>
            ))}
            {/* frame */}
            <rect x={px(0)} y={py(1)} width={S - 2 * pad} height={S - 2 * pad} fill="none" stroke="#1e1e28" strokeWidth={1} />
            {/* perfect-calibration diagonal */}
            <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(1)} stroke="#39394a" strokeWidth={1.5} strokeDasharray="4 4" />
            {/* the bot's curve */}
            {binPts.length > 1 && (
              <motion.polyline
                fill="none" stroke={TEAL} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                points={binPts.map(b => `${px(b.pred)},${py(b.obs)}`).join(' ')}
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            )}
            {binPts.map((b, i) => (
              <motion.circle
                key={i} cx={px(b.pred)} cy={py(b.obs)} r={r(b.n)}
                fill={b.obs >= b.pred ? TEAL : RED} fillOpacity={0.9} stroke="#080809" strokeWidth={1.5}
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 260, damping: 18 }}
              >
                <title>{`Said ~${Math.round(b.pred * 100)}% · was right ${Math.round(b.obs * 100)}% · n=${b.n}`}</title>
              </motion.circle>
            ))}
            {/* axis ticks */}
            <text x={px(0.5)} y={S - 8} fill="#4a4a54" fontSize={9} fontFamily="monospace" textAnchor="middle">predicted →</text>
            <text x={10} y={py(0.5)} fill="#4a4a54" fontSize={9} fontFamily="monospace" textAnchor="middle" transform={`rotate(-90 10 ${py(0.5)})`}>observed →</text>
          </svg>

          <div className="flex-1 w-full grid grid-cols-3 sm:grid-cols-1 gap-3">
            <div>
              <div className="font-mono text-[9px] text-[#48484f] tracking-[0.14em] uppercase mb-1">Verdict</div>
              <div className="font-sans font-bold text-[15px]" style={{ color: verdict.c }}>{verdict.t}</div>
            </div>
            <div>
              <div className="font-mono text-[9px] text-[#48484f] tracking-[0.14em] uppercase mb-1">Brier</div>
              <div className="font-sans font-bold text-[15px] tabular-nums text-white">{brier!.toFixed(3)}</div>
              <div className="font-mono text-[9px] text-[#3f3f48] mt-0.5">0.25 = coin flip</div>
            </div>
            <div>
              <div className="font-mono text-[9px] text-[#48484f] tracking-[0.14em] uppercase mb-1">Sample</div>
              <div className="font-sans font-bold text-[15px] tabular-nums text-white">{n.toLocaleString()}</div>
              <div className="font-mono text-[9px] text-[#3f3f48] mt-0.5">resolved</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
