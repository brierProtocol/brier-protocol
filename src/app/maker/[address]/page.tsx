'use client'

import { useState, useEffect, use, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount } from 'wagmi'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import MakerAvatar from '@/components/MakerAvatar'
import ConnectXModal, { XLogo } from '@/components/profile/ConnectXModal'
import { botEye } from '@/lib/botIdentity'
import { shadowProgress, phaseMeta } from '@/lib/botProgress'
import { useCountUp } from '@/hooks/useCountUp'

const POS = '#c8ff00', VIOLET = '#8b7bff', CRIMSON = '#ff2a4d'

type Person = { walletAddress: string; name?: string | null; handle?: string | null; pfpUrl?: string | null }

const shortAddr = (a = '') => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : 'anon'
const personLabel = (u?: Person | null) =>
  u?.handle ? `@${u.handle}` : (u?.name && !u.name.startsWith('User_') ? u.name : shortAddr(u?.walletAddress))
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

function PersonSquare({ u, size = 38, mutual = false }: { u: Person; size?: number; mutual?: boolean }) {
  return (
    <Link href={`/maker/${u.walletAddress}`} title={personLabel(u)} className="relative block shrink-0 no-underline">
      <MakerAvatar address={u.walletAddress} pfpUrl={u.pfpUrl} size={size} square />
      {mutual && <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-[3px] grid place-items-center" style={{ background: POS }}><span className="text-[7px] text-black font-black leading-none">⇄</span></span>}
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
  const [followersList, setFollowersList] = useState<Person[]>([])
  const [followingList, setFollowingList] = useState<Person[]>([])
  const [viewerFollowing, setViewerFollowing] = useState<Set<string>>(new Set())
  const [followed, setFollowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'bots' | 'followers' | 'following'>('bots')
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
        const [uRes, fRes, botsRes] = await Promise.all([
          fetch(`/api/users?address=${makerAddress}`),
          fetch(`/api/follows?address=${makerAddress}${activeUser ? `&viewerId=${activeUser}` : ''}`),
          fetch('/api/bots'),
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
          if (Array.isArray(all)) setBots(all.filter((b: any) => (b.walletAddress || b.builder)?.toLowerCase() === makerAddress))
        }
      } catch (e) { console.error(e) } finally { if (alive) setLoading(false) }
    }
    load()
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

  const totalTVL = bots.reduce((s, b) => s + (b.currentTVL || b.tvl || 0), 0)
  const botsWithBrier = bots.filter(b => b.scores?.[0]?.brierScore || b.brierScore)
  const avgBrier = botsWithBrier.length ? botsWithBrier.reduce((s, b) => s + (b.scores?.[0]?.brierScore || b.brierScore), 0) / botsWithBrier.length : 0

  let tier = { t: 'NOVICE', c: '#6a6a72' }
  if (bots.length >= 3 && totalTVL >= 10000 && avgBrier > 0 && avgBrier < 0.23) tier = { t: 'MASTER QUANT', c: CRIMSON }
  else if (bots.length >= 1 && totalTVL >= 1000) tier = { t: 'ALPHA', c: POS }
  else if (bots.length >= 1) tier = { t: 'OPERATOR', c: VIOLET }

  const joined = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null

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
      if (res.ok) { const u = await res.json(); setProfile(u); setIsEditing(false); showToast('Profile updated.') }
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
                    <button onClick={() => setXOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-[#262630] px-4 py-2 text-[12px] font-semibold text-[#ddd] hover:border-[#3a3a44] hover:text-white transition-colors">
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
                <h1 className="font-black text-[26px] tracking-[-0.03em] text-white m-0 leading-none">
                  {profile?.name && !profile.name.startsWith('User_') ? profile.name : 'Anonymous operator'}
                </h1>
                {profile?.handle && <span className="font-mono text-[13px] text-[#8a8a94]">@{profile.handle}</span>}
                {xHandle && (
                  <a href={`https://x.com/${xHandle}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#262630] px-2.5 py-1 text-[11px] text-[#ddd] hover:border-[#3a3a44] hover:text-white no-underline transition-colors">
                    <XLogo size={11} /> {xHandle}
                  </a>
                )}
              </div>

              <div className="flex items-center gap-3 mt-2.5 flex-wrap text-[12px]">
                <button onClick={() => { navigator.clipboard.writeText(makerAddress); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#8a8a94] hover:text-white transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3a3a44]" /> {shortAddr(makerAddress)} {copied && <span className="text-primary">copied</span>}
                </button>
                {joined && <span className="font-mono text-[11px] text-[#5a5a64]">joined {joined}</span>}
              </div>

              {/* follow counts + mutual proof */}
              <div className="flex items-center gap-5 mt-3.5 flex-wrap">
                <button onClick={() => setTab('followers')} className="group inline-flex items-baseline gap-1.5">
                  <span className="font-sans font-bold text-[15px] text-white tabular-nums">{followersList.length}</span>
                  <span className="text-[12px] text-[#7a7a84] group-hover:text-white transition-colors">followers</span>
                </button>
                <button onClick={() => setTab('following')} className="group inline-flex items-baseline gap-1.5">
                  <span className="font-sans font-bold text-[15px] text-white tabular-nums">{followingList.length}</span>
                  <span className="text-[12px] text-[#7a7a84] group-hover:text-white transition-colors">following</span>
                </button>

                {mutualFollowers.length > 0 && (
                  <div className="inline-flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {mutualFollowers.slice(0, 3).map(u => (
                        <span key={u.walletAddress} className="ring-2 ring-[#08080c] rounded-[5px]"><MakerAvatar address={u.walletAddress} pfpUrl={u.pfpUrl} size={20} square /></span>
                      ))}
                    </div>
                    <span className="text-[11px] text-[#7a7a84]">
                      Followed by {personLabel(mutualFollowers[0])}{mutualFollowers.length > 1 ? ` +${mutualFollowers.length - 1} you follow` : ' you follow'}
                    </span>
                  </div>
                )}
              </div>

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

        {/* stats */}
        <div className="flex gap-3 mt-4 flex-wrap">
          <StatCard label="Bots deployed" value={bots.length} color={CRIMSON} delay={0.05} />
          <StatCard label="Avg Brier" value={avgBrier} decimals={3} color={avgBrier > 0 && avgBrier <= 0.25 ? POS : '#f0f0f4'} delay={0.1} />
          <StatCard label="Capital secured" value={totalTVL} prefix="$" delay={0.15} />
          <StatCard label="Followers" value={followersList.length} delay={0.2} />
        </div>

        {/* tabs */}
        <div className="flex items-center gap-1 mt-8 border-b border-[#161620]">
          {([['bots', `Algorithms ${bots.length}`], ['followers', `Followers ${followersList.length}`], ['following', `Following ${followingList.length}`]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className="relative px-4 py-2.5 text-[13px] font-semibold transition-colors" style={{ color: tab === k ? '#fff' : '#6a6a74' }}>
              {label}
              {tab === k && <motion.span layoutId="maker-tab" className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary" />}
            </button>
          ))}
        </div>

        {/* tab content */}
        <div className="mt-6">
          {tab === 'bots' && (
            bots.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#1f1f28] bg-[#08080c] py-16 text-center">
                <div className="text-[13px] text-[#6a6a74]">No algorithms deployed yet.</div>
                {isOwner && <Link href="/list-bot" className="inline-block mt-4 rounded-full bg-primary text-[#030303] font-bold text-[12px] px-5 py-2 no-underline hover:shadow-[0_0_16px_rgba(255,42,77,0.4)] transition-all">Deploy a bot</Link>}
              </div>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                {bots.map(b => {
                  const sp = shadowProgress({ status: b.status, createdAt: b.createdAt, vaultOpen: b.vaultOpen, currentTVL: b.currentTVL ?? b.tvl, scores: b.scores, tradesIndexed: b._count?.trades })
                  const pm = phaseMeta(sp)
                  const brier = b.scores?.[0]?.brierScore ?? b.brierScore ?? null
                  const tvl = b.currentTVL ?? b.tvl ?? 0
                  return (
                    <Link key={b.id} href={`/bot/${b.slug || b.id}`} className="group rounded-2xl border border-[#161620] bg-[#08080c] overflow-hidden no-underline hover:border-[#262630] transition-colors">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#13131b]">
                        <span className="font-sans font-bold text-[13px] text-white truncate pr-2 group-hover:text-primary transition-colors">{b.name}</span>
                        <span className="font-mono text-[9px] font-bold tracking-[0.14em]" style={{ color: pm.color }}>{pm.tag}</span>
                      </div>
                      <div className="grid place-items-center py-6 bg-[#050507]">
                        {b.pfpUrl ? <img src={b.pfpUrl} alt={b.name} className="w-16 h-16 object-cover rounded-lg" /> : <BotIrisAvatar {...botEye(b)} size={60} />}
                      </div>
                      <div className="px-4 py-3 flex flex-col gap-2 text-[12px] font-mono">
                        <div className="flex justify-between"><span className="text-[#5a5a64]">Brier</span><span className="font-bold" style={{ color: brier != null && brier <= 0.25 ? POS : '#e8e8e8' }}>{brier != null ? brier.toFixed(3) : '—'}</span></div>
                        <div className="flex justify-between border-t border-[#13131b] pt-2"><span className="text-[#5a5a64]">Vault TVL</span><span className="text-white font-bold">{fmtUSD(tvl)}</span></div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )
          )}

          {(tab === 'followers' || tab === 'following') && (() => {
            const list = tab === 'followers' ? followersList : followingList
            if (list.length === 0) return <div className="rounded-2xl border border-dashed border-[#1f1f28] bg-[#08080c] py-14 text-center text-[13px] text-[#6a6a74]">{tab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</div>
            return (
              <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                {list.map(u => {
                  const isMutual = tab === 'followers' ? profileFollowingSet.has(u.walletAddress?.toLowerCase()) : followersList.some(f => f.walletAddress?.toLowerCase() === u.walletAddress?.toLowerCase())
                  return (
                    <Link key={u.walletAddress} href={`/maker/${u.walletAddress}`} className="flex items-center gap-3 rounded-xl border border-[#161620] bg-[#08080c] px-3 py-2.5 no-underline hover:border-[#262630] transition-colors">
                      <PersonSquare u={u} size={40} mutual={isMutual} />
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
        </div>
      </div>

      <ConnectXModal open={xOpen} initial={xHandle} onClose={() => setXOpen(false)} onSave={saveX} />

      {toast && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-8 right-8 z-[9999] bg-[#0d0d0d] border border-primary/40 text-white text-[13px] px-4 py-2.5 rounded-xl shadow-[0_0_24px_rgba(255,42,77,0.25)]">{toast}</motion.div>
      )}
    </div>
  )
}
