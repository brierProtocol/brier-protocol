'use client'

import React, { useMemo } from 'react'

// Kept for compatibility with existing call sites — the creature ignores shape.
export type EyeShape = 'round' | 'aperture' | 'cat' | 'diamond' | 'scanner' | 'ring' | 'star' | 'triangle' | 'cross' | 'spiral' | 'nova' | 'void'

interface BotIrisAvatarProps {
  avatarId: string
  size?: number
  accentColor?: string
  shape?: EyeShape
  // Fondo del lienzo. Por defecto transparente: la criatura flota sobre el fondo
  // del contenedor en toda la app. Pasar un color solo si se quiere un cuadro.
  bg?: string
}

// FNV-1a with avalanche — small id changes produce very different creatures.
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

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Mix a hex color toward white (amt 0..1)
function lighten(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * amt).toString(16).padStart(2, '0')
  return `#${mix(r)}${mix(g)}${mix(b)}`
}

/**
 * Pixel creature — every bot is an entity. A mirrored invader-style being,
 * deterministic per avatarId, with eyes so it reads as a face. Replaces the
 * old glyph weave (git history keeps both ancestors).
 */
export default function BotIrisAvatar({ avatarId, size = 64, accentColor = '#ff2a4d', bg = 'transparent' }: BotIrisAvatarProps) {
  const { cells, eyes } = useMemo(() => {
    const N = 10                       // 10×10 board, mirrored halves
    const half = N / 2
    const rand = mulberry32(hash(avatarId || 'void'))

    // Body silhouette: center-weighted density so the mass connects into a creature
    const cells: { x: number; y: number; tone: number }[] = []
    const on: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false))
    for (let y = 1; y < N - 1; y++) {
      for (let x = 0; x < half; x++) {
        const cx = (half - 1 - x) / half          // 0 at center col → 1 at edge
        const cy = Math.abs(y - (N - 1) / 2) / ((N - 1) / 2)
        const p = 0.78 - cx * 0.45 - cy * 0.28    // denser core, raggedy edges
        if (rand() < p) { on[y][x] = true; on[y][N - 1 - x] = true }
      }
    }

    // Eyes: a symmetric pair on an upper row — the face
    const eyeRow = 2 + Math.floor(rand() * 3)            // rows 2-4
    const eyeCol = 1 + Math.floor(rand() * (half - 2))   // 1..half-2 from center
    const ex1 = half - 1 - eyeCol
    const ex2 = N - 1 - ex1
    // guarantee sockets exist (and a brow above, for shape)
    on[eyeRow][ex1] = true; on[eyeRow][ex2] = true
    if (eyeRow > 1) { on[eyeRow - 1][ex1] = true; on[eyeRow - 1][ex2] = true }

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < half; x++) {
        if (!on[y][x]) continue
        const tone = rand() < 0.28 ? 1 : 0   // some pixels lighter → depth
        cells.push({ x, y, tone })
        cells.push({ x: N - 1 - x, y, tone })
      }
    }

    return { cells, eyes: [{ x: ex1, y: eyeRow }, { x: ex2, y: eyeRow }] }
  }, [avatarId])

  const N = 10
  const PAD = 1
  const VB = N + PAD * 2
  const A = accentColor
  const ALight = lighten(accentColor, 0.45)

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      shapeRendering="crispEdges"
      style={{ display: 'block', background: bg }}
      aria-label={`agent ${avatarId}`}
    >
      {cells.map(({ x, y, tone }, i) => (
        <rect key={i} x={x + PAD} y={y + PAD} width={1} height={1} fill={tone ? ALight : A} />
      ))}
      {eyes.map(({ x, y }, i) => (
        <rect key={`e${i}`} x={x + PAD + 0.22} y={y + PAD + 0.22} width={0.56} height={0.56} fill="#050505" />
      ))}
    </svg>
  )
}
