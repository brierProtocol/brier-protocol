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

    // Glow pre-renderizado una sola vez. Antes cada partícula usaba shadowBlur por
    // frame (lo más caro de canvas 2D); ahora es un drawImage de un sprite con gradiente.
    const makeGlow = (r: number, g: number, b: number) => {
      const S = 32
      const c = document.createElement('canvas'); c.width = c.height = S
      const gx = c.getContext('2d')!
      const grd = gx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
      grd.addColorStop(0, `rgba(${r},${g},${b},1)`)
      grd.addColorStop(0.35, `rgba(${r},${g},${b},0.55)`)
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
      gx.fillStyle = grd; gx.fillRect(0, 0, S, S)
      return c
    }
    const redGlow = makeGlow(255, 42, 77)
    const whiteGlow = makeGlow(255, 255, 255)

    let raf = 0, t = 0, visible = true
    const frame = () => {
      if (!visible) return
      t += 0.016
      ctx.clearRect(0, 0, W, H)
      for (const p of ps) {
        p.x += p.vx; p.y += p.vy
        if (p.x < -6) p.x = W + 6; if (p.x > W + 6) p.x = -6
        if (p.y < -6) p.y = H + 6; if (p.y > H + 6) p.y = -6
        const tw = 0.6 + 0.4 * Math.sin(t * 1.4 + p.tw)
        const d = (p.r + (p.red ? 6 : 3)) * 2
        ctx.globalAlpha = p.a * tw
        ctx.drawImage(p.red ? redGlow : whiteGlow, p.x - d / 2, p.y - d / 2, d, d)
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }
    frame()

    // pausa fuera de viewport
    const io = new IntersectionObserver((es) => {
      const on = es[0].isIntersecting
      if (on && !visible) { visible = true; frame() }
      else if (!on) { visible = false; cancelAnimationFrame(raf) }
    }, { threshold: 0 })
    io.observe(wrap)

    const onResize = () => build()
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(() => build())
    ro.observe(wrap)
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('resize', onResize); ro.disconnect() }
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
