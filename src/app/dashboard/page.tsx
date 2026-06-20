'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { parseUnits } from 'viem'
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import { brierVaultABI } from '@/lib/abis/BrierVault'
import type { Allocation, DashboardHistoryItem } from '@/types'

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
    
    ctx.fillStyle = 'rgba(5, 5, 5, 0.4)'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(255, 42, 77, 0.05)'
    ctx.lineWidth = 1
    for (let i = 0; i < w; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
    for (let i = 0; i < h; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }

    if (data.length === 0) return

    const min = Math.min(...data), max = Math.max(...data)
    const range = (max - min) || 1
    
    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, 'rgba(255, 42, 77, 0.3)')
    gradient.addColorStop(1, 'rgba(255, 42, 77, 0)')

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

    ctx.strokeStyle = '#ff2a4d'
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
    <div className="relative w-full h-[200px] border border-primary/20 bg-black/40 backdrop-blur-md overflow-hidden rounded-sm shadow-[inset_0_0_20px_rgba(255,42,77,0.05)]">
      <canvas ref={ref} width={800} height={200} className="w-full h-full block" />
      <div className="absolute top-3 left-3 text-primary/70 text-[10px] font-mono tracking-widest">[30D_EQUITY_CURVE]</div>
    </div>
  )
}

function AnimatedCounter({ value, prefix = '', decimals = 2 }: { value: number, prefix?: string, decimals?: number }) {
  const spring = useSpring(0, { bounce: 0, duration: 1500 })
  const display = useTransform(spring, current => `${prefix}${current.toFixed(decimals)}`)
  useEffect(() => { spring.set(value) }, [value, spring])
  return <motion.span>{display}</motion.span>
}

interface DashboardData {
  portfolioValue: number;
  totalDeposited: number;
  yield30d: number;
  totalEarned: number;
  annualizedReturn: number;
  activePositions: number;
  allocations: Allocation[];
  history: DashboardHistoryItem[];
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const [withdrawInputs, setWithdrawInputs] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview')
  const [dashData, setDashData] = useState<DashboardData | null>(null)
  const [apiLoading, setApiLoading] = useState(true)

  const { writeContract: redeemShares, isPending: isRedeeming } = useWriteContract()

  useEffect(() => {
    if (!address) return
    fetch(`/api/dashboard?address=${address}`)
      .then(r => r.json())
      .then(data => { setDashData(data); setApiLoading(false); })
      .catch(e => { console.error(e); setApiLoading(false); })
  }, [address])

  const handleRedeem = (vaultAddress: string) => {
    const inputAmt = withdrawInputs[vaultAddress]
    if (!inputAmt || isNaN(Number(inputAmt)) || !address) return
    const sharesToRedeem = parseUnits(inputAmt, 6)
    redeemShares({
      address: vaultAddress as `0x${string}`, abi: brierVaultABI, functionName: 'redeem', args: [sharesToRedeem, address, address]
    }, {
      onSuccess: () => {
        setWithdrawInputs(prev => ({ ...prev, [vaultAddress]: '' }))
        // Idealy refetch API here after block confirms
      }
    })
  }

  // Generate a mock curve scaled to portfolio value
  const baseCurve = [1, 1.02, 1.015, 1.04, 1.08, 1.075, 1.11, 1.142]
  const pnlData = dashData?.portfolioValue ? baseCurve.map(v => v * dashData.totalDeposited) : [0,0,0,0,0]

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center font-mono">
        <div className="text-primary text-2xl mb-4 tracking-widest font-bold shadow-primary drop-shadow-[0_0_15px_rgba(255,42,77,0.8)]">[ ACCESS_DENIED ]</div>
        <div className="text-primary/70 text-xs border border-primary/30 bg-[#080405] p-4 uppercase tracking-widest backdrop-blur-md">
          &gt; Auth required. Connect terminal to decrypt portfolio.
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#030303] font-mono text-[#e0e0e0] p-4 sm:p-8 overflow-x-hidden">
      
