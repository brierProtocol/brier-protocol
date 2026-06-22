'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * BlackHoleVault: el vault como un agujero negro tridimensional que mira siempre de frente al
 * espectador (billboard), perfectamente circular y simetrico, vertiendo capital dentro de un
 * cofre abierto. Un embudo de particulas viaja desde el espectador hacia el centro (efecto de
 * succion, "viene de la pantalla y te absorbe"). Canvas contenido, pausa fuera de viewport.
 * Ingles, Inter, sin guiones.
 */

const RED = 0xff2a4d
const HOT = 0xffd2b0
const ORANGE = 0xff6a3d
const RIN = 0.95
const ROUT = 2.0

export default function BlackHoleVault({ heightClass = 'h-[clamp(440px,54vw,680px)]', cover = false }: { heightClass?: string; cover?: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let W = wrap.clientWidth || 600
    let H = wrap.clientHeight || 460

    const scene = new THREE.Scene()
    // en cover el lienzo ocupa TODA la seccion (mas alto) para que la succion la cubra entera.
    // FOV mas amplio + misma distancia => el cofre conserva su tamano de siempre; un paneo vertical
    // (camara y mira bajan juntas, sin cambiar el angulo) lo sube para dejar el titular limpio abajo
    const camera = new THREE.PerspectiveCamera(cover ? 50 : 42, W / H, 0.1, 100)
    if (cover) { camera.position.set(0, 1.3, 7.4); camera.lookAt(0, -0.18, 0) }
    else { camera.position.set(0, 1.45, 6.5); camera.lookAt(0, -0.1, 0) }
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H, false)

    scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const key = new THREE.DirectionalLight(0xffffff, 0.6); key.position.set(4, 6, 8); scene.add(key)
    const glow = new THREE.PointLight(RED, 1.4, 14); scene.add(glow)

    // ── estrellas (universo) ──
    const STAR_N = 520
    const starPos = new Float32Array(STAR_N * 3)
    for (let i = 0; i < STAR_N; i++) {
      const r = 9 + Math.random() * 16
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th)
      starPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.6
      starPos[i * 3 + 2] = r * Math.cos(ph)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.55, sizeAttenuation: true }))
    scene.add(stars)

    // ── grupo del agujero negro (billboard: mira siempre de frente a la camara) ──
    const bh = new THREE.Group()
    scene.add(bh)

    // disco de acrecion en el plano XY local (de frente). blanco-caliente al centro, rojo afuera
    const DISK_N = 1500
    const diskPos = new Float32Array(DISK_N * 3)
    const diskCol = new Float32Array(DISK_N * 3)
    const dRad = new Float32Array(DISK_N)
    const dAng = new Float32Array(DISK_N)
    const cHot = new THREE.Color(HOT), cOra = new THREE.Color(ORANGE), cRed = new THREE.Color(RED)
    for (let i = 0; i < DISK_N; i++) {
      const t = Math.pow(Math.random(), 0.6)
      const r = RIN + t * (ROUT - RIN)
      dRad[i] = r; dAng[i] = Math.random() * Math.PI * 2
      const c = new THREE.Color().copy(cHot).lerp(cOra, Math.min(1, t * 1.6)).lerp(cRed, Math.max(0, t * 1.4 - 0.4))
      diskCol[i * 3] = c.r; diskCol[i * 3 + 1] = c.g; diskCol[i * 3 + 2] = c.b
    }
    const diskGeo = new THREE.BufferGeometry()
    diskGeo.setAttribute('position', new THREE.BufferAttribute(diskPos, 3))
    diskGeo.setAttribute('color', new THREE.BufferAttribute(diskCol, 3))
    const disk = new THREE.Points(diskGeo, new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }))
    bh.add(disk)

    // horizonte de eventos (esfera negra que ocluye el centro)
    const horizon = new THREE.Mesh(new THREE.SphereGeometry(RIN * 0.92, 40, 40), new THREE.MeshBasicMaterial({ color: 0x000000 }))
    bh.add(horizon)

    // anillo de fotones nitido: define la silueta blanca limpia (plano XY, de frente)
    const photon = new THREE.Mesh(new THREE.TorusGeometry(RIN, 0.045, 18, 96), new THREE.MeshBasicMaterial({ color: HOT, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending }))
    bh.add(photon)

    // halo tenue y CONTENIDO (no se derrama): anillo fino justo por fuera del de fotones
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(RIN * 1.02, RIN * 1.22, 96),
      new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }),
    )
    bh.add(halo)

    // ── el cofre / vault ──
    const chest = new THREE.Group()
    scene.add(chest)
    const edgeMat = new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.75 })

    const addBox = (w: number, h: number, d: number, parent: THREE.Object3D, mat: THREE.Material) => {
      const g = new THREE.BoxGeometry(w, h, d)
      parent.add(new THREE.Mesh(g, mat))
      parent.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat))
    }

    const bw = 2.7, bhh = 1.25, bd = 1.8, lidR = bd / 2

    const body = new THREE.Group(); chest.add(body)
    body.position.y = -1.1
    addBox(bw, bhh, bd, body, new THREE.MeshStandardMaterial({ color: 0x0c0d12, metalness: 0.55, roughness: 0.45, emissive: RED, emissiveIntensity: 0.06 }))

    // bandas de metal verticales que envuelven el cofre
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x5a606d, metalness: 0.98, roughness: 0.2, emissive: RED, emissiveIntensity: 0.32 })
    ;[-0.9, 0, 0.9].forEach((x) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, bhh + 0.06, bd + 0.1), bandMat)
      b.position.set(x, 0, 0); body.add(b)
    })
    // trim superior (boca) e inferior (base)
    const rim = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.08, 0.16, bd + 0.1), bandMat)
    rim.position.set(0, bhh / 2 - 0.03, 0); body.add(rim)
    const base = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.12, 0.18, bd + 0.12), bandMat)
    base.position.set(0, -bhh / 2 + 0.02, 0); body.add(base)
    // cerradura dorada + ojo de cerradura
    const lockMat = new THREE.MeshStandardMaterial({ color: 0x8a6a2a, metalness: 0.98, roughness: 0.18, emissive: 0xff7a3a, emissiveIntensity: 0.9 })
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.12), lockMat)
    lock.position.set(0, -0.08, bd / 2 + 0.06); body.add(lock)
    const keyhole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12), new THREE.MeshBasicMaterial({ color: 0x000000 }))
    keyhole.rotation.x = Math.PI / 2
    keyhole.position.set(0, -0.08, bd / 2 + 0.12); body.add(keyhole)

    // tapa abovedada abierta hacia atras
    const arc = new THREE.Shape()
    arc.absarc(0, 0, lidR, 0, Math.PI, false)
    arc.lineTo(-lidR, 0)
    const lidGeo = new THREE.ExtrudeGeometry(arc, { depth: bw, bevelEnabled: false })
    lidGeo.translate(0, 0, -bw / 2)
    lidGeo.rotateY(Math.PI / 2)
    lidGeo.translate(0, 0, lidR)
    const lid = new THREE.Group()
    const lidMesh = new THREE.Mesh(lidGeo, new THREE.MeshStandardMaterial({ color: 0x16181f, metalness: 0.62, roughness: 0.38, emissive: RED, emissiveIntensity: 0.12, side: THREE.DoubleSide }))
    lid.add(lidMesh)
    lid.add(new THREE.LineSegments(new THREE.EdgesGeometry(lidGeo), edgeMat))
    ;[-0.85, 0, 0.85].forEach((x) => {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(lidR, 0.04, 10, 28, Math.PI), bandMat)
      rib.rotation.y = Math.PI / 2
      rib.position.set(x, 0, lidR)
      lid.add(rib)
    })
    lid.position.set(0, bhh / 2, -bd / 2)
    lid.rotation.x = -1.15
    body.add(lid)

    // resplandor del tesoro dentro de la boca + luz interior calida
    let poolMat: THREE.MeshBasicMaterial
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(bw - 0.5, bd - 0.4),
      (poolMat = new THREE.MeshBasicMaterial({ color: HOT, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })),
    )
    pool.rotation.x = -Math.PI / 2
    pool.position.set(0, bhh / 2 - 0.16, 0)
    body.add(pool)
    const inner = new THREE.PointLight(ORANGE, 1.1, 4.5); inner.position.set(0, bhh / 2 - 0.05, 0); body.add(inner)

    // el agujero negro flota centrado sobre la boca del cofre, lo bastante alto para que su
    // circulo y su aura queden completos (no los corta la pared frontal del cofre)
    const BH_Y = 0.62
    bh.position.set(0, BH_Y, 0); bh.scale.setScalar(0.8)

    // deposit stream: espiral de capital cayendo dentro del cofre
    const DEP_N = 320, DEP_TOP = 0.15, DEP_BOT = -0.62
    const depPos = new Float32Array(DEP_N * 3)
    const depT = new Float32Array(DEP_N), depA = new Float32Array(DEP_N), depR = new Float32Array(DEP_N)
    const depCol = new Float32Array(DEP_N * 3)
    const cH = new THREE.Color(HOT), cR = new THREE.Color(RED)
    for (let i = 0; i < DEP_N; i++) {
      depT[i] = Math.random(); depA[i] = Math.random() * Math.PI * 2; depR[i] = 0.18 + Math.random() * 0.9
      const c = new THREE.Color().copy(cH).lerp(cR, Math.random())
      depCol[i * 3] = c.r; depCol[i * 3 + 1] = c.g; depCol[i * 3 + 2] = c.b
    }
    const depGeo = new THREE.BufferGeometry()
    depGeo.setAttribute('position', new THREE.BufferAttribute(depPos, 3))
    depGeo.setAttribute('color', new THREE.BufferAttribute(depCol, 3))
    const dep = new THREE.Points(depGeo, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }))
    chest.add(dep)

    // ── loop ──
    let raf = 0, last = performance.now(), visible = true
    const tmp = new THREE.Vector3()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const t = now / 1000

      // disco: rotacion Kepleriana (interior mas rapido), en el plano XY local
      for (let i = 0; i < DISK_N; i++) {
        const r = dRad[i]
        dAng[i] += (dt * 0.9) / (r * 0.7)
        const a = dAng[i]
        diskPos[i * 3] = Math.cos(a) * r
        diskPos[i * 3 + 1] = Math.sin(a) * r
        diskPos[i * 3 + 2] = Math.sin(i) * 0.01
      }
      diskGeo.attributes.position.needsUpdate = true

      // deposit stream: espiral de capital vertida dentro del cofre
      for (let i = 0; i < DEP_N; i++) {
        depT[i] += dt * 0.5 * (0.6 + depR[i])
        if (depT[i] > 1) depT[i] -= 1
        const tt = depT[i]
        const rr = depR[i] * (1 - tt * 0.88)
        const a = depA[i] + tt * 6.0
        depPos[i * 3] = Math.cos(a) * rr
        depPos[i * 3 + 1] = DEP_TOP + (DEP_BOT - DEP_TOP) * tt
        depPos[i * 3 + 2] = Math.sin(a) * rr
      }
      depGeo.attributes.position.needsUpdate = true

      poolMat.opacity = 0.5 + 0.18 * Math.sin(t * 2.2)
      ;(photon.material as THREE.MeshBasicMaterial).opacity = 0.78 + 0.18 * Math.sin(t * 2.5)
      stars.rotation.y += dt * 0.01

      // flote suave; cofre y agujero se mueven juntos (simetria estable y posicion fija)
      const floatY = Math.sin(t * 0.8) * 0.05
      chest.position.y = floatY
      bh.position.set(0, BH_Y + floatY, 0)
      chest.rotation.y = Math.sin(t * 0.3) * 0.1

      // billboard del grupo: el agujero mira siempre de frente -> circulo perfecto y simetrico
      bh.quaternion.copy(camera.quaternion)
      bh.getWorldPosition(tmp); glow.position.copy(tmp)

      renderer.render(scene, camera)
      if (visible && !reduceMotion) raf = requestAnimationFrame(frame)
    }
    if (reduceMotion) renderer.render(scene, camera)
    else raf = requestAnimationFrame(frame)

    // pausa fuera de viewport
    const io = new IntersectionObserver((es) => {
      const on = es[0].isIntersecting
      if (on && !visible && !reduceMotion) { visible = true; last = performance.now(); raf = requestAnimationFrame(frame) }
      else if (!on) { visible = false; cancelAnimationFrame(raf) }
    }, { threshold: 0.05 })
    io.observe(wrap)

    const ro = new ResizeObserver(() => {
      W = wrap.clientWidth || W; H = wrap.clientHeight || H
      camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H, false)
    })
    ro.observe(wrap)

    return () => {
      cancelAnimationFrame(raf); io.disconnect(); ro.disconnect()
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
    <div
      ref={wrapRef}
      className={cover ? 'relative left-1/2 -translate-x-1/2 w-screen h-[54vh]' : `relative w-full ${heightClass}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  )
}
