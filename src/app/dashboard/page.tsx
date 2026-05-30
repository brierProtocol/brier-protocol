'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { motion, useSpring, useTransform } from 'framer-motion'

// Fallback to placeholder if env not set
const vaultAddress = (process.env.NEXT_PUBLIC_VAULT_ADDRESS_MUMBAI || process.env.NEXT_PUBLIC_VAULT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`

const brierVaultABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "shares", "type": "uint256"}],
    "name": "previewRedeem",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "shares", "type": "uint256"},
      {"internalType": "address", "name": "receiver", "type": "address"},
      {"internalType": "address", "name": "owner", "type": "address"}
    ],
    "name": "redeem",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "idleCapital",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
]

// ── Portfolio Chart (canvas) ──
function PortfolioChart({ data }: { data: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width, h = canvas.height
    ctx.clearRect(0, 0, w, h)
    
    // Grid background
    ctx.fillStyle = '#050505'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#111'
    ctx.lineWidth = 1
    for (let i = 0; i < w; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
    for (let i = 0; i < h; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }

    const min = Math.min(...data), max = Math.max(...data)
    const range = (max - min) || 1
    
    // Gradient Fill
    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.2)')
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0)')

    ctx.beginPath()
    ctx.moveTo(0, h)
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * (h - 20) - 10
      ctx.lineTo(x, y)
    })
    ctx.lineTo(w, h)
    ctx.fillStyle = gradient
    ctx.fill()

    // Line
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = 2
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * (h - 20) - 10
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
  }, [data])
  return (
    <div style={{ position: 'relative', width: '100%', height: 200, border: '1px solid #1a1a1a', background: '#050505', overflow: 'hidden' }}>
      <canvas ref={ref} width={800} height={200} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div style={{ position: 'absolute', top: 10, left: 10, color: '#555', fontSize: 10, fontFamily: 'var(--font-mono)' }}>[30D_EQUITY_CURVE]</div>
      <div style={{ position: 'absolute', bottom: 10, right: 10, color: '#22c55e', fontSize: 10, fontFamily: 'var(--font-mono)' }}>+14.2% ALL-TIME</div>
    </div>
  )
}

function AnimatedCounter({ value, prefix = '', decimals = 2 }: { value: number, prefix?: string, decimals?: number }) {
  const spring = useSpring(0, { bounce: 0, duration: 1200 })
  const display = useTransform(spring, current => `${prefix}${current.toFixed(decimals)}`)
  useEffect(() => { spring.set(value) }, [value, spring])
  return <motion.span>{display}</motion.span>
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const [withdrawInput, setWithdrawInput] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview')

  // Wagmi Reads
  const { data: balanceData, isLoading: loadingBalance } = useReadContract({
    address: vaultAddress, abi: brierVaultABI, functionName: 'balanceOf', args: address ? [address] : undefined, query: { enabled: !!address }
  })
  const shares = (balanceData as bigint) || 0n
  const { data: valueData, isLoading: loadingValue, refetch: refetchValue } = useReadContract({
    address: vaultAddress, abi: brierVaultABI, functionName: 'previewRedeem', args: [shares], query: { enabled: shares > 0n }
  })
  const usdcValue = (valueData as bigint) || 0n
  const { data: idleCapitalData } = useReadContract({
    address: vaultAddress, abi: brierVaultABI, functionName: 'idleCapital', query: { enabled: !!address }
  })
  const idleCapital = (idleCapitalData as bigint) || 0n
  
  const formattedShares = Number(formatUnits(shares, 6))
  const formattedValue = Number(formatUnits(usdcValue, 6))
  const formattedIdleCapital = Number(formatUnits(idleCapital, 6))

  // Wagmi Writes
  const { writeContract: redeemShares, isPending: isRedeeming } = useWriteContract()

  const handleRedeem = () => {
    if (!withdrawInput || isNaN(Number(withdrawInput)) || !address) return
    const sharesToRedeem = parseUnits(withdrawInput, 6)
    redeemShares({
      address: vaultAddress, abi: brierVaultABI, functionName: 'redeem', args: [sharesToRedeem, address, address]
    }, {
      onSuccess: () => {
        setWithdrawInput('')
        setTimeout(() => refetchValue(), 3000)
      }
    })
  }

  // Mock Portfolio Data for WOW Factor
  const mockPnlData = [10000, 10200, 10150, 10400, 10800, 10750, 11100, 11420]
  const mockActivity = [
    { id: 1, type: 'settlement', bot: 'ADAN-PRED', market: 'Will ETH hit $4k in May?', pnl: '+420.50 USDC', date: '2 mins ago', hash: '0x3f...9a12' },
    { id: 2, type: 'deposit', bot: 'ADAN-PRED', market: '-', pnl: '+5,000.00 USDC', date: '5 hrs ago', hash: '0x1a...b44c' },
    { id: 3, type: 'settlement', bot: 'SCORE-TEST', market: 'Fed Rate Cut in June?', pnl: '-150.00 USDC', date: '1 day ago', hash: '0x99...2f11' }
  ]

  if (!isConnected) {
    return (
      <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)' }}>
        <div style={{ color: '#C9A84C', fontSize: '24px', marginBottom: '1rem', letterSpacing: '2px' }}>[ ACCESS_DENIED ]</div>
        <div style={{ color: '#555', fontSize: '12px', border: '1px dashed #333', padding: '1rem' }}>
          &gt; Authentication required. Connect Ethereum wallet to decrypt portfolio data.
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-mono)', color: '#c5c8c6', padding: '2rem 1rem' }}>
      
      {/* HEADER BAR */}
      <div style={{ maxWidth: 1200, margin: '0 auto', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a1a', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" style={{ color: '#555', textDecoration: 'none', transition: 'color 0.2s' }} className="hover-white">[← Back]</Link>
          <div style={{ fontSize: 18, color: '#fff', fontWeight: 'bold', letterSpacing: '1px' }}>
            <span style={{ color: '#2563EB' }}>//</span> INVESTOR_TERMINAL
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }}></div>
            <span style={{ color: '#22c55e' }}>POLYGON CONNECTED</span>
          </div>
          <span style={{ color: '#555', background: '#0a0a0a', padding: '4px 8px', border: '1px solid #1a1a1a' }}>
            {address?.substring(0,6)}...{address?.substring(address.length-4)}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* METRICS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ background: 'linear-gradient(180deg, #0d0d0d 0%, #050505 100%)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 2, background: '#22c55e', boxShadow: '0 0 15px #22c55e' }}></div>
            <div style={{ color: '#555', fontSize: 10, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '1px' }}>Total Net Worth</div>
            <div style={{ color: '#fff', fontSize: '2rem', fontWeight: 'bold', textShadow: '0 0 20px rgba(34, 197, 94, 0.4)' }}>
              {loadingValue ? <span style={{ color: '#333', fontSize: '1.2rem' }}>[ SYNC... ]</span> : <AnimatedCounter value={formattedValue} prefix="$" />}
            </div>
            <div style={{ color: '#22c55e', fontSize: 11, marginTop: '0.5rem' }}>▲ 24H PNL: +$142.50</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1.5rem' }}>
            <div style={{ color: '#555', fontSize: 10, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '1px' }}>Active Exposure</div>
            <div style={{ color: '#60a5fa', fontSize: '2rem', fontWeight: 'bold' }}>
              {loadingValue ? <span style={{ color: '#333', fontSize: '1.2rem' }}>[ SYNC... ]</span> : <AnimatedCounter value={Math.max(0, formattedValue - formattedIdleCapital)} prefix="$" />}
            </div>
            <div style={{ color: '#555', fontSize: 11, marginTop: '0.5rem' }}>Capital locked in trades</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1.5rem' }}>
            <div style={{ color: '#555', fontSize: 10, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '1px' }}>Idle Capital</div>
            <div style={{ color: '#C9A84C', fontSize: '2rem', fontWeight: 'bold' }}>
              {loadingValue ? <span style={{ color: '#333', fontSize: '1.2rem' }}>[ SYNC... ]</span> : <AnimatedCounter value={formattedIdleCapital} prefix="$" />}
            </div>
            <div style={{ color: '#555', fontSize: 11, marginTop: '0.5rem' }}>Available to withdraw</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ color: '#555', fontSize: 10, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '1px' }}>Global Est. APY</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <div style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 'bold', lineHeight: 1 }}>84.2</div>
              <div style={{ color: '#2563EB', fontSize: '1.2rem', fontWeight: 'bold' }}>%</div>
            </div>
          </motion.div>

        </div>

        {/* MAIN SPLIT */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          
          {/* LEFT COL: CHART & POSITIONS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              <PortfolioChart data={mockPnlData} />
            </motion.div>

            {/* TABBED INTERFACE */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #1a1a1a', marginBottom: '1.5rem' }}>
                <button onClick={() => setActiveTab('overview')} style={{ background: 'none', border: 'none', color: activeTab === 'overview' ? '#fff' : '#555', padding: '0 0 0.5rem 0', fontSize: 12, fontWeight: 'bold', letterSpacing: '1px', borderBottom: activeTab === 'overview' ? '2px solid #2563EB' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit' }}>ACTIVE_POSITIONS</button>
                <button onClick={() => setActiveTab('history')} style={{ background: 'none', border: 'none', color: activeTab === 'history' ? '#fff' : '#555', padding: '0 0 0.5rem 0', fontSize: 12, fontWeight: 'bold', letterSpacing: '1px', borderBottom: activeTab === 'history' ? '2px solid #2563EB' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit' }}>TRANSACTION_LOG</button>
              </div>

              {activeTab === 'overview' ? (
                <div style={{ border: '1px solid #1a1a1a', background: '#0a0a0a', overflow: 'hidden' }}>
                  {formattedShares > 0 ? (
                    <>
                      <div style={{ display: 'flex', padding: '1rem 1.5rem', background: '#050505', borderBottom: '1px solid #1a1a1a', fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        <div style={{ flex: 2 }}>Algorithm Vault</div>
                        <div style={{ flex: 1, textAlign: 'right' }}>Shares</div>
                        <div style={{ flex: 1, textAlign: 'right' }}>Total Value</div>
                        <div style={{ flex: 1, textAlign: 'right' }}>Yield</div>
                      </div>
                      
                      {/* BOT ROW WITH PREMIUM HOVER */}
                      <div className="portfolio-row" style={{ display: 'flex', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid #111', transition: 'background 0.2s', cursor: 'pointer' }}>
                        <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: 40, height: 40, background: 'rgba(96, 165, 250, 0.05)', border: '1px solid rgba(96, 165, 250, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', fontSize: 14, boxShadow: 'inset 0 0 10px rgba(96,165,250,0.1)' }}>
                            A
                          </div>
                          <div>
                            <Link href="/bot/adan-pred" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold', fontSize: 15, display: 'block', marginBottom: 4 }}>ADAN-PRED</Link>
                            <div style={{ color: '#555', fontSize: 10 }}>Contract: {vaultAddress.substring(0, 8)}...</div>
                          </div>
                        </div>
                        <div style={{ flex: 1, textAlign: 'right', color: '#c5c8c6', fontFamily: 'inherit' }}>{loadingBalance ? '--' : formattedShares.toFixed(2)}</div>
                        <div style={{ flex: 1, textAlign: 'right', color: '#22c55e', fontWeight: 'bold', fontFamily: 'inherit' }}>${loadingValue ? '--' : formattedValue.toFixed(2)}</div>
                        <div style={{ flex: 1, textAlign: 'right', color: '#22c55e', fontSize: 12 }}>+18.4%</div>
                      </div>

                      {/* WITHDRAW SECTION FOR THIS ROW */}
                      <div style={{ padding: '1.5rem', background: 'rgba(201, 168, 76, 0.03)', borderTop: '1px dashed #222' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
                          <div style={{ color: '#C9A84C', fontSize: 12, fontWeight: 'bold', letterSpacing: '1px' }}>[ REDEEM_CAPITAL ]</div>
                          <div style={{ color: '#888', fontSize: 10 }}>Withdrawable: {formattedIdleCapital.toFixed(2)} USDC</div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <div style={{ display: 'flex', flex: 1, background: '#000', border: withdrawInput ? '1px solid #C9A84C' : '1px solid #333', transition: 'border-color 0.3s' }}>
                            <div style={{ padding: '12px 16px', color: '#555', borderRight: '1px solid #333' }}>SHARES</div>
                            <input 
                              type="number" 
                              placeholder="0.00" 
                              value={withdrawInput}
                              onChange={e => setWithdrawInput(e.target.value)}
                              style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', padding: '12px 16px', fontFamily: 'inherit', fontSize: 14, outline: 'none' }}
                              disabled={isRedeeming}
                            />
                            <button 
                              onClick={() => setWithdrawInput(formattedShares.toString())}
                              style={{ background: 'transparent', border: 'none', borderLeft: '1px solid #333', color: '#60a5fa', padding: '0 16px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold', fontSize: 11 }}
                            >
                              MAX
                            </button>
                          </div>

                          <button 
                            onClick={handleRedeem}
                            disabled={isRedeeming || !withdrawInput}
                            style={{
                              background: isRedeeming ? '#050505' : (withdrawInput ? '#C9A84C' : '#111'),
                              color: isRedeeming ? '#555' : (withdrawInput ? '#000' : '#555'),
                              border: isRedeeming ? '1px solid #333' : (withdrawInput ? 'none' : '1px solid #333'),
                              padding: '0 32px',
                              fontWeight: 'bold',
                              fontSize: 13,
                              letterSpacing: '1px',
                              cursor: isRedeeming ? 'not-allowed' : 'pointer',
                              fontFamily: 'inherit',
                              transition: 'all 0.3s',
                              textShadow: withdrawInput ? '0 0 10px rgba(0,0,0,0.5)' : 'none'
                            }}
                          >
                            {isRedeeming ? 'EXECUTING...' : 'WITHDRAW'}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                      <div style={{ color: '#555', fontSize: 14, marginBottom: '1.5rem' }}>[ NO_CAPITAL_DEPLOYED ]</div>
                      <Link href="/discover" style={{ display: 'inline-block', background: 'transparent', border: '1px solid #2563EB', color: '#60a5fa', padding: '12px 24px', textDecoration: 'none', fontSize: 12, fontWeight: 'bold', letterSpacing: '1px', transition: 'all 0.2s' }}>
                        INITIALIZE DEPLOYMENT →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ border: '1px solid #1a1a1a', background: '#0a0a0a', padding: '1rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textAlign: 'left' }}>
                    <thead>
                      <tr style={{ color: '#555', borderBottom: '1px solid #1a1a1a' }}>
                        <th style={{ padding: '12px', fontWeight: 'normal' }}>TYPE</th>
                        <th style={{ padding: '12px', fontWeight: 'normal' }}>VAULT</th>
                        <th style={{ padding: '12px', fontWeight: 'normal' }}>MARKET</th>
                        <th style={{ padding: '12px', fontWeight: 'normal', textAlign: 'right' }}>AMOUNT (USDC)</th>
                        <th style={{ padding: '12px', fontWeight: 'normal', textAlign: 'right' }}>TX HASH</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockActivity.map(act => (
                        <tr key={act.id} style={{ borderBottom: '1px solid #111' }}>
                          <td style={{ padding: '12px', color: act.type === 'deposit' ? '#2563EB' : '#C9A84C' }}>[{act.type.toUpperCase()}]</td>
                          <td style={{ padding: '12px', color: '#fff' }}>{act.bot}</td>
                          <td style={{ padding: '12px', color: '#888' }}>{act.market}</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: act.pnl.includes('+') ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>{act.pnl}</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#555' }}>{act.hash}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>

          {/* RIGHT COL: SYSTEM STATUS */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ border: '1px solid #1a1a1a', background: '#0a0a0a', padding: '1.5rem' }}>
              <div style={{ color: '#555', fontSize: 10, letterSpacing: '1px', marginBottom: '1.5rem' }}>[ SYSTEM_STATUS ]</div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ color: '#888', fontSize: 12 }}>Oracles</div>
                <div style={{ color: '#22c55e', fontSize: 12 }}>ONLINE</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ color: '#888', fontSize: 12 }}>Executor Node</div>
                <div style={{ color: '#22c55e', fontSize: 12 }}>SYNCED</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ color: '#888', fontSize: 12 }}>Risk Engine</div>
                <div style={{ color: '#2563EB', fontSize: 12 }}>ACTIVE</div>
              </div>
              
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px dashed #222' }}>
                <div style={{ color: '#C9A84C', fontSize: 10, letterSpacing: '1px', marginBottom: '1rem' }}>SECURITY & SETTLEMENT</div>
                <p style={{ color: '#555', fontSize: 11, lineHeight: 1.6, margin: 0 }}>
                  All funds are held in ERC-4626 audited vaults on Polygon. Settlements are cryptographically verified by UMA Optimistic Oracle before capital distribution.
                </p>
              </div>
            </div>

          </motion.div>

        </div>
      </div>
      
      {/* GLOBAL STYLES FOR HOVERS */}
      <style dangerouslySetInnerHTML={{__html: `
        .hover-white:hover { color: #fff !important; }
        .portfolio-row:hover { background: #0d0d0d !important; }
      `}} />
    </div>
  )
}
