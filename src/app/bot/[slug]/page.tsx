'use client'

import { use, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import MakerAvatar from '@/components/MakerAvatar'
import { botEye } from '@/lib/botIdentity'
import CandleChart, { type Tick } from '@/components/ui/CandleChart'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { motion } from 'framer-motion'
import { useCountUp } from '@/hooks/useCountUp'
import { PostBody } from '@/components/bot/PostBody'
import {
  shadowProgress, phaseMeta,
  SHADOW_RESOLVED_TARGET, SHADOW_DAYS_TARGET, SHADOW_BRIER_TARGET,
} from '@/lib/botProgress'

interface Post {
  id: string; wallet: string; text: string; createdAt: string;
  user?: { name: string | null; pfpUrl: string | null } | null
}

const fmtUSD = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${Math.round(n).toLocaleString()}`

const shortWallet = (w: string) => `${w.slice(0, 6)}…${w.slice(-4)}`

// txHash for a Polymarket fill is encoded in externalTradeId as `${hash}-${asset}`
function txOf(t: any): string | null {
  const ext = t.externalTradeId || ''
  const hash = String(ext).split('-')[0]
  return hash.startsWith('0x') && hash.length >= 40 ? hash : null
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
  const [depositing, setDepositing] = useState(false)
  const [toast, setToast] = useState('')

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

  const toggleHeart = async () => {
    if (!isConnected || !address) return showToast('Connect your wallet to like.')
    const res = await fetch('/api/hearts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: address, botId: bot.id }),
    })
    if (res.ok) { const d = await res.json(); setHearted(d.status === 'hearted'); setHearts(h => d.status === 'hearted' ? h + 1 : Math.max(0, h - 1)) }
  }

  const addPost = async () => {
    if (!postText.trim()) return
    if (!isConnected || !address) return showToast('Connect your wallet to comment.')
    const res = await fetch('/api/comments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId: bot.id, wallet: address, text: postText.trim() }),
    })
    if (res.ok) { const c = await res.json(); setPosts([{ ...c, user: { name: null, pfpUrl: null } }, ...posts]); setPostText('') }
    else showToast('Could not post comment.')
  }

  const handleSaveBot = async () => {
    if (!address) return
    setSavingBot(true)
    try {
      const res = await fetch(`/api/bots/${slug}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, name: editName, tagline: editTagline, description: editDesc, pfpUrl: editPfp }),
      })
      if (res.ok) {
        const u = await res.json()
        setBot({ ...bot, name: u.name, tagline: u.tagline, description: u.description, pfpUrl: u.pfpUrl })
        setIsEditing(false); showToast('Profile updated.')
      } else { const e = await res.json(); showToast(e.error || 'Update failed.') }
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
      showToast('Step 1/2 — approving USDC…')
      await (await usdc.approve(bot.vaultAddress, txAmount)).wait()
      showToast('Step 2/2 — depositing…')
      const dep = await vault.deposit(txAmount, address); await dep.wait()
      showToast('Deposit confirmed.')
      await fetch('/api/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ botId: bot.id, depositorWallet: address, amountUsdc: amt, mode: 'CONSERVATIVE', txHash: dep.hash }) })
    } catch (err: any) { showToast('Transaction failed: ' + (err.reason || err.message || 'error')) }
    finally { setDepositing(false) }
  }

  const navTicks: Tick[] = useMemo(() => {
    const snaps = bot?.pnlSnapshots || []
    if (snaps.length < 2) return []
    return snaps.map((s: any) => ({ t: new Date(s.date).getTime(), v: s.cumulativePnl ?? s.pnlUsd }))
  }, [bot])

  if (loading) return <div className="min-h-screen bg-[#030303] text-[#666] grid place-items-center font-sans text-sm">Loading…</div>
  if (!bot) return notFound()

  // ── derivations ──
  const sp = shadowProgress({
    status: bot.status, createdAt: bot.createdAt, vaultOpen: bot.vaultOpen, currentTVL: bot.tvl,
    scores: [{ brierScore: bot.brierScore ?? undefined, winRate: bot.winRate ?? undefined, totalTrades: bot.totalTrades }],
    tradesIndexed: bot.tradesIndexed,
  })
  const pm = phaseMeta(sp)
  const b = bot.brierScore
  const grade = b == null ? null
    : b <= 0.15 ? { t: 'ELITE', c: '#00d4aa' }
    : b <= 0.25 ? { t: 'STRONG', c: '#37d67a' }
    : b <= 0.40 ? { t: 'MODERATE', c: '#C9A84C' }
    : { t: 'WEAK', c: '#ff3b3b' }

  const wins = trades.filter(t => t.outcome === 'WIN').length
  const losses = trades.filter(t => t.outcome === 'LOSS').length
  const roi = navTicks.length > 1 && navTicks[0].v ? ((navTicks[navTicks.length - 1].v - navTicks[0].v) / Math.abs(navTicks[0].v)) * 100 : null

  const criteria = [
    { label: 'Resolved predictions', val: `${sp.resolved} / ${SHADOW_RESOLVED_TARGET}`, ok: sp.resolvedPass, pct: Math.min(1, sp.resolved / SHADOW_RESOLVED_TARGET) },
    { label: 'Brier score', val: sp.brier != null ? `${sp.brier.toFixed(3)} · ≤ ${SHADOW_BRIER_TARGET.toFixed(2)}` : `— · ≤ ${SHADOW_BRIER_TARGET.toFixed(2)}`, ok: sp.brierPass, pct: sp.brier == null ? 0 : Math.min(1, Math.max(0, (0.4 - sp.brier) / (0.4 - SHADOW_BRIER_TARGET))) },
    { label: 'Days live', val: `${sp.days} / ${SHADOW_DAYS_TARGET}`, ok: sp.daysPass, pct: Math.min(1, sp.days / SHADOW_DAYS_TARGET) },
  ]

  const stats = [
    { k: 'Win rate', v: bot.winRate != null ? `${(bot.winRate * 100).toFixed(1)}%` : '—' },
    { k: 'Sharpe', v: bot.sharpe != null ? bot.sharpe.toFixed(2) : '—' },
    { k: 'ROI', v: roi != null ? `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%` : '—' },
    { k: 'Max drawdown', v: bot.maxDrawdown != null ? `-${(Math.abs(bot.maxDrawdown) * 100).toFixed(1)}%` : '—' },
    { k: 'Resolved', v: bot.totalTrades ? bot.totalTrades.toLocaleString() : '—' },
    { k: 'Volume', v: bot.totalVolume != null ? fmtUSD(bot.totalVolume) : '—' },
  ]

  const Panel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) =>
    <div className={`rounded-2xl border border-[#1a1a1a] bg-[#080809] ${className}`}>{children}</div>

  return (
    <div className="min-h-screen bg-[#030303] font-sans text-[#e8e8e8]">
      <div className="max-w-[1180px] mx-auto px-6 pt-6 pb-20">

        {/* top bar */}
        <div className="flex items-center justify-between mb-8 text-[12px]">
          <Link href="/discover" className="text-[#777] hover:text-white transition-colors no-underline">← The catalog</Link>
          <div className="flex items-center gap-3">
            {isOwner && (
              <button onClick={() => setIsEditing(v => !v)} className="font-sans text-[12px] font-semibold px-3.5 py-1.5 rounded-full border border-[#222] text-[#ccc] hover:border-[#444] hover:text-white transition-all">
                {isEditing ? 'Close editor' : 'Edit profile'}
              </button>
            )}
            <Link href="/leaderboard" className="text-[#777] hover:text-primary transition-colors no-underline font-mono text-[11px] tracking-widest">RANKINGS</Link>
          </div>
        </div>

        {/* hero */}
        <div className="flex items-start justify-between gap-6 flex-wrap mb-6">
          <div className="flex items-start gap-5 min-w-0">
            <div className="rounded-xl overflow-hidden border border-[#1a1a1a] shrink-0">
              {bot.pfpUrl
                ? <img src={bot.pfpUrl} alt={bot.name} className="w-16 h-16 object-cover" />
                : <BotIrisAvatar {...botEye({ slug, id: bot.id, name: bot.name, color: bot.color, eyeShape: bot.eyeShape })} size={64} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-white font-extrabold text-[28px] tracking-[-0.03em] m-0 leading-none">{bot.name}</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest" style={{ color: pm.color, background: `${pm.color}14`, border: `1px solid ${pm.color}3a` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: pm.color }} />{pm.tag}
                </span>
                {grade && <span className="px-2 py-1 rounded-full text-[10px] font-mono tracking-widest" style={{ color: grade.c, background: `${grade.c}12`, border: `1px solid ${grade.c}3a` }}>{grade.t}</span>}
              </div>
              {bot.tagline && <div className="text-[#888] text-[13px] mt-2">{bot.tagline}</div>}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {bot.builder && (
                  <Link href={`/maker/${bot.builder}`} className="inline-flex items-center gap-2 group no-underline rounded-full border border-[#161616] hover:border-[#2a2a2a] bg-[#070707] pl-1 pr-3 py-1 transition-colors">
                    <MakerAvatar address={bot.builder} pfpUrl={bot.maker?.pfpUrl} size={20} />
                    <span className="font-sans text-[12px] text-[#999] group-hover:text-white transition-colors">
                      {bot.maker?.handle ? `@${bot.maker.handle}` : bot.maker?.name || shortWallet(bot.builder)}
                    </span>
                  </Link>
                )}
                {bot.categories?.slice(0, 4).map((c: string) => (
                  <span key={c} className="font-mono text-[10px] uppercase tracking-widest text-[#777] border border-[#1a1a1a] rounded-full px-2.5 py-1">{c}</span>
                ))}
                {bot.verified && <span className="font-mono text-[9px] uppercase tracking-widest text-[#00d4aa]/80">on-chain verified</span>}
              </div>
            </div>
          </div>

          <button onClick={toggleHeart} className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border transition-all cursor-pointer shrink-0 ${hearted ? 'border-primary bg-primary/10 text-primary' : 'border-[#1a1a1a] bg-[#070707] text-[#888] hover:border-primary/50 hover:text-primary'}`}>
            <span className="text-lg leading-none">{hearted ? '♥' : '♡'}</span>
            <span className="font-mono font-bold text-lg tabular-nums leading-none">{hearts}</span>
          </button>
        </div>

        {bot.description && <p className="text-[14px] leading-relaxed text-[#9a9a9a] mb-8 max-w-3xl whitespace-pre-wrap">{bot.description}</p>}

        {/* editor (owner) */}
        {isOwner && isEditing && (
          <Panel className="mb-8 p-5">
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#666] mb-4">Edit profile</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block"><span className="text-[12px] text-[#bbb] font-semibold">Name</span>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1.5 w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-primary/50" /></label>
              <label className="block"><span className="text-[12px] text-[#bbb] font-semibold">Tagline</span>
                <input value={editTagline} onChange={e => setEditTagline(e.target.value)} className="mt-1.5 w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-primary/50" /></label>
              <label className="block sm:col-span-2"><span className="text-[12px] text-[#bbb] font-semibold">Bio</span>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="mt-1.5 w-full h-24 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-primary/50 resize-y" /></label>
            </div>
            <button onClick={handleSaveBot} disabled={savingBot} className="mt-4 rounded-full bg-primary text-[#030303] font-bold text-[13px] px-6 py-2.5 disabled:opacity-50 hover:shadow-[0_0_18px_rgba(255,42,77,0.4)] transition-all">
              {savingBot ? 'Saving…' : 'Save changes'}
            </button>
          </Panel>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">
          {/* LEFT */}
          <div className="flex flex-col gap-5 min-w-0">
            {/* performance */}
            <Panel>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#141414]">
                <span className="font-sans font-bold text-[14px]">Performance</span>
                <span className="font-mono text-[10px] tracking-widest text-[#00d4aa] inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] animate-pulse" />vault NAV</span>
              </div>
              <CandleChart ticks={navTicks} height={300} emptyLabel="No NAV history yet" />
            </Panel>

            {/* order book / trade history */}
            <Panel>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#141414]">
                <div>
                  <span className="font-sans font-bold text-[14px]">Trade history</span>
                  <span className="ml-2 font-mono text-[10px] text-[#555]">settled on-chain, nothing self-reported</span>
                </div>
                <span className="font-mono text-[11px] text-[#888] tabular-nums">{trades.length} fills · {wins}W / {losses}L</span>
              </div>
              {trades.length === 0 ? (
                <div className="px-5 py-12 text-center text-[13px] text-[#555]">No trades indexed yet. Once this wallet trades on Polymarket, every fill shows here.</div>
              ) : (
                <div className="max-h-[380px] overflow-y-auto">
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 bg-[#080809] z-10">
                      <tr className="text-[#555] font-mono text-[9px] tracking-widest border-b border-[#141414]">
                        <th className="px-5 py-2.5 font-medium">TIME</th>
                        <th className="px-3 py-2.5 font-medium">MARKET</th>
                        <th className="px-3 py-2.5 font-medium">SIDE</th>
                        <th className="px-3 py-2.5 font-medium text-right">ENTRY</th>
                        <th className="px-3 py-2.5 font-medium text-right">SIZE</th>
                        <th className="px-5 py-2.5 font-medium text-right">RESULT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map((t, i) => {
                        const tx = txOf(t)
                        const yes = t.side === 'YES' || t.side === 'LONG'
                        return (
                          <tr key={t.id || i} className="border-b border-[#101010] hover:bg-[#0b0b0b] transition-colors">
                            <td className="px-5 py-2.5 font-mono text-[10px] text-[#555] whitespace-nowrap tabular-nums">{new Date(t.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                            <td className="px-3 py-2.5 text-[12px] text-[#bbb] max-w-[240px] truncate">
                              {tx ? <a href={`https://polygonscan.com/tx/${tx}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors no-underline inline-flex items-center gap-1">{t.marketTitle}<span className="text-[#444] text-[9px]">↗</span></a> : t.marketTitle}
                            </td>
                            <td className="px-3 py-2.5"><span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: yes ? '#00d4aa' : '#ff5570', background: yes ? '#00d4aa14' : '#ff557014' }}>{t.side}</span></td>
                            <td className="px-3 py-2.5 font-mono text-[11px] text-[#aaa] text-right tabular-nums">{((t.entryPrice ?? 0) * 100).toFixed(0)}¢</td>
                            <td className="px-3 py-2.5 font-mono text-[11px] text-[#aaa] text-right tabular-nums">{t.amount != null ? fmtUSD(t.amount) : '—'}</td>
                            <td className="px-5 py-2.5 text-right font-mono text-[9px] font-bold">
                              {t.outcome === 'PENDING' ? <span className="text-[#C9A84C]">PENDING</span> : t.outcome === 'WIN' ? <span className="text-[#00d4aa]">WIN</span> : <span className="text-[#ff5570]">LOSS</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            {/* discussion */}
            <Panel>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#141414]">
                <span className="font-sans font-bold text-[14px]">Discussion</span>
                <span className="font-mono text-[11px] text-[#888]">{posts.length} comments</span>
              </div>

              {/* composer */}
              <div className="px-5 py-4 border-b border-[#141414] bg-[#060607]">
                {isConnected && address ? (
                  <div className="flex gap-3">
                    <MakerAvatar address={address} size={34} />
                    <div className="flex-1">
                      <textarea value={postText} onChange={e => setPostText(e.target.value)} placeholder="Share your read on this bot…"
                        className="w-full h-16 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-primary/50 resize-y placeholder:text-[#555]" />
                      <div className="flex justify-end mt-2">
                        <button onClick={addPost} disabled={!postText.trim()} className="rounded-full bg-primary text-[#030303] font-bold text-[12px] px-5 py-2 disabled:opacity-30 hover:shadow-[0_0_14px_rgba(255,42,77,0.4)] transition-all">Comment</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-[13px] text-[#777]">Connect your wallet to join the discussion.</div>
                )}
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
                          <span className="text-[13px] font-semibold text-white">{p.user?.name || shortWallet(p.wallet)}</span>
                          <span className="font-mono text-[10px] text-[#555] tabular-nums">{new Date(p.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
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
            {/* track record */}
            <Panel className="p-5">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#666] mb-3">Track record</div>
              <div className="flex items-end justify-between mb-1">
                <span className="text-[11px] font-mono text-[#777]">Brier score</span>
                <span className="text-[9px] text-[#3a3a3a] font-mono">0 = perfect</span>
              </div>
              <div className="font-mono font-extrabold text-[34px] leading-none tabular-nums" style={{ color: grade?.c || '#fff' }}>{b != null ? b.toFixed(3) : '—'}</div>
              <div className="grid grid-cols-2 gap-px bg-[#141414] border border-[#141414] rounded-lg overflow-hidden mt-4">
                {stats.map(m => (
                  <div key={m.k} className="bg-[#070707] px-3 py-2.5">
                    <div className="text-[#555] text-[9px] font-mono tracking-widest mb-1 uppercase">{m.k}</div>
                    <div className="font-mono font-bold text-[14px] tabular-nums text-white">{m.v}</div>
                  </div>
                ))}
              </div>
              {bot.totalTrades > 0 && bot.totalTrades < SHADOW_RESOLVED_TARGET && (
                <div className="text-[11px] text-[#C9A84C] mt-3 leading-relaxed">Low sample. Brier needs {SHADOW_RESOLVED_TARGET} resolved predictions for confidence.</div>
              )}
            </Panel>

            {/* eligibility */}
            <Panel className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#666]">Vault eligibility</span>
                <span className="font-mono text-[10px] font-bold" style={{ color: sp.eligible ? '#00d4aa' : '#C9A84C' }}>
                  {sp.live ? 'VAULT OPEN' : sp.eligible ? 'ELIGIBLE' : `${criteria.filter(c => c.ok).length}/3`}
                </span>
              </div>
              <div className="flex flex-col gap-3.5">
                {criteria.map(c => (
                  <div key={c.label}>
                    <div className="flex items-center justify-between text-[12px] mb-1.5">
                      <span className="text-[#bbb] inline-flex items-center gap-1.5">
                        <span style={{ color: c.ok ? '#00d4aa' : '#444' }}>{c.ok ? '✓' : '○'}</span>{c.label}
                      </span>
                      <span className="font-mono text-[11px] tabular-nums" style={{ color: c.ok ? '#9a9a9a' : '#C9A84C' }}>{c.val}</span>
                    </div>
                    <div className="h-1 rounded-full bg-[#0e0e0e] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${c.pct * 100}%`, background: c.ok ? '#00d4aa' : '#ff2a4d' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-[11px] leading-relaxed text-[#777]">
                {sp.live ? 'Cleared the gate. The vault is open for deposits.'
                  : sp.eligible ? 'Cleared the gate. The vault opens for deposits next.'
                  : 'Proving in the open. The vault stays locked until all three are met.'}
              </div>
            </Panel>

            {/* vault */}
            <Panel className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#666]">Vault</span>
                {sp.live && <span className="font-mono text-[11px] text-white tabular-nums">{fmtUSD(animatedTVL)} pot</span>}
              </div>

              {!sp.live ? (
                <div className="rounded-xl border border-dashed border-[#1f1f1f] p-4 text-center">
                  <div className="text-[13px] font-semibold text-[#bbb] mb-1">Vault locked</div>
                  <div className="text-[12px] text-[#666] leading-relaxed">No outside capital at risk yet. It opens once the bot clears the gate above. Builder keeps 30% of profits, depositors 60%, protocol 10%.</div>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-mono font-extrabold text-[26px] text-white tabular-nums">{fmtUSD(animatedTVL)}</span>
                    <span className="font-mono text-[11px] text-[#777]">of {fmtUSD(vaultCap)} cap</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#0e0e0e] overflow-hidden mb-1.5">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (animatedTVL / vaultCap) * 100)}%`, background: 'linear-gradient(90deg,#240a12,#ff2a4d)' }} />
                  </div>
                  <div className="grid grid-cols-3 gap-px bg-[#141414] border border-[#141414] rounded-lg overflow-hidden my-3">
                    {[['Depositors', '60%'], ['Builder', '30%'], ['Protocol', '10%']].map(([k, v]) => (
                      <div key={k} className="bg-[#070707] px-2 py-2 text-center">
                        <div className="font-mono font-bold text-[13px] text-white">{v}</div>
                        <div className="text-[8px] font-mono text-[#555] tracking-widest uppercase mt-0.5">{k}</div>
                      </div>
                    ))}
                  </div>
                  {animatedTVL >= vaultCap ? (
                    <div className="rounded-lg border border-primary/30 p-2.5 text-center font-mono text-[11px] text-primary tracking-widest">CAPACITY REACHED</div>
                  ) : !isConnected ? (
                    <div className="text-[12px] text-[#666]">Connect your wallet to deposit.</div>
                  ) : (
                    <div className="flex gap-2">
                      <input type="number" value={depositAmt} onChange={e => setDepositAmt(e.target.value)} placeholder="USDC"
                        className="flex-1 min-w-0 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-primary/50 placeholder:text-[#555]" />
                      <button onClick={handleDeposit} disabled={depositing} className="rounded-lg bg-primary text-[#030303] font-bold text-[12px] px-4 disabled:opacity-50 hover:shadow-[0_0_14px_rgba(255,42,77,0.4)] transition-all">{depositing ? '…' : 'Deposit'}</button>
                    </div>
                  )}
                </>
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
