'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import BotCharacter from '@/components/BotCharacter'

const HISTORY = [
  { id: 249012, type: 'earn', bot: 'ADAN-PRED', amount: '+$8,700', date: '05/24/25(Fri)14:22:11', hash: '0x3f1a...cc09' },
  { id: 249011, type: 'earn', bot: 'SIGMA-7', amount: '+$3,750', date: '05/24/25(Fri)14:18:05', hash: '0x8b2c...f112' },
  { id: 249010, type: 'earn', bot: 'KELLY-PRIME', amount: '+$1,370', date: '05/24/25(Fri)10:02:44', hash: '0x1d9e...7731' },
  { id: 245001, type: 'deposit', bot: 'KELLY-PRIME', amount: '$35,000', date: '05/01/25(Thu)09:15:22', hash: '0x6c4d...aa20' },
  { id: 231022, type: 'earn', bot: 'ADAN-PRED', amount: '+$8,700', date: '04/24/25(Wed)16:45:10', hash: '0x2a8f...3301' },
  { id: 231021, type: 'earn', bot: 'SIGMA-7', amount: '+$3,750', date: '04/24/25(Wed)16:40:05', hash: '0x9c11...e821' },
  { id: 189442, type: 'deposit', bot: 'SIGMA-7', amount: '$50,000', date: '02/28/25(Fri)11:22:33', hash: '0x5a2b...dc44' },
  { id: 175221, type: 'deposit', bot: 'ADAN-PRED', amount: '$100,000', date: '02/12/25(Wed)08:14:15', hash: '0x7f3c...1182' },
]

function PnlChartMin() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width, h = canvas.height
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#080808'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 1
    for (let i = 0; i < w; i += 20) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
    for (let i = 0; i < h; i += 20) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }
    ctx.strokeStyle = '#2563EB'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, h-10)
    ctx.lineTo(w*0.3, h-30)
    ctx.lineTo(w*0.5, h-25)
    ctx.lineTo(w*0.8, h-60)
    ctx.lineTo(w, h-80)
    ctx.stroke()
  }, [])
  return (
    <div style={{ border: '1px solid #333', background: '#080808', padding: 2, display: 'inline-block', marginBottom: '0.5rem' }}>
      <canvas ref={ref} width={300} height={100} style={{ display: 'block', maxWidth: '100%', height: 'auto' }} />
      <div style={{ fontSize: 9, color: '#555', textAlign: 'center', marginTop: 2, fontFamily: 'var(--font-mono)' }}>chart_portfolio_all.png (31 KB, 300x100)</div>
    </div>
  )
}

