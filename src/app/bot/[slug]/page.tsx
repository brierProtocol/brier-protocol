'use client'

import { use, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { getBotById } from '@/data/bots'
import { notFound } from 'next/navigation'
import { getBotTradeHistory } from '@/lib/polymarket-indexer'
import BotCharacter from '@/components/BotCharacter'
import { useAccount } from 'wagmi'

// ── User Identicon (5x5 Blockie) ──
function UserIdenticon({ id, size = 32 }: { id: string, size?: number }) {
  const hash = id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0)
  const hue = Math.abs(hash % 360)
  const c1 = `hsl(${hue}, 70%, 50%)`
  const c2 = `hsl(${hue}, 70%, 20%)`
  const bg = '#0a0a0a'
  
  // 5x5 grid, horizontally symmetrical
  const grid = Array(5).fill(0).map((_, i) => 
    Array(5).fill(0).map((_, j) => {
      const mirrorJ = j > 2 ? 4 - j : j
      const bit = (Math.abs(hash) >> (i * 3 + mirrorJ)) % 3
      return bit === 0 ? bg : bit === 1 ? c1 : c2
    })
  )

  return (
    <div style={{ width: size, height: size, border: `1px solid ${c1}`, display: 'inline-block', padding: 2, background: bg }}>
      <svg width="100%" height="100%" viewBox="0 0 5 5" shapeRendering="crispEdges">
        {grid.map((row, i) => row.map((color, j) => (
          <rect key={`${i}-${j}`} x={j} y={i} width="1" height="1" fill={color} />
        )))}
      </svg>
    </div>
  )
}

// ── PnL Chart (canvas) ──
function PnlChart({ data }: { data: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width, h = canvas.height
    ctx.clearRect(0, 0, w, h)
    
    // Grid background like a terminal
    ctx.fillStyle = '#080808'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 1
    for (let i = 0; i < w; i += 20) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
    for (let i = 0; i < h; i += 20) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }

    const min = Math.min(...data), max = Math.max(...data)
    const range = max - min || 1
    
    // Line
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = 2
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * (h - 10) - 5
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
  }, [data])
  return (
    <div style={{ border: '1px solid #333', background: '#080808', padding: 2, display: 'inline-block', marginBottom: '0.5rem' }}>
      <canvas ref={ref} width={400} height={150} style={{ display: 'block', maxWidth: '100%', height: 'auto' }} />
      <div style={{ fontSize: 9, color: '#555', textAlign: 'center', marginTop: 2, fontFamily: 'var(--font-mono)' }}>chart_pnl_90d.png (42 KB, 400x150)</div>
    </div>
  )
}

// ── Comment Thread ──
interface Post {
  id: string; wallet: string; text: string; createdAt: string;
}

