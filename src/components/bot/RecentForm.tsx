'use client'

import { motion } from 'framer-motion'

// A football-style form guide over the last resolved predictions: each bar is
// one settled call, tallest-recent on the right. Reads at a glance and shows the
// current streak. Real resolutions only.

type Pred = { confidence?: number; status?: string; outcome?: string; marketTitle?: string; timestamp?: string }

const TEAL = '#c8ff00'
const RED = '#ff5570'

export default function RecentForm({ predictions }: { predictions: Pred[] }) {
  const resolved = (predictions || [])
    .filter(p => { const s = p.status || p.outcome; return s === 'WIN' || s === 'LOSS' })
    .slice(0, 30)
    .reverse() // oldest → newest (left → right)

  if (resolved.length < 3) return null

  const wins = resolved.filter(p => (p.status || p.outcome) === 'WIN').length
  const rate = wins / resolved.length

  // current streak (from the newest end)
  let streak = 0
  let streakWin = false
  for (let i = resolved.length - 1; i >= 0; i--) {
    const w = (resolved[i].status || resolved[i].outcome) === 'WIN'
    if (i === resolved.length - 1) { streakWin = w; streak = 1; continue }
    if (w === streakWin) streak++
    else break
  }

  return (
    <div className="rounded-2xl border border-[#1a1a1a] bg-[#080809] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#141414]">
        <div className="flex items-baseline gap-2.5">
          <span className="font-sans font-bold text-[15px] tracking-tight text-white">Recent form</span>
          <span className="font-mono text-[10px] text-[#5a5a64]">last {resolved.length} settled</span>
        </div>
        <span className="font-mono text-[11px] tabular-nums" style={{ color: streakWin ? TEAL : RED }}>
          {streak}{streakWin ? 'W' : 'L'} streak
        </span>
      </div>
      <div className="px-5 py-4">
        <div className="flex items-end gap-[3px] h-12">
          {resolved.map((p, i) => {
            const w = (p.status || p.outcome) === 'WIN'
            const conf = p.confidence != null ? (p.confidence > 0.5 ? p.confidence : 1 - p.confidence) : 0.5
            const h = 40 + Math.round((conf - 0.5) * 2 * 32) // taller = more confident
            return (
              <motion.div
                key={i}
                className="flex-1 rounded-[2px] min-w-[3px]"
                style={{ background: w ? TEAL : RED, opacity: w ? 0.9 : 0.75 }}
                initial={{ height: 0 }}
                animate={{ height: Math.max(8, Math.min(48, h)) }}
                transition={{ delay: i * 0.02, duration: 0.4, ease: 'easeOut' }}
                title={`${p.marketTitle || 'market'} · ${Math.round(conf * 100)}% · ${w ? 'WIN' : 'LOSS'}`}
              />
            )
          })}
        </div>
        <div className="flex items-center justify-between mt-3 font-mono text-[10px]">
          <span className="text-[#48484f]">bar height = stated confidence</span>
          <span className="tabular-nums" style={{ color: rate >= 0.5 ? TEAL : '#9a9a94' }}>{(rate * 100).toFixed(0)}% hit rate</span>
        </div>
      </div>
    </div>
  )
}
