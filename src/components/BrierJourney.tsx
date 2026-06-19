'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/**
 * Journey: el recorrido de un bot, contado con el SCROLL de la página (pinned).
 * La sección queda fija en pantalla mientras scrolleas; la estrella de Brier asciende
 * por una torre de anillos (el "climb") y a la derecha aparece un mock del producto real
 * para cada paso. Sin números 1·2·3·4, barra de progreso fina. Todo inglés, Inter, sin guiones.
 */

const RED = 0xff2a4d
const REDL = 0xff5570
const WHITE = 0xffffff

const STEPS = [
  { tag: 'TEST', title: 'Prove it risk free', body: 'Your bot makes test predictions for a few days. No capital at risk, nobody invests yet.', mock: 'shadow' },
  { tag: 'SCORE', title: 'Earn a real score', body: 'Every call settles against reality. Its Brier Score goes public for anyone to verify.', mock: 'score' },
  { tag: 'VAULT', title: 'Open your vault', body: 'Clear the bar and a non custodial vault opens. People invest, and exit, whenever they want.', mock: 'vault' },
  { tag: 'EARN', title: 'Get paid for accuracy', body: 'Real capital flows in. Profits split automatically between you and your depositors.', mock: 'earn' },
]
const N = STEPS.length

function ProductMock({ step, prog }: { step: number; prog: number }) {
  // mini glimpses del producto real, uno por paso
  if (step === 0) {
    return (
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 w-[260px]">
        <div className="flex items-center justify-between mb-4">
          <span className="font-sans font-bold text-[15px]">ORACLE_NODE</span>
          <span className="inline-flex items-center gap-1.5 text-[9px] font-mono text-[#888]"><span className="w-1.5 h-1.5 rounded-full bg-[#555] animate-pulse" />SHADOW</span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-[#161616] border border-[#161616]">
          <div className="bg-[#0a0a0a] p-3"><div className="text-[8px] font-mono text-[#555] tracking-widest">BRIER</div><div className="font-mono text-[13px] text-[#ffb000] animate-pulse">AWAITING</div></div>
          <div className="bg-[#0a0a0a] p-3"><div className="text-[8px] font-mono text-[#555] tracking-widest">DAY</div><div className="font-mono text-[13px] text-white">3 / 7</div></div>
        </div>
      </div>
    )
  }
  if (step === 1) {
    return (
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 w-[260px]">
        <div className="font-mono text-[9px] text-[#555] tracking-widest mb-1">BRIER SCORE</div>
        <div className="font-mono font-bold text-[40px] text-[#00d4aa] leading-none">0.183</div>
        <div className="text-[10px] font-mono text-[#00d4aa] mb-4">▼ beats coin flip</div>
        <div className="grid grid-cols-2 gap-px bg-[#161616] border border-[#161616]">
          <div className="bg-[#0a0a0a] p-3"><div className="text-[8px] font-mono text-[#555] tracking-widest">WIN RATE</div><div className="font-mono text-[13px] text-white">61%</div></div>
          <div className="bg-[#0a0a0a] p-3"><div className="text-[8px] font-mono text-[#555] tracking-widest">RESOLVED</div><div className="font-mono text-[13px] text-white">214</div></div>
        </div>
      </div>
    )
  }
  if (step === 2) {
    const fill = Math.min(1, Math.max(0, (prog - 0.5) / 0.25))
    return (
      <div className="bg-[#0a0a0a] border border-primary/30 p-5 w-[260px] shadow-[0_0_30px_rgba(255,42,77,0.08)]">
        <div className="flex items-center justify-between mb-3">
          <span className="font-sans font-bold text-[15px]">ORACLE_NODE Vault</span>
          <span className="text-[9px] font-mono text-primary">OPEN</span>
        </div>
        <div className="font-mono text-[9px] text-[#555] tracking-widest mb-1">TVL</div>
        <div className="font-mono font-bold text-[28px] text-white leading-none mb-3">${Math.round(fill * 128)}K</div>
        <div className="h-1.5 bg-[#161616] overflow-hidden"><div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${fill * 100}%` }} /></div>
        <div className="text-[10px] font-mono text-[#666] mt-2">depositors earning, exit anytime</div>
      </div>
    )
  }
  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 w-[260px]">
      <div className="font-mono text-[9px] text-[#555] tracking-widest mb-2">PROFIT SPLIT</div>
      <div className="space-y-2 mb-4">
        {[['Depositors', 60], ['Builder', 30], ['Protocol', 10]].map(([l, v]) => (
          <div key={l as string}>
            <div className="flex justify-between text-[10px] font-mono mb-1"><span className="text-[#999]">{l}</span><span className="text-white">{v}%</span></div>
            <div className="h-1 bg-[#161616]"><div className="h-full bg-primary" style={{ width: `${v}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="font-mono text-[13px] text-[#00d4aa]">+$2,480 <span className="text-[#555] text-[10px]">last cycle</span></div>
    </div>
  )
}

export default function BrierJourney() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const progRef = useRef(0)
  const [step, setStep] = useState(0)
  const [prog, setProg] = useState(0)

  // progreso a partir del SCROLL de la página (en cualquier parte, no hijack)
  useEffect(() => {
    const onScroll = () => {
      const sec = sectionRef.current
      if (!sec) return
      const rect = sec.getBoundingClientRect()
      const total = rect.height - window.innerHeight
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0
      progRef.current = p
      setProg(p)
      setStep(Math.min(N - 1, Math.round(p * (N - 1))))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [])

  // escena 3D: estrella de Brier ascendiendo por anillos
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let W = window.innerWidth, H = window.innerHeight
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x040404, 0.045)
    const camera = new THREE.PerspectiveCamera(46, W / H, 0.1, 100)

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H, false)

    scene.add(new THREE.AmbientLight(0xffffff, 0.45))
    const pl = new THREE.PointLight(RED, 1.5); pl.position.set(2, 2, 5); scene.add(pl)
    const starLight = new THREE.PointLight(REDL, 1.2, 8); scene.add(starLight)

    const SCENE_X = -2.6           // la escena vive a la izquierda; el panel va a la derecha
    const GAP = 2.0
    const world = new THREE.Group()
    world.position.x = SCENE_X
    scene.add(world)

    // estrellas de fondo
    const starGeo = new THREE.BufferGeometry()
    const sN = 500, sP = new Float32Array(sN * 3)
    for (let i = 0; i < sN; i++) { sP[i*3] = (Math.random()-0.5)*22; sP[i*3+1] = (Math.random()-0.5)*30; sP[i*3+2] = (Math.random()-0.5)*18 - 4 }
    starGeo.setAttribute('position', new THREE.BufferAttribute(sP, 3))
    const bgStars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: WHITE, size: 0.04, transparent: true, opacity: 0.5 }))
    scene.add(bgStars)

    // haz vertical (el camino)
    const beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-0.6,0), new THREE.Vector3(0,(N-1)*GAP+0.6,0)])
    world.add(new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.18 })))

    // anillos (niveles)
    interface Ring { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; glow: THREE.Mesh; y: number }
    const rings: Ring[] = []
    for (let i = 0; i < N; i++) {
      const y = i * GAP
      const mat = new THREE.MeshStandardMaterial({ color: 0x222227, emissive: RED, emissiveIntensity: 0.05, metalness: 0.6, roughness: 0.4 })
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.045, 16, 80), mat)
      mesh.position.y = y; mesh.rotation.x = Math.PI / 2
      world.add(mesh)
      const glow = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.12, 8, 80), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0 }))
      glow.position.y = y; glow.rotation.x = Math.PI / 2
      world.add(glow)
      rings.push({ mesh, mat, glow, y })
    }

    // partículas que suben por el haz
    const upN = 30, upGeo = new THREE.BufferGeometry(), upPos = new Float32Array(upN*3)
    const upT: number[] = []
    for (let i=0;i<upN;i++){ upT.push(Math.random()); upPos[i*3]=(Math.random()-0.5)*0.18; upPos[i*3+2]=(Math.random()-0.5)*0.18 }
    upGeo.setAttribute('position', new THREE.BufferAttribute(upPos,3))
    const upParticles = new THREE.Points(upGeo, new THREE.PointsMaterial({ color: REDL, size: 0.06, transparent: true, opacity: 0.7 }))
    world.add(upParticles)

    // estrella de Brier (sparkle 4 puntas, grande)
    const sh = new THREE.Shape()
    const spikes = 4, outer = 0.42, inner = 0.13
    for (let i=0;i<=spikes*2;i++){ const r=i%2===0?outer:inner; const a=(i/(spikes*2))*Math.PI*2-Math.PI/2; const x=Math.cos(a)*r,y=Math.sin(a)*r; if(i===0)sh.moveTo(x,y); else sh.lineTo(x,y) }
    const starGeo3 = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2 })
    starGeo3.center()
    const star = new THREE.Mesh(starGeo3, new THREE.MeshStandardMaterial({ color: RED, emissive: RED, emissiveIntensity: 0.85, metalness: 0.3, roughness: 0.3 }))
    world.add(star)
    star.add(new THREE.LineSegments(new THREE.EdgesGeometry(starGeo3), new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.85 })))
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 20), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending }))
    world.add(halo)

    let cur = 0, f = 0, raf = 0
    const frame = () => {
      f += 0.016
      const target = progRef.current * (N - 1)
      cur += (target - cur) * 0.1
      const starY = cur * GAP

      star.position.set(0, starY, 0.2)
      star.rotation.z += 0.02
      halo.position.copy(star.position)
      halo.scale.setScalar(1 + 0.12 * Math.sin(f * 4))
      starLight.position.set(SCENE_X, starY, 1)

      rings.forEach((r, i) => {
        const reached = cur >= i - 0.15
        r.mat.emissiveIntensity += ((reached ? 0.6 : 0.05) - r.mat.emissiveIntensity) * 0.1
        const gm = r.glow.material as THREE.MeshBasicMaterial
        gm.opacity += ((reached ? 0.25 : 0) - gm.opacity) * 0.1
        r.mesh.rotation.z += 0.003
      })

      // partículas suben
      const upArr = upParticles.geometry.attributes.position.array as Float32Array
      for (let i=0;i<upN;i++){ upT[i]+=0.004; if(upT[i]>1)upT[i]-=1; upArr[i*3+1]=upT[i]*((N-1)*GAP) }
      upParticles.geometry.attributes.position.needsUpdate = true

      bgStars.rotation.y += 0.0006

      // cámara sigue la estrella subiendo
      camera.position.set(SCENE_X + 0.2, starY + 0.8, 6.4)
      camera.lookAt(SCENE_X, starY + 0.3, 0)

      renderer.render(scene, camera)
    }
    const loop = () => { raf = requestAnimationFrame(loop); frame() }
    if (reduceMotion) frame(); else loop()

    const onResize = () => { W = window.innerWidth; H = window.innerHeight; camera.aspect = W/H; camera.updateProjectionMatrix(); renderer.setSize(W,H,false); if(reduceMotion) frame() }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      scene.traverse((obj) => {
        const o = obj as THREE.Mesh
        if (o.geometry) o.geometry.dispose()
        const mat = (o as THREE.Mesh).material
        if (mat) { if (Array.isArray(mat)) mat.forEach((m)=>m.dispose()); else mat.dispose() }
      })
      renderer.dispose()
    }
  }, [])

  const s = STEPS[step]

  return (
    <section ref={sectionRef} className="relative" style={{ height: '440vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        {/* escena 3D (estrella subiendo, lado izquierdo) */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* barra de progreso fina, sin números */}
        <div className="absolute left-5 md:left-8 top-1/2 -translate-y-1/2 h-[40vh] w-[2px] bg-[#1a1a1a] overflow-hidden rounded-full">
          <div className="w-full bg-primary rounded-full transition-[height] duration-150" style={{ height: `${prog * 100}%`, boxShadow: '0 0 12px rgba(255,42,77,0.6)' }} />
        </div>

        {/* contenido */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-8 items-center pointer-events-none">
          <div className="hidden lg:block" />
          <div>
            <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-primary mb-4">how your bot starts earning</div>
            <div key={step} style={{ animation: 'fadeIn 0.5s ease' }}>
              <div className="font-mono text-[11px] text-[#666] tracking-widest mb-3">{s.tag}</div>
              <h2 className="m-0 font-sans font-extrabold tracking-[-0.04em] text-[clamp(30px,4.5vw,52px)] leading-[1.02] mb-5">{s.title}<span className="text-primary">.</span></h2>
              <p className="m-0 text-[15px] md:text-[16px] leading-relaxed text-[#999] max-w-md mb-8">{s.body}</p>
              <ProductMock step={step} prog={prog} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
