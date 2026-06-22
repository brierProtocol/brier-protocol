'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAccount, useSignMessage } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { motion } from 'framer-motion'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import { botEye } from '@/lib/botIdentity'

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'politics', label: 'Politics' },
  { id: 'crypto',   label: 'Crypto'   },
  { id: 'sports',   label: 'Sports'   },
  { id: 'economy',  label: 'Economy'  },
  { id: 'culture',  label: 'Culture'  },
  { id: 'tech',     label: 'Tech'     },
  { id: 'world',    label: 'World'    },
]

const INPUT_CLS =
  'w-full bg-[#0a0a0a] border border-[#1f1f1f] text-white font-sans text-[14px] outline-none px-4 py-3 rounded-xl placeholder:text-[#555] transition-all focus:border-primary/50 focus:bg-[#0c0c0c] focus:shadow-[0_0_24px_rgba(255,42,77,0.08)] hover:border-[#2a2a2a]'

function Eyebrow({ word }: { word: string }) {
  return (
    <div className="inline-flex items-center gap-3 mb-5">
      <span className="h-px w-9 bg-gradient-to-r from-primary to-primary/0" />
      <span className="font-mono text-[11px] tracking-[0.42em] uppercase text-[#a8a8a8]">
        {word.split(' ')[0]} <span className="text-primary">{word.split(' ').slice(1).join(' ')}</span>
      </span>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans">
      <div className="max-w-[760px] mx-auto px-6 md:px-8 pt-8 pb-20">
        {/* header */}
        <div className="flex items-center justify-between mb-12 text-[12px]">
          <Link href="/app" className="text-[#777] hover:text-white transition-colors no-underline font-sans">← Back to the arena</Link>
          <Link href="/developers" className="text-[#777] hover:text-primary transition-colors no-underline font-mono text-[11px] tracking-widest">SDK DOCS</Link>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function ListBotPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({ name: '', description: '', market: 'Polymarket', categories: [] as string[] })
  const [verifying, setVerifying] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [deployedSlug, setDeployedSlug] = useState('')
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedCmd, setCopiedCmd] = useState(false)

  const { isConnected, address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { openConnectModal } = useConnectModal()

  const handle = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'your-bot'
  const shortAddr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''

  const register = async () => {
    setErrorMsg('')
    if (!address) { setErrorMsg('Wallet not connected.'); return }
    setVerifying(true)
    try {
      const message = `I am registering the prediction bot ${formData.name || '[NAME]'} to Brier. Timestamp: ${Date.now()}`
      try {
        await signMessageAsync({ message })
      } catch (signErr: any) {
        throw new Error(signErr?.shortMessage || signErr?.message || 'Signature rejected.')
      }
      const res = await fetch('/api/bots/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, description: formData.description, market: formData.market, categories: formData.categories, walletAddress: address }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Registration failed. Please try again.')

      setDeployedSlug(result.slug)
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
      let sk = 'sk_live_'
      for (let i = 0; i < 32; i++) sk += chars[Math.floor(Math.random() * chars.length)]
      setSecretKey(sk)
      setStep(3)
    } catch (err: any) {
      setErrorMsg(err?.message || 'An error occurred.')
    } finally {
      setVerifying(false)
    }
  }

  // ── GATE: wallet must be connected first ───────────────────────────────────
  if (!isConnected) {
    return (
      <Shell>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
          <Eyebrow word="Deploy a bot" />
          <h1 className="m-0 font-sans font-extrabold tracking-[-0.035em] leading-[1.02] text-[clamp(34px,5vw,56px)]">
            Deploy a bot<span className="text-primary">.</span>
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-[#9a9a9a]">
            No capital of your own. Just an edge on Polymarket, proven in the open. Bring your algorithm and let it climb.
          </p>

          {/* connect panel */}
          <div className="mt-10 rounded-2xl border border-[#1a1a1a] bg-gradient-to-b from-[#0b0b0c] to-[#080809] p-8 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-28 pointer-events-none" style={{ background: 'radial-gradient(60% 100% at 50% 0%, rgba(255,42,77,0.10), transparent 70%)' }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(255,42,77,0.8)]" />
                <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-primary">Step 1 — Connect</span>
              </div>
              <h2 className="m-0 font-sans font-bold text-[22px] tracking-tight">Connect your wallet to begin</h2>
              <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[#8f8f8f]">
                Your wallet is your builder identity. Every bot you deploy is bound to it, and that is how your share of the profits flows back to you. Non custodial, always.
              </p>
              <button
                onClick={() => openConnectModal?.()}
                className="mt-6 inline-flex items-center gap-2 bg-primary text-[#030303] px-7 py-3 rounded-full font-sans font-bold text-[14px] transition-all hover:shadow-[0_0_24px_rgba(255,42,77,0.5)] cursor-pointer"
              >
                Connect wallet →
              </button>
            </div>
          </div>

          {/* what comes next */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { n: '01', t: 'Name it', d: 'Give your bot a name and a short bio. Its signature art is born from the name.' },
              { n: '02', t: 'Prove it', d: 'Shadow phase. It predicts in public and reality scores every call.' },
              { n: '03', t: 'Open a vault', d: '100 resolved, Brier 0.20 or lower, 21 days live. Then capital can back you.' },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border border-[#161616] bg-[#070708] p-4">
                <div className="font-mono text-[11px] text-primary mb-2">{s.n}</div>
                <div className="font-sans font-bold text-[14px] mb-1">{s.t}</div>
                <div className="text-[12px] leading-relaxed text-[#777]">{s.d}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </Shell>
    )
  }

  // ── stepper (connected) ─────────────────────────────────────────────────────
  const STEPS = [
    { n: 1, label: 'Identity' },
    { n: 2, label: 'Sign' },
    { n: 3, label: 'Live' },
  ]

  return (
    <Shell>
      <Eyebrow word="Deploy a bot" />

      {/* stepper */}
      <div className="flex items-center mb-10 select-none">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold font-mono transition-all ${
                  step === s.n
                    ? 'bg-primary text-[#030303] shadow-[0_0_14px_rgba(255,42,77,0.45)]'
                    : step > s.n
                      ? 'bg-primary/15 text-primary border border-primary/40'
                      : 'bg-white/[0.03] text-[#555] border border-[#222]'
                }`}
              >
                {step > s.n ? '✓' : s.n}
              </span>
              <span className={`text-[12px] font-sans font-semibold tracking-tight ${step >= s.n ? 'text-white' : 'text-[#555]'}`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-3 transition-colors ${step > s.n ? 'bg-primary/30' : 'bg-[#1a1a1a]'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#1a1a1a] bg-[#080809] p-7 md:p-9">

        {/* ── STEP 1: IDENTITY ── */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
            <h2 className="m-0 font-sans font-extrabold text-[26px] tracking-tight">Name your algorithm<span className="text-primary">.</span></h2>
            <p className="mt-2 mb-7 text-[14px] text-[#8f8f8f]">This is how the arena will know it. You can refine everything later from its profile.</p>

            {/* bot name */}
            <div className="mb-6">
              <label className="block text-[12px] font-sans font-semibold text-[#bbb] mb-2">Bot name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. ADAN-PRED"
                className={INPUT_CLS}
              />
              {formData.name && (
                <div className="mt-2 font-mono text-[11px] text-[#666]">brier.world/bot/<span className="text-primary">{handle}</span></div>
              )}
            </div>

            {/* bio */}
            <div className="mb-6">
              <label className="block text-[12px] font-sans font-semibold text-[#bbb] mb-2">Bio</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does it predict, and what is its edge? e.g. Perp-funded model forecasting BTC and ETH resolutions on Polymarket."
                className={`${INPUT_CLS} min-h-[110px] resize-y leading-relaxed`}
              />
              <div className="mt-2 text-[11px] text-[#666]">A short pitch. This is what investors read first on its card.</div>
            </div>

            {/* venue */}
            <div className="mb-7">
              <label className="block text-[12px] font-sans font-semibold text-[#bbb] mb-2">Prediction venue</label>
              <div className="flex items-center gap-3 rounded-xl border border-[#1a1a1a] bg-[#060607] px-4 py-3">
                <span className="w-7 h-7 rounded-md bg-[#1a1f2e] flex items-center justify-center shrink-0">
                  <span className="w-3 h-3 rounded-sm bg-[#4285f0]" />
                </span>
                <div className="flex-1">
                  <div className="text-[13px] font-sans font-semibold text-white">Polymarket</div>
                  <div className="text-[11px] text-[#666]">Forecasts real world events across every category</div>
                </div>
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#666] border border-[#222] rounded px-2 py-1">Fixed</span>
              </div>
            </div>

            {/* category chips */}
            <div className="mb-7">
              <label className="block text-[12px] font-sans font-semibold text-[#bbb] mb-1.5">
                Market categories <span className="text-[#555] font-normal">(select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => {
                  const selected = formData.categories.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        const next = selected
                          ? formData.categories.filter(x => x !== c.id)
                          : [...formData.categories, c.id]
                        setFormData({ ...formData, categories: next })
                      }}
                      className={`px-3.5 py-1.5 rounded-full font-mono text-[11px] tracking-[0.08em] uppercase border transition-all cursor-pointer ${
                        selected
                          ? 'border-primary/60 bg-primary/10 text-primary shadow-[0_0_10px_rgba(255,42,77,0.14)]'
                          : 'border-[#1f1f1f] bg-[#060607] text-[#666] hover:border-[#333] hover:text-[#999]'
                      }`}
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
              <div className="mt-2 text-[11px] text-[#555]">Routes your bot to the right audiences in the catalog.</div>
            </div>

            {/* signature art — generative from the name (do not change) */}
            <div className="mb-8 flex items-center gap-4 rounded-xl border border-[#161616] bg-[#070708] p-4">
              <div className="rounded-lg overflow-hidden border border-[#1a1a1a] shrink-0">
                <BotIrisAvatar {...botEye({ slug: formData.name || 'preview', name: formData.name })} size={72} />
              </div>
              <div className="text-[12px] text-[#888] font-sans leading-relaxed">
                Your bot&apos;s signature is generated live from its name, watch it shift as you type.<br />
                <span className="text-[#666]">You can upload a custom picture later from its profile.</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => { setErrorMsg(''); setStep(2) }}
                disabled={!formData.name || formData.name.length < 2}
                className={`rounded-full font-sans font-bold text-[14px] px-7 py-3 transition-all ${
                  formData.name && formData.name.length >= 2
                    ? 'bg-primary text-[#030303] shadow-[0_0_16px_rgba(255,42,77,0.4)] hover:shadow-[0_0_24px_rgba(255,42,77,0.55)] cursor-pointer'
                    : 'bg-white/[0.04] text-[#555] cursor-not-allowed border border-[#1a1a1a]'
                }`}
              >
                Continue →
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: SIGN ── */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
            <h2 className="m-0 font-sans font-extrabold text-[26px] tracking-tight">Sign to deploy<span className="text-primary">.</span></h2>
            <p className="mt-2 mb-7 text-[14px] text-[#8f8f8f] max-w-md leading-relaxed">
              One signature binds <strong className="text-white">{formData.name}</strong> to your wallet. Gas free, it only proves you own this identity. No funds move.
            </p>

            <div className="rounded-xl border border-[#1a1a1a] bg-[#060607] p-4 mb-6 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#00d4aa] shadow-[0_0_8px_#00d4aa]" />
              <span className="text-[12px] font-sans text-[#9a9a9a]">Connected wallet</span>
              <span className="ml-auto font-mono text-[12px] text-white">{shortAddr}</span>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-primary/40 bg-primary/[0.06] text-primary px-4 py-3 text-[13px] mb-6 font-sans">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => { setErrorMsg(''); setStep(1) }}
                className="text-[13px] font-sans font-medium text-[#888] hover:text-white transition-colors px-2 py-2"
              >
                ← Back
              </button>
              <button
                onClick={register}
                disabled={verifying}
                className={`rounded-full font-sans font-bold text-[14px] px-7 py-3 transition-all ${
                  verifying
                    ? 'bg-white/[0.04] text-[#555] cursor-not-allowed border border-[#1a1a1a]'
                    : 'bg-primary text-[#030303] shadow-[0_0_16px_rgba(255,42,77,0.4)] hover:shadow-[0_0_24px_rgba(255,42,77,0.55)] cursor-pointer'
                }`}
              >
                {verifying ? 'Awaiting signature…' : 'Sign & deploy →'}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: LIVE ── */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00d4aa] shadow-[0_0_10px_#00d4aa]" />
              <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-[#00d4aa]">Deployed</span>
            </div>
            <h2 className="m-0 font-sans font-extrabold text-[26px] tracking-tight">{formData.name} is on the hill<span className="text-primary">.</span></h2>
            <p className="mt-2 mb-7 text-[14px] text-[#8f8f8f] leading-relaxed max-w-lg">
              It enters the shadow phase now. Wire it up with the key below and it starts predicting in public.
            </p>

            {/* secret key */}
            <div className="rounded-xl border border-primary/30 bg-[#0c0406] p-5 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="font-sans font-bold text-[12px] text-primary tracking-wide">Builder secret key</span>
              </div>
              <p className="text-[12px] text-[#8f8f8f] mb-3 leading-relaxed">
                Required for SDK auth. We never store it, you will only see it once. Keep it out of version control.
              </p>
              <div className="flex gap-2">
                <input readOnly value={secretKey} className="flex-1 bg-[#1a0608] border border-primary/30 text-primary px-4 py-2.5 rounded-lg font-mono text-[12px] outline-none" />
                <button
                  onClick={() => { navigator.clipboard.writeText(secretKey); setCopiedKey(true); setTimeout(() => setCopiedKey(false), 1500) }}
                  className="bg-primary text-[#030303] px-5 rounded-lg font-sans font-bold text-[12px] hover:shadow-[0_0_14px_rgba(255,42,77,0.5)] transition-all cursor-pointer"
                >
                  {copiedKey ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* install */}
            <div className="mb-6">
              <div className="text-[12px] font-sans font-semibold text-[#bbb] mb-2">Quick install, run in your terminal</div>
              <div className="bg-[#050505] border border-[#1a1a1a] rounded-lg p-4 flex items-center gap-3">
                <span className="text-[#444] font-mono text-xs select-none">$</span>
                <code className="flex-1 text-[#00d4aa] font-mono text-[12px] select-all break-all">{`BUILDER_SECRET_KEY=${secretKey} BOT_SLUG=${handle} yarn start`}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(`BUILDER_SECRET_KEY=${secretKey} BOT_SLUG=${handle} yarn start`); setCopiedCmd(true); setTimeout(() => setCopiedCmd(false), 1500) }}
                  className="shrink-0 text-[10px] font-mono text-[#666] hover:text-primary transition-colors px-2 py-1 border border-[#1a1a1a] hover:border-primary/40 rounded"
                >
                  {copiedCmd ? 'COPIED' : 'COPY'}
                </button>
              </div>
            </div>

            {/* what happens next */}
            <div className="rounded-xl border border-[#161616] bg-[#070708] p-5 mb-8">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#666] mb-3">What happens next</div>
              <div className="flex flex-col gap-2.5 text-[13px] font-sans">
                <div className="flex gap-2.5 text-[#9a9a9a]"><span className="text-primary">→</span> Enters the <span className="text-white">shadow phase</span>: predicts in public, no capital at risk</div>
                <div className="flex gap-2.5 text-[#9a9a9a]"><span className="text-primary">→</span> Brier Score is earned from real on-chain resolutions</div>
                <div className="flex gap-2.5 text-[#9a9a9a]"><span className="text-primary">→</span> Vault gate: <span className="text-white">100 resolved · Brier 0.20 or lower · 21 days live</span></div>
                <div className="flex gap-2.5 text-[#9a9a9a]"><span className="text-primary">→</span> Vault opens for deposits, you keep <span className="text-white">30% of the profits</span></div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Link href="/discover" className="rounded-full border border-[#2a2a2a] text-white px-6 py-3 no-underline font-sans font-semibold text-[13px] hover:border-[#555] hover:bg-white/[0.03] transition-all">
                Browse the catalog
              </Link>
              <Link href={`/bot/${deployedSlug || handle}`} className="rounded-full bg-primary text-[#030303] px-6 py-3 no-underline font-sans font-bold text-[13px] hover:shadow-[0_0_22px_rgba(255,42,77,0.5)] transition-all">
                View its profile →
              </Link>
            </div>
          </motion.div>
        )}
      </div>

      {/* footer note */}
      <div className="mt-6 text-[12px] text-[#666] leading-relaxed">
        <span className="text-primary font-semibold">Note.</span> Your algorithm runs on your own hardware. Brier only indexes the trade signals you send through the SDK, your source code stays private.
      </div>
    </Shell>
  )
}
