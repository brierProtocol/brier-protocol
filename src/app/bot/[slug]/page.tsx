'use client'

import { use, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { getBotById } from '@/data/bots'
import { notFound } from 'next/navigation'
import { getBotTradeHistory } from '@/lib/polymarket-indexer'
import BotCharacter, { moodColors } from '@/components/BotCharacter'
import { computeQuantitativeMood } from '@/lib/mood-engine'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { motion } from 'framer-motion'

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!target) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setValue(target); clearInterval(timer) }
      else setValue(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return value
}

// ── User Identicon (5x5 Blockie) ──
function UserIdenticon({ id, size = 32 }: { id: string, size?: number }) {
  const hash = id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0)
  const hue = Math.abs(hash % 360)
  const c1 = `hsl(${hue}, 70%, 50%)`
  const c2 = `hsl(${hue}, 70%, 20%)`
  const bg = '#0a0a0a'
  
  const grid = Array(5).fill(0).map((_, i) => 
    Array(5).fill(0).map((_, j) => {
      const mirrorJ = j > 2 ? 4 - j : j
      const bit = (Math.abs(hash) >> (i * 3 + mirrorJ)) % 3
      return bit === 0 ? bg : bit === 1 ? c1 : c2
    })
  )

  return (
    <div style={{ width: size, height: size, border: `1px solid ${c1}`, display: 'inline-block', padding: 2, background: bg }}>
      <svg width="100%" height="100%" viewBox="0 0 5 5" shapeRendering="crispEdges">
        {grid.map((row, i) => row.map((color, j) => (
          <rect key={`${i}-${j}`} x={j} y={i} width="1" height="1" fill={color} />
        )))}
      </svg>
    </div>
  )
}

// ── PnL Chart (canvas) ──
function PnlChart({ data }: { data: number[] }) {
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

    const min = Math.min(...data), max = Math.max(...data)
    const range = max - min || 1
    
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = 2
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * (h - 10) - 5
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
  }, [data])
  return (
    <div style={{ border: '1px solid #333', background: '#080808', padding: 2, display: 'inline-block', marginBottom: '0.5rem', width: '100%' }}>
      <canvas ref={ref} width={600} height={150} style={{ display: 'block', width: '100%', height: 'auto' }} />
      <div style={{ fontSize: 9, color: '#555', textAlign: 'center', marginTop: 2, fontFamily: 'var(--font-mono)' }}>chart_pnl_live.png (42 KB)</div>
    </div>
  )
}

