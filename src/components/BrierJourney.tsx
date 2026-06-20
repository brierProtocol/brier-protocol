'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/**
 * The Brier Stack: escena isométrica estructural (cámara ortográfica). Pilares en grid sobre
 * una plataforma sobria (poco rojo, solo el pilar activo brilla). Un punto 3D (el punto de Brier)
 * flota sobre el pilar activo. Solo se muestra el label del pilar activo, así nada se solapa.
 * La descripción se conecta al pilar activo con una leader line real (proyección 3D a pantalla).
 * Se asienta en etapas discretas con el scroll. Inglés, Inter, sin guiones.
 */

const RED = 0xff2a4d
const REDL = 0xff5570
const WHITE = 0xffffff

// pilares en grid; el orden es el recorrido que sigue el punto
const PILLARS = [
  { label: 'Deploy', h: 2.0, gx: -3.0, gz: -1.2 },
  { label: 'Shadow', h: 2.7, gx: -1.4, gz: 1.0 },
  { label: 'Brier Score', h: 3.2, gx: 0.4, gz: -1.4 },
  { label: 'Vault', h: 3.7, gx: 2.0, gz: 0.6 },
  { label: 'Earn', h: 4.2, gx: 3.4, gz: -0.9 },
]
const NP = PILLARS.length

const STAGE_NOTES = [
  { title: 'Deploy', text: 'Submit your algorithm with a wallet signature. No capital of your own. Brier runs it through the shadow phase.' },
  { title: 'Shadow', text: 'Brier scores every prediction against reality, confirming the bot works and measuring its true Brier Score.' },
  { title: 'Brier Score', text: 'A proper scoring rule that cannot be gamed. Lower is better, and the whole record is public.' },
  { title: 'Vault', text: 'Pass the bar (100 resolved predictions, Brier 0.20 or lower, over 21 days) and a non custodial vault opens.' },
  { title: 'Earn', text: 'Profits split automatically: 60 to depositors, 30 to you, 10 to the protocol. Better calibration attracts more capital.' },
]

