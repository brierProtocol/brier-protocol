'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

type Slide = {
  icon: string
  tag: string
  title: string
  body: string
  accent: string
}

const SLIDES: Slide[] = [
  {
    icon: '[⊹]',
    tag: 'STEP_01',
    title: 'CONNECT',
    body: 'Connect your wallet and claim a unique @handle. This is your on-chain identity — how investors find, track, and back you.',
    accent: '#ff2a4d',
  },
  {
    icon: '[⬆]',
    tag: 'STEP_02',
    title: 'DEPLOY_BOT',
    body: 'Submit your prediction algorithm. You receive a secret key for the SDK. Your code stays private — Brier only reads your trade signals.',
    accent: '#3B82F6',
  },
  {
    icon: '[◴]',
    tag: 'STEP_03',
    title: 'SHADOW_PHASE',
    body: '7 days of paper-trading. Every prediction is scored on-chain by Brier Score (lower = sharper). No capital at risk yet.',
    accent: '#C9A84C',
  },
  {
    icon: '[$]',
    tag: 'STEP_04',
    title: 'VAULT_OPENS',
    body: 'Hit Tier-1 (Brier ≤ 0.25, Sharpe ≥ 1.5, Win ≥ 54%) and your ERC-4626 vault opens. Investors deposit USDC and receive shares.',
    accent: '#C8FF00',
  },
  {
    icon: '[⚡]',
    tag: 'STEP_05',
    title: 'TRADE_&_EARN',
    body: 'Your bot trades Polymarket. On profit: you keep 30%, the protocol 10%, the rest grows the depositors’ NAV. Math, no emotion.',
    accent: '#00d4aa',
  },
  {
    icon: '[↗]',
    tag: 'STEP_06',
    title: 'INSTANT_EXIT',
    body: 'Investors redeem shares anytime — principal + profit in one transaction, 1:1 at current NAV. No lockups. Non-custodial throughout.',
    accent: '#ff2a4d',
  },
]

export default function HowItWorksPage() {
  const [i, setI] = useState(0)
  const last = SLIDES.length - 1
  const s = SLIDES[i]

  const next = useCallback(() => setI(v => Math.min(v + 1, last)), [last])
  const prev = useCallback(() => setI(v => Math.max(v - 1, 0)), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev])

  return (
    <div className="min-h-screen bg-[#030303] text-[#e8e8e8] flex flex-col">

      {/* Top bar */}
      <div className="border-b border-[#1a1a1a] bg-[#050505] px-8 py-4 flex justify-between items-center">
        <div className="font-mono text-sm font-bold text-white tracking-tight">HOW_IT_WORKS</div>
        <Link href="/" className="text-[#444] hover:text-white transition-colors no-underline font-mono text-xs">← HOME</Link>
      </div>

      {/* Progress */}
      <div className="h-[2px] bg-[#0d0d0d]">
        <motion.div
          className="h-full"
          style={{ background: s.accent }}
          animate={{ width: `${((i + 1) / SLIDES.length) * 100}%` }}
          transition={{ ease: 'easeOut', duration: 0.4 }}
        />
      </div>

      {/* Slide stage */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[560px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -18, filter: 'blur(6px)' }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-[#080808] border border-[#1a1a1a] p-10"
            >
              {/* corner brackets */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: s.accent }} />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: s.accent }} />

              <div className="font-mono text-4xl mb-6" style={{ color: s.accent, textShadow: `0 0 20px ${s.accent}66` }}>
                {s.icon}
              </div>
              <div className="font-mono text-[10px] tracking-[0.3em] mb-2" style={{ color: s.accent }}>
                {s.tag}
              </div>
              <h2 className="font-mono text-2xl font-bold text-white tracking-tight mb-4">{s.title}</h2>
              <p className="text-sm text-[#888] leading-relaxed font-sans">{s.body}</p>
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={prev}
              disabled={i === 0}
              className="font-mono text-xs px-4 py-2 border border-[#1a1a1a] text-[#666] transition-all hover:text-white hover:border-[#333] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← PREV
            </button>

            {/* dots */}
            <div className="flex gap-2">
              {SLIDES.map((sl, idx) => (
                <button
                  key={idx}
                  onClick={() => setI(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{
                    background: idx === i ? s.accent : '#1a1a1a',
                    boxShadow: idx === i ? `0 0 8px ${s.accent}` : 'none',
                    transform: idx === i ? 'scale(1.3)' : 'scale(1)',
                  }}
                />
              ))}
            </div>

            {i < last ? (
              <button
                onClick={next}
                className="font-mono text-xs px-4 py-2 border text-[#030303] font-bold transition-all"
                style={{ background: s.accent, borderColor: s.accent }}
              >
                NEXT →
              </button>
            ) : (
              <Link
                href="/list-bot"
                className="font-mono text-xs px-4 py-2 border text-[#030303] font-bold transition-all no-underline"
                style={{ background: s.accent, borderColor: s.accent }}
              >
                START →
              </Link>
            )}
          </div>

          <div className="text-center mt-6 font-mono text-[10px] text-[#333]">
            {String(i + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')} · use ← → keys
          </div>
        </div>
      </div>
    </div>
  )
}
