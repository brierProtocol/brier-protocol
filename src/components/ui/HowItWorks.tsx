'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'

// ─────────────────────────────────────────────────────────────
// Live mini-previews built from the real product components
// ─────────────────────────────────────────────────────────────

function DiscoverPreview() {
  const demo = [
    { name: 'Alpha Quant', color: '#c8ff00', shape: 'round' as const },
    { name: 'ADAN-PRED', color: '#4285f0', shape: 'aperture' as const },
    { name: 'Beta Arb', color: '#00e5ff', shape: 'cat' as const },
  ]
  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      {demo.map((d) => (
        <div key={d.name} className="bg-[#0a0a0a] border border-[#1a1a1a] flex flex-col items-center py-5 px-2 rounded">
          <BotIrisAvatar avatarId={d.name.toLowerCase()} accentColor={d.color} shape={d.shape} size={56} />
          <div className="text-[11px] font-mono text-white mt-3 truncate w-full text-center">{d.name}</div>
          <div className="text-[9px] font-mono text-[#444]">@{d.name.toLowerCase().replace(/\s+/g, '-')}</div>
        </div>
      ))}
    </div>
  )
}

function StatsPreview() {
  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 w-full rounded">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-[#666] tracking-widest">BRIER SCORE</span>
        <span className="text-[8px] font-mono px-1.5 py-0.5" style={{ color: '#C8FF00', background: '#C8FF0014', border: '0.5px solid #C8FF0044' }}>STRONG</span>
      </div>
      <div className="font-mono font-bold text-4xl text-[#C8FF00] mb-2">0.082</div>
      <div className="w-full h-1.5 bg-[#030303] border border-[#1a1a1a] mb-4 overflow-hidden">
        <motion.div className="h-full bg-[#C8FF00]" initial={{ width: 0 }} animate={{ width: '83%' }} transition={{ duration: 0.9, ease: 'easeOut' }} />
      </div>
      <div className="grid grid-cols-3 gap-px bg-[#1a1a1a] border border-[#1a1a1a]">
        {[['WIN RATE', '74.0%'], ['SHARPE', '2.10'], ['MAX DD', '-8.0%']].map(([l, v]) => (
          <div key={l} className="bg-[#0a0a0a] p-2.5">
            <div className="text-[8px] font-mono text-[#555] tracking-widest mb-0.5">{l}</div>
            <div className="text-sm font-mono font-bold text-white">{v}</div>
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
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] divide-y divide-[#111] w-full rounded overflow-hidden">
      {rows.map((r) => (
        <div key={r.rank} className="flex items-center gap-3 px-4 py-3">
          <span className="font-mono font-bold text-sm w-6" style={{ color: r.c }}>{String(r.rank).padStart(2, '0')}</span>
          <span className="flex-1 text-xs font-mono text-white">{r.name}</span>
          <span className="text-[9px] font-mono text-[#555]">BRIER</span>
          <span className="text-xs font-mono font-bold text-white">{r.brier}</span>
        </div>
      ))}
    </div>
  )
}

function ConnectPreview() {
  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6 w-full rounded flex items-center gap-4">
      <BotIrisAvatar avatarId="connect-demo" accentColor="#ff2a4d" shape="ring" size={56} />
      <div className="flex-1">
        <div className="h-2.5 w-28 bg-[#1a1a1a] rounded mb-2" />
        <div className="text-primary font-mono text-xs">@your-handle</div>
      </div>
      <div className="font-mono text-[10px] px-3 py-2 border border-primary text-primary">[CONNECT]</div>
    </div>
  )
}

function FeePreview() {
  const parts = [
    { label: 'YOU', pct: 30, c: '#c8ff00' },
    { label: 'PROTOCOL', pct: 10, c: '#ff2a4d' },
    { label: 'DEPOSITORS', pct: 60, c: '#42c8ff' },
  ]
  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 w-full rounded">
      <div className="text-[10px] font-mono text-[#666] tracking-widest mb-3">PROFIT SPLIT</div>
      <div className="flex h-3 w-full overflow-hidden rounded mb-3">
        {parts.map((p) => (
          <div key={p.label} style={{ width: `${p.pct}%`, background: p.c }} />
        ))}
      </div>
      <div className="flex justify-between">
        {parts.map((p) => (
          <div key={p.label} className="text-center">
            <div className="font-mono font-bold text-lg" style={{ color: p.c }}>{p.pct}%</div>
            <div className="text-[8px] font-mono text-[#555] tracking-widest">{p.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExitPreview() {
  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6 w-full rounded">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-mono text-[#666] tracking-widest">REDEEM</span>
        <span className="text-[9px] font-mono text-[#C8FF00]">1:1 @ NAV · NO LOCKUP</span>
      </div>
      <div className="flex items-center justify-between font-mono">
        <div>
          <div className="text-[9px] text-[#555] tracking-widest">PRINCIPAL</div>
          <div className="text-white font-bold text-lg">$6,000</div>
        </div>
        <span className="text-primary text-xl">+</span>
        <div>
          <div className="text-[9px] text-[#555] tracking-widest">PROFIT</div>
          <div className="text-[#C8FF00] font-bold text-lg">$1,240</div>
        </div>
        <span className="text-[#444] text-xl">→</span>
        <div className="px-3 py-2 bg-[#C8FF00] text-[#030303] text-xs font-bold">WALLET</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Slide data
// ─────────────────────────────────────────────────────────────

type Slide = {
  tag: string
  title: string
  body: string
  accent: string
  preview: React.ReactNode
}

const SLIDES: Slide[] = [
  { tag: 'STEP 01', title: 'Connect', accent: '#ff2a4d', preview: <ConnectPreview />,
    body: 'Connect your wallet and claim a unique @handle. This becomes your on-chain identity — how investors find, track and back you.' },
  { tag: 'STEP 02', title: 'Discover', accent: '#c8ff00', preview: <DiscoverPreview />,
    body: 'Every bot gets a generative signature, unique to its name — or its builder uploads a custom face. Browse the catalog of live prediction algorithms.' },
  { tag: 'STEP 03', title: 'Check the stats', accent: '#00d4aa', preview: <StatsPreview />,
    body: 'Open any bot to read its real metrics — Brier Score, Win Rate, Sharpe, drawdown — all derived from on-chain resolutions.' },
  { tag: 'STEP 04', title: 'Leaderboard', accent: '#FFD700', preview: <LeaderboardPreview />,
    body: 'Algorithms ranked strictly by Brier Score — lower is sharper. Gold, silver, bronze. Math decides, not marketing.' },
  { tag: 'STEP 05', title: 'Deploy & earn', accent: '#3B82F6', preview: <FeePreview />,
    body: 'Submit your own bot → 7-day shadow phase → Tier-1 opens your vault. On profit you keep 30%, the protocol 10%, depositors grow.' },
  { tag: 'STEP 06', title: 'Instant exit', accent: '#ff2a4d', preview: <ExitPreview />,
    body: 'Investors redeem shares anytime — principal + profit in one transaction, 1:1 at current NAV. No lockups. Non-custodial throughout.' },
]

// ─────────────────────────────────────────────────────────────
// The professional deck (sidebar + content)
// ─────────────────────────────────────────────────────────────

export function HowItWorksDeck({ onClose }: { onClose?: () => void }) {
  const [i, setI] = useState(0)
  const last = SLIDES.length - 1
  const s = SLIDES[i]

  const next = useCallback(() => setI(v => Math.min(v + 1, last)), [last])
  const prev = useCallback(() => setI(v => Math.max(v - 1, 0)), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'Escape' && onClose) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, onClose])

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-[#070707]">

      {/* ── Sidebar ── */}
      <div className="md:w-[260px] shrink-0 border-b md:border-b-0 md:border-r border-[#1a1a1a] bg-[#050505] p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="font-sans text-[15px] font-extrabold text-white tracking-tight">How it works<span style={{color:'#ff2a4d'}}>.</span></div>
          {onClose && (
            <button onClick={onClose} aria-label="Close" className="text-[#555] hover:text-white transition-colors font-mono text-sm md:hidden">[ESC]</button>
          )}
        </div>

        <div className="relative flex flex-col gap-1">
          {/* progress rail */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[#1a1a1a]" />
          <motion.div
            className="absolute left-[11px] top-2 w-px"
            style={{ background: s.accent }}
            animate={{ height: `${(i / last) * 100}%` }}
            transition={{ ease: 'easeOut', duration: 0.4 }}
          />
          {SLIDES.map((sl, idx) => {
            const active = idx === i
            const done = idx < i
            return (
              <button
                key={sl.tag}
                onClick={() => setI(idx)}
                className="relative flex items-center gap-3 py-2 text-left group"
              >
                <span
                  className="z-10 w-[22px] h-[22px] shrink-0 flex items-center justify-center font-mono text-[10px] font-bold border transition-all"
                  style={{
                    borderColor: active || done ? sl.accent : '#333',
                    background: active ? sl.accent : '#070707',
                    color: active ? '#030303' : done ? sl.accent : '#555',
                  }}
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span
                  className="font-mono text-xs transition-colors"
                  style={{ color: active ? '#fff' : '#666' }}
                >
                  {sl.title}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-auto pt-6 hidden md:block">
          <div className="font-mono text-[10px] text-[#333]">{String(i + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')} · ← → keys</div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 flex flex-col relative min-h-[420px] overflow-hidden">
        {/* ambient glow following the active step color */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          animate={{ background: `radial-gradient(620px circle at 72% 18%, ${s.accent}1f, transparent 62%)` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
        {/* faint grid texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.5]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(circle at 70% 30%, black, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(circle at 70% 30%, black, transparent 75%)',
          }}
        />

        {onClose && (
          <button onClick={onClose} aria-label="Close" className="hidden md:block absolute top-4 right-5 z-20 text-[#555] hover:text-white transition-colors font-mono text-xs">[ ESC ✕ ]</button>
        )}

        <div className="relative z-10 flex-1 flex items-center justify-center p-8 md:p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[440px]"
            >
              <div className="mb-6">{s.preview}</div>
              <div className="font-mono text-[10px] tracking-[0.3em] mb-2" style={{ color: s.accent }}>{s.tag}</div>
              <h2 className="font-mono text-3xl font-bold text-white tracking-tight mb-3">{s.title}</h2>
              <p className="text-sm text-[#999] leading-relaxed font-sans">{s.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer controls */}
        <div className="relative z-10 border-t border-[#1a1a1a] px-8 py-4 flex items-center justify-between bg-[#050505]">
          <button
            onClick={prev}
            disabled={i === 0}
            className="font-mono text-xs px-4 py-2 border border-[#1a1a1a] text-[#666] transition-all hover:text-white hover:border-[#333] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← PREV
          </button>

          <div className="flex gap-1.5">
            {SLIDES.map((_, idx) => (
              <button key={idx} onClick={() => setI(idx)} aria-label={`Slide ${idx + 1}`}
                className="w-1.5 h-1.5 rounded-full transition-all"
                style={{ background: idx === i ? s.accent : '#222', transform: idx === i ? 'scale(1.4)' : 'scale(1)' }} />
            ))}
          </div>

          {i < last ? (
            <button onClick={next}
              className="font-mono text-xs px-4 py-2 font-bold text-[#030303] transition-all"
              style={{ background: s.accent }}>
              NEXT →
            </button>
          ) : (
            <Link href="/list-bot" onClick={onClose}
              className="font-mono text-xs px-4 py-2 font-bold text-[#030303] transition-all no-underline"
              style={{ background: s.accent }}>
              START →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Modal wrapper
// ─────────────────────────────────────────────────────────────

export function HowItWorksModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-8"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
          {/* panel */}
          <motion.div
            className="relative w-full max-w-[920px] h-[600px] max-h-[88vh] border border-[#2a2a2a] overflow-hidden shadow-[0_40px_140px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.04),0_0_60px_rgba(255,42,77,0.06)]"
            initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 20 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <HowItWorksDeck onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
