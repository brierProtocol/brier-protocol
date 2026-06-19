'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Journey: el recorrido de un bot, contado con el SCROLL de la página.
 * Una línea vertical con 4 estaciones; la estrella de Brier baja por la línea
 * conforme scrolleas y cada paso aparece claro a su lado, con un mock del producto real.
 * Nada abstracto: se aprecia el recorrido paso a paso. Inglés, Inter, sin guiones.
 */

const STEPS = [
  { tag: 'TEST', title: 'Prove it risk free', body: 'Your bot makes test predictions for a few days. No capital at risk, nobody invests yet.', mock: 'shadow' },
  { tag: 'SCORE', title: 'Earn a real score', body: 'Every call settles against reality. Its Brier Score goes public for anyone to verify.', mock: 'score' },
  { tag: 'VAULT', title: 'Open your vault', body: 'Clear the bar and a non custodial vault opens. People invest, and exit, whenever they want.', mock: 'vault' },
  { tag: 'EARN', title: 'Get paid for accuracy', body: 'Real capital flows in. Profits split automatically between you and your depositors.', mock: 'earn' },
]
const N = STEPS.length

function BrierStar({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" style={{ filter: 'drop-shadow(0 0 10px rgba(255,42,77,0.85))' }}>
      <path d="M0,-11 L2.6,-2.6 L11,0 L2.6,2.6 L0,11 L-2.6,2.6 L-11,0 L-2.6,-2.6 Z" fill="#ff2a4d" stroke="#fff" strokeWidth="0.7" strokeLinejoin="round" />
    </svg>
  )
}

function ProductMock({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 w-full max-w-[300px]">
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
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 w-full max-w-[300px]">
        <div className="font-mono text-[9px] text-[#555] tracking-widest mb-1">BRIER SCORE</div>
        <div className="font-mono font-bold text-[40px] text-[#00d4aa] leading-none">0.183</div>
        <div className="text-[10px] font-mono text-[#00d4aa] mb-4">beats coin flip</div>
        <div className="grid grid-cols-2 gap-px bg-[#161616] border border-[#161616]">
          <div className="bg-[#0a0a0a] p-3"><div className="text-[8px] font-mono text-[#555] tracking-widest">WIN RATE</div><div className="font-mono text-[13px] text-white">61%</div></div>
          <div className="bg-[#0a0a0a] p-3"><div className="text-[8px] font-mono text-[#555] tracking-widest">RESOLVED</div><div className="font-mono text-[13px] text-white">214</div></div>
        </div>
      </div>
    )
  }
  if (step === 2) {
    return (
      <div className="bg-[#0a0a0a] border border-primary/30 p-5 w-full max-w-[300px] shadow-[0_0_30px_rgba(255,42,77,0.08)]">
        <div className="flex items-center justify-between mb-3">
          <span className="font-sans font-bold text-[15px]">ORACLE_NODE Vault</span>
          <span className="text-[9px] font-mono text-primary">OPEN</span>
        </div>
        <div className="font-mono text-[9px] text-[#555] tracking-widest mb-1">TVL</div>
        <div className="font-mono font-bold text-[28px] text-white leading-none mb-3">$128K</div>
        <div className="h-1.5 bg-[#161616] overflow-hidden"><div className="h-full bg-primary w-[82%]" /></div>
        <div className="text-[10px] font-mono text-[#666] mt-2">depositors earning, exit anytime</div>
      </div>
    )
  }
  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 w-full max-w-[300px]">
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
  const [prog, setProg] = useState(0)      // 0..1 sobre la sección
  const [active, setActive] = useState(0)  // estación activa

  useEffect(() => {
    const onScroll = () => {
      const sec = sectionRef.current
      if (!sec) return
      const rect = sec.getBoundingClientRect()
      const vh = window.innerHeight
      // progreso: cuánto de la sección ha pasado por el centro del viewport
      const total = rect.height - vh
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0
      setProg(p)
      setActive(Math.min(N - 1, Math.max(0, Math.round(p * (N - 1)))))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [])

  return (
    <section ref={sectionRef} className="relative bg-[#040404] border-t border-[#111]" style={{ minHeight: `${N * 78}vh` }}>
      {/* cabecera (scrollea normal, arriba de la sección) */}
      <div className="text-center pt-24 pb-8 px-6">
        <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-primary mb-4">step by step</div>
        <h2 className="m-0 font-sans font-extrabold tracking-[-0.04em] text-[clamp(28px,4.5vw,52px)]">
          How your bot starts <span className="text-primary">earning</span>.
        </h2>
      </div>

      {/* recorrido: rail sticky con la estrella + estaciones a la derecha */}
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-[44px_1fr] md:grid-cols-[80px_1fr] gap-4 md:gap-10">
        {/* RAIL sticky: línea + estrella que baja con el scroll */}
        <div className="sticky top-0 h-screen flex items-stretch justify-center">
          <div className="relative w-[2px] bg-[#1a1a1a] my-[14vh]">
            {/* fill */}
            <div className="absolute top-0 left-0 w-full bg-primary" style={{ height: `${prog * 100}%`, boxShadow: '0 0 10px rgba(255,42,77,0.6)' }} />
            {/* nodos de estación */}
            {STEPS.map((_, i) => (
              <div key={i} className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border transition-colors duration-300"
                style={{ top: `${(i / (N - 1)) * 100}%`, background: active >= i ? '#ff2a4d' : '#0a0a0a', borderColor: active >= i ? '#ff2a4d' : '#333' }} />
            ))}
            {/* estrella marcador */}
            <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 transition-[top] duration-150 ease-out" style={{ top: `${prog * 100}%` }}>
              <div className="animate-spin" style={{ animationDuration: '9s' }}><BrierStar /></div>
            </div>
          </div>
        </div>

        {/* ESTACIONES: una pantalla por paso */}
        <div>
          {STEPS.map((s, i) => (
            <div key={i} className="min-h-[78vh] flex flex-col justify-center">
              <div
                className="transition-all duration-500"
                style={{ opacity: active === i ? 1 : 0.32, transform: active === i ? 'translateY(0)' : 'translateY(10px)' }}
              >
                <div className="font-mono text-[11px] text-primary tracking-widest mb-3">{s.tag}</div>
                <h3 className="m-0 font-sans font-extrabold tracking-[-0.04em] text-[clamp(28px,4vw,46px)] leading-[1.04] mb-4">{s.title}<span className="text-primary">.</span></h3>
                <p className="m-0 text-[15px] md:text-[16px] leading-relaxed text-[#999] max-w-md mb-7">{s.body}</p>
                <ProductMock step={i} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
