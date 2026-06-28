'use client'

import { useEffect, useRef } from 'react'

/**
 * Nebulosa de fondo: polvo estelar rojo y blanco en cúmulos (canvas 2D ligero) para vestir
 * una sección concreta. Las partículas se agrupan en núcleos gaussianos (aspecto de nube) y
 * derivan suave con twinkle. Una viñeta central deja libre el centro para que NO tape el texto.
 * Se contiene al tamaño del contenedor padre (relative). pointer-events-none. Sin guiones.
 */
export default function NebulaBackdrop({ className = '' }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')!
    let W = 0, H = 0
    const dpr = Math.min(window.devicePixelRatio, 2)

    // gaussiana aproximada (suma de uniformes) para densificar hacia el nucleo
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5

    interface P { x: number; y: number; vx: number; vy: number; r: number; red: boolean; a: number; tw: number }
    let ps: P[] = []

    const build = () => {
      W = wrap.clientWidth; H = wrap.clientHeight
      canvas.width = W * dpr; canvas.height = H * dpr
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.min(240, Math.floor((W * H) / 7200))
      // dos cumulos a los lados: dejan el centro mas despejado (donde va el texto)
      const cores = [{ x: W * 0.24, y: H * 0.44, s: Math.min(W, H) * 0.55 }, { x: W * 0.78, y: H * 0.6, s: Math.min(W, H) * 0.5 }]
      ps = []
      for (let i = 0; i < n; i++) {
        const c = cores[Math.floor(Math.random() * cores.length)]
        const x = c.x + gauss() * c.s
        const y = c.y + gauss() * c.s * 0.7
        const red = Math.random() < 0.42
        ps.push({
          x, y,
          vx: (Math.random() - 0.5) * 0.1, vy: (Math.random() - 0.5) * 0.1,
          r: red ? 1.0 + Math.random() * 1.8 : 0.5 + Math.random() * 1.1,
          red, a: red ? 0.16 + Math.random() * 0.4 : 0.12 + Math.random() * 0.34,
          tw: Math.random() * Math.PI * 2,
        })
      }
    }
    build()

    let raf = 0, t = 0
    const frame = () => {
      t += 0.016
      ctx.clearRect(0, 0, W, H)
      for (const p of ps) {
        p.x += p.vx; p.y += p.vy
        if (p.x < -6) p.x = W + 6; if (p.x > W + 6) p.x = -6
        if (p.y < -6) p.y = H + 6; if (p.y > H + 6) p.y = -6
        const tw = 0.6 + 0.4 * Math.sin(t * 1.4 + p.tw)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        if (p.red) {
          ctx.fillStyle = `rgba(255,42,77,${p.a * tw})`
          ctx.shadowColor = 'rgba(255,42,77,0.8)'; ctx.shadowBlur = 7
        } else {
          ctx.fillStyle = `rgba(255,255,255,${p.a * tw})`
          ctx.shadowColor = 'rgba(255,255,255,0.5)'; ctx.shadowBlur = 4
        }
        ctx.fill()
      }
      ctx.shadowBlur = 0
      raf = requestAnimationFrame(frame)
    }
    frame()

    const onResize = () => build()
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(() => build())
    ro.observe(wrap)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); ro.disconnect() }
  }, [])

  return (
    <div ref={wrapRef} className={`pointer-events-none ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* viñeta central: mantiene el centro despejado para que el texto se lea */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 52% 60% at 50% 50%, rgba(5,5,5,0.9) 0%, rgba(5,5,5,0.5) 38%, transparent 72%)' }}
      />
    </div>
  )
}
