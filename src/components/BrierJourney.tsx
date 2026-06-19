'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/**
 * The Brier Stack: escena isométrica 3D viva (estilo Hyperliquid Stack) que cobra vida
 * con el SCROLL de toda la página (sin barra propia). Las torres del producto se elevan
 * e iluminan en secuencia, los textos aparecen a los lados, y la estrella de Brier viaja
 * por encima mostrando cómo se mueve la información dentro. Inglés, Inter, sin guiones.
 */

const RED = 0xff2a4d
const REDL = 0xff5570
const WHITE = 0xffffff

const TOWERS = [
  { label: 'Agents', h: 2.4, gx: -2, gz: -1 },
  { label: 'Brier Score', h: 3.3, gx: -1, gz: 0.4 },
  { label: 'Shadow Phase', h: 1.9, gx: -1.4, gz: 1.6 },
  { label: 'Vaults', h: 3.7, gx: 0.2, gz: -0.8 },
  { label: 'Leaderboard', h: 2.1, gx: 0.6, gz: 1.2 },
  { label: 'Shadow Market', h: 2.8, gx: 1.6, gz: 0 },
  { label: 'Oracles', h: 1.7, gx: 2.2, gz: -1.4 },
  { label: 'And more', h: 3.0, gx: 2.4, gz: 1.4 },
]
const NT = TOWERS.length

const SIDE_NOTES = [
  { at: 0.12, side: 'left', text: 'Algorithms predict real world markets in the open. Every call is scored against reality.' },
  { at: 0.5, side: 'left', text: 'Prove your accuracy through the shadow phase and a non custodial vault opens for you.' },
  { at: 0.8, side: 'right', text: 'Real capital follows the math. Everything settles on chain, and anyone can verify it.' },
]

