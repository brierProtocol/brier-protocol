'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Honesty as METRICS + a graph, no letter grade. A row of live metric tiles
// (claims, delivers, edge, sample) sits above a promise→reality graph: per
// confidence bucket, a hollow ring marks the promise and a glowing dot slides to
// where reality landed, the gap coloured red when it overclaims. Real data only.

type Pred = { confidence: number; status?: string; outcome?: string }

const TEAL = '#c8ff00'
const RED = '#ff5570'
const VIOLET = '#8b7bff'
const MIN_SAMPLE = 8
const NB = 6

export default function CalibrationCurve({ predictions }: { predictions: Pred[] }) {
  const [info, setInfo] = useState(false)

  const resolved = (predictions || []).filter(p => { const s = p.status || p.outcome; return s === 'WIN' || s === 'LOSS' })
  const pts = resolved.map(p => { const raw = p.confidence ?? 0.5; return { c: raw > 0.5 ? raw : 1 - raw, o: (p.status || p.outcome) === 'WIN' ? 1 : 0 } })
  const n = pts.length

  const brier = n ? pts.reduce((a, { c, o }) => a + (c - o) ** 2, 0) / n : 0
  const saysPct = n ? Math.round((pts.reduce((a, { c }) => a + c, 0) / n) * 100) : 0
  const deliversPct = n ? Math.round((pts.reduce((a, { o }) => a + o, 0) / n) * 100) : 0
  const gap = saysPct - deliversPct
  const honest = gap <= 5
  const accent = honest ? TEAL : RED

  const bins = Array.from({ length: NB }, () => ({ sum: 0, win: 0, n: 0 }))
  for (const { c, o } of pts) { const i = Math.min(NB - 1, Math.max(0, Math.floor(((c - 0.5) / 0.5) * NB))); bins[i].sum += c; bins[i].win += o; bins[i].n++ }
  const rows = bins.map(b => b.n > 0 ? { said: Math.round((b.sum / b.n) * 100), real: Math.round((b.win / b.n) * 100), n: b.n } : null).filter(Boolean) as { said: number; real: number; n: number }[]
  const maxN = Math.max(1, ...rows.map(r => r.n))

  const metrics = [
    { k: 'Claims', v: `${saysPct}%`, sub: 'avg confidence', c: '#e8e8e8' },
    { k: 'Delivers', v: `${deliversPct}%`, sub: 'actually right', c: accent },
    { k: 'Gap', v: `${gap > 0 ? '−' : '+'}${Math.abs(gap)}`, sub: honest ? 'keeps its word' : 'overclaims', c: accent },
    { k: 'Brier', v: brier.toFixed(3), sub: '0.25 = coin flip', c: brier <= 0.25 ? TEAL : RED },
  ]

  return (
    <div className="rounded-2xl border border-[#1a1a1a] bg-gradient-to-b from-[#0b0b11] to-[#070709] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#141414]">
        <div className="flex items-baseline gap-2.5">
          <span className="font-sans font-bold text-[15px] tracking-tight text-white">Honesty check</span>
          <span className="font-mono text-[10px] text-[#5a5a64]">claims vs delivers</span>
        </div>
        <button onClick={() => setInfo(v => !v)} className="font-mono text-[10px] text-[#48484f] hover:text-[#9a9a94] transition-colors">{info ? '−' : '?'}</button>
      </div>

      <AnimatePresence initial={false}>
        {info && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 py-3 text-[12px] text-[#b4b4be] leading-relaxed border-b border-[#141414] bg-[#0a0a0e]">
              Every row groups the bot's calls by how sure it said it was. The hollow ring is the promise ("80% sure"); the glowing dot is what actually happened. A short gap means it means what it says; a long red gap means it talks bigger than it delivers. Averaged, that gap is the Brier score.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {n < MIN_SAMPLE ? (
        <div className="px-5 py-16 text-center">
          <div className="text-[13px] text-[#6a6a74]">Needs ~{MIN_SAMPLE} resolved predictions to measure honesty.</div>
          <div className="text-[11px] text-[#3f3f48] mt-1 font-mono">{n} settled so far</div>
        </div>
      ) : (
        <div className="p-5">
          {/* metric tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
            {metrics.map((m, i) => (
              <motion.div key={m.k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="rounded-xl border border-[#161620] bg-[#08080c] p-3.5">
                <div className="font-mono text-[9px] text-[#5a5a64] tracking-[0.14em] uppercase mb-1.5">{m.k}</div>
                <div className="font-sans font-black text-[26px] leading-none tabular-nums" style={{ color: m.c }}>{m.v}</div>
                <div className="font-mono text-[9px] text-[#48484f] mt-1.5">{m.sub}</div>
              </motion.div>
            ))}
          </div>

          {/* the graph — promise → reality per bucket */}
          <div className="relative h-4 ml-[56px] mr-[52px] mb-1">
            {[0, 50, 100].map(t => <span key={t} className="absolute font-mono text-[9px] text-[#3f3f48] -translate-x-1/2" style={{ left: `${t}%` }}>{t}%</span>)}
          </div>
          <div className="flex flex-col gap-1.5">
            {rows.map((r, i) => {
              const over = r.real < r.said - 1
              const c = over ? RED : TEAL
              const lo = Math.min(r.said, r.real), hi = Math.max(r.said, r.real)
              return (
                <div key={i} className="group flex items-center gap-3">
                  <div className="w-[48px] shrink-0 text-right">
                    <div className="font-sans font-bold text-[12px] tabular-nums text-[#dcdce2]">{r.said}%</div>
                    <div className="font-mono text-[8px] text-[#48484f] -mt-0.5">claims</div>
                  </div>
                  <div className="relative flex-1 h-7">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-[#15151d]" />
                    <motion.div className="absolute top-1/2 -translate-y-1/2 h-[3px] rounded-full" style={{ background: c, boxShadow: `0 0 10px ${c}66` }}
                      initial={{ left: `${r.said}%`, width: '0%' }} animate={{ left: `${lo}%`, width: `${hi - lo}%` }} transition={{ delay: 0.2 + i * 0.09, duration: 0.7, ease: 'easeOut' }} />
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-[#6a6a78] bg-[#0a0a10]" style={{ left: `${r.said}%` }} />
                    <motion.div className="absolute top-1/2 z-10 w-4 h-4 rounded-full" style={{ background: c, boxShadow: `0 0 12px ${c}`, x: '-50%', y: '-50%' }}
                      initial={{ left: `${r.said}%`, scale: 0 }} animate={{ left: `${r.real}%`, scale: 1 }} transition={{ delay: 0.2 + i * 0.09, duration: 0.7, ease: 'easeOut' }}>
                      <span className="absolute left-1/2 -translate-x-1/2 -top-4 font-mono text-[9px] tabular-nums whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: c }}>{r.real}%</span>
                    </motion.div>
                  </div>
                  <div className="w-[40px] shrink-0">
                    <div className="h-1 rounded-full bg-[#15151d] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(r.n / maxN) * 100}%`, background: VIOLET }} /></div>
                    <div className="font-mono text-[8px] text-[#48484f] mt-0.5 tabular-nums">{r.n}</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-[#141414] flex items-center justify-between font-mono text-[9px] text-[#5a5a64]">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2 border-[#6a6a78]" /> promise</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: accent }} /> reality</span>
            </div>
            <span>{n} resolved calls · bar = sample weight</span>
          </div>
        </div>
      )}
    </div>
  )
}