export default function BrierJourney() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const noteRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<SVGLineElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const progRef = useRef(0)
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const sec = sectionRef.current
      if (!sec) return
      const rect = sec.getBoundingClientRect()
      const total = rect.height - window.innerHeight
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0
      progRef.current = p
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
    const FR = 6.4
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-FR * (W / H), FR * (W / H), FR, -FR, -50, 100)
    camera.position.set(9, 8, 9)
    camera.lookAt(0, 1.2, 0)

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H, false)

    scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const key = new THREE.DirectionalLight(0xffffff, 0.5); key.position.set(5, 10, 7); scene.add(key)
    const dotLight = new THREE.PointLight(REDL, 1.0, 8); scene.add(dotLight)

    const stack = new THREE.Group()
    scene.add(stack)

    // ── plataforma base (sobria, casi sin rojo) ──
    const baseGeo = new THREE.BoxGeometry(8.4, 0.5, 5.6)
    const base = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ color: 0x0d0e12, metalness: 0.35, roughness: 0.7 }))
    base.position.y = -0.25; stack.add(base)
    stack.add(new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo), new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.1 })))

    interface Pillar { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; cap: THREE.Mesh; capMat: THREE.MeshStandardMaterial; edge: THREE.LineBasicMaterial; full: number; gx: number; gz: number }
    const pillars: Pillar[] = []
    PILLARS.forEach((pl) => {
      const w = 0.95
      const geo = new THREE.BoxGeometry(w, 1, w); geo.translate(0, 0.5, 0)
      const mat = new THREE.MeshStandardMaterial({ color: 0x191a20, metalness: 0.2, roughness: 0.65, transparent: true, opacity: 0.85, emissive: RED, emissiveIntensity: 0.0 })
      const mesh = new THREE.Mesh(geo, mat); mesh.position.set(pl.gx, 0, pl.gz); mesh.scale.y = 0.001; stack.add(mesh)
      const edge = new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.16 })
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge))
      const capMat = new THREE.MeshStandardMaterial({ color: 0x26272e, emissive: RED, emissiveIntensity: 0.0, metalness: 0.4, roughness: 0.4 })
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, 0.13, w * 1.04), capMat); stack.add(cap)
      pillars.push({ mesh, mat, cap, capMat, edge, full: pl.h, gx: pl.gx, gz: pl.gz })
    })

    // ── el punto de Brier (esfera 3D con halo) ──
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 24, 24),
      new THREE.MeshStandardMaterial({ color: RED, emissive: RED, emissiveIntensity: 1.1, metalness: 0.2, roughness: 0.3 }),
    )
    stack.add(dot)
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 20, 20),
      new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending }),
    )
    stack.add(halo)

    const projV = new THREE.Vector3()
    let f = 0, raf = 0, displayCur = 0, lastStage = -1
    const frame = () => {
      f += 0.016
      const targetStage = Math.round(progRef.current * (NP - 1))
      displayCur += (targetStage - displayCur) * 0.14
      const activeStage = Math.round(displayCur)

      pillars.forEach((p, i) => {
        const reached = displayCur >= i - 0.5
        const h = reached ? p.full : 0.001
        p.mesh.scale.y += (h - p.mesh.scale.y) * 0.16
        const lit = activeStage === i
        // solo el activo en rojo; los demas gris sobrio
        p.mat.emissiveIntensity += ((lit ? 0.5 : 0) - p.mat.emissiveIntensity) * 0.12
        const col = lit ? 0x2a1116 : 0x191a20
        ;(p.mat.color as THREE.Color).lerp(new THREE.Color(col), 0.12)
        p.mat.opacity += ((reached ? 0.95 : 0.3) - p.mat.opacity) * 0.12
        p.edge.color.lerp(new THREE.Color(lit ? RED : WHITE), 0.12)
        p.edge.opacity += ((lit ? 0.8 : reached ? 0.25 : 0.1) - p.edge.opacity) * 0.12
        p.capMat.emissiveIntensity += ((lit ? 0.85 : 0) - p.capMat.emissiveIntensity) * 0.12
        ;(p.capMat.color as THREE.Color).lerp(new THREE.Color(lit ? RED : 0x26272e), 0.12)
        p.cap.position.set(p.gx, p.mesh.scale.y + 0.07, p.gz)
        p.cap.visible = p.mesh.scale.y > 0.1
      })

      // punto sobre el pilar activo (salta suave entre pilares)
      const a = Math.floor(displayCur), b = Math.min(NP - 1, a + 1), tt = displayCur - a
      const dx = pillars[a].gx + (pillars[b].gx - pillars[a].gx) * tt
      const dz = pillars[a].gz + (pillars[b].gz - pillars[a].gz) * tt
      const arc = Math.sin(tt * Math.PI) * 0.5
      const dy = Math.max(pillars[a].mesh.scale.y, pillars[b].mesh.scale.y) + 0.55 + arc + Math.sin(f * 2) * 0.06
      dot.position.set(dx, dy, dz)
      halo.position.copy(dot.position)
      halo.scale.setScalar(1 + 0.14 * Math.sin(f * 3.5))
      dot.getWorldPosition(projV); dotLight.position.copy(projV)

      // ── leader line real: de la nota al tope del pilar activo (proyeccion 3D -> pantalla) ──
      const ap = pillars[activeStage]
      projV.set(ap.gx, ap.mesh.scale.y + 0.25, ap.gz)
      projV.project(camera)
      const px = (projV.x * 0.5 + 0.5) * W
      const py = (-projV.y * 0.5 + 0.5) * H
      if (dotRef.current) { dotRef.current.setAttribute('cx', String(px)); dotRef.current.setAttribute('cy', String(py)) }
      if (lineRef.current && noteRef.current) {
        const nr = noteRef.current.getBoundingClientRect()
        const cr = canvas.getBoundingClientRect()
        const ax = nr.right - cr.left
        const ay = nr.top - cr.top + 14
        lineRef.current.setAttribute('x1', String(ax)); lineRef.current.setAttribute('y1', String(ay))
        lineRef.current.setAttribute('x2', String(px)); lineRef.current.setAttribute('y2', String(py))
      }
      if (activeStage !== lastStage) { lastStage = activeStage; setStage(activeStage) }

      renderer.render(scene, camera)
    }
    const loop = () => { raf = requestAnimationFrame(loop); frame() }
    if (reduceMotion) frame(); else loop()

    const onResize = () => {
      W = window.innerWidth; H = window.innerHeight
      camera.left = -FR * (W / H); camera.right = FR * (W / H); camera.top = FR; camera.bottom = -FR
      camera.updateProjectionMatrix(); renderer.setSize(W, H, false)
      if (reduceMotion) frame()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
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

  const note = STAGE_NOTES[stage]

  return (
    <section ref={sectionRef} className="relative bg-[#040404] border-t border-[#111]" style={{ height: '440vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute top-[10vh] left-0 right-0 text-center px-6 z-10 pointer-events-none">
          <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-primary mb-3">the stack</div>
          <h2 className="m-0 font-sans font-extrabold tracking-[-0.04em] text-[clamp(30px,5vw,58px)]">
            <span className="text-white">Brier<span className="text-primary">.</span></span> <span className="text-white">stack</span>
          </h2>
        </div>

        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* leader line real (se conecta a la cima del pilar activo) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" aria-hidden="true">
          <line ref={lineRef} x1="0" y1="0" x2="0" y2="0" stroke="rgba(255,42,77,0.55)" strokeWidth="1" />
          <circle ref={dotRef} cx="0" cy="0" r="3" fill="#ff2a4d" />
        </svg>

        {/* descripcion, conectada por la leader line al pilar activo */}
        <div ref={noteRef} className="absolute left-6 md:left-12 bottom-[16vh] max-w-[290px] z-20">
          <div key={`n-${stage}`} style={{ animation: 'fadeIn 0.5s ease' }}>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary mb-1.5">{note.title}</div>
            <div className="text-[13px] md:text-[14px] leading-relaxed text-[#cfcfcf]">{note.text}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
