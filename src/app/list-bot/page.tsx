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
      if (!isConnected || !address) {
        setErrorMsg('Error: Wallet not connected. Please connect via Navbar.')
        return
      }
      setVerifying(true)
      try {
        // Step 1: Sign message to prove wallet ownership
        const message = `I am registering the prediction bot ${formData.name || '[NAME]'} to Brier. Timestamp: ${Date.now()}`
        await signMessageAsync({ message })
        
        // Step 2: Actually save the bot to the database
        const res = await fetch('/api/bots/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            market: formData.market,
            walletAddress: address,
          })
        })
        
        const result = await res.json()
        
        if (!res.ok) {
          setErrorMsg(result.error || 'Registration failed. Please try again.')
          return
        }
        
        setStep(3)
      } catch (err: any) {
        setErrorMsg(err?.shortMessage || err?.message || 'Signature rejected.')
      } finally {
        setVerifying(false)
      }
    } else {
      setStep(s => s + 1)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-mono), monospace', color: '#c5c8c6', padding: '2rem 1rem' }}>
      
      {/* HEADER */}
      <div style={{ maxWidth: 800, margin: '0 auto', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a1a', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', fontSize: 16, fontWeight: 'bold' }}>
          <span style={{ color: '#2563EB', fontFamily: 'var(--font-body), sans-serif' }}>Submit Algorithm</span>
        </div>
        <div style={{ fontSize: 12, color: '#555' }}>
          [<Link href="/" style={{ color: '#555', textDecoration: 'none' }}>Cancel</Link>]
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem', fontSize: 13, color: '#999', fontFamily: 'var(--font-body), sans-serif', lineHeight: 1.5 }}>
          Register your trading bot to the public Brier index so investors can track its performance. <br/>
          Submitted algorithms will be displayed on your Maker Profile.
        </div>
        
        {/* PROGRESS */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', fontSize: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ flex: 1, padding: '0.5rem', background: step >= i ? (step === i && i === 3 ? '#22c55e' : '#1a1a1a') : '#0a0a0a', border: '1px solid #333', color: step >= i ? (step === i && i === 3 ? '#000' : '#fff') : '#555', fontWeight: 'bold', textAlign: 'center' }}>
              STEP_{i}
            </div>
          ))}
        </div>

        <div style={{ border: '1px solid #1a1a1a', background: '#0a0a0a', padding: '2rem' }}>
          
          {step === 1 && (
            <div>
              <div style={{ color: '#2563EB', fontWeight: 'bold', marginBottom: '1.5rem' }}>&gt;&gt; CONFIGURE_BOT_METADATA</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#555', marginBottom: 4 }}>BOT_IDENTIFIER (Name):</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. ALPHA-STRIKE" style={{ width: '100%', background: '#000', border: '1px solid #333', color: '#fff', padding: '8px', fontFamily: 'inherit', outline: 'none' }} />
                  <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>This claims your unique <span style={{ color: '#2563EB' }}>@handle</span>. No duplicates allowed.</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#555', marginBottom: 4 }}>TARGET_MARKET:</label>
                  <select value={formData.market} onChange={e => setFormData({ ...formData, market: e.target.value })} style={{ width: '100%', background: '#000', border: '1px solid #333', color: '#fff', padding: '8px', fontFamily: 'inherit', outline: 'none' }}>
                    <option value="Polymarket">Polymarket (Polygon)</option>
                    <option value="Kalshi">Kalshi</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#555', marginBottom: 4 }}>STRATEGY_DESCRIPTION:</label>
                  <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Describe your logic..." style={{ width: '100%', height: 100, background: '#000', border: '1px solid #333', color: '#fff', padding: '8px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ color: '#2563EB', fontWeight: 'bold', marginBottom: '1.5rem' }}>&gt;&gt; VERIFY_WALLET_OWNERSHIP</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: '#888', marginBottom: '1.5rem' }}>
                You must sign a message with your wallet to prove ownership of the builder address. This will link your bot to your on-chain identity.
              </div>
              
              <div style={{ background: '#000', border: '1px dashed #333', padding: '1rem', marginBottom: '1.5rem', fontSize: 11, color: '#555' }}>
                Message to sign: <br/><br/>
                <span style={{ color: '#2563EB' }}>"I am registering the prediction bot {formData.name || '[NAME]'} to Brier. Timestamp: {Date.now()}"</span>
              </div>

              {verifying && (
                <div style={{ color: '#22c55e', fontSize: 12 }}>
                  &gt; Waiting for wallet signature... [Awaiting Provider]
                </div>
              )}
              {errorMsg && (
                <div style={{ color: '#ef4444', fontSize: 12, marginTop: '0.5rem', padding: '0.5rem', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.05)' }}>
                  {errorMsg}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: 48, marginBottom: '1rem' }}>🤖</div>
              <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: 18, marginBottom: '0.5rem' }}>REGISTRATION_SUCCESSFUL</div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: '2rem' }}>
                Your bot <span style={{ color: '#fff', fontWeight: 'bold' }}>@{formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}</span> has entered the 30-day Paper Trading phase. <br/>
                Proceed to the Developer Documentation to learn how to connect your script using the Brier SDK.
              </div>
              <Link href="/developers" style={{ display: 'inline-block', background: '#2563EB', color: '#000', textDecoration: 'none', padding: '10px 24px', fontWeight: 'bold', fontSize: 13 }}>
                [ VIEW SDK DOCUMENTATION ]
              </Link>
            </div>
          )}

          {/* NAV CONTROLS */}
          {step < 3 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid #1a1a1a', paddingTop: '1.5rem' }}>
              <button 
                onClick={handleNext} 
                disabled={verifying}
                style={{ background: '#2563EB', color: '#000', border: 'none', padding: '8px 20px', fontWeight: 'bold', fontFamily: 'inherit', cursor: verifying ? 'wait' : 'pointer', opacity: verifying ? 0.5 : 1 }}
              >
                {step === 1 ? 'PROCEED_TO_SIGNATURE >' : verifying ? 'VERIFYING...' : 'SIGN_MESSAGE >'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
