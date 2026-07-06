'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// "Promise vs Reality." Forget reliability diagrams — this is instantly legible.
// Each row is a confidence bucket: a hollow ring marks what the bot PROMISED
// ("I'm 80% sure") and a glowing dot slides to where reality actually LANDED
// ("right 44% of the time"). The gap between them, coloured red when it overclaims,
// IS the miscalibration — you watch it fall short. Real resolved predictions only.

type Pred = { confidence: number; status?: string; outcome?: string }

const TEAL = '#c8ff00'
const VIOLET = '#8b7bff'
const RED = '#ff5570'
const MIN_SAMPLE = 8
const NB = 6

export default function CalibrationCurve({ predictions }: { predictions: Pred[] }) {
  const [info, setInfo] = useState(false)

  const resolved = (predictions || []).filter(p => { const s = p.status || p.outcome; return s === 'WIN' || s === 'LOSS' })
  const pts = resolved.map(p => {
    const raw = p.confidence ?? 0.5
    const c = raw > 0.5 ? raw : 1 - raw
    return { c, o: (p.status || p.outcome) === 'WIN' ? 1 : 0 }
  })
  const n = pts.length
  const brier = n ? pts.reduce((a, { c, o }) => a + (c - o) ** 2, 0) / n : null
  const meanGap = n ? pts.reduce((a, { c, o }) => a + (o - c), 0) / n : 0

  const bins = Array.from({ length: NB }, () => ({ sum: 0, win: 0, n: 0 }))
  for (const { c, o } of pts) {
    const i = Math.min(NB - 1, Math.max(0, Math.floor(((c - 0.5) / 0.5) * NB)))
    bins[i].sum += c; bins[i].win += o; bins[i].n++
  }
  const rows = bins
    .map(b => b.n > 0 ? { said: (b.sum / b.n) * 100, real: (b.win / b.n) * 100, n: b.n } : null)
    .filter(Boolean) as { said: number; real: number; n: number }[]
  const maxN = Math.max(1, ...rows.map(r => r.n))

  const verdict =
    n < MIN_SAMPLE ? { t: 'Accumulating', c: VIOLET }
    : Math.abs(meanGap) < 0.05 ? { t: 'Well calibrated', c: TEAL }
    : meanGap <= -0.05 ? { t: 'Overconfident', c: RED }
    : { t: 'Underconfident', c: VIOLET }

  return (
    <div className="rounded-2xl border border-[#1a1a1a] bg-gradient-to-b from-[#0a0a10] to-[#070709] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#141414]">
        <div className="flex items-baseline gap-2.5">
          <span className="font-sans font-bold text-[15px] tracking-tight text-white">Honesty check</span>
          <span className="font-mono text-[10px] text-[#5a5a64]">promise vs reality</span>
        </div>
        <button onClick={() => setInfo(v => !v)} className="font-mono text-[10px] text-[#48484f] hover:text-[#9a9a94] transition-colors">{info ? '−' : '?'}</button>
      </div>

      <AnimatePresence initial={false}>
        {info && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 py-3 text-[12px] text-[#b4b4be] leading-relaxed border-b border-[#141414] bg-[#0a0a0e]">
              Each row groups the bot's calls by how sure it said it was. The hollow ring is the promise ("I'm 80% sure"). The glowing dot is what actually happened ("right 44% of the time"). A short gap means it keeps its word. A long red gap means it talks bigger than it delivers. That gap, averaged, is the Brier score.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-5 py-2.5 border-b border-[#141414] text-[12px] text-[#8a8a94] leading-relaxed">
        The <span className="text-[#cfcfd6] font-semibold">ring</span> is what it promised. The <span className="font-semibold" style={{ color: TEAL }}>dot</span> is what really happened. The gap between them is the lie.
      </div>

      {n < MIN_SAMPLE ? (
        <div className="px-5 py-16 text-center">
          <div className="text-[13px] text-[#6a6a74]">Needs ~{MIN_SAMPLE} resolved predictions to judge honesty.</div>
          <div className="text-[11px] text-[#3f3f48] mt-1 font-mono">{n} settled so far</div>
        </div>
      ) : (
        <div className="p-5">
          {/* scale ticks */}
          <div className="relative h-4 ml-[64px] mr-[44px]">
            {[0, 50, 100].map(t => (
              <span key={t} className="absolute font-mono text-[9px] text-[#3f3f48] -translate-x-1/2" style={{ left: `${t}%`, top: 0 }}>{t}%</span>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            {rows.map((r, i) => {
              const over = r.real < r.said - 1 // overclaims
              const good = r.real >= r.said - 1
              const gapColor = over ? RED : TEAL
              const lo = Math.min(r.said, r.real), hi = Math.max(r.said, r.real)
              return (
                <div key={i} className="group flex items-center gap-3 py-1.5">
                  {/* left: the promise bucket */}
                  <div className="w-[52px] shrink-0 text-right">
                    <div className="font-sans font-bold text-[13px] tabular-nums text-[#e8e8e8]">{Math.round(r.said)}%</div>
                    <div className="font-mono text-[8px] text-[#48484f]">said</div>
                  </div>

                  {/* track */}
                  <div className="relative flex-1 h-8">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-[#15151d]" />
                    {/* gap connector */}
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 h-[3px] rounded-full"
                      style={{ background: gapColor, boxShadow: `0 0 10px ${gapColor}66` }}
                      initial={{ left: `${r.said}%`, width: '0%' }}
                      animate={{ left: `${lo}%`, width: `${hi - lo}%` }}
                      transition={{ delay: 0.25 + i * 0.1, duration: 0.7, ease: 'easeOut' }}
                    />
                    {/* promise ring */}
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-[#6a6a78] bg-[#0a0a10]" style={{ left: `${r.said}%` }} />
                    {/* reality dot — slides from promise to reality */}
                    <motion.div
                      className="absolute top-1/2 z-10 w-4 h-4 rounded-full"
                      style={{ background: gapColor, boxShadow: `0 0 12px ${gapColor}`, x: '-50%', y: '-50%' }}
                      initial={{ left: `${r.said}%`, scale: 0 }}
                      animate={{ left: `${r.real}%`, scale: 1 }}
                      transition={{ delay: 0.25 + i * 0.1, duration: 0.7, ease: 'easeOut' }}
                    >
                      <span className="absolute left-1/2 -translate-x-1/2 -top-4 font-mono text-[9px] tabular-nums whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: gapColor }}>{Math.round(r.real)}%</span>
                    </motion.div>
                  </div>

                  {/* right: sample weight */}
                  <div className="w-[40px] shrink-0">
                    <div className="h-1 rounded-full bg-[#15151d] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(r.n / maxN) * 100}%`, background: VIOLET }} />
                    </div>
                    <div className="font-mono text-[8px] text-[#48484f] mt-0.5 tabular-nums">{r.n} call{r.n === 1 ? '' : 's'}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* footer summary */}
          <div className="mt-4 pt-3 border-t border-[#141414] flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div>
                <div className="font-mono text-[8px] text-[#48484f] tracking-[0.14em] uppercase">Verdict</div>
                <div className="font-sans font-bold text-[14px]" style={{ color: verdict.c }}>{verdict.t}</div>
              </div>
              <div>
                <div className="font-mono text-[8px] text-[#48484f] tracking-[0.14em] uppercase">Brier</div>
                <div className="font-sans font-bold text-[14px] tabular-nums text-white">{brier!.toFixed(3)}</div>
              </div>
              <div>
                <div className="font-mono text-[8px] text-[#48484f] tracking-[0.14em] uppercase">Sample</div>
                <div className="font-sans font-bold text-[14px] tabular-nums text-white">{n.toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 font-mono text-[9px] text-[#5a5a64]">
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2 border-[#6a6a78]" /> promise</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: TEAL }} /> reality</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
