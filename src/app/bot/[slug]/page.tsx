'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import MakerAvatar from '@/components/MakerAvatar'
import BotPerformance from '@/components/bot/BotPerformance'
import CalibrationCurve from '@/components/bot/CalibrationCurve'
import RecentForm from '@/components/bot/RecentForm'
import ProfileGuide from '@/components/bot/ProfileGuide'
import VaultGlass from '@/components/bot/VaultGlass'
import ApiKeysManager from '@/components/bot/ApiKeysManager'
import { botEye, codename } from '@/lib/botIdentity'
import { FEATURES } from '@/lib/features'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { motion, AnimatePresence } from 'framer-motion'
import { useCountUp } from '@/hooks/useCountUp'
import { PostBody } from '@/components/bot/PostBody'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
  shadowProgress, phaseMeta,
  SHADOW_RESOLVED_TARGET, SHADOW_DAYS_TARGET, SHADOW_LCB_TARGET,
} from '@/lib/botProgress'

interface Post {
  id: string; wallet: string; text: string; createdAt: string;
  user?: { handle?: string | null; name?: string | null; pfpUrl?: string | null } | null
}

const fmtUSD = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${Math.round(n).toLocaleString()}`
const personLabel = (u?: Post['user'], wallet = '') =>
  u?.handle ? `@${u.handle}` : (u?.name && !u.name.startsWith('User_') ? u.name : codename(wallet))
const shortAddr = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'anon'
const makerLabel = (maker: Post['user'] | null | undefined, wallet: string) =>
  maker?.handle ? `@${maker.handle}` :
  (maker?.name && !maker.name.startsWith('User_') ? maker.name : shortAddr(wallet))
const relDay = (d?: string | Date | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null
const relTime = (d?: string | Date | null) => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''

function txOf(t: any): string | null {
  const hash = String(t.externalTradeId || '').split('-')[0]
  return hash.startsWith('0x') && hash.length >= 40 ? hash : null
}

const Empty = () => <span className="text-[#333]">·</span>

// Client-side mirror of HEARTBEAT_STALE_MS (src/lib/heartbeat.ts). Kept inline so
// this client component never imports the server-only heartbeat module (it pulls in
// Prisma). A bot reads as "operating" only if its last beat is fresher than this.
const HEARTBEAT_STALE_MS = 12_000

const Panel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-[#1a1a1a] bg-[#080809] overflow-hidden ${className}`}>{children}</div>
)

