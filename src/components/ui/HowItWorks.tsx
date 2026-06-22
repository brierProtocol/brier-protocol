'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

// ─────────────────────────────────────────────────────────────
// Live mini-previews built from the real product components
// ─────────────────────────────────────────────────────────────

function PathsPreview() {
  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      <div className="bg-[#0a0a0a]/80 border border-[#1a1a1a] rounded p-4 backdrop-blur-sm">
        <div className="text-[9px] font-mono text-[#666] tracking-widest mb-2">INVESTOR</div>
        <div className="text-white font-sans font-bold text-[14px] mb-1.5">Deposit</div>
        <div className="text-[11px] text-[#777] leading-relaxed">Back a proven vault. Earn as it compounds.</div>
      </div>
      <div className="bg-[#0a0a0a]/80 border border-dashed border-[#262626] rounded p-4 backdrop-blur-sm">
        <div className="text-[9px] font-mono text-[#666] tracking-widest mb-2">BUILDER</div>
        <div className="text-white font-sans font-bold text-[14px] mb-1.5">Deploy</div>
        <div className="text-[11px] text-[#777] leading-relaxed">Ship a bot. Prove it. Open a vault.</div>
      </div>
    </div>
  )
}

function CategoriesPreview() {
  const cats = [
    { label: 'Crypto', c: '#f7931a' },
    { label: 'Politics', c: '#4285f0' },
    { label: 'Sports', c: '#00d4aa' },
    { label: 'Economics', c: '#c8ff00' },
    { label: 'Culture', c: '#ff2a4d' },
  ]
  return (
    <div className="bg-[#0a0a0a]/80 border border-[#1a1a1a] p-5 w-full rounded backdrop-blur-sm">
      <div className="text-[10px] font-mono text-[#666] tracking-widest mb-3">ANY POLYMARKET CATEGORY</div>
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <span key={c.label} className="text-[11px] font-sans font-medium px-3 py-1.5 rounded-full border" style={{ color: c.c, borderColor: `${c.c}40`, background: `${c.c}10` }}>{c.label}</span>
        ))}
      </div>
      <div className="mt-4 text-[11px] text-[#777] leading-relaxed">Your bot forecasts real world events, scored on chain.</div>
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
      <div className="text-[9px] font-mono text-[#555] mb-3">over 1,300 resolved predictions</div>
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
    <div className="bg-[#0a0a0a]/80 border border-[#1a1a1a] w-full rounded backdrop-blur-sm overflow-hidden">
      {/* cover strip */}
      <div className="h-16 w-full" style={{ background: 'linear-gradient(135deg, #0f0005 0%, #1a0008 50%, #0a0a0a 100%)' }}>
        <div className="h-full w-full opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #ff2a4d22 0%, transparent 60%), radial-gradient(circle at 80% 40%, #ff2a4d11 0%, transparent 50%)' }} />
      </div>

      <div className="px-5 pb-5">
        {/* avatar row */}
        <div className="flex items-end justify-between -mt-6 mb-3">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-[#111] border-2 border-[#0a0a0a] overflow-hidden flex items-center justify-center">
              <svg viewBox="0 0 40 40" className="w-9 h-9" fill="none" aria-hidden="true">
                <circle cx="20" cy="15" r="7" fill="#2a2a2a" />
                <path d="M4 42c0-8.8 7.2-16 16-16s16 7.2 16 16" fill="#2a2a2a" />
              </svg>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#050505] border border-[#1a1a1a] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63z" />
              </svg>
            </div>
          </div>
          <div className="font-mono text-[10px] px-3 py-1.5 border border-primary/60 text-primary rounded-sm">CONNECT</div>
        </div>

        {/* identity */}
        <div className="mb-3">
          <div className="text-white font-sans font-bold text-[15px] leading-tight">@your-handle</div>
          <div className="text-[#444] font-mono text-[9px] mt-0.5 tracking-wider">0x1f2a…a4d2</div>
        </div>

        {/* bio */}
        <div className="text-[12px] text-[#777] leading-relaxed mb-4">
          Quant researcher. Building prediction edges on Polymarket since 2023.
        </div>

        {/* social stats */}
        <div className="flex items-center gap-5 border-t border-[#111] pt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-white font-sans font-semibold text-[13px]">1.2k</span>
            <span className="text-[#555] font-mono text-[8px] tracking-widest">FOLLOWERS</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-white font-sans font-semibold text-[13px]">47</span>
            <span className="text-[#555] font-mono text-[8px] tracking-widest">FOLLOWING</span>
          </div>
          <div className="ml-auto">
            <span className="font-mono text-[8px] tracking-widest" style={{ color: '#ff2a4d' }}>● ACTIVE</span>
          </div>
        </div>
      </div>
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

// ─────────────────────────────────────────────────────────────
// Starfield: Brier's stellar identity. Drifting parallax stars that
// glide sideways as you move between steps. Subtle, behind the content.
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
      const n = Math.min(200, Math.floor((W * H) / 5200))
      stars = []
      for (let i = 0; i < n; i++) {
        stars.push({ x: Math.random() * W, y: Math.random() * H, z: 0.25 + Math.random() * 0.75, r: Math.random() * 1.2 + 0.2, red: Math.random() < 0.1, tw: Math.random() * Math.PI * 2 })
      }
    }
    build()

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      const tox = -stepRef.current * 34
      ox += (tox - ox) * 0.045
      for (const s of stars) {
        const span = W + 8
        const x = (((s.x + ox * s.z) % span) + span) % span - 4
        const tw = 0.4 + 0.6 * Math.sin(t * 1.0 + s.tw)
        ctx.beginPath()
        ctx.arc(x, s.y, s.r * s.z, 0, Math.PI * 2)
        if (s.red) { ctx.fillStyle = `rgba(255,42,77,${0.45 * tw * s.z})`; ctx.shadowColor = 'rgba(255,42,77,0.8)'; ctx.shadowBlur = 6 }
        else { ctx.fillStyle = `rgba(255,255,255,${0.55 * tw * s.z})`; ctx.shadowBlur = 0 }
        ctx.fill()
      }
      ctx.shadowBlur = 0
    }

    if (reduce) draw()
    else { const frame = () => { t += 0.016; draw(); raf = requestAnimationFrame(frame) }; frame() }

    const ro = new ResizeObserver(build); ro.observe(canvas)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [stepRef])

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <canvas ref={ref} className="absolute inset-0 w-full h-full" />
      <motion.div
        className="absolute inset-0"
        animate={{ background: `radial-gradient(680px circle at 30% 40%, ${accent}16, transparent 60%)` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(130% 100% at 50% 120%, rgba(2,2,3,0.8), transparent 55%)' }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Slide data (minimal: title, body, accent, preview)
// ─────────────────────────────────────────────────────────────

type Slide = { title: string; body: string; accent: string; preview: React.ReactNode }

const SLIDES: Slide[] = [
  { title: 'Connect', accent: '#ff2a4d', preview: <ConnectPreview />,
    body: 'Connect your wallet, it is your identity. Build your profile with a photo, your X and a short bio, so people can follow your work.' },
  { title: 'Deposit or build', accent: '#42c8ff', preview: <PathsPreview />,
    body: 'Two ways in. Back a proven vault as an investor, or deploy your own bot as a builder. Same arena, your call.' },
  { title: 'Deploy a bot', accent: '#c8ff00', preview: <CategoriesPreview />,
    body: 'Spin up a bot in any Polymarket category, from crypto to politics to sports. It forecasts real world events on chain.' },
  { title: 'Let it train', accent: '#00d4aa', preview: <StatsPreview />,
    body: 'Shadow phase. It predicts in public and reality scores every call. The Brier Score is earned, never claimed.' },
  { title: 'Open a vault', accent: '#FFD700', preview: <GatePreview />,
    body: 'Clear the gate: 100 resolved predictions, Brier 0.20 or lower, 21 days live. Your vault opens and depositors can back you.' },
  { title: 'Earn and exit', accent: '#3B82F6', preview: <FeePreview />,
    body: 'On profit: 60% to depositors, 30% to you, 10% to the protocol. Depositors redeem anytime at NAV, non custodial throughout.' },
]

const pad = (n: number) => String(n).padStart(2, '0')

// ─────────────────────────────────────────────────────────────
// The deck: one focused step at a time, over a starfield
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
    <div className="relative w-full h-full flex flex-col bg-[#040405] overflow-hidden">
      <Starfield stepRef={stepRef} accent={s.accent} />

      {/* header */}
      <div className="relative z-10 flex items-center justify-between px-8 md:px-12 pt-7">
        <div className="font-sans text-[15px] font-extrabold tracking-tight text-white">How it works<span className="text-primary">.</span></div>
        <div className="flex items-center gap-5">
          <span className="font-mono text-[11px] tabular-nums"><span style={{ color: s.accent }}>{pad(i + 1)}</span><span className="text-[#555]"> / {pad(SLIDES.length)}</span></span>
          {onClose && <button onClick={onClose} aria-label="Close" className="font-mono text-[11px] text-[#666] hover:text-white transition-colors">[ ESC ✕ ]</button>}
        </div>
      </div>

      {/* stepper: progress + jump, no repeated labels */}
      <div className="relative z-10 px-8 md:px-12 mt-7">
        <div className="flex items-center gap-2">
          {SLIDES.map((sl, idx) => (
            <button key={idx} onClick={() => setI(idx)} title={sl.title} aria-label={sl.title} className="flex-1 py-2 cursor-pointer">
              <span
                className="block h-[3px] rounded-full transition-all duration-300"
                style={{ background: idx <= i ? sl.accent : 'rgba(255,255,255,0.09)', boxShadow: idx === i ? `0 0 10px ${sl.accent}` : 'none' }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* content: preview + text, one focused step */}
      <div className="relative z-10 flex-1 flex items-center px-8 md:px-12 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -18, filter: 'blur(8px)' }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="w-full grid md:grid-cols-2 gap-10 md:gap-14 items-center"
          >
            <div className="relative order-2 md:order-1">
              <div className="absolute -inset-8 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 50%, ${s.accent}1f, transparent 70%)` }} />
              <div className="relative">{s.preview}</div>
            </div>
            <div className="order-1 md:order-2">
              <motion.h2
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.4 }}
                className="font-sans text-[clamp(34px,4.6vw,52px)] font-extrabold text-white tracking-[-0.035em] leading-[1.0] mb-5"
              >
                {s.title}<span style={{ color: s.accent }}>.</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.4 }}
                className="text-[15px] md:text-[16px] text-[#b4b4b4] leading-relaxed font-sans max-w-[400px]"
              >
                {s.body}
              </motion.p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* footer */}
      <div className="relative z-10 flex items-center justify-between px-8 md:px-12 pb-7">
        <button
          onClick={prev}
          disabled={i === 0}
          className="font-sans text-[13px] font-medium text-[#888] px-2 py-2 transition-all hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
        >
          ← Prev
        </button>
        {i < last ? (
          <button
            onClick={next}
            className="font-sans text-[13px] font-bold px-6 py-2.5 rounded-full text-[#030303] transition-all"
            style={{ background: s.accent, boxShadow: `0 0 20px ${s.accent}55` }}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={onClose}
            className="font-sans text-[13px] font-bold px-7 py-2.5 rounded-full text-[#030303] transition-all"
            style={{ background: s.accent, boxShadow: `0 0 20px ${s.accent}55` }}
          >
            Done
          </button>
        )}
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
            className="relative w-full max-w-[1000px] h-[580px] max-h-[88vh] border border-white/10 overflow-hidden shadow-[0_40px_160px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.05),0_0_80px_rgba(255,42,77,0.08)]"
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
