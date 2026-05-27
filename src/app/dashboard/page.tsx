'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'

const DEMO_ADDRESS = '0x90F79bf6EB2c4f870365E785982E1f101E93b906'; // Seeded Simulator Whale Wallet

function PnlChartMin() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width, h = canvas.height
    
    let frame = 0;
    let animationId: number;
    
    // Base data points for the portfolio PnL trend
    const points = [
      { x: 0, y: h - 10 },
      { x: w * 0.3, y: h - 30 },
      { x: w * 0.5, y: h - 25 },
      { x: w * 0.8, y: h - 60 },
      { x: w, y: h - 80 }
    ]

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, w, h)
      
      // Terminal background
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, w, h)
      
      // Grid lines - retro style (moving slightly to simulate flow)
      ctx.strokeStyle = '#003300'
      ctx.lineWidth = 1
      const offset = -(frame * 0.5) % 15;
      
      for (let i = 0; i < w + 15; i += 15) { ctx.beginPath(); ctx.moveTo(i + offset, 0); ctx.lineTo(i + offset, h); ctx.stroke(); }
      for (let i = 0; i < h; i += 15) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }
      
      // Main line - Terminal Green
      ctx.strokeStyle = '#00FF00'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      
      // Add slight sine wave noise to y coordinates to simulate live ticking money
      const noisyPoints = points.map((p, idx) => {
        const volatility = idx === points.length - 1 ? 5 : 1.5;
        const noise = Math.sin(frame * 0.05 + idx) * volatility;
        return { x: p.x, y: p.y + noise }
      });

      ctx.moveTo(noisyPoints[0].x, noisyPoints[0].y)
      for (let i = 1; i < noisyPoints.length; i++) {
        ctx.lineTo(noisyPoints[i].x, noisyPoints[i].y)
      }
      ctx.stroke()
      
      // Fill under line
      ctx.lineTo(w, h)
      ctx.lineTo(0, h)
      ctx.fillStyle = 'rgba(0, 255, 0, 0.1)'
      ctx.fill()

      animationId = requestAnimationFrame(draw)
    }
    
    draw();
    
    return () => cancelAnimationFrame(animationId);
  }, [])
  return (
    <div style={{ border: '1px solid #00FF00', background: '#000000', padding: 2, display: 'inline-block', marginBottom: '0.5rem', boxShadow: '0 0 10px rgba(0,255,0,0.1)' }}>
      <canvas ref={ref} width={400} height={120} style={{ display: 'block', maxWidth: '100%', height: 'auto' }} />
      <div style={{ fontSize: 10, color: '#00FF00', textAlign: 'center', marginTop: 4, fontFamily: 'var(--font-mono)' }}>&gt; LIVE_PNL_RENDER.OBJ <span style={{ animation: 'pulse-badge 1s infinite' }}>_</span></div>
    </div>
  )
}

