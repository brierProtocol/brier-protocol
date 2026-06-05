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

  // Derive unique visual DNA from avatarId
  const dna = useMemo(() => {
    const h = hashCode(avatarId)
    return {
      rings: 2 + (h % 3),              // 2-4 orbital rings
      ticks: 24 + (h % 24),            // 24-48 tick marks
      particleCount: 6 + (h % 8),      // 6-14 particles
      orbitTilt: (h % 60) - 30,        // -30° to +30° tilt
      rotDir: h % 2 === 0 ? 1 : -1,   // CW or CCW
      pulseSpeed: 0.8 + (h % 4) * 0.3, // 0.8-2.0
      arcSegments: 3 + (h % 4),        // 3-6 gradient arcs
      coreStyle: h % 3,                // 0=solid, 1=ring, 2=diamond
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
    const maxR = baseSize * 0.44

    const render = () => {
      t += 0.012
      ctx.clearRect(0, 0, baseSize, baseSize)

      // ─── 1. BACKGROUND LENS HOUSING ───
      // A dark, deep socket for the robotic eye to sit in
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.1)
      bgGrad.addColorStop(0, safeColor + '20')
      bgGrad.addColorStop(0.7, '#030303')
      bgGrad.addColorStop(1, '#000000')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, baseSize, baseSize)

      // ─── 2. OUTER MECHANICAL CHASSIS ───
      ctx.save()
      ctx.translate(cx, cy)
      
      // Solid outer rim
      ctx.beginPath()
      ctx.arc(0, 0, maxR * 0.95, 0, Math.PI * 2)
      ctx.lineWidth = 1.5
      ctx.strokeStyle = safeColor + '60'
      ctx.stroke()

      // Inner dashed calibration ring
      ctx.beginPath()
      ctx.arc(0, 0, maxR * 0.85, 0, Math.PI * 2)
      ctx.setLineDash([3, 8])
      ctx.lineWidth = 1
      ctx.strokeStyle = safeColor + '40'
      ctx.stroke()
      ctx.setLineDash([])
      
      // Rotating outer focus notches
      ctx.rotate(t * 0.1 * dna.rotDir)
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2
        ctx.beginPath()
        ctx.arc(0, 0, maxR * 0.95, angle, angle + 0.2)
        ctx.lineWidth = 3
        ctx.strokeStyle = safeColor + 'aa'
        ctx.stroke()
      }
      ctx.restore()

      // ─── 3. THE AI SENSOR CORE (ROBOTIC EYE) ───
      ctx.save()
      ctx.translate(cx, cy)
      const pulse = 1 + Math.sin(t * dna.pulseSpeed) * 0.05
      const coreR = maxR * 0.45 * pulse
      
      // Deep shadow for the core
      ctx.shadowBlur = 25
      ctx.shadowColor = safeColor

      if (dna.coreStyle === 0) {
        // TYPE A: THE APERTURE (Hexagonal shutter)
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + t * 0.2
          const px = Math.cos(angle) * coreR
          const py = Math.sin(angle) * coreR
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.lineWidth = 2
        ctx.strokeStyle = safeColor + 'cc'
        ctx.stroke()

        // Glowing center optic
        ctx.beginPath()
        ctx.arc(0, 0, coreR * 0.4, 0, Math.PI * 2)
        ctx.fillStyle = safeColor
        ctx.fill()
        
        ctx.shadowBlur = 0
        ctx.beginPath()
        ctx.arc(0, 0, coreR * 0.15, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()

      } else if (dna.coreStyle === 1) {
        // TYPE B: THE SCANNER (Radar/Laser eye)
        ctx.beginPath()
        ctx.arc(0, 0, coreR * 0.8, 0, Math.PI * 2)
        ctx.lineWidth = 2
        ctx.strokeStyle = safeColor + '50'
        ctx.stroke()
        
        // Sweeping scanner laser
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.cos(t * dna.rotDir * 2) * coreR * 0.8, Math.sin(t * dna.rotDir * 2) * coreR * 0.8)
        ctx.lineWidth = 2.5
        ctx.strokeStyle = safeColor
        ctx.stroke()

        // Core diode
        ctx.beginPath()
        ctx.arc(0, 0, coreR * 0.35, 0, Math.PI * 2)
        ctx.fillStyle = secondaryColor || '#ffffff'
        ctx.fill()

      } else {
        // TYPE C: THE HAL NODE (Classic concentric glowing AI eye)
        const nodeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * 0.8)
        nodeGrad.addColorStop(0, '#ffffff')
        nodeGrad.addColorStop(0.3, safeColor)
        nodeGrad.addColorStop(1, safeColor + '10')
        
        ctx.beginPath()
        ctx.arc(0, 0, coreR * 0.8, 0, Math.PI * 2)
        ctx.fillStyle = nodeGrad
        ctx.fill()
        
        ctx.beginPath()
        ctx.arc(0, 0, coreR * 0.8, 0, Math.PI * 2)
        ctx.lineWidth = 1.5
        ctx.strokeStyle = safeColor + '80'
        ctx.stroke()
      }
      
      ctx.shadowBlur = 0
      ctx.restore()

      // ─── 4. HUD DATA ARCS (Inner mechanical tracking) ───
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(t * 0.4 * dna.rotDir)
      
      for (let i = 0; i < dna.arcSegments; i++) {
        const startAngle = (i / dna.arcSegments) * Math.PI * 2
        const sweep = (Math.PI * 2 / dna.arcSegments) * 0.3
        const radius = maxR * 0.65
        
        ctx.beginPath()
        ctx.arc(0, 0, radius, startAngle, startAngle + sweep)
        ctx.lineWidth = 2.5
        ctx.lineCap = 'butt' // Hard mechanical edges
        ctx.strokeStyle = safeColor + '90'
        ctx.stroke()
      }
      ctx.restore()

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
