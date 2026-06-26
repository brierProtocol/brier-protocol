'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import * as THREE from 'three'

/**
 * SupernovaScroll: una estrella 3D controlada por el scroll que ademas ABRE el cierre de la pagina.
 *  - Fase 0 (colapso): el punto se comprime y brilla.
 *  - Fase 1 (estallido): explota en miles de particulas de polvo estelar ("A whole galaxy of capital").
 *  - Fase 2 (manifiesto): la galaxia explotada PERSISTE de fondo y sobre ella aparece "Calibration
 *    first" (el cierre). Asi la explosion cubre toda la seccion final sin tapar el texto.
 * Todo es scrubbed por el scroll: si subes, se revierte. Ingles, Inter, sin guiones.
 */

const HOT = 0xffe9d2
const ORANGE = 0xff6a3d
const RED = 0xff2a4d

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

export default function SupernovaScroll() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const progRef = useRef(0)
  const [phase, setPhase] = useState(0) // 0 colapso · 1 estallido · 2 manifiesto

  // progreso de scroll dentro de la seccion (0 arriba, 1 abajo)
  useEffect(() => {
    const onScroll = () => {
      const sec = sectionRef.current
      if (!sec) return
      const rect = sec.getBoundingClientRect()
      const total = rect.height - window.innerHeight
      progRef.current = total > 0 ? clamp01(-rect.top / total) : 0
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let W = window.innerWidth, H = window.innerHeight
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 100)
    camera.position.set(0, 0, 9)
    camera.lookAt(0, 0, 0)
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H, false)

    // ── fondo de estrellas lejano ──
    const SKY = 360
    const skyPos = new Float32Array(SKY * 3)
    for (let i = 0; i < SKY; i++) {
      const r = 16 + Math.random() * 22, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1)
      skyPos[i * 3] = r * Math.sin(ph) * Math.cos(th)
      skyPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th)
      skyPos[i * 3 + 2] = r * Math.cos(ph)
    }
    const skyGeo = new THREE.BufferGeometry()
    skyGeo.setAttribute('position', new THREE.BufferAttribute(skyPos, 3))
    const sky = new THREE.Points(skyGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.5, depthWrite: false }))
    scene.add(sky)

    // ── nucleo de la estrella (punto brillante que se comprime) ──
    const dust = new THREE.Group(); scene.add(dust)
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 32), new THREE.MeshBasicMaterial({ color: HOT, transparent: true, opacity: 1, blending: THREE.AdditiveBlending }))
    dust.add(core)
    const coreGlow = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 24), new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }))
    dust.add(coreGlow)

    // onda de choque (anillo billboard que se expande al estallar)
    const shock = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 96), new THREE.MeshBasicMaterial({ color: HOT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }))
    scene.add(shock)

    // ── polvo estelar: miles de particulas con direccion y distancia propias ──
    const N = 4200
    const SPREAD = 17
    const pos = new Float32Array(N * 3)
    const col = new Float32Array(N * 3)
    const dir = new Float32Array(N * 3)
    const dist = new Float32Array(N)
    const ph0 = new Float32Array(N)
    const cHot = new THREE.Color(HOT), cOra = new THREE.Color(ORANGE), cRed = new THREE.Color(RED)
    for (let i = 0; i < N; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u)
      dir[i * 3] = s * Math.cos(th); dir[i * 3 + 1] = s * Math.sin(th); dir[i * 3 + 2] = u
      const d = 0.12 + Math.pow(Math.random(), 0.7) * 0.88
      dist[i] = d
      ph0[i] = Math.random() * Math.PI * 2
      const c = new THREE.Color().copy(cHot).lerp(cOra, clamp01(d * 1.5)).lerp(cRed, clamp01(d * 1.4 - 0.45))
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const dustMat = new THREE.PointsMaterial({ size: 0.075, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    const points = new THREE.Points(geo, dustMat)
    dust.add(points)

    let raf = 0, last = performance.now(), visible = true, lastPhase = -1
    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const t = now / 1000
      const p = progRef.current

      // colapso (0 -> 0.3), explosion (0.28 -> 0.62) y luego HOLD: la galaxia persiste de fondo
      const collapse = clamp01(p / 0.3)
      const E = easeOut(clamp01((p - 0.28) / 0.34)) // 1 = expansion total (se mantiene en fase 2)

      const coreScale = (1 - 0.86 * collapse) * (1 - E)
      core.scale.setScalar(Math.max(0.0001, coreScale))
      ;(core.material as THREE.MeshBasicMaterial).opacity = (0.6 + 0.4 * collapse) * (1 - E)
      coreGlow.scale.setScalar(Math.max(0.0001, (0.7 + 0.7 * (1 - collapse)) * (1 - E) + 0.0001))
      ;(coreGlow.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - E)

      // onda de choque: pico al inicio del estallido, luego se desvanece
      const shockE = clamp01((p - 0.28) / 0.18)
      shock.position.set(0, 0, 0)
      shock.quaternion.copy(camera.quaternion)
      shock.scale.setScalar(0.4 + easeOut(shockE) * 9)
      ;(shock.material as THREE.MeshBasicMaterial).opacity = 0.5 * shockE * (1 - shockE)

      // polvo: posicion = direccion * distancia * expansion, con turbulencia viva (sigue viva en fase 2)
      for (let i = 0; i < N; i++) {
        const r = dist[i] * E * SPREAD
        const tb = E > 0.001 ? Math.sin(t * 0.6 + ph0[i]) * 0.2 * dist[i] : 0
        pos[i * 3] = dir[i * 3] * (r + tb)
        pos[i * 3 + 1] = dir[i * 3 + 1] * (r + tb)
        pos[i * 3 + 2] = dir[i * 3 + 2] * (r + tb)
      }
      geo.attributes.position.needsUpdate = true
      dustMat.opacity = clamp01(E * 1.3) * (1 - 0.2 * E)

      dust.rotation.y += dt * 0.025
      sky.rotation.y += dt * 0.006

      const ph = p < 0.3 ? 0 : p < 0.6 ? 1 : 2
      if (ph !== lastPhase) { lastPhase = ph; setPhase(ph) }

      renderer.render(scene, camera)
      if (visible && !reduceMotion) raf = requestAnimationFrame(render)
    }
    if (reduceMotion) render(performance.now())
    else raf = requestAnimationFrame(render)

    const io = new IntersectionObserver((es) => {
      const on = es[0].isIntersecting
      if (on && !visible && !reduceMotion) { visible = true; last = performance.now(); raf = requestAnimationFrame(render) }
      else if (!on) { visible = false; cancelAnimationFrame(raf) }
    }, { threshold: 0 })
    io.observe(canvas)

    const onResize = () => {
      W = window.innerWidth; H = window.innerHeight
      camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H, false)
      if (reduceMotion) render(performance.now())
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('resize', onResize)
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
        const mat = m.material
        if (mat) { if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat.dispose() }
      })
      renderer.dispose()
    }
  }, [])

  return (
    <section ref={sectionRef} className="relative bg-[#020203] border-t border-[#111]" style={{ height: '380vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* vinneta central: solo en el manifiesto, para leer "Calibration first" sobre la galaxia */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-700"
          style={{ background: 'radial-gradient(ellipse 64% 60% at 50% 50%, rgba(2,2,3,0.88) 0%, rgba(2,2,3,0.5) 42%, transparent 80%)', opacity: phase === 2 ? 1 : 0 }}
        />

        {/* fase 0/1: titular del colapso/estallido, abajo */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-end pb-[16vh] text-center px-6 pointer-events-none transition-opacity duration-700"
          style={{ opacity: phase === 2 ? 0 : 1 }}
        >
          <div className="font-mono text-[11px] tracking-[0.28em] uppercase text-primary mb-4">
            {phase === 1 ? 'capital scatters' : 'pressure builds'}
          </div>
          <h2
            className="m-0 font-sans font-extrabold tracking-[-0.04em] leading-[1.05] text-[clamp(30px,5.5vw,64px)]"
            style={{ textShadow: '0 0 30px rgba(0,0,0,0.7)' }}
          >
            {phase === 1 ? (
              <>A whole galaxy of capital<span className="text-primary">.</span></>
            ) : (
              <>Every edge starts as one point<span className="text-primary">.</span></>
            )}
          </h2>
        </div>

        {/* fase 2: manifiesto de cierre sobre la galaxia persistente */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 transition-opacity duration-700"
          style={{ opacity: phase === 2 ? 1 : 0, pointerEvents: phase === 2 ? 'auto' : 'none' }}
        >
          <div className="font-mono text-[12px] tracking-[0.2em] uppercase text-[#aaa] mb-6">
            No emotion. No insiders. No mercy.
          </div>
          <h2
            className="m-0 font-sans font-extrabold tracking-[-0.04em] leading-[1.05] text-[clamp(36px,6vw,72px)]"
            style={{ textShadow: '0 0 30px rgba(0,0,0,0.8)' }}
          >
            Calibration first<span className="text-primary">.</span>
          </h2>
          <p className="mt-8 mx-auto max-w-xl text-[15px] leading-relaxed text-[#bdbdbd]" style={{ textShadow: '0 0 18px rgba(0,0,0,0.8)' }}>
            The best algorithms climb. The worst sink. The rankings are earned in public,
            settled by reality, and impossible to fake. Welcome to the proving ground.
          </p>
          <Link
            href="/app"
            className="inline-flex mt-12 items-center gap-2 bg-primary text-[#030303] font-sans font-bold text-[14px] px-8 py-3.5 rounded-full transition-all hover:shadow-[0_0_24px_rgba(255,42,77,0.45)] no-underline"
          >
            Launch App →
          </Link>
        </div>
      </div>
    </section>
  )
}
