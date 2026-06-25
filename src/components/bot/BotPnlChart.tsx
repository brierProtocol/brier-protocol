'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface Snapshot {
  cumulativePnl?: number | null
  pnlUsd?: number | null
  timestamp?: string | null
}

interface Props {
  snapshots: Snapshot[]
  winRate?: number | null
  sharpe?: number | null
  maxDrawdown?: number | null
  totalTrades?: number | null
}

const W = 440
const H = 110
const PAD = { t: 10, r: 8, b: 18, l: 46 }

function buildPath(pts: [number, number][], close: boolean): string {
  if (pts.length < 2) return ''
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  if (!close) return d
  return `${d} L${pts[pts.length - 1][0].toFixed(1)},${(H - PAD.b).toFixed(1)} L${pts[0][0].toFixed(1)},${(H - PAD.b).toFixed(1)} Z`
}

const Empty = () => <span className="text-[#333]">·</span>

export default function BotPnlChart({ snapshots, winRate, sharpe, maxDrawdown, totalTrades }: Props) {
  const values = useMemo(
    () => snapshots
      .map(s => s.cumulativePnl ?? s.pnlUsd ?? null)
      .filter((v): v is number => typeof v === 'number'),
    [snapshots]
  )

  const pts = useMemo<[number, number][]>(() => {
    if (values.length < 2) return []
    const minV = Math.min(...values)
    const maxV = Math.max(...values)
    const range = maxV - minV || 1
    const xStep = (W - PAD.l - PAD.r) / (values.length - 1)
    return values.map((v, i) => [
      PAD.l + i * xStep,
      PAD.t + ((maxV - v) / range) * (H - PAD.t - PAD.b),
    ])
  }, [values])

  const first = values[0] ?? 0
  const last = values[values.length - 1] ?? 0
  const isUp = last >= first
  const lineColor = isUp ? '#00d4aa' : '#ff5570'
  const changePct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0

  const minV = values.length ? Math.min(...values) : 0
  const maxV = values.length ? Math.max(...values) : 0
  const range = maxV - minV || 1

  const yLabel = (v: number) => {
    const abs = Math.abs(v)
    const sign = v >= 0 ? '' : '-'
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}K`
    return `${sign}$${Math.round(abs)}`
  }
  const absChange = Math.abs(last - first)
  const changeStr = absChange >= 1000
    ? `${isUp ? '+' : '-'}$${(absChange / 1000).toFixed(1)}K`
    : `${isUp ? '+' : '-'}$${Math.round(absChange)}`

  const rawLabels = [maxV, ...(minV < 0 && maxV > 0 ? [0] : []), minV]
  const yLabelValues = rawLabels.filter((v, i) => rawLabels.indexOf(v) === i)

  const gradId = `pnl-grad-${isUp ? 'up' : 'dn'}`

  return (
    <div className="rounded-2xl border border-[#1a1a1a] bg-[#070708] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#141414] flex items-center justify-between">
        <span className="font-sans font-bold text-[14px]">Performance</span>
        {values.length > 1 && (
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-[#666]">{changeStr}</span>
            <span className={`font-mono text-[13px] font-bold tabular-nums ${isUp ? 'text-[#00d4aa]' : 'text-[#ff5570]'}`}>
              {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {values.length < 2 ? (
        <div className="px-5 py-10 text-center text-[13px] text-[#555]">
          Chart fills as predictions resolve.
        </div>
      ) : (
        <div className="px-4 pt-3 pb-0">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.22" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {minV < 0 && maxV > 0 && (
              <line
                x1={PAD.l} y1={PAD.t + (maxV / range) * (H - PAD.t - PAD.b)}
                x2={W - PAD.r} y2={PAD.t + (maxV / range) * (H - PAD.t - PAD.b)}
                stroke="#ffffff12" strokeDasharray="3 3"
              />
            )}

            {yLabelValues.map((v, i) => {
              const y = PAD.t + ((maxV - v) / range) * (H - PAD.t - PAD.b)
              return (
                <text key={i} x={PAD.l - 4} y={y + 3.5} textAnchor="end" fill="#484848" fontSize="8" fontFamily="monospace">
                  {yLabel(v)}
                </text>
              )
            })}

            <motion.path
              d={buildPath(pts, true)}
              fill={`url(#${gradId})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            />

            <motion.path
              d={buildPath(pts, false)}
              fill="none"
              stroke={lineColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
            />

            {pts.length > 0 && (
              <motion.circle
                cx={pts[pts.length - 1][0]}
                cy={pts[pts.length - 1][1]}
                r="3.5"
                fill={lineColor}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              />
            )}
          </svg>
        </div>
      )}

      <div className="grid grid-cols-4 gap-px bg-[#141414] border-t border-[#141414]">
        {[
          { k: 'Win rate', v: winRate != null ? `${(winRate * 100).toFixed(1)}%` : null },
          { k: 'Sharpe', v: sharpe != null ? sharpe.toFixed(2) : null },
          { k: 'Drawdown', v: maxDrawdown != null ? `-${(Math.abs(maxDrawdown) * 100).toFixed(1)}%` : null },
          { k: 'Resolved', v: totalTrades != null ? totalTrades.toLocaleString() : null },
        ].map(m => (
          <div key={m.k} className="bg-[#070708] px-3 py-2.5">
            <div className="text-[#555] text-[9px] font-mono tracking-widest mb-1 uppercase">{m.k}</div>
            <div className="font-mono font-bold text-[13px] tabular-nums text-white">{m.v ?? <Empty />}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
