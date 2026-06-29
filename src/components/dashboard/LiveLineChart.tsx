'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './LiveLineChart.module.css'

/**
 * Equity curve with the "liveline" effect: the line draws itself on mount, glows,
 * and bursts at the peak. Interactive: hover (or drag on touch) scrubs the curve
 * and a tooltip tracks the nearest point. Responsive (measures its container).
 * Real data only — fewer than 2 points renders an honest awaiting state.
 */
export default function LiveLineChart({
  data,
  labels,
  height = 220,
  label = 'Equity',
}: {
  data: number[]
  labels?: string[]
  height?: number
  label?: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(760)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver(() => setW(el.clientWidth || 760))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const valid = Array.isArray(data) && data.length >= 2
  const H = height
  const PAD = 18

  const geo = useMemo(() => {
    if (!valid) return null
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const innerW = Math.max(1, w - PAD * 2)
    const innerH = H - PAD * 2
    const pts = data.map((v, i) => {
      const x = PAD + (i / (data.length - 1)) * innerW
      const y = PAD + (1 - (v - min) / range) * innerH
      return [x, y] as const
    })
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
    const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${H} L${pts[0][0].toFixed(1)} ${H} Z`
    const end = pts[pts.length - 1]
    // 5 rays radiating up/out from the peak
    const rays = [-90, -50, -130, -20, -160].map(deg => {
      const r = (deg * Math.PI) / 180
      const len = 16
      return { x2: (end[0] + Math.cos(r) * len).toFixed(1), y2: (end[1] + Math.sin(r) * len).toFixed(1) }
    })
    return { pts, line, area, end, rays }
  }, [data, w, H, valid])

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!geo) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * w
    // nearest index by x distance
    let best = 0, bestD = Infinity
    for (let i = 0; i < geo.pts.length; i++) {
      const d = Math.abs(geo.pts[i][0] - x)
      if (d < bestD) { bestD = d; best = i }
    }
    setHover(best)
  }

  const fmtUsd = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  const hp = hover != null && geo ? geo.pts[hover] : null
  const hv = hover != null ? data[hover] : null

  return (
    <div ref={wrapRef} className={styles.wrap}>
      {!valid || !geo ? (
        <div
          style={{ height: H }}
          className="flex flex-col items-center justify-center border border-[#1a1a20] rounded-xl bg-[#0b0b0e]"
        >
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#5a5a64]">{label}</div>
          <div className="mt-1.5 text-[13px] text-[#6a6a74]">Awaiting first settlements</div>
        </div>
      ) : (
        <>
          {hp && hv != null && (
            <div className={styles.tooltip} style={{ left: hp[0], top: hp[1] }}>
              <div className={styles.tipVal}>{fmtUsd(hv)}</div>
              <div className={styles.tipMeta} style={{ color: '#8a8a94' }}>
                {labels && labels[hover!] ? labels[hover!] : `point ${hover! + 1}/${data.length}`}
              </div>
            </div>
          )}
          <svg
            className={styles.svg}
            width={w}
            height={H}
            viewBox={`0 0 ${w} ${H}`}
            aria-label={`${label} curve`}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id="llc-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#ff2a4d" stopOpacity="0.26" />
                <stop offset="1" stopColor="#ff2a4d" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className={styles.area} d={geo.area} fill="url(#llc-fill)" />
            <path className={styles.line} pathLength={1} d={geo.line} />

            {/* burst at the peak — hidden while scrubbing so it doesn't fight the cursor */}
            {hover == null && (
              <g>
                {geo.rays.map((ray, i) => (
                  <line
                    key={i}
                    className={styles.ray}
                    x1={geo.end[0]}
                    y1={geo.end[1]}
                    x2={ray.x2}
                    y2={ray.y2}
                    style={{ animationDelay: `${1.6 + i * 0.04}s` }}
                  />
                ))}
                <circle className={styles.endRing} cx={geo.end[0]} cy={geo.end[1]} r={6} fill="none" stroke="#ff2a4d" strokeWidth={1.5} />
                <circle className={styles.endDot} cx={geo.end[0]} cy={geo.end[1]} r={4} fill="#fff" />
              </g>
            )}

            {/* hover crosshair + point */}
            {hp && (
              <g>
                <line className={styles.cursorLine} x1={hp[0]} y1={PAD} x2={hp[0]} y2={H - PAD} />
                <circle className={styles.hoverHalo} cx={hp[0]} cy={hp[1]} r={7} />
                <circle className={styles.hoverDot} cx={hp[0]} cy={hp[1]} r={3.5} />
              </g>
            )}
          </svg>
        </>
      )}
    </div>
  )
}
