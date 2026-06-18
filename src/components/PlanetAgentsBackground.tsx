'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Fondo 3D del hero: núcleo Brier + red de nodos (personas con bots conectados).
 * Sin líneas de órbita — los nodos flotan libres, unidos entre sí en constelación,
 * con flujo de datos/capital viajando constantemente hacia el núcleo.
 * Paleta estricta: negro / blanco / rojo Brier (#ff2a4d). Three.js, fondo transparente.
 * Reutilizable en cualquier hero — montar siempre vía next/dynamic con { ssr: false }.
 */

const RED = 0xff2a4d
const RED_LIGHT = 0xff5570
const WHITE = 0xffffff

interface Node {
  mesh: THREE.Mesh
  baseColor: number
  // posición orbital libre (esférica, sin línea visible)
  R: number
  theta: number
  phi: number
  thetaSpeed: number
  phiSpeed: number
  pos: THREE.Vector3
  // flujo de datos hacia el núcleo
  flow: THREE.Mesh
  flowT: number
  flowSpeed: number
  conn: THREE.Line
  halo: THREE.Mesh
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
    camera.position.set(0, 1.7, 10)
    camera.lookAt(0, -0.5, 0)

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H, false)

    // ── Campo de estrellas ──
    const starGeo = new THREE.BufferGeometry()
    const starN = 620
    const starPos = new Float32Array(starN * 3)
    for (let i = 0; i < starN; i++) {
      const r = 14
      const t = Math.acos(2 * Math.random() - 1)
      const f = Math.random() * Math.PI * 2
      starPos[i * 3] = r * Math.sin(t) * Math.cos(f)
      starPos[i * 3 + 1] = r * Math.sin(t) * Math.sin(f)
      starPos[i * 3 + 2] = r * Math.cos(t)
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: WHITE, size: 0.05, transparent: true, opacity: 0.6 }))
    scene.add(stars)

    // ── World group (parallax + offset hacia abajo) ──
    const world = new THREE.Group()
    world.position.y = -0.4
    scene.add(world)

    // ── Núcleo Brier ──
    const planet = new THREE.Group()
    world.add(planet)
    planet.add(new THREE.Mesh(new THREE.SphereGeometry(1.42, 32, 32), new THREE.MeshBasicMaterial({ color: 0x070707 })))
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(1.95, 32, 32),
      new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.05, side: THREE.BackSide }),
    )
    planet.add(atmo)
    planet.add(new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.48, 1)),
      new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.14 }),
    ))
    // halo de recepción — pulsa cuando llega flujo
    const coreHalo = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 24, 24),
      new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0, side: THREE.BackSide }),
    )
    planet.add(coreHalo)
    const dotsMat = new THREE.PointsMaterial({ color: RED, size: 0.028, transparent: true, opacity: 0.7 })
    const dotGeo = new THREE.BufferGeometry()
    const dotN = 360
    const dotPos = new Float32Array(dotN * 3)
    for (let i = 0; i < dotN; i++) {
      const t = Math.acos(2 * Math.random() - 1)
      const f = Math.random() * Math.PI * 2
      const r = 1.5
      dotPos[i * 3] = r * Math.sin(t) * Math.cos(f)
      dotPos[i * 3 + 1] = r * Math.sin(t) * Math.sin(f)
      dotPos[i * 3 + 2] = r * Math.cos(t)
    }
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3))
    planet.add(new THREE.Points(dotGeo, dotsMat))

    // ── Red de nodos (personas con bots conectados) ──
    const NODE_N = 14
    const nodes: Node[] = []
    for (let i = 0; i < NODE_N; i++) {
      const baseColor = i % 3 === 0 ? RED : WHITE
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.1, 0),
        new THREE.MeshBasicMaterial({ color: baseColor, transparent: true, opacity: 0.95 }),
      )
      world.add(mesh)

      // halo suave alrededor de cada nodo
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 12, 12),
        new THREE.MeshBasicMaterial({ color: baseColor, transparent: true, opacity: 0.08, side: THREE.BackSide }),
      )
      world.add(halo)

      // línea de flujo nodo → núcleo
      const connGeo = new THREE.BufferGeometry()
      connGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
      const conn = new THREE.Line(connGeo, new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.08 }))
      world.add(conn)

      // partícula de flujo que viaja del nodo al núcleo
      const flow = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.95 }),
      )
      world.add(flow)

      nodes.push({
        mesh, baseColor, halo,
        R: 2.3 + Math.random() * 1.6,
        theta: Math.random() * Math.PI * 2,
        phi: Math.acos(2 * Math.random() - 1),
        thetaSpeed: (0.06 + Math.random() * 0.12) * (Math.random() < 0.5 ? 1 : -1),
        phiSpeed: (0.02 + Math.random() * 0.05) * (Math.random() < 0.5 ? 1 : -1),
        pos: new THREE.Vector3(),
        flow, flowT: Math.random(), flowSpeed: 0.3 + Math.random() * 0.4,
        conn,
      })
    }

    // ── Red entre nodos (constelación — "unidos") ──
    const maxLinks = (NODE_N * (NODE_N - 1)) / 2
    const meshLinkPos = new Float32Array(maxLinks * 6)
    const meshLinkGeo = new THREE.BufferGeometry()
    meshLinkGeo.setAttribute('position', new THREE.BufferAttribute(meshLinkPos, 3))
    const meshLinks = new THREE.LineSegments(
      meshLinkGeo,
      new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.1 }),
    )
    world.add(meshLinks)
    const LINK_DIST = 2.1

    // ── Parallax ──
    let mx = 0, my = 0, trx = 0, tryy = 0
    const onMove = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth) * 2 - 1
      my = (e.clientY / window.innerHeight) * 2 - 1
    }

    let lastTime = performance.now()
    let elapsed = 0
    let raf = 0
    let coreGlow = 0

    const renderFrame = () => {
      const now = performance.now()
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      elapsed += dt
      const t = elapsed

      planet.rotation.y += dt * 0.1
      dotsMat.opacity = 0.45 + 0.3 * Math.sin(t * 1.6)
      atmo.scale.setScalar(1 + 0.012 * Math.sin(t * 1.2))
      stars.rotation.y += dt * 0.005

      trx += (mx * 0.32 - trx) * 0.04
      tryy += (my * 0.18 - tryy) * 0.04
      world.rotation.y = trx
      world.rotation.x = tryy

      // posicionar nodos en órbita esférica libre (sin línea)
      for (const n of nodes) {
        n.theta += n.thetaSpeed * dt
        n.phi += n.phiSpeed * dt
        n.pos.set(
          n.R * Math.sin(n.phi) * Math.cos(n.theta),
          n.R * Math.cos(n.phi) * 0.7,
          n.R * Math.sin(n.phi) * Math.sin(n.theta),
        )
        n.mesh.position.copy(n.pos)
        n.halo.position.copy(n.pos)

        // línea de flujo nodo → núcleo
        const cp = n.conn.geometry.attributes.position.array as Float32Array
        cp[0] = n.pos.x; cp[1] = n.pos.y; cp[2] = n.pos.z
        cp[3] = 0; cp[4] = 0; cp[5] = 0
        n.conn.geometry.attributes.position.needsUpdate = true

        // partícula de flujo viajando hacia el núcleo (constante)
        n.flowT += n.flowSpeed * dt
        if (n.flowT >= 1) {
          n.flowT -= 1
          coreGlow = 1 // el núcleo recibe → pulso
        }
        const ft = n.flowT
        // easing hacia el centro
        const e = ft * ft
        n.flow.position.set(n.pos.x * (1 - e), n.pos.y * (1 - e), n.pos.z * (1 - e))
        ;(n.flow.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - ft * 0.5)

        // brillo de línea sube con el flujo cerca del nodo
        const connMat = n.conn.material as THREE.LineBasicMaterial
        connMat.opacity = 0.05 + 0.12 * (1 - ft)

        // pulso del nodo
        const np = 1 + 0.12 * Math.sin(t * 2 + n.theta * 3)
        n.mesh.scale.setScalar(np)
      }

      // recalcular red entre nodos cercanos
      let li = 0
      for (let a = 0; a < nodes.length; a++) {
        for (let b = a + 1; b < nodes.length; b++) {
          const d = nodes[a].pos.distanceTo(nodes[b].pos)
          if (d < LINK_DIST) {
            meshLinkPos[li++] = nodes[a].pos.x
            meshLinkPos[li++] = nodes[a].pos.y
            meshLinkPos[li++] = nodes[a].pos.z
            meshLinkPos[li++] = nodes[b].pos.x
            meshLinkPos[li++] = nodes[b].pos.y
            meshLinkPos[li++] = nodes[b].pos.z
          }
        }
      }
      // limpiar el resto del buffer
      for (let k = li; k < meshLinkPos.length; k++) meshLinkPos[k] = 0
      meshLinkGeo.attributes.position.needsUpdate = true
      meshLinkGeo.setDrawRange(0, li / 3)

      // núcleo recibiendo flujo
      coreGlow = Math.max(0, coreGlow - dt * 2.2)
      ;(coreHalo.material as THREE.MeshBasicMaterial).opacity = 0.04 + 0.16 * coreGlow

      renderer.render(scene, camera)
    }

    const loop = () => {
      raf = requestAnimationFrame(loop)
      renderFrame()
    }

    if (reduceMotion) {
      renderFrame()
    } else {
      window.addEventListener('mousemove', onMove)
      loop()
    }

    const onResize = () => {
      W = window.innerWidth
      H = window.innerHeight
      camera.aspect = W / H
      camera.updateProjectionMatrix()
      renderer.setSize(W, H, false)
      if (reduceMotion) renderFrame()
    }
    window.addEventListener('resize', onResize)

    // ── Cleanup: imprescindible en App Router para no fugar contextos WebGL ──
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
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
