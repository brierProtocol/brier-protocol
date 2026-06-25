'use client'

import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface Snapshot {
  cumulativePnl?: number | null
  pnlUsd?: number | null
  date?: string | null
  timestamp?: string | null
}

interface Props {
  snapshots: Snapshot[]
  winRate?: number | null
  sharpe?: number | null
  maxDrawdown?: number | null
  totalTrades?: number | null
  live?: boolean
}

// Brier palette — no teal/turquoise. Profit reads acid-lime, loss reads crimson.
const POS = '#c8ff00'
const NEG = '#ff3b3b'

// Fixed drawing space; the SVG scales to its container via viewBox.
const W = 720
const H = 200
const PAD = { t: 18, r: 14, b: 26, l: 52 }

const fmtMoney = (v: number) => {
  const a = Math.abs(v)
  const sign = v < 0 ? '-' : v > 0 ? '+' : ''
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(2)}M`
  if (a >= 1000) return `${sign}$${(a / 1000).toFixed(1)}K`
  return `${sign}$${Math.round(a)}`
}
const fmtDate = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// Catmull-Rom → cubic bezier, giving the smooth "didactic" curve Liveline draws.
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  return d
}

const Empty = () => <span className="text-[#333]">·</span>

export default function BotPerformance({ snapshots, winRate, sharpe, maxDrawdown, totalTrades, live }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const model = useMemo(() => {
    const raw = (snapshots || [])
      .map(s => ({ v: s.cumulativePnl ?? s.pnlUsd ?? null, t: s.date || s.timestamp || null }))
      .filter((s): s is { v: number; t: string | null } => typeof s.v === 'number')

    if (raw.length < 2) return null

    const values = raw.map(s => s.v)
    const base = Date.now() - raw.length * 86_400_000
    const times = raw.map((s, i) => (s.t ? new Date(s.t).getTime() : base + i * 86_400_000))

    const minV = Math.min(...values, 0)
    const maxV = Math.max(...values, 0)
    const range = maxV - minV || 1
    const innerW = W - PAD.l - PAD.r
    const innerH = H - PAD.t - PAD.b

    const pts = values.map((v, i) => ({
      x: PAD.l + (i / (values.length - 1)) * innerW,
      y: PAD.t + (1 - (v - minV) / range) * innerH,
      v,
      t: times[i],
    }))

    const zeroY = PAD.t + (1 - (0 - minV) / range) * innerH
    return { pts, minV, maxV, zeroY, first: values[0], last: values[values.length - 1] }
  }, [snapshots])

  const isUp = model ? model.last >= model.first : true
  const accent = isUp ? POS : NEG
  const changeAbs = model ? model.last - model.first : 0
  const changePct = model && model.first !== 0 ? (changeAbs / Math.abs(model.first)) * 100 : 0

  const line = model ? smoothPath(model.pts) : ''
  const area = model ? `${line} L ${model.pts[model.pts.length - 1].x},${H - PAD.b} L ${model.pts[0].x},${H - PAD.b} Z` : ''

  const yTicks = model ? Array.from(new Set([model.maxV, 0, model.minV])) : []
  const yOf = (v: number) => model ? PAD.t + (1 - (v - model.minV) / (model.maxV - model.minV || 1)) * (H - PAD.t - PAD.b) : 0

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!model || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * W
    let best = 0, bestD = Infinity
    model.pts.forEach((p, i) => { const d = Math.abs(p.x - x); if (d < bestD) { bestD = d; best = i } })
    setHoverIdx(best)
  }

  const active = model && hoverIdx != null ? model.pts[hoverIdx] : null

  const statCells = [
    { k: 'Win rate', v: winRate != null ? `${(winRate * 100).toFixed(1)}%` : null },
    { k: 'Sharpe', v: sharpe != null ? sharpe.toFixed(2) : null },
    { k: 'Max drawdown', v: maxDrawdown != null ? `-${(Math.abs(maxDrawdown) * 100).toFixed(1)}%` : null },
    { k: 'Resolved', v: totalTrades != null ? totalTrades.toLocaleString() : null },
  ]

  return (
    <div className="rounded-2xl border border-[#161620] bg-[#06060a] overflow-hidden">
      {/* header */}
      <div className="flex items-end justify-between px-5 pt-5 pb-3.5">
        <div>
          <div className="font-mono text-[10px] tracking-[0.24em] uppercase text-[#5a5a66] mb-2">Performance</div>
          <div className="flex items-baseline gap-3">
            <span className="font-sans font-black text-[34px] leading-none tracking-[-0.03em] tabular-nums" style={{ color: model ? accent : '#3a3a44' }}>
              {model ? fmtMoney(active ? active.v : model.last) : '—'}
            </span>
            {model && (
              <span className="font-mono text-[13px] font-bold tabular-nums" style={{ color: accent }}>
                {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="font-mono text-[10px] text-[#48484f] mt-1.5 tracking-wide">
            {active ? fmtDate(active.t) : 'cumulative P&L since inception'}
          </div>
        </div>
        {model && (
          <div className="text-right">
            <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-[#48484f] mb-1">Net</div>
            <div className="font-mono text-[15px] font-bold tabular-nums" style={{ color: accent }}>{fmtMoney(changeAbs)}</div>
          </div>
        )}
      </div>

      {/* chart */}
      {model ? (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full block"
          style={{ height: 200 }}
          preserveAspectRatio="none"
          onMouseMove={onMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="bp-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* y grid + labels */}
          {yTicks.map((v, i) => (
            <g key={i}>
              <line x1={PAD.l} y1={yOf(v)} x2={W - PAD.r} y2={yOf(v)} stroke={v === 0 ? '#ffffff18' : '#ffffff0a'} strokeWidth="1" strokeDasharray={v === 0 ? '0' : '3 5'} />
              <text x={PAD.l - 8} y={yOf(v) + 3} textAnchor="end" fill="#52525c" fontSize="10" fontFamily="monospace">{fmtMoney(v)}</text>
            </g>
          ))}

          {/* x labels */}
          {[0, Math.floor(model.pts.length / 2), model.pts.length - 1].map((idx, i) => (
            <text key={i} x={model.pts[idx].x} y={H - 8} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'} fill="#3f3f48" fontSize="9" fontFamily="monospace">
              {fmtDate(model.pts[idx].t)}
            </text>
          ))}

          {/* area + line */}
          <motion.path d={area} fill="url(#bp-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
          <motion.path
            d={line}
            fill="none"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: 'easeInOut' }}
            style={{ filter: `drop-shadow(0 0 6px ${accent}55)` }}
          />

          {/* end pulse dot */}
          {!active && (
            <>
              <motion.circle cx={model.pts[model.pts.length - 1].x} cy={model.pts[model.pts.length - 1].y} r="9" fill={accent} opacity="0.18"
                animate={{ r: [6, 13, 6], opacity: [0.25, 0, 0.25] }} transition={{ duration: 2.2, repeat: Infinity }} />
              <circle cx={model.pts[model.pts.length - 1].x} cy={model.pts[model.pts.length - 1].y} r="3.5" fill={accent} />
            </>
          )}

          {/* hover crosshair */}
          {active && (
            <g>
              <line x1={active.x} y1={PAD.t} x2={active.x} y2={H - PAD.b} stroke="#ffffff22" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={active.x} cy={active.y} r="4.5" fill={accent} stroke="#06060a" strokeWidth="2" />
            </g>
          )}
        </svg>
      ) : (
        <div className="grid place-items-center text-center px-6" style={{ height: 200 }}>
          <div>
            <div className="text-[13px] text-[#6a6a74] font-sans">The curve draws itself as predictions resolve.</div>
            <div className="text-[11px] text-[#3f3f48] font-mono mt-1.5">no settled P&L yet</div>
          </div>
        </div>
      )}

      {/* stats */}
      <div className="grid grid-cols-4 gap-px bg-[#13131b] border-t border-[#13131b]">
        {statCells.map(m => (
          <div key={m.k} className="bg-[#06060a] px-3.5 py-3">
            <div className="text-[#4a4a54] text-[9px] font-mono tracking-[0.14em] uppercase mb-1.5">{m.k}</div>
            <div className="font-sans font-bold text-[15px] tabular-nums text-[#f0f0f4]">{m.v ?? <Empty />}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
