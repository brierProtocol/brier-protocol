'use client'

import { useState } from 'react'
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

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-mono), monospace', color: '#c5c8c6', padding: '2rem 1rem' }}>
      
      {/* HEADER */}
      <div style={{ maxWidth: 800, margin: '0 auto', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a1a', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', fontSize: 16, fontWeight: 'bold' }}>
          <span style={{ color: '#2563EB' }}>/vault/SIGMA-7 - Contract Interaction</span>
        </div>
        <div style={{ fontSize: 12, color: '#555' }}>
          [<Link href="/dashboard" style={{ color: '#2563EB', textDecoration: 'none' }}>Back to Terminal</Link>]
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        {/* CONTRACT INFO */}
        <div style={{ border: '1px solid #1a1a1a', background: '#0a0a0a', padding: '1rem', marginBottom: '2rem' }}>
          <div style={{ color: '#C9A84C', fontWeight: 'bold', borderBottom: '1px solid #1a1a1a', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
            &gt;&gt; VAULT_STATE_READ
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: 13 }}>
            <div><span style={{ color: '#555' }}>TARGET_BOT:</span> <span style={{ color: '#2563EB', fontWeight: 'bold' }}>SIGMA-7</span></div>
            <div><span style={{ color: '#555' }}>CONTRACT_ADDR:</span> <span>0x42f...e981</span></div>
            <div><span style={{ color: '#555' }}>NETWORK:</span> <span>POLYGON</span></div>
            <div><span style={{ color: '#555' }}>GLOBAL_TVL:</span> <span>$1,400,000 USDC</span></div>
            <div><span style={{ color: '#555' }}>YOUR_BALANCE:</span> <span style={{ color: '#22c55e', fontWeight: 'bold' }}>$50,000 USDC</span></div>
            <div><span style={{ color: '#555' }}>UNREALIZED_PNL:</span> <span style={{ color: '#22c55e' }}>+$7,440 (+14.9%)</span></div>
            <div><span style={{ color: '#555' }}>PERFORMANCE_FEE:</span> <span>10%</span></div>
            <div><span style={{ color: '#555' }}>LOCKUP_PERIOD:</span> <span>NONE</span></div>
          </div>
        </div>

        {/* INTERACTION FORM */}
        <div style={{ border: '1px dashed #333', background: '#0a0a0a', padding: '1rem' }}>
          <div style={{ color: '#2563EB', fontWeight: 'bold', marginBottom: '1rem' }}>
            &gt;&gt; VAULT_WRITE_OPERATION
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <button 
              onClick={() => setAction('deposit')}
              style={{ background: action === 'deposit' ? '#2563EB' : '#111', color: action === 'deposit' ? '#000' : '#555', border: '1px solid #333', padding: '6px 16px', fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              [ DEPOSIT ]
            </button>
            <button 
              onClick={() => setAction('withdraw')}
              style={{ background: action === 'withdraw' ? '#ef4444' : '#111', color: action === 'withdraw' ? '#000' : '#555', border: '1px solid #333', padding: '6px 16px', fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              [ WITHDRAW ]
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            <label style={{ fontSize: 12, color: '#555' }}>INPUT_AMOUNT (USDC):</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ background: '#1a1a1a', padding: '8px 12px', border: '1px solid #333', borderRight: 'none', color: '#555' }}>$</span>
              <input 
                type="number" 
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                style={{ background: '#000', border: '1px solid #333', color: '#fff', fontFamily: 'inherit', padding: '8px', outline: 'none', flex: 1 }}
              />
              <button 
                onClick={() => setAmount(action === 'deposit' ? '10000' : '57440')}
                style={{ background: '#1a1a1a', color: '#888', border: '1px solid #333', borderLeft: 'none', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer' }}
              >
                MAX
              </button>
            </div>
          </div>

          <button 
            onClick={handleExecute}
            style={{ width: '100%', background: action === 'deposit' ? '#2563EB' : '#ef4444', color: '#000', border: 'none', padding: '10px', fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer', fontSize: 14 }}
          >
            EXECUTE_TRANSACTION
          </button>
        </div>

        {/* LOGS */}
        <div style={{ marginTop: '2rem', fontSize: 12, lineHeight: 1.5 }}>
          {toast && (
            <div style={{ color: toast.includes('SUCCESS') ? '#22c55e' : '#FF6B1A' }}>
              {toast}
            </div>
          )}
          <div style={{ color: '#555' }}>
            &gt; Waiting for user input...
          </div>
        </div>

      </div>
    </div>
  )
}
