'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Fondo 3D del hero: planeta-núcleo + flota de agentes en órbita.
 * Paleta estricta: negro / blanco / rojo Brier (#ff2a4d). Three.js, fondo transparente.
 * Reutilizable en cualquier hero — montar siempre vía next/dynamic con { ssr: false }.
 */

const RED = 0xff2a4d
const RED_LIGHT = 0xff5570
const WHITE = 0xffffff

interface Agent {
  plane: THREE.Group
  mesh: THREE.Mesh
  R: number
  baseColor: number
  theta: number
  speed: number
  trail: THREE.Line
  trailBuf: Float32Array
  hist: number[]
  histLen: number
  capital: THREE.Mesh
  conn: THREE.Line
  ct: number
  cspeed: number
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
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: WHITE, size: 0.05, transparent: true, opacity: 0.65 }))
    scene.add(stars)

    // ── World group (parallax + offset hacia abajo) ──
    const world = new THREE.Group()
    world.position.y = -0.4
    scene.add(world)

    // ── Planeta-núcleo ──
    const planet = new THREE.Group()
    world.add(planet)
    planet.add(new THREE.Mesh(new THREE.SphereGeometry(1.46, 32, 32), new THREE.MeshBasicMaterial({ color: 0x070707 })))
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(1.95, 32, 32),
      new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.045, side: THREE.BackSide }),
    )
    planet.add(atmo)
    planet.add(new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.52, 1)),
      new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.16 }),
    ))
    const dotsMat = new THREE.PointsMaterial({ color: RED, size: 0.03, transparent: true, opacity: 0.7 })
    const dotGeo = new THREE.BufferGeometry()
    const dotN = 380
    const dotPos = new Float32Array(dotN * 3)
    for (let i = 0; i < dotN; i++) {
      const t = Math.acos(2 * Math.random() - 1)
      const f = Math.random() * Math.PI * 2
      const r = 1.54
      dotPos[i * 3] = r * Math.sin(t) * Math.cos(f)
      dotPos[i * 3 + 1] = r * Math.sin(t) * Math.sin(f)
      dotPos[i * 3 + 2] = r * Math.cos(t)
    }
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3))
    planet.add(new THREE.Points(dotGeo, dotsMat))

    // ── Anillo planetario ──
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.7, 0.008, 8, 140),
      new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.12 }),
    )
    ring.rotation.x = Math.PI / 2.3
    world.add(ring)

    // ── Flota de agentes ──
    const agents: Agent[] = []
    const tmp = new THREE.Vector3()
    for (let i = 0; i < 10; i++) {
      const plane = new THREE.Group()
      plane.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      world.add(plane)

      const R = 2.0 + Math.random() * 1.5
      const baseColor = i % 2 ? RED : WHITE

      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.12, 0),
        new THREE.MeshBasicMaterial({ color: baseColor, transparent: true, opacity: 0.95 }),
      )
      plane.add(mesh)

      const seg = 80
      const orbitPts: THREE.Vector3[] = []
      for (let k = 0; k <= seg; k++) {
        const a = (k / seg) * Math.PI * 2
        orbitPts.push(new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R))
      }
      plane.add(new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(orbitPts),
        new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.06 }),
      ))

      const histLen = 14
      const trailBuf = new Float32Array(histLen * 3)
      const trailGeo = new THREE.BufferGeometry()
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailBuf, 3))
      const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: baseColor, transparent: true, opacity: 0.4 }))
      world.add(trail)

      const capital = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 8, 8),
        new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.9 }),
      )
      world.add(capital)

      const connGeo = new THREE.BufferGeometry()
      connGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
      const conn = new THREE.Line(connGeo, new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0 }))
      world.add(conn)

      agents.push({
        plane, mesh, R, baseColor,
        theta: Math.random() * Math.PI * 2,
        speed: (0.15 + Math.random() * 0.3) * (Math.random() < 0.5 ? 1 : -1),
        trail, trailBuf, hist: [], histLen,
        capital, conn,
        ct: Math.random(),
        cspeed: 0.25 + Math.random() * 0.35,
      })
    }

    // ── Parallax (window: funciona aunque la capa sea pointer-events:none) ──
    let mx = 0, my = 0, trx = 0, tryy = 0
    const onMove = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth) * 2 - 1
      my = (e.clientY / window.innerHeight) * 2 - 1
    }

    let lastTime = performance.now()
    let elapsed = 0
    let raf = 0

    const renderFrame = () => {
      const now = performance.now()
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      elapsed += dt
      const t = elapsed

      planet.rotation.y += dt * 0.12
      dotsMat.opacity = 0.45 + 0.3 * Math.sin(t * 1.6)
      atmo.scale.setScalar(1 + 0.012 * Math.sin(t * 1.2))
      ring.rotation.z += dt * 0.04
      stars.rotation.y += dt * 0.005

      trx += (mx * 0.32 - trx) * 0.04
      tryy += (my * 0.18 - tryy) * 0.04
      world.rotation.y = trx
      world.rotation.x = tryy

      for (const a of agents) {
        a.theta += a.speed * dt
        a.mesh.position.set(Math.cos(a.theta) * a.R, 0, Math.sin(a.theta) * a.R)

        a.mesh.getWorldPosition(tmp)
        world.worldToLocal(tmp)

        a.hist.unshift(tmp.x, tmp.y, tmp.z)
        if (a.hist.length > a.histLen * 3) a.hist.length = a.histLen * 3
        for (let j = 0; j < a.histLen * 3; j++) {
          a.trailBuf[j] = j < a.hist.length ? a.hist[j] : a.hist[a.hist.length - 3 + (j % 3)]
        }
        a.trail.geometry.attributes.position.needsUpdate = true

        a.ct += a.cspeed * dt
        if (a.ct >= 1.15) a.ct = -Math.random() * 0.6
        const ct = Math.max(0, Math.min(1, a.ct))
        a.capital.position.set(tmp.x * ct, tmp.y * ct, tmp.z * ct)
        ;(a.capital.material as THREE.MeshBasicMaterial).opacity = a.ct > 0 && a.ct < 1 ? 0.9 : 0

        const cp = a.conn.geometry.attributes.position.array as Float32Array
        cp[0] = 0; cp[1] = 0; cp[2] = 0
        cp[3] = tmp.x; cp[4] = tmp.y; cp[5] = tmp.z
        a.conn.geometry.attributes.position.needsUpdate = true

        const exec = a.ct > 0.9 && a.ct < 1.0
        const connMat = a.conn.material as THREE.LineBasicMaterial
        connMat.opacity = exec ? 0.35 : Math.max(0, connMat.opacity - dt * 1.5)

        if (exec) {
          a.mesh.scale.setScalar(1.1)
          ;(a.mesh.material as THREE.MeshBasicMaterial).color.setHex(RED_LIGHT)
        } else {
          a.mesh.scale.setScalar(1)
          ;(a.mesh.material as THREE.MeshBasicMaterial).color.setHex(a.baseColor)
        }
      }

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
