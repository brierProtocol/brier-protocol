'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import BotIrisAvatar from '@/components/BotIrisAvatar'

// ── Live mini-previews built from the real components ──

function DiscoverPreview() {
  const demo = [
    { name: 'Alpha Quant', color: '#c8ff00' },
    { name: 'ADAN-PRED', color: '#4285f0' },
    { name: 'Beta Arb', color: '#00d4aa' },
  ]
  return (
    <div className="grid grid-cols-3 gap-3">
      {demo.map((d) => (
        <div key={d.name} className="bg-[#080808] border border-[#1a1a1a] flex flex-col items-center py-4 px-2">
          <BotIrisAvatar avatarId={d.name.toLowerCase()} accentColor={d.color} size={48} />
          <div className="text-[10px] font-mono text-white mt-2 truncate w-full text-center">{d.name}</div>
          <div className="text-[8px] font-mono text-[#444]">@{d.name.toLowerCase().replace(/\s+/g, '-')}</div>
        </div>
      ))}
    </div>
  )
}

function StatsPreview() {
  return (
    <div className="bg-[#080808] border border-[#1a1a1a] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-[#666] tracking-widest">BRIER_SCORE</span>
        <span className="text-[8px] font-mono px-1.5 py-0.5" style={{ color: '#C8FF00', background: '#C8FF0014', border: '0.5px solid #C8FF0044' }}>STRONG</span>
      </div>
      <div className="font-mono font-bold text-3xl text-[#C8FF00] mb-2">0.082</div>
      <div className="w-full h-1.5 bg-[#030303] border border-[#1a1a1a] mb-4 overflow-hidden">
        <div className="h-full bg-[#C8FF00]" style={{ width: '83%' }} />
      </div>
      <div className="grid grid-cols-3 gap-px bg-[#1a1a1a] border border-[#1a1a1a]">
        {[['WIN_RATE', '74.0%'], ['SHARPE', '2.10'], ['MAX_DD', '-8.0%']].map(([l, v]) => (
          <div key={l} className="bg-[#0a0a0a] p-2">
            <div className="text-[8px] font-mono text-[#555] tracking-widest mb-0.5">{l}</div>
            <div className="text-xs font-mono font-bold text-white">{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LeaderboardPreview() {
  const rows = [
    { rank: 1, name: 'ADAN-PRED', brier: '0.082', c: '#FFD700' },
    { rank: 2, name: 'Alpha Quant', brier: '0.140', c: '#C0C0C0' },
    { rank: 3, name: 'Beta Arb', brier: '0.210', c: '#CD7F32' },
  ]
  return (
    <div className="bg-[#080808] border border-[#1a1a1a] divide-y divide-[#111]">
      {rows.map((r) => (
        <div key={r.rank} className="flex items-center gap-3 px-3 py-2.5">
          <span className="font-mono font-bold text-sm w-5" style={{ color: r.c }}>{String(r.rank).padStart(2, '0')}</span>
          <span className="flex-1 text-xs font-mono text-white">{r.name}</span>
          <span className="text-[9px] font-mono text-[#555]">BRIER</span>
          <span className="text-xs font-mono font-bold text-white">{r.brier}</span>
        </div>
      ))}
    </div>
  )
}

type Slide = {
  icon: string
  tag: string
  title: string
  body: string
  accent: string
  preview?: 'discover' | 'stats' | 'leaderboard'
}

const SLIDES: Slide[] = [
  {
    icon: '[⊹]', tag: 'STEP_01', title: 'CONNECT', accent: '#ff2a4d',
    body: 'Connect your wallet and claim a unique @handle. This is your on-chain identity — how investors find, track, and back you.',
  },
  {
    icon: '[◎]', tag: 'STEP_02', title: 'DISCOVER', accent: '#c8ff00', preview: 'discover',
    body: 'Every bot is a colored eye — identical structure, unique signature. Browse the catalog of live prediction algorithms.',
  },
  {
    icon: '[▦]', tag: 'STEP_03', title: 'CHECK_STATS', accent: '#00d4aa', preview: 'stats',
    body: 'Open any bot to read its real metrics: Brier Score, Win Rate, Sharpe, drawdown — all derived from on-chain resolutions.',
  },
  {
    icon: '[≡]', tag: 'STEP_04', title: 'LEADERBOARD', accent: '#FFD700', preview: 'leaderboard',
    body: 'Algorithms ranked strictly by Brier Score — lower is sharper. Gold, silver, bronze. Math decides, not marketing.',
  },
  {
    icon: '[⚡]', tag: 'STEP_05', title: 'DEPLOY_&_EARN', accent: '#3B82F6',
    body: 'Submit your own bot → 7-day shadow phase → Tier-1 opens your vault. On profit you keep 30%, protocol takes 10%, LPs grow.',
  },
  {
    icon: '[↗]', tag: 'STEP_06', title: 'INSTANT_EXIT', accent: '#ff2a4d',
    body: 'Investors redeem shares anytime — principal + profit in one transaction, 1:1 at current NAV. No lockups. Non-custodial.',
  },
]

function Preview({ kind }: { kind: Slide['preview'] }) {
  if (kind === 'discover') return <DiscoverPreview />
  if (kind === 'stats') return <StatsPreview />
  if (kind === 'leaderboard') return <LeaderboardPreview />
  return null
}

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

      <div className="border-b border-[#1a1a1a] bg-[#050505] px-8 py-4 flex justify-between items-center">
        <div className="font-mono text-sm font-bold text-white tracking-tight">HOW_IT_WORKS</div>
        <Link href="/" className="text-[#444] hover:text-white transition-colors no-underline font-mono text-xs">← HOME</Link>
      </div>

      <div className="h-[2px] bg-[#0d0d0d]">
        <motion.div className="h-full" style={{ background: s.accent }}
          animate={{ width: `${((i + 1) / SLIDES.length) * 100}%` }} transition={{ ease: 'easeOut', duration: 0.4 }} />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[560px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -18, filter: 'blur(6px)' }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-[#080808] border border-[#1a1a1a] p-8"
            >
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: s.accent }} />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: s.accent }} />

              {/* Live preview (real components) or icon */}
              {s.preview ? (
                <div className="mb-6">
                  <div className="text-[9px] font-mono text-[#444] tracking-widest mb-2">// LIVE_PREVIEW</div>
                  <Preview kind={s.preview} />
                </div>
              ) : (
                <div className="font-mono text-4xl mb-6" style={{ color: s.accent, textShadow: `0 0 20px ${s.accent}66` }}>
                  {s.icon}
                </div>
              )}

              <div className="font-mono text-[10px] tracking-[0.3em] mb-2" style={{ color: s.accent }}>{s.tag}</div>
              <h2 className="font-mono text-2xl font-bold text-white tracking-tight mb-3">{s.title}</h2>
              <p className="text-sm text-[#888] leading-relaxed font-sans">{s.body}</p>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-6">
            <button onClick={prev} disabled={i === 0}
              className="font-mono text-xs px-4 py-2 border border-[#1a1a1a] text-[#666] transition-all hover:text-white hover:border-[#333] disabled:opacity-30 disabled:cursor-not-allowed">
              ← PREV
            </button>

            <div className="flex gap-2">
              {SLIDES.map((_, idx) => (
                <button key={idx} onClick={() => setI(idx)} aria-label={`Go to slide ${idx + 1}`}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{
                    background: idx === i ? s.accent : '#1a1a1a',
                    boxShadow: idx === i ? `0 0 8px ${s.accent}` : 'none',
                    transform: idx === i ? 'scale(1.3)' : 'scale(1)',
                  }} />
              ))}
            </div>

            {i < last ? (
              <button onClick={next}
                className="font-mono text-xs px-4 py-2 border text-[#030303] font-bold transition-all"
                style={{ background: s.accent, borderColor: s.accent }}>
                NEXT →
              </button>
            ) : (
              <Link href="/list-bot"
                className="font-mono text-xs px-4 py-2 border text-[#030303] font-bold transition-all no-underline"
                style={{ background: s.accent, borderColor: s.accent }}>
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
