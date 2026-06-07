'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAccount, useSignMessage } from 'wagmi'
import { motion } from 'framer-motion'
import BotIrisAvatar from '@/components/BotIrisAvatar'
import { EYE_PALETTE, EYE_SHAPES } from '@/lib/botIdentity'
import type { EyeShapeId } from '@/lib/botIdentity'

export default function ListBotPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({ name: '', repo: '', description: '', market: 'Polymarket', color: EYE_PALETTE[0] as string, eyeShape: 'round' as EyeShapeId })
  const [verifying, setVerifying] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [secretKey, setSecretKey] = useState('')

  const { isConnected, address } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const handleNext = async () => {
    setErrorMsg('')
    if (step === 2) {
      let finalAddress = address
      if (!finalAddress && typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' })
          if (accounts && accounts.length > 0) finalAddress = accounts[0]
        } catch (e) {}
      }

      if (!finalAddress) {
        setErrorMsg('SYS_ERR: Wallet not connected. Initialization aborted.')
        return
      }

      setVerifying(true)
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
            color: formData.color,
            eyeShape: formData.eyeShape,
            walletAddress: finalAddress,
          })
        })
        
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Registration failed. Please try again.')
        
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
    } else {
      setStep(s => s + 1)
    }
  }

  const handle = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'your-bot'

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#050505',
    border: '1px solid #331015',
    color: '#ff2a4d',
    padding: '12px 16px',
    fontFamily: 'inherit',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s'
  }

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="min-h-screen bg-[#030303] text-primary font-mono p-8">
      
      {/* HEADER BAR */}
      <div className="max-w-[700px] mx-auto mb-6 flex justify-between items-center border-b border-border pb-2 text-[13px]">
        <div className="flex gap-3 items-center">
          <Link href="/" className="text-muted hover:text-primary transition-colors no-underline">[&lt; RETURN]</Link>
          <span className="text-primary font-bold">/brier/ — DEPLOY_NODE</span>
        </div>
        <div className="flex gap-4 text-xs text-muted">
          <Link href="/developers" className="hover:text-primary transition-colors no-underline">[SDK_DOCS]</Link>
        </div>
      </div>

      <div className="max-w-[700px] mx-auto">
        
        {/* STEPPER */}
        <div className="flex items-center mb-8 select-none">
          {[
            { n: 1, label: 'METADATA' },
            { n: 2, label: 'SIGN' },
            { n: 3, label: 'SECRET' },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 ${step === s.n ? 'stepper-step active' : step > s.n ? 'stepper-step done' : 'stepper-step'}`}>
                <span className={`w-5 h-5 border flex items-center justify-center text-[10px] font-bold ${step === s.n ? 'border-primary text-primary bg-primary/10' : step > s.n ? 'border-[#C8FF00]/50 text-[#C8FF00]' : 'border-[#222] text-[#333]'}`}>
                  {step > s.n ? '✓' : s.n}
                </span>
                <span className="hidden sm:inline text-[10px] tracking-widest">{s.label}</span>
              </div>
              {i < 2 && (
                <div className={`flex-1 h-px mx-2 ${step > s.n ? 'bg-[#C8FF00]/20' : 'bg-[#1a1a1a]'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="border border-border bg-[#080405] p-8 shadow-[0_0_20px_rgba(255,42,77,0.05)] relative">
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary" />

          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <div className="text-primary font-bold text-sm mb-8 tracking-widest">&gt;&gt; STEP 1: CONFIGURE_NODE_METADATA</div>
              
              <div className="mb-6">
                <div className="text-muted text-[11px] mb-2 tracking-widest">NODE_IDENTIFIER</div>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. ADAN-PRED" 
                  style={inputStyle}
                  className="focus:border-primary focus:shadow-[0_0_10px_rgba(255,42,77,0.15)] placeholder-[#331015]"
                />
              </div>

              <div className="mb-6">
                <div className="text-muted text-[11px] mb-2 tracking-widest">TARGET_MARKET_MAKER</div>
                <input 
                  type="text" 
                  value={formData.market}
                  disabled
                  style={{...inputStyle, color: '#666', background: '#030303'}} 
                />
              </div>

              <div className="mb-8">
                <div className="text-muted text-[11px] mb-2 tracking-widest">STRATEGY_DESCRIPTION</div>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Define protocol strategy..."
                  style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
                  className="focus:border-primary focus:shadow-[0_0_10px_rgba(255,42,77,0.15)] placeholder-[#331015]"
                />
              </div>

              {/* EYE SIGNATURE — chosen once at creation */}
              <div className="mb-8">
                <div className="text-muted text-[11px] mb-1 tracking-widest">EYE_SIGNATURE</div>
                <div className="text-[10px] text-[#555] mb-4 font-mono">Pick your bot&apos;s shape &amp; color. This is permanent — chosen once.</div>

                <div className="flex items-start gap-6 flex-wrap">
                  {/* Live preview */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="rounded-full" style={{ boxShadow: `0 0 28px ${formData.color}55` }}>
                      <BotIrisAvatar avatarId={(formData.name || 'preview').toLowerCase()} accentColor={formData.color} shape={formData.eyeShape} size={96} />
                    </div>
                    <span className="text-[9px] font-mono text-[#555] tracking-widest">PREVIEW</span>
                  </div>

                  <div className="flex-1 min-w-[260px] flex flex-col gap-4">
                    {/* Shapes */}
                    <div>
                      <div className="text-[9px] text-[#555] font-mono tracking-widest mb-2">SHAPE</div>
                      <div className="grid grid-cols-3 gap-2">
                        {EYE_SHAPES.map((sh) => {
                          const active = formData.eyeShape === sh.id
                          return (
                            <button
                              key={sh.id}
                              type="button"
                              onClick={() => setFormData({ ...formData, eyeShape: sh.id })}
                              className="flex flex-col items-center gap-1.5 py-2 border transition-all"
                              style={{
                                borderColor: active ? formData.color : '#1a1a1a',
                                background: active ? `${formData.color}11` : 'transparent',
                              }}
                            >
                              <BotIrisAvatar avatarId={sh.id} accentColor={formData.color} shape={sh.id} size={34} />
                              <span className="text-[8px] font-mono tracking-widest" style={{ color: active ? formData.color : '#555' }}>{sh.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Colors */}
                    <div>
                      <div className="text-[9px] text-[#555] font-mono tracking-widest mb-2">COLOR</div>
                      <div className="grid grid-cols-9 gap-2">
                        {EYE_PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setFormData({ ...formData, color: c })}
                            aria-label={`Select ${c}`}
                            className="w-7 h-7 rounded-full transition-all"
                            style={{
                              background: c,
                              outline: formData.color === c ? `2px solid #fff` : '2px solid transparent',
                              outlineOffset: '2px',
                              transform: formData.color === c ? 'scale(1.15)' : 'scale(1)',
                              boxShadow: formData.color === c ? `0 0 12px ${c}` : 'none',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={handleNext}
                  disabled={!formData.name}
                  className={`font-mono font-bold text-[13px] px-8 py-3 tracking-widest transition-all ${
                    formData.name 
                      ? 'bg-primary text-[#030303] shadow-[0_0_15px_rgba(255,42,77,0.4)] hover:bg-[#ff1438] cursor-pointer' 
                      : 'bg-[#110508] text-muted cursor-not-allowed border border-[#331015]'
                  }`}
                >
                  PROCEED_TO_SIG &gt;
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <div className="text-primary font-bold text-sm mb-8 tracking-widest">&gt;&gt; STEP 2: VERIFY_WALLET_OWNERSHIP</div>
              
              <div className="text-[#c5c8c6] text-[13px] leading-relaxed mb-8 border-l border-primary pl-4 bg-[#110508] py-4 pr-4">
                To bind <strong className="text-primary">{formData.name}</strong> to your identity, you must execute a cryptographic signature proving ownership of the connected terminal.
                <br /><br />
                Connected Terminal: <span className="text-white font-bold">{address || 'NOT CONNECTED'}</span>
              </div>

              {errorMsg && (
                <div className="bg-[#1a0505] border border-primary text-primary p-4 text-[12px] mb-8 font-bold tracking-widest shadow-[inset_0_0_10px_rgba(255,42,77,0.2)] animate-pulse">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setStep(1)}
                  className="bg-transparent border border-border text-muted px-6 py-3 cursor-pointer font-mono text-[13px] hover:text-primary transition-colors tracking-widest"
                >
                  &lt; ABORT
                </button>
                <button 
                  onClick={handleNext}
                  disabled={verifying || !address}
                  className={`font-mono font-bold text-[13px] px-8 py-3 tracking-widest transition-all ${
                    (verifying || !address)
                      ? 'bg-[#110508] text-muted cursor-not-allowed border border-[#331015]'
                      : 'bg-primary text-[#030303] shadow-[0_0_15px_rgba(255,42,77,0.4)] hover:bg-[#ff1438] cursor-pointer'
                  }`}
                >
                  {verifying ? 'AWAITING_SIGNATURE...' : 'SIGN_PAYLOAD'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
              <div className="text-primary font-bold text-sm mb-4 tracking-widest shadow-primary drop-shadow-[0_0_8px_rgba(255,42,77,0.5)]">
                &gt;&gt; SYS_STATUS: DEPLOYMENT_SUCCESSFUL
              </div>
              
              <div className="text-[#c5c8c6] text-[13px] leading-relaxed mb-8">
                Node <strong className="text-white">{formData.name}</strong> has been embedded into Brier Protocol. A dedicated Vault has been initialized on-chain.
              </div>

              {/* CRITICAL SECRET KEY REVEAL */}
              <div className="bg-[#0a0204] border border-primary p-6 mb-8 relative shadow-[0_0_20px_rgba(255,42,77,0.15)]">
                <div className="text-primary font-bold text-[12px] mb-3 flex items-center gap-2 tracking-widest">
                  <span className="inline-block w-2 h-2 bg-primary animate-pulse shadow-[0_0_5px_rgba(255,42,77,1)]"></span>
                  CRITICAL: BUILDER_SECRET_KEY GENERATED
                </div>
                <div className="text-[#c5c8c6] text-[11px] mb-4 leading-relaxed">
                  This is your <span className="text-white font-bold">BUILDER_SECRET_KEY</span>. Required for SDK authentication. We do not store this key. You will only see this once. Do not commit to version control.
                </div>
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

              {/* INSTALL COMMAND */}
              <div className="mb-6">
                <div className="text-muted text-[11px] mb-2 tracking-widest">QUICK_INSTALL — run this in your terminal:</div>
                <div className="bg-[#030303] border border-[#1a1a1a] p-4 flex items-center gap-3 group">
                  <span className="text-[#333] font-mono text-xs select-none">$</span>
                  <code className="flex-1 text-[#C8FF00] font-mono text-[12px] select-all">
                    {`BUILDER_SECRET_KEY=${secretKey} BOT_SLUG=${handle} yarn start`}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(`BUILDER_SECRET_KEY=${secretKey} BOT_SLUG=${handle} yarn start`)}
                    className="shrink-0 text-[10px] font-mono text-[#444] hover:text-primary transition-colors px-2 py-1 border border-[#1a1a1a] hover:border-primary/40"
                  >
                    [COPY]
                  </button>
                </div>
              </div>

              {/* WHAT HAPPENS NEXT */}
              <div className="mb-8 border border-[#1a1a1a] p-4 bg-[#060606]">
                <div className="text-[#444] text-[10px] font-mono tracking-widest mb-3">WHAT_HAPPENS_NEXT</div>
                <div className="flex flex-col gap-2 text-[11px] font-mono">
                  <div className="flex gap-2 text-[#555]"><span className="text-[#333]">&gt;</span> Bot enters <span className="text-white mx-1">7-day shadow phase</span> — predictions tracked, no capital at risk</div>
                  <div className="flex gap-2 text-[#555]"><span className="text-[#333]">&gt;</span> Brier Score calculated from on-chain market resolutions</div>
                  <div className="flex gap-2 text-[#555]"><span className="text-[#333]">&gt;</span> Tier-1 eligibility: Brier ≤ 0.25, Sharpe ≥ 1.5, Win Rate ≥ 54%</div>
                  <div className="flex gap-2 text-[#555]"><span className="text-[#333]">&gt;</span> Vault opens for <span className="text-primary mx-1">investor deposits</span> → you earn 30% of profits</div>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Link href={`/bot/${handle}`} className="bg-transparent border border-primary text-primary px-8 py-3 no-underline font-mono font-bold text-[13px] transition-all hover:bg-primary hover:text-[#030303] tracking-widest shadow-[0_0_10px_rgba(255,42,77,0.2)]">
                  VIEW_NODE_PROFILE →
                </Link>
              </div>
            </motion.div>
          )}

        </div>

        {/* INFO FOOTER */}
        <div className="mt-8 border border-border p-4 text-[11px] text-muted leading-relaxed">
          <span className="text-primary font-bold">&gt; SYS_NOTE:</span> Your algorithm runs on <strong className="text-white">your isolated hardware</strong>. Brier Protocol only indexes your trade signals via the SDK. Source code remains 100% encrypted and private.
        </div>

      </div>
    </motion.div>
  )
}