      {/* HEADER BAR */}
      <div className="max-w-[1200px] mx-auto mb-8 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center border-b border-primary/20 pb-4 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-primary/70 no-underline transition-colors hover:text-primary hover:drop-shadow-[0_0_5px_rgba(255,42,77,0.5)]">[&lt; RETURN]</Link>
          <div className="text-lg text-white font-bold tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
            <span className="text-primary mr-2">//</span> DASHBOARD
          </div>
        </div>
        <div className="flex gap-4 sm:gap-6 text-[10px] sm:text-xs items-center">
          <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 border border-primary/30 rounded-full">
            <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(255,42,77,1)] animate-pulse"></div>
            <span className="text-primary font-bold tracking-widest">CONNECTED</span>
          </div>
          <span className="text-primary/70 bg-black/50 px-3 py-1 border border-primary/20 font-bold tracking-widest backdrop-blur-sm">
            {address?.substring(0,6)}...{address?.substring(address.length-4)}
          </span>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto">

        {/* INFO BANNER */}
        <div className="info-banner mb-6">
          <span className="text-primary text-xs">[INFO]</span>
          Capital is deployed via ERC-4626 shares. Exit is <span className="text-white mx-1 font-semibold">instant</span> — shares are redeemable 1:1 at current NAV. Principal + profit arrive in one transaction.
        </div>

        {/* HOW IT WORKS — Cuadritos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          {[
            { n: '01', title: 'DEPOSIT', icon: '[$]', desc: 'Send USDC to the vault. Shares minted proportionally. Your share = your claim on all vault assets.' },
            { n: '02', title: 'BOT_TRADES', icon: '[⚡]', desc: 'Algorithm trades Polymarket markets. NAV updates on every settlement. You can exit any time.' },
            { n: '03', title: 'REDEEM', icon: '[↗]', desc: 'Burn shares → receive USDC. Builder 30% + protocol 10% deducted from profit only. Principal always 100% liquid.' },
          ].map(({ n, title, icon, desc }) => (
            <div key={n} className="bg-black/40 border border-primary/10 hover:border-primary/25 transition-colors p-5 relative group">
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/20 group-hover:border-primary/40 transition-colors" />
              <div className="flex items-start gap-3 mb-3">
                <span className="text-primary/40 font-mono text-xs">{n}</span>
                <span className="text-primary font-mono font-bold text-lg">{icon}</span>
              </div>
              <div className="text-white font-mono text-xs font-bold tracking-widest mb-2">{title}</div>
              <div className="text-[#555] text-[11px] leading-relaxed font-sans">{desc}</div>
            </div>
          ))}
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} 
            className="group relative overflow-hidden bg-gradient-to-b from-[#110508] to-black border border-primary/40 p-6 shadow-[0_0_20px_rgba(255,42,77,0.05)] hover:shadow-[0_0_30px_rgba(255,42,77,0.2)] transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-primary shadow-[0_0_15px_rgba(255,42,77,1)]" />
            <div className="text-primary/70 text-[10px] uppercase mb-2 tracking-widest font-bold">TOTAL BALANCE</div>
            <div className="text-white text-[2rem] sm:text-[2.5rem] font-bold drop-shadow-[0_0_10px_rgba(255,42,77,0.4)]">
              {apiLoading ? <span className="text-primary/40 text-xl animate-pulse">[ SYNC... ]</span> : <AnimatedCounter value={dashData?.portfolioValue || 0} prefix="$" />}
            </div>
            <div className="text-primary text-[11px] mt-2 font-bold tracking-widest flex items-center gap-2">
              <span className="w-1 h-1 bg-primary rounded-full shadow-primary"></span>
              ALL-TIME PNL: {dashData?.totalEarned ? (dashData.totalEarned >= 0 ? '+' : '') : ''}${dashData?.totalEarned?.toFixed(2) || '0.00'}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} 
            className="bg-black/60 backdrop-blur-md border border-primary/20 hover:border-primary/50 p-6 transition-all duration-300 hover:bg-[#0a0204]">
            <div className="text-primary/70 text-[10px] uppercase mb-2 tracking-widest font-bold">INVESTED CAPITAL</div>
            <div className="text-white text-[1.8rem] font-bold">
              {apiLoading ? <span className="text-primary/40 text-xl">[ SYNC... ]</span> : <AnimatedCounter value={dashData?.totalDeposited || 0} prefix="$" />}
            </div>
            <div className="text-primary/50 text-[11px] mt-2 tracking-widest">Capital locked in execution</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} 
            className="bg-black/60 backdrop-blur-md border border-primary/20 hover:border-primary/50 p-6 transition-all duration-300 hover:bg-[#0a0204]">
            <div className="text-primary/70 text-[10px] uppercase mb-2 tracking-widest font-bold">ACTIVE BOTS</div>
            <div className="text-white text-[1.8rem] font-bold">
              {apiLoading ? <span className="text-primary/40 text-xl">[ SYNC... ]</span> : <AnimatedCounter value={dashData?.activePositions || 0} decimals={0} />}
            </div>
            <div className="text-primary/50 text-[11px] mt-2 tracking-widest">Vaults operating parallel</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} 
            className="bg-black/60 backdrop-blur-md border border-primary/20 hover:border-primary/50 p-6 flex flex-col justify-center transition-all duration-300">
            <div className="text-primary/70 text-[10px] uppercase mb-4 tracking-widest font-bold">EST. APY</div>
            <div className="flex items-baseline gap-2">
              <div className="text-white text-[2.5rem] font-bold leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                {apiLoading ? '--' : dashData?.annualizedReturn?.toFixed(1) || '0.0'}
              </div>
              <div className="text-primary text-xl font-bold">%</div>
            </div>
          </motion.div>

        </div>

        {/* MAIN SPLIT */}
        <div className="grid grid-cols-1 gap-8">
          
          {/* CHART & POSITIONS */}
          <div className="flex flex-col gap-6">
            
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}>
              <PortfolioChart data={pnlData} />
            </motion.div>

            {/* TABBED INTERFACE */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-black/40 backdrop-blur-md border border-primary/20 p-1">
              <div className="flex gap-2 border-b border-primary/20 p-2">
                <button onClick={() => setActiveTab('overview')} className={`flex-1 py-3 text-[10px] sm:text-xs font-bold tracking-widest cursor-pointer font-mono transition-all rounded-sm ${activeTab === 'overview' ? 'bg-primary/10 text-primary border border-primary/30 shadow-[inset_0_0_10px_rgba(255,42,77,0.2)]' : 'bg-transparent text-primary/50 border border-transparent hover:text-primary/80 hover:bg-black/50'}`}>[ ACTIVE_POSITIONS ]</button>
                <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 text-[10px] sm:text-xs font-bold tracking-widest cursor-pointer font-mono transition-all rounded-sm ${activeTab === 'history' ? 'bg-primary/10 text-primary border border-primary/30 shadow-[inset_0_0_10px_rgba(255,42,77,0.2)]' : 'bg-transparent text-primary/50 border border-transparent hover:text-primary/80 hover:bg-black/50'}`}>[ TRANSACTION_LOG ]</button>
              </div>

              <div className="p-4">
                <AnimatePresence mode="wait">
                  {activeTab === 'overview' && (
                    <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-4">
                      {apiLoading ? (
                         <div className="py-12 text-center text-primary/50 animate-pulse tracking-widest text-xs font-bold">[ SCANNING_BLOCKCHAIN... ]</div>
                      ) : dashData?.allocations && dashData.allocations.length > 0 ? (
                        dashData.allocations.map((alloc, i) => (
                          <div key={i} className="bg-[#050203] border border-primary/20 hover:border-primary/50 transition-all shadow-[0_0_10px_rgba(255,42,77,0.05)] hover:shadow-[0_0_20px_rgba(255,42,77,0.15)] flex flex-col md:flex-row">
                            
                            {/* Card Info */}
                            <div className="p-4 md:p-6 flex-1 flex flex-col justify-center border-b md:border-b-0 md:border-r border-primary/10 relative overflow-hidden group">
                              <div className="absolute top-0 right-0 w-8 h-8 bg-primary/5 border-l border-b border-primary/20 flex items-center justify-center font-bold text-primary/30 group-hover:text-primary transition-colors text-[10px]">
                                {i+1}
                              </div>
                              <Link href={`/bot/${alloc.slug}`} className="text-white no-underline font-bold text-lg mb-1 hover:text-primary transition-colors flex items-center gap-2">
                                {alloc.bot}
                                <span className="text-[9px] bg-primary/20 text-primary px-2 py-[2px] rounded-sm tracking-widest border border-primary/30">{alloc.mode}</span>
                              </Link>
                              <div className="text-primary/50 text-[10px] tracking-widest font-mono">VAULT: {(alloc.vaultAddress ?? '')?.substring(0, 10)}...</div>
                              
                              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-primary/10">
                                <div>
                                  <div className="text-primary/40 text-[9px] uppercase tracking-widest">Deposited</div>
                                  <div className="text-white font-bold text-sm">${alloc.dep.toFixed(2)}</div>
                                </div>
                                <div>
                                  <div className="text-primary/40 text-[9px] uppercase tracking-widest">Earned</div>
                                  <div className="text-primary font-bold text-sm">${alloc.prof.toFixed(2)}</div>
                                </div>
                                <div>
                                  <div className="text-primary/40 text-[9px] uppercase tracking-widest">Yield</div>
                                  <div className="text-white font-bold text-sm">{alloc.pct > 0 ? '+' : ''}{alloc.pct}%</div>
                                </div>
                              </div>
                            </div>

                            {/* Extract Action */}
                            <div className="p-4 md:p-6 md:w-64 bg-black/40 flex flex-col justify-center">
                              <div className="text-primary/70 text-[10px] font-bold tracking-widest mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-primary shadow-primary rounded-full animate-pulse"></span>
                                [ EXTRACT_CAPITAL ]
                              </div>
                              <div className="flex bg-black border border-primary/30 focus-within:border-primary focus-within:shadow-[0_0_10px_rgba(255,42,77,0.2)] transition-all mb-3 rounded-sm">
                                <input 
                                  type="number" 
                                  placeholder="USDC" 
                                  value={withdrawInputs[(alloc.vaultAddress ?? '')] || ''}
                                  onChange={e => setWithdrawInputs(prev => ({ ...prev, [(alloc.vaultAddress ?? '')]: e.target.value }))}
                                  className="w-full bg-transparent border-none text-white p-2 font-mono text-sm outline-none placeholder-primary/20"
                                  disabled={isRedeeming}
                                />
                                <button onClick={() => setWithdrawInputs(prev => ({ ...prev, [(alloc.vaultAddress ?? '')]: alloc.dep.toString() }))} className="bg-transparent border-none border-l border-primary/30 text-primary px-3 cursor-pointer font-mono font-bold text-[10px] hover:bg-primary/10 transition-colors">MAX</button>
                              </div>
                              <button 
                                onClick={() => handleRedeem((alloc.vaultAddress ?? ''))}
                                disabled={isRedeeming || !withdrawInputs[(alloc.vaultAddress ?? '')]}
                                className={`w-full py-2 font-bold text-[11px] tracking-widest font-mono rounded-sm transition-all ${
                                  isRedeeming ? 'bg-black text-primary/40 border border-primary/20 cursor-not-allowed' :
                                  withdrawInputs[(alloc.vaultAddress ?? '')] ? 'bg-primary text-black border-none shadow-[0_0_15px_rgba(255,42,77,0.5)] hover:shadow-[0_0_25px_rgba(255,42,77,0.8)] cursor-pointer scale-[1.02]' :
                                  'bg-[#0a0204] text-primary/50 border border-primary/20 cursor-not-allowed'
                                }`}
                              >
                                {isRedeeming ? 'EXECUTING...' : 'CONFIRM_EXTRACT'}
                              </button>
                            </div>

                          </div>
                        ))
                      ) : (
                        <div className="p-12 text-center border border-primary/10 bg-black/30">
                          <div className="text-primary/50 text-xs mb-1 tracking-widest font-bold">[ NO_ACTIVE_POSITIONS ]</div>
                          <div className="text-[#333] text-[10px] font-mono mb-6">No capital deployed in active vaults.</div>
                          <Link href="/discover" className="inline-block bg-transparent border border-primary/50 text-primary px-6 py-3 no-underline text-[11px] font-bold tracking-widest transition-all hover:bg-primary hover:text-black hover:shadow-[0_0_20px_rgba(255,42,77,0.5)] font-mono">
                            EXPLORE_CATALOG →
                          </Link>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'history' && (
                    <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                      <div className="hidden sm:block border border-primary/20 bg-black/40 overflow-hidden rounded-sm">
                        <table className="w-full border-collapse text-[11px] text-left">
                          <thead>
                            <tr className="text-primary/60 border-b border-primary/20 bg-[#050203]">
                              <th className="p-3 font-normal tracking-widest font-bold">TYPE</th>
                              <th className="p-3 font-normal tracking-widest font-bold">VAULT</th>
                              <th className="p-3 font-normal tracking-widest font-bold">DATE</th>
                              <th className="p-3 font-normal tracking-widest font-bold text-right">AMT_USDC</th>
                              <th className="p-3 font-normal tracking-widest font-bold text-right">TX_HASH</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashData?.history?.map(act => (
                              <tr key={act.id} className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
                                <td className={`p-3 font-bold ${act.type === 'deposit' ? 'text-white' : act.type === 'earn' ? 'text-primary' : 'text-[#888]'}`}>[{act.type.toUpperCase()}]</td>
                                <td className="p-3 text-white font-bold">{act.bot}</td>
                                <td className="p-3 text-primary/50">{act.date}</td>
                                <td className={`p-3 text-right font-bold ${act.amount.includes('+') ? 'text-primary drop-shadow-[0_0_5px_rgba(255,42,77,0.6)]' : 'text-[#c5c8c6]'}`}>{act.amount}</td>
                                <td className="p-3 text-right text-primary/40 font-mono">{act.hash}</td>
                              </tr>
                            ))}
                            {(!dashData?.history || dashData.history.length === 0) && (
                              <tr><td colSpan={5} className="p-8 text-center text-primary/40 text-[10px] tracking-widest font-bold">&gt; NO_TRANSACTIONS_FOUND</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Mobile Cards for History */}
                      <div className="flex flex-col gap-3 sm:hidden">
                        {dashData?.history?.map(act => (
                          <div key={act.id} className="bg-[#050203] border border-primary/20 p-4 rounded-sm flex flex-col gap-2 relative overflow-hidden">
                            <div className="absolute left-0 top-0 h-full w-[2px] bg-primary/40" />
                            <div className="flex justify-between items-start">
                              <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-sm border ${act.type === 'earn' ? 'border-primary text-primary bg-primary/10' : 'border-primary/30 text-white bg-white/5'}`}>
                                {act.type.toUpperCase()}
                              </span>
                              <span className="text-primary/50 text-[9px] font-mono">{act.date}</span>
                            </div>
                            <div className="flex justify-between items-end mt-2">
                              <div className="text-white font-bold text-sm">{act.bot}</div>
                              <div className={`font-bold text-sm ${act.amount.includes('+') ? 'text-primary drop-shadow-[0_0_5px_rgba(255,42,77,0.6)]' : 'text-[#c5c8c6]'}`}>
                                {act.amount}
                              </div>
                            </div>
                            <div className="text-[9px] text-primary/30 font-mono mt-1 text-right">TX: {act.hash}</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  )
}
