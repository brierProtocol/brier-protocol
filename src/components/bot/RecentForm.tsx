'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

// A form guide over the last resolved calls, tallest-recent on the right. Bar
// height = stated confidence, colour = win/loss. Hover any bar to read the exact
// call. Reads at a glance; shows the current streak. Real resolutions only.

type Pred = { confidence?: number; status?: string; outcome?: string; marketTitle?: string; timestamp?: string }

const TEAL = '#c8ff00'
const RED = '#ff5570'

const relDay = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

export default function RecentForm({ predictions }: { predictions: Pred[] }) {
  const [hover, setHover] = useState<number | null>(null)

  const resolved = (predictions || [])
    .filter(p => { const s = p.status || p.outcome; return s === 'WIN' || s === 'LOSS' })
    .slice(0, 30)
    .reverse()

  if (resolved.length < 3) return null

  const wins = resolved.filter(p => (p.status || p.outcome) === 'WIN').length
  const losses = resolved.length - wins
  const rate = wins / resolved.length

  let streak = 0, streakWin = false
  for (let i = resolved.length - 1; i >= 0; i--) {
    const w = (resolved[i].status || resolved[i].outcome) === 'WIN'
    if (i === resolved.length - 1) { streakWin = w; streak = 1; continue }
    if (w === streakWin) streak++; else break
  }

  const active = hover != null ? resolved[hover] : null
  const activeWin = active ? (active.status || active.outcome) === 'WIN' : false
  const activeConf = active?.confidence != null ? (active.confidence > 0.5 ? active.confidence : 1 - active.confidence) : 0.5

  return (
    <div className="rounded-2xl border border-[#1a1a1a] bg-[#080809] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#141414]">
        <div className="flex items-baseline gap-2.5">
          <span className="font-sans font-bold text-[15px] tracking-tight text-white">Recent form</span>
          <span className="font-mono text-[10px] text-[#5a5a64]">last {resolved.length} settled</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="tabular-nums" style={{ color: rate >= 0.5 ? TEAL : '#9a9a94' }}>{(rate * 100).toFixed(0)}% hit</span>
          <span className="tabular-nums px-2 py-0.5 rounded" style={{ color: streakWin ? TEAL : RED, background: `${streakWin ? TEAL : RED}12` }}>{streak}{streakWin ? 'W' : 'L'} streak</span>
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="flex items-end gap-[3px] h-16" onMouseLeave={() => setHover(null)}>
          {resolved.map((p, i) => {
            const w = (p.status || p.outcome) === 'WIN'
            const conf = p.confidence != null ? (p.confidence > 0.5 ? p.confidence : 1 - p.confidence) : 0.5
            const h = 22 + Math.round((conf - 0.5) * 2 * 42)
            const on = hover === i
            return (
              <motion.div
                key={i}
                className="flex-1 rounded-[2px] min-w-[4px] cursor-pointer"
                style={{ background: w ? TEAL : RED, opacity: hover == null ? (w ? 0.9 : 0.72) : on ? 1 : 0.35, boxShadow: on ? `0 0 12px ${w ? TEAL : RED}` : 'none' }}
                initial={{ height: 0 }}
                animate={{ height: Math.max(10, Math.min(58, h)) }}
                transition={{ delay: i * 0.02, duration: 0.4, ease: 'easeOut' }}
                onMouseEnter={() => setHover(i)}
              />
            )
          })}
        </div>

        {/* hover detail / legend */}
        <div className="mt-3 min-h-[34px]">
          {active ? (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: activeWin ? TEAL : RED, background: `${activeWin ? TEAL : RED}14` }}>{activeWin ? 'WIN' : 'LOSS'}</span>
              <span className="flex-1 min-w-0 text-[12px] text-[#bbb] truncate">{active.marketTitle || 'market'}</span>
              <span className="font-mono text-[10px] text-[#777] tabular-nums shrink-0">{Math.round(activeConf * 100)}% · {relDay(active.timestamp)}</span>
            </motion.div>
          ) : (
            <div className="flex items-center justify-between font-mono text-[10px] text-[#48484f]">
              <span>bar height = stated confidence · hover to inspect</span>
              <span className="tabular-nums"><span style={{ color: TEAL }}>{wins}W</span> · <span style={{ color: RED }}>{losses}L</span></span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
