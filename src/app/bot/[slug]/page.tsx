'use client'

import { use, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import BotHeroPortrait from '@/components/bot/BotHeroPortrait'
import CalibrationCurve from '@/components/bot/CalibrationCurve'
import MakerAvatar from '@/components/MakerAvatar'
import BotUplink from '@/components/bot/BotUplink'
import BotPerformance from '@/components/bot/BotPerformance'
import VaultGlass from '@/components/bot/VaultGlass'
import ApiKeysManager from '@/components/bot/ApiKeysManager'
import { botEye, codename } from '@/lib/botIdentity'
import { personLabel as sharedPersonLabel } from '@/lib/identity'
import { classifyMarket } from '@/lib/marketCategories'
import { FEATURES } from '@/lib/features'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { motion, AnimatePresence } from 'framer-motion'
import { useCountUp } from '@/hooks/useCountUp'
import { PostBody } from '@/components/bot/PostBody'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
  shadowProgress, phaseMeta, botRank, BOT_RANKS,
  SHADOW_RESOLVED_TARGET, SHADOW_DAYS_TARGET, SHADOW_LCB_TARGET,
} from '@/lib/botProgress'

interface Post {
  id: string; wallet: string; text: string; createdAt: string;
  user?: { handle?: string | null; name?: string | null; pfpUrl?: string | null } | null
}

const fmtUSD = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${Math.round(n).toLocaleString()}`
// Universal identity: the SAME resolver the navbar and maker page use, so one
// wallet never reads as two different people. Anonymous commenters keep their
// deterministic codename (more human than a hex stub in a conversation).
const personLabel = (u?: Post['user'], wallet = '') => {
  const label = sharedPersonLabel(u, wallet)
  return label.startsWith('0x') || label === '—' ? codename(wallet) : label
}
const shortAddr = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'anon'
const relDay = (d?: string | Date | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null

function txOf(t: any): string | null {
  const hash = String(t.externalTradeId || '').split('-')[0]
  return hash.startsWith('0x') && hash.length >= 40 ? hash : null
}

const Empty = () => <span className="text-[#333]">·</span>

// One color per Polymarket category — used by the hunting-grounds panel and
// the per-call dots in the prediction book so a bot from ANY category reads
// as first-class on this page.
const CATEGORY_COLORS: Record<string, string> = {
  politics: '#8b7bff', crypto: '#c8ff00', sports: '#4fc3f7', economy: '#ffd400',
  culture: '#ff5ccd', tech: '#4285f0', world: '#ff8a3c', other: '#8a8a94',
}

// Wayfinding — the profile is long; these anchors + scrollspy keep the whole
// story reachable in one tap from anywhere on the page.
const SECTIONS = [
  { id: 'vault', label: 'Vault' },
  { id: 'signal', label: 'Signal' },
  { id: 'calls', label: 'Calls' },
  { id: 'comments', label: 'Comments' },
  { id: 'edge', label: 'Edge' },
] as const

// Defined at MODULE level (not inside the component) — a component redefined on
// every render gets a new identity, so React remounts its subtree and inputs lose
// focus after one keystroke. That was the "can only type one letter" comment bug.
// Panels rise into view once as you scroll; border warms on hover.
const Panel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
    className={`rounded-2xl border border-[#1a1a1a] bg-[#080809] overflow-hidden transition-colors duration-300 hover:border-[#26262e] ${className}`}
  >{children}</motion.div>
)

