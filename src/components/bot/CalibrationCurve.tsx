'use client'

import { motion } from 'framer-motion'

// Honesty as a grouped bar chart — the most universally readable graph. For each
// confidence level the bot uses, two bars side by side: what it CLAIMED vs what it
// actually DELIVERED. When the delivered bar is shorter than the claimed one, it
// overpromised (bar turns red). Real resolved predictions only.

type Pred = { confidence: number; status?: string; outcome?: string }

const TEAL = '#c8ff00'
const RED = '#ff5570'
const GHOST = '#3a3a46'
const MIN_SAMPLE = 8
const NB = 6

export default function CalibrationCurve({ predictions }: { predictions: Pred[] }) {
  const resolved = (predictions || []).filter(p => { const s = p.status || p.outcome; return s === 'WIN' || s === 'LOSS' })
  const pts = resolved.map(p => { const raw = p.confidence ?? 0.5; return { c: raw > 0.5 ? raw : 1 - raw, o: (p.status || p.outcome) === 'WIN' ? 1 : 0 } })
  const n = pts.length

  const brier = n ? pts.reduce((a, { c, o }) => a + (c - o) ** 2, 0) / n : 0
  const saysAvg = n ? Math.round((pts.reduce((a, { c }) => a + c, 0) / n) * 100) : 0
  const realAvg = n ? Math.round((pts.reduce((a, { o }) => a + o, 0) / n) * 100) : 0
  const honest = saysAvg - realAvg <= 5

  const bins = Array.from({ length: NB }, () => ({ sum: 0, win: 0, n: 0 }))
  for (const { c, o } of pts) { const i = Math.min(NB - 1, Math.max(0, Math.floor(((c - 0.5) / 0.5) * NB))); bins[i].sum += c; bins[i].win += o; bins[i].n++ }
  const groups = bins
    .map(b => b.n > 0 ? { claimed: Math.round((b.sum / b.n) * 100), delivered: Math.round((b.win / b.n) * 100), n: b.n } : null)
    .filter(Boolean) as { claimed: number; delivered: number; n: number }[]

  // chart geometry
  const W = 360, H = 220, padL = 30, padB = 34, padT = 12, padR = 8
  const plotW = W - padL - padR, plotH = H - padT - padB
  const y = (v: number) => padT + (1 - v / 100) * plotH
  const gw = groups.length ? plotW / groups.length : plotW // group slot width
  const bw = Math.min(26, gw * 0.32) // bar width

  return (
    <div className="rounded-2xl border border-[#1a1a1a] bg-gradient-to-b from-[#0b0b11] to-[#070709] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#141414]">
        <div className="flex items-baseline gap-2.5">
          <span className="font-sans font-bold text-[15px] tracking-tight text-white">Honesty check</span>
          <span className="font-mono text-[10px] text-[#5a5a64]">claimed vs delivered, by confidence</span>
        </div>
      </div>

      {n < MIN_SAMPLE ? (
        <div className="px-5 py-16 text-center">
          <div className="text-[13px] text-[#6a6a74]">Needs ~{MIN_SAMPLE} resolved predictions to chart honesty.</div>
          <div className="text-[11px] text-[#3f3f48] mt-1 font-mono">{n} settled so far</div>
        </div>
      ) : (
        <div className="p-5">
          {/* one-liner */}
          <p className="text-[12px] text-[#8a8a94] leading-relaxed m-0 mb-3">
            {honest
              ? <>It delivers about what it claims. <span className="text-white font-semibold">Honest.</span></>
              : <>It claims <span className="text-white font-semibold">{saysAvg}%</span> on average but delivers <span className="font-semibold" style={{ color: RED }}>{realAvg}%</span>. It overpromises.</>}
          </p>

          {/* grouped bar chart */}
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Claimed vs delivered by confidence level">
            {/* y gridlines + labels */}
            {[0, 25, 50, 75, 100].map(g => (
              <g key={g}>
                <line x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke="#16161f" strokeWidth={1} />
                <text x={padL - 6} y={y(g) + 3} textAnchor="end" fill="#3f3f48" fontSize={8.5} fontFamily="monospace">{g}</text>
              </g>
            ))}

            {groups.map((grp, i) => {
              const cx = padL + i * gw + gw / 2
              const over = grp.delivered < grp.claimed - 1
              const dColor = over ? RED : TEAL
              const gap = 5
              const x1 = cx - bw - gap / 2 // claimed bar x
              const x2 = cx + gap / 2       // delivered bar x
              return (
                <g key={i}>
                  {/* claimed (ghost outline) */}
                  <motion.rect x={x1} width={bw} rx={2} fill={GHOST} fillOpacity={0.5}
                    initial={{ y: y(0), height: 0 }} animate={{ y: y(grp.claimed), height: plotH - (y(grp.claimed) - padT) }}
                    transition={{ delay: 0.15 + i * 0.08, duration: 0.6, ease: 'easeOut' }} />
                  {/* delivered (solid, colored) */}
                  <motion.rect x={x2} width={bw} rx={2} fill={dColor} style={{ filter: `drop-shadow(0 0 5px ${dColor}55)` }}
                    initial={{ y: y(0), height: 0 }} animate={{ y: y(grp.delivered), height: plotH - (y(grp.delivered) - padT) }}
                    transition={{ delay: 0.25 + i * 0.08, duration: 0.6, ease: 'easeOut' }} />
                  {/* delivered value label */}
                  <motion.text x={x2 + bw / 2} y={y(grp.delivered) - 4} textAnchor="middle" fill={dColor} fontSize={9} fontWeight={700} fontFamily="monospace"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 + i * 0.08 }}>{grp.delivered}</motion.text>
                  {/* x label = claimed confidence bucket */}
                  <text x={cx} y={H - padB + 14} textAnchor="middle" fill="#7a7a84" fontSize={9} fontFamily="monospace">{grp.claimed}%</text>
                  <text x={cx} y={H - padB + 25} textAnchor="middle" fill="#3f3f48" fontSize={7.5} fontFamily="monospace">n={grp.n}</text>
                </g>
              )
            })}
            <text x={padL} y={H - 2} fill="#3f3f48" fontSize={8} fontFamily="monospace">↑ % · x = what it claimed</text>
          </svg>

          {/* legend + summary */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-4 font-mono text-[10px] text-[#5a5a64]">
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: GHOST }} /> claimed</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: TEAL }} /> delivered</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: RED }} /> fell short</span>
            </div>
            <div className="font-mono text-[10px] text-[#5a5a64]">Brier <span className="text-white font-bold tabular-nums">{brier.toFixed(3)}</span> · {n} calls</div>
          </div>
        </div>
      )}
    </div>
  )
}