export default function BrierJourney() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const progRef = useRef(0)
  const [prog, setProg] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const sec = sectionRef.current
      if (!sec) return
      const rect = sec.getBoundingClientRect()
      const total = rect.height - window.innerHeight
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0
      progRef.current = p
      setProg(p)
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
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100)
    camera.position.set(0, 7.5, 11)
    camera.lookAt(0, 1.4, 0)

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H, false)

    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const key = new THREE.PointLight(RED, 1.3); key.position.set(4, 7, 6); scene.add(key)
    const fill = new THREE.PointLight(0x6688ff, 0.4); fill.position.set(-5, 3, 4); scene.add(fill)

    const stack = new THREE.Group()
    scene.add(stack)

    // plataforma base (la base del protocolo)
    const baseGeo = new THREE.BoxGeometry(6.4, 0.5, 5.2)
    const base = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ color: 0x0c0c10, metalness: 0.4, roughness: 0.6, emissive: RED, emissiveIntensity: 0.04 }))
    base.position.y = -0.25
    stack.add(base)
    stack.add(new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo), new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.12 })))

    function makeLabel(text: string, accent = false) {
      const c = document.createElement('canvas'); c.width = 384; c.height = 80
      const x = c.getContext('2d')!
      x.fillStyle = accent ? '#ff2a4d' : '#ffffff'
      x.font = '700 34px Inter, system-ui, sans-serif'
      x.textBaseline = 'middle'; x.textAlign = 'center'
      x.fillText(text, 192, 44)
      const t = new THREE.CanvasTexture(c); t.anisotropy = 4
      return t
    }

    // torres
    interface Tower { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; edge: THREE.LineBasicMaterial; sprite: THREE.Sprite; full: number; gx: number; gz: number }
    const towers: Tower[] = []
    TOWERS.forEach((t) => {
      const w = 0.78
      const geo = new THREE.BoxGeometry(w, 1, w)
      geo.translate(0, 0.5, 0) // pivote en la base para escalar hacia arriba
      const mat = new THREE.MeshStandardMaterial({ color: 0x14141a, metalness: 0.5, roughness: 0.45, emissive: RED, emissiveIntensity: 0.05, transparent: true, opacity: 0.95 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(t.gx, 0, t.gz)
      mesh.scale.y = 0.001
      stack.add(mesh)
      const edge = new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.25 })
      const eg = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge)
      mesh.add(eg)
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeLabel(t.label), transparent: true, depthTest: false, opacity: 0 }))
      sprite.scale.set(2.3, 0.48, 1)
      stack.add(sprite)
      towers.push({ mesh, mat, edge, sprite, full: t.h, gx: t.gx, gz: t.gz })
    })

    // estrella de Brier (flujo de información)
    const sh = new THREE.Shape()
    const sp = 4, ro = 0.32, ri = 0.1
    for (let i = 0; i <= sp * 2; i++) { const r = i % 2 === 0 ? ro : ri; const a = (i / (sp * 2)) * Math.PI * 2 - Math.PI / 2; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y) }
    const sg = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 }); sg.center()
    const star = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: RED, emissive: RED, emissiveIntensity: 0.9, metalness: 0.3, roughness: 0.3 }))
    stack.add(star)
    star.add(new THREE.LineSegments(new THREE.EdgesGeometry(sg), new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.85 })))
    const starLight = new THREE.PointLight(REDL, 1, 6); scene.add(starLight)

    let tmx = 0, tmy = 0, mx = 0, my = 0
    const onMove = (e: MouseEvent) => { tmx = (e.clientX / window.innerWidth) * 2 - 1; tmy = (e.clientY / window.innerHeight) * 2 - 1 }
    window.addEventListener('mousemove', onMove)

    const v = new THREE.Vector3()
    let f = 0, raf = 0
    const frame = () => {
      f += 0.016
      const p = progRef.current

      mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04
      stack.rotation.y = -0.5 + mx * 0.25 + Math.sin(f * 0.1) * 0.04
      stack.rotation.x = 0.02 + my * 0.06

      // torres se elevan e iluminan en secuencia con el scroll
      towers.forEach((t, i) => {
        const start = i / NT * 0.85
        const local = Math.min(1, Math.max(0, (p - start) / 0.18))
        const targetScale = Math.max(0.001, local * t.full)
        t.mesh.scale.y += (targetScale - t.mesh.scale.y) * 0.12
        t.mat.emissiveIntensity += ((local > 0.6 ? 0.45 : 0.05) - t.mat.emissiveIntensity) * 0.1
        t.edge.opacity += ((local > 0.6 ? 0.8 : 0.22) - t.edge.opacity) * 0.1
        // label flota encima de la torre
        t.sprite.position.set(t.gx, t.mesh.scale.y + 0.45, t.gz)
        ;(t.sprite.material as THREE.SpriteMaterial).opacity += ((local > 0.7 ? 1 : 0) - (t.sprite.material as THREE.SpriteMaterial).opacity) * 0.1
      })

      // estrella viaja por encima de las torres (flujo)
      const fi = p * (NT - 1)
      const a = Math.floor(fi), b = Math.min(NT - 1, a + 1), tt = fi - a
      const ta = towers[a], tb = towers[b]
      const sx = ta.gx + (tb.gx - ta.gx) * tt
      const sz = ta.gz + (tb.gz - ta.gz) * tt
      const sy = Math.max(ta.mesh.scale.y, tb.mesh.scale.y) + 0.9 + Math.sin(f * 2) * 0.12
      star.position.set(sx, sy, sz)
      star.rotation.z += 0.03
      star.getWorldPosition(v); starLight.position.copy(v)

      camera.position.y += ((7.5) - camera.position.y) * 0.05
      renderer.render(scene, camera)
    }
    const loop = () => { raf = requestAnimationFrame(loop); frame() }
    if (reduceMotion) frame(); else loop()

    const onResize = () => { W = window.innerWidth; H = window.innerHeight; camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H, false); if (reduceMotion) frame() }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
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
    <section ref={sectionRef} className="relative bg-[#040404] border-t border-[#111]" style={{ height: '360vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* título */}
        <div className="absolute top-[12vh] left-0 right-0 text-center px-6 z-10 pointer-events-none">
          <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-primary mb-3">the brier stack</div>
          <h2 className="m-0 font-sans font-extrabold tracking-[-0.04em] text-[clamp(28px,4.5vw,56px)]">
            How your bot starts <span className="text-primary">earning</span>.
          </h2>
        </div>

        {/* escena 3D viva */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* notas laterales que aparecen con el scroll */}
        {SIDE_NOTES.map((n, i) => {
          const vis = prog >= n.at - 0.06 && prog <= n.at + 0.22
          return (
            <div
              key={i}
              className={`hidden md:block absolute max-w-[230px] text-[14px] leading-relaxed transition-all duration-500 ${n.side === 'left' ? 'left-8 text-left' : 'right-8 text-right'}`}
              style={{
                top: `${38 + i * 16}%`,
                color: '#cfcfcf',
                opacity: vis ? 1 : 0,
                transform: vis ? 'translateY(0)' : 'translateY(12px)',
              }}
            >
              {n.text}
            </div>
          )
        })}
      </div>
    </section>
  )
}
