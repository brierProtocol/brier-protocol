'use client'

import { useEffect, useRef } from 'react'
import BlackHoleVault from '@/components/ui/BlackHoleVault'

/**
 * CTA final para builders: "Create a bot. Sharpen its edge. Open a vault."
 * Fondo full-space con red dots (canvas 2D, ligero) + el vault como agujero negro 3D flotante
 * (Open Coffer: cofre abierto al que el agujero negro vierte capital). Inglés, Inter, sin guiones.
 */
export default function CreateBotSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = canvas.getContext('2d')!
    let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio, 2)

    interface Dot { x: number; y: number; vx: number; vy: number; r: number; red: boolean; a: number; tw: number }
    let dots: Dot[] = []

    const build = () => {
      W = wrap.clientWidth; H = wrap.clientHeight
      canvas.width = W * dpr; canvas.height = H * dpr
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.min(150, Math.floor((W * H) / 9000))
      dots = []
      for (let i = 0; i < n; i++) {
        const red = Math.random() < 0.32
        dots.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
          r: red ? 1.3 + Math.random() * 1.6 : 0.6 + Math.random() * 1.0,
          red, a: 0.2 + Math.random() * 0.6, tw: Math.random() * Math.PI * 2,
        })
      }
    }
    build()

    // glow pre-renderizado: evita ctx.shadowBlur por partícula por frame (carísimo)
    const makeGlow = (r: number, g: number, b: number) => {
      const S = 24
      const c = document.createElement('canvas'); c.width = c.height = S
      const gx = c.getContext('2d')!
      const grd = gx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
      grd.addColorStop(0, `rgba(${r},${g},${b},1)`)
      grd.addColorStop(0.4, `rgba(${r},${g},${b},0.5)`)
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
      gx.fillStyle = grd; gx.fillRect(0, 0, S, S)
      return c
    }
    const redGlow = makeGlow(255, 42, 77)

    let raf = 0, t = 0, visible = true
    const frame = () => {
      if (!visible) return
      t += 0.016
      ctx.clearRect(0, 0, W, H)
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy
        if (d.x < 0) d.x = W; if (d.x > W) d.x = 0
        if (d.y < 0) d.y = H; if (d.y > H) d.y = 0
        const tw = 0.6 + 0.4 * Math.sin(t * 1.5 + d.tw)
        if (d.red) {
          const sz = (d.r + 5) * 2
          ctx.globalAlpha = d.a * tw
          ctx.drawImage(redGlow, d.x - sz / 2, d.y - sz / 2, sz, sz)
          ctx.globalAlpha = 1
        } else {
          ctx.beginPath()
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,255,255,${d.a * tw * 0.8})`
          ctx.fill()
        }
      }
      raf = requestAnimationFrame(frame)
    }
    if (reduceMotion) { ctx.clearRect(0, 0, W, H) } else frame()

    // pausa fuera de viewport
    const io = new IntersectionObserver((es) => {
      const on = es[0].isIntersecting
      if (on && !visible && !reduceMotion) { visible = true; frame() }
      else if (!on) { visible = false; cancelAnimationFrame(raf) }
    }, { threshold: 0 })
    io.observe(wrap)

    const onResize = () => build()
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('resize', onResize) }
  }, [])

  return (
    <section ref={wrapRef} className="relative bg-[#030303] border-t border-[#111] overflow-hidden pt-16 pb-20 px-6">
      {/* polvo rojo de marca, de fondo de toda la seccion */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <div className="font-mono text-[11px] tracking-[0.28em] uppercase text-primary mt-10 mb-3">for builders</div>

        {/* el vault: cofre + agujero negro. El embudo de succion ocupa toda la pagina (lienzo a
            pantalla completa) y es lento. El cofre conserva su tamano de siempre */}
        <BlackHoleVault cover revealOnScroll />

        <h2 className="-mt-2 m-0 font-sans font-extrabold tracking-[-0.045em] leading-[1.04] text-[clamp(32px,6vw,72px)]">
          Create a bot<span className="text-primary">.</span><br />
          Sharpen its edge<span className="text-primary">.</span><br />
          Open a vault<span className="text-primary">.</span>
        </h2>
        <p className="mt-8 mx-auto max-w-md text-[15px] md:text-[16px] leading-relaxed text-[#9a9a9a]">
          No capital of your own. Just an edge on Polymarket, proven in the open. The sharper your
          calibration, the more capital your vault attracts.
        </p>
      </div>
    </section>
  )
}
