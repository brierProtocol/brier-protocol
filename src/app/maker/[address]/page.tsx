'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import BotCharacter from '@/components/BotCharacter'

// ── Pixel Identicon (5x5 symmetric) ──
function UserIdenticon({ id, size = 100, customUrl }: { id: string, size?: number, customUrl?: string | null }) {
  if (customUrl) {
    return (
      <div style={{ width: size, height: size, overflow: 'hidden', borderRadius: '50%', border: '3px solid #C9A84C', background: '#0a0a0a', flexShrink: 0 }}>
        <img src={customUrl} alt="PFP" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }

  const hash = id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0)
  const hue = Math.abs(hash % 360)
  const c1 = `hsl(${hue}, 70%, 50%)`
  const c2 = `hsl(${hue}, 70%, 20%)`
  const bg = '#0a0a0a'
  
  const grid = Array(5).fill(0).map((_, i) => 
    Array(5).fill(0).map((_, j) => {
      const mirrorJ = j > 2 ? 4 - j : j
      const bit = (Math.abs(hash) >> (i * 3 + mirrorJ)) % 3
      return bit === 0 ? bg : bit === 1 ? c1 : c2
    })
  )

  return (
    <div style={{ width: size, height: size, border: `3px solid ${c1}`, borderRadius: '50%', display: 'inline-block', padding: 4, background: bg, overflow: 'hidden', flexShrink: 0 }}>
      <svg width="100%" height="100%" viewBox="0 0 5 5" shapeRendering="crispEdges">
        {grid.map((row, i) => row.map((color, j) => (
          <rect key={`${i}-${j}`} x={j} y={i} width="1" height="1" fill={color} />
        )))}
      </svg>
    </div>
  )
}

// ── Stat Pill ──
function StatPill({ label, value, color = '#fff', glow = false }: { label: string, value: string, color?: string, glow?: boolean }) {
  return (
    <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '12px 16px', textAlign: 'center', minWidth: 120 }}>
      <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 'bold', color, textShadow: glow ? `0 0 8px ${color}40` : 'none' }}>{value}</div>
    </div>
  )
}

