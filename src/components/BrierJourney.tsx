'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/**
 * Journey 3D: el recorrido de un bot desde la prueba hasta el capital real.
 * Stack de 4 capas (slabs) con un agente que sube paso a paso por scroll scrubbing.
 * Adaptado del prompt standalone a componente React + Three.js (npm). Todo en inglés,
 * Inter, sin guiones largos. Va debajo de "Every vault is earned" en el landing.
 */

const RED = 0xff2a4d
const REDL = 0xff5570
const WHITE = 0xffffff

const DATA = [
  {
    n: 'Step 1 of 4', title: 'Prove it risk free', dur: 'a few days',
    what: 'Your bot makes test predictions. No one puts money in yet.',
    gate: 'It has to be accurate enough to earn trust.',
    res: 'If it does well, it levels up.',
  },
  {
    n: 'Step 2 of 4', title: 'Show the track record', dur: 'open history',
    what: 'Its history is stored and open for anyone to verify.',
    gate: 'Good results, provable by everyone.',
    res: 'Approved to receive investment.',
  },
  {
    n: 'Step 3 of 4', title: 'Open your vault', dur: 'open to all',
    what: 'A vault opens where people can invest in your bot.',
    gate: 'They can enter and exit whenever they want.',
    res: 'Your bot starts managing real capital.',
  },
  {
    n: 'Step 4 of 4', title: 'Get paid for accuracy', dur: 'shared profits',
    what: 'Profits are split automatically between everyone.',
    gate: 'Investors earn, you get paid for performance.',
    res: 'The better you predict, the more capital you attract.',
  },
]
const N = DATA.length

