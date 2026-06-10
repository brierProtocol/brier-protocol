'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export type Tick = { t: number; v: number; vol?: number }

type Candle = { t: number; o: number; h: number; l: number; c: number; vol: number }

type Timeframe = { label: string; secs: number }

const TIMEFRAMES: Timeframe[] = [
  { label: '1m', secs: 60 },
  { label: '5m', secs: 300 },
  { label: '15m', secs: 900 },
  { label: '1H', secs: 3600 },
  { label: '4H', secs: 14400 },
  { label: '1D', secs: 86400 },
]

const UP = '#00d4aa'
const DOWN = '#ff3b3b'
const GRID = '#131313'
const AXIS_TEXT = '#4a4a4a'
const MAX_CANDLES = 180

function buildCandles(ticks: Tick[], bucketSecs: number): Candle[] {
  if (ticks.length === 0) return []
  const sorted = [...ticks].sort((a, b) => a.t - b.t)
  const bucketMs = bucketSecs * 1000
  const first = Math.floor(sorted[0].t / bucketMs) * bucketMs
  const last = Math.floor(sorted[sorted.length - 1].t / bucketMs) * bucketMs
  const candles: Candle[] = []
  let i = 0
  let prevClose = sorted[0].v
  for (let b = first; b <= last; b += bucketMs) {
    let o = prevClose, h = prevClose, l = prevClose, c = prevClose, vol = 0
    let touched = false
    while (i < sorted.length && sorted[i].t < b + bucketMs) {
      const p = sorted[i]
      if (!touched) { o = prevClose; h = Math.max(prevClose, p.v); l = Math.min(prevClose, p.v); touched = true }
      h = Math.max(h, p.v)
      l = Math.min(l, p.v)
      c = p.v
      vol += p.vol ?? 0
      i++
    }
    candles.push({ t: b, o, h, l, c, vol })
    prevClose = c
    if (candles.length > MAX_CANDLES * 4) candles.splice(0, candles.length - MAX_CANDLES * 4)
  }
  return candles.slice(-MAX_CANDLES)
}

/** Pick the bucket that yields a reasonable candle count for the data span. */
function autoTimeframe(ticks: Tick[]): number {
  if (ticks.length < 2) return 3600
  const span = (ticks[ticks.length - 1].t - ticks[0].t) / 1000
  for (const tf of TIMEFRAMES) {
    if (span / tf.secs <= 120) return tf.secs
  }
  return 86400
}

function fmtPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (v >= 1) return v.toFixed(2)
  if (v >= 0.001) return v.toFixed(5)
  return v.toExponential(2)
}

