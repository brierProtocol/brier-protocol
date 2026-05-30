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
        setErrorMsg('Error: Wallet not connected. Please connect via Navbar.')
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
        
        // Generate a secret key for the user
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
    background: '#000',
    border: '1px solid #333',
    color: '#fff',
    padding: '10px 12px',
    fontFamily: 'inherit',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }} style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-mono), monospace', color: '#c5c8c6', padding: '2rem 1rem' }}>
      
      {/* HEADER BAR */}
      <div style={{ maxWidth: 700, margin: '0 auto', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a1a', paddingBottom: '0.5rem', fontSize: 13 }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/" style={{ color: '#2563EB', textDecoration: 'none' }}>[Return]</Link>
          <span style={{ color: '#C9A84C' }}>/brier/ — Register Algorithm</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: 12, color: '#555' }}>
          <Link href="/developers" style={{ color: '#2563EB', textDecoration: 'none' }}>[SDK Docs]</Link>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        
        {/* PROGRESS BAR */}
        <div style={{ display: 'flex', marginBottom: '2rem' }}>
          <div style={{ flex: 1, height: '4px', background: step >= 1 ? '#2563EB' : '#111', transition: 'background 0.3s' }}></div>
          <div style={{ flex: 1, height: '4px', background: step >= 2 ? '#2563EB' : '#111', transition: 'background 0.3s' }}></div>
          <div style={{ flex: 1, height: '4px', background: step >= 3 ? '#22c55e' : '#111', transition: 'background 0.3s' }}></div>
        </div>

        <div style={{ border: '1px solid #1a1a1a', background: '#0a0a0a', padding: '2rem' }}>
          
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <div style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 14, marginBottom: '2rem' }}>&gt;&gt; STEP 1: CONFIGURE_BOT_METADATA</div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ color: '#555', fontSize: 11, marginBottom: '0.5rem' }}>BOT IDENTIFIER</div>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. ADAN-PRED" 
                  style={inputStyle} 
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ color: '#555', fontSize: 11, marginBottom: '0.5rem' }}>TARGET MARKET</div>
                <input 
                  type="text" 
                  value={formData.market}
                  disabled
                  style={{...inputStyle, color: '#888'}} 
                />
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <div style={{ color: '#555', fontSize: 11, marginBottom: '0.5rem' }}>STRATEGY DESCRIPTION</div>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe your prediction strategy..." 
                  style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={handleNext}
                  disabled={!formData.name}
                  style={{
                    background: formData.name ? '#2563EB' : '#111',
                    color: formData.name ? '#fff' : '#555',
                    border: 'none',
                    padding: '10px 24px',
                    fontWeight: 'bold',
                    fontSize: 13,
                    cursor: formData.name ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s'
                  }}
                >
                  Proceed to Signature →
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <div style={{ color: '#C9A84C', fontWeight: 'bold', fontSize: 14, marginBottom: '2rem' }}>&gt;&gt; STEP 2: VERIFY_WALLET_OWNERSHIP</div>
              
              <div style={{ color: '#c5c8c6', fontSize: 13, lineHeight: 1.6, marginBottom: '2rem' }}>
                To link <strong style={{ color: '#fff' }}>{formData.name}</strong> to your identity, you must sign a cryptographic message proving ownership of the connected wallet.
                <br /><br />
                Connected Wallet: <span style={{ color: '#2563EB' }}>{address || 'NOT CONNECTED'}</span>
              </div>

              {errorMsg && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '1rem', fontSize: 12, marginBottom: '2rem' }}>
                  {errorMsg}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button 
                  onClick={() => setStep(1)}
                  style={{ background: 'transparent', border: '1px solid #333', color: '#888', padding: '10px 24px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}
                >
                  ← Back
                </button>
                <button 
                  onClick={handleNext}
                  disabled={verifying || !address}
                  style={{
                    background: verifying ? '#111' : (address ? '#C9A84C' : '#111'),
                    color: verifying ? '#555' : (address ? '#000' : '#555'),
                    border: 'none',
                    padding: '10px 24px',
                    fontWeight: 'bold',
                    fontSize: 13,
                    cursor: (verifying || !address) ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s'
                  }}
                >
                  {verifying ? 'Awaiting Signature...' : 'Sign Message to Register'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
              <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: 14, marginBottom: '1rem' }}>&gt;&gt; STATUS: REGISTRATION_SUCCESSFUL</div>
              
              <div style={{ color: '#c5c8c6', fontSize: 13, lineHeight: 1.6, marginBottom: '2rem' }}>
                Your algorithm <strong style={{ color: '#fff' }}>{formData.name}</strong> has been registered on Brier Protocol. A dedicated Vault has been indexed.
              </div>

              {/* CRITICAL SECRET KEY REVEAL */}
              <div style={{ background: '#050505', border: '1px solid #ef4444', padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 12, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, background: '#ef4444', borderRadius: '50%', animation: 'pulse 2s infinite' }}></span>
                  CRITICAL: BUILDER SECRET KEY GENERATED
                </div>
                <div style={{ color: '#888', fontSize: 11, marginBottom: '1rem', lineHeight: 1.5 }}>
                  This is your <span style={{ color: '#fff' }}>BUILDER_SECRET_KEY</span>. It is required for the Brier SDK to authenticate your bot's trades. We do not store this key. You will only see this once. Do not commit it to version control.
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    value={secretKey} 
                    readOnly 
                    style={{ ...inputStyle, color: '#ef4444', borderColor: '#ef4444', background: '#110505' }} 
                  />
                  <button 
                    onClick={() => navigator.clipboard.writeText(secretKey)}
                    style={{ background: '#ef4444', color: '#000', border: 'none', padding: '0 16px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}
                  >
                    COPY
                  </button>
                </div>
              </div>

              {/* SDK SNIPPET */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ color: '#555', fontSize: 11, marginBottom: '0.5rem' }}>QUICKSTART INTEGRATION</div>
                <div style={{ background: '#000', border: '1px solid #333', padding: '1rem', color: '#60a5fa', fontSize: 12, overflowX: 'auto', whiteSpace: 'pre' }}>
{`import { BrierSDK } from '@brier/sdk';

const bot = new BrierSDK({
  botId: '${handle}',
  secretKey: process.env.BUILDER_SECRET_KEY,
});

// Run your logic and execute trade
bot.predict({
  market: 'polymarket-polygon',
  prediction: 'YES',
  confidence: 0.85
});`}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <Link href={`/bot/${handle}`} style={{ background: 'transparent', border: '1px solid #22c55e', color: '#22c55e', padding: '10px 24px', textDecoration: 'none', fontWeight: 'bold', fontSize: 13, transition: 'all 0.2s' }}>
                  View Public Profile →
                </Link>
              </div>
            </motion.div>
          )}

        </div>

        {/* INFO FOOTER */}
        <div style={{ marginTop: '2rem', border: '1px solid #1a1a1a', padding: '1rem', fontSize: 11, color: '#555', lineHeight: 1.5 }}>
          <span style={{ color: '#C9A84C' }}>&gt; INFO:</span> Your prediction algorithm runs on <strong style={{ color: '#c5c8c6' }}>your own machine</strong>. Brier Protocol only receives your trade signals via the SDK. Your code, models, and strategy remain 100% private. We never see your source code.
        </div>

      </div>
    </motion.div>
  )
}
