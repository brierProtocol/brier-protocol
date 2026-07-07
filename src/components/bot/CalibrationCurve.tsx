'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Pred = { confidence: number; status?: string; outcome?: string }

const TEAL = '#c8ff00'
const RED = '#ff5570'
const MIN_SAMPLE = 8
const NB = 5 // Bins: 50-60, 60-70, 70-80, 80-90, 90-100

function Cuboid({ x, y, w, d, h, color, delay = 0, ghost = false }: any) {
  const bFront = ghost ? 0.3 : 0.8
  const bRight = ghost ? 0.2 : 0.5
  const bTop = ghost ? 0.4 : 1.2
  const o = ghost ? 0.4 : 1
  const stroke = ghost ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.2)'
  const shadow = ghost ? 'none' : `0 0 16px ${color}66, inset 0 0 12px ${color}99`

  return (
    <div className="absolute" style={{ left: x, top: y, width: w, height: d, transformStyle: 'preserve-3d' }}>
      {/* FRONT */}
      <motion.div 
        className="absolute bottom-0 left-0" 
        style={{ width: w, background: color, filter: `brightness(${bFront})`, opacity: o, transformOrigin: 'bottom', border: `1px solid ${stroke}` }} 
        initial={{ height: 0, rotateX: -90 }} 
        animate={{ height: h, rotateX: -90 }} 
        transition={{ duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }} 
      />
      {/* RIGHT */}
      <motion.div 
        className="absolute top-0 right-0" 
        style={{ height: d, background: color, filter: `brightness(${bRight})`, opacity: o, transformOrigin: 'right', border: `1px solid ${stroke}` }} 
        initial={{ width: 0, rotateY: -90 }} 
        animate={{ width: h, rotateY: -90 }} 
        transition={{ duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }} 
      />
      {/* TOP */}
      <motion.div 
        className="absolute top-0 left-0" 
        style={{ width: w, height: d, background: color, filter: `brightness(${bTop})`, opacity: o, border: `1px solid ${stroke}`, boxShadow: shadow }} 
        initial={{ z: 0 }} 
        animate={{ z: h }} 
        transition={{ duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }} 
      />
    </div>
  )
}