export default function BrierJourney() {
  const czoneRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fillRefs = useRef<(HTMLDivElement | null)[]>([])
  const tProgRef = useRef(0)
  const curRef = useRef(0)

  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)

  const clamp = (v: number) => Math.max(0, Math.min(N - 1, v))

  useEffect(() => {
    const czone = czoneRef.current
    const canvas = canvasRef.current
    if (!czone || !canvas) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let cw = czone.clientWidth
    let ch = czone.clientHeight

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x050505, 0.05)
    const camera = new THREE.PerspectiveCamera(42, cw / ch, 0.1, 100)
    camera.position.set(0, 0, 7)

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(cw, ch, false)

    scene.add(new THREE.AmbientLight(0xffffff, 0.4))
    const keyLight = new THREE.PointLight(RED, 1.4); keyLight.position.set(3, 3, 4); scene.add(keyLight)
    const fillLight = new THREE.PointLight(0x88aaff, 0.45); fillLight.position.set(-4, -2, 3); scene.add(fillLight)
    const agentL = new THREE.PointLight(REDL, 0); agentL.position.set(0, 0, 1); scene.add(agentL)

    const stack = new THREE.Group()
    stack.rotation.x = -0.4
    stack.position.x = -0.5
    scene.add(stack)

    const GAP = 1.0
    const baseY = (i: number) => (i - (N - 1) / 2) * GAP

    // textura procedural para los slabs
    const makeTex = () => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 160
      const x = c.getContext('2d')!
      x.fillStyle = '#101014'; x.fillRect(0, 0, 256, 160)
      for (let i = 0; i < 600; i++) {
        x.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`
        x.fillRect(Math.random() * 256, Math.random() * 160, 1, 1)
      }
      x.strokeStyle = 'rgba(255,255,255,0.05)'; x.lineWidth = 1
      for (let i = 0; i < 256; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 160); x.stroke() }
      for (let i = 0; i < 160; i += 16) { x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke() }
      return new THREE.CanvasTexture(c)
    }
    const tex = makeTex()

    interface Slab { mesh: THREE.Mesh; edges: THREE.LineSegments; mat: THREE.MeshStandardMaterial; edgeMat: THREE.LineBasicMaterial }
    const slabs: Slab[] = []
    for (let i = 0; i < N; i++) {
      const geo = new THREE.BoxGeometry(3.0, 0.12, 1.9)
      const mat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.5, roughness: 0.5, color: 0xffffff })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.y = baseY(i)
      stack.add(mesh)
      const edgeMat = new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.28 })
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat)
      mesh.add(edges)
      slabs.push({ mesh, edges, mat, edgeMat })
    }

    // agente: estrella sparkle de 4 puntas (el destello de Brier)
    const starShape = new THREE.Shape()
    const spikes = 4, outer = 0.3, inner = 0.085
    for (let i = 0; i <= spikes * 2; i++) {
      const r = i % 2 === 0 ? outer : inner
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2
      const x = Math.cos(a) * r, y = Math.sin(a) * r
      if (i === 0) starShape.moveTo(x, y); else starShape.lineTo(x, y)
    }
    const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 })
    starGeo.center()
    const agent = new THREE.Mesh(
      starGeo,
      new THREE.MeshStandardMaterial({ color: RED, emissive: RED, emissiveIntensity: 0.7, metalness: 0.2, roughness: 0.35 }),
    )
    stack.add(agent)
    agent.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(starGeo),
      new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.7 }),
    ))
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 16),
      new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending }),
    )
    stack.add(halo)

    // trail
    const TRAIL = 18
    const trailBuf = new Float32Array(TRAIL * 3)
    const trailGeo = new THREE.BufferGeometry()
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailBuf, 3))
    const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: REDL, transparent: true, opacity: 0.4 }))
    stack.add(trail)
    const trailHist: number[] = []

    // partículas: inflow (convergen) + burst final
    const inflowN = 16
    const inflowGeo = new THREE.BufferGeometry()
    const inflowPos = new Float32Array(inflowN * 3)
    const inflowSeed: { a: number; r: number; y: number }[] = []
    for (let i = 0; i < inflowN; i++) inflowSeed.push({ a: Math.random() * Math.PI * 2, r: 2 + Math.random() * 1.5, y: (Math.random() - 0.5) * 0.8 })
    inflowGeo.setAttribute('position', new THREE.BufferAttribute(inflowPos, 3))
    const inflow = new THREE.Points(inflowGeo, new THREE.PointsMaterial({ color: WHITE, size: 0.06, transparent: true, opacity: 0 }))
    stack.add(inflow)

    const burstN = 46
    const burstGeo = new THREE.BufferGeometry()
    const burstPos = new Float32Array(burstN * 3)
    const burstVel: THREE.Vector3[] = []
    for (let i = 0; i < burstN; i++) burstVel.push(new THREE.Vector3())
    burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPos, 3))
    const burst = new THREE.Points(burstGeo, new THREE.PointsMaterial({ color: RED, size: 0.08, transparent: true, opacity: 0 }))
    stack.add(burst)
    let burstActive = false, burstLife = 0
    const fireBurst = () => {
      burstActive = true; burstLife = 1
      for (let i = 0; i < burstN; i++) {
        burstPos[i * 3] = 0; burstPos[i * 3 + 1] = baseY(N - 1) + 0.3; burstPos[i * 3 + 2] = 0
        burstVel[i].set((Math.random() - 0.5) * 0.08, Math.random() * 0.06 + 0.01, (Math.random() - 0.5) * 0.08)
      }
    }

    // mouse parallax
    let tmx = 0, tmy = 0, mx = 0, my = 0
    const onMove = (e: MouseEvent) => {
      const r = czone.getBoundingClientRect()
      tmx = ((e.clientX - r.left) / r.width) * 2 - 1
      tmy = ((e.clientY - r.top) / r.height) * 2 - 1
    }
    czone.addEventListener('mousemove', onMove)

    // scroll scrubbing
    let snap: ReturnType<typeof setTimeout>
    const onWheel = (e: WheelEvent) => {
      const dy = e.deltaY
      const atStart = tProgRef.current <= 0.004 && dy < 0
      const atEnd = tProgRef.current >= N - 1 - 0.004 && dy > 0
      if (atStart || atEnd) return
      e.preventDefault()
      tProgRef.current = clamp(tProgRef.current + dy * 0.0032)
      clearTimeout(snap)
      snap = setTimeout(() => { tProgRef.current = clamp(Math.round(tProgRef.current)) }, 190)
    }
    czone.addEventListener('wheel', onWheel, { passive: false })

    let finPhase = 0
    let lastAct = -1
    let f = 0
    let raf = 0
    const tmpV = new THREE.Vector3()

    const frame = () => {
      f += 0.016
      curRef.current += (tProgRef.current - curRef.current) * 0.12
      const cur = curRef.current
      const act = Math.round(cur)

      if (act !== lastAct) {
        lastAct = act
        setStep(act)
      }

      // slabs
      slabs.forEach((s, i) => {
        s.mesh.position.y = baseY(i) + Math.sin(f * 1.1 + i) * 0.02
        if (i === act) { s.mat.emissive.setHex(RED); s.mat.emissiveIntensity = 0.5; s.edgeMat.color.setHex(REDL); s.edgeMat.opacity = 0.7 }
        else if (i < cur) { s.mat.emissiveIntensity = 0.04 + 0.31 * (1 - finPhase) * 0 + 0.31; s.mat.emissive.setHex(RED); s.edgeMat.color.setHex(REDL); s.edgeMat.opacity = 0.5 }
        else { s.mat.emissiveIntensity = 0; s.edgeMat.color.setHex(WHITE); s.edgeMat.opacity = 0.28 }
      })

      // agente sube al layer actual
      const ay = baseY(cur) + 0.3
      agent.position.set(0, ay, 0.18)
      agent.rotation.z += 0.012; agent.rotation.x = 0.4
      halo.position.copy(agent.position)
      const hp = 1 + 0.12 * Math.sin(f * 5)
      halo.scale.setScalar(hp)
      agentL.position.set(stack.position.x, ay, 1)

      // trail
      trailHist.unshift(0, ay, 0.18)
      if (trailHist.length > TRAIL * 3) trailHist.length = TRAIL * 3
      for (let i = 0; i < TRAIL * 3; i++) trailBuf[i] = trailHist[i] ?? trailHist[trailHist.length - 3 + (i % 3)] ?? 0
      trail.geometry.attributes.position.needsUpdate = true

      // inflow particles (cuando avanza hacia el vault)
      const inflowOn = cur > 1.5 && cur < 3.2
      const im = inflow.material as THREE.PointsMaterial
      im.opacity += ((inflowOn ? 0.7 : 0) - im.opacity) * 0.06
      for (let i = 0; i < inflowN; i++) {
        const s = inflowSeed[i]
        s.a += 0.01
        const conv = (Math.sin(f * 0.8 + i) + 1) / 2
        const r = s.r * conv
        inflowPos[i * 3] = Math.cos(s.a) * r
        inflowPos[i * 3 + 1] = baseY(Math.min(N - 1, Math.round(cur))) + s.y * conv
        inflowPos[i * 3 + 2] = Math.sin(s.a) * r
      }
      inflow.geometry.attributes.position.needsUpdate = true

      // finale
      const atEnd = tProgRef.current >= N - 1 - 0.004 && cur > N - 1 - 0.03
      if (atEnd) {
        if (!burstActive && finPhase < 0.01) fireBurst()
        finPhase += (1 - finPhase) * 0.02
        setDone(true)
      } else {
        finPhase += (0 - finPhase) * 0.1
        if (cur < N - 1 - 0.05) setDone(false)
      }
      const glowBoost = finPhase * 0.8
      ;(agent.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + glowBoost
      agentL.intensity = 0.2 + finPhase * 1.5

      // burst update
      const bm = burst.material as THREE.PointsMaterial
      if (burstActive) {
        burstLife -= 0.01
        bm.opacity = Math.max(0, burstLife)
        for (let i = 0; i < burstN; i++) {
          burstVel[i].y -= 0.0016
          burstPos[i * 3] += burstVel[i].x
          burstPos[i * 3 + 1] += burstVel[i].y
          burstPos[i * 3 + 2] += burstVel[i].z
        }
        burst.geometry.attributes.position.needsUpdate = true
        if (burstLife <= 0) burstActive = false
      }

      // rail fills (DOM directo, sin re-render)
      for (let k = 0; k < N - 1; k++) {
        const fill = fillRefs.current[k]
        if (fill) {
          let h = 0
          if (cur >= k + 1) h = 100
          else if (cur > k) h = (cur - k) * 100
          fill.style.height = `${h}%`
        }
      }

      // cámara
      mx += (tmx - mx) * 0.05
      my += (tmy - my) * 0.05
      stack.rotation.y = f * 0.13 + mx * 0.4
      stack.rotation.x = -0.4 + my * 0.14
      const targetCamY = baseY(cur) * 0.18
      const targetCamZ = 7 + finPhase * 1.8
      camera.position.y += (targetCamY - camera.position.y) * 0.06
      camera.position.z += (targetCamZ - camera.position.z) * 0.06
      camera.lookAt(stack.position.x, baseY(cur) * 0.12, 0)

      renderer.render(scene, camera)
    }

    const loop = () => { raf = requestAnimationFrame(loop); frame() }
    if (reduceMotion) { frame() } else { loop() }

    const onResize = () => {
      cw = czone.clientWidth; ch = czone.clientHeight
      camera.aspect = cw / ch; camera.updateProjectionMatrix()
      renderer.setSize(cw, ch, false)
      if (reduceMotion) frame()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(snap)
      czone.removeEventListener('mousemove', onMove)
      czone.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      tex.dispose()
      scene.traverse((obj) => {
        const o = obj as THREE.Mesh
        if (o.geometry) o.geometry.dispose()
        const mat = (o as THREE.Mesh).material
        if (mat) { if (Array.isArray(mat)) mat.forEach((m) => m.dispose()); else mat.dispose() }
      })
      renderer.dispose()
    }
  }, [])

  const d = DATA[step]

  return (
    <section className="relative bg-[#050505] border-t border-[#111] py-28 px-6">
      <div className="max-w-[1180px] mx-auto">
        <div className="text-center mb-14">
          <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-primary mb-5">step by step</div>
          <h2 className="m-0 font-sans font-extrabold tracking-[-0.04em] text-[clamp(28px,4.5vw,52px)]">
            How your bot starts <span className="text-primary">earning</span>.
          </h2>
        </div>

        <div className="flex flex-col lg:flex-row gap-px bg-[#161616] border border-[#161616] rounded-2xl overflow-hidden" style={{ minHeight: 520 }}>
          {/* escena */}
          <div ref={czoneRef} className="relative bg-[#070708] flex-[1.55] cursor-ns-resize" style={{ minHeight: 360 }}>
            <canvas ref={canvasRef} className="block w-full h-full" />

            {/* rail */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center">
              {DATA.map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <button
                    onClick={() => { tProgRef.current = i }}
                    aria-label={`Go to step ${i + 1}`}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center font-mono text-[10px] transition-all ${
                      step === i
                        ? 'bg-primary text-[#030303] border-primary scale-110 shadow-[0_0_16px_rgba(255,42,77,0.6)]'
                        : step > i ? 'bg-[#2a0a12] text-primary border-primary/50' : 'bg-[#0a0a0a] text-[#555] border-[#222]'
                    }`}
                  >
                    {i + 1}
                  </button>
                  {i < N - 1 && (
                    <div className="w-[2px] h-10 bg-[#1a1a1a] my-1 relative overflow-hidden">
                      <div ref={el => { fillRefs.current[i] = el }} className="absolute top-0 left-0 w-full bg-primary" style={{ height: '0%' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* done badge */}
            {done && (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-[#0a0a0a] border border-primary/50 px-4 py-2 rounded-full font-mono text-[11px] text-primary shadow-[0_0_20px_rgba(255,42,77,0.25)]">
                Done. Your bot earns real capital.
              </div>
            )}
          </div>

          {/* panel info */}
          <div className="flex-1 bg-[#070708] p-8 md:p-10 flex flex-col justify-center min-w-0">
            <div key={step} style={{ animation: 'fadeIn 0.4s ease' }}>
              <div className="font-mono text-[11px] text-primary tracking-widest mb-3">{d.n}</div>
              <h3 className="m-0 font-sans font-extrabold text-[26px] tracking-tight mb-2">{d.title}</h3>
              <div className="font-mono text-[11px] text-[#666] mb-8">{d.dur}</div>

              <div className="space-y-5">
                <div>
                  <div className="font-mono text-[10px] text-[#555] tracking-widest uppercase mb-1.5">what happens</div>
                  <div className="text-[14px] text-[#ccc] leading-relaxed">{d.what}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-[#555] tracking-widest uppercase mb-1.5">to advance</div>
                  <div className="text-[14px] text-[#ccc] leading-relaxed">{d.gate}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-[#555] tracking-widest uppercase mb-1.5">result</div>
                  <div className="text-[14px] text-[#ccc] leading-relaxed">{d.res}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-5 font-mono text-[10px] text-[#555] tracking-wider">Scroll on the scene to walk through it</div>
      </div>
    </section>
  )
}
