'use client'

import { motion } from 'framer-motion'

/**
 * Reliability diagram — the chart that IS Brier's thesis. Buckets the bot's
 * resolved calls by stated confidence and plots how often each bucket actually
 * won. A perfectly calibrated forecaster lands on the diagonal: when it says
 * 70%, it wins 70% of the time. Above the line = underconfident, below =
 * overconfident. Built purely from the bot's own resolved predictions.
 */
export default function CalibrationCurve({
  predictions, accent = '#c8ff00',
}: {
  predictions: Array<{ confidence?: number; status?: string; outcome?: string }>
  accent?: string
}) {
  // Bucket resolved calls into confidence deciles (in the CHOSEN-side frame,
  // which is how confidence is stored — always the probability of its pick).
  const resolved = predictions.filter(p => {
    const st = p.status || p.outcome
    return (st === 'WIN' || st === 'LOSS') && typeof p.confidence === 'number'
  })

  const buckets: { n: number; wins: number; sumConf: number }[] =
    Array.from({ length: 10 }, () => ({ n: 0, wins: 0, sumConf: 0 }))
  for (const p of resolved) {
    const c = Math.max(0, Math.min(0.999, p.confidence as number))
    const b = buckets[Math.floor(c * 10)]
    b.n++
    b.sumConf += c
    if ((p.status || p.outcome) === 'WIN') b.wins++
  }
  const points = buckets
    .map(b => (b.n > 0 ? { x: b.sumConf / b.n, y: b.wins / b.n, n: b.n } : null))
    .filter((p): p is { x: number; y: number; n: number } => p !== null)

  if (resolved.length < 10 || points.length < 2) {
    return (
      <div className="rounded-lg border border-[#141420] bg-[#08080c] px-4 py-3 font-mono text-[10px] text-[#5a5a64] leading-relaxed">
        The calibration curve appears after ~10 resolved calls. It will show whether this bot means it when it says 70%.
      </div>
    )
  }

  const W = 300, H = 190, PAD = 30
  const sx = (v: number) => PAD + v * (W - PAD - 12)
  const sy = (v: number) => H - PAD + v * -(H - PAD - 12)
  const maxN = Math.max(...points.map(p => p.n))

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none">
        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(v => (
          <g key={v}>
            <line x1={sx(v)} y1={sy(0)} x2={sx(v)} y2={sy(1)} stroke="#ffffff" strokeOpacity="0.05" strokeWidth="0.6" />
            <line x1={sx(0)} y1={sy(v)} x2={sx(1)} y2={sy(v)} stroke="#ffffff" strokeOpacity="0.05" strokeWidth="0.6" />
          </g>
        ))}
        {/* axis labels */}
        {[0, 0.5, 1].map(v => (
          <g key={v} fontSize="7.5" fontFamily="monospace" fill="#5a5a64">
            <text x={sx(v)} y={H - PAD + 14} textAnchor="middle">{Math.round(v * 100)}%</text>
            <text x={PAD - 6} y={sy(v) + 2.5} textAnchor="end">{Math.round(v * 100)}%</text>
          </g>
        ))}
        <text x={sx(0.5)} y={H - 4} textAnchor="middle" fontSize="7.5" fontFamily="monospace" fill="#3f3f48" letterSpacing="0.12em">SAID</text>
        <text x={8} y={sy(0.5)} textAnchor="middle" fontSize="7.5" fontFamily="monospace" fill="#3f3f48" letterSpacing="0.12em" transform={`rotate(-90 8 ${sy(0.5)})`}>HAPPENED</text>

        {/* the truth line — perfect calibration */}
        <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1" strokeDasharray="3 4" />

        {/* the bot's actual reliability — dot size = evidence in the bucket */}
        <motion.polyline
          points={points.map(p => `${sx(p.x)},${sy(p.y)}`).join(' ')}
          fill="none" stroke={accent} strokeWidth="1.4" strokeOpacity="0.6"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={sx(p.x)} cy={sy(p.y)} r={3 + (p.n / maxN) * 4.5}
            fill={accent} fillOpacity="0.85" stroke="#060608" strokeWidth="1.4"
            initial={{ scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
            transition={{ delay: 0.15 + i * 0.07, type: 'spring', stiffness: 240, damping: 16 }}
          >
            <title>{`said ${Math.round(p.x * 100)}% · happened ${Math.round(p.y * 100)}% · ${p.n} calls`}</title>
          </motion.circle>
        ))}
      </svg>
      <div className="font-mono text-[9.5px] text-[#5a5a64] leading-relaxed mt-1">
        Dots on the dashed line = the bot means what it says. Above it, underconfident. Below it, overconfident. Dot size = calls in that bucket.
      </div>
    </div>
  )
}
