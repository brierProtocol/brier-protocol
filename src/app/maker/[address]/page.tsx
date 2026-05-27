'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import BotCharacter from '@/components/BotCharacter'

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
  const c1 = `hsl(${hue}, 70%, 50%)`
  const c2 = `hsl(${hue}, 70%, 20%)`
  const bg = '#000'
  
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
    <div style={{ background: '#000', border: '1px solid #333', padding: '12px 16px', flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: '10px', color: '#666', marginBottom: 4, fontFamily: 'var(--font-mono), monospace' }}>&gt; {label}:</div>
      <div style={{ fontSize: '16px', fontWeight: 700, color, fontFamily: 'var(--font-mono), monospace' }}>[{value}]</div>
    </div>
  )
}

export default function MakerProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const { address: makerAddress } = use(params)
  
  const [activeUser, setActiveUser] = useState<string | null>(null)
  const [bots, setBots] = useState<any[]>([])
  const [profile, setProfile] = useState<any>({ name: '', bio: '', pfpUrl: '' })
  const [hearts, setHearts] = useState(0)
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editPfp, setEditPfp] = useState('')
  const [loading, setLoading] = useState(true)
  const [hearted, setHearted] = useState(false)
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
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: activeUser, name: editName, bio: editBio, pfpUrl: editPfp })
      })
      if (res.ok) {
        const updated = await res.json()
        setProfile(updated)
        setIsEditing(false)
      } else {
        const err = await res.json()
        alert("Save failed! If you just updated the database, try restarting your server (npm run dev). Error: " + (err.error || res.statusText))
      }
    } catch (e: any) {
      alert("Network error: " + e.message)
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
    <div style={{ minHeight: '100vh', background: '#000000', fontFamily: 'var(--font-mono), monospace', color: '#EFEFEF' }}>
      
      {/* ═══════════ PROFILE HERO ═══════════ */}
      <div style={{ 
        borderBottom: '1px dashed #333',
        padding: '3rem 1.5rem 2.5rem'
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          
          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', fontSize: '12px' }}>
            <Link href="/discover" style={{ color: '#888', textDecoration: 'none', transition: 'color 0.2s ease' }} onMouseOver={e => e.currentTarget.style.color = '#fff'} onMouseOut={e => e.currentTarget.style.color = '#888'}>&lt; RETURN_TO_CATALOG</Link>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <Link href="/leaderboard" style={{ color: '#00C9C0', textDecoration: 'none', fontWeight: 700 }}>[RANKINGS]</Link>
              <Link href="/dashboard" style={{ color: '#00C9C0', textDecoration: 'none', fontWeight: 700 }}>[DASHBOARD]</Link>
            </div>
          </div>

          <div style={{ color: '#2563EB', fontSize: '14px', fontWeight: 700, letterSpacing: '1px', marginBottom: '1.5rem' }}>
            &gt; MAKER_IDENTITY.EXE
          </div>

          {/* Identity Row */}
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            
            {/* Avatar */}
            <UserIdenticon id={makerAddress} size={140} customUrl={profile?.pfpUrl} />

            {/* Info Column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#030303', border: '1px solid #333', padding: '1.5rem', minWidth: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00FF00' }}>
                  {profile?.name ? profile.name.toUpperCase() : (profile?.bio ? 'QUANT_ARCHITECT' : 'ANONYMOUS_NODE')}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#666', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: '#C9A84C' }}>&gt; WALLET:</span>
                <span 
                  title="Click to copy"
                  style={{ color: '#EFEFEF', background: '#000', border: `1px solid ${copied ? '#00FF00' : '#333'}`, padding: '4px 8px', userSelect: 'all', cursor: 'copy', transition: 'all 0.2s' }}
                  onClick={() => {
                    navigator.clipboard.writeText(makerAddress)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  {makerAddress} {copied ? <span style={{ color: '#00FF00', marginLeft: '8px' }}>[COPIED]</span> : ''}
                </span>
                <span>|</span>
                <span>FOLLOWERS: <span style={{ color: '#EFEFEF' }}>{followers}</span></span>
                <span>|</span>
                <span>FOLLOWING: <span style={{ color: '#EFEFEF' }}>{following}</span></span>
              </div>

              {/* Bio */}
              {!isEditing && (
                <div style={{ fontSize: '12px', lineHeight: 1.5, color: '#aaa', marginTop: '0.5rem', borderLeft: '2px solid #333', paddingLeft: '1rem' }}>
                  {profile?.bio ? profile.bio.split('\n').map((line: string, j: number) => (
                    <span key={j}>
                      {line.startsWith('>') ? <span style={{ color: '#00FF00' }}>{line}</span> : line}
                      <br />
                    </span>
                  )) : (
                    <span style={{ fontStyle: 'italic', color: '#555' }}>// No thesis provided.</span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                {isOwner ? (
                  <button 
                    onClick={() => { setIsEditing(!isEditing); setEditName(profile?.name || ''); setEditBio(profile?.bio || ''); setEditPfp(profile?.pfpUrl || '') }}
                    style={{ 
                      background: isEditing ? 'transparent' : '#000', color: isEditing ? '#888' : '#00C9C0', 
                      border: `1px solid ${isEditing ? '#333' : '#00C9C0'}`, padding: '6px 16px', fontSize: '12px', 
                      cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700
                    }}
                  >
                    {isEditing ? '[CANCEL_EDIT]' : '[EDIT_PROFILE]'}
                  </button>
                ) : (
                  <button 
                    onClick={toggleFollow}
                    style={{ 
                      background: followed ? '#050505' : 'transparent', 
                      color: followed ? '#00FF00' : '#EFEFEF', 
                      border: `1px solid ${followed ? '#00FF00' : '#333'}`, padding: '6px 16px', fontSize: '12px', 
                      cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700
                    }}
                    onMouseOver={e => { if (!followed) { e.currentTarget.style.borderColor = '#EFEFEF' }}}
                    onMouseOut={e => { if (!followed) { e.currentTarget.style.borderColor = '#333' }}}
                  >
                    {followed ? '[FOLLOWING]' : '[FOLLOW]'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div style={{ marginTop: '1.5rem', background: '#030303', border: '1px dashed #00FF00', padding: '1.5rem' }}>
              <div style={{ fontSize: '12px', color: '#00FF00', marginBottom: '1.5rem', fontFamily: 'var(--font-mono), monospace' }}>&gt; SYS_PROMPT: Update on-chain identity. Bio supports &gt;greentext.</div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '10px', color: '#666', display: 'block', marginBottom: 8, fontFamily: 'var(--font-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>&gt; PROFILE_IMAGE_UPLOAD:</label>
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
                  style={{ width: '100%', background: '#000', border: '1px solid #333', color: '#EFEFEF', padding: '8px', fontFamily: 'inherit', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} 
                />
                {editPfp && (
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src={editPfp} alt="Preview" style={{ width: 48, height: 48, objectFit: 'cover', border: '1px solid #333' }} />
                    <span style={{ fontSize: '12px', color: '#00FF00' }}>[IMG_READY]</span>
                  </div>
                )}
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '10px', color: '#666', display: 'block', marginBottom: 8, fontFamily: 'var(--font-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>&gt; DISPLAY_NAME:</label>
                <input 
                  placeholder="SYS_ALIAS" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)}
                  style={{ width: '100%', background: '#000', border: '1px solid #333', color: '#00FF00', padding: '8px', fontFamily: 'var(--font-mono), monospace', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} 
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '10px', color: '#666', display: 'block', marginBottom: 8, fontFamily: 'var(--font-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>&gt; BIO_THESIS:</label>
                <textarea 
                  placeholder="> Describe your trading thesis..." 
                  value={editBio} 
                  onChange={e => setEditBio(e.target.value)}
                  style={{ width: '100%', height: 120, background: '#000', border: '1px solid #333', color: '#00FF00', padding: '8px', fontFamily: 'var(--font-mono), monospace', fontSize: '12px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} 
                />
              </div>
              <button 
                onClick={handleSaveProfile} 
                disabled={saving}
                style={{ background: '#000', color: '#00FF00', border: '1px solid #00FF00', padding: '8px 24px', fontWeight: 700, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', fontSize: '12px', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? '[SAVING...]' : '[COMMIT_CHANGES]'}
              </button>
            </div>
          )}

          {/* Stat Pills */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem', flexWrap: 'wrap' }}>
            <StatPill label="BOTS_DEPLOYED" value={String(bots.length)} color="#00C9C0" />
            <StatPill label="AVG_BRIER" value={avgBrier > 0 ? avgBrier.toFixed(3) : '---'} color={avgBrier < 0.25 ? '#00FF00' : '#ef4444'} />
            <StatPill label="TOTAL_CAPITAL" value={`$${totalTVL.toLocaleString()}`} color="#EFEFEF" />
            <StatPill label="CAPITAL_ON_VAULTS" value={`$0`} color="#666" />
            <StatPill label="CAPITAL_ON_DEPLOYED_BOTS" value={`$${totalTVL.toLocaleString()}`} color="#C9A84C" />
          </div>
        </div>
      </div>

      {/* ═══════════ CONTENT BODY ═══════════ */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '3rem 1.5rem' }}>

        {/* FLEET SECTION */}
        <div style={{ marginBottom: '4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '1rem', marginBottom: '2rem' }}>
            <div style={{ color: '#2563EB', fontSize: '14px', fontWeight: 700, letterSpacing: '1px' }}>
              &gt; ALGORITHMS_CREATED.EXE <span style={{ color: '#888', fontWeight: 400 }}>[{bots.length} ACTIVE_NODES]</span>
            </div>
          </div>
          
          {bots.length === 0 ? (
            <div style={{ border: '1px dashed #333', padding: '4rem', textAlign: 'center', background: '#030303' }}>
              <div style={{ color: '#888', fontSize: '12px', marginBottom: '1.5rem', fontFamily: 'var(--font-mono), monospace' }}>
                &gt; NO_ALGORITHMS_DETECTED
              </div>
              {isOwner && (
                <Link href="/list-bot" style={{ background: '#000', border: '1px solid #2563EB', color: '#2563EB', textDecoration: 'none', padding: '8px 24px', fontSize: '12px', fontWeight: 700, display: 'inline-block' }}>
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
                    style={{ 
                      textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column',
                      background: '#030303', border: '1px solid #333',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.borderColor = '#00FF00'
                      e.currentTarget.style.background = '#050505'
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.borderColor = '#333'
                      e.currentTarget.style.background = '#030303'
                    }}
                  >
                    <div style={{ color: '#2563EB', padding: '0.75rem 1rem', borderBottom: '1px dashed #333', fontSize: '12px', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                      <span>+-- [ {b.name.toUpperCase()} ] --+</span>
                      <span style={{ color: isLive ? '#00FF00' : '#00C9C0' }}>[{isLive ? 'LIVE' : 'PAPER'}]</span>
                    </div>

                    <div style={{ width: '100%', background: '#000', display: 'flex', justifyContent: 'center', padding: '1.5rem 0', borderBottom: '1px dashed #333' }}>
                      <BotCharacter mood={b.mood as any} size={70} />
                    </div>

                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#666' }}>&gt; MAKER:</span>
                        <span style={{ color: '#C9A84C' }}>{(b.builder || b.walletAddress || 'anon').substring(0, 8)}...</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#666' }}>&gt; BRIER_SCORE:</span>
                        <span style={{ color: brier <= 0.25 ? '#00FF00' : '#ef4444', fontWeight: 700 }}>{brier.toFixed(3)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#666' }}>&gt; WIN_RATE:</span>
                        <span style={{ color: '#EFEFEF' }}>{(wr * 100).toFixed(1)}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#666' }}>&gt; MTH_YIELD:</span>
                        <span style={{ color: yld > 0 ? '#00FF00' : '#888' }}>{yld > 0 ? '+' : ''}{yld}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #333', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                        <span style={{ color: '#666' }}>&gt; VAULT_TVL:</span>
                        <span style={{ color: '#fff', fontWeight: 700 }}>${tvl.toLocaleString()}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* VAULT DEPOSITS SECTION */}
        <div style={{ marginBottom: '4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '1rem', marginBottom: '2rem' }}>
            <div style={{ color: '#2563EB', fontSize: '14px', fontWeight: 700, letterSpacing: '1px' }}>
              &gt; VAULT_DEPOSITS.EXE
            </div>
          </div>
          <div style={{ border: '1px dashed #333', background: '#030303', padding: '4rem', textAlign: 'center' }}>
            <div style={{ color: '#888', fontSize: '12px' }}>&gt; NO_INVESTMENT_LOGS_FOUND</div>
          </div>
        </div>

      </div>
    </div>
  )
}