function fmtClock(ms: number, bucketSecs: number): string {
  const d = new Date(ms)
  if (bucketSecs >= 86400) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function CandleChart({
  ticks,
  height = 340,
  unit = '$',
  emptyLabel = 'AWAITING_TICKS',
}: {
  ticks: Tick[]
  height?: number
  unit?: string
  emptyLabel?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [tfSecs, setTfSecs] = useState<number | null>(null) // null = auto
  const [hover, setHover] = useState<number | null>(null)   // candle index
  const [renderMs, setRenderMs] = useState(0)
  const [size, setSize] = useState({ w: 0, h: height })

  const bucket = tfSecs ?? autoTimeframe(ticks)
  const candles = useMemo(() => buildCandles(ticks, bucket), [ticks, bucket])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect
      setSize({ w: r.width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [height])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.w === 0) return
    const t0 = performance.now()
    const dpr = window.devicePixelRatio || 1
    canvas.width = size.w * dpr
    canvas.height = size.h * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, size.w, size.h)

    if (candles.length === 0) return

    const padR = 60, padT = 10, padB = 22, padL = 6
    const volZone = 36
    const W = size.w - padL - padR
    const H = size.h - padT - padB - volZone

    let lo = Infinity, hi = -Infinity, maxVol = 0
    for (const k of candles) {
      lo = Math.min(lo, k.l); hi = Math.max(hi, k.h); maxVol = Math.max(maxVol, k.vol)
    }
    if (hi === lo) { hi += hi * 0.01 || 1; lo -= lo * 0.01 || 1 }
    const pad = (hi - lo) * 0.06
    hi += pad; lo -= pad

    const x = (i: number) => padL + ((i + 0.5) / candles.length) * W
    const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * H
    const cw = Math.max(1.5, Math.min(13, (W / candles.length) * 0.66))

    // horizontal grid + price labels
    ctx.font = '10px "JetBrains Mono", monospace'
    ctx.textBaseline = 'middle'
    for (let g = 0; g <= 4; g++) {
      const v = lo + ((hi - lo) * g) / 4
      const yy = y(v)
      ctx.strokeStyle = GRID
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(padL + W, yy); ctx.stroke()
      ctx.fillStyle = AXIS_TEXT
      ctx.textAlign = 'left'
      ctx.fillText(`${unit}${fmtPrice(v)}`, padL + W + 8, yy)
    }

    // time labels
    const nLabels = Math.min(5, candles.length)
    ctx.fillStyle = AXIS_TEXT
    ctx.textAlign = 'center'
    for (let g = 0; g < nLabels; g++) {
      const idx = Math.floor((g / Math.max(1, nLabels - 1)) * (candles.length - 1))
      ctx.fillText(fmtClock(candles[idx].t, bucket), x(idx), size.h - 8)
    }

    // volume histogram
    if (maxVol > 0) {
      const volTop = padT + H + 6
      for (let i = 0; i < candles.length; i++) {
        const k = candles[i]
        if (k.vol <= 0) continue
        const vh = Math.max(1, (k.vol / maxVol) * (volZone - 8))
        ctx.fillStyle = (k.c >= k.o ? UP : DOWN) + '38'
        ctx.fillRect(x(i) - cw / 2, volTop + (volZone - 8) - vh, cw, vh)
      }
    }

    // candles
    for (let i = 0; i < candles.length; i++) {
      const k = candles[i]
      const up = k.c >= k.o
      const col = up ? UP : DOWN
      const cx = x(i)
      // wick
      ctx.strokeStyle = col
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(cx, y(k.h)); ctx.lineTo(cx, y(k.l)); ctx.stroke()
      // body
      const yo = y(k.o), yc = y(k.c)
      const top = Math.min(yo, yc)
      const bh = Math.max(1, Math.abs(yo - yc))
      ctx.fillStyle = up ? col : col
      if (up) {
        ctx.fillStyle = '#0a0a0a'
        ctx.fillRect(cx - cw / 2, top, cw, bh)
        ctx.strokeStyle = col
        ctx.strokeRect(cx - cw / 2, top, cw, bh)
      } else {
        ctx.fillStyle = col
        ctx.fillRect(cx - cw / 2, top, cw, bh)
      }
    }

    // last price line + tag
    const last = candles[candles.length - 1]
    const ly = y(last.c)
    ctx.setLineDash([3, 4])
    ctx.strokeStyle = (last.c >= last.o ? UP : DOWN) + '99'
    ctx.beginPath(); ctx.moveTo(padL, ly); ctx.lineTo(padL + W, ly); ctx.stroke()
    ctx.setLineDash([])
    const tag = `${unit}${fmtPrice(last.c)}`
    ctx.font = 'bold 10px "JetBrains Mono", monospace'
    const tw = ctx.measureText(tag).width + 10
    ctx.fillStyle = last.c >= last.o ? UP : DOWN
    ctx.fillRect(padL + W + 2, ly - 8, tw, 16)
    ctx.fillStyle = '#030303'
    ctx.textAlign = 'left'
    ctx.fillText(tag, padL + W + 7, ly + 1)

    // crosshair
    if (hover != null && hover >= 0 && hover < candles.length) {
      const k = candles[hover]
      const cx = x(hover)
      ctx.setLineDash([2, 3])
      ctx.strokeStyle = '#3a3a3a'
      ctx.beginPath(); ctx.moveTo(cx, padT); ctx.lineTo(cx, padT + H + volZone); ctx.stroke()
      const hy = y(k.c)
      ctx.beginPath(); ctx.moveTo(padL, hy); ctx.lineTo(padL + W, hy); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#888'
      ctx.font = '10px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(fmtClock(k.t, bucket), cx, size.h - 8)
    }

    setRenderMs(performance.now() - t0)
  }, [candles, size, hover, bucket, unit])

  const onMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect || candles.length === 0) return
    const padL = 6, padR = 60
    const W = rect.width - padL - padR
    const idx = Math.floor(((e.clientX - rect.left - padL) / W) * candles.length)
    setHover(idx >= 0 && idx < candles.length ? idx : null)
  }

  const k = hover != null ? candles[hover] : candles[candles.length - 1]
  const delta = k && k.o > 0 ? ((k.c - k.o) / k.o) * 100 : 0

  return (
    <div ref={wrapRef} className="w-full select-none">
      {/* OHLC readout + timeframes */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#141414] flex-wrap gap-2">
        <div className="flex items-center gap-3 font-mono text-[10px] text-[#555]">
          {k ? (
            <>
              <span>O <span className="text-[#aaa]">{unit}{fmtPrice(k.o)}</span></span>
              <span>H <span className="text-[#aaa]">{unit}{fmtPrice(k.h)}</span></span>
              <span>L <span className="text-[#aaa]">{unit}{fmtPrice(k.l)}</span></span>
              <span>C <span className="text-[#aaa]">{unit}{fmtPrice(k.c)}</span></span>
              <span style={{ color: delta >= 0 ? UP : DOWN }}>{delta >= 0 ? '+' : ''}{delta.toFixed(2)}%</span>
            </>
          ) : (
            <span>{emptyLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-[#333]">{renderMs > 0 ? `render ${renderMs.toFixed(1)}ms` : ''}</span>
          <div className="flex gap-px">
            <button
              onClick={() => setTfSecs(null)}
              className={`px-2 py-0.5 font-mono text-[9px] border transition-colors cursor-pointer ${tfSecs === null ? 'text-white border-[#333] bg-[#111]' : 'text-[#555] border-transparent hover:text-white'}`}
            >
              AUTO
            </button>
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.label}
                onClick={() => setTfSecs(tf.secs)}
                className={`px-2 py-0.5 font-mono text-[9px] border transition-colors cursor-pointer ${tfSecs === tf.secs ? 'text-white border-[#333] bg-[#111]' : 'text-[#555] border-transparent hover:text-white'}`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {candles.length === 0 ? (
        <div style={{ height }} className="flex items-center justify-center font-mono text-[10px] text-[#333] tracking-widest">
          <span className="cursor-blink">&gt; {emptyLabel}</span>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height }}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        />
      )}
    </div>
  )
}
