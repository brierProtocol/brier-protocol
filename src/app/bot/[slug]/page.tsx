'use client'

import { use, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import MakerAvatar from '@/components/MakerAvatar'
import BotUplink from '@/components/bot/BotUplink'
import BotPnlChart from '@/components/bot/BotPnlChart'
import VaultGlass from '@/components/bot/VaultGlass'
import { botEye, codename } from '@/lib/botIdentity'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { motion, AnimatePresence } from 'framer-motion'
import { useCountUp } from '@/hooks/useCountUp'
import { PostBody } from '@/components/bot/PostBody'
import {
  shadowProgress, phaseMeta,
  SHADOW_RESOLVED_TARGET, SHADOW_DAYS_TARGET, SHADOW_BRIER_TARGET,
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

function txOf(t: any): string | null {
  const hash = String(t.externalTradeId || '').split('-')[0]
  return hash.startsWith('0x') && hash.length >= 40 ? hash : null
}

const Empty = () => <span className="text-[#333]">·</span>

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
  const [showDefs, setShowDefs] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editTagline, setEditTagline] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPfp, setEditPfp] = useState('')
  const [savingBot, setSavingBot] = useState(false)

  const { address, isConnected } = useAccount()
  const isOwner = !!(isConnected && address && bot && bot.builder?.toLowerCase() === address.toLowerCase())

  const animatedTVL = useCountUp(bot?.tvl || 0)
  const vaultCap = bot?.vaultCap || 50000

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000) }

  useEffect(() => {
    fetch(`/api/bots/${slug}`)
      .then(res => res.ok ? res.json() : null)
      .then(dbBot => {
        if (!dbBot) { setLoading(false); return }
        const s = dbBot.scores?.[0] ?? null
        const mapped = {
          id: dbBot.id, name: dbBot.name, builder: dbBot.walletAddress, tagline: dbBot.tagline,
          pfpUrl: dbBot.pfpUrl, maker: dbBot.user || null,
          description: dbBot.description, status: dbBot.status || 'PAPER',
          color: dbBot.color, eyeShape: dbBot.eyeShape, createdAt: dbBot.createdAt,
          vaultOpen: dbBot.vaultOpen, vaultAddress: dbBot.vaultAddress, vaultCap: dbBot.vaultCap || 50000,
          tvl: dbBot.liveNav?.totalAssets ?? dbBot.currentTVL ?? 0,
          sharePrice: dbBot.liveNav?.sharePrice ?? 1,
          categories: dbBot.verifiedCategories?.length ? dbBot.verifiedCategories : (dbBot.categories || []),
          verified: !!dbBot.verifiedCategories?.length,
          brierScore: s?.brierScore ?? null, winRate: s?.winRate ?? null, sharpe: s?.sharpe ?? null,
          maxDrawdown: s?.maxDrawdown ?? null, totalTrades: s?.totalTrades ?? 0, totalVolume: s?.totalVolume ?? null,
          pnlSnapshots: dbBot.pnlSnapshots || [], tradesIndexed: dbBot._count?.trades ?? (dbBot.trades?.length ?? 0),
        }
        setBot(mapped)
        setEditName(mapped.name); setEditTagline(mapped.tagline || ''); setEditDesc(mapped.description || ''); setEditPfp(mapped.pfpUrl || '')
        setHearts(dbBot._count?.hearts || 0)
        setTrades(dbBot.trades || [])
        setLoading(false)
        fetch(`/api/comments?botId=${mapped.id}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setPosts(d) })
      })
      .catch(() => setLoading(false))
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
    const res = await fetch('/api/hearts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: address, botId: bot.id }) })
    if (res.ok) {
      const d = await res.json()
      const liked = d.status === 'hearted'
      setHearted(liked)
      setHearts(h => liked ? h + 1 : Math.max(0, h - 1))
      if (liked) setLikeFx(Date.now())
    }
  }

  const addPost = async () => {
    if (!postText.trim()) return
    if (!isConnected || !address) return showToast('Connect your wallet to comment.')
    const res = await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ botId: bot.id, wallet: address, text: postText.trim() }) })
    if (res.ok) { const c = await res.json(); setPosts([{ ...c, user: null }, ...posts]); setPostText('') }
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

  if (loading) return <div className="min-h-screen bg-[#030303] text-[#666] grid place-items-center font-sans text-sm">Loading…</div>
  if (!bot) return notFound()

  // ── derivations ──
  const sp = shadowProgress({
    status: bot.status, createdAt: bot.createdAt, vaultOpen: bot.vaultOpen, currentTVL: bot.tvl,
    scores: [{ brierScore: bot.brierScore ?? undefined, winRate: bot.winRate ?? undefined, totalTrades: bot.totalTrades }],
    tradesIndexed: bot.tradesIndexed,
  })
  const pm = phaseMeta(sp)
  const eye = botEye({ slug, id: bot.id, name: bot.name, color: bot.color, eyeShape: bot.eyeShape })
  const b = bot.brierScore
  const grade = b == null ? null
    : b <= 0.15 ? { t: 'ELITE', c: '#00d4aa' }
    : b <= 0.25 ? { t: 'STRONG', c: '#37d67a' }
    : b <= 0.40 ? { t: 'MODERATE', c: '#8b7bff' }
    : { t: 'WEAK', c: '#ff5570' }

  const wins = trades.filter(t => t.outcome === 'WIN').length
  const losses = trades.filter(t => t.outcome === 'LOSS').length
  const pending = trades.filter(t => t.outcome === 'PENDING').length
  const navValues: number[] = (bot.pnlSnapshots || []).map((s: any) => s.cumulativePnl ?? s.pnlUsd).filter((v: any) => typeof v === 'number')
  const navDelta = navValues.length > 1 ? ((navValues[navValues.length - 1] - navValues[0]) / (Math.abs(navValues[0]) || 1)) * 100 : (bot.sharePrice ? (bot.sharePrice - 1) * 100 : 0)
  const roi = navValues.length > 1 && navValues[0] ? navDelta : null
  const uplink = bot.tradesIndexed > 0 ? 'live' : 'awaiting'
  const lastFill = trades.length ? relDay(trades[0].timestamp) : null

  const VIOLET = '#8b7bff', TEAL = '#00d4aa'
  const criteria = [
    { label: 'Resolved predictions', val: `${sp.resolved} / ${SHADOW_RESOLVED_TARGET}`, ok: sp.resolvedPass, pct: Math.min(1, sp.resolved / SHADOW_RESOLVED_TARGET) },
    { label: 'Brier score', val: sp.brier != null ? `${sp.brier.toFixed(3)} · ≤ ${SHADOW_BRIER_TARGET.toFixed(2)}` : `≤ ${SHADOW_BRIER_TARGET.toFixed(2)}`, ok: sp.brierPass, pct: sp.brier == null ? 0 : Math.min(1, Math.max(0, (0.4 - sp.brier) / (0.4 - SHADOW_BRIER_TARGET))) },
    { label: 'Days live', val: `${sp.days} / ${SHADOW_DAYS_TARGET}`, ok: sp.daysPass, pct: Math.min(1, sp.days / SHADOW_DAYS_TARGET) },
  ]
  const clearedCount = criteria.filter(c => c.ok).length

  const stats = [
    { k: 'Win rate', v: bot.winRate != null ? `${(bot.winRate * 100).toFixed(1)}%` : null, info: 'Share of resolved predictions it got right.' },
    { k: 'ROI', v: roi != null ? `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%` : null, info: 'Return on the vault capital since it opened.' },
    { k: 'Max drawdown', v: bot.maxDrawdown != null ? `-${(Math.abs(bot.maxDrawdown) * 100).toFixed(1)}%` : null, info: 'The worst peak-to-trough drop in value. Smaller is safer.' },
    { k: 'Resolved', v: bot.totalTrades ? bot.totalTrades.toLocaleString() : null, info: 'Predictions that have settled — the sample size behind the score.' },
    { k: 'Volume', v: bot.totalVolume != null ? fmtUSD(bot.totalVolume) : null, info: 'Total USDC it has traded.' },
    { k: 'Sharpe', v: bot.sharpe != null ? bot.sharpe.toFixed(2) : null, info: 'Return per unit of risk. Higher means steadier, less jumpy gains.' },
  ]

  const Panel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) =>
    <div className={`rounded-2xl border border-[#1a1a1a] bg-[#080809] ${className}`}>{children}</div>

  return (
    <div className="min-h-screen bg-[#030303] font-sans text-[#e8e8e8]">
      <div className="max-w-[1180px] mx-auto px-6 pt-6 pb-20">

        {/* top bar */}
        <div className="flex items-center justify-between mb-6 text-[12px]">
          <Link href="/discover" className="text-[#777] hover:text-white transition-colors no-underline">← The catalog</Link>
          {isOwner && (
            <button onClick={() => setIsEditing(v => !v)} className="font-sans text-[12px] font-semibold px-3.5 py-1.5 rounded-full border border-[#222] text-[#ccc] hover:border-[#444] hover:text-white transition-all">
              {isEditing ? 'Close editor' : 'Edit profile'}
            </button>
          )}
        </div>

        {/* ── VAULT (full width, first thing you see) ── */}
        <div className="rounded-2xl border border-[#1a1a1a] bg-[#080809] overflow-hidden mb-6">
          <div className="flex flex-col sm:flex-row items-stretch">
            <div className="sm:w-[280px] shrink-0 p-5 sm:border-r border-b sm:border-b-0 border-[#141414]">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-[#888]">Vault</span>
                {sp.live && (
                  <span className={`font-mono text-[11px] font-bold ${navDelta >= 0 ? 'text-[#00d4aa]' : 'text-[#ff5570]'}`}>
                    {navDelta >= 0 ? '▲' : '▼'} {Math.abs(navDelta).toFixed(1)}%
                  </span>
                )}
              </div>
              <VaultGlass tvl={animatedTVL} cap={vaultCap} live={sp.live} />
            </div>
            <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
              <div>
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#666] mb-1">
                  {sp.live ? 'Total assets secured' : 'Vault status'}
                </div>
                <div className="font-extrabold text-[clamp(26px,4vw,42px)] leading-none tabular-nums text-white tracking-[-0.03em]">
                  {sp.live ? fmtUSD(animatedTVL) : 'Shadow phase'}
                </div>
                <div className="font-mono text-[12px] mt-1.5" style={{ color: sp.live ? '#666' : VIOLET }}>
                  {sp.live
                    ? `of ${fmtUSD(vaultCap)} capacity`
                    : `Vault unlocks after the shadow gate — ${sp.resolved}/${SHADOW_RESOLVED_TARGET} resolved`}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4">
                {[
                  { k: 'Capacity', v: fmtUSD(vaultCap) },
                  { k: 'Split', v: '60 / 30 / 10' },
                  { k: sp.live ? 'Phase' : 'Progress', v: sp.live ? 'LIVE' : `${Math.round(sp.pct * 100)}%` },
                ].map(m => (
                  <div key={m.k}>
                    <div className="font-mono text-[9px] text-[#555] tracking-widest uppercase mb-0.5">{m.k}</div>
                    <div className="font-mono font-bold text-[13px] text-white">{m.v}</div>
                  </div>
                ))}
              </div>
              {sp.live && (
                <div className="mt-4">
                  {animatedTVL >= vaultCap ? (
                    <div className="rounded-lg border border-primary/30 p-2.5 text-center font-mono text-[11px] text-primary tracking-widest">CAPACITY REACHED</div>
                  ) : !isConnected ? (
                    <div className="text-[12px] text-[#666]">Connect your wallet to deposit.</div>
                  ) : (
                    <div className="flex gap-2">
                      <input type="number" value={depositAmt} onChange={e => setDepositAmt(e.target.value)} placeholder="USDC" className="flex-1 min-w-0 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-[13px] text-white outline-none focus:border-primary/50 placeholder:text-[#555]" />
                      <button onClick={handleDeposit} disabled={depositing} className="rounded-lg bg-primary text-[#030303] font-bold text-[13px] px-5 disabled:opacity-50 hover:shadow-[0_0_16px_rgba(255,42,77,0.4)] transition-all">{depositing ? '…' : 'Deposit'}</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── HERO ── */}
        <div className="flex items-start justify-between gap-6 flex-wrap mb-6">
          <div className="flex items-start gap-5 min-w-0">
            <div className="rounded-xl overflow-hidden border border-[#1a1a1a] shrink-0">
              {bot.pfpUrl
                ? <img src={bot.pfpUrl} alt={bot.name} className="w-[64px] h-[64px] object-cover" />
                : <BotIrisAvatar {...eye} size={64} />}
            </div>
            <div className="min-w-0">
              {/* name + phase + grade */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-white font-extrabold text-[28px] tracking-[-0.03em] m-0 leading-none">{bot.name}</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-[0.16em]" style={{ color: pm.color, background: `${pm.color}14`, border: `1px solid ${pm.color}3a` }}>
                  {pm.tag === 'SHADOW' && (
                    <span className="inline-flex gap-[2px]">
                      {[0, 1, 2].map(i => (
                        <motion.span key={i} className="w-[3px] h-[10px] rounded-sm" style={{ background: pm.color }}
                          animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }} />
                      ))}
                    </span>
                  )}
                  {pm.tag === 'NEW' && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: pm.color }} />
                  )}
                  {pm.tag}
                </span>
                {grade && (
                  <span className="px-2 py-1 rounded-md text-[10px] font-mono tracking-[0.16em]" style={{ color: grade.c, background: `${grade.c}12`, border: `1px solid ${grade.c}3a` }}>
                    {grade.t}
                  </span>
                )}
              </div>

              {/* Brier score — top of page, next to name */}
              {b != null ? (
                <div className="flex items-baseline gap-2.5 mt-2.5">
                  <span className="font-mono font-extrabold text-[30px] leading-none tabular-nums" style={{ color: grade?.c || '#aaa' }}>
                    {b.toFixed(3)}
                  </span>
                  <span className="font-mono text-[10px] text-[#555] tracking-[0.08em]">brier · lower is better</span>
                </div>
              ) : (
                <div className="font-mono text-[12px] text-[#555] mt-2.5">No predictions resolved yet</div>
              )}

              {bot.tagline && <div className="text-[#888] text-[13px] mt-2">{bot.tagline}</div>}

              {/* maker + categories */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {bot.builder && (
                  <Link href={`/maker/${bot.builder}`} className="inline-flex items-center gap-2 group no-underline rounded-full border border-[#1e1e1e] hover:border-[#2a2a2a] bg-[#070707] pl-1.5 pr-3 py-1 transition-colors">
                    <MakerAvatar address={bot.builder} pfpUrl={bot.maker?.pfpUrl} size={22} />
                    <div className="flex flex-col leading-tight">
                      <span className="font-mono text-[8px] text-[#555] tracking-[0.12em] uppercase">builder</span>
                      <span className="font-sans text-[12px] font-semibold text-[#ccc] group-hover:text-white transition-colors">
                        {makerLabel(bot.maker, bot.builder)}
                      </span>
                    </div>
                  </Link>
                )}
                {bot.categories?.slice(0, 3).map((c: string) => (
                  <span key={c} className="font-mono text-[10px] uppercase tracking-widest text-[#777] border border-[#1a1a1a] rounded-full px-2.5 py-1">{c}</span>
                ))}
                {bot.verified && (
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#00d4aa]/80">on-chain verified</span>
                )}
              </div>
            </div>
          </div>

          {/* like with burst */}
          <div className="relative shrink-0">
            <button onClick={toggleHeart} className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border transition-all cursor-pointer ${hearted ? 'border-primary bg-primary/10 text-primary' : 'border-[#1a1a1a] bg-[#070707] text-[#888] hover:border-primary/50 hover:text-primary'}`}>
              <motion.span key={hearted ? 'on' : 'off'} initial={{ scale: 0.6 }} animate={{ scale: hearted ? [1.4, 1] : 1 }} transition={{ duration: 0.35 }} className="text-lg leading-none">{hearted ? '♥' : '♡'}</motion.span>
              <span className="font-mono font-bold text-lg tabular-nums leading-none">{hearts}</span>
            </button>
            <AnimatePresence>
              {likeFx > 0 && [...Array(5)].map((_, i) => (
                <motion.span key={`${likeFx}-${i}`} className="absolute left-1/2 top-2 text-primary text-sm pointer-events-none"
                  initial={{ opacity: 1, y: 0, x: 0 }} animate={{ opacity: 0, y: -46 - i * 6, x: (i - 2) * 14 }} transition={{ duration: 0.9, ease: 'easeOut' }}
                  onAnimationComplete={() => { if (i === 4) setLikeFx(0) }}>♥</motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {bot.description && <p className="text-[14px] leading-relaxed text-[#9a9a9a] mb-8 max-w-3xl whitespace-pre-wrap">{bot.description}</p>}

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

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">
          {/* LEFT */}
          <div className="flex flex-col gap-5 min-w-0">

            {/* signal — live connection visual */}
            <BotUplink eye={eye} status={uplink} lastFill={lastFill} />

            {/* performance chart */}
            <BotPnlChart
              snapshots={bot.pnlSnapshots}
              winRate={bot.winRate}
              sharpe={bot.sharpe}
              maxDrawdown={bot.maxDrawdown}
              totalTrades={bot.totalTrades}
            />

            {/* trade history */}
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
                    const oc = t.outcome === 'WIN' ? TEAL : t.outcome === 'LOSS' ? '#ff5570' : VIOLET
                    return (
                      <div key={t.id || i} className="flex items-center gap-3 px-5 py-2.5 border-b border-[#101010] hover:bg-[#0b0b0b] transition-colors" style={{ borderLeft: `2px solid ${oc}` }}>
                        <span className="font-mono text-[10px] text-[#555] w-12 shrink-0 tabular-nums">{relDay(t.timestamp)}</span>
                        <span className="flex-1 min-w-0 text-[12px] text-[#bbb] truncate">{tx ? <a href={`https://polygonscan.com/tx/${tx}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors no-underline">{t.marketTitle} <span className="text-[#444] text-[9px]">↗</span></a> : t.marketTitle}</span>
                        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ color: yes ? TEAL : '#ff5570', background: yes ? `${TEAL}14` : '#ff557014' }}>{t.side}</span>
                        <span className="font-mono text-[11px] text-[#999] w-9 text-right tabular-nums shrink-0">{((t.entryPrice ?? 0) * 100).toFixed(0)}¢</span>
                        <span className="font-mono text-[9px] font-bold w-14 text-right shrink-0" style={{ color: oc }}>{t.outcome}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Panel>

            {/* discussion */}
            <Panel>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#141414]">
                <span className="font-sans font-bold text-[14px]">Discussion</span>
                <span className="font-mono text-[11px] text-[#888]">{posts.length} comments</span>
              </div>
              <div className="px-5 py-4 border-b border-[#141414] bg-[#060607]">
                {isConnected && address ? (
                  <div className="flex gap-3">
                    <MakerAvatar address={address} size={34} />
                    <div className="flex-1">
                      <textarea value={postText} onChange={e => setPostText(e.target.value)} placeholder="Share your read on this bot…" className="w-full h-16 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-primary/50 resize-y placeholder:text-[#555]" />
                      <div className="flex justify-end mt-2"><button onClick={addPost} disabled={!postText.trim()} className="rounded-full bg-primary text-[#030303] font-bold text-[12px] px-5 py-2 disabled:opacity-30 hover:shadow-[0_0_14px_rgba(255,42,77,0.4)] transition-all">Comment</button></div>
                    </div>
                  </div>
                ) : <div className="text-[13px] text-[#777]">Connect your wallet to join the discussion.</div>}
              </div>
              {posts.length === 0 ? (
                <div className="px-5 py-10 text-center text-[13px] text-[#555]">No comments yet. Be the first.</div>
              ) : (
                <div className="flex flex-col">
                  {posts.map((p, i) => (
                    <div key={p.id || i} className="flex gap-3 px-5 py-4 border-b border-[#101010] last:border-b-0">
                      <MakerAvatar address={p.wallet} pfpUrl={p.user?.pfpUrl} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[13px] font-semibold text-white">{personLabel(p.user, p.wallet)}</span>
                          <span className="font-mono text-[10px] text-[#555] tabular-nums">{relDay(p.createdAt) || 'now'}</span>
                        </div>
                        <div className="text-[13px] text-[#ccc] leading-relaxed"><PostBody text={p.text} onQuoteClick={() => {}} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col gap-5">

            {/* eligibility */}
            <Panel className="p-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-sans font-bold text-[15px] tracking-tight">Vault eligibility</span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: sp.live || sp.eligible ? TEAL : VIOLET, background: sp.live || sp.eligible ? `${TEAL}14` : `${VIOLET}14` }}>
                  {sp.live ? 'OPEN' : sp.eligible ? 'ELIGIBLE' : 'SHADOW PHASE'}
                </span>
              </div>
              <div className="text-[12px] text-[#777] mb-4 leading-relaxed">
                {sp.live ? 'This bot cleared the gate. Its vault is open.' : `Proving in the open — ${clearedCount} of 3 cleared. The vault unlocks when all three are met.`}
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

            {/* track record */}
            <Panel className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#666]">Track record</span>
                <button onClick={() => setShowDefs(v => !v)} className="font-mono text-[10px] text-[#666] hover:text-white transition-colors">{showDefs ? 'hide' : 'what do these mean?'}</button>
              </div>
              <div className="grid grid-cols-2 gap-px bg-[#141414] border border-[#141414] rounded-lg overflow-hidden">
                {stats.map(m => (
                  <div key={m.k} className="bg-[#070707] px-3 py-2.5" title={m.info}>
                    <div className="text-[#555] text-[9px] font-mono tracking-widest mb-1 uppercase">{m.k}</div>
                    <div className="font-mono font-bold text-[14px] tabular-nums text-white">{m.v ?? <Empty />}</div>
                  </div>
                ))}
              </div>
              {showDefs && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 overflow-hidden">
                  <div className="flex flex-col gap-2 border-t border-[#141414] pt-3">
                    <div className="text-[11px] text-[#999] leading-relaxed"><span className="text-white font-semibold">Brier</span> — how calibrated its probabilities are. 0 perfect, 0.25 a coin flip, lower is better.</div>
                    {stats.map(m => <div key={m.k} className="text-[11px] text-[#999] leading-relaxed"><span className="text-white font-semibold">{m.k}</span> — {m.info}</div>)}
                  </div>
                </motion.div>
              )}
              {bot.totalTrades > 0 && bot.totalTrades < SHADOW_RESOLVED_TARGET && (
                <div className="text-[11px] mt-3 leading-relaxed" style={{ color: VIOLET }}>Low sample. Brier needs {SHADOW_RESOLVED_TARGET} resolved predictions for confidence.</div>
              )}
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
