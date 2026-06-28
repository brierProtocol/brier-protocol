'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GlobalSearch } from '@/components/Navbar'
import { FEATURES } from '@/lib/features'

const PlanetAgentsBackground = dynamic(() => import('@/components/PlanetAgentsBackground'), { ssr: false })
const BlockchainLoader = dynamic(() => import('@/components/BlockchainLoader'), { ssr: false })
const BrierJourney = dynamic(() => import('@/components/BrierJourney'), { ssr: false })
const BlockchainStrip = dynamic(() => import('@/components/BlockchainStrip'), { ssr: false })
const CreateBotSection = dynamic(() => import('@/components/CreateBotSection'), { ssr: false })
const NebulaBackdrop = dynamic(() => import('@/components/NebulaBackdrop'), { ssr: false })
const SupernovaScroll = dynamic(() => import('@/components/SupernovaScroll'), { ssr: false })

const fadeUp: any = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { ease: [0.16, 1, 0.3, 1], duration: 0.7 } },
}

export default function Landing() {
  const [showLoader, setShowLoader] = useState(false)

  const [scrollP, setScrollP] = useState(0)

  useEffect(() => {
    const seen = sessionStorage.getItem('brier_loaded')
    if (!seen) {
      sessionStorage.setItem('brier_loaded', '1')
      setShowLoader(true)
    }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight
      setScrollP(max > 0 ? Math.min(1, window.scrollY / max) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

      {/* Atardecer: negro arriba, rojizo cálido en el medio, negro otra vez al final */}
      <div
        className="fixed inset-0 z-30 pointer-events-none"
        style={{
          background: 'linear-gradient(160deg, rgba(60,4,14,0) 0%, rgba(90,7,20,0.55) 55%, rgba(130,14,30,0.8) 100%)',
          opacity: Math.sin(scrollP * Math.PI) * 0.6,
          mixBlendMode: 'screen',
        }}
      />

      {/* ── HERO ── */}
      <section className="relative min-h-[100svh] flex flex-col items-center justify-center px-6 text-center">
        <PlanetAgentsBackground className="fixed inset-0 -z-10 pointer-events-none" />

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
      </section>

      {/* ── FLAGSHIP ── */}
      <section className="relative bg-[#050505] border-t border-[#111] py-32 px-6 overflow-hidden">
        <NebulaBackdrop className="absolute inset-0" />
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          className="relative z-10 max-w-4xl mx-auto text-center"
        >
          <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-[#666] mb-6">
            No pay to play
          </div>
          <h2 className="m-0 font-sans font-extrabold tracking-[-0.04em] leading-tight text-[clamp(30px,5vw,56px)]">
            Every vault is<br /><span className="text-primary">earned</span>, never given.
          </h2>
          <p className="mt-8 mx-auto max-w-2xl text-[15px] md:text-[16px] leading-relaxed text-[#888]">
            A bot only manages real money after it proves, in public, that it can predict.
            Here is how Brier earns that trust, step by step.
          </p>
        </motion.div>
      </section>

      {/* ── JOURNEY 3D ── */}
      <BrierJourney />

      {/* ── ON-CHAIN BLOCKCHAIN STRIP ── */}
      <section className="relative bg-[#030303] py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            className="text-center mb-12"
          >
            <h2 className="m-0 font-sans font-extrabold tracking-[-0.04em] text-[clamp(28px,4.5vw,48px)]">
              Everything is on-chain<span className="text-primary">.</span>
            </h2>
            <p className="mt-5 mx-auto max-w-lg text-[14px] leading-relaxed text-[#888]">
              Brier Score, win rate, every trade and every payout. Recorded as blocks anyone can verify.
            </p>
          </motion.div>

          <BlockchainStrip />
        </div>
      </section>

      {/* ── TWO WAYS IN ── */}
      <section className="relative bg-[#050505] border-t border-[#111] py-32 px-6">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-16">
            <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-primary mb-4">two ways in</div>
            <h2 className="m-0 font-sans font-extrabold tracking-[-0.04em] text-[clamp(28px,4.5vw,52px)]">
              Deposit, or build<span className="text-primary">.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#141414] border border-[#141414]">
            {/* Depositors */}
            <div className="bg-[#060606] p-9 flex flex-col group hover:bg-[#080808] transition-colors">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#666] mb-4">For depositors</div>
              <h3 className="m-0 font-sans font-extrabold text-[24px] tracking-tight mb-3">Earn without predicting<span className="text-primary">.</span></h3>
              <p className="m-0 text-[14px] leading-relaxed text-[#999] mb-8 flex-1">
                Pick the proven algorithm, not the hype. Deposit into the lowest Brier Score and earn
                passively while it compounds for you.
              </p>
              <Link href="/app" className="inline-flex w-fit items-center gap-2 bg-primary text-[#030303] font-sans font-bold text-[13px] px-6 py-3 rounded-full transition-all hover:shadow-[0_0_22px_rgba(255,42,77,0.45)] no-underline">
                Browse vaults →
              </Link>
            </div>

            {/* Builders */}
            <div className="bg-[#060606] p-9 flex flex-col group hover:bg-[#080808] transition-colors">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#666] mb-4">For builders</div>
              <h3 className="m-0 font-sans font-extrabold text-[24px] tracking-tight mb-3">Build on Polymarket<span className="text-primary">.</span></h3>
              <p className="m-0 text-[14px] leading-relaxed text-[#999] mb-8 flex-1">
                Build a bot that forecasts real world events on Polymarket. Reality settles the score on
                chain, and a vault opens once you prove it. No capital of your own required.
              </p>
              <Link href="/docs" className="inline-flex w-fit items-center gap-2 border border-[#2a2a2a] text-white font-sans font-medium text-[13px] px-6 py-3 rounded-full transition-all hover:border-[#555] hover:bg-white/[0.03] no-underline">
                Start building →
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── CREATE A BOT (space CTA) ── */}
      <CreateBotSection />

      {/* ── SUPERNOVA + CIERRE (colapsa, estalla y la galaxia persiste detras de "Calibration first") ── */}
      <SupernovaScroll />

      {/* ── GIANT FOOTER ── */}
      <footer className="relative bg-[#050505] border-t border-[#111] pt-20 overflow-hidden">
        {/* iconos sociales (se conectan luego) */}
        <div className="flex justify-center gap-7 pb-10">
          {[
            { label: 'X', href: '#', d: 'M18.9 1.5h3.7l-8 9.2L24 22.5h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.8L0 1.5h7.6l5.2 6.9 6.1-6.9zm-1.3 18.8h2L6.5 3.6h-2.2L17.6 20.3z' },
            { label: 'Discord', href: '#', d: 'M20.3 4.4A19.8 19.8 0 0015.5 3l-.2.5a18 18 0 014.3 1.4 17.4 17.4 0 00-15.2 0A18 18 0 018.7 3.5L8.5 3a19.8 19.8 0 00-4.8 1.4C1 9 0 13.5.5 18a19.9 19.9 0 006 3 14.3 14.3 0 001.3-2 13 13 0 01-2-1l.5-.4a14.2 14.2 0 0012.4 0l.5.4a13 13 0 01-2 1 14.3 14.3 0 001.3 2 19.9 19.9 0 006-3c.6-5-.5-9.3-3.9-13.6zM8.3 15.3c-1.2 0-2.1-1.1-2.1-2.4 0-1.3.9-2.4 2.1-2.4 1.2 0 2.2 1.1 2.1 2.4 0 1.3-.9 2.4-2.1 2.4zm7.4 0c-1.2 0-2.1-1.1-2.1-2.4 0-1.3.9-2.4 2.1-2.4 1.2 0 2.2 1.1 2.1 2.4 0 1.3-.9 2.4-2.1 2.4z' },
            { label: 'GitHub', href: '#', d: 'M12 .5A11.5 11.5 0 008.4 22.9c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.4-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 016 0C17.6 5 18.6 5.3 18.6 5.3c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0012 .5z' },
            { label: 'Telegram', href: '#', d: 'M23.8 2.8l-3.6 17c-.3 1.2-1 1.5-2 .9l-5.5-4-2.7 2.6c-.3.3-.5.5-1 .5l.4-5.4L19.2 5c.4-.4-.1-.6-.7-.2L6.3 12.4l-5.3-1.7c-1.2-.4-1.2-1.2.2-1.7L22.3 1c1-.4 1.8.2 1.5 1.8z' },
          ].map((s) => (
            <a key={s.label} href={s.href} aria-label={s.label} className="text-[#666] hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d={s.d} /></svg>
            </a>
          ))}
        </div>

        {/* Wordmark gigante con Wave (hover: hueco + start vaultmaxxing) */}
        <div className="px-6 pt-2 pb-2">
          <WaveWordmark className="text-[clamp(84px,21vw,280px)] text-center" />
        </div>
        <div className="border-t border-[#111] mt-6 py-6 px-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[10px] text-[#444] tracking-wider">
          <span>© 2026 BRIER</span>
          <Link href="/terms" className="hover:text-[#888] transition-colors no-underline">TERMS</Link>
          <Link href="/privacy" className="hover:text-[#888] transition-colors no-underline">PRIVACY</Link>
        </div>
      </footer>
    </div>
  )
}
