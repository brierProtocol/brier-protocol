'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
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
        <div key={d.name} className="bg-[#0a0a0a]/80 border border-[#1a1a1a] flex flex-col items-center py-5 px-2 rounded backdrop-blur-sm">
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
    <div className="bg-[#0a0a0a]/80 border border-[#1a1a1a] p-5 w-full rounded backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-[#666] tracking-widest">BRIER SCORE</span>
        <span className="text-[8px] font-mono px-1.5 py-0.5" style={{ color: '#C8FF00', background: '#C8FF0014', border: '0.5px solid #C8FF0044' }}>STRONG</span>
      </div>
      <div className="font-mono font-bold text-4xl text-[#C8FF00] mb-1">0.082</div>
      <div className="text-[9px] font-mono text-[#555] mb-3">over 312 resolved predictions</div>
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

function ConnectPreview() {
  return (
    <div className="bg-[#0a0a0a]/80 border border-[#1a1a1a] p-6 w-full rounded flex items-center gap-4 backdrop-blur-sm">
      <BotIrisAvatar avatarId="connect-demo" accentColor="#ff2a4d" shape="ring" size={56} />
      <div className="flex-1">
        <div className="h-2.5 w-28 bg-[#1a1a1a] rounded mb-2" />
        <div className="text-primary font-mono text-xs">@your-handle</div>
      </div>
      <div className="font-mono text-[10px] px-3 py-2 border border-primary text-primary">[CONNECT]</div>
    </div>
  )
}

