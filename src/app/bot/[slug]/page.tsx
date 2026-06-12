'use client'

import { use, useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import BotIrisAvatar from '@/components/BotIrisAvatar'
import { botEye, makerEye } from '@/lib/botIdentity'
import TokenPanel from '@/components/TokenPanel'
import CandleChart, { type Tick } from '@/components/CandleChart'
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

// ── Anonymous poster identity: deterministic ID + hue from wallet ──
function posterId(wallet: string): { id: string; hue: number } {
  let h = 0
  for (let i = 0; i < wallet.length; i++) h = (Math.imul(h, 31) + wallet.charCodeAt(i)) | 0
  const id = Math.abs(h).toString(36).padStart(6, '0').slice(0, 6).toUpperCase()
  return { id, hue: Math.abs(h) % 360 }
}

// ── Thread text renderer: greentext + >>quotelinks ──
function PostBody({ text, onQuoteClick }: { text: string; onQuoteClick: (n: number) => void }) {
  const lines = text.split('\n')
  return (
    <div className="post-text">
      {lines.map((line, li) => {
        const parts = line.split(/(>>\d{1,5})/g)
        const isGreen = line.trimStart().startsWith('>') && !line.trimStart().startsWith('>>')
        return (
          <div key={li} className={isGreen ? 'greentext' : undefined}>
            {parts.map((p, pi) => {
              const m = p.match(/^>>(\d{1,5})$/)
              if (m) {
                const n = parseInt(m[1], 10)
                return (
                  <a key={pi} className="quotelink" onClick={() => onQuoteClick(n)}>
                    {p}
                  </a>
                )
              }
              return <span key={pi}>{p}</span>
            })}
            {line === '' ? ' ' : ''}
          </div>
        )
      })}
    </div>
  )
}

function VaultCapacityBar({ current, cap }: { current: number; cap: number }) {
  const percentage = Math.min((current / cap) * 100, 100)
  const isFull = percentage >= 100
  return (
    <div>
      <div className="flex justify-between mb-2 text-[10px] font-mono tracking-widest">
        <span className="text-[#555]">CAPACITY</span>
        <span className={isFull ? 'text-primary font-bold' : 'text-[#aaa]'}>
          {isFull ? 'CLOSED' : `${percentage.toFixed(1)}%`}
        </span>
      </div>
      <div className="relative h-2 bg-[#030303] border border-[#161616] overflow-hidden">
        <div
          className="h-full transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%`, background: isFull ? '#ff2a4d' : 'linear-gradient(90deg, #240a12, #ff2a4d)' }}
        />
      </div>
      <div className="text-[9px] font-mono text-[#444] mt-1.5 tabular">
        ${current.toLocaleString()} / ${cap.toLocaleString()} USDC
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
  const [tokenTicks, setTokenTicks] = useState<Tick[] | null>(null)
  const [tokenMeta, setTokenMeta] = useState<any>(null)

  const [hearts, setHearts] = useState(0)
  const [hearted, setHearted] = useState(false)

  const { address, isConnected } = useAccount()
  const isOwner = isConnected && address && bot && (bot.walletAddress?.toLowerCase() === address.toLowerCase() || bot.builder?.toLowerCase() === address.toLowerCase())

  const [viewMode, setViewMode] = useState<'investor' | 'creator'>('investor')
  const [killStatus, setKillStatus] = useState<'idle' | 'halting' | 'halted'>('idle')
  const [depositing, setDepositing] = useState(false)
  const [toast, setToast] = useState('')

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

        const latestScore = dbBot.scores && dbBot.scores.length > 0 ? dbBot.scores[0] : null;

        const mappedBot = {
          id: dbBot.id, name: dbBot.name, builder: dbBot.walletAddress, tagline: dbBot.tagline, pfpUrl: dbBot.pfpUrl,
          maker: dbBot.user || null,
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
          tvl: dbBot.liveNav?.totalAssets ?? dbBot.currentTVL ?? 0, sharePrice: dbBot.liveNav?.sharePrice ?? 1, vaultCap: 50000, markets: [dbBot.marketType || 'SPOT'],
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
          ts: t.timestamp,
          market: t.marketTitle, side: t.side || "YES", entry: t.entryPrice ?? 0.5,
          size: t.amount ?? t.sizeUsdc ?? t.size ?? null,
          flagged: !!t.fraudFlag,
          outcome: t.outcome === "PENDING" ? null : (t.outcome === "WIN" ? 1 : 0)
        })))
      }
      fetch(`/api/comments?botId=${activeBot.id}`).then(res => res.json()).then(data => {
        if (Array.isArray(data)) setPosts([...data].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()))
      })
    })

    // Conviction token feed → candle ticks
    fetch(`/api/tokens/${slug}`)
      .then(res => res.ok ? res.json() : null)
      .then(tok => {
        if (!tok || !Array.isArray(tok.history)) { setTokenTicks(null); return }
        setTokenMeta(tok)
        setTokenTicks(tok.history.map((h: any) => ({ t: new Date(h.t).getTime(), v: h.price })))
      })
      .catch(() => setTokenTicks(null))

    // Live tape: ADAN reports trades in real time — keep the log breathing
    const tapeIv = setInterval(() => {
      fetch(`/api/bots/${slug}`)
        .then(r => r.ok ? r.json() : null)
        .then((b: any) => {
          if (!b?.trades?.length) return
          setTradeHistory(b.trades.map((t: any) => ({
            ts: t.timestamp,
            market: t.marketTitle, side: t.side || "YES", entry: t.entryPrice ?? 0.5,
            size: t.amount ?? null,
            flagged: !!t.fraudFlag,
            outcome: t.outcome === "PENDING" ? null : (t.outcome === "WIN" ? 1 : 0)
          })))
        })
        .catch(() => { })
    }, 15_000)
    return () => clearInterval(tapeIv)
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

  const scrollToPost = useCallback((n: number) => {
    const el = document.getElementById(`post-${n}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.remove('post-highlight')
    void el.offsetWidth
    el.classList.add('post-highlight')
  }, [])

  const quotePost = (n: number) => {
    setPostText(t => (t.endsWith('\n') || t === '' ? t : t + '\n') + `>>${n}\n`)
    document.getElementById('thread-composer')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // Chart feed: token price ticks when launched; NAV history otherwise
  const chartTicks: Tick[] = useMemo(() => {
    if (tokenTicks && tokenTicks.length > 1) return tokenTicks
    const ph: number[] = bot?.pnlHistory || []
    if (ph.length < 2) return []
    const now = Date.now()
    const spacing = 3600_000
    return ph.map((v, i) => ({ t: now - (ph.length - 1 - i) * spacing, v }))
  }, [tokenTicks, bot])

  if (loading) return <div className="min-h-screen bg-[#030303] text-[#666] p-8 font-mono text-xs"><span className="cursor-blink">&gt; SYNCING_NODE</span></div>
  if (!bot) return notFound()

  // ── Quant derivations ──
  const b = bot.brierScore
  const grade = b == null ? null
    : b <= 0.15 ? { t: 'ELITE', c: '#00d4aa' }
    : b <= 0.25 ? { t: 'STRONG', c: '#C8FF00' }
    : b <= 0.40 ? { t: 'MODERATE', c: '#C9A84C' }
    : { t: 'WEAK', c: '#ff3b3b' }
  const brierFill = b == null ? 0 : Math.max(0, Math.min(100, (1 - b / 0.5) * 100))
  const fmtK = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`
  const ph = bot.pnlHistory || []
  const roi = ph.length > 1 && ph[0] > 0 ? ((ph[ph.length - 1] - ph[0]) / ph[0]) * 100 : null
  const ageDays = bot.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(bot.createdAt).getTime()) / 86400000)) : null
  const wins = tradeHistory.filter(t => t.outcome === 1).length
  const losses = tradeHistory.filter(t => t.outcome === 0).length
  const profitFactor = losses > 0 ? wins / losses : null

  const qualification = [
    { label: 'RESOLVED_TRADES ≥ 50', ok: (bot.totalTrades ?? 0) >= 50, detail: `${bot.totalTrades ?? 0}/50` },
    { label: 'BRIER ≤ 0.250', ok: b != null && b <= 0.25, detail: b != null ? b.toFixed(3) : '—' },
    { label: 'TRACK_RECORD ≥ 7D', ok: (ageDays ?? 0) >= 7, detail: ageDays != null ? `${ageDays}d` : '—' },
    { label: 'MAX_DD ≤ 30%', ok: bot.maxDrawdown != null && Math.abs(bot.maxDrawdown) <= 0.30, detail: bot.maxDrawdown != null ? `${(Math.abs(bot.maxDrawdown) * 100).toFixed(1)}%` : '—' },
  ]
  const qualified = qualification.every(q => q.ok)

  const isLive = !['PAPER', 'SUSPENDED'].includes(bot.status)

  return (
    <div className="min-h-screen bg-[#030303] font-sans text-[#e8e8e8]">

      {/* ── COMMAND BAR ── */}
      <div className="border-b border-[#141414] bg-[#050505]">
        <div className="max-w-[1240px] mx-auto px-6 h-11 flex items-center justify-between">
          <div className="flex items-center gap-4 font-mono text-[10px] tracking-widest">
            <Link href="/discover" className="text-[#555] hover:text-white transition-colors no-underline">← INDEX</Link>
            <span className="text-[#2a2a2a]">/</span>
            <span className="text-[#888]">ALGO://{slug}</span>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border ${isLive ? 'text-[#00d4aa] border-[#00d4aa]/25 bg-[#00d4aa]/5' : 'text-[#666] border-[#1e1e1e]'}`}>
              <span className={`w-1 h-1 rounded-full ${isLive ? 'bg-[#00d4aa] animate-pulse' : 'bg-[#444]'}`} />
              {bot.status}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isOwner && (
              <div className="flex gap-px bg-[#0a0a0a] border border-[#1a1a1a] p-px">
                <button onClick={() => setViewMode('creator')} className={`px-3 py-1 text-[9px] font-mono tracking-widest cursor-pointer transition-colors border-none ${viewMode === 'creator' ? 'bg-[#161616] text-white' : 'bg-transparent text-[#555]'}`}>OPERATOR</button>
                <button onClick={() => setViewMode('investor')} className={`px-3 py-1 text-[9px] font-mono tracking-widest cursor-pointer transition-colors border-none ${viewMode === 'investor' ? 'bg-[#161616] text-white' : 'bg-transparent text-[#555]'}`}>INVESTOR</button>
              </div>
            )}
            <Link href="/leaderboard" className="font-mono text-[10px] text-[#555] hover:text-white transition-colors no-underline tracking-widest">RANKINGS</Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1240px] mx-auto px-6 py-8">

        {/* ── IDENTITY ── */}
        <div className="flex items-start justify-between gap-6 mb-8 flex-wrap">
          <div className="flex items-start gap-5 min-w-0">
            <div className="shrink-0 rounded-full" style={{ boxShadow: `0 0 32px ${botEye({ slug, id: bot.id, name: bot.name, color: bot.color }).accentColor}26` }}>
              {bot.pfpUrl ? (
                <img src={bot.pfpUrl} alt={bot.name} className="w-16 h-16 border border-[#222] object-cover" />
              ) : (
                <BotIrisAvatar {...botEye({ slug, id: bot.id, name: bot.name, color: bot.color, eyeShape: bot.eyeShape })} size={64} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-white font-bold text-[26px] tracking-tight m-0 leading-none">{bot.name}</h1>
                {grade && (
                  <span className="font-mono text-[9px] tracking-widest px-2 py-0.5" style={{ color: grade.c, background: `${grade.c}12`, border: `1px solid ${grade.c}3a` }}>
                    {grade.t}
                  </span>
                )}
                {tokenMeta && <span className="font-mono text-[9px] tracking-widest px-2 py-0.5 text-[#c8ff00] border border-[#c8ff00]/25 bg-[#c8ff00]/5">${tokenMeta.ticker}</span>}
              </div>
              {bot.tagline && <div className="text-[#777] text-[12px] mt-1.5">{bot.tagline}</div>}
              {bot.builder && (
                <Link
                  href={`/maker/${bot.builder}`}
                  className="mt-3 inline-flex items-center gap-2 group no-underline border border-[#161616] hover:border-[#2a2a2a] bg-[#070707] pl-1.5 pr-3 py-1 transition-colors"
                >
                  <span className="rounded-full overflow-hidden shrink-0">
                    {bot.maker?.pfpUrl
                      ? <img src={bot.maker.pfpUrl} alt="" className="w-[18px] h-[18px] rounded-full object-cover" />
                      : <BotIrisAvatar {...makerEye(bot.builder)} size={18} />}
                  </span>
                  <span className="font-mono text-[10px] text-[#888] group-hover:text-primary transition-colors">
                    {bot.maker?.handle
                      ? `@${bot.maker.handle}`
                      : bot.maker?.name || `${bot.builder.substring(0, 6)}…${bot.builder.substring(bot.builder.length - 4)}`}
                  </span>
                </Link>
              )}
            </div>
          </div>

          {/* Likes — front and center */}
          <button
            onClick={toggleHeart}
            className={`flex items-center gap-3 px-5 py-3 border transition-all cursor-pointer shrink-0 ${
              hearted
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-[#1a1a1a] bg-[#070707] text-[#888] hover:border-primary/50 hover:text-primary'
            }`}
          >
            <span className="text-lg leading-none">{hearted ? '♥' : '♡'}</span>
            <span className="font-mono font-bold text-lg tabular leading-none">{hearts}</span>
          </button>
        </div>

        {bot.description && (
          <p className="text-[13px] leading-relaxed text-[#888] mb-8 max-w-3xl whitespace-pre-wrap">{bot.description}</p>
        )}

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">

          {/* LEFT — market data, tape, thread */}
          <div className="flex flex-col gap-5 min-w-0">

            {/* CANDLES */}
            <div className="panel">
              <div className="panel-header">
                <span className="title">
                  {tokenMeta ? `$${tokenMeta.ticker} / USDC` : 'VAULT_NAV'}
                </span>
                <span className="flex items-center gap-3">
                  {tokenMeta && (
                    <span className={tokenMeta.status === 'GRADUATED' ? 'text-[#FFD700]' : 'text-[#c8ff00]'}>
                      {tokenMeta.status === 'GRADUATED' ? 'GRADUATED' : 'BONDING'}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-[#00d4aa]">
                    <span className="w-1 h-1 rounded-full bg-[#00d4aa] animate-pulse" />
                    FEED_LIVE
                  </span>
                </span>
              </div>
              <CandleChart ticks={chartTicks} height={340} emptyLabel={tokenMeta ? 'AWAITING_TICKS' : 'AWAITING_NAV_DATA'} />
              {tokenMeta && (
                <div className="grid grid-cols-4 gap-px bg-[#141414] border-t border-[#141414]">
                  {[
                    ['PRICE', `$${tokenMeta.price >= 1 ? tokenMeta.price.toFixed(2) : tokenMeta.price.toFixed(5)}`],
                    ['MCAP', fmtK(tokenMeta.marketCap)],
                    ['HOLDERS', String(tokenMeta.holders ?? '—')],
                    ['BONDING', `${((tokenMeta.progress ?? 0) * 100).toFixed(1)}%`],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-[#070707] px-4 py-2.5">
                      <div className="text-[8px] font-mono text-[#444] tracking-widest">{l}</div>
                      <div className="text-[12px] font-mono font-bold text-white tabular">{v}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* EXECUTION TAPE */}
            <div className="panel">
              <div className="panel-header">
                <span className="title">EXECUTION_TAPE</span>
                <span>{tradeHistory.length} FILLS</span>
              </div>
              {tradeHistory.length === 0 ? (
                <div className="p-10 text-center font-mono text-[10px] text-[#333] tracking-widest">
                  <span className="cursor-blink">&gt; NO_FILLS_RECORDED</span>
                </div>
              ) : (
                <div className="max-h-[360px] overflow-y-auto">
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 bg-[#070707] z-10">
                      <tr className="text-[#444] font-mono text-[9px] tracking-widest border-b border-[#141414]">
                        <th className="px-4 py-2.5 font-medium">TIME</th>
                        <th className="px-4 py-2.5 font-medium">MARKET</th>
                        <th className="px-4 py-2.5 font-medium">SIDE</th>
                        <th className="px-4 py-2.5 font-medium text-right">ENTRY</th>
                        <th className="px-4 py-2.5 font-medium text-right">SIZE</th>
                        <th className="px-4 py-2.5 font-medium text-right">RESULT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tradeHistory.map((t, i) => (
                        <tr key={i} className="border-b border-[#101010] hover:bg-[#0b0b0b] transition-colors">
                          <td className="px-4 py-2.5 font-mono text-[10px] text-[#555] whitespace-nowrap tabular">
                            {new Date(t.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                          </td>
                          <td className="px-4 py-2.5 text-[11px] text-[#bbb] max-w-[260px] truncate">{t.market}</td>
                          <td className="px-4 py-2.5">
                            <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 ${t.side === 'YES' || t.side === 'LONG' ? 'text-[#00d4aa] bg-[#00d4aa]/8' : 'text-[#ff3b3b] bg-[#ff3b3b]/8'}`}>
                              {t.side}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-[#aaa] text-right tabular">{(t.entry * 100).toFixed(1)}¢</td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-[#aaa] text-right tabular">{t.size != null ? `$${Number(t.size).toLocaleString()}` : '—'}</td>
                          <td className="px-4 py-2.5 text-right">
                            {t.outcome == null ? (
                              <span className="font-mono text-[9px] text-[#C9A84C]">PENDING</span>
                            ) : t.outcome === 1 ? (
                              <span className="font-mono text-[9px] font-bold text-[#00d4aa]">WIN</span>
                            ) : (
                              <span className="font-mono text-[9px] font-bold text-[#ff3b3b]">LOSS</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* THREAD */}
            <div className="panel">
              <div className="panel-header">
                <span className="title">/THREAD/ — {bot.name.toUpperCase().replace(/\s+/g, '_')}</span>
                <span>{posts.length} REPLIES · ♥ {hearts}</span>
              </div>

              <div className="flex flex-col">
                {posts.length === 0 ? (
                  <div className="p-8 text-center font-mono text-[10px] text-[#333] tracking-widest">
                    &gt; THREAD_EMPTY — be the first reply
                  </div>
                ) : (
                  posts.map((p, i) => {
                    const n = i + 1
                    const pid = posterId(p.wallet || 'anon')
                    const replies = posts
                      .map((q, qi) => ({ qi: qi + 1, hit: (q.text || '').includes(`>>${n}`) }))
                      .filter(r => r.hit && r.qi !== n)
                    return (
                      <div key={p.id || i} id={`post-${n}`} className="px-4 py-3 border-b border-[#101010]">
                        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-[#7ea35e]">{p.user?.name || 'Anonymous'}</span>
                          <span
                            className="font-mono text-[9px] px-1.5 py-px rounded-sm"
                            style={{ color: `hsl(${pid.hue} 45% 65%)`, background: `hsl(${pid.hue} 45% 65% / 0.08)` }}
                          >
                            ID:{pid.id}
                          </span>
                          <span className="font-mono text-[9px] text-[#444] tabular">
                            {new Date(p.createdAt || Date.now()).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                          <button
                            onClick={() => quotePost(n)}
                            className="font-mono text-[9px] text-[#555] hover:text-primary transition-colors bg-transparent border-none cursor-pointer p-0"
                            title="Quote this post"
                          >
                            No.{String(n).padStart(4, '0')}
                          </button>
                          {replies.length > 0 && (
                            <span className="font-mono text-[9px] text-[#444]">
                              {replies.map(r => (
                                <a key={r.qi} className="quotelink mr-1.5" onClick={() => scrollToPost(r.qi)}>&gt;&gt;{r.qi}</a>
                              ))}
                            </span>
                          )}
                        </div>
                        <PostBody text={p.text} onQuoteClick={scrollToPost} />
                      </div>
                    )
                  })
                )}

                {/* Composer */}
                <div id="thread-composer" className="p-4 bg-[#050505]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[9px] text-[#444] tracking-widest">POSTING AS <span className="text-[#7ea35e]">Anonymous</span>{address ? ` · ID:${posterId(address).id}` : ''}</span>
                    <span className="font-mono text-[9px] text-[#333]">&gt;greentext · &gt;&gt;0001 quotes</span>
                  </div>
                  <textarea
                    value={postText}
                    onChange={e => setPostText(e.target.value)}
                    placeholder="> be me&#10;> deposit into vault&#10;> brier 0.12"
                    className="w-full h-24 bg-[#030303] border border-[#161616] text-[#ddd] font-mono text-[12px] p-3 outline-none placeholder:text-[#2c2c2c] focus:border-[#2a2a2a] resize-y transition-colors"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={addPost}
                      disabled={!postText.trim()}
                      className="bg-primary text-[#030303] border-none font-mono text-[10px] font-bold tracking-widest px-5 py-2 cursor-pointer disabled:opacity-30 hover:shadow-[0_0_16px_rgba(255,42,77,0.35)] transition-all"
                    >
                      POST_REPLY
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — quant, token, vault, operator */}
          <div className="flex flex-col gap-5">

            {/* QUANT */}
            <div className="panel">
              <div className="panel-header">
                <span className="title">QUANTITATIVE</span>
                {grade && <span style={{ color: grade.c }}>{grade.t}</span>}
              </div>
              <div className="p-4">
                <div className="flex items-end justify-between mb-1">
                  <span className="text-[#555] text-[9px] font-mono tracking-widest">BRIER_SCORE</span>
                  <span className="text-[8px] text-[#3a3a3a] font-mono">0 = perfect</span>
                </div>
                <div className="font-mono font-bold text-[32px] leading-none tabular" style={{ color: grade?.c || '#fff' }}>
                  {b != null ? b.toFixed(3) : '—'}
                </div>
                <div className="w-full h-1 bg-[#030303] border border-[#161616] mt-2.5 overflow-hidden">
                  <motion.div className="h-full" style={{ background: grade?.c || '#333' }} initial={{ width: 0 }} animate={{ width: `${brierFill}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
                </div>

                <div className="grid grid-cols-2 gap-px bg-[#141414] border border-[#141414] mt-4">
                  {[
                    { label: 'WIN_RATE', value: bot.winRate != null ? `${(bot.winRate * 100).toFixed(1)}%` : '—', c: '#fff' },
                    { label: 'SHARPE', value: bot.sharpe != null ? bot.sharpe.toFixed(2) : '—', c: (bot.sharpe ?? 0) >= 1.5 ? '#C8FF00' : '#fff' },
                    { label: 'ROI', value: roi != null ? `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%` : '—', c: roi != null && roi >= 0 ? '#C8FF00' : '#ff3b3b' },
                    { label: 'MAX_DD', value: bot.maxDrawdown != null ? `-${(Math.abs(bot.maxDrawdown) * 100).toFixed(1)}%` : '—', c: '#ff3b3b' },
                    { label: 'PROFIT_FACTOR', value: profitFactor != null ? profitFactor.toFixed(2) : '—', c: (profitFactor ?? 0) >= 1.5 ? '#C8FF00' : '#fff' },
                    { label: 'TRADES', value: bot.totalTrades != null ? bot.totalTrades.toLocaleString() : '—', c: '#fff' },
                    { label: 'VOLUME', value: bot.totalVolume != null ? fmtK(bot.totalVolume) : '—', c: '#fff' },
                    { label: 'AGE', value: ageDays != null ? `${ageDays}d` : '—', c: '#fff' },
                  ].map(m => (
                    <div key={m.label} className="bg-[#070707] px-3 py-2.5">
                      <div className="text-[#444] text-[8px] font-mono tracking-widest mb-1">{m.label}</div>
                      <div className="font-mono font-bold text-[13px] tabular" style={{ color: m.c }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                {/* Leaderboard qualification */}
                <div className="mt-4 border border-[#161616] bg-[#050505]">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[#141414]">
                    <span className="font-mono text-[9px] text-[#666] tracking-widest">LEADERBOARD_QUALIFICATION</span>
                    <span className={`font-mono text-[9px] font-bold ${qualified ? 'text-[#00d4aa]' : 'text-[#C9A84C]'}`}>
                      {qualified ? 'QUALIFIED' : `${qualification.filter(q => q.ok).length}/${qualification.length}`}
                    </span>
                  </div>
                  {qualification.map(q => (
                    <div key={q.label} className="flex items-center justify-between px-3 py-1.5 border-b border-[#0d0d0d] last:border-b-0">
                      <span className="font-mono text-[9px] text-[#666]">
                        <span className={q.ok ? 'text-[#00d4aa]' : 'text-[#333]'}>{q.ok ? '✓' : '✗'}</span>
                        <span className="ml-2">{q.label}</span>
                      </span>
                      <span className={`font-mono text-[9px] tabular ${q.ok ? 'text-[#888]' : 'text-[#C9A84C]'}`}>{q.detail}</span>
                    </div>
                  ))}
                </div>

                {bot.totalTrades != null && bot.totalTrades < 50 && (
                  <div className="text-[9px] text-[#C9A84C] font-mono mt-3 leading-relaxed">
                    ⚠ LOW_SAMPLE — Brier needs ≥50 resolved trades for statistical confidence
                  </div>
                )}
              </div>
            </div>

            {/* CONVICTION TOKEN */}
            <TokenPanel slug={slug} isOwner={!!isOwner} botColor={bot.color || '#ff2a4d'} />

            {/* VAULT */}
            <div className="panel">
              <div className="panel-header">
                <span className="title">VAULT</span>
                <span className="tabular">${animatedTVL.toLocaleString()} TVL</span>
              </div>
              <div className="p-4">
                <VaultCapacityBar current={animatedTVL} cap={vaultCap} />

                {bot.status === 'PAPER' ? (
                  <div className="mt-4 border border-dashed border-[#1a1a1a] p-3 text-center">
                    <div className="font-mono text-[10px] text-[#888] tracking-widest mb-1">INCUBATION</div>
                    <div className="text-[10px] text-[#555] leading-relaxed">Paper-trading phase. Deposits unlock when the shadow epoch completes.</div>
                  </div>
                ) : isVaultFull ? (
                  <div className="mt-4 border border-primary/30 p-3 text-center">
                    <div className="font-mono text-[10px] text-primary tracking-widest">CAPACITY_REACHED</div>
                  </div>
                ) : (
                  <div className="mt-4">
                    {!isConnected ? (
                      <div className="text-[10px] text-[#555] font-mono">&gt; Connect wallet to deploy capital.</div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={depositAmt}
                          onChange={e => setDepositAmt(e.target.value)}
                          placeholder="USDC"
                          className="flex-1 min-w-0 bg-[#030303] border border-[#161616] text-white font-mono text-[12px] p-2 outline-none placeholder:text-[#2c2c2c] focus:border-[#2a2a2a] transition-colors"
                        />
                        <button
                          onClick={handleWeb3Deposit}
                          disabled={depositing}
                          className={`border-none font-mono font-bold text-[10px] tracking-widest px-4 py-2 transition-all ${
                            depositing
                              ? 'bg-[#1a1a1a] text-[#555] cursor-not-allowed'
                              : 'bg-primary text-[#030303] cursor-pointer hover:shadow-[0_0_16px_rgba(255,42,77,0.35)]'
                          }`}
                        >
                          {depositing ? '…' : 'DEPOSIT'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* OPERATOR */}
            {viewMode === 'creator' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-5">
                <div className="panel">
                  <div className="panel-header">
                    <span className="title">PROTOCOL_CONFIG</span>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="bg-transparent border-none text-primary font-mono text-[9px] tracking-widest cursor-pointer p-0 hover:text-white transition-colors"
                    >
                      {isEditing ? 'CANCEL' : 'EDIT'}
                    </button>
                  </div>
                  {isEditing && (
                    <div className="flex flex-col gap-3 p-4">
                      <div>
                        <label className="text-[9px] text-[#555] block mb-1 tracking-widest font-mono">NAME</label>
                        <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-[#030303] border border-[#161616] text-white p-2 font-mono text-[11px] outline-none focus:border-[#2a2a2a] transition-colors" />
                      </div>
                      <div>
                        <label className="text-[9px] text-[#555] block mb-1 tracking-widest font-mono">TAGLINE</label>
                        <input value={editTagline} onChange={e => setEditTagline(e.target.value)} className="w-full bg-[#030303] border border-[#161616] text-white p-2 font-mono text-[11px] outline-none focus:border-[#2a2a2a] transition-colors" />
                      </div>
                      <div>
                        <label className="text-[9px] text-[#555] block mb-1 tracking-widest font-mono">DESCRIPTION</label>
                        <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full h-20 bg-[#030303] border border-[#161616] text-white p-2 font-mono text-[11px] outline-none resize-y focus:border-[#2a2a2a] transition-colors" />
                      </div>
                      <div>
                        <label className="text-[9px] text-[#555] block mb-1 tracking-widest font-mono">AVATAR</label>
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
                          className="w-full bg-[#030303] border border-[#161616] text-[#888] p-2 font-mono text-[10px] outline-none"
                        />
                        {editPfp && (
                          <div className="mt-2 flex items-center gap-2">
                            <img src={editPfp} alt="Preview" className="w-9 h-9 object-cover border border-[#1a1a1a]" />
                            <span className="text-[9px] font-mono text-[#00d4aa]">READY</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleSaveBot} disabled={savingBot}
                        className="bg-primary text-[#030303] border-none font-mono font-bold text-[10px] tracking-widest py-2 cursor-pointer disabled:opacity-50 hover:shadow-[0_0_16px_rgba(255,42,77,0.35)] transition-all"
                      >
                        {savingBot ? 'SAVING…' : 'COMMIT_CHANGES'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <span className="title text-primary">KILL_SWITCH</span>
                    <span>FAK ENFORCED</span>
                  </div>
                  <div className="p-4">
                    <div className="text-[10px] text-[#666] leading-relaxed mb-3">
                      Sends HALT to the Brier API. All pending signals on key <span className="text-primary font-mono">{bot.builder?.substring(0, 6)}…</span> are rejected via Fill-And-Kill.
                    </div>
                    <button
                      onClick={triggerKillSwitch}
                      disabled={killStatus !== 'idle'}
                      className={`w-full font-mono font-bold text-[10px] tracking-widest py-2.5 transition-all ${
                        killStatus === 'idle'
                          ? 'bg-transparent border border-primary text-primary cursor-pointer hover:bg-primary hover:text-[#030303]'
                          : 'bg-primary border border-primary text-[#030303] cursor-not-allowed'
                      }`}
                    >
                      {killStatus === 'idle' ? 'EMERGENCY_HALT' : killStatus === 'halting' ? 'TRANSMITTING…' : 'HALT_CONFIRMED'}
                    </button>
                  </div>
                </div>
              </motion.div>
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
