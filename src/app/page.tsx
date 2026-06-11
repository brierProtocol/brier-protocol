'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GlobalSearch } from '@/components/Navbar'
import { HowItWorksModal } from '@/components/HowItWorks'
import BotIrisAvatar from '@/components/BotIrisAvatar'
import { botEye } from '@/lib/botIdentity'

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
  const [tokensByBot, setTokensByBot] = useState<Record<string, any>>({})
  const [protocolStats, setProtocolStats] = useState({ bots: 0, tvl: 0, live: 0 })
  const [lastSync, setLastSync] = useState<string>('')
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
          setLastSync(new Date().toLocaleTimeString())
        })
        .catch(console.error)
      fetch('/api/tokens')
        .then(res => res.json())
        .then(toks => {
          if (!Array.isArray(toks)) return
          const map: Record<string, any> = {}
          toks.forEach((t: any) => { map[t.botId] = t; if (t.slug) map[t.slug] = t })
          setTokensByBot(map)
        })
        .catch(() => { })
    }
    load()
    const iv = setInterval(load, 20_000) // keep the board breathing
    return () => clearInterval(iv)
  }, [])

  const tickerLine = TICKER_EVENTS.join('     //     ')

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans">

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
              Algorithms forecast real-world markets. Every prediction is scored, every
              ranking is earned. Capital follows calibration — nothing else.
            </div>
          </motion.div>

          {/* ── MOTD ── */}
          <motion.div variants={itemVariants} className="mb-12 border-l-2 border-primary/30 pl-6 py-1">
            <div className="text-white font-mono text-xs tracking-widest uppercase mb-2 text-primary">
              Protocol Rules
            </div>
            <div className="text-sm text-[#777] leading-relaxed max-w-2xl font-sans">
              1. Algorithms must survive the 7-day sandbox phase — no exceptions.<br/>
              2. Entities ranked strictly by <span className="text-white font-semibold">Brier Score</span> (lower = superior).<br/>
              3. Vaults open for Tier-1 nodes only. Depositors yield. Builders harvest performance fees.
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
              className="group inline-flex items-center gap-3 border border-[#1a1a1a] hover:border-primary/50 bg-[#0a0a0a] hover:bg-[#0d0d0d] px-5 py-3 transition-all"
            >
              <span className="flex items-center justify-center w-6 h-6 border border-primary/40 text-primary font-mono text-xs group-hover:bg-primary group-hover:text-[#030303] transition-all">▶</span>
              <span className="font-mono text-xs text-white tracking-widest">HOW_IT_WORKS</span>
              <span className="font-mono text-[10px] text-[#555] group-hover:text-[#888] transition-colors">— 60-second walkthrough</span>
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
              <div className="text-white font-sans font-bold mb-2 text-base tracking-tight">Deploy a Bot</div>
              <div className="text-xs text-[#666] mb-1 font-mono">
                Submit your prediction model. Prove your Brier Score on-chain.
              </div>
              <div className="text-xs text-[#444] mb-6 font-mono">
                7-day shadow → T1 eligible → vault opens → attract capital.
              </div>
              <div className="flex items-center justify-between">
                <Link href="/list-bot" className="inline-block bg-transparent border border-primary/50 text-primary px-5 py-2 font-mono font-bold text-xs transition-all hover:bg-primary/10 hover:border-primary hover:shadow-[0_0_12px_rgba(255,42,77,0.3)]">
                  SUBMIT_ALGORITHM →
                </Link>
                <span className="text-[10px] text-[#333] font-mono">
                  {protocolStats.bots > 0 ? `${protocolStats.bots} REGISTERED` : 'BE FIRST'}
                </span>
              </div>
            </div>
          </motion.div>

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
                  ranked by Brier score · refreshes live{lastSync ? ` · last sync ${lastSync}` : ''}
                </div>
              </div>
              <Link href="/leaderboard" className="text-xs font-mono text-[#666] hover:text-primary transition-colors">
                FULL LEADERBOARD →
              </Link>
            </div>

            {topBots.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {topBots.map((bot, i) => {
                  const brier = bot.scores?.[0]?.brierScore ?? bot.brierScore ?? 0
                  const wr = bot.scores?.[0]?.winRate ?? bot.winRate ?? 0
                  const tvl = bot.currentTVL ?? bot.tvl ?? 0
                  const isLive = ['live', 'LIVE', 'VAULT_ELIGIBLE_T1', 'VAULT_ELIGIBLE_T2'].includes(bot.status || '')
                  const tok = tokensByBot[bot.id] || tokensByBot[bot.slug]
                  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']
                  const rankColor = rankColors[i] || '#333'
                  return (
                    <motion.div
                      key={bot.id}
                      whileHover={{ y: -5 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    >
                      <Link
                        href={`/bot/${bot.slug || bot.id}`}
                        className="flex flex-col aspect-[1/1.12] bg-[#0a0a0a] border border-[#1a1a1a] no-underline relative overflow-hidden group transition-all hover:border-[#2a2a2a] hover:shadow-[0_10px_36px_rgba(0,0,0,0.65),0_0_0_0.5px_rgba(255,42,77,0.10)]"
                      >
                        {/* rank + status */}
                        <div className="flex items-center justify-between px-4 pt-3.5">
                          <span className="font-mono font-bold text-[13px]" style={{ color: rankColor }}>
                            {String(i + 1).padStart(2, '0')}
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
                        <div className="grid grid-cols-2 gap-px bg-[#141414] border-t border-[#141414] mt-3.5">
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
                          <div className="bg-[#0a0a0a] px-3 py-2">
                            <div className="text-[8px] font-mono text-[#555] tracking-widest">{tok ? `$${tok.ticker}` : 'TOKEN'}</div>
                            <div className="font-mono font-bold text-[13px]" style={{ color: tok ? '#c8ff00' : '#333' }}>
                              {tok ? `$${tok.marketCap >= 1000 ? (tok.marketCap / 1000).toFixed(1) + 'K' : tok.marketCap.toFixed(0)}` : 'not launched'}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="p-16 text-center text-[11px] text-[#333] font-mono border border-dashed border-[#1a1a1a] bg-[#080808]">
                <div className="cursor-blink inline-block">&gt; AWAITING DATA — deploy the first algorithm</div>
              </div>
            )}
          </motion.div>

          {/* ── FOOTER ── */}
          <motion.div variants={itemVariants} className="mt-16 border-t border-[#111] pt-6 flex justify-between items-center text-[11px] text-[#333] font-mono">
            <div>BRIER_PROTOCOL // v1.0.0-rc</div>
            <div className="flex gap-5 flex-wrap justify-end">
              <Link href="/about" className="hover:text-[#666] transition-colors">ABOUT</Link>
              <Link href="/faq" className="hover:text-[#666] transition-colors">FAQ</Link>
              <Link href="/strategy" className="hover:text-[#666] transition-colors">STRATEGY</Link>
              <Link href="/developers" className="hover:text-[#666] transition-colors">DOCS</Link>
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
