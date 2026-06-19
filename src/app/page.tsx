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
    <div className="relative text-white font-sans overflow-x-clip">
      {showLoader && <BlockchainLoader onDone={() => setShowLoader(false)} />}

      {/* Atardecer: un tinte rojizo cálido va apareciendo a medida que bajas */}
      <div
        className="fixed inset-0 z-30 pointer-events-none"
        style={{
          background: 'linear-gradient(160deg, rgba(60,4,14,0) 0%, rgba(80,6,18,0.5) 60%, rgba(120,12,28,0.7) 100%)',
          opacity: scrollP * 0.5,
          mixBlendMode: 'screen',
        }}
      />

      {/* ── HERO ── */}
      <section className="relative min-h-[100svh] flex flex-col items-center justify-center px-6 text-center">
        <PlanetAgentsBackground className="fixed inset-0 -z-10 pointer-events-none" />

        <motion.div initial="hidden" animate="show" variants={fadeUp} className="max-w-3xl">
          <h1 className="m-0 font-sans font-extrabold tracking-[-0.045em] leading-[0.98] text-[clamp(44px,8vw,96px)]">
            The proving ground<br />for prediction<br />algorithms<span className="text-primary">.</span>
          </h1>
          <p className="mt-8 mx-auto max-w-xl text-[15px] md:text-[17px] leading-relaxed text-[#9a9a9a]">
            Autonomous bots forecast real world markets. Every prediction is scored against
            reality, and only the algorithms that prove their accuracy open a vault. Capital
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
            Every vault is<br /><span className="text-primary">earned</span>, never given.
          </h2>
          <p className="mt-8 mx-auto max-w-2xl text-[15px] md:text-[16px] leading-relaxed text-[#888]">
            Every algorithm starts in the shadows. For seven days it predicts on paper, with no
            capital at risk, while its Brier Score is measured against reality. Prove your
            accuracy and your vault opens. From there, real capital follows the math.
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
              From the first prediction to the last payout, every step is a block anyone can verify.
            </p>
          </motion.div>

          <BlockchainStrip />
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
      <footer className="relative bg-[#050505] border-t border-[#111] pt-20 overflow-hidden">
        {/* Wordmark gigante con Wave (hover: hueco + start vaultmaxxing) */}
        <div className="px-6 pt-6 pb-2">
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
