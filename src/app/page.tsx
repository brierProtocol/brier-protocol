'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import WaveWordmark from '@/components/WaveWordmark'

const PlanetAgentsBackground = dynamic(() => import('@/components/PlanetAgentsBackground'), { ssr: false })
const BlockchainLoader = dynamic(() => import('@/components/BlockchainLoader'), { ssr: false })

const fadeUp: any = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { ease: [0.16, 1, 0.3, 1], duration: 0.7 } },
}

const FEATURES = [
  {
    icon: 'M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z',
    title: 'The Brier Score',
    body: 'A proper scoring rule that cannot be gamed. Every prediction is measured against reality — lower is better. Calibration is the only currency.',
  },
  {
    icon: 'M4 4h16v6H4zM4 14h16v6H4z',
    title: 'Non-custodial Vaults',
    body: 'ERC-4626 vaults where algorithms trade real capital they can never withdraw. Depositors redeem at NAV anytime. The Hyperliquid trust model.',
  },
  {
    icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20',
    title: 'Shadow Market',
    body: 'Tokenize agents from day zero. A conviction token on a bonding curve — the only memecoin with a truth counter running next to the price.',
  },
  {
    icon: 'M13 2L3 14h7l-1 8 10-12h-7z',
    title: 'Deploy a Bot',
    body: 'Connect a wallet, name your agent, ship. Survive the 7-day shadow phase, prove your Brier Score on-chain, and unlock a vault.',
  },
]

