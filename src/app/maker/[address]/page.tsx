'use client'

import { useState, useEffect, use, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount } from 'wagmi'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import MakerAvatar from '@/components/MakerAvatar'
import ConnectXModal, { XLogo } from '@/components/profile/ConnectXModal'
import { botEye } from '@/lib/botIdentity'
import { personLabel as sharedPersonLabel } from '@/lib/identity'
import { broadcastProfileUpdate } from '@/hooks/useCurrentUser'
import { useCountUp } from '@/hooks/useCountUp'

const POS = '#c8ff00', VIOLET = '#8b7bff', CRIMSON = '#ff2a4d'

type Person = { walletAddress: string; name?: string | null; handle?: string | null; pfpUrl?: string | null }

const shortAddr = (a = '') => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : 'anon'
// Universal identity — same resolver as navbar / bot profile / comments.
const personLabel = (u?: Person | null) => sharedPersonLabel(u)
const fmtUSD = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${Math.round(n).toLocaleString()}`

function StatCard({ label, value, prefix = '', suffix = '', decimals = 0, color = '#f0f0f4', delay = 0 }:
  { label: string; value: number; prefix?: string; suffix?: string; decimals?: number; color?: string; delay?: number }) {
  const animated = useCountUp(value, 1000, false)
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}
      className="flex-1 min-w-[140px] rounded-xl border border-[#161620] bg-[#08080c] px-4 py-3.5">
      <div className="text-[9px] text-[#4a4a54] font-mono tracking-[0.16em] uppercase mb-2">{label}</div>
      <div className="font-sans font-black text-[24px] tracking-[-0.02em] tabular-nums" style={{ color }}>
        {prefix}{decimals > 0 ? animated.toFixed(decimals) : Math.floor(animated).toLocaleString()}{suffix}
      </div>
    </motion.div>
  )
}

function PersonSquare({ u, size = 38, mutual = false, noLink = false }: { u: Person; size?: number; mutual?: boolean; noLink?: boolean }) {
  const inner = (
    <>
      <MakerAvatar address={u.walletAddress} pfpUrl={u.pfpUrl} size={size} square />
      {mutual && <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-[3px] grid place-items-center" style={{ background: POS }}><span className="text-[7px] text-black font-black leading-none">⇄</span></span>}
    </>
  )
  // noLink: cuando va dentro de otro <Link> (fila clickeable) para no anidar <a> dentro de <a>.
  if (noLink) return <span className="relative block shrink-0">{inner}</span>
  return (
    <Link href={`/maker/${u.walletAddress}`} title={personLabel(u)} className="relative block shrink-0 no-underline">
      {inner}
    </Link>
  )
}

export default function MakerProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const { address: rawAddr } = use(params)
  const makerAddress = rawAddr.toLowerCase()
  const { address: connected } = useAccount()
  const activeUser = connected?.toLowerCase() || null

  const [bots, setBots] = useState<any[]>([])
  const [profile, setProfile] = useState<any>({ handle: '', name: '', bio: '', pfpUrl: '', xHandle: null })
  const [portfolio, setPortfolio] = useState<any>({ portfolioValue: 0, totalDeposited: 0, totalEarned: 0, activePositions: 0, creatorEarnings: 0, allocations: [] })
  const [followersList, setFollowersList] = useState<Person[]>([])
  const [followingList, setFollowingList] = useState<Person[]>([])
  const [viewerFollowing, setViewerFollowing] = useState<Set<string>>(new Set())
  const [followed, setFollowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'portfolio' | 'bots'>('portfolio')
  const [socialModal, setSocialModal] = useState<null | 'followers' | 'following'>(null)
  const [copied, setCopied] = useState(false)
  const [xOpen, setXOpen] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [editHandle, setEditHandle] = useState('')
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editPfp, setEditPfp] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500) }

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const [uRes, fRes, botsRes, dRes] = await Promise.all([
          fetch(`/api/users?address=${makerAddress}`),
          fetch(`/api/follows?address=${makerAddress}${activeUser ? `&viewerId=${activeUser}` : ''}`),
          fetch(`/api/bots?owner=${makerAddress}`),
          fetch(`/api/dashboard?address=${makerAddress}`),
        ])
        if (!alive) return
        if (uRes.ok) { const u = await uRes.json(); setProfile(u.user || {}) }
        if (fRes.ok) {
          const f = await fRes.json()
          setFollowersList(f.followers || [])
          setFollowingList(f.following || [])
          setFollowed(!!f.isFollowing)
        }
        if (botsRes.ok) {
          const all = await botsRes.json()
          if (Array.isArray(all)) setBots(all)
        }
        if (dRes.ok) {
          const d = await dRes.json()
          setPortfolio({ portfolioValue: d.portfolioValue || 0, totalDeposited: d.totalDeposited || 0, totalEarned: d.totalEarned || 0, activePositions: d.activePositions || 0, creatorEarnings: d.creatorEarnings || 0, allocations: d.allocations || [] })
          setTab((d.allocations?.length ? 'portfolio' : 'bots'))
        }
      } catch (e) { console.error(e) } finally { if (alive) setLoading(false) }
    }
    load()

    // Check for OAuth return params
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search)
      if (search.get('x_linked') === 'true') {
        setTimeout(() => showToast('X account successfully linked and verified!'), 500)
        // clean up URL
        window.history.replaceState({}, '', window.location.pathname)
      } else if (search.get('error')) {
        setTimeout(() => showToast(`X linking failed: ${search.get('error')}`), 500)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }

    return () => { alive = false }
  }, [makerAddress, activeUser])

  // viewer's following set powers the "followed by people you follow" proof
  useEffect(() => {
    if (!activeUser || activeUser === makerAddress) { setViewerFollowing(new Set()); return }
    fetch(`/api/follows?address=${activeUser}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.following) setViewerFollowing(new Set(d.following.map((u: Person) => u.walletAddress?.toLowerCase()))) })
      .catch(() => {})
  }, [activeUser, makerAddress])

  const isOwner = activeUser === makerAddress
  const profileFollowingSet = useMemo(() => new Set(followingList.map(u => u.walletAddress?.toLowerCase())), [followingList])
  const mutualFollowers = useMemo(
    () => followersList.filter(u => viewerFollowing.has(u.walletAddress?.toLowerCase())),
    [followersList, viewerFollowing]
  )
  // "Follows you": the profile's following list contains the viewer → this
  // person already follows the viewer back (the Messi case: on Messi's profile
  // the viewer sees a "Follows you" badge because Messi follows them).
  const followsViewer = !isOwner && !!activeUser && profileFollowingSet.has(activeUser)
  // Whether viewer + profile follow each other → mutual, surfaced on the button.
  const isMutual = followsViewer && followed

  const totalTVL = bots.reduce((s, b) => s + (b.currentTVL || b.tvl || 0), 0)
  const botsWithBrier = bots.filter(b => b.scores?.[0]?.brierScore || b.brierScore)
  const avgBrier = botsWithBrier.length ? botsWithBrier.reduce((s, b) => s + (b.scores?.[0]?.brierScore || b.brierScore), 0) / botsWithBrier.length : 0

  let tier = { t: 'NOVICE', c: '#6a6a72' }
  if (bots.length >= 3 && totalTVL >= 10000 && avgBrier > 0 && avgBrier < 0.23) tier = { t: 'MASTER QUANT', c: CRIMSON }
  else if (bots.length >= 1 && totalTVL >= 1000) tier = { t: 'ALPHA', c: POS }
  else if (bots.length >= 1) tier = { t: 'OPERATOR', c: VIOLET }

  const joined = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null

  // Identity: lead with a real name/handle; otherwise the short address IS the headline
  // (so we don't print "Anonymous operator" + the same 0x… twice).
  const hasName = !!(profile?.name && !profile.name.startsWith('User_'))
  const displayName = hasName ? profile.name : (profile?.handle ? `@${profile.handle}` : shortAddr(makerAddress))

  const toggleFollow = async () => {
    if (!activeUser) return showToast('Connect your wallet to follow.')
    const prev = followed, prevList = followersList
    const next = !followed
    setFollowed(next)
    setFollowersList(l => next
      ? [{ walletAddress: activeUser }, ...l]
      : l.filter(u => u.walletAddress?.toLowerCase() !== activeUser))
    try {
      const res = await fetch('/api/follows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ followerId: activeUser, followingId: makerAddress }) })
      if (!res.ok) throw new Error()
      const d = await res.json()
      setFollowed(d.status === 'followed')
    } catch { setFollowed(prev); setFollowersList(prevList); showToast('Could not update follow. Try again.') }
  }

  const initiateXLink = () => {
    if (!activeUser) return showToast('Connect your wallet first.')
    window.location.href = `/api/auth/twitter?wallet=${activeUser}`
  }

  // Manual link/unlink from the modal (the OAuth path is initiateXLink).
  const saveX = async (handle: string | null) => {
    if (!activeUser) return
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ walletAddress: activeUser, xHandle: handle }) })
    if (res.ok) { const u = await res.json(); setProfile(u); showToast(handle ? 'X linked.' : 'X unlinked.') }
    else showToast('Could not link X.')
  }

  const handleSaveProfile = async () => {
    if (!activeUser) return
    setSaving(true)
    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ walletAddress: activeUser, handle: editHandle, name: editName, bio: editBio, pfpUrl: editPfp }) })
      if (res.ok) { const u = await res.json(); setProfile(u); setIsEditing(false); broadcastProfileUpdate(u); showToast('Profile updated.') }
      else { const e = await res.json(); showToast(e.error || 'Save failed.') }
    } catch (e: any) { showToast(e.message) } finally { setSaving(false) }
  }

  const handlePfpUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas'); const S = 200
        canvas.width = S; canvas.height = S
        const ctx = canvas.getContext('2d'); if (!ctx) return
        const scale = Math.max(S / img.width, S / img.height)
        ctx.drawImage(img, (S - img.width * scale) / 2, (S - img.height * scale) / 2, img.width * scale, img.height * scale)
        setEditPfp(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  if (loading) return <div className="min-h-screen bg-[#030303] grid place-items-center text-[#666] font-sans text-sm">Resolving identity…</div>

  const xHandle: string | null = profile?.xHandle || null

  return (
    <div className="min-h-screen bg-[#030303] font-sans text-[#e8e8e8]">
      <div className="max-w-[1040px] mx-auto px-6 pt-6 pb-20">

        {/* top bar */}
        <div className="flex items-center justify-between mb-6 text-[12px]">
          <Link href="/discover" className="text-[#777] hover:text-white transition-colors no-underline">← The catalog</Link>
          <Link href="/leaderboard" className="text-[#777] hover:text-white transition-colors no-underline">Rankings →</Link>
        </div>

        {/* ── HERO ── */}
        <div className="rounded-2xl border border-[#161620] bg-[#08080c] overflow-hidden">
          <div className="h-20 bg-[radial-gradient(120%_140%_at_20%_-30%,#1a0810_0%,#0a0a0e_60%)] border-b border-[#13131b]" />
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between flex-wrap gap-4 -mt-10">
              <div className="flex items-end gap-4">
                <div className="relative">
                  <div className="rounded-xl overflow-hidden ring-4 ring-[#08080c]">
                    <MakerAvatar address={makerAddress} pfpUrl={profile?.pfpUrl} size={88} square />
                  </div>
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-[4px] font-mono text-[8px] font-bold tracking-[0.12em] whitespace-nowrap"
                    style={{ color: tier.c, background: '#08080c', border: `1px solid ${tier.c}55` }}>{tier.t}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isOwner ? (
                  <>
                    <button
                      onClick={() => setXOpen(true)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold transition-colors ${xHandle ? 'border border-[#262630] text-[#ddd] hover:border-[#3a3a44] hover:text-white' : 'bg-white text-black hover:bg-[#e8e8e8]'}`}
                    >
                      <XLogo size={13} /> {xHandle ? 'Manage X' : 'Connect X'}
                    </button>
                    <button onClick={() => { setIsEditing(v => !v); setEditHandle(profile?.handle || ''); setEditName(profile?.name || ''); setEditBio(profile?.bio || ''); setEditPfp(profile?.pfpUrl || '') }}
                      className="rounded-full bg-primary text-[#030303] font-bold text-[12px] px-5 py-2 hover:shadow-[0_0_16px_rgba(255,42,77,0.4)] transition-all">
                      {isEditing ? 'Close' : 'Edit profile'}
                    </button>
                  </>
                ) : (
                  <button onClick={toggleFollow}
                    className={`rounded-full font-bold text-[12px] px-6 py-2 transition-all ${followed ? 'border border-[#262630] text-[#ddd] hover:border-[#ff5570] hover:text-[#ff5570]' : 'bg-primary text-[#030303] hover:shadow-[0_0_16px_rgba(255,42,77,0.4)]'}`}>
                    {followed ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            </div>

            {/* identity */}
            <div className="mt-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-black text-[26px] tracking-[-0.03em] text-white m-0 leading-none">{displayName}</h1>
                {profile?.handle && hasName && <span className="font-mono text-[13px] text-[#8a8a94]">@{profile.handle}</span>}
                {/* "Follows you" — this person already follows the viewer back */}
                {followsViewer && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#8b7bff44] bg-[#8b7bff14] px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide" style={{ color: VIOLET }}>
                    {isMutual && <span className="text-[#c8ff00]">⇄</span>}
                    {isMutual ? 'You follow each other' : 'Follows you'}
                  </span>
                )}
                {xHandle && (
                  <a href={`https://x.com/${xHandle}`} target="_blank" rel="noopener noreferrer"
                    className="group flex items-center gap-1.5 rounded-full border border-[#262630] px-3 py-1.5 text-[12px] text-[#ddd] hover:border-[#4a4a54] hover:text-white hover:bg-[#12121a] no-underline transition-all" title={profile?.xVerified ? 'Identity cryptographically verified via X OAuth' : 'X Identity'}>
                    <XLogo size={12} className="text-[#8a8a94] group-hover:text-white transition-colors" /> 
                    <span className="font-mono font-medium tracking-tight">@{xHandle}</span>
                  </a>
                )}
              </div>

              {/* address + joined — the 0x… appears once. If it's already the headline, we only
                  render a copy affordance (no second identical 0x… under the name). */}
              <div className="flex items-center gap-3 mt-2.5 flex-wrap text-[12px]">
                <button onClick={() => { navigator.clipboard.writeText(makerAddress); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
                  title="Copy wallet address"
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#6a6a74] hover:text-white transition-colors">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                  {(hasName || profile?.handle) ? shortAddr(makerAddress) : 'Copy address'} {copied && <span className="text-primary">copied</span>}
                </button>
                {joined && <span className="font-mono text-[11px] text-[#5a5a64]">joined {joined}</span>}
              </div>

              {/* follow counts open a modal (not a bottom tab) */}
              <div className="flex items-center gap-5 mt-3.5 flex-wrap">
                <button onClick={() => setSocialModal('followers')} className="group inline-flex items-baseline gap-1.5">
                  <span className="font-sans font-bold text-[15px] text-white tabular-nums">{followersList.length}</span>
                  <span className="text-[12px] text-[#7a7a84] group-hover:text-white transition-colors">followers</span>
                </button>
                <button onClick={() => setSocialModal('following')} className="group inline-flex items-baseline gap-1.5">
                  <span className="font-sans font-bold text-[15px] text-white tabular-nums">{followingList.length}</span>
                  <span className="text-[12px] text-[#7a7a84] group-hover:text-white transition-colors">following</span>
                </button>
              </div>

              {/* follower faces in circles under the name — always visible when
                  anyone follows, mutual-with-viewer ones marked with ⇄ */}
              {followersList.length > 0 && (
                <button onClick={() => setSocialModal('followers')} className="group flex items-center gap-2.5 mt-3">
                  <div className="flex -space-x-2">
                    {followersList.slice(0, 7).map((u, i) => (
                      <motion.span
                        key={u.walletAddress}
                        initial={{ scale: 0, x: -8 }}
                        animate={{ scale: 1, x: 0 }}
                        transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
                        style={{ zIndex: 10 - i }}
                        className="relative rounded-full ring-2 ring-[#050507] group-hover:ring-[#0e0e14] transition-colors"
                        title={personLabel(u)}
                      >
                        <MakerAvatar address={u.walletAddress} pfpUrl={u.pfpUrl} size={26} />
                        {viewerFollowing.has(u.walletAddress?.toLowerCase()) && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full grid place-items-center ring-1 ring-[#050507]" style={{ background: POS }}>
                            <span className="text-[6px] text-black font-black leading-none">⇄</span>
                          </span>
                        )}
                      </motion.span>
                    ))}
                  </div>
                  {followersList.length > 7 && (
                    <span className="font-mono text-[11px] text-[#6a6a74] group-hover:text-white transition-colors">+{followersList.length - 7}</span>
                  )}
                </button>
              )}

              {/* social proof — people YOU follow who also follow this maker,
                  shown as a prominent animated avatar stack (real mutual data) */}
              {mutualFollowers.length > 0 && (
                <button onClick={() => setSocialModal('followers')} className="group inline-flex items-center gap-3 mt-4 rounded-full border border-[#1a1a22] bg-[#0a0a0f] pl-1.5 pr-4 py-1.5 hover:border-[#2a2a34] transition-colors">
                  <div className="flex -space-x-2.5">
                    {mutualFollowers.slice(0, 5).map((u, i) => (
                      <motion.span
                        key={u.walletAddress}
                        initial={{ scale: 0, x: -10 }}
                        animate={{ scale: 1, x: 0 }}
                        transition={{ delay: i * 0.07, type: 'spring', stiffness: 280, damping: 18 }}
                        style={{ zIndex: 10 - i }}
                        className="ring-2 ring-[#0a0a0f] rounded-[6px] group-hover:ring-[#12121a] transition-colors"
                      >
                        <MakerAvatar address={u.walletAddress} pfpUrl={u.pfpUrl} size={28} square />
                      </motion.span>
                    ))}
                  </div>
                  <span className="text-[12px] text-[#9a9aa4] group-hover:text-white transition-colors text-left leading-tight">
                    Followed by <span className="text-white font-semibold">{personLabel(mutualFollowers[0])}</span>
                    {mutualFollowers.length > 1 && <> and <span className="text-white font-semibold">{mutualFollowers.length - 1} other{mutualFollowers.length - 1 > 1 ? 's' : ''}</span></>}
                    <span className="text-[#5a5a64]"> you follow</span>
                  </span>
                </button>
              )}

              {/* bio */}
              {profile?.bio && !isEditing && (
                <p className="text-[13px] text-[#a6a6b0] leading-relaxed mt-4 max-w-2xl whitespace-pre-wrap">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* edit panel */}
        <AnimatePresence>
          {isEditing && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-4 rounded-2xl border border-[#161620] bg-[#08080c] p-5">
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#5a5a64] mb-4">Edit profile</div>
                <div className="flex items-start gap-4 mb-4">
                  <div className="rounded-xl overflow-hidden border border-[#1f1f28]"><MakerAvatar address={makerAddress} pfpUrl={editPfp || profile?.pfpUrl} size={64} square /></div>
                  <label className="flex-1">
                    <span className="text-[11px] text-[#8a8a94] font-semibold">Profile photo</span>
                    <input type="file" accept="image/*" onChange={handlePfpUpload} className="mt-1.5 w-full text-[12px] text-[#aaa] file:mr-3 file:rounded-full file:border-0 file:bg-[#1a1a22] file:px-3 file:py-1.5 file:text-[#ddd] file:text-[11px] file:font-semibold" />
                  </label>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block"><span className="text-[12px] text-[#bbb] font-semibold">Display name</span><input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1.5 w-full bg-[#0a0a0c] border border-[#1f1f28] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-primary/50" /></label>
                  <label className="block"><span className="text-[12px] text-[#bbb] font-semibold">Handle</span>
                    <div className="mt-1.5 flex items-center bg-[#0a0a0c] border border-[#1f1f28] rounded-lg focus-within:border-primary/50">
                      <span className="pl-3 text-[#5a5a64] text-[13px]">@</span>
                      <input value={editHandle} onChange={e => setEditHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())} className="flex-1 bg-transparent px-2 py-2 text-[13px] text-white outline-none" />
                    </div>
                  </label>
                  <label className="block sm:col-span-2"><span className="text-[12px] text-[#bbb] font-semibold">Bio</span><textarea value={editBio} onChange={e => setEditBio(e.target.value)} className="mt-1.5 w-full h-24 bg-[#0a0a0c] border border-[#1f1f28] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-primary/50 resize-y" /></label>
                </div>
                <button onClick={handleSaveProfile} disabled={saving} className="mt-4 rounded-full bg-primary text-[#030303] font-bold text-[13px] px-6 py-2.5 disabled:opacity-50 hover:shadow-[0_0_18px_rgba(255,42,77,0.4)] transition-all">{saving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* stats — this person AS A CAPITAL ALLOCATOR (depositor) first; maker stats live in the Algorithms tab.
            "Followers" is intentionally NOT here: it already lives once, under the name. */}
        <div className="flex gap-3 mt-4 flex-wrap">
          <StatCard label="Portfolio value" value={portfolio.portfolioValue} prefix="$" color={CRIMSON} delay={0.05} />
          <StatCard label="Capital deposited" value={portfolio.totalDeposited} prefix="$" delay={0.1} />
          <StatCard label="Profit earned" value={portfolio.totalEarned} prefix="$" color={portfolio.totalEarned > 0 ? POS : '#f0f0f4'} delay={0.15} />
          <StatCard label="Builder fees" value={portfolio.creatorEarnings || 0} prefix="$" color={portfolio.creatorEarnings > 0 ? POS : '#f0f0f4'} delay={0.2} />
        </div>

        {/* tabs */}
        <div className="flex items-center gap-1 mt-8 border-b border-[#161620]">
          {([['portfolio', `Portfolio ${portfolio.allocations.length}`], ['bots', `Algorithms ${bots.length}`]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className="relative px-4 py-2.5 text-[13px] font-semibold transition-colors" style={{ color: tab === k ? '#fff' : '#6a6a74' }}>
              {label}
              {tab === k && <motion.span layoutId="maker-tab" className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary" />}
            </button>
          ))}
        </div>

        {/* tab content */}
        <div className="mt-6">
          {tab === 'portfolio' && (
            portfolio.allocations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#1f1f28] bg-[#08080c] py-16 text-center">
                <div className="text-[13px] text-[#6a6a74]">No capital allocated to any vault yet.</div>
                <Link href="/discover" className="inline-block mt-4 rounded-full border border-[#262630] text-[#ddd] font-bold text-[12px] px-5 py-2 no-underline hover:border-[#3a3a44] hover:text-white transition-colors">Explore vaults</Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#161620] bg-[#08080c] overflow-hidden">
                <div className="grid grid-cols-[1.7fr_1fr_1fr_0.8fr] gap-2 px-4 py-2.5 border-b border-[#13131b] text-[10px] font-mono uppercase tracking-[0.12em] text-[#5a5a64]">
                  <span>Vault</span><span className="text-right">Deposited</span><span className="text-right">Profit</span><span className="text-right">Return</span>
                </div>
                {portfolio.allocations.map((a: any, i: number) => {
                  const cap = a.vaultCap || 0
                  const usedPct = cap > 0 ? Math.min(100, (a.currentTVL / cap) * 100) : null
                  const capFull = usedPct != null && usedPct >= 100
                  const capColor = usedPct == null ? '#5a5a64' : capFull ? CRIMSON : usedPct >= 85 ? '#f5a623' : POS
                  return (
                  <Link key={a.slug || i} href={`/bot/${a.slug || ''}`} className="grid grid-cols-[1.7fr_1fr_1fr_0.8fr] gap-2 px-4 py-3 items-center border-t border-[#13131b] no-underline hover:bg-[#0c0c12] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0 rounded-[9px] overflow-hidden ring-1 ring-[#1f1f28]">
                        {a.pfpUrl ? <img src={a.pfpUrl} alt={a.bot} className="w-9 h-9 object-cover" /> : <BotIrisAvatar {...botEye({ slug: a.slug, id: a.id, name: a.bot, color: a.color, eyeShape: a.eyeShape })} size={36} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-bold text-white truncate">{a.bot}</div>
                        {/* capacity bar: how full this vault is (currentTVL / declared cap) */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="relative h-1 flex-1 max-w-[120px] rounded-full bg-[#15151d] overflow-hidden">
                            <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${usedPct ?? 0}%`, background: capColor }} />
                          </span>
                          <span className="font-mono text-[9px]" style={{ color: capColor }}>{usedPct == null ? 'Open' : capFull ? 'Full' : `${Math.round(usedPct)}%`}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-right font-mono text-[13px] text-[#e8e8e8]">{fmtUSD(a.dep)}</span>
                    <span className="text-right font-mono text-[13px] font-bold" style={{ color: a.prof > 0 ? POS : a.prof < 0 ? CRIMSON : '#e8e8e8' }}>{a.prof >= 0 ? '+' : ''}{fmtUSD(a.prof)}</span>
                    <span className="text-right font-mono text-[12px]" style={{ color: a.pct > 0 ? POS : a.pct < 0 ? CRIMSON : '#8a8a94' }}>{a.pct >= 0 ? '+' : ''}{a.pct}%</span>
                  </Link>
                  )
                })}
              </div>
            )
          )}

          {tab === 'bots' && (
            bots.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#1f1f28] bg-[#08080c] py-16 text-center">
                <div className="text-[13px] text-[#6a6a74]">No algorithms deployed yet.</div>
                {isOwner && <Link href="/list-bot" className="inline-block mt-4 rounded-full bg-primary text-[#030303] font-bold text-[12px] px-5 py-2 no-underline hover:shadow-[0_0_16px_rgba(255,42,77,0.4)] transition-all">Deploy a bot</Link>}
              </div>
            ) : (
              <>
              <div className="flex items-center gap-6 mb-4 text-[12px]">
                <span className="text-[#7a7a84]">Bots deployed <b className="text-white font-bold tabular-nums ml-1">{bots.length}</b></span>
                {avgBrier > 0 && <span className="text-[#7a7a84]">Avg Brier <b className="font-bold tabular-nums ml-1" style={{ color: avgBrier <= 0.25 ? POS : '#f0f0f4' }}>{avgBrier.toFixed(3)}</b></span>}
                <span className="text-[#7a7a84]">Capital managed <b className="text-white font-bold tabular-nums ml-1">{fmtUSD(totalTVL)}</b></span>
              </div>
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                {bots.map(b => {
                  const brier = b.scores?.[0]?.brierScore ?? b.brierScore ?? null
                  const tvl = b.currentTVL ?? b.tvl ?? 0
                  const cap = b.vaultCap || 0
                  const usedPct = cap > 0 ? Math.min(100, (tvl / cap) * 100) : null
                  const capFull = usedPct != null && usedPct >= 100
                  const capColor = usedPct == null ? '#5a5a64' : capFull ? CRIMSON : usedPct >= 85 ? '#f5a623' : POS
                  return (
                    <Link key={b.id} href={`/bot/${b.slug || b.id}`} className="group rounded-2xl border border-[#161620] bg-[#08080c] overflow-hidden no-underline hover:border-[#262630] transition-colors">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#13131b]">
                        <span className="font-sans font-bold text-[13px] text-white truncate pr-2 group-hover:text-primary transition-colors">{b.name}</span>
                      </div>
                      <div className="grid place-items-center py-6 bg-[#050507]">
                        {b.pfpUrl ? <img src={b.pfpUrl} alt={b.name} className="w-16 h-16 object-cover rounded-lg" /> : <BotIrisAvatar {...botEye(b)} size={60} />}
                      </div>
                      <div className="px-4 py-3 flex flex-col gap-2 text-[12px] font-mono">
                        <div className="flex justify-between"><span className="text-[#5a5a64]">Brier</span><span className="font-bold" style={{ color: brier != null && brier <= 0.25 ? POS : '#e8e8e8' }}>{brier != null ? brier.toFixed(3) : '—'}</span></div>
                        <div className="flex justify-between border-t border-[#13131b] pt-2"><span className="text-[#5a5a64]">Vault TVL</span><span className="text-white font-bold">{fmtUSD(tvl)}</span></div>
                        {/* capacity: how full the vault is vs its declared cap */}
                        <div className="pt-1">
                          <div className="flex justify-between mb-1"><span className="text-[#5a5a64]">Capacity</span><span className="font-bold" style={{ color: capColor }}>{usedPct == null ? 'Open' : capFull ? 'Full' : `${Math.round(usedPct)}%`}</span></div>
                          <span className="relative block h-1 rounded-full bg-[#15151d] overflow-hidden">
                            <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${usedPct ?? 0}%`, background: capColor }} />
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
              </>
            )
          )}
        </div>
      </div>

      {/* followers / following modal — opens from the counts under the name, not a bottom tab */}
      <AnimatePresence>
        {socialModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSocialModal(null)}
            className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[440px] max-h-[78vh] flex flex-col rounded-2xl border border-[#1f1f28] bg-[#0a0a0f] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
              {/* segmented header: Followers | Following */}
              <div className="flex items-center border-b border-[#161620]">
                {(['followers', 'following'] as const).map(k => (
                  <button key={k} onClick={() => setSocialModal(k)}
                    className="relative flex-1 px-4 py-3 text-[13px] font-semibold capitalize transition-colors"
                    style={{ color: socialModal === k ? '#fff' : '#6a6a74' }}>
                    {k} <span className="tabular-nums text-[#7a7a84]">{k === 'followers' ? followersList.length : followingList.length}</span>
                    {socialModal === k && <motion.span layoutId="social-modal-tab" className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary" />}
                  </button>
                ))}
                <button onClick={() => setSocialModal(null)} className="px-4 text-[#6a6a74] hover:text-white text-[18px] leading-none">×</button>
              </div>
              {(() => {
                const list = socialModal === 'followers' ? followersList : followingList
                if (list.length === 0) return <div className="py-16 text-center text-[13px] text-[#6a6a74]">{socialModal === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</div>
                return (
                  <div className="overflow-y-auto p-2">
                    {list.map(u => {
                      const isMutual = socialModal === 'followers' ? profileFollowingSet.has(u.walletAddress?.toLowerCase()) : followersList.some(f => f.walletAddress?.toLowerCase() === u.walletAddress?.toLowerCase())
                      return (
                        <Link key={u.walletAddress} href={`/maker/${u.walletAddress}`} onClick={() => setSocialModal(null)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 no-underline hover:bg-[#13131b] transition-colors">
                          <PersonSquare u={u} size={40} mutual={isMutual} noLink />
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-bold text-white truncate">{personLabel(u)}</div>
                            <div className="font-mono text-[10px] text-[#5a5a64] truncate">{shortAddr(u.walletAddress)}</div>
                          </div>
                          {isMutual && <span className="font-mono text-[9px] font-bold tracking-[0.12em] px-2 py-0.5 rounded-[4px]" style={{ color: POS, background: `${POS}12`, border: `1px solid ${POS}33` }}>MUTUAL</span>}
                        </Link>
                      )
                    })}
                  </div>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConnectXModal open={xOpen} initial={xHandle} onClose={() => setXOpen(false)} onSave={saveX} wallet={connected} />

      {toast && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-8 right-8 z-[9999] bg-[#0d0d0d] border border-primary/40 text-white text-[13px] px-4 py-2.5 rounded-xl shadow-[0_0_24px_rgba(255,42,77,0.25)]">{toast}</motion.div>
      )}
    </div>
  )
}
