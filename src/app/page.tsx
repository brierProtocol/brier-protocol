'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GlobalSearch } from '@/components/Navbar'
import { FEATURES } from '@/lib/features'


export default function Home() {
  const [topBots, setTopBots] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/bots')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const sorted = data.sort((a: any, b: any) => {
            const brierA = a.scores?.[0]?.brierScore ?? a.brierScore ?? 1
            const brierB = b.scores?.[0]?.brierScore ?? b.brierScore ?? 1
            return brierA - brierB
          })
          setTopBots(sorted.slice(0, 5))
        }
      })
      .catch(console.error)
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  }

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { ease: 'easeOut', duration: 0.5 } }
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans p-12">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-[1000px] mx-auto"
      >
        
        {/* ASCII HEADER */}
        <motion.div variants={itemVariants} className="mb-12 relative group">
          <div className="absolute top-[30%] left-[10%] -translate-x-1/2 -translate-y-1/2 w-[300px] h-[100px] bg-[radial-gradient(ellipse_at_center,rgba(255,42,77,0.15)_0%,transparent_70%)] blur-xl pointer-events-none -z-10 transition-opacity opacity-50 group-hover:opacity-100" />
          <pre className="text-primary whitespace-pre text-[clamp(8px,1.5vw,14px)] leading-[1.2] font-bold drop-shadow-[0_0_10px_rgba(255,42,77,0.4)] animate-[float_4s_ease-in-out_infinite] inline-block transition-all relative z-10 group-hover:drop-shadow-[0_0_20px_rgba(255,42,77,0.8)] m-0">
{`    ____       _           
   / __ )_____(_)__  _____ 
  / __  / ___/ / _ \\/ ___/ 
 / /_/ / /  / /  __/ /     
/_____/_/  /_/\\___/_/      `}
          </pre>
          <div className="text-[#888] mt-2 font-sans font-bold tracking-wide text-[clamp(8px,1.5vw,14px)]">
            {FEATURES.CAPITAL_LAYER ? 'Vaultmaxxing' : 'Reputation Protocol'}
          </div>
        </motion.div>

        {/* MOTD */}
        <motion.div variants={itemVariants} className="mb-16 border-l-2 border-[#1a1a1a] pl-6 py-2">
          <div className="text-white font-sans font-bold text-sm tracking-tight mb-2">
            Protocol Rules
          </div>
          <div className="text-sm text-[#999] leading-relaxed max-w-2xl font-sans">
            1. Algorithms must survive the sandbox phase.<br/>
            2. Entities are ranked strictly by Brier Score (lower = superior).<br/>
            3. Vaults open for Tier-1 nodes. Depositors yield. Builders harvest performance fees.
          </div>
        </motion.div>

        {/* MAIN SEARCH */}
        <motion.div variants={itemVariants}>
          <GlobalSearch isLarge={true} />
        </motion.div>

        {/* DIRECTORY LINKS */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          
          {/* Investor Box */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-8 transition-all relative group hover:border-[#333] hover:shadow-[0_0_15px_rgba(255,255,255,0.03)]">
            <div className="text-white font-sans font-bold mb-4 text-lg tracking-tight">{FEATURES.CAPITAL_LAYER ? 'Deposit into Vaults' : 'Explore Reputation'}</div>
            <div className="text-sm text-[#999] mb-8 leading-relaxed h-10 font-sans">
              {FEATURES.CAPITAL_LAYER
                ? 'Deploy capital into verified algorithmic prediction vaults. Zero emotion, strict mathematics.'
                : 'Discover the most accurate prediction algorithms, ranked by verified on-chain Brier Score.'}
            </div>
            <Link href="/discover" className="inline-block bg-primary text-[#030303] px-6 py-2 font-sans font-bold text-xs transition-all hover:bg-[#ff1438] hover:shadow-[0_0_10px_rgba(255,42,77,0.5)]">
              Explore Catalog
            </Link>
          </div>

          {/* Builder Box */}
          <div className="bg-[#0a0a0a] border border-dashed border-[#1a1a1a] p-8 transition-all relative group hover:border-[#333] hover:shadow-[0_0_15px_rgba(255,255,255,0.03)]">
            <div className="text-white font-sans font-bold mb-4 text-lg tracking-tight">Deploy a Bot</div>
            <div className="text-sm text-[#999] mb-8 leading-relaxed h-10 font-sans">
              Submit your prediction model. Prove your Brier Score on-chain. Attract capital.
            </div>
            <Link href="/list-bot" className="inline-block bg-transparent border border-primary text-primary px-6 py-2 font-sans font-bold text-xs transition-all hover:bg-primary hover:text-[#030303] hover:shadow-[0_0_10px_rgba(255,42,77,0.5)]">
              Submit Algorithm
            </Link>
          </div>

        </motion.div>

        {/* TOP BOTS — RETRO TERMINAL QUANT TABLE */}
        <motion.div variants={itemVariants} className="bg-[#0a0a0a] border border-[#1a1a1a] p-8 relative">
          <div className="absolute -top-[1px] -left-[1px] w-2 h-2 bg-[#333]" />
          <div className="absolute -bottom-[1px] -right-[1px] w-2 h-2 bg-[#333]" />

          <div className="mb-6 border-b border-[#1a1a1a] pb-3">
            <div className="text-lg font-sans font-bold text-white tracking-tight">
              Top Algorithms
            </div>
          </div>

          <table className="w-full border-collapse text-left text-[13px]">
            <thead>
              <tr className="text-[#666] border-b border-[#1a1a1a] text-[10px] uppercase tracking-wide">
                <th className="pb-4 px-4 font-semibold font-sans">Rank / Algorithm</th>
                <th className="pb-4 px-4 font-semibold font-sans">Brier</th>
                <th className="pb-4 px-4 font-semibold font-sans">Win Rate</th>
                <th className="pb-4 px-4 font-semibold font-sans">Status</th>
                {FEATURES.CAPITAL_LAYER && <th className="pb-4 px-4 font-semibold font-sans text-right">Vault TVL</th>}
              </tr>
            </thead>
            <tbody>
              {topBots.length > 0 ? topBots.map((bot, i) => {
                const brier = bot.scores?.[0]?.brierScore ?? bot.brierScore ?? 0
                const wr = bot.scores?.[0]?.winRate ?? bot.winRate ?? 0
                const tvl = bot.currentTVL ?? bot.tvl ?? 0
                const isLive = (bot.status || '').toLowerCase() === 'live' || (bot.status || '').toLowerCase().includes('eligible')
                
                return (
                  <tr key={bot.id} className={`border-b border-[#1a1a1a] transition-all cursor-pointer hover:bg-[#111] ${i === 0 ? 'bg-[#0d0d0d]' : 'bg-transparent'}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`font-mono font-bold ${i === 0 ? 'text-primary' : 'text-[#666]'}`}>
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        <div className="flex flex-col gap-[2px]">
                          <Link href={`/bot/${bot.slug || bot.id}`} className="text-white font-sans font-bold text-sm tracking-tight hover:text-primary transition-colors">
                            {bot.name}
                          </Link>
                          <span className="text-[#666] text-[11px] font-sans">
                            by <Link href={`/maker/${bot.walletAddress || 'anon'}`} className="text-[#888] hover:text-primary hover:underline transition-colors">
                              {(bot.walletAddress || 'anon').substring(0, 8)}...
                            </Link>
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-sm font-mono">
                      <span className={brier <= 0.25 ? 'text-[#00d4aa]' : 'text-white'}>
                        {brier.toFixed(3)}
                      </span>
                    </td>
                    <td className="p-4 text-white font-bold font-mono">
                      {(wr * 100).toFixed(1)}%
                    </td>
                    <td className="p-4">
                      <div className={`inline-flex items-center text-[10px] font-sans font-semibold px-3 py-1 rounded-full ${isLive ? 'bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/20' : 'bg-[#111] text-[#666] border border-[#1a1a1a]'}`}>
                        {isLive ? '● Live' : '○ Paper'}
                      </div>
                    </td>
                    {FEATURES.CAPITAL_LAYER && (
                    <td className="p-4 text-right text-white font-bold font-mono">
                      ${tvl.toLocaleString()}
                    </td>
                    )}
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-[11px] text-[#666] font-sans">
                    <div className="animate-pulse">Synchronizing data...</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          <div className="text-center mt-10">
            <Link href="/discover" className="inline-block px-8 py-3 border border-primary bg-transparent text-primary text-sm font-sans font-bold transition-all tracking-tight hover:bg-primary hover:text-[#030303] hover:shadow-[0_0_15px_rgba(255,42,77,0.5)]">
              View All Algorithms →
            </Link>
          </div>
        </motion.div>

        {/* FOOTER */}
        <motion.div variants={itemVariants} className="mt-20 border-t border-[#1a1a1a] pt-8 flex justify-between text-xs text-[#666] font-sans">
          <div>Brier Protocol v1.0.0-rc</div>
          <div className="flex gap-6">
            <Link href="/developers" className="hover:text-white transition-colors">Docs</Link>
            <span className="cursor-pointer hover:text-white transition-colors">Twitter</span>
            <span className="cursor-pointer hover:text-white transition-colors">GitHub</span>
          </div>
        </motion.div>

      </motion.div>
    </div>
  )
}
