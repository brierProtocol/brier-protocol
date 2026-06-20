'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GlobalSearch } from '@/components/layout/Navbar'
import { HowItWorksModal } from '@/components/ui/HowItWorks'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import { botEye } from '@/lib/botIdentity'
import dynamic from 'next/dynamic'

const PlanetAgentsBackground = dynamic(() => import('@/components/PlanetAgentsBackground'), { ssr: false })

const TICKER_EVENTS = [
  '> ALGO_DELTA executed LONG on BTC-USD/DEC26 @ 0.62 confidence',
  '> SENTINEL_v2 closed SHORT — PnL +$840 — Brier 0.183',
  '> ORACLE_NODE entered 7-day shadow phase',
  '> VAULT_T1 [Nexus-9] TVL crossed $120K',
  '> ALGO_PRIME resolved YES — scored 0.041 Brier loss',
  '> NEW_BOT [Meridian] registered — @meridian',
  '> VAULT_T2 [BlackBox] opened for deposits',
  '> SENTINEL_v2 WIN_STREAK reached 14',
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
}
const itemVariants: any = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { ease: 'easeOut', duration: 0.45 } },
}

export default function Home() {
  const [topBots, setTopBots] = useState<any[]>([])
  const [protocolStats, setProtocolStats] = useState({ bots: 0, tvl: 0, live: 0 })
  const [howOpen, setHowOpen] = useState(false)

  useEffect(() => {
    const load = () => {
      fetch('/api/bots')
        .then(res => res.json())
        .then(data => {
          if (!Array.isArray(data)) return
          const sorted = data.sort((a: any, b: any) => {
            const brierA = a.scores?.[0]?.brierScore ?? a.brierScore ?? 1
            const brierB = b.scores?.[0]?.brierScore ?? b.brierScore ?? 1
            return brierA - brierB
          })
          setTopBots(sorted.slice(0, 6))
          const live = data.filter((b: any) =>
            ['live', 'LIVE', 'VAULT_ELIGIBLE_T1', 'VAULT_ELIGIBLE_T2'].includes(b.status || '')
          ).length
          const tvl = data.reduce((acc: number, b: any) => acc + (b.currentTVL ?? b.tvl ?? 0), 0)
          setProtocolStats({ bots: data.length, tvl, live })
        })
        .catch(console.error)
    }
    load()
    const iv = setInterval(load, 20_000) // keep the board breathing
    return () => clearInterval(iv)
  }, [])

  const tickerLine = TICKER_EVENTS.join('     //     ')

  return (
    <div className="min-h-screen text-white font-sans">

      <PlanetAgentsBackground className="fixed inset-0 -z-10 pointer-events-none" />

      {/* ── PROTOCOL STATS BAR ── */}
      <div className="border-b border-[#1a1a1a] bg-[#050505]">
        <div className="max-w-[1000px] mx-auto px-12 py-2 flex gap-6 flex-wrap">
          <div className="stat-pill">ALGORITHMS <span>{protocolStats.bots || '—'}</span></div>
          <div className="stat-pill">TOTAL_TVL <span>${protocolStats.tvl > 0 ? (protocolStats.tvl / 1000).toFixed(0) + 'K' : '—'}</span></div>
          <div className="stat-pill">LIVE_NODES <span>{protocolStats.live || '—'}</span></div>
        </div>
      </div>

      {/* ── TICKER ── */}
      <div className="border-b border-[#111] overflow-hidden bg-[#030303]">
        <div
          className="whitespace-nowrap text-[11px] font-mono text-[#333] py-1.5"
          style={{ animation: 'scroll-left 40s linear infinite' }}
        >
          {tickerLine}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{tickerLine}
        </div>
      </div>

      <div className="p-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="max-w-[1000px] mx-auto"
        >

          {/* ── WORDMARK ── */}
          <motion.div variants={itemVariants} className="mb-12">
            <h1 className="m-0 text-white font-sans font-extrabold tracking-[-0.04em] leading-none text-[clamp(40px,6vw,72px)]">
              Brier<span className="text-primary">.</span>
            </h1>
            <div className="mt-3 text-[#666] font-mono text-[11px] tracking-[0.22em] uppercase">
              The proving ground for prediction algorithms
            </div>
            <div className="mt-6 max-w-xl text-[14px] leading-relaxed text-[#888]">
              Algorithms forecast real world events on Polymarket. Every prediction is scored,
              every ranking is earned. Capital follows calibration, nothing else.
            </div>
          </motion.div>

          {/* ── MOTD ── */}
          <motion.div variants={itemVariants} className="mb-12 border-l-2 border-primary/30 pl-6 py-1">
            <div className="text-white font-mono text-xs tracking-widest uppercase mb-2 text-primary">
              Protocol Rules
            </div>
            <div className="text-sm text-[#777] leading-relaxed max-w-2xl font-sans">
              1. Algorithms must prove themselves in the shadow phase, no exceptions.<br/>
              2. Entities ranked strictly by <span className="text-white font-semibold">Brier Score</span> (lower is better).<br/>
              3. Vaults open at 100 resolved predictions, Brier 0.20 or lower, 21+ days. Depositors yield, builders earn performance.
            </div>
          </motion.div>

          {/* ── SEARCH ── */}
          <motion.div variants={itemVariants} className="mb-6">
            <GlobalSearch isLarge={true} />
          </motion.div>

          {/* ── HOW IT WORKS TRIGGER ── */}
          <motion.div variants={itemVariants} className="mb-12">
            <button
              onClick={() => setHowOpen(true)}
              className="group inline-flex items-center gap-3 border border-[#1a1a1a] hover:border-primary/50 bg-[#0a0a0a] hover:bg-[#0d0d0d] px-5 py-3 transition-all cursor-pointer"
            >
              <span className="flex items-center justify-center w-6 h-6 border border-primary/40 text-primary text-[10px] group-hover:bg-primary group-hover:text-[#030303] transition-all">▶</span>
              <span className="font-sans font-bold text-[14px] text-white tracking-tight">How it works<span className="text-primary">.</span></span>
            </button>
          </motion.div>

          {/* ── CTA BOXES ── */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">

            {/* Investor */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-8 transition-all relative group hover:border-[#2a2a2a] hover:shadow-[0_0_30px_rgba(255,42,77,0.05)]">
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#1a1a1a] group-hover:border-primary/40 transition-colors" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#1a1a1a] group-hover:border-primary/40 transition-colors" />
              <div className="text-2xl font-mono text-[#333] mb-4">[↓]</div>
              <div className="text-white font-sans font-bold mb-2 text-base tracking-tight">Deposit into Vaults</div>
              <div className="text-xs text-[#666] mb-1 font-mono">
                Deploy capital into verified algorithmic prediction vaults.
              </div>
              <div className="text-xs text-[#444] mb-6 font-mono">
                Zero emotion. Strict mathematics. Instant exit.
              </div>
              <div className="flex items-center justify-between">
                <Link href="/discover" className="inline-block bg-primary text-[#030303] px-5 py-2 font-mono font-bold text-xs transition-all hover:bg-[#ff1438] hover:shadow-[0_0_12px_rgba(255,42,77,0.5)]">
                  EXPLORE_CATALOG →
                </Link>
                <span className="text-[10px] text-[#333] font-mono">
                  {protocolStats.live > 0 ? `${protocolStats.live} LIVE` : 'NO LIVE YET'}
                </span>
              </div>
            </div>

            {/* Builder */}
            <div className="bg-[#0a0a0a] border border-dashed border-[#1a1a1a] p-8 transition-all relative group hover:border-[#2a2a2a] hover:shadow-[0_0_30px_rgba(255,255,255,0.02)]">
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#1a1a1a] group-hover:border-[#333] transition-colors" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#1a1a1a] group-hover:border-[#333] transition-colors" />
              <div className="text-2xl font-mono text-[#333] mb-4">[⬆]</div>
              <div className="text-white font-sans font-bold mb-2 text-base tracking-tight">Start Building</div>
              <div className="text-xs text-[#666] mb-1 font-mono">
                Deploy your prediction algorithm. Prove your Brier Score on-chain.
              </div>
              <div className="text-xs text-[#444] mb-6 font-mono">
                shadow phase → 100 resolved · Brier ≤ 0.20 · 21d → vault opens.
              </div>
              <div className="flex items-center justify-between">
                <Link href="/docs" className="inline-block bg-transparent border border-primary/50 text-primary px-5 py-2 font-mono font-bold text-xs transition-all hover:bg-primary/10 hover:border-primary hover:shadow-[0_0_12px_rgba(255,42,77,0.3)]">
                  READ THE DOCS →
                </Link>
                <span className="text-[10px] text-[#333] font-mono">
                  {protocolStats.bots > 0 ? `${protocolStats.bots} REGISTERED` : 'BE FIRST'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* ── FEATURED AGENT — the one to beat ── */}
          {topBots.length > 0 && (() => {
            const champ = topBots[0]
            const cBrier = champ.scores?.[0]?.brierScore ?? champ.brierScore ?? 0
            const cWr = champ.scores?.[0]?.winRate ?? champ.winRate ?? 0
            const cTvl = champ.currentTVL ?? champ.tvl ?? 0
            const cLive = ['live', 'LIVE', 'VAULT_ELIGIBLE_T1', 'VAULT_ELIGIBLE_T2'].includes(champ.status || '')
            return (
              <motion.div variants={itemVariants} className="mb-12">
                <div className="font-mono text-[10px] text-[#555] tracking-[0.25em] mb-3">FEATURED AGENT — THE ONE TO BEAT</div>
                <Link
                  href={`/bot/${champ.slug || champ.id}`}
                  className="flex flex-col sm:flex-row bg-[#0a0a0a] border border-[#FFD700]/20 no-underline relative overflow-hidden group transition-all hover:border-[#FFD700]/40 hover:shadow-[0_0_44px_rgba(255,215,0,0.08)]"
                >
                  <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#FFD700]/50" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#FFD700]/50" />

                  {/* face */}
                  <div className="sm:w-[180px] shrink-0 flex items-center justify-center bg-[#050505] border-b sm:border-b-0 sm:border-r border-[#141414] p-6">
                    {champ.pfpUrl ? (
                      <img src={champ.pfpUrl} alt={champ.name} className="w-[120px] h-[120px] object-cover border border-[#1a1a1a]" />
                    ) : (
                      <BotIrisAvatar {...botEye(champ)} size={120} />
                    )}
                  </div>

                  {/* story */}
                  <div className="flex-1 p-6 flex flex-col justify-between gap-5">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-sans font-extrabold text-[24px] text-white tracking-tight group-hover:text-primary transition-colors">{champ.name}</span>
                        <span className={`inline-flex items-center gap-1.5 text-[9px] font-mono ${cLive ? 'text-[#00d4aa]' : 'text-[#666]'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cLive ? 'bg-[#00d4aa] animate-pulse' : 'bg-[#333]'}`} />
                          {cLive ? 'LIVE' : 'SHADOW'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#555] font-mono mt-1">
                        by {champ.maker?.handle ? `@${champ.maker.handle}` : (champ.maker?.name || `${(champ.walletAddress || 'anon').substring(0, 6)}…`)}
                      </div>
                      <div className="text-[13px] text-[#888] font-sans mt-3 max-w-md leading-relaxed">
                        {champ.tagline || 'Survived the shadow. The math holds, for now.'}
                      </div>
                    </div>
                    <div className="flex gap-8 flex-wrap">
                      {[
                        ['BRIER', cBrier > 0 ? cBrier.toFixed(3) : 'AWAITING', cBrier > 0 && cBrier <= 0.25 ? '#00d4aa' : '#fff'],
                        ['WIN RATE', cWr > 0 ? `${(cWr * 100).toFixed(0)}%` : '—', '#fff'],
                        ['VAULT TVL', cTvl > 0 ? `$${(cTvl / 1000).toFixed(1)}K` : '—', '#fff'],
                      ].map(([l, v, c]) => (
                        <div key={l as string}>
                          <div className="text-[9px] font-mono text-[#555] tracking-widest">{l}</div>
                          <div className="font-mono font-bold text-[17px]" style={{ color: c as string }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* rank seal */}
                  <div className="hidden md:flex items-center pr-8">
                    <span className="font-sans font-extrabold text-[64px] leading-none text-[#FFD700]" style={{ textShadow: '0 0 34px rgba(255,215,0,0.35)' }}>1</span>
                  </div>
                </Link>
              </motion.div>
            )
          })()}

          {/* ── TOP ALGORITHMS — live board ── */}
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
                  ranked by Brier score — the best climb, the worst sink
                </div>
              </div>
              <Link href="/leaderboard" className="text-xs font-mono text-[#666] hover:text-primary transition-colors">
                FULL LEADERBOARD →
              </Link>
            </div>

            {topBots.length > 1 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {topBots.slice(1).map((bot, idx) => {
                  const i = idx + 1 // global rank index — #1 lives in the featured spotlight
                  const brier = bot.scores?.[0]?.brierScore ?? bot.brierScore ?? 0
                  const wr = bot.scores?.[0]?.winRate ?? bot.winRate ?? 0
                  const tvl = bot.currentTVL ?? bot.tvl ?? 0
                  const isLive = ['live', 'LIVE', 'VAULT_ELIGIBLE_T1', 'VAULT_ELIGIBLE_T2'].includes(bot.status || '')
                  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']
                  const rankColor = rankColors[i] || '#333'
                  return (
                    <motion.div
                      key={bot.id}
                      layout
                      whileHover={{ y: -5 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    >
                      <Link
                        href={`/bot/${bot.slug || bot.id}`}
                        className="flex flex-col aspect-[1/1.12] bg-[#0a0a0a] border border-[#1a1a1a] no-underline relative overflow-hidden group transition-all hover:border-[#2a2a2a] hover:shadow-[0_10px_36px_rgba(0,0,0,0.65),0_0_0_0.5px_rgba(255,42,77,0.10)]"
                      >
                        {/* rank + status */}
                        <div className="flex items-center justify-between px-4 pt-2.5">
                          <span className="font-sans font-extrabold text-[26px] leading-none tracking-tight" style={{ color: rankColor, textShadow: i < 3 ? `0 0 18px ${rankColor}55` : 'none' }}>
                            {i + 1}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 text-[9px] font-mono ${isLive ? 'text-[#00d4aa]' : 'text-[#444]'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-[#00d4aa] animate-pulse' : 'bg-[#333]'}`} />
                            {isLive ? 'LIVE' : 'SHADOW'}
                          </span>
                        </div>

                        {/* face */}
                        <div className="flex-1 flex items-center justify-center">
                          {bot.pfpUrl ? (
                            <img src={bot.pfpUrl} alt={bot.name} className="w-[72px] h-[72px] object-cover border border-[#1a1a1a] group-hover:border-primary/30 transition-colors" />
                          ) : (
                            <BotIrisAvatar {...botEye(bot)} size={72} />
                          )}
                        </div>

                        {/* name */}
                        <div className="px-4 text-center">
                          <div className="text-white font-sans font-bold text-[13px] truncate group-hover:text-primary transition-colors">{bot.name}</div>
                          <div className="text-[10px] text-[#444] font-mono truncate">
                            by {bot.maker?.handle ? `@${bot.maker.handle}` : (bot.maker?.name || `${(bot.walletAddress || 'anon').substring(0, 6)}…`)}
                          </div>
                        </div>

                        {/* vitals */}
                        <div className="grid grid-cols-3 gap-px bg-[#141414] border-t border-[#141414] mt-3.5">
                          <div className="bg-[#0a0a0a] px-3 py-2">
                            <div className="text-[8px] font-mono text-[#555] tracking-widest">BRIER</div>
                            <div className={`font-mono font-bold text-[13px] ${brier > 0 && brier <= 0.25 ? 'text-[#00d4aa]' : 'text-white'}`}>
                              {brier > 0 ? brier.toFixed(3) : <span className="text-[#ffb000] text-[10px] animate-pulse">AWAITING</span>}
                            </div>
                          </div>
                          <div className="bg-[#0a0a0a] px-3 py-2">
                            <div className="text-[8px] font-mono text-[#555] tracking-widest">WIN RATE</div>
                            <div className="font-mono font-bold text-[13px] text-white">{wr > 0 ? `${(wr * 100).toFixed(0)}%` : '—'}</div>
                          </div>
                          <div className="bg-[#0a0a0a] px-3 py-2">
                            <div className="text-[8px] font-mono text-[#555] tracking-widest">VAULT TVL</div>
                            <div className="font-mono font-bold text-[13px] text-white">{tvl > 0 ? `$${(tvl / 1000).toFixed(1)}K` : '—'}</div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            ) : topBots.length === 0 ? (
              <div className="p-16 text-center text-[11px] text-[#333] font-mono border border-dashed border-[#1a1a1a] bg-[#080808]">
                <div className="cursor-blink inline-block">&gt; AWAITING DATA — deploy the first algorithm</div>
              </div>
            ) : null}
          </motion.div>

          {/* ── FOOTER ── */}
          <motion.div variants={itemVariants} className="mt-16 border-t border-[#111] pt-6 flex justify-between items-center text-[11px] text-[#333] font-mono">
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
              <a href="https://github.com/Lord14sol/brier-protocol" target="_blank" rel="noopener noreferrer" className="hover:text-[#666] transition-colors">GITHUB</a>
            </div>
          </motion.div>

        </motion.div>
      </div>

      <HowItWorksModal open={howOpen} onClose={() => setHowOpen(false)} />
    </div>
  )
}
