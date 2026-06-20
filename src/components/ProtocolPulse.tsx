'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import BotIrisAvatar from './BotIrisAvatar'
import { botEye } from '@/lib/botIdentity'

/**
 * Pulso del protocolo: franja de números reales (TVL, algorithms, live nodes) con
 * count up, y el agente #1 destacado. Datos en vivo desde /api/bots. Le da al landing
 * credibilidad real, no solo gráficos. Inglés, Inter, sin guiones.
 */

const LIVE = ['live', 'LIVE', 'VAULT_ELIGIBLE_T1', 'VAULT_ELIGIBLE_T2']

function useCountUp(target: number, run: boolean, duration = 1300) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!run || !target) { setVal(target ? 0 : 0); if (!target) return }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      setVal(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run, duration])
  return val
}

export default function ProtocolPulse() {
  const [champ, setChamp] = useState<any>(null)
  const [stats, setStats] = useState({ bots: 0, tvl: 0, live: 0 })
  const [seen, setSeen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/bots')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return
        const sorted = [...data].sort((a, b) => {
          const ba = a.scores?.[0]?.brierScore ?? a.brierScore ?? 1
          const bb = b.scores?.[0]?.brierScore ?? b.brierScore ?? 1
          return ba - bb
        })
        const live = data.filter((b: any) => LIVE.includes(b.status || '')).length
        const tvl = data.reduce((acc: number, b: any) => acc + (b.currentTVL ?? b.tvl ?? 0), 0)
        setStats({ bots: data.length, tvl, live })
        const top = sorted.find((b: any) => (b.scores?.[0]?.brierScore ?? b.brierScore ?? 0) > 0) || sorted[0]
        if (top) setChamp(top)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setSeen(true); io.disconnect() } }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const tvlV = useCountUp(stats.tvl, seen)
  const botsV = useCountUp(stats.bots, seen)
  const liveV = useCountUp(stats.live, seen)

  const cBrier = champ ? (champ.scores?.[0]?.brierScore ?? champ.brierScore ?? 0) : 0
  const cWr = champ ? (champ.scores?.[0]?.winRate ?? champ.winRate ?? 0) : 0
  const cTvl = champ ? (champ.currentTVL ?? champ.tvl ?? 0) : 0
  const cLive = champ ? LIVE.includes(champ.status || '') : false

  return (
    <section ref={ref} className="relative bg-[#030303] border-t border-[#111] py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* franja de números reales */}
        <div className="grid grid-cols-3 gap-px bg-[#141414] border border-[#141414] mb-16">
          {[
            ['Total TVL', stats.tvl > 0 ? `$${(tvlV / 1000).toFixed(tvlV >= 10000 ? 0 : 1)}K` : '—'],
            ['Algorithms', stats.bots > 0 ? Math.round(botsV).toString() : '—'],
            ['Live nodes', stats.live > 0 ? Math.round(liveV).toString() : '—'],
          ].map(([label, val]) => (
            <div key={label as string} className="bg-[#060606] py-8 px-4 text-center">
              <div className="font-sans font-extrabold tracking-tight text-[clamp(28px,5vw,52px)] tabular-nums">{val}</div>
              <div className="font-mono text-[10px] md:text-[11px] tracking-[0.18em] uppercase text-[#666] mt-2">{label}</div>
            </div>
          ))}
        </div>

        {/* agente #1 destacado */}
        {champ && (
          <>
            <div className="font-mono text-[10px] text-[#555] tracking-[0.25em] mb-3 text-center uppercase">Featured agent · the one to beat</div>
            <Link
              href={`/bot/${champ.slug || champ.id}`}
              className="flex flex-col sm:flex-row bg-[#0a0a0a] border border-[#FFD700]/20 no-underline relative overflow-hidden group transition-all hover:border-[#FFD700]/40 hover:shadow-[0_0_44px_rgba(255,215,0,0.08)] max-w-3xl mx-auto"
            >
              <div className="sm:w-[160px] shrink-0 flex items-center justify-center bg-[#050505] border-b sm:border-b-0 sm:border-r border-[#141414] p-6">
                {champ.pfpUrl
                  ? <img src={champ.pfpUrl} alt={champ.name} className="w-[100px] h-[100px] object-cover border border-[#1a1a1a]" />
                  : <BotIrisAvatar {...botEye(champ)} size={100} />}
              </div>
              <div className="flex-1 p-6 flex flex-col justify-between gap-5">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-sans font-extrabold text-[22px] tracking-tight group-hover:text-primary transition-colors">{champ.name}</span>
                    <span className={`inline-flex items-center gap-1.5 text-[9px] font-mono ${cLive ? 'text-[#00d4aa]' : 'text-[#666]'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cLive ? 'bg-[#00d4aa] animate-pulse' : 'bg-[#333]'}`} />
                      {cLive ? 'LIVE' : 'SHADOW'}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#555] font-mono mt-1">
                    by {champ.maker?.handle ? `@${champ.maker.handle}` : (champ.maker?.name || `${(champ.walletAddress || 'anon').substring(0, 6)}…`)}
                  </div>
                </div>
                <div className="flex gap-8 flex-wrap">
                  {[
                    ['BRIER', cBrier > 0 ? cBrier.toFixed(3) : 'AWAITING', cBrier > 0 && cBrier <= 0.25 ? '#00d4aa' : '#fff'],
                    ['WIN RATE', cWr > 0 ? `${(cWr * 100).toFixed(0)}%` : '—', '#fff'],
                    ['VAULT TVL', cTvl > 0 ? `$${(cTvl / 1000).toFixed(1)}K` : '—', '#fff'],
                  ].map(([l, val, c]) => (
                    <div key={l as string}>
                      <div className="text-[9px] font-mono text-[#555] tracking-widest">{l}</div>
                      <div className="font-mono font-bold text-[16px]" style={{ color: c as string }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden md:flex items-center pr-8">
                <span className="font-sans font-extrabold text-[52px] leading-none text-[#FFD700]" style={{ textShadow: '0 0 34px rgba(255,215,0,0.35)' }}>1</span>
              </div>
            </Link>
          </>
        )}
      </div>
    </section>
  )
}