export default function CalibrationCurve({ predictions }: { predictions: Pred[] }) {
  const [detail, setDetail] = useState(false)

  const resolved = (predictions || []).filter(p => { const s = p.status || p.outcome; return s === 'WIN' || s === 'LOSS' })
  const pts = resolved.map(p => { const raw = p.confidence ?? 0.5; return { c: raw > 0.5 ? raw : 1 - raw, o: (p.status || p.outcome) === 'WIN' ? 1 : 0 } })
  const n = pts.length

  if (n < MIN_SAMPLE) {
    return (
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#080809] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#141414]"><span className="font-sans font-bold text-[15px] text-white">3D Calibration</span></div>
        <div className="px-5 py-16 text-center">
          <div className="text-[13px] text-[#6a6a74]">Needs ~{MIN_SAMPLE} resolved predictions.</div>
          <div className="text-[11px] text-[#3f3f48] mt-1 font-mono">{n} settled so far</div>
        </div>
      </div>
    )
  }

  const brier = pts.reduce((a, { c, o }) => a + (c - o) ** 2, 0) / n
  const saysPct = Math.round((pts.reduce((a, { c }) => a + c, 0) / n) * 100)
  const deliversPct = Math.round((pts.reduce((a, { o }) => a + o, 0) / n) * 100)
  const honest = saysPct - deliversPct <= 5
  const accent = honest ? TEAL : RED

  const bins = Array.from({ length: NB }, () => ({ sum: 0, win: 0, n: 0 }))
  for (const { c, o } of pts) { 
    const i = Math.min(NB - 1, Math.max(0, Math.floor(((c - 0.5) / 0.5) * NB)))
    bins[i].sum += c; bins[i].win += o; bins[i].n++ 
  }
  const rows = bins.map((b, i) => b.n > 0 ? { bin: 55 + i * 10, said: Math.round((b.sum / b.n) * 100), real: Math.round((b.win / b.n) * 100), n: b.n } : null).filter(Boolean) as any[]

  return (
    <div className="rounded-2xl border border-[#1a1a1a] bg-gradient-to-b from-[#0a0a0e] to-[#040405] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#141414]">
        <div className="flex items-baseline gap-2.5">
          <span className="font-sans font-bold text-[15px] tracking-tight text-white">3D Calibration</span>
          <span className="font-mono text-[10px] text-[#5a5a64]">claimed vs delivered</span>
        </div>
        <button onClick={() => setDetail(v => !v)} className="font-mono text-[10px] text-[#7a7a84] hover:text-white transition-colors">{detail ? 'hide −' : 'breakdown +'}</button>
      </div>

      <div className="p-5 flex flex-col md:flex-row gap-8 items-center">
        {/* 3D ISO SCENE */}
        <div className="relative w-full md:w-[320px] h-[280px] shrink-0 grid place-items-center" style={{ perspective: 1200 }}>
          <motion.div 
            className="relative"
            style={{ width: 260, height: 160, transformStyle: 'preserve-3d' }}
            initial={{ rotateX: 60, rotateZ: -45 }}
            animate={{ rotateX: 60, rotateZ: -45, y: [0, -6, 0] }}
            transition={{ y: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
          >
            {/* Floor Grid */}
            <div className="absolute inset-0 border border-white/10" style={{ background: 'rgba(255,255,255,0.02)', transformStyle: 'preserve-3d' }}>
              {[25, 50, 75].map(pct => (
                <div key={pct} className="absolute left-0 right-0 border-t border-white/5" style={{ top: `${pct}%` }} />
              ))}
              {[20, 40, 60, 80].map(pct => (
                <div key={pct} className="absolute top-0 bottom-0 border-l border-white/5" style={{ left: `${pct}%` }} />
              ))}
              {/* Axis labels flat on floor */}
              <div className="absolute -left-[40px] top-[15px] font-mono text-[9px] text-white/50 tracking-widest">CLAIM</div>
              <div className="absolute -left-[40px] top-[95px] font-mono text-[9px] text-white/50 tracking-widest">REAL</div>
            </div>

            {/* Bars */}
            {bins.map((b, i) => {
              if (b.n === 0) return null
              const said = b.sum / b.n
              const real = b.win / b.n
              const x = i * 52 + 10 // 52px step
              
              const isHonest = (said - real) <= 0.05
              const c = isHonest ? TEAL : RED
              
              // Max height is 140px (representing 100%)
              const hSaid = said * 140
              const hReal = real * 140

              return (
                <div key={i} style={{ transformStyle: 'preserve-3d' }}>
                  <Cuboid x={x} y={15} w={32} d={32} h={hSaid} color="#777" ghost delay={0.1 * i} />
                  <Cuboid x={x} y={95} w={32} d={32} h={hReal} color={c} delay={0.1 * i + 0.3} />
                  
                  {/* Bin label */}
                  <div className="absolute top-[170px] font-mono text-[9px] text-white/60 text-center" style={{ left: x, width: 32 }}>
                    ~{55 + i * 10}%
                  </div>
                </div>
              )
            })}
          </motion.div>
        </div>

        {/* SUMMARY */}
        <div className="flex-1 min-w-0 w-full">
          <div className="font-sans font-black text-[20px] tracking-tight leading-tight mb-2" style={{ color: accent }}>{honest ? 'Keeps its word' : 'Talks bigger than it delivers'}</div>
          <p className="text-[12.5px] text-[#b4b4be] leading-relaxed m-0 mb-5">
            {honest
              ? 'When it sounds sure, it is right about as often as it claims.'
              : `When it sounds sure it is right ${deliversPct}% of the time — but it claims ${saysPct}%.`}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: 'Claims', v: `${saysPct}%`, c: '#aaa' },
              { k: 'Delivers', v: `${deliversPct}%`, c: accent },
            ].map(m => (
              <div key={m.k} className="rounded-lg border border-[#161620] bg-[#08080c] p-3">
                <div className="font-mono text-[9px] text-[#5a5a64] tracking-[0.12em] uppercase mb-1">{m.k}</div>
                <div className="font-sans font-bold text-[18px] leading-none tabular-nums" style={{ color: m.c }}>{m.v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 font-mono text-[10px] text-[#48484f]">{n} resolved calls · Brier: {brier.toFixed(3)}</div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {detail && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 pt-2 border-t border-[#141414] flex flex-col gap-2">
              <div className="font-mono text-[10px] text-[#5a5a64] mb-2">By confidence bin — <span className="text-[#8a8a94]">claimed</span> vs <span style={{ color: accent }}>delivered</span></div>
              {rows.map((r, i) => {
                const over = r.real < r.said - 5
                const c = over ? RED : TEAL
                const lo = Math.min(r.said, r.real), hi = Math.max(r.said, r.real)
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-[#8a8a94]">{r.said}%</span>
                    <div className="relative flex-1 h-6">
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#141420] rounded-full" />
                      <div className="absolute top-1/2 -translate-y-1/2 h-[2px] rounded-full" style={{ left: `${lo}%`, width: `${hi - lo}%`, background: c }} />
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-[#6a6a78] bg-[#0a0a10]" style={{ left: `${r.said}%` }} />
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ left: `${r.real}%`, background: c, boxShadow: `0 0 8px ${c}` }} />
                    </div>
                    <span className="w-12 shrink-0 font-mono text-[9px] text-[#48484f] tabular-nums">{r.n} calls</span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
