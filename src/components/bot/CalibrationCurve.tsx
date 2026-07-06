'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Honesty, as a report card — not a chart. A newcomer reads a letter grade, one
// plain sentence, and two numbers: what the bot SAYS vs what it DELIVERS. The
// per-bucket breakdown is tucked away for anyone who wants the detail. Everything
// is computed from real resolved predictions.

type Pred = { confidence: number; status?: string; outcome?: string }

const TEAL = '#c8ff00'
const AMBER = '#ffb000'
const RED = '#ff5570'
const VIOLET = '#8b7bff'
const MIN_SAMPLE = 8
const NB = 6

function gradeFor(brier: number) {
  if (brier <= 0.12) return { letter: 'A', label: 'Sharp and honest', color: TEAL }
  if (brier <= 0.18) return { letter: 'B', label: 'Reliable', color: TEAL }
  if (brier <= 0.24) return { letter: 'C', label: 'Rough around the edges', color: AMBER }
  if (brier <= 0.30) return { letter: 'D', label: 'Overconfident', color: RED }
  return { letter: 'F', label: 'Talks big, misses', color: RED }
}

export default function CalibrationCurve({ predictions }: { predictions: Pred[] }) {
  const [detail, setDetail] = useState(false)

  const resolved = (predictions || []).filter(p => { const s = p.status || p.outcome; return s === 'WIN' || s === 'LOSS' })
  const pts = resolved.map(p => {
    const raw = p.confidence ?? 0.5
    const c = raw > 0.5 ? raw : 1 - raw
    return { c, o: (p.status || p.outcome) === 'WIN' ? 1 : 0 }
  })
  const n = pts.length

  if (n < MIN_SAMPLE) {
    return (
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#080809] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#141414]"><span className="font-sans font-bold text-[15px] text-white">Honesty check</span></div>
        <div className="px-5 py-14 text-center">
          <div className="text-[13px] text-[#6a6a74]">Needs ~{MIN_SAMPLE} resolved predictions before we can grade it.</div>
          <div className="text-[11px] text-[#3f3f48] mt-1 font-mono">{n} settled so far</div>
        </div>
      </div>
    )
  }

  const brier = pts.reduce((a, { c, o }) => a + (c - o) ** 2, 0) / n
  const saysPct = Math.round((pts.reduce((a, { c }) => a + c, 0) / n) * 100)   // avg confidence
  const deliversPct = Math.round((pts.reduce((a, { o }) => a + o, 0) / n) * 100) // actual win rate
  const gap = saysPct - deliversPct
  const g = gradeFor(brier)

  const sentence =
    gap <= 5
      ? `When ${'this bot'} sounds sure, it is right about as often as it claims. It keeps its word.`
      : `When it sounds sure, it is right ${deliversPct}% of the time — but it claims ${saysPct}%. It talks bigger than it delivers.`

  // per-bucket rows for the optional breakdown
  const bins = Array.from({ length: NB }, () => ({ sum: 0, win: 0, n: 0 }))
  for (const { c, o } of pts) {
    const i = Math.min(NB - 1, Math.max(0, Math.floor(((c - 0.5) / 0.5) * NB)))
    bins[i].sum += c; bins[i].win += o; bins[i].n++
  }
  const rows = bins.map(b => b.n > 0 ? { said: Math.round((b.sum / b.n) * 100), real: Math.round((b.win / b.n) * 100), n: b.n } : null).filter(Boolean) as { said: number; real: number; n: number }[]

  return (
    <div className="rounded-2xl border border-[#1a1a1a] bg-gradient-to-b from-[#0b0b11] to-[#070709] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#141414]">
        <div className="flex items-baseline gap-2.5">
          <span className="font-sans font-bold text-[15px] tracking-tight text-white">Honesty check</span>
          <span className="font-mono text-[10px] text-[#5a5a64]">does it mean what it says</span>
        </div>
      </div>

      <div className="p-5">
        {/* grade + verdict */}
        <div className="flex items-center gap-5">
          <motion.div
            initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }}
            className="relative grid place-items-center w-[84px] h-[84px] rounded-2xl shrink-0"
            style={{ background: `${g.color}12`, border: `1.5px solid ${g.color}55`, boxShadow: `0 0 28px ${g.color}22` }}
          >
            <span className="font-sans font-black text-[48px] leading-none" style={{ color: g.color }}>{g.letter}</span>
          </motion.div>
          <div className="min-w-0">
            <div className="font-sans font-black text-[20px] tracking-tight" style={{ color: g.color }}>{g.label}</div>
            <p className="text-[13px] text-[#b4b4be] leading-relaxed mt-1 m-0">{sentence}</p>
          </div>
        </div>

        {/* says vs delivers */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#161620] bg-[#08080c] p-4">
            <div className="font-mono text-[9px] text-[#5a5a64] tracking-[0.14em] uppercase mb-1.5">It says</div>
            <div className="font-sans font-black text-[32px] leading-none tabular-nums text-[#e8e8e8]">{saysPct}%</div>
            <div className="font-mono text-[10px] text-[#48484f] mt-1.5">average confidence</div>
          </div>
          <div className="rounded-xl border p-4" style={{ borderColor: `${g.color}33`, background: `${g.color}0a` }}>
            <div className="font-mono text-[9px] tracking-[0.14em] uppercase mb-1.5" style={{ color: `${g.color}bb` }}>It delivers</div>
            <div className="font-sans font-black text-[32px] leading-none tabular-nums" style={{ color: g.color }}>{deliversPct}%</div>
            <div className="font-mono text-[10px] mt-1.5" style={{ color: `${g.color}88` }}>actually right</div>
          </div>
        </div>

        {/* the gap bar */}
        <div className="mt-4">
          <div className="relative h-2.5 rounded-full bg-[#141420] overflow-hidden">
            <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ background: g.color, opacity: 0.85 }}
              initial={{ width: 0 }} animate={{ width: `${deliversPct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
            {/* claim marker */}
            <motion.div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-4" style={{ left: `${saysPct}%`, background: '#e8e8e8' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} />
          </div>
          <div className="flex items-center justify-between mt-1.5 font-mono text-[9px] text-[#5a5a64]">
            <span>filled = what it delivers</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block w-0.5 h-2.5 bg-[#e8e8e8]" /> what it claims</span>
          </div>
        </div>

        {/* footer: Brier + sample + breakdown toggle */}
        <div className="mt-4 pt-3 border-t border-[#141414] flex items-center justify-between">
          <div className="flex items-center gap-5 font-mono text-[10px] text-[#5a5a64]">
            <span>Brier <span className="text-white font-bold tabular-nums">{brier.toFixed(3)}</span> <span className="text-[#3f3f48]">(0.25 = coin flip)</span></span>
            <span>Sample <span className="text-white font-bold tabular-nums">{n}</span></span>
          </div>
          <button onClick={() => setDetail(v => !v)} className="font-mono text-[10px] text-[#7a7a84] hover:text-white transition-colors">{detail ? 'hide breakdown −' : 'breakdown +'}</button>
        </div>

        <AnimatePresence initial={false}>
          {detail && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="font-mono text-[10px] text-[#5a5a64] mb-1">By confidence level — <span className="text-[#8a8a94]">says</span> vs <span style={{ color: g.color }}>delivers</span></div>
                {rows.map((r, i) => {
                  const over = r.real < r.said - 1
                  const c = over ? RED : TEAL
                  const lo = Math.min(r.said, r.real), hi = Math.max(r.said, r.real)
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-[#8a8a94]">{r.said}%</span>
                      <div className="relative flex-1 h-5">
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#141420] rounded-full" />
                        <div className="absolute top-1/2 -translate-y-1/2 h-[2px] rounded-full" style={{ left: `${lo}%`, width: `${hi - lo}%`, background: c }} />
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-[#6a6a78] bg-[#0a0a10]" style={{ left: `${r.said}%` }} />
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ left: `${r.real}%`, background: c, boxShadow: `0 0 8px ${c}` }} />
                      </div>
                      <span className="w-14 shrink-0 font-mono text-[9px] text-[#48484f] tabular-nums">{r.n} call{r.n === 1 ? '' : 's'}</span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
