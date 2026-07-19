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
  title?: string
  subtitle?: string
  mode?: 'money' | 'score'
  info?: string
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

const fmtScore = (v: number) => {
  const sign = v < 0 ? '-' : v > 0 ? '+' : ''
  return `${sign}${Math.abs(v).toFixed(3)}`
}
const fmtDate = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// Linear path for precise, glitch-free financial rendering
function buildLinearPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  return `M ${pts[0].x},${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')
}

const Empty = () => <span className="text-[#333]">·</span>

export default function BotPerformance({ snapshots, winRate, sharpe, maxDrawdown, totalTrades, live, title = 'Performance', subtitle = 'cumulative P&L since inception', mode = 'money', info }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [showInfo, setShowInfo] = useState(false)

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

  const line = model ? buildLinearPath(model.pts) : ''
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

  return (
    <div className="rounded-2xl border border-[#1a1a24] bg-[#0a0a0f] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      {/* header */}
      <div className="flex items-end justify-between px-6 pt-6 pb-4 relative">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="font-sans font-bold text-[16px] tracking-tight text-[#e8e8e8]">{title}</div>
            {info && (
              <button 
                onClick={() => setShowInfo(!showInfo)}
                className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center text-[10px] font-bold font-mono transition-colors cursor-pointer ${showInfo ? 'bg-primary text-black border-primary' : 'bg-transparent text-[#6a6a74] border-[#2a2a34] hover:border-[#444] hover:text-white'}`}
                aria-label="What is this?"
              >
                ?
              </button>
            )}
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="font-sans font-black text-[42px] leading-none tracking-[-0.04em] tabular-nums" style={{ color: model ? accent : '#5a5a66' }}>
              {model ? (mode === 'money' ? fmtMoney(active ? active.v : model.last) : fmtScore(active ? active.v : model.last)) : (mode === 'money' ? '$0' : '0.000')}
            </span>
            {model && (
              <span className="font-mono text-[14px] font-bold tabular-nums px-2 py-0.5 rounded-md" style={{ color: accent, background: `${accent}14` }}>
                {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="font-mono text-[11px] text-[#6a6a74] mt-2 tracking-wide uppercase">
            {active ? fmtDate(active.t) : subtitle}
          </div>
        </div>
        {model && (
          <div className="text-right flex flex-col gap-1">
            <div className="font-mono text-[11px] tracking-[0.16em] uppercase text-[#6a6a74]">Net {mode === 'money' ? 'Profit' : 'Change'}</div>
            <div className="font-mono text-[18px] font-bold tabular-nums" style={{ color: accent }}>{mode === 'money' ? fmtMoney(changeAbs) : fmtScore(changeAbs)}</div>
          </div>
        )}
      </div>

      {/* info panel */}
      {showInfo && info && (
        <div className="px-5 pb-3">
          <div className="rounded-lg border-l-2 border-primary bg-[#0a0a0f] p-3 text-[12px] text-[#a6a6b0] leading-relaxed">
            {info}
          </div>
        </div>
      )}

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
              <text x={PAD.l - 8} y={yOf(v) + 3} textAnchor="end" fill="#52525c" fontSize="10" fontFamily="monospace">{mode === 'money' ? fmtMoney(v) : fmtScore(v)}</text>
            </g>
          ))}

          {/* x labels */}
          {[0, Math.floor(model.pts.length / 2), model.pts.length - 1].map((idx, i) => {
            const isLast = i === 2
            const dateStr = isLast ? 'Today' : fmtDate(model.pts[idx].t)
            return (
              <text key={i} x={model.pts[idx].x} y={H - 8} textAnchor={i === 0 ? 'start' : isLast ? 'end' : 'middle'} fill="#3f3f48" fontSize="9" fontFamily="monospace">
                {dateStr}
              </text>
            )
          })}

          {/* area + line */}
          <motion.path d={area} fill="url(#bp-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
          <motion.path
            d={line}
            fill="none"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            style={{ filter: `drop-shadow(0 0 6px ${accent}55)` }}
          />

          {/* end pulse dot */}
          {!active && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <motion.circle cx={model.pts[model.pts.length - 1].x} cy={model.pts[model.pts.length - 1].y} r="9" fill={accent} opacity="0.18"
                animate={{ r: [6, 13, 6], opacity: [0.25, 0, 0.25] }} transition={{ duration: 2.2, repeat: Infinity }} />
              <circle cx={model.pts[model.pts.length - 1].x} cy={model.pts[model.pts.length - 1].y} r="3.5" fill={accent} />
            </motion.g>
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
        // No settled P&L yet → show a FLAT baseline (starts at $0), not an empty box.
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" style={{ height: 200 }} preserveAspectRatio="none">
          <line x1={PAD.l} y1={H / 2} x2={W - PAD.r} y2={H / 2} stroke="#ffffff10" strokeWidth="1" strokeDasharray="3 5" />
          <line x1={PAD.l} y1={H / 2} x2={W - PAD.r} y2={H / 2} stroke="#3a3a44" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <motion.circle cx={W - PAD.r} cy={H / 2} r="9" fill="#5a5a66" opacity="0.18"
            animate={{ r: [6, 12, 6], opacity: [0.22, 0, 0.22] }} transition={{ duration: 2.4, repeat: Infinity }} />
          <circle cx={W - PAD.r} cy={H / 2} r="3.5" fill="#5a5a66" />
          <text x={PAD.l} y={H / 2 - 10} fill="#3f3f48" fontSize="10" fontFamily="monospace">the curve draws itself as predictions resolve</text>
        </svg>
      )}
    </div>
  )
}
