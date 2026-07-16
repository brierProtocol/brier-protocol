'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAccount, useSignMessage } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { motion } from 'framer-motion'
import useSWR from 'swr'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import MakerAvatar from '@/components/MakerAvatar'
import { botEye } from '@/lib/botIdentity'

const fetcher = (url: string) => fetch(url).then(r => r.json())

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
  const [deployedSlug, setDeployedSlug] = useState('')
  const [apiKeys, setApiKeys] = useState<{ apiKey: string, apiSecret: string } | null>(null)

  const { isConnected, address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { openConnectModal } = useConnectModal()

  const handle = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'your-bot'
  const shortAddr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''

  // Poll the bot's status to check for real-time connection (ping)
  const { data: botData } = useSWR(
    step === 3 && deployedSlug ? `/api/bots/${deployedSlug}` : null,
    fetcher,
    { refreshInterval: 2000 } // Check every 2 seconds
  )
  const isConnectedToPing = !!botData?.lastPingAt

  const register = async () => {
    setErrorMsg('')
    if (!address) { setErrorMsg('Wallet not connected.'); return }
    setVerifying(true)
    try {
      const timestamp = Date.now()
      const message = `I confirm this wallet trades for the Brier bot ${formData.name || '[NAME]'}. Timestamp: ${timestamp}`
      let signature;
      try {
        signature = await signMessageAsync({ message })
      } catch (signErr: any) {
        throw new Error(signErr?.shortMessage || signErr?.message || 'Signature rejected.')
      }
      
      const res = await fetch('/api/bots/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, description: formData.description, market: formData.market, categories: formData.categories, vaultCap: formData.vaultCap, walletAddress: address, signature, timestamp, message }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Registration failed. Please try again.')

      // V1 Active Ingestion: Generate API Keys for the bot
      // Key generation now requires a wallet SIGNATURE proving ownership.
      const newBotId = result.botId || result.id
      const keyTs = Date.now()
      // Must match owner-auth.ownershipMessage(botId, address, timestamp) exactly.
      const keyMsg = [
        'Brier API key management',
        `Bot: ${newBotId}`,
        `Wallet: ${address}`,
        `Time: ${keyTs}`,
      ].join('\n')

      let keySig: string
      try {
        keySig = await signMessageAsync({ message: keyMsg })
      } catch (signErr: any) {
        throw new Error(signErr?.shortMessage || signErr?.message || 'Signature for API keys rejected.')
      }

      const keysRes = await fetch(`/api/bots/${newBotId}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address,
          signature: keySig,
          timestamp: keyTs,
          label: 'default',
        }),
      })
      const keysData = await keysRes.json()
      if (!keysRes.ok) throw new Error(keysData.error || 'Failed to generate API Keys.')

      // Per-bot key system: `prefix` is the public id (sent as x-brier-key), `secret` shown once.
      if (keysData.secret) {
        setApiKeys({ apiKey: keysData.prefix, apiSecret: keysData.secret })
      }

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
              { n: '01', t: 'Name it', d: 'Just a name and a bio. Brier detects category and sizing on its own.' },
              { n: '02', t: 'Connect it', d: 'Connect the wallet your bot trades with. One signature proves it is yours.' },
              { n: '03', t: 'Open a vault', d: 'Brier scores it on Polymarket. 100 resolved, positive skill vs market, 21 days, then capital backs you.' },
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
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#666] border border-[#222] rounded px-2 py-1">Fixed</span>
              </div>
            </div>

            {/* Brier handles the scary decisions — no category or capacity to pick.
                Category is detected from the markets the bot actually bets on;
                vault capacity is computed from its proven track record. */}
            <div className="mb-7 rounded-xl border border-[#161616] bg-[#070708] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(255,42,77,0.7)]" />
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#8a8a8a]">Brier handles the rest</span>
              </div>
              <div className="flex flex-col gap-2.5 text-[13px] font-sans">
                <div className="flex gap-2.5 text-[#9a9a9a]"><span className="text-primary">→</span> <span><span className="text-white font-semibold">Category</span> is detected automatically from the markets your bot bets on. No guessing.</span></div>
                <div className="flex gap-2.5 text-[#9a9a9a]"><span className="text-primary">→</span> <span><span className="text-white font-semibold">Vault capacity</span> is computed from your proven track record and the liquidity of your markets, and grows as you prove more.</span></div>
              </div>
            </div>

            {/* signature art — generative from the name (do not change) */}
            <div className="mb-8 flex items-center gap-4 rounded-xl border border-[#161616] bg-[#070708] p-4">
              <div className="rounded-lg overflow-hidden border border-[#1a1a1a] shrink-0">
                <BotIrisAvatar {...botEye({ slug: handle, name: formData.name })} size={72} />
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
            <h2 className="m-0 font-sans font-extrabold text-[26px] tracking-tight">Connect the trading wallet<span className="text-primary">.</span></h2>
            <p className="mt-2 mb-7 text-[14px] text-[#8f8f8f] max-w-lg leading-relaxed">
              This is the wallet <strong className="text-white">{formData.name}</strong> trades with on Polymarket. One signature proves it is yours. Gas free, no funds move. From here Brier watches it on-chain and scores every call.
            </p>

            <div className="rounded-xl border border-[#1a1a1a] bg-[#060607] p-4 mb-4 flex items-center gap-3">
              <MakerAvatar address={address} size={36} />
              <div className="leading-tight">
                <div className="text-[11px] font-sans text-[#8f8f8f]">Bot trading wallet</div>
                <div className="font-mono text-[12px] text-white mt-0.5">{shortAddr}</div>
              </div>
              <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-[#00d4aa]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] shadow-[0_0_8px_#00d4aa]" />
                CONNECTED
              </span>
            </div>

            <div className="rounded-xl border border-[#161616] bg-[#070708] px-4 py-3 mb-6 text-[12px] text-[#8f8f8f] leading-relaxed">
              Make sure your bot places its Polymarket orders from this exact wallet. Its on-chain trades are the only thing Brier scores. Wrong wallet means no track record.
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
                {verifying ? 'Awaiting signature…' : 'Prove & deploy →'}
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
              Brier is now tracking your algorithm. Use your builder credentials to connect your bot and start submitting predictions via the SDK.
            </p>

            {/* Complete connection block */}
            {!isConnectedToPing ? (
              <>
                {apiKeys && (
                  <div className="rounded-xl border border-primary/40 bg-primary/[0.05] p-5 mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary">Connection — paste into your bot&apos;s .env</span>
                      <span className="text-primary font-bold text-[10px]">SECRET SHOWN ONCE. SAVE IT NOW.</span>
                    </div>
                    <pre className="font-mono text-[12px] text-[#00d4aa] bg-[#000] px-3 py-3 border border-[#222] rounded overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
{`BRIER_URL=${typeof window !== 'undefined' ? window.location.origin : 'https://brier.world'}
BRIER_BOT_SLUG=${deployedSlug || handle}
BRIER_API_KEY=${apiKeys.apiKey}
BRIER_API_SECRET=${apiKeys.apiSecret}`}
                    </pre>
                    <div className="mt-2 text-[11px] text-[#8f8f8f]">These four lines are all your bot needs to connect and be scored.</div>
                  </div>
                )}

                {/* SDK Snippet */}
                <div className="rounded-xl border border-[#161616] bg-[#070708] p-5 mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#666]">SDK — install &amp; predict</span>
                    <span className="flex items-center gap-2 font-mono text-[10px] text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      Listening for connection...
                    </span>
                  </div>
                  <pre className="font-mono text-[11px] text-[#a0a0a0] overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`npm install brier-sdk

import { BrierClient } from 'brier-sdk'

const brier = new BrierClient({
  apiKey: process.env.BRIER_API_KEY,
  apiSecret: process.env.BRIER_API_SECRET,
  baseUrl: process.env.BRIER_URL,
})

// Submit a prediction (HMAC-signed automatically)
await brier.predict({
  marketId: 'polymarket-1234',
  forecast: 0.85, // 85% probability of YES
})`}
                  </pre>
                </div>
              </>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[#00d4aa]/40 bg-[#00d4aa]/[0.05] p-8 mb-8 text-center flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at center, rgba(0,212,170,0.1) 0%, transparent 70%)' }} />
                <div className="w-16 h-16 rounded-full bg-[#00d4aa]/20 border border-[#00d4aa]/50 flex items-center justify-center mb-4 relative">
                  <div className="absolute inset-0 rounded-full animate-ping bg-[#00d4aa]/30" style={{ animationDuration: '3s' }} />
                  <svg className="w-8 h-8 text-[#00d4aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-sans font-bold text-white mb-2 relative">Connection Successful</h3>
                <p className="text-[14px] text-[#00d4aa] font-mono tracking-wide relative">
                  {formData.name} is online and transmitting.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#000] border border-[#00d4aa]/30 text-[11px] font-mono text-[#00d4aa]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] shadow-[0_0_8px_#00d4aa]" />
                  Awaiting first signal
                </div>
              </motion.div>
            )}

            {/* what happens next */}
            <div className="rounded-xl border border-[#161616] bg-[#070708] p-5 mb-8">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#666] mb-3">What happens next</div>
              <div className="flex flex-col gap-2.5 text-[13px] font-sans">
                <div className="flex gap-2.5 text-[#9a9a9a]"><span className="text-primary">→</span> Enters the <span className="text-white">shadow phase</span>: builds reputation, no outside capital at risk</div>
                <div className="flex gap-2.5 text-[#9a9a9a]"><span className="text-primary">→</span> The Skill Engine evaluates your commits against real resolutions</div>
                <div className="flex gap-2.5 text-[#9a9a9a]"><span className="text-primary">→</span> Vault gate: <span className="text-white">100 resolved · skill over market (LCB &gt; 0) · 21 days</span></div>
                <div className="flex gap-2.5 text-[#9a9a9a]"><span className="text-primary">→</span> Capital Layer unlocks, you keep <span className="text-white">30% of the profits</span></div>
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
