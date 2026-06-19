'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Cadena de bloques 3D literal para la sección "Everything is on-chain".
 * Cuatro bloques encadenados (Deploy → Shadow → Vault → Earn) con paquetes de datos
 * que fluyen de uno al siguiente, como una blockchain pasando estado hacia Brier.
 * Los textos explicativos van debajo, alineados con cada bloque.
 * Paleta: negro / blanco / rojo #ff2a4d. Three.js (npm), { ssr: false }.
 */

const RED = 0xff2a4d
const WHITE = 0xffffff

const BLOCKS = [
  { tag: '#01', title: 'Deploy', body: 'Connect a wallet and ship your prediction bot. Free, in minutes.' },
  { tag: '#02', title: 'Shadow', body: 'Seven days of paper trading, every call scored against reality.' },
  { tag: '#03', title: 'Vault', body: 'Prove your accuracy and a non custodial vault opens for you.' },
  { tag: '#04', title: 'Earn', body: 'Real capital flows in. Profits split between you and depositors.' },
]
const N = BLOCKS.length

export default function BlockchainStrip() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let cw = wrap.clientWidth
    let ch = wrap.clientHeight

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, cw / ch, 0.1, 100)
    camera.position.set(0, 0.4, 9)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(cw, ch, false)

    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const p = new THREE.PointLight(RED, 1.2); p.position.set(2, 3, 5); scene.add(p)

    const group = new THREE.Group()
    scene.add(group)

    const SPAN = 7.2
    const xOf = (i: number) => -SPAN / 2 + (SPAN / (N - 1)) * i

    // bloques
    interface Blk { core: THREE.Mesh; wire: THREE.LineSegments; mat: THREE.MeshStandardMaterial; x: number }
    const blocks: Blk[] = []
    for (let i = 0; i < N; i++) {
      const x = xOf(i)
      const geo = new THREE.BoxGeometry(1.15, 1.15, 1.15)
      const mat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, emissive: RED, emissiveIntensity: 0.05, metalness: 0.4, roughness: 0.5 })
      const core = new THREE.Mesh(geo, mat)
      core.position.set(x, 0, 0)
      group.add(core)
      const wire = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: i % 2 ? RED : WHITE, transparent: true, opacity: 0.6 }),
      )
      core.add(wire)
      blocks.push({ core, wire, mat, x })
    }

    // conexiones entre bloques + paquetes de datos
    interface Link { line: THREE.Line; packet: THREE.Mesh; t: number; from: number }
    const links: Link[] = []
    for (let i = 0; i < N - 1; i++) {
      const x0 = xOf(i) + 0.6, x1 = xOf(i + 1) - 0.6
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0, 0, 0), new THREE.Vector3(x1, 0, 0)])
      const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.25 }))
      group.add(line)
      const packet = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 10, 10),
        new THREE.MeshBasicMaterial({ color: RED }),
      )
      group.add(packet)
      links.push({ line, packet, t: i * 0.25, from: i })
    }

    // parallax
    let tmx = 0, tmy = 0, mx = 0, my = 0
    const onMove = (e: MouseEvent) => {
      const r = wrap.getBoundingClientRect()
      tmx = ((e.clientX - r.left) / r.width) * 2 - 1
      tmy = ((e.clientY - r.top) / r.height) * 2 - 1
    }
    wrap.addEventListener('mousemove', onMove)

    let f = 0
    let raf = 0
    let active = 0
    let lastBeat = 0

    const frame = () => {
      f += 0.016

      mx += (tmx - mx) * 0.05
      my += (tmy - my) * 0.05
      group.rotation.y = -0.35 + mx * 0.25
      group.rotation.x = 0.12 + my * 0.12

      blocks.forEach((b, i) => {
        b.core.rotation.y += 0.004
        b.core.position.y = Math.sin(f * 1.1 + i) * 0.05
        const on = i === active
        b.mat.emissiveIntensity += ((on ? 0.5 : 0.05) - b.mat.emissiveIntensity) * 0.08
        ;(b.wire.material as THREE.LineBasicMaterial).opacity += ((on ? 0.95 : 0.55) - (b.wire.material as THREE.LineBasicMaterial).opacity) * 0.08
        b.core.scale.setScalar(on ? 1.08 : 1)
      })

      // paquetes fluyen de bloque a bloque; el bloque que recibe se enciende
      for (const l of links) {
        l.t += 0.006
        if (l.t > 1) { l.t -= 1; active = (l.from + 1) % N; lastBeat = f }
        const x0 = xOf(l.from) + 0.6, x1 = xOf(l.from + 1) - 0.6
        l.packet.position.set(x0 + (x1 - x0) * l.t, Math.sin(f * 1.1 + l.from) * 0.05, 0)
        ;(l.packet.material as THREE.MeshBasicMaterial).color.setHex(RED)
      }
      // ciclo de activación al primer bloque al reiniciar
      if (f - lastBeat > 1.6) { active = 0; lastBeat = f }

      renderer.render(scene, camera)
    }

    const loop = () => { raf = requestAnimationFrame(loop); frame() }
    if (reduceMotion) frame(); else loop()

    const onResize = () => {
      cw = wrap.clientWidth; ch = wrap.clientHeight
      camera.aspect = cw / ch; camera.updateProjectionMatrix()
      renderer.setSize(cw, ch, false)
      if (reduceMotion) frame()
    }
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
      <div ref={wrapRef} className="relative w-full" style={{ height: 'clamp(220px, 32vw, 360px)' }}>
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#141414] border border-[#141414] mt-6">
        {BLOCKS.map((b) => (
          <div key={b.tag} className="bg-[#060606] p-6 hover:bg-[#080808] transition-colors">
            <div className="font-mono text-[10px] text-primary tracking-widest mb-2">{b.tag}</div>
            <h3 className="m-0 font-sans font-bold text-[17px] tracking-tight mb-2">{b.title}</h3>
            <p className="m-0 text-[13px] leading-relaxed text-[#888]">{b.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
