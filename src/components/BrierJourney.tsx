'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/**
 * The Brier Stack: escena isométrica estructural (cámara ortográfica). Una plataforma base
 * con pilares distribuidos en grid (no en línea), que se elevan e iluminan con el scroll.
 * La estrella de Brier recorre el camino saltando entre pilares. Notas con leader lines
 * apuntan a cada etapa. Se asienta en etapas discretas (presentación). Inglés, Inter.
 */

const RED = 0xff2a4d
const REDL = 0xff5570
const WHITE = 0xffffff

// pilares en grid (no en línea); el orden del array es el recorrido que sigue la estrella
const PILLARS = [
  { label: 'Deploy', h: 2.0, gx: -3.0, gz: -1.2 },
  { label: 'Shadow', h: 2.7, gx: -1.4, gz: 1.0 },
  { label: 'Score', h: 3.2, gx: 0.4, gz: -1.4 },
  { label: 'Vault', h: 3.7, gx: 2.0, gz: 0.6 },
  { label: 'Earn', h: 4.2, gx: 3.4, gz: -0.9 },
]
const NP = PILLARS.length

const STAGE_NOTES = [
  { title: 'Deploy', text: 'Submit your algorithm with a wallet signature. No capital of your own. Brier runs it through the shadow phase.' },
  { title: 'Shadow', text: 'Brier scores every prediction against reality, confirming the bot works and measuring its true Brier Score.' },
  { title: 'Score', text: 'A proper scoring rule that cannot be gamed. Lower is better, and it is all public.' },
  { title: 'Vault', text: 'Pass the bar (100 resolved predictions, Brier 0.20 or lower, over 21 days) and a non custodial vault opens.' },
  { title: 'Earn', text: 'Profits split automatically, 60 to depositors, 30 to you, 10 to the protocol. Better calibration attracts more capital.' },
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
    const FR = 6.4
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-FR * (W / H), FR * (W / H), FR, -FR, -50, 100)
    camera.position.set(9, 8, 9)
    camera.lookAt(0, 1.2, 0)

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H, false)

    scene.add(new THREE.AmbientLight(0xffffff, 0.62))
    const key = new THREE.DirectionalLight(0xffffff, 0.55); key.position.set(5, 10, 7); scene.add(key)
    const starLight = new THREE.PointLight(REDL, 0.8, 8); scene.add(starLight)

    const stack = new THREE.Group()
    scene.add(stack)

    // ── plataforma base (la infraestructura Brier) ──
    const baseGeo = new THREE.BoxGeometry(8.4, 0.5, 5.6)
    const base = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ color: 0x0b0c12, metalness: 0.4, roughness: 0.65, emissive: RED, emissiveIntensity: 0.04 }))
    base.position.y = -0.25; stack.add(base)
    stack.add(new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo), new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.14 })))
    // reflejo/contacto
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 5.6), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }))
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.49; stack.add(shadow)

    function makeLabel(text: string) {
      const c = document.createElement('canvas'); c.width = 320; c.height = 84
      const x = c.getContext('2d')!
      x.fillStyle = '#ffffff'; x.font = '700 44px Inter, system-ui, sans-serif'
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 160, 46)
      const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t
    }

    interface Pillar { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; cap: THREE.Mesh; capMat: THREE.MeshStandardMaterial; edge: THREE.LineBasicMaterial; sprite: THREE.Sprite; full: number; gx: number; gz: number; link: THREE.Line; linkMat: THREE.LineBasicMaterial }
    const pillars: Pillar[] = []
    PILLARS.forEach((pl) => {
      const w = 0.95
      const geo = new THREE.BoxGeometry(w, 1, w); geo.translate(0, 0.5, 0)
      const mat = new THREE.MeshStandardMaterial({ color: 0x15161e, metalness: 0.25, roughness: 0.6, transparent: true, opacity: 0.9, emissive: RED, emissiveIntensity: 0.04 })
      const mesh = new THREE.Mesh(geo, mat); mesh.position.set(pl.gx, 0, pl.gz); mesh.scale.y = 0.001; stack.add(mesh)
      const edge = new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.18 })
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge))
      const capMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, emissive: RED, emissiveIntensity: 0.1, metalness: 0.4, roughness: 0.4 })
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, 0.13, w * 1.04), capMat); stack.add(cap)
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeLabel(pl.label), transparent: true, depthTest: false, opacity: 0 }))
      sprite.scale.set(1.9, 0.5, 1); stack.add(sprite)
      // linea a la base (raiz comun = estructura, no fila)
      const linkMat = new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.0 })
      const link = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(pl.gx, 0, pl.gz), new THREE.Vector3(0, 0, 0)]), linkMat)
      stack.add(link)
      pillars.push({ mesh, mat, cap, capMat, edge, sprite, full: pl.h, gx: pl.gx, gz: pl.gz, link, linkMat })
    })

    // estrella de Brier
    const sh = new THREE.Shape()
    const spk = 4, ro = 0.32, ri = 0.1
    for (let i = 0; i <= spk * 2; i++) { const r = i % 2 === 0 ? ro : ri; const a = (i / (spk * 2)) * Math.PI * 2 - Math.PI / 2; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y) }
    const sg = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 }); sg.center()
    const star = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: RED, emissive: RED, emissiveIntensity: 0.95, metalness: 0.3, roughness: 0.3 }))
    stack.add(star)
    star.add(new THREE.LineSegments(new THREE.EdgesGeometry(sg), new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.9 })))

    const v = new THREE.Vector3()
    let f = 0, raf = 0
    let displayCur = 0
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
        p.mat.emissiveIntensity += ((lit ? 0.34 : 0.04) - p.mat.emissiveIntensity) * 0.12
        p.mat.opacity += ((reached ? (lit ? 1 : 0.7) : 0.35) - p.mat.opacity) * 0.12
        p.edge.opacity += ((lit ? 0.7 : reached ? 0.3 : 0.12) - p.edge.opacity) * 0.12
        p.capMat.emissiveIntensity += ((lit ? 0.7 : 0.08) - p.capMat.emissiveIntensity) * 0.12
        p.linkMat.opacity += ((reached ? 0.14 : 0) - p.linkMat.opacity) * 0.1
        p.cap.position.set(p.gx, p.mesh.scale.y + 0.07, p.gz)
        p.cap.visible = p.mesh.scale.y > 0.1
        p.sprite.position.set(p.gx, p.mesh.scale.y * 0.5 + 0.2, p.gz + 0.6)
        ;(p.sprite.material as THREE.SpriteMaterial).opacity += ((reached ? 1 : 0) - (p.sprite.material as THREE.SpriteMaterial).opacity) * 0.12
      })

      // estrella salta entre pilares (recorrido por el grid, no en linea)
      const a = Math.floor(displayCur), b = Math.min(NP - 1, a + 1), tt = displayCur - a
      const sx = pillars[a].gx + (pillars[b].gx - pillars[a].gx) * tt
      const sz = pillars[a].gz + (pillars[b].gz - pillars[a].gz) * tt
      const arc = Math.sin(tt * Math.PI) * 0.5 // pequeño arco al saltar
      const sy = Math.max(pillars[a].mesh.scale.y, pillars[b].mesh.scale.y) + 0.85 + arc + Math.sin(f * 2) * 0.08
      star.position.set(sx, sy, sz)
      star.rotation.z += 0.03
      star.getWorldPosition(v); starLight.position.copy(v)

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

  const activeStage = Math.min(NP - 1, Math.max(0, Math.round(prog * (NP - 1))))
  const note = STAGE_NOTES[activeStage]

  return (
    <section ref={sectionRef} className="relative bg-[#040404] border-t border-[#111]" style={{ height: '420vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute top-[10vh] left-0 right-0 text-center px-6 z-10 pointer-events-none">
          <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-primary mb-3">the stack</div>
          <h2 className="m-0 font-sans font-extrabold tracking-[-0.04em] text-[clamp(30px,5vw,58px)]">
            <span className="text-white">Brier<span className="text-primary">.</span></span> <span className="text-white">stack</span>
          </h2>
        </div>

        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* nota con leader line, sincronizada con la etapa activa */}
        <div className="absolute left-6 md:left-12 bottom-[14vh] max-w-[300px]">
          <div key={activeStage} style={{ animation: 'fadeIn 0.5s ease' }} className="flex items-start gap-3">
            <div className="hidden md:block w-10 h-px bg-primary/60 mt-2.5 shrink-0" />
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary mb-1.5">{note.title}</div>
              <div className="text-[13px] md:text-[14px] leading-relaxed text-[#cfcfcf]">{note.text}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
