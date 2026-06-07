'use client'

import React, { useEffect, useRef, useMemo } from 'react'

interface BotIrisAvatarProps {
  avatarId: string
  size?: number
  accentColor?: string
}

// Deterministic hash from avatarId string → number
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash)
}

// Lighten (amt > 0) or darken (amt < 0) a hex color by mixing toward white/black.
function shade(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const target = amt < 0 ? 0 : 255
  const p = Math.abs(amt)
  const mix = (c: number) => Math.round((target - c) * p) + c
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`
}

// Generate a complementary secondary color from the accent
function shiftHue(hex: string, degrees: number): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  h = ((h * 360 + degrees) % 360) / 360
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }

  const q2 = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p2 = 2 * l - q2
  const rr = Math.round(hue2rgb(p2, q2, h + 1/3) * 255)
  const gg = Math.round(hue2rgb(p2, q2, h) * 255)
  const bb = Math.round(hue2rgb(p2, q2, h - 1/3) * 255)

  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`
}

export default function BotIrisAvatar({ avatarId, size = 120, accentColor = '#ff2a4d' }: BotIrisAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Normalize accentColor to valid 7-char hex
  const safeColor = useMemo(() => {
    if (!accentColor || !/^#[0-9a-fA-F]{6}$/i.test(accentColor)) return '#ff2a4d'
    return accentColor
  }, [accentColor])

  // Subtle per-eye variation — color is the main differentiator, structure stays consistent.
  const dna = useMemo(() => {
    const h = hashCode(avatarId)
    return {
      pupilScale: 0.30 + (h % 6) * 0.018,  // 0.30–0.39 pupil size
      fiberCount: 56 + (h % 4) * 8,        // iris fiber density
      rotDir: h % 2 === 0 ? 1 : -1,        // fiber drift direction
      breatheSpeed: 0.5 + (h % 5) * 0.12,  // pupil breathing rate
      fiberSeed: (h % 100) / 100,          // fiber rotation offset
    }
  }, [avatarId])

  const secondaryColor = useMemo(() => shiftHue(safeColor, 180), [safeColor])
  const tertiaryColor = useMemo(() => shiftHue(safeColor, 90), [safeColor])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    
    // Scale context so internal coordinates are always 120x120
    const baseSize = 120
    const scaleFactor = (size * dpr) / baseSize
    ctx.scale(scaleFactor, scaleFactor)

    let animId: number
    let t = 0

    const cx = baseSize / 2
    const cy = baseSize / 2
    const maxR = baseSize * 0.46

    // Precompute color variants for the iris
    const irisLight = shade(safeColor, 0.28)
    const irisDeep = shade(safeColor, -0.45)
    const irisEdge = shade(safeColor, -0.68)

    const render = () => {
      t += 0.006
      ctx.clearRect(0, 0, baseSize, baseSize)

      const irisR = maxR * 0.92
      const breathe = 1 + Math.sin(t * dna.breatheSpeed) * 0.05
      const pupilR = irisR * dna.pupilScale * breathe

      // ─── 1. AMBIENT GLOW ───
      const glow = ctx.createRadialGradient(cx, cy, irisR * 0.4, cx, cy, maxR * 1.15)
      glow.addColorStop(0, safeColor + '22')
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, baseSize, baseSize)

      // ─── 2. EYEBALL SOCKET ───
      const socket = ctx.createRadialGradient(cx, cy, irisR * 0.8, cx, cy, maxR)
      socket.addColorStop(0, '#0a0a0a')
      socket.addColorStop(1, '#000000')
      ctx.beginPath()
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2)
      ctx.fillStyle = socket
      ctx.fill()

      // ─── 3. IRIS BASE (depth gradient) ───
      const iris = ctx.createRadialGradient(cx, cy, pupilR * 0.7, cx, cy, irisR)
      iris.addColorStop(0, irisDeep)        // darker near pupil
      iris.addColorStop(0.30, safeColor)
      iris.addColorStop(0.62, irisLight)    // brightest mid-band
      iris.addColorStop(0.85, safeColor)
      iris.addColorStop(1, irisEdge)        // dark limbal edge
      ctx.beginPath()
      ctx.arc(cx, cy, irisR, 0, Math.PI * 2)
      ctx.fillStyle = iris
      ctx.fill()

      // ─── 4. IRIS FIBERS (radial texture, soft) ───
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(t * 0.02 * dna.rotDir + dna.fiberSeed * Math.PI * 2)
      for (let i = 0; i < dna.fiberCount; i++) {
        const a = (i / dna.fiberCount) * Math.PI * 2
        const light = i % 2 === 0
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * pupilR * 1.05, Math.sin(a) * pupilR * 1.05)
        ctx.lineTo(Math.cos(a) * irisR * 0.97, Math.sin(a) * irisR * 0.97)
        ctx.lineWidth = light ? 1.1 : 0.7
        ctx.strokeStyle = light ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.16)'
        ctx.stroke()
      }
      ctx.restore()

      // ─── 5. LIMBAL RING (dark outer edge — key realism) ───
      ctx.beginPath()
      ctx.arc(cx, cy, irisR, 0, Math.PI * 2)
      ctx.lineWidth = 2.5
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'
      ctx.stroke()
      // subtle accent rim just inside
      ctx.beginPath()
      ctx.arc(cx, cy, irisR * 0.93, 0, Math.PI * 2)
      ctx.lineWidth = 1
      ctx.strokeStyle = irisLight + '66'
      ctx.stroke()

      // ─── 6. PUPIL ───
      const pupilGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pupilR)
      pupilGrad.addColorStop(0, '#000000')
      pupilGrad.addColorStop(0.82, '#000000')
      pupilGrad.addColorStop(1, shade(safeColor, -0.6))
      ctx.beginPath()
      ctx.arc(cx, cy, pupilR, 0, Math.PI * 2)
      ctx.fillStyle = pupilGrad
      ctx.fill()
      // glowing pupil rim
      ctx.shadowBlur = 12
      ctx.shadowColor = safeColor
      ctx.beginPath()
      ctx.arc(cx, cy, pupilR, 0, Math.PI * 2)
      ctx.lineWidth = 1.4
      ctx.strokeStyle = safeColor + 'aa'
      ctx.stroke()
      ctx.shadowBlur = 0

      // ─── 7. CATCHLIGHT (the "alive" highlight) ───
      const clx = cx - maxR * 0.24
      const cly = cy - maxR * 0.26
      const cl = ctx.createRadialGradient(clx, cly, 0, clx, cly, maxR * 0.30)
      cl.addColorStop(0, 'rgba(255,255,255,0.85)')
      cl.addColorStop(0.5, 'rgba(255,255,255,0.18)')
      cl.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(clx, cly, maxR * 0.30, 0, Math.PI * 2)
      ctx.fillStyle = cl
      ctx.fill()
      // tiny secondary glint
      ctx.beginPath()
      ctx.arc(cx + pupilR * 0.45, cy + pupilR * 0.55, maxR * 0.04, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.fill()

      animId = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animId)
  }, [avatarId, size, safeColor, dna, secondaryColor, tertiaryColor])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'block',
      }}
    />
  )
}
