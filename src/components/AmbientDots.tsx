'use client'

import { useEffect, useRef } from 'react'

/**
 * Ambiente global: un campo sutil de puntos rojos y blancos que flota detrás de toda la app.
 * Canvas 2D ligero (pocos puntos, opacidad baja) para que de atmosfera sin cargar la página.
 * Se monta una sola vez en el layout. pointer-events-none, no interfiere con nada.
 */
export default function AmbientDots() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')!
    let W = 0, H = 0
    const dpr = Math.min(window.devicePixelRatio, 2)

    interface Dot { x: number; y: number; vx: number; vy: number; r: number; red: boolean; a: number; tw: number }
    let dots: Dot[] = []

    const build = () => {
      W = window.innerWidth; H = window.innerHeight
      canvas.width = W * dpr; canvas.height = H * dpr
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // densidad baja: no cargado
      const n = Math.min(90, Math.floor((W * H) / 26000))
      dots = []
      for (let i = 0; i < n; i++) {
        const red = Math.random() < 0.34
        dots.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12,
          r: red ? 1.0 + Math.random() * 1.4 : 0.5 + Math.random() * 0.9,
          red, a: red ? 0.14 + Math.random() * 0.32 : 0.1 + Math.random() * 0.28,
          tw: Math.random() * Math.PI * 2,
        })
      }
    }
    build()

    let raf = 0, t = 0
    const frame = () => {
      t += 0.016
      ctx.clearRect(0, 0, W, H)
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy
        if (d.x < -4) d.x = W + 4; if (d.x > W + 4) d.x = -4
        if (d.y < -4) d.y = H + 4; if (d.y > H + 4) d.y = -4
        const tw = 0.65 + 0.35 * Math.sin(t * 1.3 + d.tw)
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        if (d.red) {
          ctx.fillStyle = `rgba(255,42,77,${d.a * tw})`
          ctx.shadowColor = 'rgba(255,42,77,0.7)'; ctx.shadowBlur = 5
        } else {
          ctx.fillStyle = `rgba(255,255,255,${d.a * tw})`
          ctx.shadowBlur = 0
        }
        ctx.fill()
      }
      ctx.shadowBlur = 0
      raf = requestAnimationFrame(frame)
    }
    frame()

    const onResize = () => build()
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-20" aria-hidden="true" />
}
