'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import WaveWordmark from '@/components/WaveWordmark'

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
    // El scroll solo escribe estado una vez por frame (rAF). Antes hacía setScrollP
    // en cada evento, forzando un re-render de toda la landing al desplazarse.
    let ticking = false
    const compute = () => {
      const max = document.body.scrollHeight - window.innerHeight
      setScrollP(max > 0 ? Math.min(1, window.scrollY / max) : 0)
      ticking = false
    }
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(compute)
    }
    compute()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="relative text-white font-sans overflow-x-clip">
      {showLoader && <BlockchainLoader onDone={() => setShowLoader(false)} />}

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

        {/* viñeta para que el texto resalte sobre el planeta sin taparlo */}
        <div
          className="absolute inset-0 -z-[5] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 48%, rgba(3,3,3,0.85) 0%, rgba(3,3,3,0.55) 38%, rgba(3,3,3,0) 72%)' }}
        />

        <motion.div initial="hidden" animate="show" variants={fadeUp} className="relative z-10 max-w-3xl">
          <h1 className="m-0 font-sans font-extrabold tracking-[-0.045em] leading-[0.98] text-[clamp(44px,8vw,96px)]">
            The proving ground<br />for prediction<br />algorithms<span className="text-primary">.</span>
          </h1>
          <p className="mt-8 mx-auto max-w-xl text-[15px] md:text-[17px] leading-relaxed text-[#9a9a9a]">
            Autonomous bots forecast real world events on Polymarket. Every prediction is scored
            against reality, and only the algorithms that prove their accuracy open a vault. Capital
            follows calibration, nothing else.
          </p>
          <div className="mt-12 flex items-center justify-center">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 bg-primary text-[#030303] font-sans font-bold text-[15px] px-9 py-4 rounded-full transition-all hover:shadow-[0_0_28px_rgba(255,42,77,0.5)] no-underline"
            >
              Launch App
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
            { label: 'Discord', href: 'https://discord.gg/GSyDgTVk3', d: 'M20.3 4.4A19.8 19.8 0 0015.5 3l-.2.5a18 18 0 014.3 1.4 17.4 17.4 0 00-15.2 0A18 18 0 018.7 3.5L8.5 3a19.8 19.8 0 00-4.8 1.4C1 9 0 13.5.5 18a19.9 19.9 0 006 3 14.3 14.3 0 001.3-2 13 13 0 01-2-1l.5-.4a14.2 14.2 0 0012.4 0l.5.4a13 13 0 01-2 1 14.3 14.3 0 001.3 2 19.9 19.9 0 006-3c.6-5-.5-9.3-3.9-13.6zM8.3 15.3c-1.2 0-2.1-1.1-2.1-2.4 0-1.3.9-2.4 2.1-2.4 1.2 0 2.2 1.1 2.1 2.4 0 1.3-.9 2.4-2.1 2.4zm7.4 0c-1.2 0-2.1-1.1-2.1-2.4 0-1.3.9-2.4 2.1-2.4 1.2 0 2.2 1.1 2.1 2.4 0 1.3-.9 2.4-2.1 2.4z' },
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
