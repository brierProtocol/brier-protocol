'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Fondo 3D del hero: el planeta es Brier. Los nodos grandes son VAULTS conectados al
 * núcleo con flujo de capital; la nube de puntos rojos son los USUARIOS de Brier.
 * Sin líneas de órbita. Movimiento fluido, atmósfera en capas para realismo.
 * Paleta estricta: negro / blanco / rojo Brier (#ff2a4d). Three.js, fondo transparente.
 * Montar siempre vía next/dynamic con { ssr: false }.
 */

const RED = 0xff2a4d
const RED_LIGHT = 0xff5570
const WHITE = 0xffffff

interface Vault {
  mesh: THREE.Mesh
  halo: THREE.Mesh
  R: number
  theta: number
  phi: number
  thetaSpeed: number
  phiSpeed: number
  pos: THREE.Vector3
  flow: THREE.Mesh
  flowT: number
  flowSpeed: number
  conn: THREE.Line
}

export default function PlanetAgentsBackground({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let W = window.innerWidth
    let H = window.innerHeight

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100)
    camera.position.set(0, 1.6, 10)
    camera.lookAt(0, -0.4, 0)

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H, false)

    // ── Estrellas lejanas ──
    const starGeo = new THREE.BufferGeometry()
    const starN = 700
    const starPos = new Float32Array(starN * 3)
    for (let i = 0; i < starN; i++) {
      const r = 15
      const t = Math.acos(2 * Math.random() - 1)
      const f = Math.random() * Math.PI * 2
      starPos[i * 3] = r * Math.sin(t) * Math.cos(f)
      starPos[i * 3 + 1] = r * Math.sin(t) * Math.sin(f)
      starPos[i * 3 + 2] = r * Math.cos(t)
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: WHITE, size: 0.045, transparent: true, opacity: 0.55 }))
    scene.add(stars)

    // ── World group (parallax + offset) ──
    const world = new THREE.Group()
    world.position.y = -0.4
    scene.add(world)

    // ── Núcleo Brier (con atmósfera en capas para glow realista) ──
    const planet = new THREE.Group()
    world.add(planet)
    planet.add(new THREE.Mesh(new THREE.SphereGeometry(1.4, 48, 48), new THREE.MeshBasicMaterial({ color: 0x060606 })))
    // capas de atmósfera
    const atmoLayers: THREE.Mesh[] = []
    const atmoSpecs = [
      { r: 1.55, o: 0.10 },
      { r: 1.78, o: 0.05 },
      { r: 2.1, o: 0.025 },
    ]
    for (const s of atmoSpecs) {
      const a = new THREE.Mesh(
        new THREE.SphereGeometry(s.r, 32, 32),
        new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: s.o, side: THREE.BackSide }),
      )
      planet.add(a)
      atmoLayers.push(a)
    }
    planet.add(new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.46, 2)),
      new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.1 }),
    ))
    // núcleo de recepción que pulsa al recibir flujo
    const coreHalo = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 24, 24),
      new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0, side: THREE.BackSide }),
    )
    planet.add(coreHalo)
    // puntos de superficie (latido)
    const dotsMat = new THREE.PointsMaterial({ color: RED, size: 0.026, transparent: true, opacity: 0.65 })
    const dotGeo = new THREE.BufferGeometry()
    const dotN = 420
    const dotPos = new Float32Array(dotN * 3)
    for (let i = 0; i < dotN; i++) {
      const t = Math.acos(2 * Math.random() - 1)
      const f = Math.random() * Math.PI * 2
      const r = 1.43
      dotPos[i * 3] = r * Math.sin(t) * Math.cos(f)
      dotPos[i * 3 + 1] = r * Math.sin(t) * Math.sin(f)
      dotPos[i * 3 + 2] = r * Math.cos(t)
    }
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3))
    planet.add(new THREE.Points(dotGeo, dotsMat))

    // ── Usuarios (nube de puntos rojos orbitando) ──
    const userN = 90
    const userGeo = new THREE.BufferGeometry()
    const userBase: { r: number; th: number; ph: number; sp: number }[] = []
    const userPos = new Float32Array(userN * 3)
    for (let i = 0; i < userN; i++) {
      const r = 2.6 + Math.random() * 2.6
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      userBase.push({ r, th, ph, sp: (0.04 + Math.random() * 0.08) * (Math.random() < 0.5 ? 1 : -1) })
      userPos[i * 3] = r * Math.sin(ph) * Math.cos(th)
      userPos[i * 3 + 1] = r * Math.cos(ph) * 0.75
      userPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th)
    }
    userGeo.setAttribute('position', new THREE.BufferAttribute(userPos, 3))
    const users = new THREE.Points(userGeo, new THREE.PointsMaterial({ color: RED, size: 0.05, transparent: true, opacity: 0.8 }))
    world.add(users)

    // ── Vaults (nodos grandes conectados al núcleo con flujo) ──
    const VAULT_N = 6
    const vaults: Vault[] = []
    for (let i = 0; i < VAULT_N; i++) {
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.15, 0),
        new THREE.MeshBasicMaterial({ color: i % 2 ? RED : WHITE, transparent: true, opacity: 0.95 }),
      )
      world.add(mesh)
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 14, 14),
        new THREE.MeshBasicMaterial({ color: i % 2 ? RED : WHITE, transparent: true, opacity: 0.07, side: THREE.BackSide }),
      )
      world.add(halo)

      const connGeo = new THREE.BufferGeometry()
      connGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
      const conn = new THREE.Line(connGeo, new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.12 }))
      world.add(conn)

      const flow = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.95 }),
      )
      world.add(flow)

      vaults.push({
        mesh, halo,
        R: 2.7 + Math.random() * 1.2,
        theta: (i / VAULT_N) * Math.PI * 2,
        phi: 0.7 + Math.random() * 1.7,
        thetaSpeed: (0.05 + Math.random() * 0.06) * (Math.random() < 0.5 ? 1 : -1),
        phiSpeed: (0.015 + Math.random() * 0.03) * (Math.random() < 0.5 ? 1 : -1),
        pos: new THREE.Vector3(),
        flow, flowT: Math.random(), flowSpeed: 0.22 + Math.random() * 0.25,
        conn,
      })
    }

    // ── Red entre vaults (constelación) ──
    const maxLinks = (VAULT_N * (VAULT_N - 1)) / 2
    const meshLinkPos = new Float32Array(maxLinks * 6)
    const meshLinkGeo = new THREE.BufferGeometry()
    meshLinkGeo.setAttribute('position', new THREE.BufferAttribute(meshLinkPos, 3))
    const meshLinks = new THREE.LineSegments(meshLinkGeo, new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.07 }))
    world.add(meshLinks)
    const LINK_DIST = 3.0

    // ── Parallax suave ──
    let mx = 0, my = 0, trx = 0, tryy = 0
    const onMove = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth) * 2 - 1
      my = (e.clientY / window.innerHeight) * 2 - 1
    }

    let lastTime = performance.now()
    let elapsed = 0
    let raf = 0
    let coreGlow = 0
    let visible = true

    const renderFrame = () => {
      const now = performance.now()
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      elapsed += dt
      const t = elapsed

      planet.rotation.y += dt * 0.08
      dotsMat.opacity = 0.4 + 0.28 * Math.sin(t * 1.4)
      atmoLayers[0].scale.setScalar(1 + 0.015 * Math.sin(t * 1.1))
      stars.rotation.y += dt * 0.004

      trx += (mx * 0.3 - trx) * 0.035
      tryy += (my * 0.16 - tryy) * 0.035
      world.rotation.y = trx
      world.rotation.x = tryy

      // usuarios orbitando (fluido)
      const up = users.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < userN; i++) {
        const u = userBase[i]
        u.th += u.sp * dt
        up[i * 3] = u.r * Math.sin(u.ph) * Math.cos(u.th)
        up[i * 3 + 1] = u.r * Math.cos(u.ph) * 0.75 + Math.sin(t * 0.5 + i) * 0.04
        up[i * 3 + 2] = u.r * Math.sin(u.ph) * Math.sin(u.th)
      }
      users.geometry.attributes.position.needsUpdate = true

      // vaults + flujo de capital al núcleo
      for (const v of vaults) {
        v.theta += v.thetaSpeed * dt
        v.phi += v.phiSpeed * dt
        v.pos.set(
          v.R * Math.sin(v.phi) * Math.cos(v.theta),
          v.R * Math.cos(v.phi) * 0.7,
          v.R * Math.sin(v.phi) * Math.sin(v.theta),
        )
        v.mesh.position.copy(v.pos)
        v.halo.position.copy(v.pos)
        v.mesh.rotation.x += dt * 0.5
        v.mesh.rotation.y += dt * 0.4

        const cp = v.conn.geometry.attributes.position.array as Float32Array
        cp[0] = v.pos.x; cp[1] = v.pos.y; cp[2] = v.pos.z
        cp[3] = 0; cp[4] = 0; cp[5] = 0
        v.conn.geometry.attributes.position.needsUpdate = true

        v.flowT += v.flowSpeed * dt
        if (v.flowT >= 1) { v.flowT -= 1; coreGlow = 1 }
        const ft = v.flowT
        const e = ft * ft
        v.flow.position.set(v.pos.x * (1 - e), v.pos.y * (1 - e), v.pos.z * (1 - e))
        ;(v.flow.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - ft * 0.4)
        ;(v.conn.material as THREE.LineBasicMaterial).opacity = 0.08 + 0.14 * (1 - ft)

        const np = 1 + 0.1 * Math.sin(t * 1.8 + v.theta * 2)
        v.mesh.scale.setScalar(np)
      }

      // red entre vaults
      let li = 0
      for (let a = 0; a < vaults.length; a++) {
        for (let b = a + 1; b < vaults.length; b++) {
          const d = vaults[a].pos.distanceTo(vaults[b].pos)
          if (d < LINK_DIST) {
            meshLinkPos[li++] = vaults[a].pos.x; meshLinkPos[li++] = vaults[a].pos.y; meshLinkPos[li++] = vaults[a].pos.z
            meshLinkPos[li++] = vaults[b].pos.x; meshLinkPos[li++] = vaults[b].pos.y; meshLinkPos[li++] = vaults[b].pos.z
          }
        }
      }
      for (let k = li; k < meshLinkPos.length; k++) meshLinkPos[k] = 0
      meshLinkGeo.attributes.position.needsUpdate = true
      meshLinkGeo.setDrawRange(0, li / 3)

      coreGlow = Math.max(0, coreGlow - dt * 2)
      ;(coreHalo.material as THREE.MeshBasicMaterial).opacity = 0.05 + 0.18 * coreGlow

      renderer.render(scene, camera)
    }

    const loop = () => {
      if (!visible) return
      raf = requestAnimationFrame(loop)
      renderFrame()
    }

    if (reduceMotion) {
      renderFrame()
    } else {
      window.addEventListener('mousemove', onMove)
      loop()
    }

    // El planeta es un fondo fixed: un IntersectionObserver siempre lo vería en
    // pantalla. Se pausa cuando ya se hizo scroll más allá del hero (lo tapan las
    // secciones opacas) o cuando la pestaña pasa a segundo plano.
    const syncVisibility = () => {
      if (reduceMotion) return
      const off = document.hidden || window.scrollY > window.innerHeight * 1.3
      if (off && visible) { visible = false; cancelAnimationFrame(raf) }
      else if (!off && !visible) { visible = true; lastTime = performance.now(); loop() }
    }
    window.addEventListener('scroll', syncVisibility, { passive: true })
    document.addEventListener('visibilitychange', syncVisibility)

    const onResize = () => {
      W = window.innerWidth
      H = window.innerHeight
      camera.aspect = W / H
      camera.updateProjectionMatrix()
      renderer.setSize(W, H, false)
      if (reduceMotion) renderFrame()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('scroll', syncVisibility)
      document.removeEventListener('visibilitychange', syncVisibility)
      window.removeEventListener('resize', onResize)
      scene.traverse((obj) => {
        const o = obj as THREE.Mesh
        if (o.geometry) o.geometry.dispose()
        const mat = (o as THREE.Mesh).material
        if (mat) {
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
          else mat.dispose()
        }
      })
      renderer.dispose()
    }
  }, [])

  return (
    <div ref={containerRef} className={className} aria-hidden="true" style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}
