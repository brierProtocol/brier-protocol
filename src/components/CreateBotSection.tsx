'use client'

import { useEffect, useRef } from 'react'

/**
 * CTA final para builders: "Create a bot. Sharpen its edge. Open a vault."
 * Fondo full-space con red dots (canvas 2D, ligero, sin Three.js extra) que cubren la
 * página y flotan suave. Inglés, Inter, sin guiones.
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

    let raf = 0, t = 0
    const frame = () => {
      t += 0.016
      ctx.clearRect(0, 0, W, H)
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy
        if (d.x < 0) d.x = W; if (d.x > W) d.x = 0
        if (d.y < 0) d.y = H; if (d.y > H) d.y = 0
        const tw = 0.6 + 0.4 * Math.sin(t * 1.5 + d.tw)
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        if (d.red) {
          ctx.fillStyle = `rgba(255,42,77,${d.a * tw})`
          ctx.shadowColor = 'rgba(255,42,77,0.8)'; ctx.shadowBlur = 6
        } else {
          ctx.fillStyle = `rgba(255,255,255,${d.a * tw * 0.8})`
          ctx.shadowBlur = 0
        }
        ctx.fill()
      }
      ctx.shadowBlur = 0
      raf = requestAnimationFrame(frame)
    }
    if (reduceMotion) { ctx.clearRect(0, 0, W, H) } else frame()

    const onResize = () => build()
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])

  return (
    <section ref={wrapRef} className="relative bg-[#030303] border-t border-[#111] overflow-hidden py-44 px-6">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />
      {/* viñeta para legibilidad */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(3,3,3,0.7) 0%, rgba(3,3,3,0.2) 45%, transparent 75%)' }} />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <div className="font-mono text-[11px] tracking-[0.28em] uppercase text-primary mb-6">for builders</div>
        <h2 className="m-0 font-sans font-extrabold tracking-[-0.045em] leading-[1.04] text-[clamp(32px,6vw,72px)]">
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
