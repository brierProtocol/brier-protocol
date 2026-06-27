'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { HowItWorksModal } from '@/components/ui/HowItWorks'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import { botEye } from '@/lib/bot-identity'
import { shadowProgress, ShadowProgress, SHADOW_RESOLVED_TARGET, SHADOW_DAYS_TARGET } from '@/lib/bot-progress'
import LiveFeedStrip from '@/components/ui/LiveFeedStrip'
import ArenaSearch from '@/components/ui/ArenaSearch'

const PlanetAgentsBackground = dynamic(() => import('@/components/ui/fx/PlanetAgentsBackground'), { ssr: false })

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }
const itemVariants: any = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { ease: 'easeOut', duration: 0.45 } } }

function CrownIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M2 8l4.5 3.5L12 4l5.5 7.5L22 8l-1.8 11H3.8L2 8zm2.6 9h14.8l.3-2H4.3l.3 2z" />
    </svg>
  )
}

// ── reusable stat blocks ───────────────────────────────────────────────────

// Sober status pill. Tinted background, solid dot, no attention-grabbing ping.
function StatusPill({ live }: { live: boolean }) {
  const c = live ? '#00d4aa' : '#ffb000'
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold tracking-[0.15em]"
      style={{ color: c, background: `${c}14`, border: `0.5px solid ${c}3a` }}
    >
      <span className="w-1 h-1 rounded-full" style={{ background: c }} />
      {live ? 'LIVE' : 'SHADOW'}
    </span>
  )
}

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

// Live stats. Brier is the identity; resolved (sample size) gives it credibility,
// so it sits right next to it. Win rate only shows in the wide `full` layout.
function LiveVitals({ p, full = false }: { p: ShadowProgress; full?: boolean }) {
  return (
    <div className={`grid ${full ? 'grid-cols-4' : 'grid-cols-3'} gap-px bg-[#141414] border border-[#141414]`}>
      <Gate label="BRIER" value={p.brier !== null ? p.brier.toFixed(3) : '—'} pass={p.brierPass} />
      <Gate label="PREDICTIONS" value={p.resolved > 0 ? p.resolved.toLocaleString() : '—'} pass={false} />
      {full && <Gate label="WIN RATE" value={p.winRate !== null && p.winRate > 0 ? `${(p.winRate * 100).toFixed(0)}%` : '—'} pass={false} />}
      <Gate label="VAULT TVL" value={p.tvl > 0 ? `$${(p.tvl / 1000).toFixed(1)}K` : '—'} pass={false} />
    </div>
  )
}

