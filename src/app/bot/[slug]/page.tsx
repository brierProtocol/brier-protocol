'use client'

import { use, useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { getBotById } from '@/data/bots'
import { notFound } from 'next/navigation'
import BotIrisAvatar from '@/components/BotIrisAvatar'
import { botEye, makerEye } from '@/lib/botIdentity'
import { computeQuantitativeMood } from '@/lib/mood-engine'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { motion } from 'framer-motion'
import { Liveline } from 'liveline'
import type { LivelinePoint } from 'liveline'

const BRAND = '#ff2a4d'

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

// ── PnL Chart (Liveline) ── Institutional Brier Style ──
function PnlChart({ data, entryValue }: { data: number[], entryValue?: number }) {
  const [windowSecs, setWindowSecs] = useState(86400)
  const [isReady, setIsReady] = useState(false)

  const points = useMemo<LivelinePoint[]>(() => {
    if (!data || data.length === 0) return []
    const now = Math.floor(Date.now() / 1000)
    const spacing = Math.floor(86400 / Math.max(data.length, 1))
    return data.map((val, i) => ({
      time: now - (data.length - 1 - i) * spacing,
      value: val
    }))
  }, [data])

  const latestValue = data?.length > 0 ? data[data.length - 1] : 0
  const firstValue = data?.length > 0 ? data[0] : 0
  const pnlPct = firstValue > 0 ? ((latestValue - firstValue) / firstValue * 100) : 0
  const isPositive = pnlPct >= 0

  useEffect(() => {
    if (points.length > 0) {
      const timer = setTimeout(() => setIsReady(true), 100)
      return () => clearTimeout(timer)
    }
  }, [points])

  return (
    <div className="border border-[#1a1a1a] bg-[#050505] w-full mb-2 overflow-hidden">
      {/* PnL Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#555] tracking-widest">VAULT P&L</span>
          <span className={`text-[18px] font-bold ${isPositive ? 'text-[#00d4aa]' : 'text-[#ff2a4d]'}`}>
            {isPositive ? '+' : ''}{pnlPct.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#555]">NAV</span>
          <span className="text-[13px] text-white font-bold">
            ${latestValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 240 }}>
        <Liveline
          data={points}
          value={latestValue}
          color={BRAND}
          theme="dark"
          loading={!isReady}
          momentum
          scrub
          badge
          badgeVariant="minimal"
          fill
          pulse
          showValue={false}
          exaggerate
          window={windowSecs}
          windows={[
            { label: '15m', secs: 900 },
            { label: '1h', secs: 3600 },
            { label: '6h', secs: 21600 },
            { label: '12h', secs: 43200 },
            { label: '1d', secs: 86400 },
          ]}
          windowStyle="rounded"
          onWindowChange={(secs) => setWindowSecs(secs)}
          referenceLine={entryValue ? { value: entryValue, label: 'Entry' } : undefined}
          formatValue={(v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        />
      </div>
    </div>
  )
}

// ── Slime Vault Progress Bar (Refactored to Blood/Laser Theme) ──
function VaultCapacityBar({ current, cap }: { current: number, cap: number }) {
  const percentage = Math.min((current / cap) * 100, 100)
  const isFull = percentage >= 100
  
  return (
    <div className="my-4">
      <div className="flex justify-between mb-2 text-xs font-mono">
        <div className="text-[#666] font-bold">VAULT CAPACITY // ORACLE SYNCED</div>
        <div className={isFull ? 'text-primary font-bold animate-pulse' : 'text-white font-bold'}>
          {isFull ? 'CAPACITY REACHED / CLOSED' : `${percentage.toFixed(1)}% ALLOCATED`}
        </div>
      </div>
      
      <div className={`relative h-6 bg-[#030303] overflow-hidden ${isFull ? 'border border-primary shadow-[0_0_15px_rgba(255,42,77,0.15)]' : 'border border-[#1a1a1a]'}`}>
        <div 
          className="h-full relative transition-all duration-1000 ease-in-out"
          style={{ 
            width: `${percentage}%`,
            background: isFull 
              ? 'linear-gradient(90deg, #8a2b3e, #ff2a4d)' 
              : 'linear-gradient(90deg, #240a12, #ff2a4d)'
          }}
        >
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className={`font-bold text-[11px] tracking-widest ${percentage > 50 ? 'text-[#030303]' : 'text-primary'} ${percentage > 50 ? 'drop-shadow-none' : 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'}`}>
            ${current.toLocaleString()} / ${cap.toLocaleString()} USDC
          </span>
        </div>
      </div>
    </div>
  )
}

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
  
  const [viewMode, setViewMode] = useState<'investor' | 'creator'>('investor')
  const [killStatus, setKillStatus] = useState<'idle' | 'halting' | 'halted'>('idle')
  const [depositing, setDepositing] = useState(false)
  const [toast, setToast] = useState('')

  // Edit states
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editTagline, setEditTagline] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPfp, setEditPfp] = useState('')
  const [savingBot, setSavingBot] = useState(false)

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
    if (!confirm("WARNING: This will instantly reject all incoming API signals for this bot via FAK. Continue?")) return;
    setKillStatus('halting')
    showToast("[SYS] Transmitting EMERGENCY_HALT to Brier Protocol RPC...")
    setTimeout(() => {
      setKillStatus('halted')
      showToast("[CRITICAL] HotAPIKey suspended. FAK execution enforced.")
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
      if (!bot.vaultAddress) {
        alert("This bot does not have a vault address configured yet. Deposits are not available.")
        setDepositing(false)
        return
      }
      const vAddress = bot.vaultAddress
      
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
    if (!isConnected || !address) return alert("Please connect your wallet.")
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
      const res = await fetch(`/api/bots/${slug}`)
      if (res.ok) {
        const dbBot = await res.json()
        let dynamicPnl = [100, 105, 110, 108, 115, 120, 125, 130];
        if (dbBot.pnlSnapshots && dbBot.pnlSnapshots.length > 0) dynamicPnl = dbBot.pnlSnapshots.map((s: any) => s.pnlUsd);
        else if (dbBot.currentTVL > 0) dynamicPnl = [dbBot.currentTVL * 0.95, dbBot.currentTVL * 0.98, dbBot.currentTVL * 1.01, dbBot.currentTVL * 1.05, dbBot.currentTVL];

        // Safe null-checks for scores (PAPER bots have no scores)
        const latestScore = dbBot.scores && dbBot.scores.length > 0 ? dbBot.scores[0] : null;

        const mappedBot = {
          id: dbBot.id, name: dbBot.name, builder: dbBot.walletAddress, tagline: dbBot.tagline, pfpUrl: dbBot.pfpUrl,
          description: dbBot.description || dbBot.tagline, mood: dbBot.mood || 'neutral',
          status: dbBot.status || 'PAPER', 
          brierScore: latestScore?.brierScore ?? null,
          winRate: latestScore?.winRate ?? null,
          sharpe: latestScore?.sharpe ?? null,
          maxDrawdown: latestScore?.maxDrawdown ?? null,
          totalTrades: latestScore?.totalTrades ?? null,
          totalVolume: latestScore?.totalVolume ?? null,
          tier: dbBot.tier || 'NONE',
          color: dbBot.color,
          eyeShape: dbBot.eyeShape,
          createdAt: dbBot.createdAt,
          monthlyYield: 0,
          tvl: dbBot.currentTVL || 0, vaultCap: 50000, markets: [dbBot.marketType || 'SPOT'],
          pnlHistory: dynamicPnl, vaultAddress: dbBot.vaultAddress, dbTradeEvents: dbBot.trades || []
        }
        
        setBot(mappedBot)
        setEditName(mappedBot.name)
        setEditTagline(mappedBot.tagline || '')
        setEditDesc(mappedBot.description || '')
        setEditPfp(mappedBot.pfpUrl || '')
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
          market: t.marketTitle, predicted: t.side || "YES", probability: t.entryPrice ?? 0.5,
          actualOutcome: t.outcome === "PENDING" ? null : (t.outcome === "WIN" ? 1 : 0)
        })))
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

  const handleSaveBot = async () => {
    if (!address) return
    setSavingBot(true)
    try {
      const res = await fetch(`/api/bots/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, name: editName, tagline: editTagline, description: editDesc, pfpUrl: editPfp })
      })
      if (res.ok) {
        const updated = await res.json()
        setBot({ ...bot, name: updated.name, tagline: updated.tagline, description: updated.description, pfpUrl: updated.pfpUrl })
        setIsEditing(false)
        showToast("PROTOCOL_UPDATED_SUCCESSFULLY")
      } else {
        const err = await res.json()
        alert("Failed to update bot: " + (err.error || res.statusText))
      }
    } catch (e: any) {
      alert("Error saving bot: " + e.message)
    }
    setSavingBot(false)
  }

  if (loading) return <div className="min-h-screen bg-[#030303] text-[#888] p-8 font-mono">&gt; Loading Database...</div>
  if (!bot) return notFound()

  const amt = parseFloat(depositAmt) || 0
  const estMonthly = amt * (bot.monthlyYield / 100)
  const currentMoodState = computeQuantitativeMood({ recentDrawdown: 0.05, winRate: 0.58, recentPositives: 6 });

  return (
    <div className="min-h-screen bg-[#030303] font-sans text-[#e8e8e8] p-8">
      
      {/* HEADER BAR */}
      <div className="max-w-6xl mx-auto mb-6 flex justify-between items-center border-b border-[#1a1a1a] pb-2">
        <div className="flex items-center gap-4 text-base font-bold">
          <Link href="/discover" className="text-[#888] hover:text-white transition-colors no-underline">← Back</Link>
          <span className="text-white tracking-tight font-bold">Brier Protocol</span>
          
          <div className="flex gap-[2px] bg-[#0a0a0a] border border-[#1a1a1a] p-[2px] ml-4 rounded">
            <button onClick={() => setViewMode('creator')} className={`border-none px-3 py-1 text-[11px] font-sans font-medium cursor-pointer rounded transition-colors ${viewMode === 'creator' ? 'bg-[#1a1a1a] text-white' : 'bg-transparent text-[#666]'}`}>Deployer</button>
            <button onClick={() => setViewMode('investor')} className={`border-none px-3 py-1 text-[11px] font-sans font-medium cursor-pointer rounded transition-colors ${viewMode === 'investor' ? 'bg-[#1a1a1a] text-white' : 'bg-transparent text-[#666]'}`}>Investor</button>
          </div>
        </div>
        <div className="text-xs text-[#666]">
          <Link href="/dashboard" className="text-[#888] hover:text-white transition-colors">Dashboard</Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="flex gap-4 mb-4">
          
          {/* OP Content */}
          <div className="flex-1">
            <div className="flex items-start gap-6 mb-5 border-b border-[#222] pb-5">
              <div className="shrink-0 rounded-full" style={{ boxShadow: `0 0 28px ${botEye({ slug, id: bot.id, name: bot.name, color: bot.color }).accentColor}33` }}>
                {bot.pfpUrl ? (
                  <img src={bot.pfpUrl} alt={bot.name} className="w-20 h-20 rounded-full border-2 border-primary object-cover" />
                ) : (
                  <BotIrisAvatar {...botEye({ slug, id: bot.id, name: bot.name, color: bot.color, eyeShape: bot.eyeShape })} size={80} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-white font-bold text-2xl tracking-tight m-0">{bot.name}</h1>
                  <span className="font-mono text-[10px] tracking-widest px-2 py-1 border border-[#222] text-[#888] bg-[#0a0a0a]">{bot.status}</span>
                </div>
                {bot.tagline && <div className="text-[#888] text-xs mb-3 font-sans">{bot.tagline}</div>}

                {/* CREATOR — link to maker profile */}
                {bot.builder && (
                  <Link
                    href={`/maker/${bot.builder}`}
                    className="inline-flex items-center gap-2 group no-underline bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#333] pl-1.5 pr-3 py-1.5 transition-colors"
                  >
                    <span className="rounded-full overflow-hidden shrink-0">
                      <BotIrisAvatar {...makerEye(bot.builder)} size={22} />
                    </span>
                    <span className="flex flex-col leading-tight">
                      <span className="text-[8px] font-mono text-[#555] tracking-widest">DEPLOYED_BY</span>
                      <span className="text-[11px] font-mono text-[#aaa] group-hover:text-primary transition-colors">
                        {bot.builder.substring(0, 6)}…{bot.builder.substring(bot.builder.length - 4)}
                      </span>
                    </span>
                    <span className="text-[#444] group-hover:text-primary transition-colors ml-1">→</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="text-[13px] leading-relaxed text-[#999] mb-4 whitespace-pre-wrap font-sans">
              {bot.description}
            </div>

            <div className="flex gap-4 mb-6">
              <button 
                onClick={toggleHeart}
                className={`font-mono text-[11px] px-3 py-1 border transition-colors cursor-pointer ${hearted ? 'border-primary text-[#030303] bg-primary' : 'border-[#1a1a1a] text-[#888] bg-transparent hover:border-primary hover:text-primary'}`}
              >
                [{hearted ? '♥ HEARTED' : '♡ HEART'}] ({hearts})
              </button>
            </div>

            {/* --- DEPLOYER VIEW --- */}
            {viewMode === 'creator' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
                
                {/* Edit Protocol Config */}
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 mb-2">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-white font-sans font-bold text-[13px] tracking-tight">Protocol Configuration</div>
                    <button 
                      onClick={() => setIsEditing(!isEditing)}
                      className="bg-transparent border border-primary text-primary px-3 py-1 font-mono text-[11px] cursor-pointer hover:bg-primary hover:text-[#030303] transition-colors"
                    >
                      {isEditing ? '[CANCEL]' : '[EDIT_PROTOCOL]'}
                    </button>
                  </div>

                  {isEditing && (
                    <div className="flex flex-col gap-4 mt-4 border-t border-[#1a1a1a] pt-4">
                      <div>
                        <label className="text-[10px] text-[#666] block mb-1 tracking-wide uppercase font-sans">Display Name</label>
                        <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-[#080808] border border-[#1a1a1a] text-white p-2 font-mono text-[12px] outline-none focus:border-[#333] transition-colors" />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#666] block mb-1 tracking-wide uppercase font-sans">Tagline</label>
                        <input value={editTagline} onChange={e => setEditTagline(e.target.value)} className="w-full bg-[#080808] border border-[#1a1a1a] text-white p-2 font-mono text-[12px] outline-none focus:border-[#333] transition-colors" />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#666] block mb-1 tracking-wide uppercase font-sans">Algorithm Description</label>
                        <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full h-24 bg-[#080808] border border-[#1a1a1a] text-white p-2 font-mono text-[12px] outline-none resize-y focus:border-[#333] transition-colors" />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#666] block mb-1 tracking-wide uppercase font-sans">Profile Image</label>
                        <input 
                          type="file" accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const reader = new FileReader()
                            reader.onload = (event) => {
                              const img = new Image()
                              img.onload = () => {
                                const canvas = document.createElement('canvas')
                                const SIZE = 200
                                canvas.width = SIZE
                                canvas.height = SIZE
                                const ctx = canvas.getContext('2d')
                                if (!ctx) return
                                const scale = Math.max(SIZE / img.width, SIZE / img.height)
                                const x = (SIZE - img.width * scale) / 2
                                const y = (SIZE - img.height * scale) / 2
                                ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
                                const base64 = canvas.toDataURL('image/jpeg', 0.8)
                                setEditPfp(base64)
                              }
                              img.src = event.target?.result as string
                            }
                            reader.readAsDataURL(file)
                          }}
                          className="w-full bg-[#080808] border border-[#1a1a1a] text-white p-2 font-mono text-[12px] outline-none" 
                        />
                        {editPfp && (
                          <div className="mt-2 flex items-center gap-2">
                            <img src={editPfp} alt="Preview" className="w-10 h-10 object-cover border border-[#1a1a1a] rounded" />
                            <span className="text-[10px] text-[#00d4aa]">Image ready</span>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={handleSaveBot} disabled={savingBot}
                        className="bg-primary text-[#030303] border-none font-bold py-2 mt-2 cursor-pointer disabled:opacity-50 hover:shadow-[0_0_15px_rgba(255,42,77,0.4)]"
                      >
                        {savingBot ? '[SAVING...]' : '[COMMIT_CHANGES]'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Kill Switch & Latency Heatmap Grid */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Nuclear Kill Switch */}
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 flex flex-col justify-between">
                    <div>
                      <div className="text-primary font-sans font-bold text-[13px] mb-2 tracking-tight drop-shadow-[0_0_5px_rgba(255,42,77,0.8)]">Nuclear Kill Switch</div>
                      <div className="text-[11px] text-[#888] leading-relaxed mb-4 font-sans">
                        Sends HALT signal to Brier API. All pending transactions on HotAPIKey <span className="text-primary font-mono">{bot.builder?.substring(0,6)}...</span> will be rejected via Fill-And-Kill (FAK) protocol.
                      </div>
                    </div>
                    <button 
                      onClick={triggerKillSwitch}
                      disabled={killStatus !== 'idle'}
                      className={`font-mono font-bold tracking-widest p-3 transition-all ${
                        killStatus === 'idle' 
                          ? 'bg-[#1a0505] border border-primary text-primary cursor-pointer hover:bg-primary hover:text-[#030303] shadow-[0_0_15px_rgba(255,42,77,0.15)]' 
                          : 'bg-primary border border-primary text-[#030303] cursor-not-allowed shadow-[0_0_25px_rgba(255,42,77,0.4)]'
                      }`}
                    >
                      {killStatus === 'idle' ? '[ EMERGENCY_HALT ]' : killStatus === 'halting' ? 'TRANSMITTING...' : 'HALT CONFIRMED'}
                    </button>
                  </div>

                  {/* Execution Terminal Feed */}
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 font-mono text-[11px]">
                    <div className="flex justify-between border-b border-[#1a1a1a] pb-2 mb-2">
                      <span className="text-white font-bold">&gt;_ EXECUTION_ROUTER.LOG</span>
                      <span className="text-[#555]">HEARTBEAT: 4.0s</span>
                    </div>
                    <div className="text-[#666]">[12:44:01] [SYS] WebSocket Connection OK</div>
                    <div className="text-[#00d4aa]">[12:44:02] [FEE] Crypto Route Active: 0.07%</div>
                    <div className="text-[#00d4aa]">[12:44:03] [WS] Polymarket CLOB Synced</div>
                    <div className="text-[#666]">[12:44:04] [RULE] Emergency Execution: FAK Enforced</div>
                  </div>
                </div>

              </motion.div>
            )}

            {/* --- INVESTOR VIEW --- */}
            {viewMode === 'investor' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
                
                {/* Quantitative Performance — Brier-grade metrics */}
                {(() => {
                  const b = bot.brierScore
                  const grade = b == null ? null
                    : b <= 0.15 ? { t: 'ELITE',    c: '#00d4aa' }
                    : b <= 0.25 ? { t: 'STRONG',   c: '#C8FF00' }
                    : b <= 0.40 ? { t: 'MODERATE', c: '#C9A84C' }
                    :             { t: 'WEAK',     c: '#ff3b3b' }
                  // Brier ranges 0 (perfect) → 0.25 (coin-flip baseline). Bar fills as it approaches 0.
                  const brierFill = b == null ? 0 : Math.max(0, Math.min(100, (1 - b / 0.5) * 100))
                  const sharpeGood = (bot.sharpe ?? 0) >= 1.5
                  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`
                  // ROI from the equity curve, age from creation date
                  const ph = bot.pnlHistory || []
                  const roi = ph.length > 1 && ph[0] > 0 ? ((ph[ph.length - 1] - ph[0]) / ph[0]) * 100 : null
                  const ageDays = bot.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(bot.createdAt).getTime()) / 86400000)) : null
                  return (
                    <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4">
                      <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-2 mb-3">
                        <div className="text-white font-mono font-bold text-[12px] tracking-widest">QUANTITATIVE_PERFORMANCE</div>
                        {grade && (
                          <span className="text-[9px] font-mono px-2 py-0.5" style={{ color: grade.c, background: `${grade.c}14`, border: `0.5px solid ${grade.c}44` }}>
                            {grade.t}
                          </span>
                        )}
                      </div>

                      {/* Hero: Brier score with grade bar */}
                      <div className="mb-4">
                        <div className="flex items-end justify-between mb-1">
                          <span className="text-[#666] text-[10px] font-mono tracking-widest">BRIER_SCORE</span>
                          <span className="text-[9px] text-[#444] font-mono">0 = perfect · ≤0.25 = strong</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono font-bold text-3xl" style={{ color: grade?.c || '#fff' }}>
                            {b !== null ? b.toFixed(3) : '—'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#030303] border border-[#1a1a1a] mt-2 overflow-hidden">
                          <motion.div className="h-full" style={{ background: grade?.c || '#333' }} initial={{ width: 0 }} animate={{ width: `${brierFill}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
                        </div>
                      </div>

                      {/* Metric grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#1a1a1a] border border-[#1a1a1a]">
                        {[
                          { label: 'WIN_RATE',  value: bot.winRate != null ? `${(bot.winRate * 100).toFixed(1)}%` : '—', color: 'text-white' },
                          { label: 'SHARPE',    value: bot.sharpe != null ? bot.sharpe.toFixed(2) : '—', color: sharpeGood ? 'text-[#C8FF00]' : 'text-white' },
                          { label: 'ROI',       value: roi != null ? `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%` : '—', color: roi != null && roi >= 0 ? 'text-[#C8FF00]' : 'text-[#ff3b3b]' },
                          { label: 'MAX_DD',    value: bot.maxDrawdown != null ? `-${(Math.abs(bot.maxDrawdown) * 100).toFixed(1)}%` : '—', color: 'text-[#ff3b3b]' },
                          { label: 'TRADES',    value: bot.totalTrades != null ? bot.totalTrades.toLocaleString() : '—', color: 'text-white' },
                          { label: 'VOLUME',    value: bot.totalVolume != null ? fmt(bot.totalVolume) : '—', color: 'text-white' },
                          { label: 'AGE',       value: ageDays != null ? `${ageDays}d` : '—', color: 'text-white' },
                          { label: 'TIER',      value: bot.tier && bot.tier !== 'NONE' ? bot.tier : '—', color: 'text-primary' },
                        ].map((m) => (
                          <div key={m.label} className="bg-[#0a0a0a] p-3">
                            <div className="text-[#555] text-[9px] font-mono tracking-widest mb-1">{m.label}</div>
                            <div className={`font-mono font-bold text-sm ${m.color}`}>{m.value}</div>
                          </div>
                        ))}
                      </div>

                      {bot.totalTrades != null && bot.totalTrades < 50 && (
                        <div className="text-[9px] text-[#C9A84C] font-mono mt-3">
                          ⚠ LOW_SAMPLE — Brier needs ≥50 resolved trades for statistical confidence ({bot.totalTrades}/50)
                        </div>
                      )}
                    </div>
                  )
                })()}

                <VaultCapacityBar current={animatedTVL} cap={vaultCap} />
                
                {/* PnL Chart */}
                <PnlChart data={bot.pnlHistory} entryValue={bot.pnlHistory?.[0]} />

                {bot.status === 'PAPER' ? (
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] border-dashed p-4 text-center">
                    <div className="text-white font-sans font-bold text-[13px] mb-2 tracking-tight">Incubation Phase</div>
                    <div className="text-[11px] text-[#888] font-sans">This algorithm is currently paper-trading. Vault deposits are locked until 30-day epoch completes.</div>
                  </div>
                ) : isVaultFull ? (
                  <div className="grid gap-4">
                    <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 text-center">
                      <div className="text-primary font-sans font-bold text-[14px] tracking-tight mb-2">Vault Capacity Reached</div>
                      <div className="text-[#888] text-[11px] font-sans">This vault is closed to new deposits.</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 max-w-lg">
                    <div className="text-white font-sans font-bold mb-2 text-[13px] tracking-tight">Deposit to Vault</div>
                    
                    {!isConnected ? (
                      <div className="text-[11px] text-[#888] font-sans">Wallet not connected. Please connect via Navbar to deploy capital.</div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            value={depositAmt}
                            onChange={e => setDepositAmt(e.target.value)}
                            placeholder="USDC Amount..." 
                            className="flex-1 bg-[#030303] border border-[#1a1a1a] text-white font-mono p-2 outline-none placeholder:text-[#333] focus:border-[#333] transition-colors"
                          />
                          <button 
                            onClick={handleWeb3Deposit}
                            disabled={depositing}
                            className={`border-none font-bold px-6 py-2 font-mono tracking-widest transition-all ${
                              depositing 
                                ? 'bg-border text-muted cursor-not-allowed' 
                                : 'bg-primary text-[#030303] cursor-pointer shadow-[0_0_15px_rgba(255,42,77,0.15)] hover:shadow-[0_0_25px_rgba(255,42,77,0.4)]'
                            }`}
                          >
                            {depositing ? 'PROCESSING...' : 'DEPOSIT'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

              </motion.div>
            )}

          </div>
        </div>

        {/* --- SOCIAL FEEDBACK THREAD --- */}
        <div className="mt-12 border-t border-[#1a1a1a] pt-8">
          <div className="text-white font-sans font-bold text-[13px] mb-4 tracking-tight">Community Feedback</div>
          
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 mb-8">
            <textarea
              value={postText}
              onChange={e => setPostText(e.target.value)}
              placeholder="> Initialize feedback log..."
              className="w-full h-20 bg-[#030303] border border-[#1a1a1a] text-white font-mono p-2 outline-none placeholder:text-[#333] focus:border-[#333] resize-none mb-2"
            />
            <div className="flex justify-end">
              <button onClick={addPost} className="bg-primary border border-primary text-[#030303] hover:shadow-[0_0_15px_rgba(255,42,77,0.4)] font-sans text-[11px] font-bold px-4 py-1 cursor-pointer transition-all rounded">
                Post Comment
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {posts.length === 0 ? (
              <div className="text-[#555] text-[11px] italic font-sans">No comments yet. Be the first to share your thoughts.</div>
            ) : (
              posts.map((p, i) => (
                <div key={p.id || i} className="border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-[10px] text-muted font-bold">
                      <span className="text-white font-sans">{p.user?.name || 'Anonymous'}</span>
                      <span className="ml-2">({p.wallet.substring(0,6)}...{p.wallet.substring(p.wallet.length-4)})</span>
                    </div>
                    <div className="text-[9px] text-[#555]">
                      {new Date(p.createdAt || Date.now()).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-[12px] text-[#EFEFEF] leading-relaxed whitespace-pre-wrap">
                    {p.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-8 right-8 z-[9999] bg-primary text-[#030303] text-xs px-4 py-2 font-bold font-mono shadow-[0_0_20px_rgba(255,42,77,0.4)]">
          &gt; {toast}
        </div>
      )}
    </div>
  )
}
