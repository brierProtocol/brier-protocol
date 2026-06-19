'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/**
 * The Brier Stack: escena isométrica 3D que cobra vida con el SCROLL de la página.
 * Cuatro torres ascendentes cuentan el recorrido del bot: Deploy, Shadow, Vault, Earn.
 * Cada torre se eleva e ilumina en su turno; la estrella de Brier las recorre mostrando
 * cómo se mueve la información. Labels bien separados, paleta sobria. Inglés, Inter.
 */

const RED = 0xff2a4d
const REDL = 0xff5570
const WHITE = 0xffffff

const TOWERS = [
  { label: 'Deploy', sub: 'ship your bot', h: 1.9, gx: -3.3 },
  { label: 'Shadow', sub: '7 day audition', h: 2.6, gx: -1.1 },
  { label: 'Vault', sub: 'capital opens', h: 3.3, gx: 1.1 },
  { label: 'Earn', sub: 'profits split', h: 4.0, gx: 3.3 },
]
const NT = TOWERS.length

const SIDE_NOTES = [
  { at: 0.12, side: 'left', text: 'Deploy your bot and let it predict in the shadows. No capital at risk yet.' },
  { at: 0.55, side: 'left', text: 'Clear the bar and a non custodial vault opens. Anyone can deposit into vaults.' },
  { at: 0.82, side: 'right', text: 'Real capital follows the math. The better you predict, the more you earn.' },
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
    const camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 100)
    camera.position.set(0, 5.4, 12.5)
    camera.lookAt(0, 1.7, 0)

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H, false)

    scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const key = new THREE.DirectionalLight(0xffffff, 0.5); key.position.set(3, 8, 6); scene.add(key)
    const starLight = new THREE.PointLight(REDL, 0.9, 7); scene.add(starLight)

    const stack = new THREE.Group()
    scene.add(stack)

    // sombra de contacto suave
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 3.4),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = -0.02
    stack.add(shadow)

    // línea base que conecta el recorrido (flujo)
    const railGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(TOWERS[0].gx, 0.02, 0), new THREE.Vector3(TOWERS[NT - 1].gx, 0.02, 0),
    ])
    stack.add(new THREE.Line(railGeo, new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.25 })))

    function makeLabel(label: string, sub: string) {
      const c = document.createElement('canvas'); c.width = 420; c.height = 150
      const x = c.getContext('2d')!
      x.fillStyle = '#ffffff'; x.font = '700 52px Inter, system-ui, sans-serif'
      x.textAlign = 'center'; x.textBaseline = 'middle'
      x.fillText(label, 210, 52)
      x.fillStyle = '#ff5570'; x.font = '400 26px Inter, system-ui, sans-serif'
      x.fillText(sub, 210, 108)
      const t = new THREE.CanvasTexture(c); t.anisotropy = 4
      return t
    }

    interface Tower { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; cap: THREE.Mesh; capMat: THREE.MeshStandardMaterial; edge: THREE.LineBasicMaterial; sprite: THREE.Sprite; full: number; gx: number }
    const towers: Tower[] = []
    TOWERS.forEach((t) => {
      const w = 1.0
      const geo = new THREE.BoxGeometry(w, 1, w); geo.translate(0, 0.5, 0)
      const mat = new THREE.MeshStandardMaterial({ color: 0x14151c, metalness: 0.3, roughness: 0.55, transparent: true, opacity: 0.92, emissive: RED, emissiveIntensity: 0.04 })
      const mesh = new THREE.Mesh(geo, mat); mesh.position.set(t.gx, 0, 0); mesh.scale.y = 0.001
      stack.add(mesh)
      const edge = new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.2 })
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge))
      // tapa de acento
      const capGeo = new THREE.BoxGeometry(w * 1.02, 0.12, w * 1.02)
      const capMat = new THREE.MeshStandardMaterial({ color: 0x333, emissive: RED, emissiveIntensity: 0.1, metalness: 0.4, roughness: 0.4 })
      const cap = new THREE.Mesh(capGeo, capMat); stack.add(cap)
      // label
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeLabel(t.label, t.sub), transparent: true, depthTest: false, opacity: 0 }))
      sprite.scale.set(2.5, 0.9, 1); stack.add(sprite)
      towers.push({ mesh, mat, cap, capMat, edge, sprite, full: t.h, gx: t.gx })
    })

    // estrella de Brier
    const sh = new THREE.Shape()
    const spk = 4, ro = 0.3, ri = 0.095
    for (let i = 0; i <= spk * 2; i++) { const r = i % 2 === 0 ? ro : ri; const a = (i / (spk * 2)) * Math.PI * 2 - Math.PI / 2; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y) }
    const sg = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 }); sg.center()
    const star = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: RED, emissive: RED, emissiveIntensity: 0.95, metalness: 0.3, roughness: 0.3 }))
    stack.add(star)
    star.add(new THREE.LineSegments(new THREE.EdgesGeometry(sg), new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.9 })))

    let tmx = 0, mx = 0
    const onMove = (e: MouseEvent) => { tmx = (e.clientX / window.innerWidth) * 2 - 1 }
    window.addEventListener('mousemove', onMove)

    const v = new THREE.Vector3()
    let f = 0, raf = 0
    const frame = () => {
      f += 0.016
      const p = progRef.current
      mx += (tmx - mx) * 0.04
      stack.rotation.y = -0.32 + mx * 0.2
      stack.rotation.x = 0.04

      towers.forEach((t, i) => {
        const start = (i / NT) * 0.8
        const local = Math.min(1, Math.max(0, (p - start) / 0.22))
        const h = Math.max(0.001, local * t.full)
        t.mesh.scale.y += (h - t.mesh.scale.y) * 0.12
        const lit = local > 0.55
        t.mat.emissiveIntensity += ((lit ? 0.35 : 0.04) - t.mat.emissiveIntensity) * 0.1
        t.mat.opacity += ((lit ? 1 : 0.55) - t.mat.opacity) * 0.1
        t.edge.opacity += ((lit ? 0.7 : 0.18) - t.edge.opacity) * 0.1
        t.capMat.emissiveIntensity += ((lit ? 0.7 : 0.08) - t.capMat.emissiveIntensity) * 0.1
        t.cap.position.set(t.gx, t.mesh.scale.y + 0.06, 0)
        t.cap.visible = t.mesh.scale.y > 0.1
        t.sprite.position.set(t.gx, t.mesh.scale.y + 0.7, 0)
        ;(t.sprite.material as THREE.SpriteMaterial).opacity += ((local > 0.6 ? 1 : 0) - (t.sprite.material as THREE.SpriteMaterial).opacity) * 0.1
      })

      // estrella recorre las torres subiendo
      const fi = p * (NT - 1)
      const a = Math.floor(fi), b = Math.min(NT - 1, a + 1), tt = fi - a
      const sx = towers[a].gx + (towers[b].gx - towers[a].gx) * tt
      const sy = Math.max(towers[a].mesh.scale.y, towers[b].mesh.scale.y) + 0.85 + Math.sin(f * 2) * 0.1
      star.position.set(sx, sy, 0)
      star.rotation.z += 0.03
      star.getWorldPosition(v); starLight.position.copy(v)

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
    <section ref={sectionRef} className="relative bg-[#040404] border-t border-[#111]" style={{ height: '340vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute top-[12vh] left-0 right-0 text-center px-6 z-10 pointer-events-none">
          <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-primary mb-3">the brier stack</div>
          <h2 className="m-0 font-sans font-extrabold tracking-[-0.04em] text-[clamp(28px,4.5vw,56px)]">
            How your bot starts <span className="text-primary">earning</span>.
          </h2>
        </div>

        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {SIDE_NOTES.map((n, i) => {
          const vis = prog >= n.at - 0.06 && prog <= n.at + 0.24
          return (
            <div
              key={i}
              className={`hidden md:block absolute max-w-[240px] text-[14px] leading-relaxed transition-all duration-500 ${n.side === 'left' ? 'left-10 text-left' : 'right-10 text-right'}`}
              style={{ top: `${42 + i * 14}%`, color: '#cfcfcf', opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(12px)' }}
            >
              {n.text}
            </div>
          )
        })}
      </div>
    </section>
  )
}
