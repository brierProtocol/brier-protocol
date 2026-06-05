'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import BotIrisAvatar from '@/components/BotIrisAvatar'

// ── Pixel Identicon (5x5 symmetric) ──
function UserIdenticon({ id, size = 100, customUrl }: { id: string, size?: number, customUrl?: string | null }) {
  if (customUrl) {
    return (
      <div style={{ width: size, height: size, overflow: 'hidden', border: '1px solid #333', background: '#000', flexShrink: 0 }}>
        <img src={customUrl} alt="PFP" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }

  const hash = id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0)
  const hue = Math.abs(hash % 360)
  const c1 = `hsl(${hue}, 80%, 60%)`
  const c2 = `hsl(${hue}, 80%, 20%)`
  const bg = '#030303'
  
  const grid = Array(5).fill(0).map((_, i) => 
    Array(5).fill(0).map((_, j) => {
      const mirrorJ = j > 2 ? 4 - j : j
      const bit = (Math.abs(hash) >> (i * 3 + mirrorJ)) % 3
      return bit === 0 ? bg : bit === 1 ? c1 : c2
    })
  )

  return (
    <div style={{ width: size, height: size, border: `1px solid ${c1}`, display: 'inline-block', padding: 4, background: bg, overflow: 'hidden', flexShrink: 0 }}>
      <svg width="100%" height="100%" viewBox="0 0 5 5" shapeRendering="crispEdges">
        {grid.map((row, i) => row.map((color, j) => (
          <rect key={`${i}-${j}`} x={j} y={i} width="1" height="1" fill={color} />
        )))}
      </svg>
    </div>
  )
}