// Tiny inline sparkline for the Brier trajectory (no external chart dep).
const Sparkline = ({ values, color }: { values: number[]; color: string }) => {
  if (values.length < 2) return null
  const w = 92, h = 24, min = Math.min(...values), max = Math.max(...values), span = max - min || 1
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / span) * h}`).join(' ')
  return (
    <svg width={w} height={h} aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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
  const [openHint, setOpenHint] = useState<string | null>(null)
  const [confettiBurst, setConfettiBurst] = useState(0)

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editTagline, setEditTagline] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPfp, setEditPfp] = useState('')
  const [savingBot, setSavingBot] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('vault')
  const [bookFilter, setBookFilter] = useState<'ALL' | 'WIN' | 'LOSS' | 'PENDING'>('ALL')
  const [bookLimit, setBookLimit] = useState(40)

  // Scrollspy for the sticky section nav — re-arms once the bot renders.
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) setActiveSection(e.target.id)
    }, { rootMargin: '-25% 0px -65% 0px' })
    SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) obs.observe(el) })
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bot?.id])

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
        // Headline score: the row flagged isLatest (the scorer maintains exactly one),
        // NOT the last by snapshotDate — same-day rows (cron at 00:00 UTC vs seeds at
        // any hour) made positional "last" grab a stale/empty snapshot.
        const s = dbBot.scores?.find((x: any) => x.isLatest)
          ?? (dbBot.scores?.length > 0 ? dbBot.scores[dbBot.scores.length - 1] : null)
        
        const mapped = {
          // builder = the human's wallet (ownerWallet) — walletAddress can be
          // the bot's execution wallet, which has no profile behind it.
          id: dbBot.id, name: dbBot.name, builder: dbBot.makerWallet || dbBot.ownerWallet || dbBot.walletAddress, tagline: dbBot.tagline,
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
          reputationScore: s?.reputationScore ?? null, resolvedPredictions: s?.resolvedPredictions ?? 0,
          reputationHistory: (dbBot.scores || []).map((x: any) => x.reputationScore).filter((v: any) => typeof v === 'number'),
          lastHeartbeatAt: dbBot.lastHeartbeatAt ?? null, liveActivity: dbBot.liveActivity ?? null,
          scoreHistory: (dbBot.scores || []).map((s: any) => ({ brier: s.brierScore, date: s.snapshotDate })),
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

  // Live liveness poll — refresh heartbeat + activity every 5s so the profile
  // shows the bot as operating/offline in near real time (the bot beats ~4s).
  useEffect(() => {
    if (!slug) return
    const tick = () => fetch(`/api/bots/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setBot((prev: any) => prev ? { ...prev, lastHeartbeatAt: d.lastHeartbeatAt ?? null, liveActivity: d.liveActivity ?? null, predictions: d.predictions ?? prev.predictions } : prev) })
      .catch(() => {})
    const id = setInterval(tick, 5000)
    return () => clearInterval(id)
  }, [slug])

  // load whether the current wallet already liked this bot
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

  // ── Hunting grounds: honest per-category performance across EVERY Polymarket
  // category, derived only from the bot's own calls. A politics bot, a sports
  // bot and a crypto bot all get the same first-class page.
  // (Hook — must live ABOVE the early returns or React counts hooks unevenly
  // between the loading render and the loaded one.)
  const catStats = useMemo(() => {
    const acc = new Map<string, { n: number; wins: number; losses: number; edgeSum: number; edgeN: number }>()
    for (const t of trades) {
      const cat = classifyMarket(t.marketTitle || '') || 'other'
      const s = acc.get(cat) || { n: 0, wins: 0, losses: 0, edgeSum: 0, edgeN: 0 }
      s.n++
      const st = t.status || t.outcome
      if (st === 'WIN') s.wins++
      else if (st === 'LOSS') s.losses++
      if (typeof t.confidence === 'number' && typeof t.marketProbabilityAtCommit === 'number') {
        s.edgeSum += Math.abs(t.confidence - t.marketProbabilityAtCommit); s.edgeN++
      }
      acc.set(cat, s)
    }
    return [...acc.entries()]
      .map(([cat, s]) => ({ cat, ...s, resolved: s.wins + s.losses, wr: s.wins + s.losses > 0 ? s.wins / (s.wins + s.losses) : null, avgEdge: s.edgeN > 0 ? s.edgeSum / s.edgeN : null }))
      .sort((a, b) => b.n - a.n)
  }, [trades])

  if (loading) return <div className="min-h-screen bg-[#030303] text-[#666] grid place-items-center font-sans text-sm">Validating Identity...</div>
  if (!bot) return notFound()

  // ── derivations ──
  // Operating vs offline: a beat within the last 90s = connected. Relaxed from
  // 12s so the indicator doesn't flash on/off with every poll cycle — bots that
  // are genuinely connected to Brier stay green, bots that crashed go dark.
  const isOnline = !!(bot.lastHeartbeatAt && Date.now() - new Date(bot.lastHeartbeatAt).getTime() < 90_000)

  // Brier trajectory: is the bot getting sharper over time? History comes newest
  // first; reverse to oldest→newest. A FALLING Brier means improving calibration.
  const brierSeries: number[] = [...(bot.scoreHistory || [])]
    .map((s: any) => s.brier).filter((v: any) => typeof v === 'number').reverse()
  const trend = brierSeries.length >= 2
    ? (() => {
        const delta = brierSeries[brierSeries.length - 1] - brierSeries[0] // <0 = improving
        return { delta, improving: delta < -0.003, worsening: delta > 0.003, series: brierSeries }
      })()
    : null

  // Reputation (LCB → 0..100) history, oldest→newest, for the reputation curve.
  const repSeries: number[] = [...(bot.reputationHistory || [])].filter((v: any) => typeof v === 'number').reverse()
  const sp = shadowProgress({
    status: bot.status, createdAt: bot.createdAt, vaultOpen: bot.vaultOpen, currentTVL: bot.tvl,
    scores: [{ lcb: bot.lcb ?? undefined, brierScore: bot.brierScore ?? undefined, winRate: bot.winRate ?? undefined, totalTrades: bot.totalTrades }],
    tradesIndexed: bot.tradesIndexed,
  })
  const pm = phaseMeta(sp)
  const rank = botRank(sp.resolved)
  const nextRankAt = BOT_RANKS.find(r => r.at > sp.resolved)?.at ?? null
  const eye = botEye({ slug, id: bot.id, name: bot.name, color: bot.color, eyeShape: bot.eyeShape })
  
  // Featured Brier + ORACLE grade (the headline pair on Proof of edge).
  const b = bot.brierScore
  const grade = b == null ? null
    : b <= 0.15 ? { t: 'ORACLE', c: '#c8ff00' }
    : b <= 0.25 ? { t: 'CALIBRATED', c: '#eef0f6' }
    : b <= 0.40 ? { t: 'LEARNING', c: '#8b7bff' }
    : { t: 'NOISE', c: '#ff5570' }

  const lcb = bot.lcb ?? 0
  const brierSkill = bot.brierScore ?? 0
  const winRate = bot.winRate ?? 0
  const tradesCount = bot.totalTrades ?? 0

  const hasVerifiedPerformance = tradesCount >= 100
  const hasVerifiedReputation = lcb > 0

  // We map the historical LCB scores into snapshots for the BotPerformance chart.
  // Rows without an lcb (pre-reputation snapshots) would poison the curve as 0s.
  const lcbSnapshots = bot.allScores?.filter((s: any) => typeof s.lcb === 'number').map((s: any) => ({
    cumulativePnl: s.lcb,
    date: s.snapshotDate
  })) || []

  const wins = trades.filter(t => t.status === 'WIN' || t.outcome === 'WIN').length
  const losses = trades.filter(t => t.status === 'LOSS' || t.outcome === 'LOSS').length
  const pending = trades.filter(t => t.status === 'PENDING' || t.outcome === 'PENDING').length

  // Prediction book at scale: filter + pagination so a bot with thousands of
  // calls in any category stays fast and navigable.
  const filteredTrades = bookFilter === 'ALL' ? trades : trades.filter(t => (t.status || t.outcome) === bookFilter)
  const visibleTrades = filteredTrades.slice(0, bookLimit)

  // Form guide: the last 10 resolved calls as W/L, oldest → newest. Trades
  // arrive newest-first, so take the head and reverse for reading order.
  const formGuide = trades
    .filter(t => { const st = t.status || t.outcome; return st === 'WIN' || st === 'LOSS' })
    .slice(0, 10)
    .map(t => (t.status || t.outcome) === 'WIN')
    .reverse()
  const navValues: number[] = (bot.pnlSnapshots || []).map((s: any) => s.cumulativePnl ?? s.pnlUsd).filter((v: any) => typeof v === 'number')
  const navStart = navValues[0] ?? 0
  const navDelta = bot.sharePrice && bot.sharePrice !== 1 ? (bot.sharePrice - 1) * 100 : (navValues.length > 1 && Math.abs(navStart) > 1 ? ((navValues[navValues.length - 1] - navStart) / Math.abs(navStart)) * 100 : 0)
  const roi = bot.sharePrice && bot.sharePrice !== 1 ? navDelta : null
  const uplink = (bot.tradesIndexed > 0 || trades.length > 0) ? 'live' : 'awaiting'
  const lastFill = trades.length ? relDay(trades[0].timestamp) : null

  const VIOLET = '#8b7bff', TEAL = '#c8ff00'
  const criteria = [
    { label: 'Resolved predictions', hint: 'How many of its predictions have settled. A big enough sample so the score is not luck.', val: `${sp.resolved} / ${SHADOW_RESOLVED_TARGET}`, ok: sp.resolvedPass, pct: Math.min(1, sp.resolved / SHADOW_RESOLVED_TARGET) },
    { label: 'Edge over market', hint: 'Does it beat the market price, not just call obvious outcomes. LCB (lower confidence bound) discounts luck: a few lucky calls will not pass it. This is why the gate is skill-vs-market, not raw Brier.', val: sp.lcb != null ? `LCB ${sp.lcb >= 0 ? '+' : ''}${sp.lcb.toFixed(3)}` : 'LCB > 0', ok: sp.lcbPass, pct: sp.lcb == null ? 0 : Math.min(1, Math.max(0, sp.lcb / 0.10)) },
    { label: 'Days live', hint: 'Minimum time proving in the open, so a short hot streak cannot graduate to a vault.', val: `${sp.days} / ${SHADOW_DAYS_TARGET}`, ok: sp.daysPass, pct: Math.min(1, sp.days / SHADOW_DAYS_TARGET) },
  ]
  const clearedCount = criteria.filter(c => c.ok).length

  // Cleaned up stats for "Proof of edge" section
  const stats = [
    { k: 'LCB (Reputation)', v: lcb > 0 ? lcb.toFixed(4) : '—', info: 'Lower Confidence Bound. The pessimistic lower bound of its skill. Tells us whether the agent is actually smart or just lucky.' },
    // Small samples get their n printed next to the rate: a 100% off four calls
    // should read as "early", never as "proven".
    { k: 'Win rate', v: bot.winRate != null ? `${(bot.winRate * 100).toFixed(1)}%${tradesCount > 0 && tradesCount < 20 ? ` · n=${tradesCount}` : ''}` : null, info: 'Share of resolved predictions it got right. With few resolved calls this is noise, not proof — that is what the n= reminds you of.' },
    { k: 'ROI', v: roi != null ? `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%` : null, info: 'Return on the vault capital since it opened.' },
    { k: 'Max drawdown', v: bot.maxDrawdown != null ? `-${(Math.abs(bot.maxDrawdown) * 100).toFixed(1)}%` : null, info: 'The worst peak-to-trough drop in value. Smaller is safer.' },
    { k: 'Resolved', v: bot.totalTrades ? bot.totalTrades.toLocaleString() : null, info: 'Predictions that have settled — the sample size behind the score.' },
    { k: 'Sharpe', v: bot.sharpe != null ? bot.sharpe.toFixed(2) : null, info: 'Return per unit of risk. Higher means steadier, less jumpy gains.' },
  ]

  return (
    <div className="relative min-h-screen bg-[#030303] font-sans text-[#e8e8e8] overflow-x-clip">
      {/* identity aura — each bot tints its own profile with its derived color */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[460px] pointer-events-none"
        style={{ background: `radial-gradient(640px 300px at 26% -8%, ${eye.accentColor}1f 0%, transparent 70%)` }}
      />
      {/* deep-space ambience — the bot's pocket of the Brier universe. Pure CSS
          (no animation loop): a sparse starfield plus two faint nebulae in the
          bot's own color. Fixed so the cosmos stays put while you scroll. */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: [
            `radial-gradient(1px 1px at 8% 12%, #ffffff14 50%, transparent)`,
            `radial-gradient(1px 1px at 22% 64%, #ffffff0d 50%, transparent)`,
            `radial-gradient(1.5px 1.5px at 37% 28%, ${eye.accentColor}22 50%, transparent)`,
            `radial-gradient(1px 1px at 52% 80%, #ffffff10 50%, transparent)`,
            `radial-gradient(1px 1px at 64% 18%, #ffffff0d 50%, transparent)`,
            `radial-gradient(1.5px 1.5px at 78% 52%, ${eye.accentColor}1c 50%, transparent)`,
            `radial-gradient(1px 1px at 88% 84%, #ffffff12 50%, transparent)`,
            `radial-gradient(1px 1px at 94% 34%, #ffffff0d 50%, transparent)`,
            `radial-gradient(520px 380px at 90% 108%, ${eye.accentColor}0d 0%, transparent 70%)`,
          ].join(','),
        }}
      />
      <div className="relative max-w-[1180px] mx-auto px-6 pt-6 pb-20">

        {/* top bar */}
        <div className="flex items-center justify-between mb-6 text-[12px]">
          <Link href="/discover" className="text-[#777] hover:text-white transition-colors no-underline">← The Catalog</Link>
          {isOwner && (
            <button onClick={() => setIsEditing(v => !v)} className="font-sans text-[12px] font-semibold px-3.5 py-1.5 rounded-full border border-[#222] text-[#ccc] hover:border-[#444] hover:text-white transition-all">
              {isEditing ? 'Close editor' : 'Edit profile'}
            </button>
          )}
        </div>

        {/* ── SLEEK HORIZONTAL HERO BANNER ── */}
        <div className="w-full rounded-[24px] border border-[#1a1a1a] bg-[#050505] shadow-2xl mb-12 flex flex-col lg:flex-row items-center p-6 gap-6 relative overflow-hidden">
          
          {/* LEFT: Identity (Slim and compact) */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center gap-5 lg:w-[45%] xl:w-[40%] shrink-0 min-w-0">
            <div className="relative shrink-0">
              <BotHeroPortrait eye={eye} pfpUrl={bot.pfpUrl} name={bot.name} online={isOnline} size={100} />
              <button onClick={toggleHeart} className={`absolute -bottom-2 -right-2 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full border bg-[#050505] shadow-xl z-10 transition-all cursor-pointer ${hearted ? 'border-primary text-primary' : 'border-[#222] text-[#888] hover:border-primary/50 hover:text-primary'}`}>
                <motion.span key={hearted ? 'on' : 'off'} initial={{ scale: 0.6 }} animate={{ scale: hearted ? [1.4, 1] : 1 }} transition={{ duration: 0.35 }} className="text-[12px] leading-none">{hearted ? '♥' : '♡'}</motion.span>
                <span className="font-mono font-bold text-[10px] tabular-nums leading-none tracking-widest">{hearts}</span>
              </button>
            </div>
            
            <div className="min-w-0 flex flex-col justify-center text-center sm:text-left">
              <h1 className="text-white font-black text-[32px] m-0 leading-none mb-2 truncate" title={bot.name}>
                {bot.name}
              </h1>
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#555]">by</span>
                <Link href={`/maker/${bot.builder || ''}`} className="font-sans font-semibold text-[13px] text-[#e8e8e8] hover:text-white transition-colors truncate max-w-[120px]">{sharedPersonLabel(bot.maker, bot.builder)}</Link>
                <div className="w-1 h-1 rounded-full bg-[#333] hidden sm:block" />
                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  {isOnline ? (
                    <><span className="w-1.5 h-1.5 rounded-full" style={{ background: TEAL, boxShadow: `0 0 8px ${TEAL}88` }} /><span className="font-bold tracking-[0.16em] uppercase" style={{ color: TEAL }}>Live</span></>
                  ) : (
                    <><span className="w-1.5 h-1.5 rounded-full bg-[#3a3a44]" /><span className="text-[#5a5a64] font-bold tracking-[0.16em] uppercase">Standby</span></>
                  )}
                </div>
              </div>
              
              {bot.description && (
                <p className="text-[12px] leading-relaxed text-[#888] line-clamp-2 mb-3 max-w-sm">
                  {bot.description}
                </p>
              )}
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <div className="px-2 py-1 rounded text-[9px] font-mono font-bold tracking-widest uppercase border bg-[#c8ff00]/10 text-[#c8ff00] border-[#c8ff00]/30 flex items-center gap-1.5">
                  <span className="text-[11px] leading-none">⬡</span> {hasVerifiedPerformance ? 'Verified' : 'Pending'}
                </div>
                <div className="px-2 py-1 rounded text-[9px] font-mono font-bold tracking-widest uppercase border" style={{ color: rank.color, borderColor: `${rank.color}33`, background: `${rank.color}0d` }}>
                  {rank.tag}
                </div>
                {bot.categoriesData?.slice(0,2).map((c: any) => (
                  <div key={c.name} className="px-2 py-1 bg-[#111] border border-[#222] rounded font-mono text-[9px] text-[#777] flex items-center gap-1">
                    <span className="text-[#ccc] font-bold">{Math.round(c.volumePct)}%</span> <span className="uppercase">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Vault (Stretching horizontally to occupy all space, filling up as progress) */}
          <div className="flex-1 bg-[#0a0a0c] border border-[#141414] rounded-[16px] p-6 md:p-8 flex items-center w-full min-w-0 shadow-inner relative overflow-hidden">
            
            {/* The Vault Fill Background - Dark Matter Nebula Effect */}
            <motion.div 
              className="absolute inset-y-0 left-0"
              style={{
                background: sp.live 
                  ? `radial-gradient(150% 100% at 100% 50%, rgba(255,100,0,0.25) 0%, rgba(255,42,77,0.15) 40%, transparent 100%), linear-gradient(90deg, rgba(10,0,0,0.8) 0%, rgba(40,5,10,0.5) 60%, rgba(255,42,77,0.2) 100%)`
                  : `radial-gradient(150% 100% at 100% 50%, rgba(180,123,255,0.25) 0%, rgba(139,123,255,0.15) 40%, transparent 100%), linear-gradient(90deg, rgba(5,0,15,0.8) 0%, rgba(20,10,40,0.5) 60%, rgba(139,123,255,0.2) 100%)`,
                borderRight: sp.live ? '2px solid rgba(255,80,0,0.6)' : `2px solid ${VIOLET}88`,
                boxShadow: sp.live ? '4px 0 24px rgba(255,80,0,0.3), inset -4px 0 16px rgba(255,42,77,0.3)' : `4px 0 24px ${VIOLET}44, inset -4px 0 16px ${VIOLET}33`
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, sp.live ? (animatedTVL / (vaultCap || Math.max(animatedTVL * 1.5, 10000))) * 100 : sp.pct * 100))}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />

            <div className="relative z-10 flex-1 min-w-0 flex flex-wrap items-center justify-center md:justify-between w-full gap-6">
              <div className="text-center md:text-left shrink-0">
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888] mb-1">Vault Status</div>
                <div className="font-sans font-black text-[32px] md:text-[36px] text-white tracking-[-0.03em] leading-none">
                  {sp.live ? fmtUSD(animatedTVL) : 'Shadow phase'}
                </div>
                {sp.live && (
                  <div className={`font-mono text-[12px] font-bold mt-1.5 ${navDelta >= 0 ? 'text-[#c8ff00]' : 'text-[#ff5570]'}`}>
                    {navDelta >= 0 ? '▲' : '▼'} {Math.abs(navDelta).toFixed(1)}%
                  </div>
                )}
              </div>
              
              <div className="text-center md:text-left shrink-0">
                <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#555] mb-1">Skin In Game</div>
                <div className="font-sans font-bold text-[16px] md:text-[18px] text-white tabular-nums">{fmtUSD(bot.skinInGame || 0)}</div>
              </div>
              
              {sp.live && (
                <div className="shrink-0 w-full sm:w-auto flex justify-center">
                  {!FEATURES.CAPITAL_LAYER ? (
                    <div className="text-[12px] text-[#666]">Capital Layer disabled.</div>
                  ) : atCapacity ? (
                    <div className="rounded border border-primary/30 p-2 font-mono text-[11px] text-primary tracking-widest bg-[#0a0a0c]/80 backdrop-blur">AT CAPACITY</div>
                  ) : !isConnected ? (
                    <div className="text-[12px] text-[#666]">Connect wallet</div>
                  ) : (
                    <div className="flex gap-2 w-full max-w-[240px]">
                      <input type="number" value={depositAmt} onChange={e => setDepositAmt(e.target.value)} placeholder="USDC" className="w-[110px] flex-1 bg-[#050505]/80 backdrop-blur border border-[#1f1f1f] rounded-lg px-3 py-2 text-[14px] text-white outline-none focus:border-primary/50 min-w-0" />
                      <button onClick={handleDeposit} disabled={depositing} className="shrink-0 rounded-lg bg-primary text-[#030303] font-bold text-[13px] px-5 py-2 disabled:opacity-50 hover:shadow-[0_0_12px_rgba(255,42,77,0.4)] transition-all">Deposit</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {isOwner && isEditing && (
          <Panel className="mb-8 p-5">
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#666] mb-4">Edit profile</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block"><span className="text-[12px] text-[#bbb] font-semibold">Name</span><input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1.5 w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-primary/50" /></label>
              <label className="block"><span className="text-[12px] text-[#bbb] font-semibold">Tagline</span><input value={editTagline} onChange={e => setEditTagline(e.target.value)} className="mt-1.5 w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-primary/50" /></label>
              <label className="block sm:col-span-2"><span className="text-[12px] text-[#bbb] font-semibold">Bio</span><textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="mt-1.5 w-full h-24 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-primary/50 resize-y" /></label>
            </div>
            <button onClick={handleSaveBot} disabled={savingBot} className="mt-4 rounded-full bg-primary text-[#030303] font-bold text-[13px] px-6 py-2.5 disabled:opacity-50 hover:shadow-[0_0_18px_rgba(255,42,77,0.4)] transition-all">{savingBot ? 'Saving…' : 'Save changes'}</button>
            {/* API Keys — owner-only, inside settings panel */}
            <div className="mt-6 pt-5 border-t border-[#1a1a1a]">
              <ApiKeysManager botId={bot.id} />
            </div>
          </Panel>
        )}

        {/* API keys moved inside the edit panel — not on the public profile */}

        {/* section nav — sticky wayfinding, scrollspy-highlighted */}
        <div className="sticky top-[60px] z-40 mb-7">
          <div className="inline-flex items-center gap-1 rounded-full border border-[#1c1c24] bg-[rgba(5,5,8,0.88)] backdrop-blur-md px-1.5 py-1.5 max-w-full overflow-x-auto">
            {SECTIONS.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                className={`shrink-0 rounded-full px-3.5 py-1.5 font-mono text-[11px] font-bold tracking-[0.08em] uppercase no-underline transition-all ${
                  activeSection === s.id
                    ? 'bg-primary text-[#030303]'
                    : 'text-[#7a7a84] hover:text-white hover:bg-[#14141c]'
                }`}
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>

        {/* Vault moved to right column */}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-6 min-w-0">
            {/* signal — live connection visual */}
            <div id="signal" className="scroll-mt-28 transform scale-[0.9] origin-top-left w-[111.11%]">
              <BotUplink eye={eye} status={uplink} lastFill={lastFill} resolved={sp.resolved} online={isOnline} target={SHADOW_RESOLVED_TARGET} winRate={bot.winRate} />
            </div>

            {/* performance — Liveline real-time-style Reputation (LCB) curve */}
            <BotPerformance 
              title="Reputation Tracker (LCB)" 
              subtitle="historical relative skill"
              mode="score" 
              snapshots={lcbSnapshots} 
              winRate={bot.winRate} 
              sharpe={bot.sharpe} 
              maxDrawdown={bot.maxDrawdown} 
              totalTrades={bot.totalTrades} 
              live={sp.live} 
              info="Reputation (LCB) is mathematically derived from the agent's Brier Score compared against the Polymarket consensus. It measures relative skill: a score > 0 means the agent consistently beats the market average. It uses a Lower Confidence Bound to ensure luck isn't rewarded."
            />

            {/* prediction book — the bot's committed calls (fills join in capital phase) */}
            <div id="calls" className="scroll-mt-28">
            <Panel>
              <div className="px-5 py-3.5 border-b border-[#141414]">
                <div className="flex items-center justify-between mb-2.5">
                  <div><span className="font-sans font-bold text-[14px]">Prediction book</span><span className="ml-2 font-mono text-[10px] text-[#555]">calls locked before resolution · on-chain fills join in capital phase</span></div>
                  <span className="font-mono text-[11px] text-[#888] tabular-nums">{trades.length} calls</span>
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden bg-[#0e0e0e]">
                  {wins > 0 && <div style={{ width: `${(wins / trades.length) * 100}%`, background: TEAL }} />}
                  {losses > 0 && <div style={{ width: `${(losses / trades.length) * 100}%`, background: '#ff5570' }} />}
                  {pending > 0 && <div style={{ width: `${(pending / trades.length) * 100}%`, background: VIOLET }} />}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-4 font-mono text-[10px]">
                    <span style={{ color: TEAL }}>{wins} won</span><span style={{ color: '#ff5570' }}>{losses} lost</span><span style={{ color: VIOLET }}>{pending} pending</span>
                    {/* form guide — last 10 resolved, newest on the right */}
                    {formGuide.length >= 3 && (
                      <span className="flex items-center gap-[3px] pl-2 border-l border-[#1a1a22]" title="last 10 resolved calls, newest right">
                        {formGuide.map((won, i) => (
                          <motion.span
                            key={i}
                            className="w-[6px] h-[6px] rounded-[1.5px]"
                            style={{ background: won ? TEAL : '#ff5570', boxShadow: won ? `0 0 5px ${TEAL}55` : '0 0 5px #ff557044' }}
                            initial={{ scale: 0, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 18 }}
                          />
                        ))}
                      </span>
                    )}
                  </div>
                  {/* filters — a bot with thousands of calls stays navigable */}
                  <div className="flex gap-1">
                    {([['ALL', 'All'], ['WIN', 'Won'], ['LOSS', 'Lost'], ['PENDING', 'Open']] as const).map(([k, label]) => (
                      <button
                        key={k}
                        onClick={() => { setBookFilter(k); setBookLimit(40) }}
                        className={`font-mono text-[9px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                          bookFilter === k ? 'bg-primary text-[#030303] border-primary' : 'bg-transparent text-[#6a6a74] border-[#22222a] hover:text-white hover:border-[#3a3a44]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {trades.length === 0 ? (
                <div className="px-5 py-12 text-center text-[13px] text-[#555]">No calls yet. The moment the bot commits a prediction it shows up here, then flips to WIN or LOSS when the market resolves.</div>
              ) : filteredTrades.length === 0 ? (
                <div className="px-5 py-10 text-center text-[13px] text-[#555]">No {bookFilter === 'PENDING' ? 'open' : bookFilter.toLowerCase()} calls yet.</div>
              ) : (
                <div className="max-h-[420px] overflow-y-auto">
                  {visibleTrades.map((t, i) => {
                    const tx = txOf(t); const yes = t.side === 'YES' || t.side === 'LONG'
                    const status = t.status || t.outcome
                    const oc = status === 'WIN' ? TEAL : status === 'LOSS' ? '#ff5570' : VIOLET
                    const cat = classifyMarket(t.marketTitle || '') || 'other'
                    const catColor = CATEGORY_COLORS[cat] || CATEGORY_COLORS.other
                    // How far from the market it dared to stand at commit time.
                    const edge = (typeof t.confidence === 'number' && typeof t.marketProbabilityAtCommit === 'number')
                      ? t.confidence - t.marketProbabilityAtCommit : null
                    return (
                      <div key={t.id || i} className="flex items-center gap-3 px-5 py-2.5 border-b border-[#101010] hover:bg-[#0b0b0b] transition-colors" style={{ borderLeft: `2px solid ${oc}` }}>
                        <span className="font-mono text-[10px] text-[#555] w-12 shrink-0 tabular-nums">{relDay(t.timestamp)}</span>
                        {/* category dot — politics, sports, crypto… every market family reads at a glance */}
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" title={cat} style={{ background: catColor, boxShadow: `0 0 5px ${catColor}66` }} />
                        <span className="flex-1 min-w-0 text-[12px] text-[#bbb] truncate">{tx ? <a href={`https://polygonscan.com/tx/${tx}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors no-underline">{t.marketTitle} <span className="text-[#444] text-[9px]">↗</span></a> : t.marketTitle}</span>
                        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ color: yes ? TEAL : '#ff5570', background: yes ? `${TEAL}14` : '#ff557014' }}>{t.side}</span>
                        <span className="font-mono text-[11px] text-[#999] w-9 text-right tabular-nums shrink-0">{((t.confidence || t.entryPrice || 0) * 100).toFixed(0)}¢</span>
                        <span className="font-mono text-[10px] w-11 text-right tabular-nums shrink-0" title="edge vs the market price at commit" style={{ color: edge == null ? '#3a3a44' : edge >= 0 ? TEAL : '#ff5570' }}>{edge == null ? '·' : `${edge >= 0 ? '+' : ''}${Math.round(edge * 100)}%`}</span>
                        <span className="font-mono text-[9px] font-bold w-14 text-right shrink-0" style={{ color: oc }}>{status}</span>
                      </div>
                    )
                  })}
                  {filteredTrades.length > bookLimit && (
                    <button
                      onClick={() => setBookLimit(l => l + 60)}
                      className="w-full py-3 font-mono text-[11px] font-bold text-[#7a7a84] hover:text-white hover:bg-[#0b0b0b] transition-colors cursor-pointer"
                    >
                      Show more · {filteredTrades.length - bookLimit} remaining
                    </button>
                  )}
                </div>
              )}
            </Panel>
            </div>

            {/* comments */}
            <div id="comments" className="scroll-mt-28">
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
                        <button onClick={() => setOpenHint(openHint === c.label ? null : c.label)} className="grid place-items-center w-4 h-4 rounded-full border border-[#2a2a34] text-[#6a6a74] text-[9px] hover:text-white hover:border-[#444] transition-colors cursor-pointer" aria-label="What is this?">?</button>
                      </span>
                      <span className="font-mono text-[12px] tabular-nums" style={{ color: c.ok ? '#9a9a9a' : VIOLET }}>{c.val}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#0e0e0e] overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ background: c.ok ? TEAL : VIOLET }} initial={{ width: 0 }} animate={{ width: `${c.pct * 100}%` }} transition={{ duration: 0.9, ease: 'easeOut', delay: idx * 0.12 }} />
                    </div>
                    <AnimatePresence>
                      {openHint === c.label && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="mt-2 rounded-lg border-l-2 border-primary/50 bg-[#0a0a0e] px-3 py-2 text-[12px] text-[#b4b4be] leading-relaxed">{c.hint}</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
            <div id="edge" className="scroll-mt-28">
            <Panel className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-sans font-bold text-[16px] tracking-[-0.01em] text-white">Proof of edge</span>
                <span className="font-mono text-[9px] text-[#3f3f48] tracking-[0.16em] uppercase">tap a stat</span>
              </div>

              {/* featured Brier — this is where 'lower is better' lives now */}
              <button
                onClick={() => setActiveStat(s => s === 'Brier' ? null : 'Brier')}
                className="w-full text-left rounded-lg border border-[#1a1a22] bg-[#08080c] px-4 py-3 mb-2.5 hover:border-[#2a2a34] transition-colors"
                style={grade ? { borderLeft: `2px solid ${grade.c}66` } : undefined}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-[#5a5a64]">Brier score</span>
                  <span className="font-mono text-[9px] text-[#3f3f48]">lower is better</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-sans font-black text-[28px] leading-none tabular-nums" style={{ color: grade?.c || '#7a7a84' }}>{b != null ? b.toFixed(3) : '—'}</span>
                  {grade && <span className="font-mono text-[10px] font-bold tracking-[0.16em]" style={{ color: grade.c }}>{grade.t}</span>}
                </div>
              </button>

              {/* trajectory — is the bot getting sharper? Falling Brier = improving. */}
              {trend ? (
                <div className="flex items-center justify-between rounded-lg border border-[#1a1a22] bg-[#08080c] px-4 py-2.5 mb-2.5">
                  <div>
                    <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-[#5a5a64]">Trajectory</div>
                    <div className="font-sans font-bold text-[13px] mt-0.5" style={{ color: trend.improving ? TEAL : trend.worsening ? '#ff5570' : '#9a9a9a' }}>
                      {trend.improving ? '▼ Sharpening' : trend.worsening ? '▲ Slipping' : '— Steady'}
                      <span className="font-mono text-[10px] text-[#5a5a64] ml-1.5">{trend.delta >= 0 ? '+' : ''}{trend.delta.toFixed(3)} over {trend.series.length}</span>
                    </div>
                  </div>
                  <Sparkline values={trend.series} color={trend.improving ? TEAL : trend.worsening ? '#ff5570' : '#6a6a74'} />
                </div>
              ) : (
                <div className="rounded-lg border border-[#141420] bg-[#08080c] px-4 py-2.5 mb-2.5 font-mono text-[10px] text-[#5a5a64]">
                  Trajectory appears once a few daily scores accumulate.
                </div>
              )}

              {/* reputation (LCB) — the anti-luck headline: skill over the market,
                  discounted for sample size. This, not raw Brier, is the gate. */}
              {bot.reputationScore != null && (
                <div className="flex items-center justify-between rounded-lg border border-[#1a1a22] bg-[#08080c] px-4 py-2.5 mb-2.5">
                  <div>
                    <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-[#5a5a64]" title="Reputation is the lower confidence bound (LCB) of the bot's skill vs the market. It discounts luck: a handful of lucky calls cannot inflate it. This is what opens a vault, not raw Brier.">Reputation · LCB ⓘ</div>
                    <div className="font-sans font-black text-[20px] mt-0.5 tabular-nums" style={{ color: bot.reputationScore >= 50 ? TEAL : '#9a9a9a' }}>
                      {Math.round(bot.reputationScore)}<span className="text-[11px] text-[#5a5a64] font-mono ml-1">/100</span>
                    </div>
                  </div>
                  {repSeries.length >= 2 && <Sparkline values={repSeries} color={TEAL} />}
                </div>
              )}

              {/* stat grid — each cell is interactive */}
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
                    key={`stat-${activeStat}`}
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

            {/* calibration — the reliability diagram, Brier's whole thesis in
                one chart: does this bot mean it when it says 70%? */}
            <Panel className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="font-sans font-bold text-[16px] tracking-[-0.01em] text-white">Calibration</span>
                <span className="font-mono text-[9px] text-[#3f3f48] tracking-[0.16em] uppercase">said vs happened</span>
              </div>
              <div className="text-[12px] text-[#8a8a94] mb-3">The whole thesis in one chart. Capital follows calibration, nothing else.</div>
              <CalibrationCurve predictions={trades} />
            </Panel>

            {/* hunting grounds — where this bot actually operates, across every
                Polymarket category. Derived only from its own calls (honest):
                a politics bot and a crypto bot get the same first-class page. */}
            {catStats.length > 0 && (
              <Panel className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-sans font-bold text-[16px] tracking-[-0.01em] text-white">Hunting grounds</span>
                  <span className="font-mono text-[9px] text-[#3f3f48] tracking-[0.16em] uppercase">from its own calls</span>
                </div>
                <div className="text-[12px] text-[#8a8a94] mb-4">Where this agent takes its shots, and how it lands in each arena.</div>
                <div className="flex flex-col gap-3">
                  {catStats.map(c => {
                    const color = CATEGORY_COLORS[c.cat] || CATEGORY_COLORS.other
                    return (
                      <div key={c.cat}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}88` }} />
                            {c.cat}
                          </span>
                          <span className="font-mono text-[10px] text-[#6a6a74] tabular-nums">
                            {c.n} calls{c.resolved > 0 && c.wr != null ? ` · ${Math.round(c.wr * 100)}% WR` : ''}{c.avgEdge != null ? ` · ${(c.avgEdge * 100).toFixed(0)}% avg edge` : ''}
                          </span>
                        </div>
                        {/* win/loss split within the category */}
                        <div className="flex h-1 rounded-full overflow-hidden bg-[#0e0e12]">
                          {c.resolved > 0 ? (
                            <>
                              {c.wins > 0 && <motion.div initial={{ width: 0 }} whileInView={{ width: `${(c.wins / c.n) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease: 'easeOut' }} style={{ background: TEAL }} />}
                              {c.losses > 0 && <motion.div initial={{ width: 0 }} whileInView={{ width: `${(c.losses / c.n) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease: 'easeOut' }} style={{ background: '#ff5570' }} />}
                            </>
                          ) : (
                            <div className="w-full" style={{ background: `${VIOLET}33` }} />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Panel>
            )}

            {/* created by — already shown in the header, no duplicate needed */}
          </div>
        </div>

      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-8 right-8 z-[9999] flex items-center gap-3 bg-[#0b0b0d]/95 backdrop-blur-md border border-primary/40 text-white text-[13px] font-sans pl-3.5 pr-4 py-3 rounded-2xl shadow-[0_8px_40px_rgba(255,42,77,0.28)] max-w-[360px]"
          >
            <span className="relative flex w-2.5 h-2.5 shrink-0">
              <span className="absolute inline-flex w-full h-full rounded-full bg-primary opacity-60 animate-ping" />
              <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-primary" />
            </span>
            <span className="leading-snug">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
