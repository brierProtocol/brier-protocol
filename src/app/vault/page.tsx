'use client'
import { redirect } from 'next/navigation'

import { useState } from 'react'
import { FEATURES } from '@/lib/features'
import Link from 'next/link'

export default function VaultPage() {
  const [amount, setAmount] = useState('')
  const [action, setAction] = useState<'deposit' | 'withdraw'>('deposit')
  const [toast, setToast] = useState('')

  const handleExecute = () => {
    if (!amount) return
    setToast(`> EXECUTING ${action.toUpperCase()} OF ${amount} USDC...`)
    setTimeout(() => setToast(`> ${action.toUpperCase()} SUCCESSFUL. TX: 0x8b...1a`), 1500)
    setTimeout(() => { setToast(''); setAmount('') }, 4000)
  }

  // v1: capital layer disabled — show reputation-only message
  if (!FEATURES.CAPITAL_LAYER) {
    return (
      <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-body), sans-serif', color: '#EFEFEF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 560, textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h1 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Vaults are not live yet
          </h1>
          <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '2rem' }}>
            Brier v1 is a <strong style={{ color: '#fff' }}>reputation layer</strong>. Builders prove their forecasting skill 
            on-chain through their Brier Score before any capital is involved. Vaults will open in a future phase, 
            after contracts are audited and reputation data validates the design.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/discover" style={{ background: '#fff', color: '#050505', padding: '12px 28px', borderRadius: '6px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', transition: 'opacity 0.2s' }}>
              Explore Bots
            </Link>
            <Link href="/leaderboard" style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', padding: '12px 28px', borderRadius: '6px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', transition: 'opacity 0.2s' }}>
              Leaderboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-body), sans-serif', color: '#EFEFEF', padding: '3rem 1.5rem' }}>
      
      {/* HEADER */}
      <div style={{ maxWidth: 800, margin: '0 auto', marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-display), sans-serif', letterSpacing: '0.5px' }}>
          <span style={{ color: '#fff' }}>Contract Interaction <span style={{ color: '#60a5fa' }}>/vault/SIGMA-7</span></span>
        </div>
        <div style={{ fontSize: '13px', color: '#666' }}>
          <Link href="/dashboard" style={{ color: '#888', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#fff'} onMouseOut={e => e.currentTarget.style.color = '#888'}>Back to Terminal</Link>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        {/* CONTRACT INFO */}
        <div style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.5)' }}>
          <div style={{ color: '#2563EB', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem', marginBottom: '1.5rem', fontFamily: 'var(--font-mono), monospace', fontSize: '13px' }}>
            &gt;&gt; VAULT_STATE_READ
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '13px', fontFamily: 'var(--font-mono), monospace' }}>
            <div><span style={{ color: '#666', display: 'block', fontSize: '10px', textTransform: 'uppercase', marginBottom: 2 }}>Target Bot</span> <span style={{ color: '#60a5fa', fontWeight: 600, fontSize: '15px' }}>SIGMA-7</span></div>
            <div><span style={{ color: '#666', display: 'block', fontSize: '10px', textTransform: 'uppercase', marginBottom: 2 }}>Contract Addr</span> <span style={{ color: '#EFEFEF', fontSize: '15px' }}>0x42f...e981</span></div>
            <div><span style={{ color: '#666', display: 'block', fontSize: '10px', textTransform: 'uppercase', marginBottom: 2 }}>Network</span> <span style={{ color: '#c084fc', fontSize: '15px', fontWeight: 600 }}>POLYGON</span></div>
            <div><span style={{ color: '#666', display: 'block', fontSize: '10px', textTransform: 'uppercase', marginBottom: 2 }}>Global TVL</span> <span style={{ color: '#EFEFEF', fontSize: '15px' }}>$1,400,000 USDC</span></div>
            <div><span style={{ color: '#666', display: 'block', fontSize: '10px', textTransform: 'uppercase', marginBottom: 2 }}>Your Balance</span> <span style={{ color: '#4ade80', fontWeight: 600, fontSize: '15px' }}>$50,000 USDC</span></div>
            <div><span style={{ color: '#666', display: 'block', fontSize: '10px', textTransform: 'uppercase', marginBottom: 2 }}>Unrealized PNL</span> <span style={{ color: '#4ade80', fontSize: '15px' }}>+$7,440 (+14.9%)</span></div>
            <div><span style={{ color: '#666', display: 'block', fontSize: '10px', textTransform: 'uppercase', marginBottom: 2 }}>Performance Fee</span> <span style={{ color: '#EFEFEF', fontSize: '15px' }}>10%</span></div>
            <div><span style={{ color: '#666', display: 'block', fontSize: '10px', textTransform: 'uppercase', marginBottom: 2 }}>Lockup Period</span> <span style={{ color: '#EFEFEF', fontSize: '15px' }}>NONE</span></div>
          </div>
        </div>

        {/* INTERACTION FORM */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', padding: '2rem' }}>
          <div style={{ color: '#C9A84C', fontWeight: 600, marginBottom: '2rem', fontFamily: 'var(--font-mono), monospace', fontSize: '13px' }}>
            &gt;&gt; VAULT_WRITE_OPERATION
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button 
              onClick={() => setAction('deposit')}
              style={{ flex: 1, background: action === 'deposit' ? 'rgba(37,99,235,0.1)' : 'transparent', color: action === 'deposit' ? '#60a5fa' : '#666', border: `1px solid ${action === 'deposit' ? 'rgba(37,99,235,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '4px', padding: '12px 16px', fontWeight: 600, fontFamily: 'var(--font-mono), monospace', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={e => { if (action !== 'deposit') e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
              onMouseOut={e => { if (action !== 'deposit') e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            >
              Deposit
            </button>
            <button 
              onClick={() => setAction('withdraw')}
              style={{ flex: 1, background: action === 'withdraw' ? 'rgba(248,113,113,0.1)' : 'transparent', color: action === 'withdraw' ? '#f87171' : '#666', border: `1px solid ${action === 'withdraw' ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '4px', padding: '12px 16px', fontWeight: 600, fontFamily: 'var(--font-mono), monospace', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={e => { if (action !== 'withdraw') e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
              onMouseOut={e => { if (action !== 'withdraw') e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            >
              Withdraw
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            <label style={{ fontSize: '11px', color: '#666', fontFamily: 'var(--font-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Input Amount (USDC)</label>
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              <span style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)', borderRight: 'none', borderRadius: '4px 0 0 4px', color: '#888', display: 'flex', alignItems: 'center' }}>$</span>
              <input 
                type="number" 
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderLeft: 'none', borderRight: 'none', color: '#fff', fontFamily: 'inherit', padding: '12px 16px', outline: 'none', flex: 1, fontSize: '14px' }}
              />
              <button 
                onClick={() => setAmount(action === 'deposit' ? '10000' : '57440')}
                style={{ background: 'rgba(255,255,255,0.03)', color: '#2563EB', border: '1px solid rgba(255,255,255,0.1)', borderLeft: 'none', borderRadius: '0 4px 4px 0', padding: '12px 20px', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', fontSize: '12px', transition: 'background 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              >
                MAX
              </button>
            </div>
          </div>

          <button 
            onClick={handleExecute}
            style={{ width: '100%', background: action === 'deposit' ? '#2563EB' : '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '14px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', fontSize: '14px', boxShadow: action === 'deposit' ? '0 4px 14px 0 rgba(37,99,235,0.39)' : '0 4px 14px 0 rgba(239,68,68,0.39)', transition: 'opacity 0.2s' }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            EXECUTE TRANSACTION
          </button>
        </div>

        {/* LOGS */}
        <div style={{ marginTop: '2rem', fontSize: '13px', lineHeight: 1.6, fontFamily: 'var(--font-mono), monospace' }}>
          {toast && (
            <div style={{ color: toast.includes('SUCCESS') ? '#4ade80' : '#f87171', background: toast.includes('SUCCESS') ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', padding: '1rem', borderRadius: '4px', border: `1px solid ${toast.includes('SUCCESS') ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}` }}>
              {toast}
            </div>
          )}
          {!toast && (
            <div style={{ color: '#555', padding: '1rem' }}>
              &gt; Waiting for user input...
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
