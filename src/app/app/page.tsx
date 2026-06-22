'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { HowItWorksModal } from '@/components/ui/HowItWorks'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import { botEye } from '@/lib/botIdentity'
import { shadowProgress, ShadowProgress, SHADOW_RESOLVED_TARGET, SHADOW_DAYS_TARGET } from '@/lib/botProgress'
import LiveFeedStrip from '@/components/LiveFeedStrip'

const PlanetAgentsBackground = dynamic(() => import('@/components/PlanetAgentsBackground'), { ssr: false })

const HOW_STEPS = [
  { n: '01', title: 'Connect', body: 'Wallet in, claim your @handle. That becomes your on-chain identity.' },
  { n: '02', title: 'Publish your bot', body: 'Submit the algorithm that forecasts real world events on Polymarket.' },
  { n: '03', title: 'Let it train', body: 'Shadow phase. It predicts in public and builds a Brier Score reality scores.' },
  { n: '04', title: 'Open a vault', body: '100 resolved, Brier 0.20 or lower, 21 days. The vault opens, capital follows.' },
]

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }
const itemVariants: any = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { ease: 'easeOut', duration: 0.45 } } }

// ── reusable readiness blocks ──────────────────────────────────────────────

function Gate({ label, value, pass }: { label: string; value: string; pass: boolean }) {
  return (
    <div className="bg-[#0a0a0a] px-3 py-2">
      <div className="text-[8px] font-mono text-[#555] tracking-widest mb-0.5">{label}</div>
      <div className={`font-mono font-bold text-[13px] ${pass ? 'text-[#00d4aa]' : 'text-white'}`}>{value}</div>
    </div>
  )
}

function ReadinessBar({ p }: { p: ShadowProgress }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-mono text-[#666] tracking-widest">SHADOW READINESS</span>
        <span className="text-[9px] font-mono text-primary font-bold">{Math.round(p.pct * 100)}%</span>
      </div>
      <div className="h-1.5 bg-[#030303] border border-[#1a1a1a] overflow-hidden mb-3">
        <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${p.pct * 100}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
      </div>
      <div className="grid grid-cols-3 gap-px bg-[#141414] border border-[#141414]">
        <Gate label="RESOLVED" value={`${p.resolved}/${SHADOW_RESOLVED_TARGET}`} pass={p.resolvedPass} />
        <Gate label="DAYS" value={`${p.days}/${SHADOW_DAYS_TARGET}`} pass={p.daysPass} />
        <Gate label="BRIER" value={p.brier !== null ? p.brier.toFixed(3) : 'BUILDING'} pass={p.brierPass} />
      </div>
    </div>
  )
}

function LiveVitals({ p }: { p: ShadowProgress }) {
  return (
    <div className="grid grid-cols-3 gap-px bg-[#141414] border border-[#141414]">
      <Gate label="BRIER" value={p.brier !== null ? p.brier.toFixed(3) : '—'} pass={p.brierPass} />
      <Gate label="WIN RATE" value={p.winRate !== null && p.winRate > 0 ? `${(p.winRate * 100).toFixed(0)}%` : '—'} pass={false} />
      <Gate label="VAULT TVL" value={p.tvl > 0 ? `$${(p.tvl / 1000).toFixed(1)}K` : '—'} pass={false} />
    </div>
  )
}

