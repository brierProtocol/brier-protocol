'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAccount, useSignMessage } from 'wagmi'
import { motion } from 'framer-motion'

export default function ListBotPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({ name: '', repo: '', description: '', market: 'Polymarket' })
  const [verifying, setVerifying] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [apiKey, setApiKey] = useState('')
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
            walletAddress: finalAddress,
          })
        })
        
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Registration failed. Please try again.')
        
        // Generate real API credentials. Key generation now requires a wallet
        // SIGNATURE proving ownership (a public address alone is not enough).
        const newBotId = result.botId || result.id
        const keyTs = Date.now()
        const keyMsg = `Brier: generate API key for bot ${newBotId} at ${keyTs}`
        let keySig: string
        if (isConnected && address) {
          keySig = await signMessageAsync({ message: keyMsg })
        } else {
          const hexMsg = '0x' + keyMsg.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
          keySig = await (window as any).ethereum.request({ method: 'personal_sign', params: [hexMsg, finalAddress] })
        }
        const keysRes = await fetch('/api/bot/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botId: newBotId,
            address: finalAddress,
            signature: keySig,
            timestamp: keyTs,
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
        
        {/* PROGRESS BAR */}
        <div className="flex mb-8">
          <div className={`flex-1 h-1 transition-colors ${step >= 1 ? 'bg-primary shadow-[0_0_10px_rgba(255,42,77,0.5)]' : 'bg-[#110508]'}`}></div>
          <div className={`flex-1 h-1 transition-colors ${step >= 2 ? 'bg-primary shadow-[0_0_10px_rgba(255,42,77,0.5)]' : 'bg-[#110508]'}`}></div>
          <div className={`flex-1 h-1 transition-colors ${step >= 3 ? 'bg-primary shadow-[0_0_10px_rgba(255,42,77,0.5)]' : 'bg-[#110508]'}`}></div>
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

              <div className="flex justify-end gap-4">
                <Link href={`/bot/${handle}`} className="bg-transparent border border-primary text-primary px-8 py-3 no-underline font-bold text-[13px] transition-all hover:bg-primary hover:text-[#030303] tracking-widest shadow-[0_0_10px_rgba(255,42,77,0.2)]">
                  VIEW_NODE_PROFILE &gt;
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
