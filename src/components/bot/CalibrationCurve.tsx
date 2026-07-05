'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// The reliability diagram: the one chart that proves a forecaster's probabilities
// mean what they say. Per confidence bucket we plot stated probability (x) vs the
// frequency it was actually right (y). On the diagonal = perfectly honest, below =
// overconfident. A count histogram underneath shows where the sample actually is,
// so a lucky point built on 2 predictions can't masquerade as skill. Real resolved
// predictions only — never mocked.

type Pred = { confidence: number; status?: string; outcome?: string }

const TEAL = '#c8ff00'
const VIOLET = '#8b7bff'
const RED = '#ff5570'
const MIN_SAMPLE = 8
const NB = 6

export default function CalibrationCurve({ predictions }: { predictions: Pred[] }) {
  const [info, setInfo] = useState(false)

  const resolved = (predictions || []).filter(p => {
    const s = p.status || p.outcome
    return s === 'WIN' || s === 'LOSS'
  })
  const pts = resolved.map(p => {
    const raw = p.confidence ?? 0.5
    const c = raw > 0.5 ? raw : 1 - raw // chosen-side confidence, always [0.5,1]
    const o = (p.status || p.outcome) === 'WIN' ? 1 : 0
    return { c, o }
  })

  const n = pts.length
  const brier = n ? pts.reduce((a, { c, o }) => a + (c - o) ** 2, 0) / n : null
  const meanGap = n ? pts.reduce((a, { c, o }) => a + (o - c), 0) / n : 0

  const bins = Array.from({ length: NB }, () => ({ sum: 0, win: 0, n: 0 }))
  for (const { c, o } of pts) {
    const idx = Math.min(NB - 1, Math.max(0, Math.floor(((c - 0.5) / 0.5) * NB)))
    bins[idx].sum += c; bins[idx].win += o; bins[idx].n++
  }
  const binPts = bins
    .map((b, i) => (b.n > 0 ? { pred: b.sum / b.n, obs: b.win / b.n, n: b.n, bin: i } : null))
    .filter(Boolean) as { pred: number; obs: number; n: number; bin: number }[]

  // geometry
  const W = 340, plotY0 = 246, plotY1 = 20, x0 = 40, x1 = 322
  const histY0 = 300, histY1 = 264
  const px = (v: number) => x0 + v * (x1 - x0)
  const py = (v: number) => plotY0 - v * (plotY0 - plotY1)
  const maxN = Math.max(1, ...binPts.map(b => b.n))
  const r = (cnt: number) => 3.5 + Math.sqrt(cnt / maxN) * 7

  const verdict =
    n < MIN_SAMPLE ? { t: 'Accumulating', c: VIOLET }
    : Math.abs(meanGap) < 0.05 ? { t: 'Well calibrated', c: TEAL }
    : meanGap <= -0.05 ? { t: 'Overconfident', c: RED }
    : { t: 'Underconfident', c: VIOLET }

  // area polygon between curve and diagonal (visualizes the miscalibration gap)
  const gapArea = binPts.length > 1
    ? [
        ...binPts.map(b => `${px(b.pred)},${py(b.obs)}`),
        ...[...binPts].reverse().map(b => `${px(b.pred)},${py(b.pred)}`),
      ].join(' ')
    : ''

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
              Each dot is a confidence bucket: the x axis is how sure the bot said it was, the y axis is how often it was actually right. Dots on the dashed line are perfectly honest; below means it talks a bigger game than it delivers. The bars underneath show how many predictions sit in each bucket — a dot built on a handful of calls is luck, not skill. This is the Brier score, drawn.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* always-visible plain-language one-liner */}
      <div className="px-5 py-2.5 border-b border-[#141414] text-[12px] text-[#8a8a94] leading-relaxed">
        When it says <span className="text-white font-semibold">70%</span>, it should come true about <span className="text-white font-semibold">70%</span> of the time. Dots on the line are honest — below the line, it overclaims.
      </div>

      {n < MIN_SAMPLE ? (
        <div className="px-5 py-14 text-center">
          <div className="text-[13px] text-[#6a6a74]">Calibration needs ~{MIN_SAMPLE} resolved predictions.</div>
          <div className="text-[11px] text-[#3f3f48] mt-1 font-mono">{n} settled so far</div>
        </div>
      ) : (
        <div className="p-5">
        <div className="flex flex-col lg:flex-row gap-5 items-center">
          <svg viewBox={`0 0 ${W} 320`} className="w-full max-w-[400px] shrink-0" role="img" aria-label="Calibration reliability diagram">
            <defs>
              <linearGradient id="cal-glow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TEAL} stopOpacity={0.28} />
                <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
              </linearGradient>
              <filter id="cal-blur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" />
              </filter>
            </defs>

            {/* grid + axis labels */}
            {[0, 0.5, 1].map(g => (
              <g key={g}>
                <line x1={px(g)} y1={plotY0} x2={px(g)} y2={plotY1} stroke="#141420" strokeWidth={1} />
                <line x1={x0} y1={py(g)} x2={x1} y2={py(g)} stroke="#141420" strokeWidth={1} />
                <text x={x0 - 6} y={py(g) + 3} fill="#3f3f48" fontSize={9} fontFamily="monospace" textAnchor="end">{Math.round(g * 100)}</text>
                <text x={px(g)} y={plotY0 + 13} fill="#3f3f48" fontSize={9} fontFamily="monospace" textAnchor="middle">{Math.round(g * 100)}</text>
              </g>
            ))}
            <rect x={x0} y={plotY1} width={x1 - x0} height={plotY0 - plotY1} fill="none" stroke="#1e1e28" strokeWidth={1} />

            {/* miscalibration gap band */}
            {gapArea && (
              <motion.polygon points={gapArea} fill={meanGap >= 0 ? TEAL : RED} fillOpacity={0.08}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.6 }} />
            )}

            {/* perfect-calibration diagonal */}
            <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(1)} stroke="#39394a" strokeWidth={1.5} strokeDasharray="4 4" />
            <text x={px(0.74)} y={py(0.74) - 7} fill="#52526a" fontSize={8.5} fontFamily="monospace" textAnchor="middle" transform={`rotate(-45 ${px(0.74)} ${py(0.74)})`}>perfect honesty</text>

            {/* the bot's curve — glow + line */}
            {binPts.length > 1 && (
              <>
                <motion.polyline fill="none" stroke={TEAL} strokeWidth={5} strokeOpacity={0.35} filter="url(#cal-blur)"
                  points={binPts.map(b => `${px(b.pred)},${py(b.obs)}`).join(' ')}
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: 'easeOut' }} />
                <motion.polyline fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                  points={binPts.map(b => `${px(b.pred)},${py(b.obs)}`).join(' ')}
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: 'easeOut' }} />
              </>
            )}
            {binPts.map((b, i) => (
              <motion.circle key={i} cx={px(b.pred)} cy={py(b.obs)} r={r(b.n)}
                fill={b.obs >= b.pred ? TEAL : RED} fillOpacity={0.92} stroke="#080809" strokeWidth={1.5}
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 + i * 0.08, type: 'spring', stiffness: 240, damping: 16 }}>
                <title>{`Said ~${Math.round(b.pred * 100)}% · was right ${Math.round(b.obs * 100)}% · n=${b.n}`}</title>
              </motion.circle>
            ))}

            {/* sample histogram */}
            {bins.map((b, i) => {
              const bw = (x1 - x0) / NB
              const bx = x0 + i * bw
              const h = (b.n / maxN) * (histY0 - histY1)
              return (
                <motion.rect key={i} x={bx + 2} width={bw - 4} y={histY0 - h} height={h}
                  fill={VIOLET} fillOpacity={0.55} rx={1}
                  initial={{ height: 0, y: histY0 }} animate={{ height: h, y: histY0 - h }} transition={{ delay: 0.5 + i * 0.05, duration: 0.4 }}>
                  <title>{`${b.n} prediction${b.n === 1 ? '' : 's'} in this bucket`}</title>
                </motion.rect>
              )
            })}
            <text x={x0} y={318} fill="#3f3f48" fontSize={8.5} fontFamily="monospace">sample per bucket →</text>
            <text x={(x0 + x1) / 2} y={plotY0 + 24} fill="#4a4a54" fontSize={9} fontFamily="monospace" textAnchor="middle">stated confidence %</text>
            <text x={12} y={(plotY0 + plotY1) / 2} fill="#4a4a54" fontSize={9} fontFamily="monospace" textAnchor="middle" transform={`rotate(-90 12 ${(plotY0 + plotY1) / 2})`}>actually right %</text>
          </svg>

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
        {/* legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[9px] text-[#5a5a64]">
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: TEAL }} /> delivers ≥ it claims</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: RED }} /> overclaims</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3.5 border-t border-dashed align-middle" style={{ borderColor: '#4a4a5a' }} /> perfect honesty</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-[1px]" style={{ background: VIOLET }} /> calls per bucket</span>
        </div>
        </div>
      )}
    </div>
  )
}
