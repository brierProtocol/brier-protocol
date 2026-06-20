'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Everything is on-chain: cadena de bloques 3D de cristal, tridimensional de verdad.
 * Bloques translúcidos encadenados, con un núcleo de datos brillando dentro y paquetes
 * que fluyen de un bloque al siguiente. Sin texto recargado adentro: solo el objeto 3D.
 * Una leyenda mínima debajo nombra las etapas. Paleta negro / blanco / rojo #ff2a4d.
 */

const RED = 0xff2a4d
const REDL = 0xff5570
const WHITE = 0xffffff

const STAGES = ['prediction', 'resolution', 'score', 'vault']
const N = STAGES.length

export default function BlockchainStrip() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let cw = wrap.clientWidth, ch = wrap.clientHeight
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, cw / ch, 0.1, 100)
    camera.position.set(2.4, 2.0, 9)
    camera.lookAt(0, -0.1, 0)

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(cw, ch, false)

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const key = new THREE.PointLight(RED, 1.4); key.position.set(3, 4, 6); scene.add(key)
    const rim = new THREE.PointLight(0x5577ff, 0.5); rim.position.set(-5, -2, 3); scene.add(rim)

    const group = new THREE.Group()
    scene.add(group)

    const SPAN = 7.4
    const xOf = (i: number) => -SPAN / 2 + (SPAN / (N - 1)) * i
    const SIZE = 1.7

    interface Blk { glass: THREE.Mesh; gmat: THREE.MeshPhysicalMaterial; wire: THREE.LineSegments; wmat: THREE.LineBasicMaterial; core: THREE.Mesh; cmat: THREE.MeshStandardMaterial; x: number }
    const blocks: Blk[] = []
    for (let i = 0; i < N; i++) {
      const x = xOf(i)
      const geo = new THREE.BoxGeometry(SIZE, SIZE, SIZE)
      // cristal
      const gmat = new THREE.MeshPhysicalMaterial({
        color: 0x0e0e14, metalness: 0, roughness: 0.15, transmission: 0.9, thickness: 1.2,
        transparent: true, opacity: 0.55, ior: 1.3, clearcoat: 1, clearcoatRoughness: 0.2,
      })
      const glass = new THREE.Mesh(geo, gmat); glass.position.set(x, 0, 0); group.add(glass)
      // edges luminosos
      const wmat = new THREE.LineBasicMaterial({ color: i % 2 ? RED : WHITE, transparent: true, opacity: 0.65 })
      const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geo), wmat); glass.add(wire)
      // núcleo de datos (sin texto), gira dentro del cristal
      const cmat = new THREE.MeshStandardMaterial({ color: RED, emissive: RED, emissiveIntensity: 0.8, metalness: 0.4, roughness: 0.3 })
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(SIZE * 0.26, 0), cmat); core.position.set(x, 0, 0); group.add(core)
      blocks.push({ glass, gmat, wire, wmat, core, cmat, x })
    }

    // conexiones + paquetes que fluyen
    interface Link { packet: THREE.Mesh; t: number; from: number }
    const links: Link[] = []
    for (let i = 0; i < N - 1; i++) {
      const x0 = xOf(i) + SIZE / 2, x1 = xOf(i + 1) - SIZE / 2
      group.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0, 0, 0), new THREE.Vector3(x1, 0, 0)]),
        new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.3 }),
      ))
      const packet = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), new THREE.MeshBasicMaterial({ color: REDL }))
      group.add(packet)
      links.push({ packet, t: i * 0.25, from: i })
    }

    let tmx = 0, tmy = 0, mx = 0, my = 0
    const onMove = (e: MouseEvent) => { const r = wrap.getBoundingClientRect(); tmx = ((e.clientX - r.left) / r.width) * 2 - 1; tmy = ((e.clientY - r.top) / r.height) * 2 - 1 }
    wrap.addEventListener('mousemove', onMove)

    let f = 0, raf = 0, active = 0, lastBeat = 0
    const frame = () => {
      f += 0.016
      mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05
      group.rotation.y = -0.25 + mx * 0.3
      group.rotation.x = 0.1 + my * 0.12

      blocks.forEach((b, i) => {
        b.core.rotation.y += 0.02; b.core.rotation.x += 0.012
        const dy = Math.sin(f * 1.0 + i) * 0.06
        b.glass.position.y = dy; b.core.position.y = dy
        b.glass.rotation.y += 0.002
        const on = i === active
        b.cmat.emissiveIntensity += ((on ? 1.4 : 0.7) - b.cmat.emissiveIntensity) * 0.08
        b.core.scale.setScalar(on ? 1.25 : 1)
        b.wmat.opacity += ((on ? 1 : 0.55) - b.wmat.opacity) * 0.08
        b.gmat.opacity += ((on ? 0.7 : 0.5) - b.gmat.opacity) * 0.08
      })

      for (const l of links) {
        l.t += 0.006
        if (l.t > 1) { l.t -= 1; active = (l.from + 1) % N; lastBeat = f }
        const x0 = xOf(l.from) + SIZE / 2, x1 = xOf(l.from + 1) - SIZE / 2
        l.packet.position.set(x0 + (x1 - x0) * l.t, Math.sin(f * 1.0 + l.from) * 0.06, 0)
      }
      if (f - lastBeat > 1.6) { active = 0; lastBeat = f }

      renderer.render(scene, camera)
    }
    const loop = () => { raf = requestAnimationFrame(loop); frame() }
    if (reduceMotion) frame(); else loop()

    const onResize = () => { cw = wrap.clientWidth; ch = wrap.clientHeight; camera.aspect = cw / ch; camera.updateProjectionMatrix(); renderer.setSize(cw, ch, false); if (reduceMotion) frame() }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      wrap.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', onResize)
      scene.traverse((obj) => {
        const o = obj as THREE.Mesh
        if (o.geometry) o.geometry.dispose()
        const mat = (o as THREE.Mesh).material
        if (mat) { if (Array.isArray(mat)) mat.forEach((m) => m.dispose()); else mat.dispose() }
      })
      renderer.dispose()
    }
  }, [])

  return (
    <div>
      <div ref={wrapRef} className="relative w-full" style={{ height: 'clamp(320px, 44vw, 520px)' }}>
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>
      {/* leyenda mínima de etapas */}
      <div className="flex items-center justify-center gap-3 md:gap-6 mt-6 font-mono text-[10px] md:text-[11px] tracking-[0.18em] uppercase text-[#777]">
        {STAGES.map((s, i) => (
          <div key={s} className="flex items-center gap-3 md:gap-6">
            <span>{s}</span>
            {i < N - 1 && <span className="text-primary/50">→</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
