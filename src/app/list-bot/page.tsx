'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAccount, useSignMessage } from 'wagmi'

export default function ListBotPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({ name: '', repo: '', description: '', market: 'Polymarket' })
  const [verifying, setVerifying] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const { isConnected, address } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const handleNext = async () => {
    setErrorMsg('')
    if (step === 2) {
      
      // Fallback for address if Wagmi hydration is lagging
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
        // Step 1: Sign message to prove wallet ownership
        const message = `I am registering the prediction bot ${formData.name || '[NAME]'} to Brier. Timestamp: ${Date.now()}`
        
        try {
          if (isConnected && address) {
            await signMessageAsync({ message })
          } else {
            // Raw fallback signing
            const hexMsg = '0x' + message.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
            await (window as any).ethereum.request({ method: 'personal_sign', params: [hexMsg, finalAddress] })
          }
        } catch (signErr: any) {
          throw new Error(signErr?.shortMessage || signErr?.message || 'Signature rejected by user.')
        }
        
        // Step 2: Actually save the bot to the database
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
        
        if (!res.ok) {
          throw new Error(result.error || 'Registration failed. Please try again.')
        }
        
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

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-body), sans-serif', color: '#EFEFEF', padding: '3rem 1.5rem' }}>
      
      {/* HEADER */}
      <div style={{ maxWidth: 800, margin: '0 auto', marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-display), sans-serif', letterSpacing: '0.5px' }}>
          <span style={{ color: '#fff' }}>Submit Algorithm</span>
        </div>
        <div style={{ fontSize: '13px', color: '#666' }}>
          <Link href="/" style={{ color: '#888', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#fff'} onMouseOut={e => e.currentTarget.style.color = '#888'}>Cancel</Link>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: '3rem', fontSize: '14px', color: '#888', lineHeight: 1.6 }}>
          Register your algorithmic model to the public Brier index so investors can track its performance. <br/>
          Submitted algorithms will be displayed on your Maker Profile.
        </div>
        
        {/* PROGRESS */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', fontSize: '12px', fontFamily: 'var(--font-mono), monospace' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ 
              flex: 1, 
              padding: '0.75rem', 
              background: step >= i ? (step === i && i === 3 ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)') : 'transparent', 
              border: `1px solid ${step >= i ? (step === i && i === 3 ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)') : 'rgba(255,255,255,0.03)'}`, 
              color: step >= i ? (step === i && i === 3 ? '#4ade80' : '#fff') : '#555', 
              fontWeight: 600, 
              textAlign: 'center',
              borderRadius: '4px',
              transition: 'all 0.3s ease'
            }}>
              Step 0{i}
            </div>
          ))}
        </div>

        <div style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '2.5rem', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.5)' }}>
          
          {step === 1 && (
            <div>
              <div style={{ color: '#2563EB', fontWeight: 600, marginBottom: '2rem', fontFamily: 'var(--font-mono), monospace', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>&gt;&gt; CONFIGURE_BOT_METADATA</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: 8, fontFamily: 'var(--font-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bot Identifier</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. ALPHA-STRIKE" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', padding: '12px 16px', fontFamily: 'inherit', fontSize: '13px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }} onFocus={e => e.currentTarget.style.borderColor = 'rgba(37,99,235,0.5)'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'} />
                  <div style={{ fontSize: '11px', color: '#555', marginTop: 8 }}>This claims your unique <span style={{ color: '#60a5fa' }}>@handle</span>. No duplicates allowed.</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: 8, fontFamily: 'var(--font-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Market</label>
                  <select value={formData.market} onChange={e => setFormData({ ...formData, market: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', padding: '12px 16px', fontFamily: 'inherit', fontSize: '13px', outline: 'none', appearance: 'none' }}>
                    <option value="Polymarket">Polymarket (Polygon)</option>
                    <option value="Kalshi">Kalshi</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: 8, fontFamily: 'var(--font-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Strategy Thesis</label>
                  <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Describe your trading logic..." style={{ width: '100%', height: 120, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', padding: '12px 16px', fontFamily: 'inherit', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} onFocus={e => e.currentTarget.style.borderColor = 'rgba(37,99,235,0.5)'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ color: '#2563EB', fontWeight: 600, marginBottom: '2rem', fontFamily: 'var(--font-mono), monospace', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>&gt;&gt; VERIFY_WALLET_OWNERSHIP</div>
              <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#aaa', marginBottom: '2rem' }}>
                You must sign a message with your wallet to prove ownership of the builder address. This will link your bot to your on-chain identity.
              </div>
              
              <div style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '4px', padding: '1.5rem', marginBottom: '2rem', fontSize: '12px', color: '#888', fontFamily: 'var(--font-mono), monospace' }}>
                <div style={{ marginBottom: '0.5rem', color: '#666', textTransform: 'uppercase', fontSize: '10px' }}>Message to sign</div>
                <span style={{ color: '#60a5fa' }}>"I am registering the prediction bot {formData.name || '[NAME]'} to Brier. Timestamp: {Date.now()}"</span>
              </div>

              {verifying && (
                <div style={{ color: '#4ade80', fontSize: '13px', fontFamily: 'var(--font-mono), monospace' }}>
                  &gt; Waiting for wallet signature... [Awaiting Provider]
                </div>
              )}
              {errorMsg && (
                <div style={{ color: '#f87171', fontSize: '13px', marginTop: '1rem', padding: '1rem', borderRadius: '4px', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.05)' }}>
                  {errorMsg}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🤖</div>
              <div style={{ color: '#4ade80', fontWeight: 700, fontSize: '1.25rem', marginBottom: '1rem', fontFamily: 'var(--font-display), sans-serif', letterSpacing: '0.5px' }}>REGISTRATION SUCCESSFUL</div>
              <div style={{ fontSize: '14px', color: '#888', marginBottom: '2.5rem', lineHeight: 1.6 }}>
                Your bot <span style={{ color: '#fff', fontWeight: 600 }}>@{formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}</span> has entered the 30-day Paper Trading phase. <br/>
                Proceed to the Developer Documentation to learn how to connect your script using the Brier SDK.
              </div>
              <Link href="/developers" style={{ display: 'inline-block', background: '#2563EB', color: '#fff', borderRadius: '4px', textDecoration: 'none', padding: '12px 28px', fontWeight: 600, fontSize: '13px', boxShadow: '0 4px 14px 0 rgba(37,99,235,0.39)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#1d4ed8'} onMouseOut={e => e.currentTarget.style.background = '#2563EB'}>
                View SDK Documentation
              </Link>
            </div>
          )}

          {/* NAV CONTROLS */}
          {step < 3 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '2rem' }}>
              <button 
                onClick={handleNext} 
                disabled={verifying}
                style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: '4px', padding: '12px 28px', fontWeight: 600, fontFamily: 'inherit', fontSize: '13px', cursor: verifying ? 'wait' : 'pointer', opacity: verifying ? 0.6 : 1, transition: 'background 0.2s', boxShadow: '0 4px 14px 0 rgba(37,99,235,0.39)' }}
                onMouseOver={e => { if (!verifying) e.currentTarget.style.background = '#1d4ed8' }}
                onMouseOut={e => { if (!verifying) e.currentTarget.style.background = '#2563EB' }}
              >
                {step === 1 ? 'Proceed to Signature →' : verifying ? 'Verifying...' : 'Sign Message →'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