function GatePreview() {
  const gates = [
    { label: 'RESOLVED', value: '100', sub: 'predictions' },
    { label: 'BRIER', value: '0.20', sub: 'or lower' },
    { label: 'LIVE', value: '21', sub: 'days' },
  ]
  return (
    <div className="bg-[#0a0a0a]/80 border border-[#1a1a1a] p-5 w-full rounded backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-mono text-[#666] tracking-widest">VAULT GATE</span>
        <span className="text-[8px] font-mono px-1.5 py-0.5 text-[#00d4aa]" style={{ background: '#00d4aa14', border: '0.5px solid #00d4aa44' }}>ALL CLEARED</span>
      </div>
      <div className="grid grid-cols-3 gap-px bg-[#1a1a1a] border border-[#1a1a1a]">
        {gates.map((g) => (
          <div key={g.label} className="bg-[#0a0a0a] p-3">
            <div className="text-[8px] font-mono text-[#555] tracking-widest mb-1">{g.label}</div>
            <div className="font-mono font-bold text-xl text-[#00d4aa]">{g.value}</div>
            <div className="text-[8px] font-mono text-[#555]">{g.sub}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-[#888]">
        <span className="text-[#00d4aa]">→</span> ERC-4626 vault opens. Capital can flow in.
      </div>
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
    <div className="bg-[#0a0a0a]/80 border border-[#1a1a1a] p-5 w-full rounded backdrop-blur-sm">
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
    <div className="bg-[#0a0a0a]/80 border border-[#1a1a1a] p-6 w-full rounded backdrop-blur-sm">
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
// Starfield: the "stellar" identity. Drifting parallax stars with
// twinkle, a few in Brier red. The field glides sideways as you move
// between steps, so the deck feels like travelling through space.
// ─────────────────────────────────────────────────────────────

function Starfield({ stepRef, accent }: { stepRef: React.MutableRefObject<number>; accent: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio, 2)
    let W = 0, H = 0, raf = 0, t = 0, ox = 0

    interface S { x: number; y: number; z: number; r: number; red: boolean; tw: number }
    let stars: S[] = []
    const build = () => {
      const rect = canvas.getBoundingClientRect()
      W = rect.width; H = rect.height
      canvas.width = W * dpr; canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.min(240, Math.floor((W * H) / 4600))
      stars = []
      for (let i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * W, y: Math.random() * H,
          z: 0.25 + Math.random() * 0.75,
          r: Math.random() * 1.3 + 0.2,
          red: Math.random() < 0.12,
          tw: Math.random() * Math.PI * 2,
        })
      }
    }
    build()

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      const tox = -stepRef.current * 30
      ox += (tox - ox) * 0.045
      for (const s of stars) {
        const span = W + 8
        const x = (((s.x + ox * s.z) % span) + span) % span - 4
        const tw = 0.45 + 0.55 * Math.sin(t * 1.1 + s.tw)
        ctx.beginPath()
        ctx.arc(x, s.y, s.r * s.z, 0, Math.PI * 2)
        if (s.red) {
          ctx.fillStyle = `rgba(255,42,77,${0.5 * tw * s.z})`
          ctx.shadowColor = 'rgba(255,42,77,0.8)'; ctx.shadowBlur = 6
        } else {
          ctx.fillStyle = `rgba(255,255,255,${0.6 * tw * s.z})`
          ctx.shadowBlur = 0
        }
        ctx.fill()
      }
      ctx.shadowBlur = 0
    }

    if (reduce) {
      draw()
    } else {
      const frame = () => { t += 0.016; draw(); raf = requestAnimationFrame(frame) }
      frame()
    }

    const ro = new ResizeObserver(build); ro.observe(canvas)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [stepRef])

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <canvas ref={ref} className="absolute inset-0 w-full h-full" />
      {/* accent nebula that tints with the active step */}
      <motion.div
        className="absolute inset-0"
        animate={{ background: `radial-gradient(640px circle at 70% 26%, ${accent}1c, transparent 60%)` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 120%, rgba(2,2,3,0.85), transparent 60%)' }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Slide data
// ─────────────────────────────────────────────────────────────

type Slide = {
  tag: string
  title: string
  kicker: string
  body: string
  accent: string
  preview: React.ReactNode
}

const SLIDES: Slide[] = [
  { tag: 'STEP 01', title: 'Connect', kicker: 'Claim your star', accent: '#ff2a4d', preview: <ConnectPreview />,
    body: 'Connect your wallet and claim a unique @handle. That becomes your on-chain identity, how depositors find, track and back you.' },
  { tag: 'STEP 02', title: 'Publish your bot', kicker: 'Enter the sky', accent: '#c8ff00', preview: <DiscoverPreview />,
    body: 'Submit the algorithm that forecasts real world events on Polymarket. It gets a generative signature unique to its name and joins the catalog.' },
  { tag: 'STEP 03', title: 'Let it train', kicker: 'Earn your light', accent: '#00d4aa', preview: <StatsPreview />,
    body: 'Shadow phase. Your bot predicts in public and reality scores every call. Brier Score, win rate, Sharpe and drawdown, all earned on-chain.' },
  { tag: 'STEP 04', title: 'Open a vault', kicker: 'Reach the summit', accent: '#FFD700', preview: <GatePreview />,
    body: 'Clear the gate: 100 resolved predictions, Brier 0.20 or lower, 21 days live. Your ERC-4626 vault opens and capital can finally flow in.' },
  { tag: 'STEP 05', title: 'Earn the split', kicker: 'Compound the orbit', accent: '#3B82F6', preview: <FeePreview />,
    body: 'No management fee, performance only. On profit you keep 30%, depositors take 60%, the protocol 10%. You never touch their principal.' },
  { tag: 'STEP 06', title: 'Instant exit', kicker: 'No gravity', accent: '#ff2a4d', preview: <ExitPreview />,
    body: 'Depositors redeem anytime, principal plus profit in one transaction at current NAV. No lockups. Non custodial from start to finish.' },
]

// ─────────────────────────────────────────────────────────────
// The deck: a constellation of steps over a starfield
// ─────────────────────────────────────────────────────────────

export function HowItWorksDeck({ onClose }: { onClose?: () => void }) {
  const [i, setI] = useState(0)
  const last = SLIDES.length - 1
  const s = SLIDES[i]
  const stepRef = useRef(0)
  useEffect(() => { stepRef.current = i }, [i])

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
    <div className="relative w-full h-full flex flex-col md:flex-row bg-[#040405] overflow-hidden">
      <Starfield stepRef={stepRef} accent={s.accent} />

      {/* ── Constellation rail ── */}
      <div className="relative z-10 md:w-[300px] shrink-0 border-b md:border-b-0 md:border-r border-white/[0.06] bg-gradient-to-b from-[#06060a]/80 to-[#050507]/40 backdrop-blur-md p-7 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="font-sans text-[16px] font-extrabold text-white tracking-tight">How it works<span style={{ color: '#ff2a4d' }}>.</span></div>
          {onClose && (
            <button onClick={onClose} aria-label="Close" className="text-[#666] hover:text-white transition-colors font-mono text-[11px] md:hidden">[ESC]</button>
          )}
        </div>

        <div className="relative flex flex-col gap-0.5">
          {/* rail */}
          <div className="absolute left-[13px] top-3.5 bottom-3.5 w-px bg-white/[0.08]" />
          <motion.div
            className="absolute left-[13px] top-3.5 w-px"
            animate={{ height: `calc(${(i / last) * 100}% )`, background: s.accent, boxShadow: `0 0 8px ${s.accent}` }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
          />
          {SLIDES.map((sl, idx) => {
            const active = idx === i
            const done = idx < i
            const c = active || done ? sl.accent : '#3a3a3a'
            return (
              <button key={sl.tag} onClick={() => setI(idx)} className="relative flex items-center gap-4 py-2.5 text-left group">
                <span className="relative z-10 w-[27px] h-[27px] shrink-0 flex items-center justify-center">
                  {active && (
                    <motion.span
                      className="absolute inset-0 rounded-full"
                      style={{ border: `1px solid ${sl.accent}` }}
                      animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
                      transition={{ repeat: Infinity, duration: 1.9, ease: 'easeOut' }}
                    />
                  )}
                  <span
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: active ? 11 : 8, height: active ? 11 : 8,
                      background: active ? sl.accent : done ? `${sl.accent}` : 'transparent',
                      border: active || done ? 'none' : '1.5px solid #333',
                      boxShadow: active ? `0 0 12px ${sl.accent}, 0 0 4px ${sl.accent}` : 'none',
                    }}
                  />
                </span>
                <span className="flex flex-col">
                  <span className="font-sans text-[13px] font-semibold transition-colors leading-tight" style={{ color: active ? '#fff' : done ? '#aaa' : '#666' }}>
                    {sl.title}
                  </span>
                  <span className="font-mono text-[9px] tracking-wider transition-colors" style={{ color: active ? `${sl.accent}` : '#444' }}>
                    {String(idx + 1).padStart(2, '0')} · {sl.kicker}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-auto pt-6 hidden md:flex items-center gap-2 font-mono text-[10px] text-[#444]">
          <span style={{ color: s.accent }}>{String(i + 1).padStart(2, '0')}</span>
          <span>/ {String(SLIDES.length).padStart(2, '0')}</span>
          <span className="text-[#333]">·</span>
          <span>← → to travel</span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex-1 flex flex-col min-h-[440px]">
        {onClose && (
          <button onClick={onClose} aria-label="Close" className="hidden md:block absolute top-5 right-6 z-20 text-[#666] hover:text-white transition-colors font-mono text-[11px]">[ ESC ✕ ]</button>
        )}

        <div className="flex-1 flex items-center justify-center p-8 md:p-14">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 22, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -22, filter: 'blur(10px)' }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[460px]"
            >
              {/* preview with accent halo */}
              <div className="relative mb-8">
                <div className="absolute -inset-6 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 40%, ${s.accent}22, transparent 70%)` }} />
                <div className="relative">{s.preview}</div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.4 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-[10px] tracking-[0.32em]" style={{ color: s.accent }}>{s.tag}</span>
                  <span className="h-px w-8" style={{ background: `${s.accent}66` }} />
                  <span className="font-mono text-[10px] tracking-[0.2em] text-[#666] uppercase">{s.kicker}</span>
                </div>
                <h2 className="font-sans text-[clamp(32px,4.4vw,46px)] font-extrabold text-white tracking-[-0.03em] leading-[1.02] mb-4">
                  {s.title}<span style={{ color: s.accent }}>.</span>
                </h2>
                <p className="text-[15px] text-[#b4b4b4] leading-relaxed font-sans max-w-[420px]">{s.body}</p>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer controls */}
        <div className="relative z-10 border-t border-white/[0.06] px-8 py-4 flex items-center justify-between bg-[#050507]/60 backdrop-blur-md">
          <button
            onClick={prev}
            disabled={i === 0}
            className="font-sans text-[12px] font-medium px-4 py-2 rounded-full border border-white/[0.08] text-[#888] transition-all hover:text-white hover:border-white/20 disabled:opacity-25 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>

          <div className="flex gap-2">
            {SLIDES.map((sl, idx) => (
              <button
                key={idx} onClick={() => setI(idx)} aria-label={`Step ${idx + 1}`}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: idx === i ? 22 : 6, background: idx === i ? sl.accent : '#2a2a2a' }}
              />
            ))}
          </div>

          {i < last ? (
            <button
              onClick={next}
              className="font-sans text-[12px] font-bold px-5 py-2 rounded-full text-[#030303] transition-all"
              style={{ background: s.accent, boxShadow: `0 0 18px ${s.accent}66` }}
            >
              Next →
            </button>
          ) : (
            <Link
              href="/list-bot" onClick={onClose}
              className="font-sans text-[12px] font-bold px-5 py-2 rounded-full text-[#030303] transition-all no-underline"
              style={{ background: s.accent, boxShadow: `0 0 18px ${s.accent}66` }}
            >
              Enter the arena →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Modal wrapper (portal on <body> so it always centers in the viewport)
// ─────────────────────────────────────────────────────────────

export function HowItWorksModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-8"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-[1080px] h-[640px] max-h-[90vh] border border-white/10 overflow-hidden shadow-[0_40px_160px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.05),0_0_80px_rgba(255,42,77,0.08)]"
            initial={{ scale: 0.95, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 24 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <HowItWorksDeck onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