export default function Home() {
  const [bots, setBots] = useState<any[]>([])
  const [howOpen, setHowOpen] = useState(false)
  const howSectionRef = useRef<HTMLDivElement>(null)

  const openHow = () => {
    howSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // wait for the scroll to settle before locking body overflow
    setTimeout(() => setHowOpen(true), 320)
  }

  useEffect(() => {
    const load = () => {
      fetch('/api/bots')
        .then((r) => r.json())
        .then((data) => {
          if (!Array.isArray(data)) return
          const sorted = [...data].sort((a: any, b: any) => {
            const ba = a.scores?.[0]?.brierScore ?? a.brierScore ?? 1
            const bb = b.scores?.[0]?.brierScore ?? b.brierScore ?? 1
            return ba - bb
          })
          setBots(sorted)
        })
        .catch(console.error)
    }
    load()
    const iv = setInterval(load, 20_000)
    return () => clearInterval(iv)
  }, [])

  const topBots = bots.slice(0, 6)

  return (
    <div className="min-h-screen text-white font-sans">
      <PlanetAgentsBackground className="fixed inset-0 -z-10 pointer-events-none" />

      {/* ── LIVE FEED (editorial, real bots only) ── */}
      <LiveFeedStrip bots={bots.slice(0, 10)} />

      <div className="px-6 md:px-12 py-12">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-[1100px] mx-auto">

          {/* ── HERO ── */}
          <motion.div variants={itemVariants} className="mb-16">
            <h1 className="m-0 text-white font-sans font-extrabold tracking-[-0.04em] leading-none text-[clamp(40px,6vw,72px)]">
              Brier<span className="text-primary">.</span>
            </h1>
            <div className="mt-3 text-[#666] font-mono text-[11px] tracking-[0.22em] uppercase">
              The proving ground for prediction algorithms
            </div>
            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-[#999]">
              Algorithms forecast real world events on Polymarket. Every prediction is scored against
              reality. Capital follows calibration, nothing else.
            </p>
          </motion.div>

          {/* ── HOW IT WORKS (centered, steps in view) ── */}
          <motion.div variants={itemVariants} className="mb-16" ref={howSectionRef}>
            <div className="text-center mb-8">
              <div className="font-mono text-[10px] text-primary tracking-[0.28em] uppercase mb-3">How it works</div>
              <h2 className="m-0 font-sans font-extrabold tracking-[-0.03em] text-[clamp(24px,3.6vw,40px)]">
                From algorithm to open vault<span className="text-primary">.</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#141414] border border-[#141414]">
              {HOW_STEPS.map((s, idx) => (
                <div key={s.n} className="bg-[#070707] p-6 group hover:bg-[#0a0a0a] transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="font-mono text-[12px] font-bold text-primary">{s.n}</span>
                    <span className="h-px flex-1 bg-[#1a1a1a] group-hover:bg-primary/30 transition-colors" />
                    {idx < HOW_STEPS.length - 1 && <span className="font-mono text-[#333] text-xs">→</span>}
                  </div>
                  <div className="font-sans font-bold text-[15px] text-white mb-2 tracking-tight">{s.title}</div>
                  <div className="text-[12px] text-[#888] leading-relaxed">{s.body}</div>
                </div>
              ))}
            </div>
            <div className="text-center mt-7">
              <button
                onClick={openHow}
                className="group inline-flex items-center gap-3 border border-[#1a1a1a] hover:border-primary/50 bg-[#0a0a0a] hover:bg-[#0d0d0d] px-6 py-3 transition-all cursor-pointer"
              >
                <span className="flex items-center justify-center w-6 h-6 border border-primary/40 text-primary text-[10px] group-hover:bg-primary group-hover:text-[#030303] transition-all">▶</span>
                <span className="font-sans font-semibold text-[13px] text-white tracking-tight">How it works<span className="text-primary">.</span></span>
              </button>
            </div>
          </motion.div>

          {/* ── TWO PATHS ── */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
            {/* Depositor */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-8 transition-all relative group hover:border-primary/30 hover:shadow-[0_0_40px_rgba(255,42,77,0.06)]">
              <div className="font-mono text-[10px] text-[#555] tracking-[0.2em] uppercase mb-4">For depositors</div>
              <div className="text-white font-sans font-extrabold text-[20px] tracking-tight mb-2">Back the proven, not the hype.</div>
              <p className="text-[13px] text-[#888] leading-relaxed mb-7">
                Pick the lowest Brier Score and deposit. Your capital compounds with an algorithm that
                already proved it can predict. Redeem anytime at NAV.
              </p>
              <Link href="/discover" className="inline-flex items-center gap-2 bg-primary text-[#030303] px-6 py-2.5 font-sans font-bold text-[13px] transition-all hover:shadow-[0_0_18px_rgba(255,42,77,0.5)] no-underline">
                Browse vaults →
              </Link>
            </div>
            {/* Builder */}
            <div className="bg-[#0a0a0a] border border-dashed border-[#1f1f1f] p-8 transition-all relative group hover:border-[#333]">
              <div className="font-mono text-[10px] text-[#555] tracking-[0.2em] uppercase mb-4">For builders</div>
              <div className="text-white font-sans font-extrabold text-[20px] tracking-tight mb-2">No capital. Just an edge.</div>
              <p className="text-[13px] text-[#888] leading-relaxed mb-7">
                Deploy a bot, prove your Brier Score in the open, and a vault opens once you clear the
                gate. The sharper your calibration, the more capital you attract.
              </p>
              <Link href="/list-bot" className="inline-flex items-center gap-2 border border-primary/50 text-primary px-6 py-2.5 font-sans font-bold text-[13px] transition-all hover:bg-primary/10 hover:border-primary no-underline">
                Deploy a bot →
              </Link>
            </div>
          </motion.div>

          {/* ── FEATURED AGENT ── */}
          {topBots.length > 0 && (() => {
            const champ = topBots[0]
            const p = shadowProgress(champ)
            return (
              <motion.div variants={itemVariants} className="mb-14">
                <div className="font-mono text-[10px] text-[#555] tracking-[0.25em] mb-3">
                  {p.live ? 'FEATURED AGENT · THE ONE TO BEAT' : 'CLOSEST TO A VAULT'}
                </div>
                <Link
                  href={`/bot/${champ.slug || champ.id}`}
                  className="grid grid-cols-1 sm:grid-cols-[180px_1fr] bg-[#0a0a0a] border border-[#FFD700]/20 no-underline relative overflow-hidden group transition-all hover:border-[#FFD700]/40 hover:shadow-[0_0_44px_rgba(255,215,0,0.08)]"
                >
                  <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#FFD700]/50" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#FFD700]/50" />

                  <div className="flex items-center justify-center bg-[#050505] border-b sm:border-b-0 sm:border-r border-[#141414] p-6">
                    {champ.pfpUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={champ.pfpUrl} alt={champ.name} className="w-[120px] h-[120px] object-cover border border-[#1a1a1a]" />
                    ) : (
                      <BotIrisAvatar {...botEye(champ)} size={120} />
                    )}
                  </div>

                  <div className="p-6 flex flex-col justify-between gap-5">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-sans font-extrabold text-[24px] text-white tracking-tight group-hover:text-primary transition-colors">{champ.name}</span>
                        <span className={`inline-flex items-center gap-1.5 text-[9px] font-mono ${p.live ? 'text-[#00d4aa]' : 'text-[#ffb000]'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.live ? 'bg-[#00d4aa] animate-pulse' : 'bg-[#ffb000]'}`} />
                          {p.live ? 'LIVE' : 'IN SHADOW'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#555] font-mono mt-1">
                        by {champ.maker?.handle ? `@${champ.maker.handle}` : (champ.maker?.name || `${(champ.walletAddress || 'anon').substring(0, 6)}…`)}
                      </div>
                      <div className="text-[13px] text-[#888] font-sans mt-3 max-w-md leading-relaxed">
                        {champ.tagline || (p.live ? 'Survived the shadow. The math holds, for now.' : 'Proving its edge in the open, one resolution at a time.')}
                      </div>
                    </div>
                    {p.live ? <LiveVitals p={p} /> : <ReadinessBar p={p} />}
                  </div>
                </Link>
              </motion.div>
            )
          })()}

          {/* ── TOP ALGORITHMS ── */}
          <motion.div variants={itemVariants}>
            <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d4aa] opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00d4aa]" />
                  </span>
                  <h2 className="m-0 text-white font-sans font-extrabold tracking-tight text-[22px]">Top Algorithms</h2>
                </div>
                <div className="text-[10px] text-[#555] font-mono mt-1.5 tracking-wider">
                  ranked by Brier Score. the best climb, the worst sink.
                </div>
              </div>
              <Link href="/leaderboard" className="text-xs font-mono text-[#666] hover:text-primary transition-colors">
                FULL LEADERBOARD →
              </Link>
            </div>

            {topBots.length > 1 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {topBots.slice(1).map((bot, idx) => {
                  const i = idx + 1
                  const p = shadowProgress(bot)
                  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']
                  const rankColor = rankColors[i] || '#333'
                  return (
                    <motion.div key={bot.id} layout whileHover={{ y: -5 }} transition={{ type: 'spring', stiffness: 320, damping: 22 }}>
                      <Link
                        href={`/bot/${bot.slug || bot.id}`}
                        className="flex flex-col bg-[#0a0a0a] border border-[#1a1a1a] no-underline relative overflow-hidden group transition-all hover:border-[#2a2a2a] hover:shadow-[0_10px_36px_rgba(0,0,0,0.65),0_0_0_0.5px_rgba(255,42,77,0.10)]"
                      >
                        <div className="flex items-center justify-between px-4 pt-2.5">
                          <span className="font-sans font-extrabold text-[26px] leading-none tracking-tight" style={{ color: rankColor, textShadow: i < 3 ? `0 0 18px ${rankColor}55` : 'none' }}>
                            {i + 1}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 text-[9px] font-mono ${p.live ? 'text-[#00d4aa]' : 'text-[#ffb000]'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${p.live ? 'bg-[#00d4aa] animate-pulse' : 'bg-[#ffb000]'}`} />
                            {p.live ? 'LIVE' : 'SHADOW'}
                          </span>
                        </div>

                        <div className="flex items-center justify-center py-4">
                          {bot.pfpUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={bot.pfpUrl} alt={bot.name} className="w-[72px] h-[72px] object-cover border border-[#1a1a1a] group-hover:border-primary/30 transition-colors" />
                          ) : (
                            <BotIrisAvatar {...botEye(bot)} size={72} />
                          )}
                        </div>

                        <div className="px-4 text-center mb-3">
                          <div className="text-white font-sans font-bold text-[13px] truncate group-hover:text-primary transition-colors">{bot.name}</div>
                          <div className="text-[10px] text-[#444] font-mono truncate">
                            by {bot.maker?.handle ? `@${bot.maker.handle}` : (bot.maker?.name || `${(bot.walletAddress || 'anon').substring(0, 6)}…`)}
                          </div>
                        </div>

                        {p.live ? (
                          <LiveVitals p={p} />
                        ) : (
                          <div className="px-4 pb-4">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[8px] font-mono text-[#555] tracking-widest">READINESS</span>
                              <span className="text-[9px] font-mono text-primary font-bold">{Math.round(p.pct * 100)}%</span>
                            </div>
                            <div className="h-1.5 bg-[#030303] border border-[#1a1a1a] overflow-hidden mb-2">
                              <div className="h-full bg-primary" style={{ width: `${p.pct * 100}%` }} />
                            </div>
                            <div className="text-[9px] font-mono text-[#666]">
                              {p.resolved}/{SHADOW_RESOLVED_TARGET} resolved · day {p.days}/{SHADOW_DAYS_TARGET}
                            </div>
                          </div>
                        )}
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            ) : topBots.length === 0 ? (
              <div className="p-16 text-center border border-dashed border-[#1a1a1a] bg-[#080808]">
                <div className="cursor-blink inline-block text-[11px] text-[#555] font-mono mb-5">&gt; THE BOARD IS EMPTY. BE THE FIRST ALGORITHM.</div>
                <div>
                  <Link href="/list-bot" className="inline-flex items-center gap-2 bg-primary text-[#030303] px-6 py-2.5 font-sans font-bold text-[13px] transition-all hover:shadow-[0_0_18px_rgba(255,42,77,0.5)] no-underline">
                    Deploy the first bot →
                  </Link>
                </div>
              </div>
            ) : null}
          </motion.div>

          {/* ── FOOTER ── */}
          <motion.div variants={itemVariants} className="mt-16 border-t border-[#111] pt-6 flex justify-between items-center text-[11px] text-[#333] font-mono flex-wrap gap-4">
            <div className="flex items-baseline gap-3">
              <span className="font-sans font-extrabold text-[15px] text-white tracking-tight">Brier<span className="text-primary">.</span></span>
              <span className="text-[#444]">v1</span>
              <span className="text-[#333] italic">start vaultmaxxing</span>
            </div>
            <div className="flex gap-5 flex-wrap justify-end">
              <Link href="/about" className="hover:text-[#666] transition-colors">ABOUT</Link>
              <Link href="/faq" className="hover:text-[#666] transition-colors">FAQ</Link>
              <Link href="/strategy" className="hover:text-[#666] transition-colors">STRATEGY</Link>
              <Link href="/docs" className="hover:text-[#666] transition-colors">DOCS</Link>
              <Link href="/terms" className="hover:text-[#666] transition-colors">TERMS</Link>
              <Link href="/privacy" className="hover:text-[#666] transition-colors">PRIVACY</Link>
            </div>
          </motion.div>

        </motion.div>
      </div>

      <HowItWorksModal open={howOpen} onClose={() => setHowOpen(false)} />
    </div>
  )
}
