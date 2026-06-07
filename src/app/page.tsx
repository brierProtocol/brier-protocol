'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GlobalSearch } from '@/components/Navbar'

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

  useEffect(() => {
    fetch('/api/bots')
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return
        const sorted = data.sort((a: any, b: any) => {
          const brierA = a.scores?.[0]?.brierScore ?? a.brierScore ?? 1
          const brierB = b.scores?.[0]?.brierScore ?? b.brierScore ?? 1
          return brierA - brierB
        })
        setTopBots(sorted.slice(0, 5))
        const live = data.filter((b: any) =>
          ['live', 'LIVE', 'VAULT_ELIGIBLE_T1', 'VAULT_ELIGIBLE_T2'].includes(b.status || '')
        ).length
        const tvl = data.reduce((acc: number, b: any) => acc + (b.currentTVL ?? b.tvl ?? 0), 0)
        setProtocolStats({ bots: data.length, tvl, live })
      })
      .catch(console.error)
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
          <div className="stat-pill ml-auto">NET <span className="text-[#C8FF00]">POLYGON</span></div>
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

          {/* ── ASCII HEADER ── */}
          <motion.div variants={itemVariants} className="mb-10 relative group">
            <div className="absolute top-[30%] left-[10%] -translate-x-1/2 -translate-y-1/2 w-[300px] h-[100px] bg-[radial-gradient(ellipse_at_center,rgba(255,42,77,0.15)_0%,transparent_70%)] blur-xl pointer-events-none -z-10 opacity-50 group-hover:opacity-100 transition-opacity" />
            <pre className="text-primary whitespace-pre text-[clamp(8px,1.5vw,14px)] leading-[1.2] font-bold drop-shadow-[0_0_10px_rgba(255,42,77,0.4)] animate-[float_4s_ease-in-out_infinite] inline-block transition-all relative z-10 group-hover:drop-shadow-[0_0_20px_rgba(255,42,77,0.8)] m-0">
{`    ____       _
   / __ )_____(_)__  _____
  / __  / ___/ / _ \\/ ___/
 / /_/ / /  / /  __/ /
/_____/_/  /_/\\___/_/      `}
            </pre>
            <div className="text-[#888] mt-2 font-mono font-bold tracking-widest text-[11px] uppercase">
              Prediction Protocol <span className="text-[#333]">// v1.0-rc</span>
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
          <motion.div variants={itemVariants} className="mb-12">
            <GlobalSearch isLarge={true} />
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

          {/* ── TOP BOTS TABLE ── */}
          <motion.div variants={itemVariants} className="bg-[#0a0a0a] border border-[#1a1a1a] relative">
            <div className="absolute -top-[1px] -left-[1px] w-2 h-2 bg-[#1a1a1a]" />
            <div className="absolute -bottom-[1px] -right-[1px] w-2 h-2 bg-[#1a1a1a]" />

            <div className="px-6 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
              <div className="text-sm font-mono font-bold text-white tracking-tight">
                TOP_ALGORITHMS
              </div>
              <div className="text-[10px] text-[#444] font-mono">sorted by BRIER_SCORE ↑</div>
            </div>

            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="text-[#444] border-b border-[#111] text-[10px] uppercase tracking-widest font-mono">
                  <th className="pb-3 pt-4 px-6 font-medium">Rank / Algorithm</th>
                  <th className="pb-3 pt-4 px-4 font-medium">Brier</th>
                  <th className="pb-3 pt-4 px-4 font-medium">Win Rate</th>
                  <th className="pb-3 pt-4 px-4 font-medium">Status</th>
                  <th className="pb-3 pt-4 px-4 font-medium text-right">Vault TVL</th>
                </tr>
              </thead>
              <tbody>
                {topBots.length > 0 ? topBots.map((bot, i) => {
                  const brier = bot.scores?.[0]?.brierScore ?? bot.brierScore ?? 0
                  const wr = bot.scores?.[0]?.winRate ?? bot.winRate ?? 0
                  const tvl = bot.currentTVL ?? bot.tvl ?? 0
                  const isLive = ['live','LIVE','VAULT_ELIGIBLE_T1','VAULT_ELIGIBLE_T2'].includes(bot.status || '')
                  const rankColors = ['text-[#FFD700]', 'text-[#C0C0C0]', 'text-[#CD7F32]']
                  return (
                    <tr key={bot.id} className="border-b border-[#111] transition-all cursor-pointer hover:bg-[#0d0d0d] group">
                      <td className="p-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className={`font-mono font-bold text-sm ${rankColors[i] ?? 'text-[#333]'}`}>
                            {String(i + 1).padStart(2, '0')}
                          </div>
                          <div>
                            <Link href={`/bot/${bot.slug || bot.id}`} className="text-white font-sans font-bold text-sm hover:text-primary transition-colors">
                              {bot.name}
                            </Link>
                            <div className="text-[11px] text-[#444] font-mono mt-[1px]">
                              @{bot.slug || (bot.walletAddress || 'anon').substring(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-sm font-mono">
                        <span className={brier <= 0.25 ? 'text-[#00d4aa]' : 'text-white'}>{brier.toFixed(3)}</span>
                        {brier <= 0.15 && <span className="ml-2 text-[9px] text-[#00d4aa] font-mono bg-[#00d4aa]/10 px-1.5 py-0.5">ELITE</span>}
                      </td>
                      <td className="p-4 text-white font-bold font-mono">{(wr * 100).toFixed(1)}%</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 ${isLive ? 'text-[#00d4aa] bg-[#00d4aa]/08 border border-[#00d4aa]/20' : 'text-[#444] border border-[#1a1a1a]'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-[#00d4aa]' : 'bg-[#333]'}`} />
                          {isLive ? 'LIVE' : 'PAPER'}
                        </span>
                      </td>
                      <td className="p-4 text-right text-white font-bold font-mono">${tvl.toLocaleString()}</td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan={5} className="p-16 text-center text-[11px] text-[#333] font-mono">
                      <div className="cursor-blink inline-block">&gt; AWAITING_DATA</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="px-6 py-4 border-t border-[#111] text-right">
              <Link href="/discover" className="text-xs font-mono text-[#666] hover:text-primary transition-colors">
                VIEW_ALL_ALGORITHMS →
              </Link>
            </div>
          </motion.div>

          {/* ── FOOTER ── */}
          <motion.div variants={itemVariants} className="mt-16 border-t border-[#111] pt-6 flex justify-between items-center text-[11px] text-[#333] font-mono">
            <div>BRIER_PROTOCOL // v1.0.0-rc // Polygon</div>
            <div className="flex gap-6">
              <Link href="/developers" className="hover:text-[#666] transition-colors">DOCS</Link>
              <a href="https://github.com/Lord14sol/brier-protocol" target="_blank" rel="noopener noreferrer" className="hover:text-[#666] transition-colors">GITHUB</a>
              <span className="hover:text-[#666] transition-colors cursor-pointer">TWITTER</span>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  )
}