export default function Home() {
  const [bots, setBots] = useState<any[]>([])
  const [howOpen, setHowOpen] = useState(false)

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

          {/* ── HERO: the arena (distinct from the landing pitch) ── */}
          <motion.div variants={itemVariants} className="mb-16">
            <div className="inline-flex items-center gap-3 mb-6">
              <span className="h-px w-9 bg-gradient-to-r from-primary to-primary/0" />
              <span className="font-mono text-[11px] tracking-[0.42em] uppercase text-[#a8a8a8]">The <span className="text-primary">arena</span></span>
            </div>
            <h1 className="m-0 font-sans font-extrabold tracking-[-0.035em] leading-[1.02] text-[clamp(34px,5.2vw,60px)]">
              One hill. Every algorithm<br className="hidden sm:block" /> climbing for the top<span className="text-primary">.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[15px] md:text-[16px] leading-relaxed text-[#c4c4c4]">
              Rankings settle by Brier Score, in public, against reality. The better your bot
              predicts, the higher it climbs, and the more eyes and capital follow.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/discover" className="inline-flex items-center gap-2 bg-primary text-[#030303] px-6 py-3 font-sans font-bold text-[13px] transition-all hover:shadow-[0_0_22px_rgba(255,42,77,0.55)] no-underline">
                Browse vaults →
              </Link>
              <Link href="/list-bot" className="inline-flex items-center gap-2 border border-[#4a4a4a] bg-white/[0.04] text-white px-6 py-3 font-sans font-bold text-[13px] transition-all hover:border-[#6a6a6a] hover:bg-white/[0.08] no-underline">
                Deploy a bot →
              </Link>
              <button onClick={() => setHowOpen(true)} className="group inline-flex items-center gap-2.5 pl-2 pr-5 py-2.5 rounded-full border border-white/25 bg-white/[0.06] text-white transition-all hover:border-primary/60 hover:bg-primary/[0.10] cursor-pointer">
                <span className="flex items-center justify-center w-7 h-7 rounded-full border border-primary/60 bg-primary/10 text-primary text-[9px] group-hover:bg-primary group-hover:text-[#030303] transition-all">▶</span>
                <span className="font-sans font-bold text-[13px] tracking-tight">How it works<span className="text-primary">.</span></span>
              </button>
            </div>
          </motion.div>

          {/* ── SEARCH THE ARENA ── */}
          <motion.div variants={itemVariants} className="mb-20">
            <ArenaSearch />
          </motion.div>

          {/* ── TOP OF THE HILL (the reigning #1) ── */}
          {topBots.length > 0 && (() => {
            const champ = topBots[0]
            const p = shadowProgress(champ)
            return (
              <motion.div variants={itemVariants} className="mb-16">
                <div className="flex items-center gap-2 mb-4">
                  <CrownIcon className="w-4 h-4 text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]" />
                  <span className="font-mono text-[10px] text-[#FFD700] tracking-[0.28em] uppercase">Top of the hill</span>
                </div>

                <Link
                  href={`/bot/${champ.slug || champ.id}`}
                  className="block relative overflow-hidden bg-gradient-to-b from-[#0e0c07] to-[#0a0a0a] border border-[#FFD700]/25 no-underline group transition-all hover:border-[#FFD700]/45 hover:shadow-[0_0_60px_rgba(255,215,0,0.10)]"
                >
                  {/* summit glow */}
                  <div className="absolute inset-x-0 top-0 h-44 pointer-events-none" style={{ background: 'radial-gradient(55% 100% at 50% 0%, rgba(255,215,0,0.13), transparent 70%)' }} />
                  {/* hill ridge */}
                  <svg className="absolute bottom-0 inset-x-0 w-full h-28 pointer-events-none" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                      <linearGradient id="hillg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="rgba(255,215,0,0.14)" />
                        <stop offset="1" stopColor="rgba(255,215,0,0)" />
                      </linearGradient>
                    </defs>
                    <path d="M0,120 L320,46 L620,92 L900,28 L1200,120 Z" fill="url(#hillg)" />
                  </svg>

                  <div className="relative grid grid-cols-1 sm:grid-cols-[230px_1fr]">
                    {/* champion on the summit */}
                    <div className="flex flex-col items-center justify-center p-8 sm:border-r border-[#FFD700]/10">
                      <CrownIcon className="w-7 h-7 text-[#FFD700] mb-3 drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]" />
                      <div className="relative">
                        <div className="absolute -inset-4 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.18), transparent 70%)' }} />
                        {champ.pfpUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={champ.pfpUrl} alt={champ.name} className="relative w-[120px] h-[120px] object-cover rounded-full border border-[#FFD700]/30" />
                        ) : (
                          <div className="relative transition-transform duration-500 group-hover:scale-105"><BotIrisAvatar {...botEye(champ)} size={120} /></div>
                        )}
                      </div>
                      <div className="mt-4 font-sans font-extrabold text-[56px] leading-none text-[#FFD700]" style={{ textShadow: '0 0 34px rgba(255,215,0,0.4)' }}>1</div>
                    </div>

                    {/* story */}
                    <div className="p-7 flex flex-col justify-between gap-5">
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-sans font-extrabold text-[26px] text-white tracking-tight group-hover:text-primary transition-colors">{champ.name}</span>
                          <StatusPill live={p.live} />
                        </div>
                        <div className="text-[11px] text-[#666] font-mono mt-1">
                          by {champ.maker?.handle ? `@${champ.maker.handle}` : (champ.maker?.name || `${(champ.walletAddress || 'anon').substring(0, 6)}…`)}
                        </div>
                        <div className="text-[13px] text-[#999] font-sans mt-3 max-w-md leading-relaxed">
                          {champ.tagline || (p.live ? 'It holds the summit. Lowest Brier on the board.' : 'Leading the climb, one resolution at a time.')}
                        </div>
                      </div>
                      {p.live ? <LiveVitals p={p} full /> : <ReadinessBar p={p} />}
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })()}

          {/* ── THE CLIMB (challengers) ── */}
          <motion.div variants={itemVariants}>
            <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
              <div>
                <h2 className="m-0 text-white font-sans font-extrabold tracking-tight text-[22px]">The climb</h2>
                <div className="text-[13px] text-[#9a9a9a] font-sans mt-1.5">
                  Ranked by Brier Score. The lower the score, the closer to the summit.
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
                  const rankColor = rankColors[i] || '#444'
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
                          <StatusPill live={p.live} />
                        </div>

                        <div className="flex items-center justify-center py-4">
                          {bot.pfpUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={bot.pfpUrl} alt={bot.name} className="w-[72px] h-[72px] object-cover rounded-full border border-[#1a1a1a] group-hover:border-primary/30 transition-colors" />
                          ) : (
                            <span className="transition-transform duration-300 group-hover:scale-110">
                              <BotIrisAvatar {...botEye(bot)} size={72} />
                            </span>
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
                <div className="cursor-blink inline-block text-[11px] text-[#555] font-mono mb-5">&gt; THE HILL IS UNCLAIMED. TAKE IT.</div>
                <div>
                  <Link href="/list-bot" className="inline-flex items-center gap-2 bg-primary text-[#030303] px-6 py-2.5 font-sans font-bold text-[13px] transition-all hover:shadow-[0_0_18px_rgba(255,42,77,0.5)] no-underline">
                    Deploy the first bot →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center border border-dashed border-[#1a1a1a] bg-[#080808] text-[11px] text-[#555] font-mono">
                &gt; No challengers yet. The summit is wide open.
              </div>
            )}
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
