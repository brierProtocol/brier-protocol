'use client'

import React, { useMemo } from 'react'

// Kept for compatibility with existing call sites — the pattern art ignores shape.
export type EyeShape = 'round' | 'aperture' | 'cat' | 'diamond' | 'scanner' | 'ring' | 'star' | 'triangle' | 'cross' | 'spiral' | 'nova' | 'void'

interface BotIrisAvatarProps {
  avatarId: string
  size?: number
  accentColor?: string
  shape?: EyeShape
}

// FNV-1a with avalanche — small id changes produce very different patterns.
function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= h >>> 13
  h = Math.imul(h, 0x5bd1e995)
  h ^= h >>> 15
  return h >>> 0
}

// Tiny deterministic PRNG seeded from the hash.
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Generative signature art for bots — a mirrored glyph weave, unique and
 * deterministic per avatarId. Square, terminal-flavored, replaces the old
 * procedural eye (still in git history). Same prop contract as before.
 */
export default function BotIrisAvatar({ avatarId, size = 64, accentColor = '#ff2a4d' }: BotIrisAvatarProps) {
  const cells = useMemo(() => {
    const N = 7                          // 7×7 grid, mirrored around the center column
    const rand = mulberry32(hash(avatarId || 'void'))
    const half = Math.ceil(N / 2)
    const grid: { x: number; y: number; g: number }[] = []
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < half; x++) {
        const r = rand()
        // glyphs: 0 blank · 1 solid · 2 dim · 3 diagonal / · 4 diagonal \ · 5 dot
        let g = 0
        if (r < 0.30) g = 0
        else if (r < 0.52) g = 1
        else if (r < 0.70) g = 2
        else if (r < 0.80) g = 3
        else if (r < 0.90) g = 4
        else g = 5
        grid.push({ x, y, g })
        if (x !== N - 1 - x) {
          // mirror: diagonals flip orientation
          const mg = g === 3 ? 4 : g === 4 ? 3 : g
          grid.push({ x: N - 1 - x, y, g: mg })
        }
      }
    }
    return grid
  }, [avatarId])

  const N = 7
  const PAD = 1            // outer padding in cell units
  const VB = N + PAD * 2   // viewBox span
  const A = accentColor

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      shapeRendering="crispEdges"
      style={{ display: 'block', background: '#050505' }}
      aria-label={`signature of ${avatarId}`}
    >
      {cells.map(({ x, y, g }, i) => {
        const cx = x + PAD
        const cy = y + PAD
        if (g === 0) return null
        if (g === 1) return <rect key={i} x={cx} y={cy} width={1} height={1} fill={A} />
        if (g === 2) return <rect key={i} x={cx} y={cy} width={1} height={1} fill={A} opacity={0.22} />
        if (g === 3) return <path key={i} d={`M ${cx} ${cy + 1} L ${cx + 1} ${cy}`} stroke={A} strokeWidth={0.32} opacity={0.85} />
        if (g === 4) return <path key={i} d={`M ${cx} ${cy} L ${cx + 1} ${cy + 1}`} stroke={A} strokeWidth={0.32} opacity={0.85} />
        return <rect key={i} x={cx + 0.34} y={cy + 0.34} width={0.32} height={0.32} fill={A} opacity={0.9} />
      })}
    </svg>
  )
}
