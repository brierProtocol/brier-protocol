'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAccount } from 'wagmi'

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  if (n >= 1) return `$${n.toFixed(2)}`
  if (n >= 0.0001) return `$${n.toFixed(5)}`
  return `$${n.toExponential(2)}`
}

// ── Price chart (canvas) ──
function PriceChart({ data, accent }: { data: number[]; accent: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const w = c.width, h = c.height
    ctx.clearRect(0, 0, w, h)
    if (data.length < 2) return
    const min = Math.min(...data), max = Math.max(...data), range = (max - min) || 1
    const x = (i: number) => (i / (data.length - 1)) * w
    const y = (v: number) => h - ((v - min) / range) * (h - 16) - 8
    // fill
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, accent + '44'); g.addColorStop(1, accent + '00')
    ctx.beginPath(); ctx.moveTo(0, h)
    data.forEach((v, i) => ctx.lineTo(x(i), y(v)))
    ctx.lineTo(w, h); ctx.fillStyle = g; ctx.fill()
    // line
    ctx.beginPath()
    data.forEach((v, i) => i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v)))
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.stroke()
  }, [data, accent])
  return <canvas ref={ref} width={520} height={140} className="w-full h-[140px] block" />
}

export default function TokenPanel({ slug, isOwner, botColor = '#ff2a4d' }: { slug: string; isOwner: boolean; botColor?: string }) {
  const { address, isConnected } = useAccount()
  const [tok, setTok] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [ticker, setTicker] = useState('')

  const accent = '#c8ff00'

  const load = useCallback(async () => {
    const res = await fetch(`/api/tokens/${slug}`)
    if (res.ok) setTok(await res.json())
    else setTok(null)
    setLoading(false)
  }, [slug])

  useEffect(() => { load() }, [load])

  const launch = async () => {
    setBusy(true); setMsg('')
    const res = await fetch('/api/tokens', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, ticker: ticker || undefined }),
    })
    if (res.ok) { await load(); setMsg('Token launched ✓') } else setMsg((await res.json()).error || 'Failed')
    setBusy(false)
  }

  const trade = async () => {
    if (!amount || Number(amount) <= 0) return
    const wallet = address || `demo_${Math.random().toString(36).slice(2, 8)}`
    setBusy(true); setMsg('')
    const res = await fetch(`/api/tokens/${slug}/trade`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, side, amount: Number(amount) }),
    })
    const d = await res.json()
    if (res.ok) {
      const fmtTok = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toFixed(0)
      setMsg(d.graduated ? 'GRADUATED → vault unlocked!' : `${side} ✓  ${side === 'BUY' ? fmtTok(d.shares) + ' tokens' : fmtUsd(d.usdc)}`)
      setAmount(''); await load()
    } else setMsg(d.error || 'Trade failed')
    setBusy(false)
  }

  if (loading) return <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 font-mono text-xs text-[#555]">&gt; loading token…</div>

  // ── No token yet ──
  if (!tok) {
    return (
      <div className="bg-[#0a0a0a] border border-dashed border-[#1a1a1a] p-5">
        <div className="font-mono text-[12px] font-bold text-white tracking-widest mb-1">CONVICTION_TOKEN</div>
        <div className="text-[11px] text-[#888] font-sans mb-4">
          Tokenize this bot. Backers speculate on its edge during shadow; the token graduates into the vault at Tier-1.
        </div>
        {isOwner ? (
          <div className="flex gap-2">
            <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
              placeholder="TICKER" className="w-28 bg-[#030303] border border-[#1a1a1a] text-white font-mono text-xs px-3 py-2 outline-none focus:border-[#333] uppercase" />
            <button onClick={launch} disabled={busy}
              className="font-mono text-xs font-bold px-4 py-2 bg-[#c8ff00] text-[#030303] disabled:opacity-50 hover:shadow-[0_0_15px_rgba(200,255,0,0.4)] transition-all">
              {busy ? 'LAUNCHING…' : 'LAUNCH_TOKEN'}
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-[#555] font-mono">&gt; No token yet — only the bot owner can launch it.</div>
        )}
        {msg && <div className="text-[10px] font-mono text-[#c8ff00] mt-2">{msg}</div>}
      </div>
    )
  }

  // ── Token exists ──
  const prices = (tok.history || []).map((h: any) => h.price)
  const pct = prices.length > 1 ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100 : 0
  const graduated = tok.status === 'GRADUATED'

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#c8ff00]/40" />
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-white">${tok.ticker}</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5" style={{ color: graduated ? '#FFD700' : '#c8ff00', background: (graduated ? '#FFD700' : '#c8ff00') + '14', border: `0.5px solid ${(graduated ? '#FFD700' : '#c8ff00')}44` }}>
            {graduated ? 'GRADUATED' : 'BONDING'}
          </span>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm font-bold text-white">{fmtUsd(tok.price)}</div>
          <div className={`font-mono text-[10px] ${pct >= 0 ? 'text-[#c8ff00]' : 'text-[#ff3b3b]'}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%</div>
        </div>
      </div>

      {/* Chart */}
      <PriceChart data={prices} accent={accent} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px bg-[#1a1a1a] border-y border-[#1a1a1a]">
        {[['MCAP', fmtUsd(tok.marketCap)], ['HOLDERS', String(tok.holders)], ['CURVE_SOLD', `${((tok.supply / (tok.totalSupply || 1_000_000_000)) * 100).toFixed(1)}%`]].map(([l, v]) => (
          <div key={l} className="bg-[#0a0a0a] p-2.5">
            <div className="text-[8px] font-mono text-[#555] tracking-widest">{l}</div>
            <div className="text-xs font-mono font-bold text-white">{v}</div>
          </div>
        ))}
      </div>

      {/* Bonding progress */}
      <div className="px-4 py-3 border-b border-[#1a1a1a]">
        <div className="flex justify-between text-[9px] font-mono text-[#666] tracking-widest mb-1">
          <span>BONDING_PROGRESS</span>
          <span>{(tok.progress * 100).toFixed(1)}% → graduation</span>
        </div>
        <div className="w-full h-2 bg-[#030303] border border-[#1a1a1a] overflow-hidden">
          <div className="h-full transition-all" style={{ width: `${tok.progress * 100}%`, background: graduated ? '#FFD700' : '#c8ff00' }} />
        </div>
        <div className="text-[9px] font-mono text-[#444] mt-1">{fmtUsd(tok.marketCap)} / {fmtUsd(tok.graduationMcap)} → opens the vault</div>
      </div>

      {/* Trade */}
      {!graduated ? (
        <div className="p-4">
          <div className="flex gap-2 mb-2">
            <button onClick={() => setSide('BUY')} className={`flex-1 py-2 font-mono text-xs font-bold border transition-all ${side === 'BUY' ? 'bg-[#c8ff00]/10 text-[#c8ff00] border-[#c8ff00]/40' : 'bg-transparent text-[#444] border-[#1a1a1a] hover:text-white'}`}>BUY</button>
            <button onClick={() => setSide('SELL')} className={`flex-1 py-2 font-mono text-xs font-bold border transition-all ${side === 'SELL' ? 'bg-[#ff3b3b]/10 text-[#ff3b3b] border-[#ff3b3b]/40' : 'bg-transparent text-[#444] border-[#1a1a1a] hover:text-white'}`}>SELL</button>
          </div>
          <div className="flex gap-2">
            <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder={side === 'BUY' ? 'USDC amount' : 'tokens'}
              className="flex-1 bg-[#030303] border border-[#1a1a1a] text-white font-mono text-xs px-3 py-2 outline-none focus:border-[#333] placeholder:text-[#333]" />
            <button onClick={trade} disabled={busy || !amount}
              className="font-mono text-xs font-bold px-5 py-2 disabled:opacity-40 transition-all"
              style={{ background: side === 'BUY' ? '#c8ff00' : '#ff3b3b', color: '#030303' }}>
              {busy ? '…' : side}
            </button>
          </div>
          <div className="text-[9px] font-mono text-[#444] mt-2">1% fee · 50% to bot owner · 50% to protocol · {isConnected ? 'wallet connected' : 'demo mode'}</div>
          {msg && <div className="text-[10px] font-mono mt-2" style={{ color: msg.includes('✓') || msg.includes('GRAD') ? '#c8ff00' : '#ff3b3b' }}>{msg}</div>}
        </div>
      ) : (
        <div className="p-4 text-center">
          <div className="text-[#FFD700] font-mono text-xs font-bold mb-1">GRADUATED</div>
          <div className="text-[10px] text-[#888] font-mono">Bonding complete — capital seeded the vault. Trade the token on the open market.</div>
        </div>
      )}
    </div>
  )
}