export default function MakerProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const { address: makerAddress } = use(params)
  
  const [activeUser, setActiveUser] = useState<string | null>(null)
  const [bots, setBots] = useState<any[]>([])
  const [profile, setProfile] = useState<any>({ bio: '', pfpUrl: '' })
  const [hearts, setHearts] = useState(0)
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editBio, setEditBio] = useState('')
  const [editPfp, setEditPfp] = useState('')
  const [loading, setLoading] = useState(true)
  const [hearted, setHearted] = useState(false)
  const [followed, setFollowed] = useState(false)
  const [saving, setSaving] = useState(false)

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
          setHearts(u.hearts)
          setFollowers(u.followersCount)
          setFollowing(u.followingCount)
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
  }, [makerAddress])

  const handleSaveProfile = async () => {
    if (!activeUser) return
    setSaving(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: activeUser, bio: editBio, pfpUrl: editPfp })
    })
    if (res.ok) {
      const updated = await res.json()
      setProfile(updated)
      setIsEditing(false)
    }
    setSaving(false)
  }

  const toggleHeart = async () => {
    if (!activeUser) { alert("Connect your wallet first."); return }
    const res = await fetch('/api/hearts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: activeUser, makerId: makerAddress.toLowerCase() })
    })
    if (res.ok) {
      const data = await res.json()
      setHearted(data.status === 'hearted')
      setHearts(h => data.status === 'hearted' ? h + 1 : h - 1)
    }
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
      <div style={{ minHeight: '100vh', background: '#050505', color: '#555', padding: '4rem 2rem', fontFamily: 'monospace', textAlign: 'center' }}>
        <div style={{ fontSize: 14 }}>&gt; Resolving on-chain identity...</div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#333' }}>Querying {makerAddress.substring(0,12)}...</div>
      </div>
    )
  }

  const isOwner = activeUser === makerAddress.toLowerCase()
  const totalTVL = bots.reduce((sum, b) => sum + (b.currentTVL || b.tvl || 0), 0)
  const botsWithBrier = bots.filter(b => b.scores?.[0]?.brierScore || b.brierScore)
  const avgBrier = botsWithBrier.length > 0 
    ? botsWithBrier.reduce((sum, b) => sum + (b.scores?.[0]?.brierScore || b.brierScore), 0) / botsWithBrier.length 
    : 0
  const shortAddr = `${makerAddress.substring(0, 6)}...${makerAddress.substring(makerAddress.length - 4)}`

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-mono), monospace', color: '#c5c8c6' }}>
      
      {/* ═══════════ PROFILE HERO ═══════════ */}
      <div style={{ 
        background: 'linear-gradient(180deg, #0d1117 0%, #050505 100%)', 
        borderBottom: '1px solid #1a1a1a',
        padding: '3rem 1rem 2rem'
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          
          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', fontSize: 12 }}>
            <Link href="/discover" style={{ color: '#555', textDecoration: 'none' }}>← Back to Catalog</Link>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link href="/leaderboard" style={{ color: '#2563EB', textDecoration: 'none' }}>[Rankings]</Link>
              <Link href="/dashboard" style={{ color: '#2563EB', textDecoration: 'none' }}>[Dashboard]</Link>
            </div>
          </div>

          {/* Identity Row */}
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
            
            {/* Avatar */}
            <UserIdenticon id={makerAddress} size={120} customUrl={profile?.pfpUrl} />

            {/* Info Column */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 22, fontWeight: 'bold', color: '#fff' }}>
                  {profile?.bio ? 'Quant Architect' : 'Anonymous'}
                </span>
                <span style={{ 
                  fontSize: 10, padding: '2px 8px', 
                  background: bots.length > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(85,85,85,0.15)', 
                  border: `1px solid ${bots.length > 0 ? '#22c55e' : '#333'}`, 
                  color: bots.length > 0 ? '#22c55e' : '#555' 
                }}>
                  {bots.length > 0 ? 'ACTIVE' : 'IDLE'}
                </span>
              </div>

              <div style={{ fontSize: 12, color: '#555', marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span title={makerAddress} style={{ cursor: 'default' }}>{shortAddr}</span>
                <span>·</span>
                <span>{followers} followers</span>
                <span>·</span>
                <span>{following} following</span>
              </div>

              {/* Bio */}
              {!isEditing && (
                <div style={{ fontSize: 13, lineHeight: 1.6, color: '#999', marginBottom: '1rem', maxWidth: 500 }}>
                  {profile?.bio ? profile.bio.split('\n').map((line: string, j: number) => (
                    <span key={j}>
                      {line.startsWith('>') ? <span style={{ color: '#7ec87e' }}>{line}</span> : line}
                      <br />
                    </span>
                  )) : (
                    <span style={{ fontStyle: 'italic', color: '#444' }}>No bio yet.</span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {isOwner ? (
                  <button 
                    onClick={() => { setIsEditing(!isEditing); setEditBio(profile?.bio || ''); setEditPfp(profile?.pfpUrl || '') }}
                    style={{ 
                      background: isEditing ? '#333' : '#2563EB', color: isEditing ? '#aaa' : '#fff', 
                      border: 'none', padding: '8px 20px', fontSize: 12, 
                      cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isEditing ? 'CANCEL' : 'EDIT PROFILE'}
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={toggleFollow}
                      style={{ 
                        background: followed ? '#2563EB' : 'transparent', 
                        color: followed ? '#fff' : '#2563EB', 
                        border: '1px solid #2563EB', padding: '8px 20px', fontSize: 12, 
                        cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => { if (!followed) { e.currentTarget.style.background = 'rgba(37,99,235,0.1)' }}}
                      onMouseOut={e => { if (!followed) { e.currentTarget.style.background = 'transparent' }}}
                    >
                      {followed ? '✓ FOLLOWING' : 'FOLLOW'}
                    </button>
                    <button 
                      onClick={toggleHeart}
                      style={{ 
                        background: hearted ? 'rgba(239,68,68,0.15)' : 'transparent', 
                        color: '#ef4444', 
                        border: '1px solid #ef4444', padding: '8px 16px', fontSize: 12, 
                        cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                      onMouseOut={e => { if (!hearted) e.currentTarget.style.background = 'transparent' }}
                    >
                      ♥ {hearts}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Edit Form (only if editing) */}
          {isEditing && (
            <div style={{ marginTop: '1.5rem', background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '1.5rem', maxWidth: 600 }}>
              <div style={{ fontSize: 11, color: '#555', marginBottom: '1rem', fontFamily: 'var(--font-mono), monospace' }}>Update your on-chain identity. Bio supports &gt;greentext.</div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: 10, color: '#555', display: 'block', marginBottom: 4, fontFamily: 'var(--font-mono), monospace' }}>PROFILE IMAGE</label>
                <input 
                  type="file" 
                  accept="image/*"
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
                        
                        // Crop to square
                        const scale = Math.max(SIZE / img.width, SIZE / img.height)
                        const x = (SIZE - img.width * scale) / 2
                        const y = (SIZE - img.height * scale) / 2
                        ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
                        
                        // Convert to base64 jpeg
                        const base64 = canvas.toDataURL('image/jpeg', 0.8)
                        setEditPfp(base64)
                      }
                      img.src = event.target?.result as string
                    }
                    reader.readAsDataURL(file)
                  }}
                  style={{ width: '100%', background: '#050505', border: '1px solid #222', color: '#fff', padding: '10px 12px', fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} 
                />
                {editPfp && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src={editPfp} alt="Preview" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                    <span style={{ fontSize: 11, color: '#22c55e' }}>Image processed and ready to save.</span>
                  </div>
                )}
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: 10, color: '#555', display: 'block', marginBottom: 4, fontFamily: 'var(--font-mono), monospace' }}>BIO</label>
                <textarea 
                  placeholder="> Describe your trading thesis..." 
                  value={editBio} 
                  onChange={e => setEditBio(e.target.value)}
                  style={{ width: '100%', height: 100, background: '#050505', border: '1px solid #222', color: '#7ec87e', padding: '10px 12px', fontFamily: 'inherit', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} 
                />
              </div>
              <button 
                onClick={handleSaveProfile} 
                disabled={saving}
                style={{ background: '#2563EB', color: '#fff', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', fontSize: 12, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            </div>
          )}

          {/* Stat Pills */}
          <div style={{ display: 'flex', gap: '1px', marginTop: '2rem', background: '#1a1a1a', border: '1px solid #1a1a1a', overflow: 'hidden', flexWrap: 'wrap' }}>
            <StatPill label="Capital Managed" value={`$${totalTVL.toLocaleString()}`} color="#fff" glow />
            <StatPill label="Submitted Algos" value={String(bots.length)} color="#2563EB" />
            <StatPill label="Avg Brier" value={avgBrier > 0 ? avgBrier.toFixed(3) : '—'} color={avgBrier < 0.25 ? '#22c55e' : '#FF6B1A'} glow />
            <StatPill label="Hearts" value={String(hearts)} color="#ef4444" />
            <StatPill label="Followers" value={String(followers)} color="#2563EB" />
          </div>
        </div>
      </div>

      {/* ═══════════ CONTENT BODY ═══════════ */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>

        {/* FLEET SECTION */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 3, height: 20, background: '#2563EB' }}></div>
              <span style={{ fontSize: 14, fontWeight: 'bold', color: '#fff', letterSpacing: 1, fontFamily: 'var(--font-body), sans-serif' }}>ALGORITHMS CREATED</span>
              <span style={{ fontSize: 11, color: '#555' }}>({bots.length} algorithms)</span>
            </div>
          </div>
          
          {bots.length === 0 ? (
            <div style={{ border: '1px dashed #1a1a1a', padding: '3rem', textAlign: 'center' }}>
              <div style={{ color: '#555', fontSize: 13, fontFamily: 'var(--font-body), sans-serif', marginBottom: '1rem' }}>
                This user hasn't submitted any algorithms to the public directory yet.
              </div>
              {isOwner && (
                <Link href="/list-bot" style={{ background: '#2563EB', color: '#000', textDecoration: 'none', padding: '8px 16px', fontSize: 12, fontWeight: 'bold', display: 'inline-block' }}>
                  Submit Your First Algorithm
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {bots.map((b) => {
                const brier = b.scores?.[0]?.brierScore ?? b.brierScore ?? 0
                const wr = b.scores?.[0]?.winRate ?? b.winRate ?? 0
                const tvl = b.currentTVL ?? b.tvl ?? 0
                const yld = b.monthlyYield ?? 0
                return (
                  <Link 
                    href={`/bot/${b.slug || b.id}`} 
                    key={b.id} 
                    style={{ 
                      textDecoration: 'none', color: 'inherit', display: 'block',
                      background: '#0a0a0a', border: '1px solid #1a1a1a',
                      transition: 'border-color 0.2s, transform 0.2s'
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.borderColor = '#2563EB'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.borderColor = '#1a1a1a'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {/* Bot Avatar */}
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem 0', background: '#080808', borderBottom: '1px solid #1a1a1a', position: 'relative' }}>
                      <BotCharacter mood={b.mood as any} size={90} />
                      <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, fontWeight: 'bold', padding: '2px 6px', background: b.status === 'live' ? 'rgba(34,197,94,0.15)' : 'rgba(168,85,247,0.15)', color: b.status === 'live' ? '#22c55e' : '#a855f7', border: `1px solid ${b.status === 'live' ? '#22c55e33' : '#a855f733'}` }}>
                        {b.status.toUpperCase()}
                      </div>
                    </div>
                    {/* Bot Info */}
                    <div style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 'bold', fontSize: 14, color: '#fff', marginBottom: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-body), sans-serif' }}>
                        {b.name}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 11, color: '#777' }}>
                        <div>Brier <span style={{ color: brier < 0.25 ? '#22c55e' : '#FF6B1A', fontWeight: 'bold' }}>{brier.toFixed(3)}</span></div>
                        <div>Win <span style={{ color: '#c5c8c6' }}>{(wr*100).toFixed(0)}%</span></div>
                        <div>TVL <span style={{ color: '#fff' }}>${tvl.toLocaleString()}</span></div>
                        <div>Yield <span style={{ color: yld > 0 ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>{yld > 0 ? '+' : ''}{yld}%</span></div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* VAULT DEPOSITS SECTION */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 3, height: 20, background: '#22c55e' }}></div>
            <span style={{ fontSize: 14, fontWeight: 'bold', color: '#fff', letterSpacing: 1, fontFamily: 'var(--font-body), sans-serif' }}>VAULT DEPOSITS</span>
            <span style={{ fontSize: 11, color: '#555' }}>(investments made by this user)</span>
          </div>
          <div style={{ border: '1px dashed #1a1a1a', padding: '3rem', textAlign: 'center' }}>
            <div style={{ color: '#555', fontSize: 13, fontFamily: 'var(--font-body), sans-serif' }}>This user has not deposited capital into any algorithm vaults yet.</div>
          </div>
        </div>

        {/* ACTIVITY SECTION */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 3, height: 20, background: '#C9A84C' }}></div>
            <span style={{ fontSize: 14, fontWeight: 'bold', color: '#fff', letterSpacing: 1 }}>RECENT ACTIVITY</span>
          </div>
          <div style={{ border: '1px dashed #1a1a1a', padding: '2rem', textAlign: 'center' }}>
            <div style={{ color: '#333', fontSize: 13 }}>Activity feed coming soon.</div>
          </div>
        </div>

      </div>
    </div>
  )
}