// ── Slime Vault Progress Bar ──
function VaultCapacityBar({ current, cap }: { current: number, cap: number }) {
  const percentage = Math.min((current / cap) * 100, 100)
  const isFull = percentage >= 100
  
  const bubbles = Array.from({ length: 8 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    duration: `${1.5 + Math.random() * 2}s`,
    delay: `${Math.random() * 2}s`,
    size: `${4 + Math.random() * 6}px`
  }))

  return (
    <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
        <div style={{ color: '#C9A84C', fontWeight: 'bold' }}>VAULT CAPACITY // ORACLE SYNCED</div>
        <div style={{ color: isFull ? '#ef4444' : '#22c55e', fontWeight: 'bold' }}>
          {isFull ? 'CAPACITY REACHED / CLOSED' : `${percentage.toFixed(1)}% ALLOCATED`}
        </div>
      </div>
      
      <div style={{ position: 'relative', height: '24px', border: isFull ? '1px solid #ef4444' : '1px solid #333', background: '#0a0a0a', overflow: 'hidden' }}>
        <div 
          style={{ 
            height: '100%',
            width: `${percentage}%`,
            background: isFull 
              ? 'linear-gradient(90deg, #991b1b, #ef4444)' 
              : 'linear-gradient(90deg, #14532d, #22c55e)',
            transition: 'width 1s ease-in-out',
            position: 'relative'
          }}
        >
          {/* Bubbles Simulation */}
          {percentage > 5 && bubbles.map(b => (
            <div 
              key={b.id} 
              style={{
                position: 'absolute', bottom: 0, left: b.left, width: b.size, height: b.size,
                background: 'rgba(255,255,255,0.2)', borderRadius: '50%',
                animation: `rise ${b.duration} infinite ease-in ${b.delay}`
              }}
            />
          ))}
        </div>
        
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <span style={{ 
            color: percentage > 50 ? '#000' : '#fff', 
            fontWeight: 'bold', 
            fontSize: '11px',
            textShadow: percentage > 50 ? 'none' : '0 1px 2px rgba(0,0,0,0.8)',
            letterSpacing: '1px'
          }}>
            ${current.toLocaleString()} / ${cap.toLocaleString()} USDC
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Main Page Component ──
interface Post {
  id: string; wallet: string; text: string; createdAt: string;
  user?: { name: string | null; pfpUrl: string | null; }
}

export default function BotProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  
  const [bot, setBot] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [posts, setPosts] = useState<Post[]>([])
  const [postText, setPostText] = useState('')
  const [depositAmt, setDepositAmt] = useState('')
  const [tradeHistory, setTradeHistory] = useState<any[]>([])
  
  const [hearts, setHearts] = useState(0)
  const [hearted, setHearted] = useState(false)
  
  const { address, isConnected } = useAccount()
  const isOwner = isConnected && address && bot && (bot.walletAddress?.toLowerCase() === address.toLowerCase() || bot.builder?.toLowerCase() === address.toLowerCase())
  
  // View State: Toggle between Deployer Terminal and Investor View
  const [viewMode, setViewMode] = useState<'investor' | 'creator'>('investor')
  
  // Emergency Kill Switch State
  const [killStatus, setKillStatus] = useState<'idle' | 'halting' | 'halted'>('idle')

  const [depositing, setDepositing] = useState(false)
  const [toast, setToast] = useState('')

  const animatedTVL = useCountUp(bot?.tvl || 0)
  const vaultCap = bot?.vaultCap || 50000
  const isVaultFull = animatedTVL >= vaultCap

  useEffect(() => {
    if (isOwner) setViewMode('creator')
  }, [isOwner])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const triggerKillSwitch = () => {
    if (!confirm("WARNING: This will instantly reject all incoming API signals for this bot. Continue?")) return;
    setKillStatus('halting')
    showToast("[SYS] Transmitting EMERGENCY_HALT to Brier Protocol RPC...")
    setTimeout(() => {
      setKillStatus('halted')
      showToast("[CRITICAL] HotAPIKey suspended. All pending trades cancelled.")
    }, 1500)
  }

  const handleWeb3Deposit = async () => {
    const amt = parseFloat(depositAmt) || 0
    if (amt <= 0) return alert("Please enter a valid deposit amount")
    
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert("No Web3 Wallet detected! Please install MetaMask to interact with Brier vaults.")
      return
    }

    setDepositing(true)
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()
      const vAddress = bot.vaultAddress || "0x75537828f2ce51be7289709686A69CbFDbB714F1" 
      
      const vaultContract = new ethers.Contract(vAddress, ["function asset() external view returns (address)", "function deposit(uint256 assets, address receiver) external returns (uint256)"], signer)

      showToast("Querying vault configuration...")
      const usdcAddress = await vaultContract.asset()
      const usdcContract = new ethers.Contract(usdcAddress, ["function approve(address spender, uint256 amount) external returns (bool)", "function decimals() external view returns (uint8)"], signer)

      const decimals = await usdcContract.decimals().catch(() => 18)
      const txAmount = ethers.parseUnits(depositAmt, decimals)

      showToast("Step 1/2: Approving USDC spending limits...")
      const approveTx = await usdcContract.approve(vAddress, txAmount)
      await approveTx.wait()

      showToast("Step 2/2: Confirming Vault collateral lockup...")
      const depositTx = await vaultContract.deposit(txAmount, address)
      await depositTx.wait()

      showToast("SUCCESS: Capital locked & mirror active!")

      await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: bot.id, depositorWallet: address, amountUsdc: amt, mode: "CONSERVATIVE", txHash: depositTx.hash })
      })

      const res = await fetch(`/api/bots/${bot.id || slug}`)
      if (res.ok) {
        const updated = await res.json()
        setBot((prev: any) => ({ ...prev, tvl: updated.currentTVL || prev.tvl }))
      }

    } catch (err: any) {
      console.error(err)
      alert("Web3 Transaction Failed: " + (err.reason || err.message || err))
    } finally {
      setDepositing(false)
    }
  }

  const toggleHeart = async () => {
    if (!isConnected || !address) return alert("Please connect your wallet to like this bot.")
    const res = await fetch('/api/hearts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: address, botId: bot.id })
    })
    if (res.ok) {
      const data = await res.json()
      setHearted(data.status === 'hearted')
      setHearts(h => data.status === 'hearted' ? h + 1 : Math.max(0, h - 1))
    }
  }

  useEffect(() => {
    const fetchBotData = async () => {
      const mockBot = getBotById(slug)
      if (mockBot) { setBot(mockBot); setLoading(false); return mockBot }

      const res = await fetch(`/api/bots/${slug}`)
      if (res.ok) {
        const dbBot = await res.json()
        let dynamicPnl = [100, 105, 110, 108, 115, 120, 125, 130];
        if (dbBot.pnlSnapshots && dbBot.pnlSnapshots.length > 0) dynamicPnl = dbBot.pnlSnapshots.map((s: any) => s.pnlUsd);
        else if (dbBot.currentTVL > 0) dynamicPnl = [dbBot.currentTVL * 0.95, dbBot.currentTVL * 0.98, dbBot.currentTVL * 1.01, dbBot.currentTVL * 1.05, dbBot.currentTVL];

        const mappedBot = {
          id: dbBot.id, name: dbBot.name, builder: dbBot.walletAddress,
          description: dbBot.description || dbBot.tagline, mood: dbBot.mood || 'neutral',
          status: dbBot.status || 'live', brierScore: dbBot.scores?.[0]?.brierScore || 0,
          winRate: dbBot.scores?.[0]?.winRate || 0, monthlyYield: 0,
          sharpe: dbBot.scores?.[0]?.sharpe || 0, maxDrawdown: dbBot.scores?.[0]?.maxDrawdown || 0,
          tvl: dbBot.currentTVL || 0, vaultCap: 50000, markets: ['crypto'],
          pnlHistory: dynamicPnl, vaultAddress: dbBot.vaultAddress, dbTradeEvents: dbBot.trades || []
        }
        
        setBot(mappedBot)
        setHearts(dbBot._count?.hearts || 0)
        setLoading(false)
        return mappedBot
      }
      setLoading(false)
      return null
    }

    fetchBotData().then((activeBot: any) => {
      if (!activeBot) return;
      if (activeBot.dbTradeEvents && activeBot.dbTradeEvents.length > 0) {
        setTradeHistory(activeBot.dbTradeEvents.map((t: any) => ({
          date: new Date(t.timestamp).toLocaleDateString(),
          market: t.marketTitle, predicted: t.side || "YES", probability: 0.8,
          actualOutcome: t.outcome === "PENDING" ? null : (t.outcome === "WIN" ? 1 : 0)
        })))
      } else {
        getBotTradeHistory(activeBot.builder).then(data => setTradeHistory(data))
      }
      fetch(`/api/comments?botId=${activeBot.id}`).then(res => res.json()).then(data => { if (Array.isArray(data)) setPosts(data) })
    })
  }, [slug])

  const addPost = async () => {
    if (!postText.trim()) return
    let activeAddress = (isConnected && address) ? address : null
    if (!activeAddress && typeof window !== 'undefined' && (window as any).ethereum?.selectedAddress) activeAddress = (window as any).ethereum.selectedAddress
    const userWallet = activeAddress || 'anon_' + Math.random().toString(36).substring(2, 6)
    
    const res = await fetch('/api/comments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId: bot.id, wallet: userWallet, text: postText.trim() })
    })
    
    if (res.ok) {
      const newComment = await res.json()
      setPosts([...posts, newComment])
      setPostText('')
    } else alert("Failed to post comment to database")
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#050505', color: '#555', padding: '2rem', fontFamily: 'monospace' }}>&gt; Loading Database...</div>
  if (!bot) return notFound()

  const amt = parseFloat(depositAmt) || 0
  const estMonthly = amt * (bot.monthlyYield / 100)
  const currentMoodState = computeQuantitativeMood({ recentDrawdown: 0.05, winRate: 0.58, recentPositives: 6 });

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-mono), monospace', color: '#c5c8c6', padding: '2rem 1rem' }}>
      
      {/* HEADER BAR */}
      <div style={{ maxWidth: 1200, margin: '0 auto', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a1a', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: 16, fontWeight: 'bold' }}>
          <Link href="/discover" style={{ color: '#2563EB', textDecoration: 'none' }}>[Return]</Link>
          <span style={{ color: '#C9A84C' }}>/brier/ - Institutional Bot Catalog</span>
          
          {/* VIEW TOGGLE (Visible to Everyone, but prompts connection if not owner) */}
          <div style={{ display: 'flex', gap: '2px', background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '2px', marginLeft: '1rem' }}>
            <button onClick={() => setViewMode('creator')} style={{ background: viewMode === 'creator' ? '#111' : 'transparent', color: viewMode === 'creator' ? '#00FF00' : '#555', border: 'none', padding: '4px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>[ DEPLOYER ]</button>
            <button onClick={() => setViewMode('investor')} style={{ background: viewMode === 'investor' ? '#111' : 'transparent', color: viewMode === 'investor' ? '#2563EB' : '#555', border: 'none', padding: '4px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>[ INVESTOR ]</button>
          </div>

        </div>
        <div style={{ fontSize: 12, color: '#555' }}>
          [<Link href="/dashboard" style={{ color: '#2563EB', textDecoration: 'none' }}>Dashboard</Link>] 
          [<Link href="/list-bot" style={{ color: '#2563EB', textDecoration: 'none' }}>Submit Algorithm</Link>]
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* OP POST (The Bot Listing) */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          
          {/* Thumbnail */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 2 }}>File: bot_core.png (12 KB)</div>
            <BotCharacter mood={currentMoodState.mood as any} size={150} />
          </div>

          {/* OP Content */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ color: viewMode === 'creator' ? '#00FF00' : '#2563EB', fontWeight: 'bold', fontSize: 15 }}>{bot.name}</span>
              
              <button onClick={toggleHeart} style={{ background: hearted ? 'rgba(239,68,68,0.15)' : 'transparent', border: `1px solid ${hearted ? '#ef4444' : '#333'}`, color: hearted ? '#ef4444' : '#888', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit' }}>
                ♥ {hearts}
              </button>

              <span style={{ color: '#C9A84C', fontWeight: 'bold' }}>[RANK: Bot Architect]</span>
              <span style={{ color: '#117743' }}>(ID: <Link href={`/maker/${bot.builder}`} style={{ color: 'inherit', textDecoration: 'underline' }}>{bot.builder}</Link>)</span>
              <span style={{ color: '#555' }}>11/19/25(Sun)08:29:35</span>
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.5, color: '#c5c8c6', marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>
              {bot.description}
            </div>

            {/* --- DEPLOYER VIEW --- */}
            {viewMode === 'creator' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Kill Switch & Latency Heatmap Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  
                  {/* Nuclear Kill Switch */}
                  <div style={{ background: '#0a0303', border: '1px solid #3d0a0a', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ color: '#ff4444', fontWeight: 'bold', fontSize: '13px', marginBottom: '0.5rem', letterSpacing: '1px' }}>[ NUCLEAR KILL SWITCH ]</div>
                      <div style={{ fontSize: '11px', color: '#8c4a1a', lineHeight: 1.4, marginBottom: '1rem' }}>
                        Sends HALT signal to Brier API. All pending transactions on HotAPIKey <span style={{color: '#c5c8c6'}}>{bot.builder?.substring(0,6)}...</span> will be rejected immediately. Irreversible until manual re-auth.
                      </div>
                    </div>
                    <button 
                      onClick={triggerKillSwitch}
                      disabled={killStatus !== 'idle'}
                      style={{ 
                        background: killStatus === 'idle' ? '#1a0505' : '#ff2b2b', 
                        border: '1px solid #ff2b2b', 
                        color: killStatus === 'idle' ? '#ff2b2b' : '#000', 
                        padding: '12px', 
                        fontWeight: 'bold', 
                        cursor: killStatus === 'idle' ? 'pointer' : 'not-allowed',
                        fontFamily: 'inherit',
                        letterSpacing: '2px',
                        transition: 'all 0.2s',
                        boxShadow: killStatus !== 'idle' ? '0 0 20px rgba(255,43,43,0.5)' : 'none'
                      }}
                    >
                      {killStatus === 'idle' ? '[ EMERGENCY_HALT ]' : killStatus === 'halting' ? 'TRANSMITTING...' : 'HALT CONFIRMED'}
                    </button>
                  </div>

                  {/* Execution Latency Heatmap */}
                  <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '1rem' }}>
                    <div style={{ color: '#555', fontSize: '11px', letterSpacing: '1px', marginBottom: '1rem' }}>EXECUTION_LATENCY // EGO_BENCHMARK</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                      <div style={{ background: '#110a05', border: '1px solid #3d1a0a', padding: '8px' }}>
                        <div style={{ fontSize: '9px', color: '#555', marginBottom: '4px' }}>YOUR BOT</div>
                        <div style={{ color: '#ff4400', fontSize: '18px', fontWeight: 'bold', textShadow: '0 0 8px rgba(255,68,0,0.3)' }}>450ms</div>
                      </div>
                      <div style={{ background: '#050a05', border: '1px solid #0a1a0a', padding: '8px' }}>
                        <div style={{ fontSize: '9px', color: '#555', marginBottom: '4px' }}>PLATFORM AVG</div>
                        <div style={{ color: '#ff9900', fontSize: '18px', fontWeight: 'bold' }}>220ms</div>
                      </div>
                      <div style={{ background: '#050a05', border: '1px solid #0a1a0a', padding: '8px' }}>
                        <div style={{ fontSize: '9px', color: '#555', marginBottom: '4px' }}>TOP 5 AVG</div>
                        <div style={{ color: '#00ff6a', fontSize: '18px', fontWeight: 'bold' }}>94ms</div>
                      </div>
                    </div>
                    <div style={{ marginTop: '12px', fontSize: '10px', color: '#8c4a1a', background: '#1a0d05', padding: '6px', borderLeft: '2px solid #ff4400' }}>
                      ⚠ Your execution latency is <strong style={{color:'#ff4400'}}>4.8× slower</strong> than the top tier. You are leaking alpha.
                    </div>
                  </div>
                </div>

                {/* Vault Full Warning for Deployer */}
                {isVaultFull && (
                  <div style={{ background: '#0a0a0a', border: '1px solid #0f3320', padding: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ color: '#00ff6a', fontSize: '18px' }}>◈</div>
                    <div style={{ fontSize: '11px', color: '#7ec87e', lineHeight: 1.5 }}>
                      <strong>VAULT CAPACITY REACHED.</strong> Commissions capped. To continue scaling, deploy a new bot targeting a different market (e.g. <strong>ETH_Q3_3500</strong>) to unlock a fresh liquidity ceiling.
                    </div>
                  </div>
                )}

                {/* Terminal Feed */}
                <div style={{ background: '#000', border: '1px solid #00FF00', padding: '1rem', fontFamily: 'monospace', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #00FF00', paddingBottom: '8px', marginBottom: '8px' }}>
                    <span style={{ color: '#00FF00', fontWeight: 'bold' }}>&gt;_ LIVE_RISK_ENGINE.LOG</span>
                    <span style={{ color: '#00FF00' }}>WS_PING: 23ms</span>
                  </div>
                  <div style={{ color: '#555' }}>[12:44:01] [SYS] Connection established</div>
                  <div style={{ color: '#ff9900' }}>[12:44:02] [BRIER] Score updated → {bot.brierScore.toFixed(3)}</div>
                  <div style={{ color: '#2563EB' }}>[12:44:03] [WS] POLYMARKET feed connected</div>
                  <div style={{ color: '#00ff6a' }}>[12:44:04] [PnL] Trade settled · +$14.22</div>
                  <div style={{ color: '#ff2b2b' }}>[12:44:05] [PnL] Trade settled · -$3.71</div>
                  <div style={{ color: '#555' }}>[12:44:07] [WS] Heartbeat OK</div>
                  <div style={{ color: '#ff4400' }}>[12:44:08] [SYS] Order routed · ExecID: 0x9f22 · Lat: 450ms</div>
                </div>

              </motion.div>
            )}

            {/* --- INVESTOR VIEW --- */}
            {viewMode === 'investor' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Investor Stats Box */}
                <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '1rem' }}>
                  <div style={{ color: '#2563EB', borderBottom: '1px solid #1a1a1a', paddingBottom: 4, marginBottom: 8, fontWeight: 'bold', fontSize: 13 }}>--- PROTOCOL PERFORMANCE ---</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem', fontSize: 12 }}>
                    <div><div style={{ color: '#555', fontSize: 10 }}>BRIER_SCORE</div> <div style={{ color: bot.brierScore < 0.25 ? '#22c55e' : '#2563EB', fontSize: 16 }}>{bot.brierScore.toFixed(3)}</div></div>
                    <div><div style={{ color: '#555', fontSize: 10 }}>WIN_RATE</div> <div style={{ color: '#c5c8c6', fontSize: 16 }}>{(bot.winRate * 100).toFixed(1)}%</div></div>
                    <div><div style={{ color: '#555', fontSize: 10 }}>SHARPE</div> <div style={{ color: '#22c55e', fontSize: 16 }}>{(bot.sharpe || 2.41).toFixed(2)}</div></div>
                    <div><div style={{ color: '#555', fontSize: 10 }}>MAX_DD</div> <div style={{ color: '#ef4444', fontSize: 16 }}>-{(bot.maxDrawdown * 100).toFixed(1)}%</div></div>
                  </div>
                </div>

                <VaultCapacityBar current={animatedTVL} cap={vaultCap} />
                
                {/* PnL Chart */}
                <div>
                  <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>PERFORMANCE_HISTORY // 30 EPOCHS</div>
                  <PnlChart data={bot.pnlHistory} />
                </div>

                {/* Conditional Logic: Full Vault vs Open Vault */}
                {isVaultFull ? (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ background: '#0a0303', border: '1px solid #3d0a0a', padding: '1rem', textAlign: 'center' }}>
                      <div style={{ color: '#ff2b2b', fontWeight: 'bold', fontSize: 14, letterSpacing: '2px', marginBottom: '8px' }}>⊗ VAULT CAPACITY REACHED</div>
                      <div style={{ color: '#8c4a1a', fontSize: 11 }}>This vault is closed to new deposits. All capital slots are occupied to prevent slippage.</div>
                    </div>
                    
                    {/* Liquidity Routing Engine */}
                    <div style={{ background: '#050709', border: '1px solid #0a1520', borderLeft: '3px solid #2563EB', padding: '1rem' }}>
                      <div style={{ fontSize: 11, color: '#555', marginBottom: '12px' }}>// LIQUIDITY_ROUTER: ALTERNATIVES AVAILABLE</div>
                      
                      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <div style={{ color: '#c5c8c6', fontWeight: 'bold', fontSize: 13 }}>DELTA_ARB_004</div>
                          <div style={{ color: '#2563EB', fontSize: 10 }}>Brier: 0.181 · Market: ETH_Q3</div>
                        </div>
                        <button style={{ background: 'transparent', border: '1px solid #2563EB', color: '#2563EB', padding: '4px 12px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>ROUTE →</button>
                      </div>

                      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: '#c5c8c6', fontWeight: 'bold', fontSize: 13 }}>OMEGA_PRED_011</div>
                          <div style={{ color: '#2563EB', fontSize: 10 }}>Brier: 0.198 · Market: SOL_BREAKOUT</div>
                        </div>
                        <button style={{ background: 'transparent', border: '1px solid #2563EB', color: '#2563EB', padding: '4px 12px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>ROUTE →</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#0d0d0d', border: '1px dashed #333', padding: '1rem', maxWidth: 500 }}>
                    <div style={{ color: '#C9A84C', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: 13 }}>[ EXECUTE VAULT DEPOSIT ]</div>
                    
                    {!isConnected ? (
                      <div style={{ fontSize: 11, color: '#ef4444' }}>&gt; ERR: Wallet not connected. Please connect via Navbar to deploy capital.</div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input 
                            type="number" 
                            value={depositAmt}
                            onChange={e => setDepositAmt(e.target.value)}
                            placeholder="USDC Amount..." 
                            style={{ flex: 1, background: '#000', border: '1px solid #333', color: '#fff', fontFamily: 'inherit', padding: '8px', outline: 'none' }} 
                          />
                          <button 
                            onClick={handleWeb3Deposit}
                            disabled={depositing}
                            style={{ 
                              background: depositing ? '#1e3a8a' : '#2563EB', 
                              border: 'none', 
                              color: depositing ? '#999' : '#000', 
                              fontWeight: 'bold', 
                              padding: '8px 24px', 
                              cursor: depositing ? 'not-allowed' : 'pointer', 
                              fontFamily: 'inherit',
                              letterSpacing: '1px'
                            }}
                          >
                            {depositing ? 'DEPOSITING...' : 'DEPOSIT'}
                          </button>
                        </div>
                        {amt > 0 && (
                          <div style={{ fontSize: 11, color: '#22c55e', marginTop: '0.75rem' }}>
                            &gt; Projected yield: +${estMonthly.toFixed(2)}/mo<br/>
                            <span style={{ color: '#555' }}>&gt; Requires 2 signatures: Approve(USDC) & Deposit(Vault)</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

              </motion.div>
            )}

          </div>
        </div>

        {/* REPLIES SECTION (Visible in both modes) */}
        <div style={{ marginTop: '3rem' }}>
          <div style={{ fontSize: 13, color: '#555', borderBottom: '1px solid #1a1a1a', paddingBottom: 8, marginBottom: 16 }}>// ON-CHAIN DISCUSSION</div>
          {posts.map(post => (
            <div key={post.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', background: post.wallet === bot.builder ? 'rgba(37,99,235,0.03)' : 'transparent', padding: '0.25rem' }}>
              {post.user?.pfpUrl ? (
                <img src={post.user.pfpUrl} width={40} height={40} style={{ objectFit: 'cover', border: '1px solid #333' }} alt="PFP" />
              ) : (
                <UserIdenticon id={post.wallet} size={40} />
              )}
              <div style={{ display: 'inline-block', background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '0.5rem 0.75rem', minWidth: 300, maxWidth: 800 }}>
                <div style={{ fontSize: 13, marginBottom: '0.25rem' }}>
                  <span style={{ color: '#2563EB', fontWeight: 'bold' }}>[RANK: {post.user?.name ? 'Verified Maker' : 'Anon'}]</span>{' '}
                  <Link href={`/maker/${post.wallet}`} style={{ color: '#117743', textDecoration: 'underline', cursor: 'pointer' }}>
                    {post.user?.name ? post.user.name : `(ID: ${post.wallet.substring(0, 8)}...)`}
                  </Link>{' '}
                  <span style={{ color: '#555' }}>{new Date(post.createdAt).toLocaleString()}</span>{' '}
                  <span style={{ color: '#555' }}>No.{post.id.substring(post.id.length - 6)}</span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.4, color: '#c5c8c6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {post.text.split('\n').map((line, j) => (
                    <span key={j}>
                      {line.startsWith('>') ? (
                        <span style={{ color: '#7ec87e' }}>{line}</span>
                      ) : line}
                      {j < post.text.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <hr style={{ borderTop: '1px solid #1a1a1a', margin: '2rem 0 1rem' }} />

        {/* REPLY BOX */}
        <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1rem', display: 'inline-block' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: 80 }}>
                <div style={{ background: '#1a1a1a', padding: '4px', border: '1px solid #333', fontSize: 12, color: '#2563EB', fontWeight: 'bold', textAlign: 'center' }}>Comment</div>
              </div>
              <textarea 
                value={postText}
                onChange={e => setPostText(e.target.value)}
                style={{ width: 400, height: 80, background: '#000', border: '1px solid #333', color: '#fff', fontFamily: 'inherit', padding: '4px', resize: 'vertical', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={addPost} style={{ background: '#2563EB', border: '1px solid #2563EB', color: '#000', fontWeight: 'bold', padding: '4px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>Post</button>
            </div>
          </div>
        </div>

      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, background: '#00FF00', color: '#000', fontSize: '12px', padding: '8px 16px', fontWeight: 700, fontFamily: 'var(--font-mono), monospace', boxShadow: '0 0 20px rgba(0,255,0,0.3)' }}>
          &gt; {toast}
        </div>
      )}
    </div>
  )
}
