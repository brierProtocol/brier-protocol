'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAccount, useSignMessage } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { motion } from 'framer-motion'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import MakerAvatar from '@/components/MakerAvatar'
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
  const [formData, setFormData] = useState({ name: '', description: '', market: 'Polymarket', categories: [] as string[], vaultCap: '' })
  const [verifying, setVerifying] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [secretKey, setSecretKey] = useState('')

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
      const message = `I confirm this wallet trades for the Brier bot ${formData.name || '[NAME]'}. Timestamp: ${Date.now()}`
      try {
        const message = `I am registering the prediction bot ${formData.name || '[NAME]'} to Brier. Timestamp: ${Date.now()}`
        try {
          if (isConnected && address) {
            await signMessageAsync({ message })
          } else {
            const hexMsg = '0x' + message.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
            await (window as any).ethereum.request({ method: 'personal_sign', params: [hexMsg, finalAddress] })
          }
        } catch (signErr: any) {
          throw new Error(signErr?.shortMessage || signErr?.message || 'Signature rejected by user.')
        }
        
        const res = await fetch('/api/bots/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            market: formData.market,
            walletAddress: finalAddress,
          })
        })
        
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Registration failed. Please try again.')
        
        // Generate real API credentials
        const keysRes = await fetch('/api/bot/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botId: result.botId || result.id, // Depending on what register returns
            walletAddress: finalAddress
          })
        })
        
        const keysResult = await keysRes.json()
        if (!keysRes.ok) throw new Error(keysResult.error || 'Failed to generate API Keys.')
        
        setApiKey(keysResult.apiKey)
        setSecretKey(keysResult.apiSecret)
        
        setStep(3)
      } catch (err: any) {
        setErrorMsg(err?.message || 'An error occurred.')
      } finally {
        setVerifying(false)
      }
      const res = await fetch('/api/bots/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, description: formData.description, market: formData.market, categories: formData.categories, vaultCap: formData.vaultCap, walletAddress: address }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Registration failed. Please try again.')

      setDeployedSlug(result.slug)
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

          {/* plain-language model, so nobody gets lost at "connect" */}
          <div className="mt-8 rounded-2xl border border-[#161616] bg-[#070708] p-5">
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-[#777] mb-4">How it works</div>
            <div className="flex flex-col sm:flex-row items-stretch gap-4 sm:gap-3">
              {[
                { n: '1', t: 'Your bot trades on Polymarket', d: 'from a wallet it already controls' },
                { n: '2', t: 'Connect that same wallet here', d: 'one signature proves it is yours' },
                { n: '3', t: 'Brier scores it on-chain', d: 'no keys, no SDK, nothing to run' },
              ].map((s) => (
                <div key={s.n} className="flex-1 flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-primary/[0.12] border border-primary/40 text-primary font-mono text-[11px] flex items-center justify-center">{s.n}</span>
                  <div>
                    <div className="text-[13px] font-sans font-semibold text-white leading-snug">{s.t}</div>
                    <div className="text-[12px] text-[#777] mt-0.5 leading-snug">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* connect panel */}
          <div className="mt-10 rounded-2xl border border-[#1a1a1a] bg-gradient-to-b from-[#0b0b0c] to-[#080809] p-8 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-28 pointer-events-none" style={{ background: 'radial-gradient(60% 100% at 50% 0%, rgba(255,42,77,0.10), transparent 70%)' }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(255,42,77,0.8)]" />
                <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-primary">Step 1 — Connect</span>
              </div>
              <h2 className="m-0 font-sans font-bold text-[22px] tracking-tight">Connect your bot&apos;s trading wallet</h2>
              <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[#8f8f8f]">
                Connect the wallet your bot trades with on Polymarket. It is your builder identity, the source of your track record, and how your share of the profits flows back to you. Non custodial, always.
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
              { n: '01', t: 'Name it', d: 'Name, bio and market categories. Its signature art is born from the name.' },
              { n: '02', t: 'Connect it', d: 'Connect the wallet your bot trades with. One signature proves it is yours.' },
              { n: '03', t: 'Open a vault', d: 'Brier watches it on Polymarket. 100 resolved, Brier 0.20, 21 days, then capital backs you.' },
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
    { n: 2, label: 'Prove' },
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
                <div className="text-[#c5c8c6] text-[11px] mb-4 leading-relaxed">
                  This is your <span className="text-white font-bold">BUILDER_SECRET_KEY</span>. Required for SDK authentication. We do not store this key. You will only see this once. Do not commit to version control.
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="text-muted text-[10px] mb-1">API_KEY (Public)</div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={apiKey} 
                        readOnly 
                        className="flex-1 bg-[#0a0204] border border-[#331015] text-[#888] px-4 py-2 font-mono text-[12px] outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-muted text-[10px] mb-1">API_SECRET (Private)</div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={secretKey} 
                        readOnly 
                        className="flex-1 bg-[#1a0505] border border-primary text-primary px-4 py-3 font-mono text-[13px] outline-none"
                      />
                      <button 
                        onClick={() => navigator.clipboard.writeText(secretKey)}
                        className="bg-primary text-[#030303] border-none px-6 font-bold cursor-pointer font-mono text-[12px] hover:bg-[#ff1438] transition-colors"
                      >
                        COPY
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

              {/* SDK SNIPPET */}
              <div className="mb-8">
                <div className="text-muted text-[11px] mb-2 tracking-widest">SDK_INTEGRATION_SNIPPET</div>
                <div className="bg-[#030303] border border-[#331015] p-4 text-primary text-[12px] overflow-x-auto whitespace-pre font-mono">
{`import { BrierSDK } from '@brier/sdk';

const bot = new BrierClient({
  apiKey: '${apiKey || 'br_123...'}',
  apiSecret: process.env.BRIER_API_SECRET,
});

// Run quantitative logic
bot.predict({
  market: 'polymarket-polygon',
  prediction: 'YES',
  confidence: 0.85
});`}
                </div>
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
        <span className="text-primary font-semibold">Note.</span> Your algorithm runs on your own hardware. Brier only reads this wallet&apos;s public Polymarket activity on-chain to score it, your source code stays private.
      </div>
    </Shell>
  )
}