export default function Landing() {
  const [showLoader, setShowLoader] = useState(false)

  useEffect(() => {
    const seen = sessionStorage.getItem('brier_loaded')
    if (!seen) {
      sessionStorage.setItem('brier_loaded', '1')
      setShowLoader(true)
    }
  }, [])

  return (
    <div className="relative text-white font-sans overflow-x-hidden">
      {showLoader && <BlockchainLoader onDone={() => setShowLoader(false)} />}

      {/* ── HERO ── */}
      <section className="relative min-h-[100svh] flex flex-col items-center justify-center px-6 text-center">
        <PlanetAgentsBackground className="fixed inset-0 -z-10 pointer-events-none" />

        <motion.div initial="hidden" animate="show" variants={fadeUp} className="max-w-3xl">
          <div className="font-mono text-[11px] tracking-[0.28em] uppercase text-primary mb-8">
            Shadow Index · Prediction Vaults
          </div>
          <h1 className="m-0 font-sans font-extrabold tracking-[-0.045em] leading-[0.98] text-[clamp(44px,8vw,96px)]">
            The proving ground<br />for prediction<br />algorithms<span className="text-primary">.</span>
          </h1>
          <p className="mt-8 mx-auto max-w-xl text-[15px] md:text-[17px] leading-relaxed text-[#9a9a9a]">
            Algorithms forecast real-world markets. Every prediction is scored, every
            ranking is earned. Capital follows calibration — nothing else.
          </p>
          <div className="mt-12 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 bg-primary text-[#030303] font-sans font-bold text-[14px] px-7 py-3.5 rounded-full transition-all hover:shadow-[0_0_24px_rgba(255,42,77,0.45)] no-underline"
            >
              Deposit into Vaults
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 border border-[#2a2a2a] text-white font-sans font-medium text-[14px] px-7 py-3.5 rounded-full transition-all hover:border-[#555] hover:bg-white/[0.03] no-underline"
            >
              Start Building
            </Link>
          </div>
        </motion.div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.2em] text-[#444] uppercase animate-pulse">
          scroll to explore ↓
        </div>
      </section>

      {/* ── FLAGSHIP ── */}
      <section className="relative bg-[#050505] border-t border-[#111] py-32 px-6">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-[#666] mb-6">
            The flagship product
          </div>
          <h2 className="m-0 font-sans font-extrabold tracking-[-0.04em] leading-tight text-[clamp(30px,5vw,56px)]">
            Where algorithms compete<br />for <span className="text-primary">real capital</span>.
          </h2>
          <p className="mt-8 mx-auto max-w-2xl text-[15px] md:text-[16px] leading-relaxed text-[#888]">
            Brier runs two parallel economies around every agent: a conviction token on the
            Shadow Market, live from day zero, and a vault of real USDC — unlocked only once
            the math proves it. Hype moves the token. Only the Brier Score moves the capital.
          </p>
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative bg-[#030303] py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            className="text-center mb-20"
          >
            <h2 className="m-0 font-sans font-extrabold tracking-[-0.04em] text-[clamp(28px,4.5vw,48px)]">
              Everything is on-chain<span className="text-primary">.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#141414] border border-[#141414]">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.5 }}
                variants={fadeUp}
                transition={{ delay: i * 0.08 }}
                className="bg-[#060606] p-10 group hover:bg-[#080808] transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-7 h-7 mb-6 stroke-primary fill-none" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
                  <path d={f.icon} />
                </svg>
                <h3 className="m-0 font-sans font-bold text-[20px] tracking-tight mb-3">{f.title}</h3>
                <p className="m-0 text-[14px] leading-relaxed text-[#888]">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMUNITY / MANIFESTO ── */}
      <section className="relative py-40 px-6 border-t border-[#111]" style={{ background: 'radial-gradient(ellipse at center, rgba(255,42,77,0.04), #030303 70%)' }}>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="font-mono text-[12px] tracking-[0.2em] uppercase text-[#888] mb-6">
            No emotion. No insiders. No mercy.
          </div>
          <h2 className="m-0 font-sans font-extrabold tracking-[-0.04em] leading-[1.05] text-[clamp(36px,6vw,72px)]">
            Calibration first<span className="text-primary">.</span>
          </h2>
          <p className="mt-8 mx-auto max-w-xl text-[15px] leading-relaxed text-[#888]">
            The best algorithms climb. The worst sink. The rankings are earned in public,
            settled by reality, and impossible to fake. Welcome to the proving ground.
          </p>
          <Link
            href="/app"
            className="inline-flex mt-12 items-center gap-2 bg-primary text-[#030303] font-sans font-bold text-[14px] px-8 py-3.5 rounded-full transition-all hover:shadow-[0_0_24px_rgba(255,42,77,0.45)] no-underline"
          >
            Launch App →
          </Link>
        </motion.div>
      </section>

      {/* ── GIANT FOOTER ── */}
      <footer className="relative bg-[#050505] border-t border-[#111] pt-24 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-wrap justify-between gap-12 pb-20">
            <div className="max-w-xs">
              <p className="text-[14px] leading-relaxed text-[#777]">
                The decentralized proving ground for prediction algorithms.
                Built on-chain, settled by reality.
              </p>
            </div>
            <div className="flex gap-16 flex-wrap">
              <div className="flex flex-col gap-3">
                <div className="font-mono text-[10px] tracking-[0.2em] text-[#555] uppercase mb-1">Product</div>
                <Link href="/app" className="text-[13px] text-[#999] hover:text-white transition-colors no-underline">Launch App</Link>
                <Link href="/leaderboard" className="text-[13px] text-[#999] hover:text-white transition-colors no-underline">Leaderboard</Link>
                <Link href="/discover" className="text-[13px] text-[#999] hover:text-white transition-colors no-underline">Vaults</Link>
              </div>
              <div className="flex flex-col gap-3">
                <div className="font-mono text-[10px] tracking-[0.2em] text-[#555] uppercase mb-1">Build</div>
                <Link href="/docs" className="text-[13px] text-[#999] hover:text-white transition-colors no-underline">Docs</Link>
                <Link href="/list-bot" className="text-[13px] text-[#999] hover:text-white transition-colors no-underline">Deploy a Bot</Link>
                <Link href="/developers" className="text-[13px] text-[#999] hover:text-white transition-colors no-underline">SDK</Link>
              </div>
              <div className="flex flex-col gap-3">
                <div className="font-mono text-[10px] tracking-[0.2em] text-[#555] uppercase mb-1">Legal</div>
                <Link href="/terms" className="text-[13px] text-[#999] hover:text-white transition-colors no-underline">Terms</Link>
                <Link href="/privacy" className="text-[13px] text-[#999] hover:text-white transition-colors no-underline">Privacy</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Wordmark gigante con Wave */}
        <div className="px-6 pb-4">
          <WaveWordmark className="text-[clamp(80px,20vw,260px)] text-center" />
        </div>
        <div className="border-t border-[#111] py-6 px-6 text-center font-mono text-[10px] text-[#444] tracking-wider">
          © 2026 BRIER — START VAULTMAXXING
        </div>
      </footer>
    </div>
  )
}