export default function DashboardPage() {
  const { address: connectedAddress, isConnected } = useAccount()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const activeAddress = isConnected && connectedAddress ? connectedAddress : DEMO_ADDRESS;

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2400)
  }

  useEffect(() => {
    setLoading(true)
    fetch(`/api/dashboard?address=${activeAddress}`)
      .then(res => res.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [activeAddress])

  return (
    <div style={{ minHeight: '100vh', background: '#000000', fontFamily: 'var(--font-mono), monospace', color: '#EFEFEF', padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        {/* HEADER BAR */}
        <div style={{ marginBottom: '3rem', borderBottom: '1px dashed #2563EB', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ color: '#2563EB', fontSize: '14px', fontWeight: 700, letterSpacing: '1px' }}>
            &gt; INVESTOR_TERMINAL.EXE
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '12px' }}>
            <Link href="/discover" style={{ color: '#00C9C0', textDecoration: 'none' }}>[CATALOG]</Link> 
            <Link href="/list-bot" style={{ color: '#00FF00', textDecoration: 'none' }}>[DEPLOY_BOT]</Link>
          </div>
        </div>

        {/* DEMO FALLBACK WARNING */}
        {!isConnected && (
          <div style={{ border: '1px solid #C9A84C', padding: '1rem', background: '#050500', color: '#C9A84C', fontSize: '12px', marginBottom: '2rem' }}>
            [!] NOT CONNECTED: Viewing Simulation/Demo Wallet Portfolio. Connect your Polygon wallet to manage deposits.
          </div>
        )}

        {/* IDENTITY BLOCK */}
        <div style={{ marginBottom: '3rem', border: '1px solid #2563EB', padding: '1.5rem', background: '#030303' }}>
          <div style={{ color: '#2563EB', fontSize: '12px', marginBottom: '1rem' }}>+-- [ CONNECTION ESTABLISHED ] --------------------------+</div>
          <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
            <div>
              <span style={{ color: '#666' }}>&gt; USER_ROLE:</span>{' '}
              <span style={{ color: isConnected ? '#00FF00' : '#C9A84C', fontWeight: 700 }}>
                {isConnected ? 'DEPOSITOR_NODE' : 'DEMO_VIEWER_NODE'}
              </span>
            </div>
            <div>
              <span style={{ color: '#666' }}>&gt; WALLET_ADDR:</span>{' '}
              <span style={{ color: '#EFEFEF', textTransform: 'lowercase' }}>{activeAddress}</span>
            </div>
            <div><span style={{ color: '#666' }}>&gt; SYS_TIME:</span> <span style={{ color: '#EFEFEF' }}>{new Date().toLocaleString('en-US', { hour12: false })}</span></div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#666', fontSize: '12px' }}>
            [RETRIEVING_ON_CHAIN_METRICS...]
          </div>
        ) : !data || data.totalDeposited === 0 ? (
          <div style={{ border: '1px solid #333', background: '#030303', padding: '3rem', textAlign: 'center' }}>
            <div style={{ color: '#666', fontSize: '14px', marginBottom: '1.5rem' }}>&gt; PORTFOLIO EMPTY: Lock USDC into Brier vaults to begin copy-trading.</div>
            <Link href="/discover" style={{ display: 'inline-block', background: '#00FF00', color: '#000', padding: '8px 16px', fontWeight: 700, textDecoration: 'none', fontSize: '12px' }}>
              [GO_TO_CATALOG]
            </Link>
          </div>
        ) : (
          <>
            {/* METRICS & CHART */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '4rem' }}>
              
              {/* METRICS */}
              <div style={{ border: '1px solid #00FF00', padding: '1.5rem', background: '#030303', boxShadow: '0 0 15px rgba(0,255,0,0.05)' }}>
                <div style={{ color: '#00FF00', fontSize: '12px', marginBottom: '1.5rem', borderBottom: '1px dashed #00FF00', paddingBottom: '0.5rem' }}>
                  &gt; PORTFOLIO_METRICS
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '13px' }}>
                  <div>
                    <div style={{ color: '#666', fontSize: '10px' }}>[PORTFOLIO_VALUE]</div>
                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>${data.portfolioValue.toLocaleString()} USDC</div>
                  </div>
                  <div>
                    <div style={{ color: '#666', fontSize: '10px' }}>[TOTAL_DEPOSITED]</div>
                    <div style={{ color: '#EFEFEF', fontSize: '16px' }}>${data.totalDeposited.toLocaleString()} USDC</div>
                  </div>
                  <div>
                    <div style={{ color: '#666', fontSize: '10px' }}>[30D_YIELD]</div>
                    <div style={{ color: '#00FF00', fontSize: '16px', fontWeight: 700 }}>+${data.yield30d.toFixed(2)} USDC</div>
                  </div>
                  <div>
                    <div style={{ color: '#666', fontSize: '10px' }}>[TOTAL_EARNED]</div>
                    <div style={{ color: '#00FF00', fontSize: '16px', fontWeight: 700 }}>+${data.totalEarned.toLocaleString()} USDC</div>
                  </div>
                  <div>
                    <div style={{ color: '#666', fontSize: '10px' }}>[ANNUALIZED_RET]</div>
                    <div style={{ color: '#00C9C0', fontSize: '16px', fontWeight: 700 }}>{data.annualizedReturn}%</div>
                  </div>
                  <div>
                    <div style={{ color: '#666', fontSize: '10px' }}>[ACTIVE_POSITIONS]</div>
                    <div style={{ color: '#EFEFEF', fontSize: '16px' }}>{data.activePositions}</div>
                  </div>
                </div>
              </div>

              {/* CHART */}
              <div>
                <div style={{ color: '#EFEFEF', fontSize: '12px', marginBottom: '1rem' }}>&gt; VISUAL_OUTPUT:</div>
                <PnlChartMin />
              </div>
            </div>

            {/* ACTIVE VAULT ALLOCATIONS */}
            <div style={{ marginBottom: '4rem' }}>
              <div style={{ color: '#C9A84C', fontSize: '12px', marginBottom: '1.5rem', borderBottom: '1px solid #C9A84C', paddingBottom: '0.5rem' }}>
                &gt; ACTIVE_VAULT_ALLOCATIONS
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.allocations.map((p: any) => (
                  <div key={p.bot} style={{ 
                    border: '1px solid #333', 
                    background: '#050505', 
                    padding: '1rem', 
                    display: 'grid', 
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', 
                    alignItems: 'center',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#C9A84C'; e.currentTarget.style.background = 'rgba(201,168,76,0.05)'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.background = '#050505'; }}
                  >
                    <div style={{ color: '#EFEFEF', fontWeight: 700 }}>[{p.bot}]</div>
                    <div><span style={{ color: '#666' }}>MODE:</span> <span style={{ color: p.mode === 'DEGEN' ? '#ef4444' : '#00C9C0' }}>&lt;{p.mode}&gt;</span></div>
                    <div><span style={{ color: '#666' }}>DEP:</span> <span style={{ color: '#fff' }}>${p.dep.toLocaleString()}</span></div>
                    <div style={{ color: '#00FF00', fontWeight: 700 }}>+${p.prof.toLocaleString()} ({p.pct}%)</div>
                    <div style={{ textAlign: 'right' }}>
                      <Link href={`/bot/${p.slug}`} style={{ color: '#C9A84C', textDecoration: 'none' }} onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'} onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}>[MANAGE_FUNDS]</Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TRANSACTION LOGS */}
            <div>
              <div style={{ color: '#00C9C0', fontSize: '12px', marginBottom: '1.5rem', borderBottom: '1px solid #00C9C0', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>&gt; TRANSACTION_LEDGER</span>
                <span style={{ color: '#00FF00', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 6, height: 6, background: '#00FF00', animation: 'pulse-badge 2s infinite' }}></div>
                  [SYNC_LIVE]
                </span>
              </div>
              
              <div style={{ border: '1px solid #333', background: '#030303', padding: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ color: '#666', borderBottom: '1px dashed #333' }}>
                      <th style={{ padding: '8px', fontWeight: 'normal' }}>[TIME]</th>
                      <th style={{ padding: '8px', fontWeight: 'normal' }}>[TYPE]</th>
                      <th style={{ padding: '8px', fontWeight: 'normal' }}>[VAULT]</th>
                      <th style={{ padding: '8px', fontWeight: 'normal', textAlign: 'right' }}>[SIZE_USDC]</th>
                      <th style={{ padding: '8px', fontWeight: 'normal' }}>[TX_HASH]</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((log: any) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #111', cursor: 'pointer' }} onClick={() => showToast('HASH_COPIED')} onMouseOver={e => e.currentTarget.style.background = '#111'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '10px 8px', color: '#888' }}>{log.date}</td>
                        <td style={{ padding: '10px 8px', color: log.type === 'earn' ? '#00FF00' : '#00C9C0' }}>
                          {log.type === 'earn' ? '[YIELD_DIST]' : log.type === 'mirror' ? '[SHADOW_COPY]' : '[VAULT_DEP]'}
                        </td>
                        <td style={{ padding: '10px 8px', color: '#EFEFEF' }}>{log.bot}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: log.type === 'earn' ? '#00FF00' : '#EFEFEF' }}>
                          {log.amount}
                        </td>
                        <td style={{ padding: '10px 8px', color: '#555' }}>{log.hash}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, background: '#00FF00', color: '#000', fontSize: '12px', padding: '8px 16px', fontWeight: 700 }}>
          &gt; {toast}
        </div>
      )}

    </div>
  )
}