export default function DashboardPage() {
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2400)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-mono), monospace', color: '#c5c8c6', padding: '2rem 1rem' }}>

      {/* HEADER BAR */}
      <div style={{ maxWidth: 1200, margin: '0 auto', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a1a', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', fontSize: 16, fontWeight: 'bold' }}>
          <span style={{ color: '#2563EB' }}>/usr/ - Depositor Terminal</span>
        </div>
        <div style={{ fontSize: 12, color: '#555' }}>
          [<Link href="/discover" style={{ color: '#2563EB', textDecoration: 'none' }}>Catalog</Link>] 
          [<Link href="/list-bot" style={{ color: '#2563EB', textDecoration: 'none' }}>Deploy Bot</Link>]
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* OP POST (The User Identity) */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Thumbnail */}
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 2 }}>File: ident_pepito.png (5 KB, 100x100)</div>
            <div style={{ width: 100, height: 100, border: '1px solid #2563EB', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: '#2563EB', fontWeight: 'bold' }}>P</div>
          </div>

          {/* User Content */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, marginBottom: '0.5rem' }}>
              <span style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 14 }}>pepito.eth</span>{' '}
              <span style={{ color: '#117743', fontWeight: 'bold' }}>Depositor</span>{' '}
              <span style={{ color: '#117743' }}>(ID: 0x3a4f...c91b)</span>{' '}
              <span style={{ color: '#555' }}>{new Date().toLocaleString('en-US', { hour12: false })}</span>{' '}
              <span style={{ color: '#555' }}>No.10000001</span>
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.5, color: '#c5c8c6', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
              <span style={{ color: '#cc0000', fontWeight: 'bold', fontSize: 15 }}>Portfolio Status Active</span>
              <br/><br/>
              <span style={{ color: '#7ec87e' }}>&gt;Total Deposited: $185,000</span><br/>
              <span style={{ color: '#7ec87e' }}>&gt;Total Earned: +$42,600 (Net Return: +23.0%)</span><br/>
              <span style={{ color: '#7ec87e' }}>&gt;Active Positions: 3</span><br/>
            </div>

            {/* Terminal Stats Box */}
            <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '0.5rem', display: 'inline-block', marginBottom: '1rem', minWidth: 400 }}>
              <div style={{ color: '#2563EB', borderBottom: '1px solid #1a1a1a', paddingBottom: 4, marginBottom: 4, fontWeight: 'bold' }}>--- PORTFOLIO METRICS ---</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: 12 }}>
                <div><span style={{ color: '#555' }}>PORTFOLIO_VALUE:</span> <span>$227,640</span></div>
                <div><span style={{ color: '#555' }}>30D_YIELD:</span> <span style={{ color: '#22c55e' }}>+$13,820</span></div>
                <div><span style={{ color: '#555' }}>AVG_MONTHLY:</span> <span style={{ color: '#22c55e' }}>7.4%</span></div>
                <div><span style={{ color: '#555' }}>FEES_PAID:</span> <span>$4,264</span></div>
                <div><span style={{ color: '#555' }}>ANNUALIZED_RETURN:</span> <span style={{ color: '#2563EB' }}>88.8%</span></div>
                <div><span style={{ color: '#555' }}>WITHDRAWALS:</span> <span>0</span></div>
              </div>
            </div>
            
            <br />
            <PnlChartMin />
          </div>
        </div>

        {/* ACTIVE POSITIONS */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ color: '#C9A84C', fontWeight: 'bold', borderBottom: '1px solid #1a1a1a', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>&gt;&gt; ACTIVE VAULT ALLOCATIONS</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {[
              { bot: 'ADAN-PRED', dep: 100000, prof: 31200, pct: 31.2, mode: 'DEGEN' },
              { bot: 'SIGMA-7', dep: 50000, prof: 7440, pct: 14.9, mode: 'CONS' },
              { bot: 'KELLY-PRIME', dep: 35000, prof: 4000, pct: 11.4, mode: 'CONS' },
            ].map(p => (
              <div key={p.bot} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>{p.bot}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>Mode: <span style={{ color: p.mode === 'DEGEN' ? '#FF6B1A' : '#00C9C0' }}>{p.mode}</span></div>
                  <div style={{ fontSize: 11, color: '#555' }}>Deposited: ${p.dep.toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>+${p.prof.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: '#22c55e' }}>+{p.pct}%</div>
                  <Link href="/vault" style={{ fontSize: 10, color: '#2563EB', textDecoration: 'none', display: 'block', marginTop: 4 }}>[Manage]</Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* HISTORY FEED (Order Book Style) */}
        <div>
          <div style={{ color: '#C9A84C', fontWeight: 'bold', borderBottom: '1px solid #1a1a1a', paddingBottom: '0.5rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>&gt;&gt; VAULT_ORDER_BOOK / TRANSACTION_LOGS</span>
            <span style={{ color: '#555', fontSize: 11 }}>LIVE SYNC...</span>
          </div>
          
          <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '0.5rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--font-mono), monospace', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: '#555', borderBottom: '1px solid #1a1a1a' }}>
                  <th style={{ padding: '4px 8px', fontWeight: 'normal' }}>TIME</th>
                  <th style={{ padding: '4px 8px', fontWeight: 'normal' }}>TYPE</th>
                  <th style={{ padding: '4px 8px', fontWeight: 'normal' }}>VAULT</th>
                  <th style={{ padding: '4px 8px', fontWeight: 'normal', textAlign: 'right' }}>SIZE (USDC)</th>
                  <th style={{ padding: '4px 8px', fontWeight: 'normal' }}>TX_HASH</th>
                </tr>
              </thead>
              <tbody>
                {HISTORY.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #111', cursor: 'pointer' }} onClick={() => showToast('Copied Hash')}>
                    <td style={{ padding: '4px 8px', color: '#888' }}>{log.date.split(')')[1] || log.date}</td>
                    <td style={{ padding: '4px 8px', color: log.type === 'earn' ? '#22c55e' : '#2563EB' }}>
                      {log.type === 'earn' ? 'YIELD_DIST' : 'VAULT_DEP'}
                    </td>
                    <td style={{ padding: '4px 8px', color: '#c5c8c6' }}>{log.bot}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', color: log.type === 'earn' ? '#22c55e' : '#c5c8c6' }}>
                      {log.amount}
                    </td>
                    <td style={{ padding: '4px 8px', color: '#555' }}>{log.hash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, background: '#161616', border: '1px solid #2563EB', color: '#efefef', fontSize: 12, padding: '10px 18px' }}>
          {toast}
        </div>
      )}

    </div>
  )
}