export default function BotProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)

  const [bot, setBot] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<Post[]>([])
  const [postText, setPostText] = useState('')
  const [depositAmt, setDepositAmt] = useState('')
  const [trades, setTrades] = useState<any[]>([])
  const [hearts, setHearts] = useState(0)
  const [hearted, setHearted] = useState(false)
  const [likeFx, setLikeFx] = useState(0)
  const [depositing, setDepositing] = useState(false)
  const [toast, setToast] = useState('')
  const [activeStat, setActiveStat] = useState<string | null>(null)
  const [confettiBurst, setConfettiBurst] = useState(0)

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editTagline, setEditTagline] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPfp, setEditPfp] = useState('')
  const [savingBot, setSavingBot] = useState(false)
  // Live heartbeat: the bot reads as "operating" from its real beat, not its trade
  // history. We poll lastHeartbeatAt + the live activity line and tick a clock so the
  // signal goes stale on its own if the beats stop.
  const [beat, setBeat] = useState<{ at: string | null; activity: string | null }>({ at: null, activity: null })
  const [nowTick, setNowTick] = useState<number>(0)

  const { address, isConnected } = useAccount()
  const currentUser = useCurrentUser(address)
  const isOwner = !!(isConnected && address && bot && bot.builder?.toLowerCase() === address.toLowerCase())

  const animatedTVL = useCountUp(bot?.tvl || 0)
  const capDeclared = bot?.vaultCap || 0
  const vaultCap = capDeclared || 50000
  const isCapped = capDeclared > 0
  const atCapacity = isCapped && animatedTVL >= capDeclared

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000) }

  useEffect(() => {
    fetch(`/api/bots/${slug}?t=${Date.now()}`)
      .then(res => res.ok ? res.json() : null)
      .then(dbBot => {
        if (!dbBot) { setLoading(false); return }
        const s = dbBot.scores?.length > 0 ? dbBot.scores[dbBot.scores.length - 1] : null
        
        const mapped = {
          id: dbBot.id, name: dbBot.name, builder: dbBot.walletAddress, tagline: dbBot.tagline,
          pfpUrl: dbBot.pfpUrl, maker: dbBot.user || null,
          description: dbBot.description, status: dbBot.status || 'PAPER',
          color: dbBot.color, eyeShape: dbBot.eyeShape, createdAt: dbBot.createdAt,
          vaultOpen: dbBot.vaultOpen, vaultAddress: dbBot.vaultAddress, vaultCap: dbBot.vaultCap ?? 0,
          tvl: dbBot.liveNav?.totalAssets ?? dbBot.currentTVL ?? 0,
          sharePrice: dbBot.liveNav?.sharePrice ?? 1,
          categories: dbBot.verifiedCategories?.length ? dbBot.verifiedCategories : (dbBot.categories || []),
          verified: !!dbBot.verifiedCategories?.length,
          brierScore: s?.brierScore ?? null, winRate: s?.winRate ?? null, sharpe: s?.sharpe ?? null, lcb: s?.lcb ?? null,
          maxDrawdown: s?.maxDrawdown ?? null, totalTrades: s?.totalTrades ?? 0, totalVolume: s?.totalVolume ?? null,
          allScores: dbBot.scores || [],
          predictions: dbBot.predictions || [],
          pnlSnapshots: dbBot.pnlSnapshots || [],
          tradesIndexed: dbBot._count?.trades ?? (dbBot.trades?.length ?? 0),
          skinInGame: dbBot.skinInGame || 0,
          categoriesData: dbBot.categoriesData || [],
        }
        setBot(mapped)
        setEditName(mapped.name); setEditTagline(mapped.tagline || ''); setEditDesc(mapped.description || ''); setEditPfp(mapped.pfpUrl || '')
        setHearts(dbBot._count?.hearts || 0)
        setTrades(mapped.predictions.length ? mapped.predictions : (dbBot.trades || []))
        setLoading(false)
        fetch(`/api/comments?botId=${mapped.id}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setPosts(d) })
      })
      .catch(() => setLoading(false))
  }, [slug])

  // Poll the live heartbeat (lastHeartbeatAt + liveActivity) every 6s and tick the
  // clock, so "Operating" reflects the real beat and self-expires if it stops.
  useEffect(() => {
    let alive = true
    const poll = () => fetch(`/api/bots/${slug}?t=${Date.now()}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (alive && d) setBeat({ at: d.lastHeartbeatAt ?? null, activity: d.liveActivity ?? null }) })
      .catch(() => {})
    poll()
    setNowTick(Date.now())
    const id = setInterval(() => { poll(); setNowTick(Date.now()) }, 6000)
    return () => { alive = false; clearInterval(id) }
  }, [slug])

  useEffect(() => {
    if (!bot?.id || !address) return
    fetch(`/api/hearts?botId=${bot.id}&userId=${address}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setHearted(!!d.hearted); if (typeof d.count === 'number') setHearts(d.count) } })
      .catch(() => {})
  }, [bot?.id, address])

  const toggleHeart = async () => {
    if (!isConnected || !address) return showToast('Connect your wallet to like.')
    const prevHearted = hearted, prevHearts = hearts
    const nextHearted = !hearted
    setHearted(nextHearted)
    setHearts(h => nextHearted ? h + 1 : Math.max(0, h - 1))
    if (nextHearted) { setLikeFx(Date.now()); setConfettiBurst(Date.now()) }
    try {
      const res = await fetch('/api/hearts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: address, botId: bot.id }) })
      if (!res.ok) throw new Error('request failed')
      const d = await res.json()
      setHearted(d.status === 'hearted')
      if (typeof d.count === 'number') setHearts(d.count)
    } catch {
      setHearted(prevHearted); setHearts(prevHearts)
      showToast('Could not save your like. Try again.')
    }
  }

  const addPost = async () => {
    if (!postText.trim()) return
    if (!isConnected || !address) return showToast('Connect your wallet to comment.')
    const res = await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ botId: bot.id, wallet: address, text: postText.trim() }) })
    if (res.ok) { const c = await res.json(); setPosts([c, ...posts]); setPostText('') }
    else showToast('Could not post comment.')
  }

  const handleSaveBot = async () => {
    if (!address) return
    setSavingBot(true)
    try {
      const res = await fetch(`/api/bots/${slug}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ walletAddress: address, name: editName, tagline: editTagline, description: editDesc, pfpUrl: editPfp }) })
      if (res.ok) { const u = await res.json(); setBot({ ...bot, name: u.name, tagline: u.tagline, description: u.description, pfpUrl: u.pfpUrl }); setIsEditing(false); showToast('Profile updated.') }
      else { const e = await res.json(); showToast(e.error || 'Update failed.') }
    } catch (e: any) { showToast(e.message) }
    setSavingBot(false)
  }

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmt) || 0
    if (amt <= 0) return showToast('Enter a valid amount.')
    if (typeof window === 'undefined' || !window.ethereum) return showToast('No wallet detected.')
    if (!bot.vaultAddress) return showToast('This vault is not deployed yet.')
    setDepositing(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const vault = new ethers.Contract(bot.vaultAddress, ['function asset() external view returns (address)', 'function deposit(uint256 assets, address receiver) external returns (uint256)'], signer)
      showToast('Reading vault…')
      const usdcAddr = await vault.asset()
      const usdc = new ethers.Contract(usdcAddr, ['function approve(address spender, uint256 amount) external returns (bool)', 'function decimals() external view returns (uint8)'], signer)
      const decimals = await usdc.decimals().catch(() => 6)
      const txAmount = ethers.parseUnits(depositAmt, decimals)
      showToast('Step 1/2 — approving USDC…'); await (await usdc.approve(bot.vaultAddress, txAmount)).wait()
      showToast('Step 2/2 — depositing…'); const dep = await vault.deposit(txAmount, address); await dep.wait()
      showToast('Deposit confirmed.')
      await fetch('/api/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ botId: bot.id, depositorWallet: address, amountUsdc: amt, mode: 'CONSERVATIVE', txHash: dep.hash }) })
    } catch (err: any) { showToast('Transaction failed: ' + (err.reason || err.message || 'error')) }
    finally { setDepositing(false) }
  }

  if (loading) return <div className="min-h-screen bg-[#030303] text-[#666] grid place-items-center font-sans text-sm">Validating Identity...</div>
  if (!bot) return notFound()

  // ── derivations ──
  const sp = shadowProgress({
    status: bot.status, createdAt: bot.createdAt, vaultOpen: bot.vaultOpen, currentTVL: bot.tvl,
    scores: [{ lcb: bot.lcb ?? undefined, brierScore: bot.brierScore ?? undefined, winRate: bot.winRate ?? undefined, totalTrades: bot.totalTrades }],
    tradesIndexed: bot.tradesIndexed,
  })
  const pm = phaseMeta(sp)
  const eye = botEye({ slug, id: bot.id, name: bot.name, color: bot.color, eyeShape: bot.eyeShape })
  
  const lcb = bot.lcb ?? 0
  const brierSkill = bot.brierScore ?? 0
  const winRate = bot.winRate ?? 0
  const tradesCount = bot.totalTrades ?? 0

  const hasVerifiedPerformance = tradesCount >= 100
  const hasVerifiedReputation = lcb > 0

  // We map the historical LCB scores into snapshots for the BotPerformance chart
  const lcbSnapshots = bot.allScores?.map((s: any) => ({
    cumulativePnl: s.lcb,
    date: s.snapshotDate
  })) || []

  const wins = trades.filter(t => t.status === 'WIN' || t.outcome === 'WIN').length
  const losses = trades.filter(t => t.status === 'LOSS' || t.outcome === 'LOSS').length
  const pending = trades.filter(t => t.status === 'PENDING' || t.outcome === 'PENDING').length
  const navValues: number[] = (bot.pnlSnapshots || []).map((s: any) => s.cumulativePnl ?? s.pnlUsd).filter((v: any) => typeof v === 'number')
  const navStart = navValues[0] ?? 0
  const navDelta = bot.sharePrice && bot.sharePrice !== 1 ? (bot.sharePrice - 1) * 100 : (navValues.length > 1 && Math.abs(navStart) > 1 ? ((navValues[navValues.length - 1] - navStart) / Math.abs(navStart)) * 100 : 0)
  const roi = bot.sharePrice && bot.sharePrice !== 1 ? navDelta : null
  const uplink = (bot.tradesIndexed > 0 || trades.length > 0) ? 'live' : 'awaiting'
  const lastFill = trades.length ? relDay(trades[0].timestamp) : null
  // "Operating" comes from the live heartbeat, not trade history: a bot with its
  // eyes on the market but no fill yet still reads as online.
  const isOnline = !!beat.at && nowTick > 0 && (nowTick - new Date(beat.at).getTime()) < HEARTBEAT_STALE_MS
  const liveActivity: string | null = beat.activity

  const VIOLET = '#8b7bff', TEAL = '#c8ff00'
  const criteria = [
    { label: 'Resolved predictions', val: `${sp.resolved} / ${SHADOW_RESOLVED_TARGET}`, ok: sp.resolvedPass, pct: Math.min(1, sp.resolved / SHADOW_RESOLVED_TARGET) },
    { label: 'Edge over market', val: sp.lcb != null ? `LCB ${sp.lcb.toFixed(3)} > 0` : `> 0 LCB`, ok: sp.lcbPass, pct: sp.lcb == null ? 0 : Math.min(1, Math.max(0, (sp.lcb + 0.1) / 0.1)) },
    { label: 'Days live', val: `${sp.days} / ${SHADOW_DAYS_TARGET}`, ok: sp.daysPass, pct: Math.min(1, sp.days / SHADOW_DAYS_TARGET) },
  ]
  const clearedCount = criteria.filter(c => c.ok).length

  // "Proof of edge" — the numbers NOT already headlined elsewhere. LCB lives in
  // the Reputation panel, resolved-count in the gate and calibration, so they are
  // deliberately not repeated here.
  const stats = [
    { k: 'Win rate', v: bot.winRate != null ? `${(bot.winRate * 100).toFixed(1)}%` : null, info: 'Share of resolved predictions it got right. Note: high win rate on obvious favorites is not skill — beating the market price is. See Reputation.' },
    { k: 'ROI', v: roi != null ? `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%` : null, info: 'Return on the vault capital since it opened.' },
    { k: 'Max drawdown', v: bot.maxDrawdown != null ? `-${(Math.abs(bot.maxDrawdown) * 100).toFixed(1)}%` : null, info: 'The worst peak-to-trough drop in value. Smaller is safer.' },
    { k: 'Sharpe', v: bot.sharpe != null ? bot.sharpe.toFixed(2) : null, info: 'Return per unit of risk. Higher means steadier, less jumpy gains.' },
  ]

  return (
    <div className="min-h-screen bg-[#030303] font-sans text-[#e8e8e8]">
      <div className="max-w-[1180px] mx-auto px-6 pt-6 pb-20">

        {/* top bar */}
        <div className="flex items-center justify-between mb-6 text-[12px]">
          <Link href="/discover" className="text-[#777] hover:text-white transition-colors no-underline">← The Catalog</Link>
          <div className="flex items-center gap-2.5">
            <Link href={`/bot/${slug}/share`} className="font-sans text-[12px] font-semibold px-3.5 py-1.5 rounded-full border border-[#242424] text-[#ccc] hover:border-[#c8ff00]/50 hover:text-[#c8ff00] transition-all inline-flex items-center gap-1.5 no-underline">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Share
            </Link>
            {isOwner && (
              <button onClick={() => setIsEditing(v => !v)} className="font-sans text-[12px] font-semibold px-3.5 py-1.5 rounded-full border border-[#222] text-[#ccc] hover:border-[#444] hover:text-white transition-all">
                {isEditing ? 'Close editor' : 'Edit profile'}
              </button>
            )}
          </div>
        </div>

        {/* ── HEADER: AVATAR, NAME, BADGES ── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              {bot.pfpUrl ? (
                <div className="rounded-2xl overflow-hidden border border-[#222]">
                  <img src={bot.pfpUrl} alt={bot.name} className="w-[100px] h-[100px] object-cover" />
                </div>
              ) : (
                <>
                  <motion.div
                    className="absolute rounded-full blur-3xl pointer-events-none"
                    style={{ inset: '-20px', background: `radial-gradient(circle, ${eye.accentColor}40 0%, transparent 70%)` }}
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <BotIrisAvatar {...eye} size={100} />
                </>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-black text-[38px] tracking-[-0.03em] m-0 leading-none mb-2">
                {bot.name}
              </h1>
              {bot.tagline && (
                <div className="text-[#888] italic text-[15px] mb-4">
                  {bot.tagline}
                </div>
              )}
              
              <div className="flex items-center gap-3 mb-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">Builder ID</span>
                <MakerAvatar address={bot.builder || ''} pfpUrl={bot.maker?.pfpUrl} size={20} square />
                <span className="font-mono text-[12px] text-[#ccc]">{bot.maker?.handle ? `@${bot.maker.handle}` : (bot.builder?.slice(0,6) + '...' + bot.builder?.slice(-4))}</span>
                
                {/* Verifiable links — on-chain proof first, social if present.
                    Every link here resolves to something real; no placeholders. */}
                <div className="flex items-center gap-3 ml-2 border-l border-[#333] pl-4">
                  {bot.builder && (
                    <a href={`https://polygonscan.com/address/${bot.builder}`} target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-[#c8ff00] transition-colors" title="Bot wallet on Polygonscan — every trade is verifiable on-chain">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[14px] h-[14px]"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>
                    </a>
                  )}
                  {bot.vaultAddress && (
                    <a href={`https://polygonscan.com/address/${bot.vaultAddress}`} target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-[#c8ff00] transition-colors" title="Vault contract on Polygonscan">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[14px] h-[14px]"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    </a>
                  )}
                  {bot.maker?.handle && (
                    <a href={`https://x.com/${bot.maker.handle}`} target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-white transition-colors" title={`Builder on X — @${bot.maker.handle}`}>
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[14px] h-[14px]"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </a>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 mt-4">
                {(hasVerifiedPerformance && hasVerifiedReputation) ? (
                  <div className="px-3.5 py-1.5 rounded text-[10px] font-mono font-bold tracking-widest uppercase border bg-[#c8ff00]/10 text-[#c8ff00] border-[#c8ff00]/30 shadow-[0_0_12px_rgba(200,255,0,0.15)] flex items-center gap-2">
                    <span className="text-[14px] leading-none">⬡</span> Brier Verified
                  </div>
                ) : (
                  <div className="px-3.5 py-1.5 rounded text-[10px] font-mono font-bold tracking-widest uppercase border bg-[#222] text-[#666] border-[#333]">
                    Pending Verification
                  </div>
                )}

                {/* live signal — compact, in the identity block (not a big panel) */}
                <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border" style={{ borderColor: isOnline ? '#c8ff0044' : '#2a2a2a', background: isOnline ? 'linear-gradient(90deg,#c8ff0012,#0a0a0a)' : '#0a0a0a', boxShadow: isOnline ? '0 0 16px #c8ff0018' : 'none' }}>
                  <span className="relative flex h-2.5 w-2.5">
                    {isOnline && <span className="absolute inline-flex h-full w-full rounded-full bg-[#c8ff00] opacity-60 animate-ping" />}
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: isOnline ? '#c8ff00' : '#ff5570', boxShadow: isOnline ? '0 0 8px #c8ff00' : 'none' }} />
                  </span>
                  <span className="font-sans text-[13px] font-bold tracking-tight" style={{ color: isOnline ? '#c8ff00' : '#8a8a94' }}>{isOnline ? 'Operating' : 'Offline'}</span>
                  {/* live equalizer — only when online, gives the signal life */}
                  {isOnline && (
                    <span className="flex items-end gap-[2px] h-3.5">
                      {[0, 1, 2, 3].map(i => (
                        <motion.span key={i} className="w-[2px] rounded-full bg-[#c8ff00]"
                          animate={{ height: ['30%', '100%', '45%', '80%', '30%'] }}
                          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }} />
                      ))}
                    </span>
                  )}
                  <span className="font-mono text-[11px] text-[#8a8a94] border-l border-[#242424] pl-3 tabular-nums"><span className="text-white font-bold">{sp.resolved}</span> resolved</span>
                  {lastFill && <span className="font-mono text-[11px] text-[#5a5a64] tabular-nums">· last {lastFill}</span>}
                </div>
              </div>
              {isOnline && liveActivity && (
                <div className="flex items-center gap-2 mt-2.5 font-mono text-[11px] text-[#8a8a94]">
                  <span className="w-1 h-1 rounded-full bg-[#c8ff00]" />
                  <span className="truncate">{liveActivity}</span>
                </div>
              )}
            </div>
          </div>

          <div className="relative shrink-0 md:self-end">
            <button onClick={toggleHeart} className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border transition-all cursor-pointer ${hearted ? 'border-primary bg-primary/10 text-primary' : 'border-[#1a1a1a] bg-[#070707] text-[#888] hover:border-primary/50 hover:text-primary'}`}>
              <motion.span key={hearted ? 'on' : 'off'} initial={{ scale: 0.6 }} animate={{ scale: hearted ? [1.4, 1] : 1 }} transition={{ duration: 0.35 }} className="text-lg leading-none">{hearted ? '♥' : '♡'}</motion.span>
              <span className="font-mono font-bold text-lg tabular-nums leading-none">{hearts}</span>
            </button>
            <AnimatePresence>
              {confettiBurst > 0 && (['#ff2a4d','#c8ff00','#8b7bff','#ffd400','#ffffff','#ff5ccd','#4285f0','#eaff00'] as const).flatMap((color, ci) =>
                [0, 1, 2].map((j) => {
                  const angle = ((ci * 3 + j) / 24) * Math.PI * 2
                  const dist = 48 + j * 22
                  return (
                    <motion.span
                      key={`cf-${confettiBurst}-${ci}-${j}`}
                      className="absolute pointer-events-none"
                      style={{ width: 5 + (j % 3) * 2, height: 4 + (ci % 2) * 3, background: color, borderRadius: ci % 3 === 0 ? '50%' : '1px', left: '50%', top: '50%' }}
                      initial={{ opacity: 1, x: -3, y: -3, rotate: 0, scale: 1 }}
                      animate={{ opacity: 0, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 28, rotate: 200 * (ci % 2 ? 1 : -1), scale: 0.2 }}
                      transition={{ duration: 0.75 + j * 0.08, ease: 'easeOut' }}
                      onAnimationComplete={() => { if (ci === 7 && j === 2) setConfettiBurst(0) }}
                    />
                  )
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {bot.description && <p className="text-[14px] leading-relaxed text-[#9a9a9a] mb-5 max-w-3xl whitespace-pre-wrap">{bot.description}</p>}
        
        {bot.categoriesData?.length > 0 && (
          <div className="mb-10">
            <div className="flex flex-wrap gap-2.5">
              {bot.categoriesData.map((c: any) => {
                const hasSkill = c.resolvedCount > 0
                const skillPos = c.skill > 0
                return (
                  <div key={c.name} className="flex items-center gap-2.5 bg-[#0c0c0c] border border-[#1a1a1a] rounded-lg px-3 py-2 font-mono text-[11px] text-[#888]">
                    <span className="text-white font-bold tabular-nums">{Math.round(c.volumePct)}%</span>
                    <span className="uppercase tracking-wide">{c.name}</span>
                    {hasSkill && (
                      <span className="pl-2 border-l border-[#242424] tabular-nums" style={{ color: skillPos ? '#c8ff00' : '#8b7bff' }} title="Relative skill (Brier vs market) in this category">
                        {skillPos ? '+' : ''}{c.skill.toFixed(3)} skill
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="font-mono text-[10px] text-[#48484f] mt-2.5">
              Brier scores every category the same way — a politics call and a 5-minute crypto call are both just (probability, market price, outcome).
            </div>
          </div>
        )}

        {/* guided on-ramp for newcomers — collapsible, plain language */}
        <ProfileGuide />

        {isOwner && isEditing && (
          <Panel className="mb-8 p-5">
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#666] mb-4">Edit profile</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block"><span className="text-[12px] text-[#bbb] font-semibold">Name</span><input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1.5 w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-primary/50" /></label>
              <label className="block"><span className="text-[12px] text-[#bbb] font-semibold">Tagline</span><input value={editTagline} onChange={e => setEditTagline(e.target.value)} className="mt-1.5 w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-primary/50" /></label>
              <label className="block sm:col-span-2"><span className="text-[12px] text-[#bbb] font-semibold">Bio</span><textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="mt-1.5 w-full h-24 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-primary/50 resize-y" /></label>
            </div>
            <button onClick={handleSaveBot} disabled={savingBot} className="mt-4 rounded-full bg-primary text-[#030303] font-bold text-[13px] px-6 py-2.5 disabled:opacity-50 hover:shadow-[0_0_18px_rgba(255,42,77,0.4)] transition-all">{savingBot ? 'Saving…' : 'Save changes'}</button>
          </Panel>
        )}

        {/* ── Owner-only: connect your bot (API keys) ── */}
        {isOwner && bot?.id && <ApiKeysManager botId={bot.id} />}

        {/* ── VAULT (full width) ── */}
        <div className="rounded-2xl border border-[#1a1a1a] bg-[#080809] overflow-hidden mb-8">
          <div className="flex flex-col sm:flex-row items-stretch">
            <div className="sm:w-[280px] shrink-0 p-5 sm:border-r border-b sm:border-b-0 border-[#141414]">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-[#888]">Vault</span>
                {sp.live && (
                  <span className={`font-mono text-[11px] font-bold ${navDelta >= 0 ? 'text-[#c8ff00]' : 'text-[#ff5570]'}`}>
                    {navDelta >= 0 ? '▲' : '▼'} {Math.abs(navDelta).toFixed(1)}%
                  </span>
                )}
              </div>
              <VaultGlass tvl={animatedTVL} cap={vaultCap} live={sp.live} />
            </div>
            <div className="flex-1 p-6 flex flex-col justify-between min-w-0">
              <div>
                <div className="font-mono text-[10px] tracking-[0.24em] uppercase text-[#5a5a64] mb-2">
                  {sp.live ? 'Total assets secured' : 'Vault status'}
                </div>
                <div className="font-sans font-black text-[clamp(30px,4.5vw,52px)] leading-[0.92] tabular-nums text-white tracking-[-0.045em]">
                  {sp.live ? fmtUSD(animatedTVL) : 'Shadow phase'}
                </div>
                <div className="font-mono text-[12px] mt-2.5 tracking-wide" style={{ color: sp.live ? '#6a6a74' : VIOLET }}>
                  {sp.live
                    ? (isCapped ? `of ${fmtUSD(capDeclared)} capacity` : 'Open capacity · finding the ceiling')
                    : `Vault unlocks after the shadow gate. ${sp.resolved}/${SHADOW_RESOLVED_TARGET} resolved`}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-[#141420] pt-4">
                {[
                  { k: 'Capacity', v: isCapped ? fmtUSD(capDeclared) : 'Open' },
                  { k: sp.live ? 'Phase' : 'Progress', v: sp.live ? 'LIVE' : `${Math.round(sp.pct * 100)}%` },
                  { k: "Maker's Skin in the Game", v: fmtUSD(bot.skinInGame || 0) },
                ].map(m => (
                  <div key={m.k}>
                    <div className="font-mono text-[9px] text-[#48484f] tracking-[0.14em] uppercase mb-1">{m.k}</div>
                    <div className="font-sans font-bold text-[15px] text-white tabular-nums tracking-tight">{m.v}</div>
                  </div>
                ))}
              </div>
              {sp.live && (
                <div className="mt-4">
                  {!FEATURES.CAPITAL_LAYER ? (
                    <div className="rounded-lg border border-[#1a1a1a] bg-[#0c0c0c] p-3 text-center text-[12px] text-[#888] font-sans">
                      <span className="font-bold text-white mb-1 block">Shadow Phase</span>
                      Capital Layer disabled. Building reputation on-chain.
                    </div>
                  ) : atCapacity ? (
                    <div className="rounded-lg border border-primary/30 p-2.5 text-center font-mono text-[11px] text-primary tracking-widest">AT CAPACITY · DEPOSITS CLOSED</div>
                  ) : !isConnected ? (
                    <div className="text-[12px] text-[#666]">Connect your wallet to deposit.</div>
                  ) : (
                    <div className="flex gap-2">
                      <input type="text" inputMode="decimal" value={depositAmt} onChange={e => setDepositAmt(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="Amount in USDC" className="flex-1 min-w-0 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-primary/50 placeholder:text-[#555] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      <button onClick={handleDeposit} disabled={depositing} className="rounded-lg bg-primary text-[#030303] font-bold text-[13px] px-5 disabled:opacity-50 hover:shadow-[0_0_16px_rgba(255,42,77,0.4)] transition-all">{depositing ? '…' : 'Deposit'}</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-6 min-w-0">
            {/* recent form — last resolved calls at a glance (signal now lives in the header) */}
            <RecentForm predictions={trades} />

            {/* performance — Liveline real-time-style Reputation (LCB) curve */}
            <BotPerformance
              title="Reputation over time"
              subtitle="how far it beats the market · above 0 = real skill"
              mode="score"
              snapshots={lcbSnapshots}
              live={sp.live}
              info="This line is the bot's edge over the market, day by day. Zero means it only matches the crowd's price. Above zero means it consistently knows better — and it is a Lower Confidence Bound, the pessimistic version, so a lucky streak can't fake it. Below zero means it has not proven an edge yet. This one number is what unlocks a real vault."
            />

            {/* calibration — the reliability diagram, from real resolved predictions */}
            <CalibrationCurve predictions={trades} />

            {/* trade history (Order Book) */}
            <Panel>
              <div className="px-5 py-3.5 border-b border-[#141414]">
                <div className="flex items-center justify-between mb-2.5">
                  <div><span className="font-sans font-bold text-[14px]">Trade history</span><span className="ml-2 font-mono text-[10px] text-[#555]">settled on-chain</span></div>
                  <span className="font-mono text-[11px] text-[#888] tabular-nums">{trades.length} fills</span>
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden bg-[#0e0e0e]">
                  {wins > 0 && <div style={{ width: `${(wins / trades.length) * 100}%`, background: TEAL }} />}
                  {losses > 0 && <div style={{ width: `${(losses / trades.length) * 100}%`, background: '#ff5570' }} />}
                  {pending > 0 && <div style={{ width: `${(pending / trades.length) * 100}%`, background: VIOLET }} />}
                </div>
                <div className="flex gap-4 mt-2 font-mono text-[10px]">
                  <span style={{ color: TEAL }}>{wins} won</span><span style={{ color: '#ff5570' }}>{losses} lost</span><span style={{ color: VIOLET }}>{pending} pending</span>
                </div>
              </div>
              {trades.length === 0 ? (
                <div className="px-5 py-12 text-center text-[13px] text-[#555]">No trades indexed yet. Once this wallet trades on Polymarket, every fill lands here.</div>
              ) : (
                <div className="max-h-[360px] overflow-y-auto">
                  {trades.map((t, i) => {
                    const tx = txOf(t); const yes = t.side === 'YES' || t.side === 'LONG'
                    const status = t.status || t.outcome
                    const oc = status === 'WIN' ? TEAL : status === 'LOSS' ? '#ff5570' : VIOLET
                    return (
                      <div key={t.id || i} className="flex items-center gap-3 px-5 py-2.5 border-b border-[#101010] hover:bg-[#0b0b0b] transition-colors" style={{ borderLeft: `2px solid ${oc}` }}>
                        <span className="w-12 shrink-0 leading-tight">
                          <span className="block font-mono text-[10px] text-[#666] tabular-nums">{relDay(t.timestamp)}</span>
                          <span className="block font-mono text-[9px] text-[#3f3f48] tabular-nums">{relTime(t.timestamp)}</span>
                        </span>
                        <span className="flex-1 min-w-0 text-[12px] text-[#bbb] truncate">{tx ? <a href={`https://polygonscan.com/tx/${tx}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors no-underline">{t.marketTitle} <span className="text-[#444] text-[9px]">↗</span></a> : t.marketTitle}</span>
                        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ color: yes ? TEAL : '#ff5570', background: yes ? `${TEAL}14` : '#ff557014' }}>{t.side}</span>
                        {/* bot's price vs the market price at commit — the edge, made visible */}
                        <span className="w-16 text-right shrink-0 leading-tight">
                          <span className="block font-mono text-[11px] text-[#ccc] tabular-nums">{((t.confidence || t.entryPrice || 0) * 100).toFixed(0)}¢</span>
                          {t.marketProbabilityAtCommit != null && <span className="block font-mono text-[9px] text-[#555] tabular-nums">mkt {(t.marketProbabilityAtCommit * 100).toFixed(0)}¢</span>}
                        </span>
                        <span className="font-mono text-[9px] font-bold w-12 text-right shrink-0" style={{ color: oc }}>{status}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Panel>

            {/* comments */}
            <Panel>
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#141414]">
                <div className="flex items-baseline gap-2.5">
                  <span className="font-sans font-bold text-[15px] tracking-tight">Comments</span>
                  <span className="font-mono text-[11px] text-[#5a5a64] tabular-nums">{posts.length}</span>
                </div>
                <span className="font-mono text-[10px] text-[#48484f] tracking-wide">traders weigh in on this bot</span>
              </div>
              <div className="px-5 py-4 border-b border-[#141414] bg-[#050507]">
                {isConnected && address ? (
                  <div className="flex gap-3">
                    <MakerAvatar address={address} pfpUrl={currentUser?.pfpUrl} size={36} square />
                    <div className="flex-1">
                      <textarea value={postText} onChange={e => setPostText(e.target.value)} maxLength={500} placeholder="Is this edge real? Share your read, cite the tape, call the top…" className="w-full h-[68px] bg-[#0a0a0c] border border-[#1f1f28] rounded-lg px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-primary/50 resize-y placeholder:text-[#4a4a54] leading-relaxed" />
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-mono text-[10px] text-[#3f3f48]">{postText.length}/500 · markdown & {'>'}quotes</span>
                        <button onClick={addPost} disabled={!postText.trim()} className="rounded-full bg-primary text-[#030303] font-bold text-[12px] px-5 py-2 disabled:opacity-30 hover:shadow-[0_0_14px_rgba(255,42,77,0.4)] transition-all">Post</button>
                      </div>
                    </div>
                  </div>
                ) : <div className="text-[13px] text-[#8a8a94]">Connect your wallet to weigh in.</div>}
              </div>
              {posts.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <div className="text-[13px] text-[#6a6a74]">No comments yet.</div>
                  <div className="text-[11px] text-[#3f3f48] mt-1 font-mono">be the first to call it</div>
                </div>
              ) : (
                <div className="flex flex-col">
                  {posts.map((p, i) => (
                    <div key={p.id || i} className="flex gap-3 px-5 py-4 border-b border-[#101010] last:border-b-0 hover:bg-[#070709] transition-colors">
                      <MakerAvatar address={p.wallet} pfpUrl={p.user?.pfpUrl} size={36} square />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[13px] font-bold text-white">{personLabel(p.user, p.wallet)}</span>
                          <span className="font-mono text-[10px] text-[#48484f] tabular-nums">{relDay(p.createdAt) || 'now'}</span>
                        </div>
                        <div className="text-[13px] text-[#cfcfd6] leading-relaxed"><PostBody text={p.text} onQuoteClick={() => {}} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-6">
            {/* eligibility */}
            <Panel className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-sans font-bold text-[16px] tracking-[-0.01em] text-white">Vault eligibility</span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-[4px]" style={{ color: sp.live || sp.eligible ? TEAL : VIOLET, background: sp.live || sp.eligible ? `${TEAL}14` : `${VIOLET}14`, border: `1px solid ${sp.live || sp.eligible ? TEAL : VIOLET}33` }}>
                  {sp.live ? 'OPEN' : sp.eligible ? 'ELIGIBLE' : 'SHADOW PHASE'}
                </span>
              </div>
              <div className="text-[12px] text-[#8a8a94] mb-4 leading-relaxed">
                {sp.live ? 'This bot cleared the gate. Its vault is open.' : `Proving in the open. ${clearedCount} of 3 cleared. The vault unlocks when all three are met.`}
              </div>
              <div className="flex flex-col gap-4">
                {criteria.map((c, idx) => (
                  <div key={c.label}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-semibold inline-flex items-center gap-2" style={{ color: c.ok ? '#e8e8e8' : '#bbb' }}>
                        <span className="grid place-items-center w-4 h-4 rounded-full text-[9px]" style={{ background: c.ok ? TEAL : '#1c1c22', color: c.ok ? '#030303' : VIOLET }}>{c.ok ? '✓' : idx + 1}</span>
                        {c.label}
                      </span>
                      <span className="font-mono text-[12px] tabular-nums" style={{ color: c.ok ? '#9a9a9a' : VIOLET }}>{c.val}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#0e0e0e] overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ background: c.ok ? TEAL : VIOLET }} initial={{ width: 0 }} animate={{ width: `${c.pct * 100}%` }} transition={{ duration: 0.9, ease: 'easeOut', delay: idx * 0.12 }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* financial performance — real-time PnL curve */}
            <BotPerformance 
              title="Financial Performance" 
              mode="money" 
              snapshots={bot.pnlSnapshots} 
              live={sp.live} 
              info="The cumulative net profit of the Vault in USDC. This tracks actual settled payouts on-chain and fluctuates as predictions resolve."
            />

            {/* proof of edge */}
            <Panel className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-sans font-bold text-[16px] tracking-[-0.01em] text-white">Proof of edge</span>
                <span className="font-mono text-[9px] text-[#3f3f48] tracking-[0.16em] uppercase">tap a stat</span>
              </div>

              <div className="grid grid-cols-2 gap-px bg-[#13131b] border border-[#13131b] rounded-lg overflow-hidden">
                {stats.map(m => {
                  const open = activeStat === m.k
                  return (
                    <button
                      key={m.k}
                      onClick={() => setActiveStat(s => s === m.k ? null : m.k)}
                      className="bg-[#08080c] px-3.5 py-3 text-left hover:bg-[#0c0c12] transition-colors"
                      style={open ? { background: '#10101a' } : undefined}
                    >
                      <div className="flex items-center gap-1 text-[#4a4a54] text-[9px] font-mono tracking-[0.14em] mb-1.5 uppercase">
                        {m.k}<span className="text-[#2f2f38]">{open ? '−' : '?'}</span>
                      </div>
                      <div className="font-sans font-bold text-[15px] tabular-nums text-[#f0f0f4]">{m.v ?? <Empty />}</div>
                    </button>
                  )
                })}
              </div>

              <AnimatePresence mode="wait">
                {activeStat && (
                  <motion.div
                    key={activeStat}
                    initial={{ opacity: 0, y: -4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2.5 rounded-lg border-l-2 border-primary/50 bg-[#0a0a0e] px-3.5 py-2.5 text-[12px] text-[#b4b4be] leading-relaxed">
                      <span className="text-white font-bold">{activeStat}</span>{' '}
                      {`— ${stats.find(s => s.k === activeStat)?.info}`}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Panel>
          </div>
        </div>

      </div>

      {toast && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-8 right-8 z-[9999] bg-[#0d0d0d] border border-primary/40 text-white text-[13px] px-4 py-2.5 rounded-xl shadow-[0_0_24px_rgba(255,42,77,0.25)]">{toast}</motion.div>
      )}

    </div>
  )
}