export default function BotProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  
  const [bot, setBot] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [posts, setPosts] = useState<Post[]>([])
  const [postText, setPostText] = useState('')
  const [depositAmt, setDepositAmt] = useState('')
  const [tradeHistory, setTradeHistory] = useState<any[]>([])
  
  const { address, isConnected } = useAccount()

  useEffect(() => {
    // 1. Fetch real bot data
    const fetchBotData = async () => {
      // First try local mock data (for the cool legacy UI ones)
      const mockBot = getBotById(slug)
      if (mockBot) {
        setBot(mockBot)
        setLoading(false)
        return mockBot
      }

      // Then try Database
      const res = await fetch(`/api/bots/${slug}`)
      if (res.ok) {
        const dbBot = await res.json()
        
        // Map Prisma DB Bot to frontend interface
        setBot({
          id: dbBot.id,
          name: dbBot.name,
          builder: dbBot.walletAddress,
          description: dbBot.description || dbBot.tagline,
          mood: dbBot.mood || 'neutral',
          status: dbBot.status || 'live',
          brierScore: dbBot.scores?.[0]?.brierScore || 0,
          winRate: dbBot.scores?.[0]?.winRate || 0,
          monthlyYield: 0,
          sharpe: dbBot.scores?.[0]?.sharpe || 0,
          maxDrawdown: dbBot.scores?.[0]?.maxDrawdown || 0,
          tvl: dbBot.currentTVL || 0,
          markets: ['crypto'],
          pnlHistory: [100, 105, 110, 108, 115, 120, 125, 130] // Mock chart for DB bots for now
        })
      }
      setLoading(false)
      return null
    }

    fetchBotData().then(activeBot => {
      if (!activeBot) return;
      
      // Fetch live trade data
      getBotTradeHistory(activeBot.builder).then(data => {
        setTradeHistory(data)
      })
      
      // Fetch real comments from DB
      fetch(`/api/comments?botId=${activeBot.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setPosts(data)
        })
    })
  }, [slug])

  const addPost = async () => {
    if (!postText.trim()) return
    
    let activeAddress = (isConnected && address) ? address : null
    if (!activeAddress && typeof window !== 'undefined' && (window as any).ethereum?.selectedAddress) {
      activeAddress = (window as any).ethereum.selectedAddress
    }
    const userWallet = activeAddress || 'anon_' + Math.random().toString(36).substring(2, 6)
    
    // Save to real database
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId: bot.id, wallet: userWallet, text: postText.trim() })
    })
    
    if (res.ok) {
      const newComment = await res.json()
      setPosts([...posts, newComment])
      setPostText('')
    } else {
      alert("Failed to post comment to database")
    }
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#050505', color: '#555', padding: '2rem', fontFamily: 'monospace' }}>&gt; Loading Database...</div>
  }

  if (!bot) return notFound()

  const amt = parseFloat(depositAmt) || 0
  const rate = bot.monthlyYield / 100
  const estMonthly = amt * rate

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-mono), monospace', color: '#c5c8c6', padding: '2rem 1rem' }}>
      
      {/* HEADER BAR */}
      <div style={{ maxWidth: 1200, margin: '0 auto', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a1a', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', fontSize: 16, fontWeight: 'bold' }}>
          <Link href="/discover" style={{ color: '#2563EB', textDecoration: 'none' }}>[Return]</Link>
          <span style={{ color: '#C9A84C' }}>/brier/ - Institutional Bot Catalog</span>
        </div>
        <div style={{ fontSize: 12, color: '#555' }}>
          [<Link href="/dashboard" style={{ color: '#2563EB', textDecoration: 'none' }}>Dashboard</Link>] 
          [<Link href="/list-bot" style={{ color: '#2563EB', textDecoration: 'none' }}>Submit Algorithm</Link>]
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* OP POST (The Bot Listing) */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
          
          {/* Thumbnail */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 2 }}>File: bot_core.png (12 KB, 150x150)</div>
            <BotCharacter mood={bot.mood as any} size={150} />
          </div>

          {/* OP Content */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, marginBottom: '0.5rem' }}>
              <span style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 14 }}>{bot.name}</span>{' '}
              <span style={{ color: '#C9A84C', fontWeight: 'bold' }}>[RANK: Bot Architect]</span>{' '}
              <span style={{ color: '#117743' }}>(ID: <Link href={`/maker/${bot.builder}`} style={{ color: 'inherit', textDecoration: 'underline' }}>{bot.builder}</Link>)</span>{' '}
              <span style={{ color: '#555' }}>11/19/25(Sun)08:29:35</span>{' '}
              <span style={{ color: '#555' }}>No.19100939</span>
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.5, color: '#c5c8c6', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
              <span style={{ color: '#cc0000', fontWeight: 'bold', fontSize: 15 }}>You guys need to start vaultmaxxing/yieldmaxxing</span>
              <br/><br/>
              <span style={{ color: '#7ec87e' }}>&gt;deploy capital into algorithm</span><br/>
              <span style={{ color: '#7ec87e' }}>&gt;zero human emotion</span><br/>
              <span style={{ color: '#7ec87e' }}>&gt;tracked entirely on-chain</span><br/>
              <span style={{ color: '#7ec87e' }}>&gt;profit</span><br/>
              <br/>
              {bot.description}
            </div>

            {/* Terminal Stats Box */}
            <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '0.5rem', display: 'inline-block', marginBottom: '1rem', minWidth: 400 }}>
              <div style={{ color: '#2563EB', borderBottom: '1px solid #1a1a1a', paddingBottom: 4, marginBottom: 4, fontWeight: 'bold' }}>--- SYSTEM DIAGNOSTICS ---</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: 12 }}>
                <div><span style={{ color: '#555' }}>BRIER_SCORE:</span> <span style={{ color: bot.brierScore < 0.25 ? '#22c55e' : '#2563EB' }}>{bot.brierScore.toFixed(3)}</span></div>
                <div><span style={{ color: '#555' }}>WIN_RATE:</span> <span style={{ color: '#22c55e' }}>{(bot.winRate * 100).toFixed(1)}%</span></div>
                <div><span style={{ color: '#555' }}>MONTHLY_YIELD:</span> <span style={{ color: '#22c55e' }}>+{bot.monthlyYield.toFixed(1)}%</span></div>
                <div><span style={{ color: '#555' }}>SHARPE_RATIO:</span> <span>{(bot.sharpe || 0).toFixed(2)}</span></div>
                <div><span style={{ color: '#555' }}>MAX_DRAWDOWN:</span> <span style={{ color: '#ef4444' }}>-{(bot.maxDrawdown * 100).toFixed(1)}%</span></div>
                <div><span style={{ color: '#555' }}>VAULT_TVL:</span> <span>${bot.tvl.toLocaleString()}</span></div>
                <div><span style={{ color: '#555' }}>MARKETS:</span> <span>{bot.markets.join(', ')}</span></div>
                <div><span style={{ color: '#555' }}>STATUS:</span> <span style={{ color: bot.status === 'live' ? '#22c55e' : '#2563EB' }}>{bot.status.toUpperCase()}</span></div>
              </div>
            </div>

            <br />
            <PnlChart data={bot.pnlHistory} />

            {/* Proof of Work: Live Indexed Trades */}
            <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '0.5rem', marginTop: '1rem' }}>
              <div style={{ color: '#C9A84C', fontWeight: 'bold', borderBottom: '1px solid #1a1a1a', paddingBottom: 4, marginBottom: 4, fontSize: 13 }}>&gt;&gt; ON-CHAIN PROOF OF WORK (LAST 30 DAYS)</div>
              {tradeHistory.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ color: '#555', borderBottom: '1px solid #1a1a1a' }}>
                      <th style={{ padding: '4px' }}>DATE</th>
                      <th style={{ padding: '4px' }}>MARKET</th>
                      <th style={{ padding: '4px' }}>PREDICTION</th>
                      <th style={{ padding: '4px' }}>CONFIDENCE</th>
                      <th style={{ padding: '4px', textAlign: 'right' }}>OUTCOME</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradeHistory.map((trade, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                        <td style={{ padding: '4px', color: '#888' }}>{trade.date}</td>
                        <td style={{ padding: '4px', color: '#c5c8c6' }}>{trade.market}</td>
                        <td style={{ padding: '4px', color: '#2563EB', fontWeight: 'bold' }}>{trade.predicted}</td>
                        <td style={{ padding: '4px', color: '#555' }}>{(trade.probability * 100).toFixed(0)}%</td>
                        <td style={{ padding: '4px', textAlign: 'right', color: trade.actualOutcome === 1 && trade.predicted === 'YES' ? '#22c55e' : '#ef4444' }}>
                          {trade.actualOutcome === 1 ? 'RESOLVED YES' : 'RESOLVED NO'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: '#555', fontSize: 11, padding: '0.5rem' }}>&gt; Syncing indexer...</div>
              )}
            </div>

            {/* Deposit Form UI in OP post */}
            <div style={{ background: '#0d0d0d', border: '1px dashed #333', padding: '0.75rem', marginTop: '1rem', maxWidth: 400 }}>
              <div style={{ color: '#C9A84C', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: 13 }}>[ EXECUTE VAULT DEPOSIT ]</div>
              
              {!isConnected ? (
                <div style={{ fontSize: 11, color: '#ef4444' }}>&gt; ERR: Wallet not connected. Please connect via Navbar to deploy capital.</div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="number" 
                      value={depositAmt}
                      onChange={e => setDepositAmt(e.target.value)}
                      placeholder="USDC Amount..." 
                      style={{ flex: 1, background: '#000', border: '1px solid #333', color: '#fff', fontFamily: 'inherit', padding: '4px 8px', outline: 'none' }} 
                    />
                    <button 
                      onClick={() => {
                        if (amt <= 0) return;
                        alert("Blockchain transaction initiated: Approving USDC -> Depositing to Vault...");
                      }}
                      style={{ background: '#2563EB', border: 'none', color: '#000', fontWeight: 'bold', padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      DEPOSIT
                    </button>
                  </div>
                  {amt > 0 && (
                    <div style={{ fontSize: 11, color: '#22c55e', marginTop: '0.5rem' }}>
                      &gt; Projected yield: +${estMonthly.toFixed(2)}/mo
                      <br/>
                      <span style={{ color: '#555' }}>&gt; Web3 Txns Required: 1x Approve(USDC), 1x Deposit(Vault)</span>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        </div>

        {/* REPLIES SECTION */}
        <div style={{ marginTop: '2rem' }}>
          {posts.map(post => (
            <div key={post.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', background: post.wallet === bot.builder ? 'rgba(37,99,235,0.03)' : 'transparent', padding: '0.25rem' }}>
              <UserIdenticon id={post.wallet} size={40} />
              <div style={{ display: 'inline-block', background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '0.5rem 0.75rem', minWidth: 300, maxWidth: 800 }}>
                <div style={{ fontSize: 13, marginBottom: '0.25rem' }}>
                  <span style={{ color: '#2563EB', fontWeight: 'bold' }}>[RANK: Verified User]</span>{' '}
                  <Link href={`/maker/${post.wallet}`} style={{ color: '#117743', textDecoration: 'underline', cursor: 'pointer' }}>(ID: {post.wallet.substring(0, 8)}...)</Link>{' '}
                  <span style={{ color: '#555' }}>{new Date(post.createdAt).toLocaleString()}</span>{' '}
                  <span style={{ color: '#555' }}>No.{post.id.substring(post.id.length - 6)}</span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.4, color: '#c5c8c6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {post.text.split('\n').map((line, j) => (
                    <span key={j}>
                      {line.startsWith('>') ? (
                        <span style={{ color: '#7ec87e' }}>{line}</span>
                      ) : line}
                      {j < post.text.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <hr style={{ borderTop: '1px solid #1a1a1a', margin: '2rem 0 1rem' }} />

        {/* REPLY BOX */}
        <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1rem', display: 'inline-block' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: 80 }}>
                <div style={{ background: '#1a1a1a', padding: '4px', border: '1px solid #333', fontSize: 12, color: '#2563EB', fontWeight: 'bold', textAlign: 'center' }}>Comment</div>
                {isConnected && (
                  <div style={{ fontSize: 10, color: '#555', textAlign: 'center', cursor: 'pointer', textDecoration: 'underline' }}>[Edit PFP]</div>
                )}
              </div>
              <textarea 
                value={postText}
                onChange={e => setPostText(e.target.value)}
                style={{ width: 400, height: 80, background: '#000', border: '1px solid #333', color: '#fff', fontFamily: 'inherit', padding: '4px', resize: 'vertical', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={addPost} style={{ background: '#2563EB', border: '1px solid #2563EB', color: '#000', fontWeight: 'bold', padding: '4px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>Post</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