// ── Stat Pill ──
function StatPill({ label, value, color = '#EFEFEF' }: { label: string, value: string, color?: string }) {
  return (
    <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '12px 16px', flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: '10px', color: '#666', marginBottom: 4, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '16px', fontWeight: 700, color, fontFamily: 'var(--font-mono), monospace' }}>{value}</div>
    </div>
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
    // Aggressive raw wallet detection
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const getAddr = async () => {
        try {
          const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) setActiveUser(accounts[0].toLowerCase())
        } catch (e) {}
      }
      getAddr()
      ;(window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) setActiveUser(accounts[0].toLowerCase())
        else setActiveUser(null)
      })
    }

    // Fetch profile and bots
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
          // Simple local check if active user is in followers array
          if (u.user?.followers?.some((f:any) => f.followerId.toLowerCase() === activeUser)) {
            setFollowed(true)
          }
        }

        if (botsRes.ok) {
          const allBots = await botsRes.json()
          const created = allBots.filter((b: any) => 
            (b.walletAddress || b.builder)?.toLowerCase() === makerAddress.toLowerCase()
          )
          setBots(created)
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#030303', color: '#e8e8e8', padding: '4rem 2rem', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: '#888' }}>&gt; Resolving on-chain identity...</div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#555' }}>Querying {makerAddress.substring(0,12)}...</div>
      </div>
    )
  }

  const isOwner = activeUser === makerAddress.toLowerCase()
  const totalTVL = bots.reduce((sum, b) => sum + (b.currentTVL || b.tvl || 0), 0)
  const botsWithBrier = bots.filter(b => b.scores?.[0]?.brierScore || b.brierScore)
  const avgBrier = botsWithBrier.length > 0 
    ? botsWithBrier.reduce((sum, b) => sum + (b.scores?.[0]?.brierScore || b.brierScore), 0) / botsWithBrier.length 
    : 0

  // 1. Maker Tier Calculation
  let makerTier = '[NOVICE_NODE]'
  let tierColor = '#555'
  if (bots.length >= 3 && totalTVL >= 10000 && avgBrier < 0.23) {
    makerTier = '[MASTER_QUANT]'
    tierColor = '#ff2a4d'
  } else if (bots.length >= 1 && totalTVL >= 1000) {
    makerTier = '[ALPHA_NODE]'
    tierColor = '#EFEFEF'
  } else if (bots.length >= 1) {
    makerTier = '[TIER_1_QUANT]'
    tierColor = '#8a2b3e'
  }

  // 2. Heatmap actual data generator
  const generateHeatmap = () => {
    const days = 91
    const map = new Array(days).fill(0) 
    if (bots.length === 0) return map;

    bots.forEach((b, idx) => {
      const dayIndex = 90 - (idx * 7) 
      if (dayIndex >= 0 && dayIndex < 91) {
        map[dayIndex] = 4; 
        if (dayIndex + 1 < 91) map[dayIndex + 1] = 2;
        if (dayIndex + 2 < 91) map[dayIndex + 2] = 1;
      }
    })
    return map
  }
  const heatmapData = generateHeatmap()
  const heatColors = ['#080405', '#1a0508', '#400814', '#8a2b3e', '#ff2a4d'] 

  const generateLogs = () => {
    const logs: string[] = []
    if (bots.length === 0) return logs 

    bots.forEach((b, idx) => {
      const time = Date.now() - (idx * 7 * 86400000)
      const d = new Date(time)
      const timeStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      const tvl = b.currentTVL || b.tvl || 0
      if (tvl > 0) {
        logs.push(`> [SYS] ${timeStr}: Vault Capital Influx +${tvl.toLocaleString()} USDC for [${b.name.toUpperCase()}]`)
      }
      logs.push(`> [SYS] ${timeStr}: Algorithm Deployed [${b.name.toUpperCase()}]`)
    })
    return logs
  }
  const systemLogs = generateLogs()

  return (
    <div style={{ minHeight: '100vh', background: '#030303', fontFamily: 'Inter, sans-serif', color: '#e8e8e8' }}>
      
      {/* ═══════════ PROFILE HERO ═══════════ */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '3rem 1.5rem 2.5rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', fontSize: '12px' }}>
            <Link href="/discover" style={{ color: '#555', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#FFFFFF'} onMouseOut={e => e.currentTarget.style.color = '#555'}>&lt; RETURN_TO_CATALOG</Link>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <Link href="/leaderboard" style={{ color: '#ff2a4d', textDecoration: 'none', fontWeight: 700 }}>[RANKINGS]</Link>
            </div>
          </div>


          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            
            <UserIdenticon id={makerAddress} size={140} customUrl={profile?.pfpUrl} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '1.5rem', minWidth: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', textShadow: '0 0 10px rgba(255,42,77,0.3)' }}>
                  {profile?.name ? profile.name.toUpperCase() : (profile?.bio ? 'QUANT_ARCHITECT' : 'ANONYMOUS_NODE')}
                </span>
                {profile?.handle && (
                  <span style={{ color: '#ff2a4d', fontSize: '14px', fontFamily: 'var(--font-mono), monospace' }}>
                    @{profile.handle}
                  </span>
                )}
                <span style={{ color: tierColor, fontSize: '12px', fontWeight: 700, border: `1px solid ${tierColor}`, padding: '2px 6px' }}>
                  {makerTier}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#888', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: '#666' }}>WALLET</span>
                <span 
                  title="Click to copy"
                  style={{ color: '#FFFFFF', background: '#110508', border: `1px solid ${copied ? '#ff2a4d' : '#333'}`, padding: '4px 8px', userSelect: 'all', cursor: 'copy', transition: 'all 0.2s' }}
                  onClick={() => {
                    navigator.clipboard.writeText(makerAddress)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  {makerAddress} {copied ? <span style={{ color: '#ff2a4d', marginLeft: '8px' }}>[COPIED]</span> : ''}
                </span>
                <span>|</span>
                <span>FOLLOWERS: <span style={{ color: '#FFFFFF' }}>{followers}</span></span>
                <span>|</span>
                <span>FOLLOWING: <span style={{ color: '#FFFFFF' }}>{following}</span></span>
              </div>

              {!isEditing && (
                <div style={{ fontSize: '12px', lineHeight: 1.5, color: '#999', marginTop: '0.5rem', borderLeft: '2px solid #333', paddingLeft: '1rem' }}>
                  {profile?.bio ? profile.bio.split('\\n').map((line: string, j: number) => (
                    <span key={j}>
                      {line.startsWith('>') ? <span style={{ color: '#ff2a4d' }}>{line}</span> : line}
                      <br />
                    </span>
                  )) : (
                    <span style={{ fontStyle: 'italic', color: '#555' }}>// No thesis provided.</span>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                {isOwner ? (
                  <button 
                    onClick={() => { setIsEditing(!isEditing); setEditHandle(profile?.handle || ''); setEditName(profile?.name || ''); setEditBio(profile?.bio || ''); setEditPfp(profile?.pfpUrl || '') }}
                    style={{ background: isEditing ? 'transparent' : '#ff2a4d', color: isEditing ? '#ff2a4d' : '#030303', border: `1px solid #ff2a4d`, padding: '6px 16px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, boxShadow: isEditing ? 'none' : '0 0 10px rgba(255,42,77,0.5)', transition: 'all 0.2s' }}
                  >
                    {isEditing ? '[CANCEL_EDIT]' : '[EDIT_PROFILE]'}
                  </button>
                ) : (
                  <button 
                    onClick={toggleFollow}
                    style={{ background: followed ? '#110508' : 'transparent', color: followed ? '#ff2a4d' : '#FFFFFF', border: `1px solid ${followed ? '#ff2a4d' : '#333'}`, padding: '6px 16px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}
                    onMouseOver={e => { if (!followed) { e.currentTarget.style.borderColor = '#FFFFFF' }}}
                    onMouseOut={e => { if (!followed) { e.currentTarget.style.borderColor = '#333' }}}
                  >
                    {followed ? '[FOLLOWING]' : '[FOLLOW]'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {isEditing && (
            <div style={{ marginTop: '1.5rem', background: '#080405', border: '1px dashed #ff2a4d', padding: '1.5rem' }}>
              <div style={{ fontSize: '12px', color: '#ff2a4d', marginBottom: '1.5rem', fontFamily: 'var(--font-mono), monospace' }}>&gt; SYS_PROMPT: Update on-chain identity. Bio supports &gt;redtext.</div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '10px', color: '#888', display: 'block', marginBottom: 8, fontFamily: 'var(--font-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>&gt; PROFILE_IMAGE_UPLOAD:</label>
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
                  style={{ width: '100%', background: '#110508', border: '1px solid #333', color: '#FFFFFF', padding: '8px', fontFamily: 'inherit', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} 
                />
                {editPfp && (
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src={editPfp} alt="Preview" style={{ width: 48, height: 48, objectFit: 'cover', border: '1px solid #ff2a4d' }} />
                    <span style={{ fontSize: '12px', color: '#ff2a4d' }}>[IMG_READY]</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ marginBottom: '1.5rem', flex: 1 }}>
                  <label style={{ fontSize: '10px', color: '#ff2a4d', display: 'block', marginBottom: 8, fontFamily: 'var(--font-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>&gt; UNIQUE_HANDLE (@):</label>
                  <input 
                    placeholder="SYS_HANDLE" value={editHandle} onChange={e => setEditHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                    style={{ width: '100%', background: '#110508', border: '1px solid #ff2a4d', color: '#FFFFFF', padding: '8px', fontFamily: 'var(--font-mono), monospace', fontSize: '12px', outline: 'none', boxSizing: 'border-box', boxShadow: '0 0 5px rgba(255,42,77,0.2)' }} 
                  />
                  <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>Alphanumeric and underscores only.</div>
                </div>
                <div style={{ marginBottom: '1.5rem', flex: 1 }}>
                  <label style={{ fontSize: '10px', color: '#ff2a4d', display: 'block', marginBottom: 8, fontFamily: 'var(--font-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>&gt; DISPLAY_NAME:</label>
                  <input 
                    placeholder="SYS_ALIAS" value={editName} onChange={e => setEditName(e.target.value)}
                    style={{ width: '100%', background: '#110508', border: '1px solid #ff2a4d', color: '#FFFFFF', padding: '8px', fontFamily: 'var(--font-mono), monospace', fontSize: '12px', outline: 'none', boxSizing: 'border-box', boxShadow: '0 0 5px rgba(255,42,77,0.2)' }} 
                  />
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '10px', color: '#888', display: 'block', marginBottom: 8, fontFamily: 'var(--font-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>&gt; BIO_THESIS:</label>
                <textarea 
                  placeholder="> Describe your trading thesis..." value={editBio} onChange={e => setEditBio(e.target.value)}
                  style={{ width: '100%', height: 120, background: '#110508', border: '1px solid #333', color: '#FFFFFF', padding: '8px', fontFamily: 'var(--font-mono), monospace', fontSize: '12px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} 
                />
              </div>
              <button 
                onClick={handleSaveProfile} disabled={saving}
                style={{ background: '#110508', color: '#ff2a4d', border: '1px solid #ff2a4d', padding: '8px 24px', fontWeight: 700, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', fontSize: '12px', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? '[SAVING...]' : '[COMMIT_CHANGES]'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem', flexWrap: 'wrap' }}>
            <StatPill label="BOTS_DEPLOYED" value={String(bots.length)} color="#ff2a4d" />
            <StatPill label="AVG_BRIER" value={avgBrier > 0 ? avgBrier.toFixed(3) : '---'} color={avgBrier > 0 && avgBrier <= 0.25 ? '#FFFFFF' : '#8a2b3e'} />
            <StatPill label="TOTAL_CAPITAL" value={`$${totalTVL.toLocaleString()}`} color="#FFFFFF" />
          </div>

          <div style={{ marginTop: '2rem' }}>
            <div style={{ fontSize: '10px', color: '#555', marginBottom: '8px', fontFamily: 'var(--font-mono), monospace' }}>&gt; HISTORICAL ACTIVITY:</div>
            <div style={{ background: '#080405', padding: '1.5rem', border: '1px solid #110508', overflowX: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 12px)', gridAutoFlow: 'column', gap: '4px', width: 'fit-content' }}>
                {heatmapData.map((intensity, i) => (
                  <div 
                    key={i} title={`Day -${91-i}: Intensity ${intensity}`}
                    style={{ width: '12px', height: '12px', background: heatColors[intensity], borderRadius: '0px', transition: 'transform 0.1s ease', cursor: 'crosshair' }} 
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.5)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '10px', color: '#555' }}>
              <span>Less</span>
              {heatColors.map(c => <div key={c} style={{ width: '10px', height: '10px', background: c, borderRadius: '0px' }} />)}
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ CONTENT BODY ═══════════ */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ marginBottom: '4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #110508', paddingBottom: '1rem', marginBottom: '2rem' }}>
            <div style={{ color: '#ff2a4d', fontSize: '14px', fontWeight: 700, letterSpacing: '1px' }}>
              &gt; ALGORITHMS DEPLOYED <span style={{ color: '#555', fontWeight: 400 }}>[{bots.length} ACTIVE]</span>
            </div>
          </div>
          
          {bots.length === 0 ? (
            <div style={{ border: '1px dashed #110508', padding: '4rem', textAlign: 'center', background: '#080405' }}>
              <div style={{ color: '#555', fontSize: '12px', marginBottom: '1.5rem', fontFamily: 'var(--font-mono), monospace' }}>
                &gt; NO_ALGORITHMS_DETECTED
              </div>
              {isOwner && (
                <Link href="/list-bot" style={{ background: '#110508', border: '1px solid #ff2a4d', color: '#ff2a4d', textDecoration: 'none', padding: '8px 24px', fontSize: '12px', fontWeight: 700, display: 'inline-block' }}>
                  [SUBMIT_ALGORITHM]
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {bots.map((b) => {
                const brier = b.scores?.[0]?.brierScore ?? b.brierScore ?? 0
                const wr = b.scores?.[0]?.winRate ?? b.winRate ?? 0
                const tvl = b.currentTVL ?? b.tvl ?? 0
                const yld = b.monthlyYield ?? 0
                const isLive = (b.status || '').toLowerCase() === 'live'
                return (
                  <Link 
                    href={`/bot/${b.slug || b.id}`} 
                    key={b.id} 
                    style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', background: '#080405', border: '1px solid #110508', transition: 'all 0.2s ease' }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = '#ff2a4d'; e.currentTarget.style.background = '#110508' }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = '#110508'; e.currentTarget.style.background = '#080405' }}
                  >
                    <div style={{ color: '#ff2a4d', padding: '0.75rem 1rem', borderBottom: '1px dashed #110508', fontSize: '12px', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                      <span>+-- [ {b.name.toUpperCase()} ] --+</span>
                      <span style={{ color: isLive ? '#FFFFFF' : '#8a2b3e' }}>[{isLive ? 'LIVE' : 'PAPER'}]</span>
                    </div>

                    <div style={{ width: '100%', background: '#030303', display: 'flex', justifyContent: 'center', padding: '1.5rem 0', borderBottom: '1px dashed #110508' }}>
                      {b.pfpUrl ? (
                        <img src={b.pfpUrl} alt={b.name} style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: '50%', border: '2px solid #ff2a4d' }} />
                      ) : (
                        <BotIrisAvatar avatarId={b.avatarId || 'void-eye'} accentColor={b.color || '#ff2a4d'} size={70} />
                      )}
                    </div>

                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#555' }}>&gt; MAKER:</span>
                        <span style={{ color: '#FFFFFF' }}>{(b.builder || b.walletAddress || 'anon').substring(0, 8)}...</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#555' }}>&gt; BRIER_SCORE:</span>
                        <span style={{ color: brier > 0 && brier <= 0.25 ? '#FFFFFF' : '#8a2b3e', fontWeight: 700 }}>{brier.toFixed(3)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#555' }}>&gt; WIN_RATE:</span>
                        <span style={{ color: '#EFEFEF' }}>{(wr * 100).toFixed(1)}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#555' }}>&gt; MTH_YIELD:</span>
                        <span style={{ color: yld > 0 ? '#FFFFFF' : '#888' }}>{yld > 0 ? '+' : ''}{yld}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #110508', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                        <span style={{ color: '#555' }}>&gt; VAULT_TVL:</span>
                        <span style={{ color: '#ff2a4d', fontWeight: 700 }}>\${tvl.toLocaleString()}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #110508', paddingBottom: '1rem', marginBottom: '2rem' }}>
            <div style={{ color: '#ff2a4d', fontSize: '14px', fontWeight: 700, letterSpacing: '1px' }}>
              &gt; RECENT ACTIVITY
            </div>
          </div>
          <div style={{ border: '1px solid #110508', background: '#080405', padding: '1.5rem', fontFamily: 'var(--font-mono), monospace', fontSize: '12px', color: '#FFFFFF', height: '200px', overflowY: 'auto' }}>
            {systemLogs.length === 0 ? (
              <div style={{ color: '#555', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>
                &gt; NO_SYSTEM_ACTIVITY_FOUND
              </div>
            ) : (
              systemLogs.map((log, i) => (
                <div key={i} style={{ marginBottom: '0.5rem', opacity: 1 - (i * 0.1) }}>
                  {log}
                </div>
              ))
            )}
            {systemLogs.length > 0 && (
              <div style={{ color: '#555', marginTop: '1rem', fontStyle: 'italic' }}>
                &gt; _Awaiting new events...
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
