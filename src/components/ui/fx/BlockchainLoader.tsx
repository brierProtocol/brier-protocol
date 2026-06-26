'use client'

import { useEffect, useRef, useState } from 'react'

export default function BlockchainLoader({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width = 640
    const H = canvas.height = 320

    const RED = '#ff2a4d'
    const WHITE = '#ffffff'
    const BLOCK_W = 58
    const BLOCK_H = 38
    const N = 6
    const CX = W / 2
    const CY = H / 2 - 10

    let start: number | null = null
    let raf = 0

    const hexes = ['4a1f', '9c2e', '1b7d', 'e05a', '3f88', 'c712']
    const blockNums = hexes.map((_, i) => 418 + i)

    function easeInOut(t: number) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    }

    function blockPos(i: number, progress: number) {
      const frac = i / (N - 1)
      const angle = Math.PI + Math.PI * frac
      const arcR = 200
      const startX = CX + arcR * Math.cos(angle)
      const startY = CY + 50 * Math.sin(frac * Math.PI)
      const targetX = CX + (frac - 0.5) * N * (BLOCK_W + 12)
      const targetY = CY - 18
      const e = easeInOut(Math.min(1, progress))
      return {
        x: startX + (targetX - startX) * e,
        y: startY + (targetY - startY) * e,
      }
    }

    function drawBlock(x: number, y: number, i: number, t: number, alpha: number) {
      ctx.save()
      ctx.globalAlpha = alpha

      const isLast = i === N - 1
      ctx.fillStyle = '#060606'
      ctx.strokeStyle = isLast ? RED : 'rgba(255,255,255,0.14)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.rect(x - BLOCK_W / 2, y - BLOCK_H / 2, BLOCK_W, BLOCK_H)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '7px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`#${blockNums[i]}`, x, y - 7)

      ctx.fillStyle = isLast ? RED : 'rgba(255,255,255,0.85)'
      ctx.font = '8.5px "JetBrains Mono", monospace'
      ctx.fillText(`0x${hexes[i]}`, x, y + 6)

      const glow = 0.5 + 0.5 * Math.sin(t * 3.5 + i * 0.9)
      ctx.globalAlpha = alpha * 0.18 * glow
      ctx.strokeStyle = isLast ? RED : 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.rect(x - BLOCK_W / 2 - 4, y - BLOCK_H / 2 - 4, BLOCK_W + 8, BLOCK_H + 8)
      ctx.stroke()

      ctx.restore()
    }

    function drawConnector(x1: number, y1: number, x2: number, y2: number, t: number, idx: number, alpha: number) {
      if (alpha < 0.05) return
      ctx.save()
      ctx.globalAlpha = alpha * 0.3
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth = 0.5
      ctx.setLineDash([3, 6])
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      ctx.setLineDash([])

      const pt = ((t * 0.55 + idx * 0.25) % 1)
      const px = x1 + (x2 - x1) * pt
      const py = y1 + (y2 - y1) * pt
      ctx.globalAlpha = alpha * 0.85
      ctx.fillStyle = RED
      ctx.beginPath()
      ctx.arc(px, py, 2.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    function drawStars(t: number) {
      const stars = [
        [40, 25], [190, 50], [390, 22], [550, 65], [75, 195],
        [505, 205], [620, 155], [330, 268], [145, 285], [510, 275],
        [280, 30], [460, 180], [90, 130], [580, 120],
      ]
      ctx.save()
      stars.forEach(([sx, sy], i) => {
        const b = 0.15 + 0.12 * Math.sin(t * 1.1 + i * 1.9)
        ctx.globalAlpha = b
        ctx.fillStyle = WHITE
        ctx.beginPath()
        ctx.arc(sx, sy, 0.9, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.restore()
    }

    function drawBrierReveal(t: number, progress: number) {
      if (progress < 0.88) return
      const a = Math.min(1, (progress - 0.88) / 0.12)
      ctx.save()
      ctx.globalAlpha = a

      const pulse = 0.5 + 0.5 * Math.sin(t * 4)
      ctx.strokeStyle = RED
      ctx.lineWidth = 0.5
      ctx.globalAlpha = a * 0.15 * pulse
      ctx.beginPath()
      ctx.arc(CX, CY + 50, 36, 0, Math.PI * 2)
      ctx.stroke()

      ctx.globalAlpha = a
      ctx.font = '800 28px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = WHITE
      ctx.letterSpacing = '-1px'
      ctx.fillText('Brier', CX - 10, CY + 58)
      ctx.fillStyle = RED
      ctx.fillText('.', CX + 36, CY + 58)
      ctx.restore()
    }

    function frame(ts: number) {
      if (!start) start = ts
      const elapsed = (ts - start) / 1000
      const TOTAL = 3.0
      const progress = Math.min(1, elapsed / TOTAL)

      ctx.clearRect(0, 0, W, H)
      drawStars(elapsed)

      const positions = Array.from({ length: N }, (_, i) => blockPos(i, progress))

      for (let i = 0; i < N - 1; i++) {
        const p = positions[i]
        const q = positions[i + 1]
        const alpha = Math.min(1, progress * N * 0.8)
        drawConnector(p.x + BLOCK_W / 2, p.y, q.x - BLOCK_W / 2, q.y, elapsed, i, alpha)
      }

      positions.forEach((p, i) => {
        const revealDelay = i / N * 0.6
        const a = Math.min(1, Math.max(0, (progress - revealDelay) * 3))
        drawBlock(p.x, p.y, i, elapsed, a)
      })

      drawBrierReveal(elapsed, progress)

      if (progress < 1) {
        raf = requestAnimationFrame(frame)
      } else {
        setTimeout(() => {
          setFading(true)
          setTimeout(onDone, 600)
        }, 400)
      }
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [onDone])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#030303]"
      style={{
        transition: 'opacity 0.6s ease',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', maxWidth: '100%' }}
      />
    </div>
  )
}
