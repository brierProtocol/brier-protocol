'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import BotIrisAvatar from '@/components/BotIrisAvatar'
import { botEye, makerEye } from '@/lib/botIdentity'
import { useCountUp } from '@/hooks/useCountUp'

// ── Maker avatar — a robotic "eye" matching the bot aesthetic ──
function UserIdenticon({ id, size = 100, customUrl }: { id: string, size?: number, customUrl?: string | null }) {
  const eye = makerEye(id)
  if (customUrl) {
    return (
      <div className="overflow-hidden rounded-full border-2 shrink-0" style={{ width: size, height: size, borderColor: eye.accentColor }}>
        <img src={customUrl} alt="PFP" className="w-full h-full object-cover" />
      </div>
    )
  }
  return (
    <div className="shrink-0 rounded-full" style={{ width: size, height: size, boxShadow: `0 0 24px ${eye.accentColor}33` }}>
      <BotIrisAvatar {...eye} size={size} />
    </div>
  )
}

// ── Animated Stat Card ──
function StatCard({ label, value, suffix = '', prefix = '', decimals = 0, color = 'text-white', delay = 0 }:
  { label: string, value: number, suffix?: string, prefix?: string, decimals?: number, color?: string, delay?: number }) {
  // round=false + 1000ms preserves the original decimal stat-card animation.
  const animated = useCountUp(value, 1000, false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex-1 min-w-[140px] bg-[#080808] border border-[#1a1a1a] p-4 relative group hover:border-[#2a2a2a] transition-colors"
    >
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#1a1a1a] group-hover:border-primary/30 transition-colors" />
      <div className="text-[9px] text-[#444] font-mono tracking-widest uppercase mb-2">{label}</div>
      <div className={`text-2xl font-mono font-bold tabular ${color}`}>
        {prefix}{decimals > 0 ? animated.toFixed(decimals) : Math.floor(animated).toLocaleString()}{suffix}
      </div>
    </motion.div>
  )
}

export default function MakerProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const { address: makerAddress } = use(params)

  const [activeUser, setActiveUser] = useState<string | null>(null)
  const [bots, setBots] = useState<any[]>([])
  const [profile, setProfile] = useState<any>({ handle: '', name: '', bio: '', pfpUrl: '' })
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editHandle, setEditHandle] = useState('')
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editPfp, setEditPfp] = useState('')
  const [loading, setLoading] = useState(true)
  const [followed, setFollowed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const getAddr = async () => {
        try {
          const accounts = await window.ethereum!.request({ method: 'eth_accounts' })
          if (accounts.length > 0) setActiveUser(accounts[0].toLowerCase())
        } catch (e) {}
      }
      getAddr()
      ;window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) setActiveUser(accounts[0].toLowerCase())
        else setActiveUser(null)
      })
    }

    const fetchData = async () => {
      try {
        const [userRes, botsRes] = await Promise.all([
          fetch(`/api/users?address=${makerAddress.toLowerCase()}`),
          fetch('/api/bots')
        ])
        if (userRes.ok) {
          const u = await userRes.json()
          setProfile(u.user)
          setFollowers(u.followersCount)
          setFollowing(u.followingCount)
          if (u.user?.followers?.some((f: any) => f.followerId.toLowerCase() === activeUser)) {
            setFollowed(true)
          }
        }
        if (botsRes.ok) {
          const allBots = await botsRes.json()
          if (Array.isArray(allBots)) {
            const created = allBots.filter((b: any) =>
              (b.walletAddress || b.builder)?.toLowerCase() === makerAddress.toLowerCase()
            )
            setBots(created)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [makerAddress, activeUser])

  const handleSaveProfile = async () => {
    if (!activeUser) return
    setSaving(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: activeUser, handle: editHandle, name: editName, bio: editBio, pfpUrl: editPfp })
      })
      if (res.ok) {
        const updated = await res.json()
        setProfile(updated)
        setIsEditing(false)
      } else {
        const err = await res.json()
        alert("Save failed! Error: " + (err.error || res.statusText))
      }
    } catch (e: any) {
      alert("Network error: " + e.message)
    }
    setSaving(false)
  }

  const toggleFollow = async () => {
    if (!activeUser) { alert("Connect your wallet first."); return }
    const res = await fetch('/api/follows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followerId: activeUser, followingId: makerAddress.toLowerCase() })
    })
    if (res.ok) {
      const data = await res.json()
      setFollowed(data.status === 'followed')
      setFollowers(f => data.status === 'followed' ? f + 1 : f - 1)
    }
  }

  const handlePfpUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const SIZE = 200
        canvas.width = SIZE; canvas.height = SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const scale = Math.max(SIZE / img.width, SIZE / img.height)
        const x = (SIZE - img.width * scale) / 2
        const y = (SIZE - img.height * scale) / 2
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
        setEditPfp(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] text-[#e8e8e8] flex flex-col items-center justify-center font-mono">
        <div className="text-sm text-[#888] cursor-blink">&gt; Resolving on-chain identity</div>
        <div className="mt-2 text-xs text-[#444]">Querying {makerAddress.substring(0, 12)}...</div>
      </div>
    )
  }

  const isOwner = activeUser === makerAddress.toLowerCase()
  const totalTVL = bots.reduce((sum, b) => sum + (b.currentTVL || b.tvl || 0), 0)
  const botsWithBrier = bots.filter(b => b.scores?.[0]?.brierScore || b.brierScore)
  const avgBrier = botsWithBrier.length > 0
    ? botsWithBrier.reduce((sum, b) => sum + (b.scores?.[0]?.brierScore || b.brierScore), 0) / botsWithBrier.length
    : 0

  // Maker Tier
  let makerTier = 'NOVICE_NODE'
  let tierColor = '#555'
  if (bots.length >= 3 && totalTVL >= 10000 && avgBrier < 0.23) { makerTier = 'MASTER_QUANT'; tierColor = '#ff2a4d' }
  else if (bots.length >= 1 && totalTVL >= 1000) { makerTier = 'ALPHA_NODE'; tierColor = '#C8FF00' }
  else if (bots.length >= 1) { makerTier = 'TIER_1_QUANT'; tierColor = '#8a2b3e' }

  // Heatmap
  const generateHeatmap = () => {
    const days = 91
    const map = new Array(days).fill(0)
    bots.forEach((b, idx) => {
      const dayIndex = 90 - (idx * 7)
      if (dayIndex >= 0 && dayIndex < 91) {
        map[dayIndex] = 4
        if (dayIndex + 1 < 91) map[dayIndex + 1] = 2
        if (dayIndex + 2 < 91) map[dayIndex + 2] = 1
      }
    })
    return map
  }
  const heatmapData = generateHeatmap()
  const heatColors = ['#0a0a0a', '#1a0508', '#400814', '#8a2b3e', '#ff2a4d']

  const generateLogs = () => {
    const logs: string[] = []
    bots.forEach((b, idx) => {
      const time = Date.now() - (idx * 7 * 86400000)
      const d = new Date(time)
      const timeStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const tvl = b.currentTVL || b.tvl || 0
      if (tvl > 0) logs.push(`[SYS] ${timeStr}: Vault influx +${tvl.toLocaleString()} USDC for [${b.name.toUpperCase()}]`)
      logs.push(`[SYS] ${timeStr}: Algorithm deployed [${b.name.toUpperCase()}]`)
    })
    return logs
  }
  const systemLogs = generateLogs()

  return (
    <div className="min-h-screen bg-[#030303] text-[#e8e8e8]">

      {/* ═══ HERO ═══ */}
      <div className="border-b border-[#1a1a1a] bg-[#050505]">
        <div className="max-w-[1000px] mx-auto px-8 pt-6 pb-8">

          {/* Top nav */}
          <div className="flex justify-between items-center mb-8 text-xs font-mono">
            <Link href="/discover" className="text-[#444] hover:text-white transition-colors no-underline">&lt; RETURN_TO_CATALOG</Link>
            <Link href="/leaderboard" className="text-primary hover:drop-shadow-[0_0_8px_rgba(255,42,77,0.5)] transition-all no-underline font-bold">[RANKINGS]</Link>
          </div>

          {/* Identity */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex gap-6 items-start flex-wrap">
            <div className="relative">
              <UserIdenticon id={makerAddress} size={132} customUrl={profile?.pfpUrl} />
              <div className="absolute -bottom-2 -right-2 px-2 py-0.5 font-mono text-[9px] font-bold border bg-[#030303]" style={{ color: tierColor, borderColor: tierColor }}>
                {makerTier}
              </div>
            </div>

            <div className="flex-1 min-w-[280px] flex flex-col gap-3 bg-[#080808] border border-[#1a1a1a] p-5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-2xl font-bold text-white tracking-tight drop-shadow-[0_0_10px_rgba(255,42,77,0.2)]">
                  {profile?.name ? profile.name.toUpperCase() : 'ANONYMOUS_NODE'}
                </span>
                {profile?.handle && <span className="text-primary font-mono text-sm">@{profile.handle}</span>}
              </div>

              {/* Wallet + social */}
              <div className="flex items-center gap-3 flex-wrap text-xs font-mono">
                <span className="text-[#444]">WALLET</span>
                <span
                  title="Click to copy"
                  className="text-white bg-[#110508] px-2 py-1 cursor-copy select-all transition-colors border"
                  style={{ borderColor: copied ? '#ff2a4d' : '#1a1a1a' }}
                  onClick={() => { navigator.clipboard.writeText(makerAddress); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                >
                  {makerAddress.substring(0, 10)}...{makerAddress.substring(makerAddress.length - 6)}
                  {copied && <span className="text-primary ml-2">[COPIED]</span>}
                </span>
                <span className="text-[#222]">|</span>
                <span className="text-[#666]">FOLLOWERS <span className="text-white font-bold">{followers}</span></span>
                <span className="text-[#666]">FOLLOWING <span className="text-white font-bold">{following}</span></span>
              </div>

              {/* Bio */}
              {!isEditing && (
                <div className="text-xs text-[#888] leading-relaxed border-l-2 border-[#1a1a1a] pl-4 mt-1">
                  {profile?.bio
                    ? profile.bio.split('\n').map((line: string, j: number) => (
                        <span key={j}>{line.startsWith('>') ? <span className="text-primary">{line}</span> : line}<br /></span>
                      ))
                    : <span className="italic text-[#444]">// No thesis provided.</span>}
                </div>
              )}

              {/* Action */}
              <div className="mt-2">
                {isOwner ? (
                  <button
                    onClick={() => { setIsEditing(!isEditing); setEditHandle(profile?.handle || ''); setEditName(profile?.name || ''); setEditBio(profile?.bio || ''); setEditPfp(profile?.pfpUrl || '') }}
                    className={`font-mono text-xs font-bold px-4 py-2 border transition-all ${isEditing ? 'bg-transparent text-primary border-primary' : 'bg-primary text-[#030303] border-primary shadow-[0_0_12px_rgba(255,42,77,0.4)]'}`}
                  >
                    {isEditing ? '[CANCEL_EDIT]' : '[EDIT_PROFILE]'}
                  </button>
                ) : (
                  <button
                    onClick={toggleFollow}
                    className={`font-mono text-xs font-bold px-4 py-2 border transition-all ${followed ? 'bg-[#110508] text-primary border-primary' : 'bg-transparent text-white border-[#1a1a1a] hover:border-white'}`}
                  >
                    {followed ? '[FOLLOWING]' : '[FOLLOW]'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Edit panel */}
          {isEditing && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 bg-[#080405] border border-dashed border-primary/50 p-6 overflow-hidden">
              <div className="text-xs text-primary font-mono mb-5">&gt; SYS_PROMPT: Update on-chain identity. Bio supports &gt;redtext.</div>

              <div className="mb-5">
                <label className="text-[10px] text-[#666] font-mono uppercase tracking-widest block mb-2">&gt; PROFILE_IMAGE_UPLOAD</label>
                <input type="file" accept="image/*" onChange={handlePfpUpload}
                  className="w-full bg-[#110508] border border-[#1a1a1a] text-white p-2 font-mono text-xs outline-none" />
                {editPfp && (
                  <div className="mt-3 flex items-center gap-2">
                    <img src={editPfp} alt="Preview" className="w-12 h-12 object-cover border border-primary" />
                    <span className="text-xs text-primary font-mono">[IMG_READY]</span>
                  </div>
                )}
              </div>

              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px] mb-5">
                  <label className="text-[10px] text-primary font-mono uppercase tracking-widest block mb-2">&gt; UNIQUE_HANDLE (@)</label>
                  <input placeholder="sys_handle" value={editHandle} onChange={e => setEditHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                    className="w-full bg-[#110508] border border-primary text-white p-2 font-mono text-xs outline-none shadow-[0_0_5px_rgba(255,42,77,0.2)]" />
                  <div className="text-[10px] text-[#444] mt-1 font-mono">Alphanumeric and underscores only.</div>
                </div>
                <div className="flex-1 min-w-[200px] mb-5">
                  <label className="text-[10px] text-primary font-mono uppercase tracking-widest block mb-2">&gt; DISPLAY_NAME</label>
                  <input placeholder="sys_alias" value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full bg-[#110508] border border-primary text-white p-2 font-mono text-xs outline-none shadow-[0_0_5px_rgba(255,42,77,0.2)]" />
                </div>
              </div>

              <div className="mb-5">
                <label className="text-[10px] text-[#666] font-mono uppercase tracking-widest block mb-2">&gt; BIO_THESIS</label>
                <textarea placeholder="> Describe your trading thesis..." value={editBio} onChange={e => setEditBio(e.target.value)}
                  className="w-full h-28 bg-[#110508] border border-[#1a1a1a] text-white p-2 font-mono text-xs outline-none resize-y" />
              </div>

              <button onClick={handleSaveProfile} disabled={saving}
                className="bg-primary text-[#030303] font-mono font-bold text-xs px-6 py-2 transition-all hover:shadow-[0_0_15px_rgba(255,42,77,0.4)] disabled:opacity-50">
                {saving ? '[SAVING...]' : '[COMMIT_CHANGES]'}
              </button>
            </motion.div>
          )}

          {/* Stat cards */}
          <div className="flex gap-3 mt-8 flex-wrap">
            <StatCard label="BOTS_DEPLOYED" value={bots.length} color="text-primary" delay={0.1} />
            <StatCard label="AVG_BRIER" value={avgBrier} decimals={3} color={avgBrier > 0 && avgBrier <= 0.25 ? 'text-[#C8FF00]' : 'text-white'} delay={0.15} />
            <StatCard label="TOTAL_CAPITAL" value={totalTVL} prefix="$" color="text-white" delay={0.2} />
            <StatCard label="FOLLOWERS" value={followers} color="text-white" delay={0.25} />
          </div>

          {/* Heatmap */}
          <div className="mt-6">
            <div className="text-[10px] text-[#444] font-mono mb-2 tracking-widest">&gt; HISTORICAL_ACTIVITY [90D]</div>
            <div className="bg-[#080808] border border-[#1a1a1a] p-4 overflow-x-auto">
              <div className="grid gap-1 w-fit" style={{ gridTemplateRows: 'repeat(7, 11px)', gridAutoFlow: 'column' }}>
                {heatmapData.map((intensity, i) => (
                  <div key={i} title={`Day -${91 - i}`} className="w-[11px] h-[11px] transition-transform hover:scale-150 cursor-crosshair" style={{ background: heatColors[intensity] }} />
                ))}
              </div>
            </div>
            <div className="flex justify-end items-center gap-1 mt-2 text-[10px] text-[#444] font-mono">
              <span>Less</span>
              {heatColors.map(c => <div key={c} className="w-[9px] h-[9px]" style={{ background: c }} />)}
              <span>More</span>
            </div>
          </div>

        </div>
      </div>

      {/* ═══ BODY ═══ */}
      <div className="max-w-[1000px] mx-auto px-8 py-10">

        {/* Bots */}
        <div className="mb-12">
          <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3 mb-6">
            <div className="text-primary font-mono text-sm font-bold tracking-widest">
              &gt; ALGORITHMS_DEPLOYED <span className="text-[#444] font-normal">[{bots.length} ACTIVE]</span>
            </div>
          </div>

          {bots.length === 0 ? (
            <div className="border border-dashed border-[#1a1a1a] bg-[#080808] py-16 text-center">
              <div className="text-[#444] text-xs font-mono mb-5">&gt; NO_ALGORITHMS_DETECTED</div>
              {isOwner && (
                <Link href="/list-bot" className="inline-block bg-[#110508] border border-primary text-primary px-6 py-2 no-underline font-mono text-xs font-bold hover:bg-primary hover:text-[#030303] transition-colors">
                  [SUBMIT_ALGORITHM]
                </Link>
              )}
            </div>
          ) : (
            <motion.div
              className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
              initial="hidden" animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
            >
              {bots.map((b) => {
                const brier = b.scores?.[0]?.brierScore ?? b.brierScore ?? 0
                const wr = b.scores?.[0]?.winRate ?? b.winRate ?? 0
                const tvl = b.currentTVL ?? b.tvl ?? 0
                const isLive = (b.status || '').toLowerCase() === 'live' || (b.status || '').toLowerCase().includes('eligible')
                return (
                  <motion.div key={b.id} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { ease: [0.16, 1, 0.3, 1], duration: 0.4 } } }} whileHover={{ y: -4 }}>
                    <Link href={`/bot/${b.slug || b.id}`} className="flex flex-col bg-[#080808] border border-[#1a1a1a] no-underline group relative overflow-hidden transition-all hover:border-[#2a2a2a] hover:shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_0_0.5px_rgba(255,42,77,0.08)]">
                      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#1a1a1a] group-hover:border-primary/30 transition-colors" />
                      <div className="flex items-center justify-between px-3 py-2 border-b border-[#111]">
                        <span className="text-[11px] font-mono text-white font-semibold group-hover:text-primary transition-colors truncate pr-2">{b.name}</span>
                        <span className="text-[9px] font-mono flex items-center gap-1 shrink-0" style={{ color: isLive ? '#C8FF00' : '#555' }}>
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: isLive ? '#C8FF00' : '#555' }} />
                          {isLive ? 'LIVE' : 'PAPER'}
                        </span>
                      </div>
                      <div className="flex justify-center items-center py-6 bg-[#050505] border-b border-[#111]">
                        {b.pfpUrl ? (
                          <img src={b.pfpUrl} alt={b.name} className="w-16 h-16 object-cover border border-[#1a1a1a] group-hover:border-primary/30 transition-colors" />
                        ) : (
                          <BotIrisAvatar {...botEye(b)} size={64} />
                        )}
                      </div>
                      <div className="p-3 flex flex-col gap-1.5 text-[11px] font-mono">
                        <div className="flex justify-between"><span className="text-[#444]">BRIER</span><span className={`font-bold ${brier > 0 && brier <= 0.25 ? 'text-[#C8FF00]' : 'text-white'}`}>{brier.toFixed(3)}</span></div>
                        <div className="flex justify-between"><span className="text-[#444]">WIN %</span><span className="text-white">{(wr * 100).toFixed(1)}%</span></div>
                        <div className="flex justify-between border-t border-[#111] pt-1.5 mt-1"><span className="text-[#444]">VAULT TVL</span><span className="text-primary font-bold">${tvl.toLocaleString()}</span></div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </div>

        {/* Activity log */}
        <div>
          <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3 mb-6">
            <div className="text-primary font-mono text-sm font-bold tracking-widest">&gt; SYSTEM_ACTIVITY_LOG</div>
          </div>
          <div className="border border-[#1a1a1a] bg-[#080808] p-5 font-mono text-[11px] h-[200px] overflow-y-auto">
            {systemLogs.length === 0 ? (
              <div className="text-[#444] italic text-center mt-12">&gt; NO_SYSTEM_ACTIVITY_FOUND</div>
            ) : (
              <>
                {systemLogs.map((log, i) => (
                  <div key={i} className="mb-1.5 text-[#888]" style={{ opacity: Math.max(0.3, 1 - i * 0.08) }}>
                    <span className="text-[#333]">&gt;</span> {log}
                  </div>
                ))}
                <div className="text-[#444] italic mt-3 cursor-blink">&gt; _Awaiting new events</div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
