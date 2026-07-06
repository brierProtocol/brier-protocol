'use client'

import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toPng } from 'html-to-image'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import { botEye } from '@/lib/botIdentity'

const TEAL = '#c8ff00'
const VIOLET = '#8b7bff'

export default function ShareBotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [bot, setBot] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [bg, setBg] = useState<{ url: string; kind: 'image' | 'video' } | null>(null)
  const [dl, setDl] = useState<'idle' | 'working' | 'error'>('idle')
  const [copied, setCopied] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/bots/${slug}?t=${Date.now()}`).then(r => r.ok ? r.json() : null).then(d => {
      if (!d) { setLoading(false); return }
      const s = d.scores?.length ? d.scores[d.scores.length - 1] : null
      setBot({
        id: d.id, slug: d.slug, name: d.name, tagline: d.tagline, pfpUrl: d.pfpUrl, color: d.color, eyeShape: d.eyeShape,
        lcb: s?.lcb ?? 0, brierScore: s?.brierScore ?? null, winRate: s?.winRate ?? 0, totalTrades: s?.totalTrades ?? 0,
        sharePrice: d.liveNav?.sharePrice ?? 1,
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [slug])

  // clean up object URLs
  useEffect(() => () => { if (bg?.url) URL.revokeObjectURL(bg.url) }, [bg])

  if (loading) return <div className="min-h-screen bg-[#030303] grid place-items-center text-[#666] font-sans text-sm">Loading…</div>
  if (!bot) return <div className="min-h-screen bg-[#030303] grid place-items-center text-[#666] font-sans text-sm">Bot not found.</div>

  const eye = botEye({ slug, id: bot.id, name: bot.name, color: bot.color, eyeShape: bot.eyeShape })
  const lcb = bot.lcb ?? 0
  const proven = lcb > 0
  const winRate = bot.winRate ?? 0
  const resolved = bot.totalTrades ?? 0
  const roi = bot.sharePrice && bot.sharePrice !== 1 ? (bot.sharePrice - 1) * 100 : null
  const heroColor = proven ? TEAL : VIOLET

  const url = typeof window !== 'undefined' ? `${window.location.origin}/bot/${slug}` : `https://brier.world/bot/${slug}`
  const line = proven
    ? `${bot.name} is beating the market on @BrierProtocol — reputation +${lcb.toFixed(3)}, ${(winRate * 100).toFixed(0)}% hit rate over ${resolved} settled calls.`
    : `${bot.name} is proving its edge in the open on @BrierProtocol — ${resolved} calls settled and scored against the market, live.`
  const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(line)}&url=${encodeURIComponent(url)}`

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    if (bg?.url) URL.revokeObjectURL(bg.url)
    setBg({ url: URL.createObjectURL(f), kind: f.type.startsWith('video') ? 'video' : 'image' })
  }
  const download = async () => {
    if (!cardRef.current) return
    setDl('working')
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#070709' })
      const a = document.createElement('a'); a.href = dataUrl; a.download = `${slug}-brier.png`; a.click()
      setDl('idle')
    } catch { setDl('error'); setTimeout(() => setDl('idle'), 2500) }
  }
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch {} }

  const stats = [
    { k: 'Brier', v: bot.brierScore != null ? bot.brierScore.toFixed(3) : '—' },
    { k: 'Hit rate', v: winRate ? `${(winRate * 100).toFixed(0)}%` : '—' },
    { k: 'Resolved', v: resolved ? resolved.toLocaleString() : '—' },
    { k: 'ROI', v: roi != null ? `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%` : '—' },
  ]

  return (
    <div className="min-h-screen bg-[#030303] font-sans text-[#e8e8e8] grid place-items-center px-4 py-10 relative overflow-hidden">
      {/* ambient */}
      <motion.div className="absolute inset-0 pointer-events-none opacity-60"
        style={{ background: `radial-gradient(circle at 30% 20%, ${heroColor}12, transparent 40%), radial-gradient(circle at 75% 80%, ${VIOLET}10, transparent 42%)`, backgroundSize: '160% 160%' }}
        animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }} />

      <div className="relative w-full max-w-[460px]">
        <div className="flex items-center justify-between mb-5">
          <Link href={`/bot/${slug}`} className="text-[#777] hover:text-white transition-colors no-underline text-[13px]">← Back to {bot.name}</Link>
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#48484f]">Share card</span>
        </div>

        {/* the flex card */}
        <motion.div initial={{ scale: 0.94, opacity: 0, y: 14 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}>
          <motion.div ref={cardRef} className="rounded-[26px] p-[1.5px]"
            style={{ background: 'linear-gradient(115deg,#2a2a30,#8a8a9a,#2a2a30,#c8ff0055,#2a2a30,#7a7a8a,#2a2a30)', backgroundSize: '300% 100%' }}
            animate={{ backgroundPosition: ['0% 0%', '300% 0%'] }} transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}>
            <div className="relative rounded-[25px] overflow-hidden bg-[#070709] aspect-[1.85/1]">
              {bg ? (
                bg.kind === 'video'
                  ? <video src={bg.url} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                  : <img src={bg.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <motion.div className="absolute inset-0"
                  style={{ background: `radial-gradient(circle at 25% 20%, ${heroColor}26, transparent 45%), radial-gradient(circle at 80% 90%, ${VIOLET}22, transparent 45%)`, backgroundSize: '180% 180%' }}
                  animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
              )}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(4,4,7,0.5) 0%, rgba(4,4,7,0.32) 42%, rgba(4,4,7,0.9) 100%)' }} />

              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-sans font-black text-[16px] tracking-[-0.03em] text-white drop-shadow">Brier<span style={{ color: TEAL }}>.</span></span>
                  <span className="font-mono text-[9px] font-bold px-2 py-1 rounded tracking-[0.16em] uppercase backdrop-blur-sm"
                    style={{ color: heroColor, background: `${heroColor}22`, border: `1px solid ${heroColor}44` }}>{proven ? 'Brier Verified' : 'Shadow phase'}</span>
                </div>
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="rounded-2xl overflow-hidden border border-[#ffffff22] shrink-0 backdrop-blur-sm">
                    {bot.pfpUrl ? <img src={bot.pfpUrl} alt={bot.name} className="w-14 h-14 object-cover" /> : <BotIrisAvatar {...eye} size={56} />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-sans font-black text-[23px] leading-none tracking-[-0.03em] text-white truncate drop-shadow">{bot.name}</div>
                    {bot.tagline && <div className="text-[#d0d0d8] text-[11px] italic mt-1 truncate drop-shadow">{bot.tagline}</div>}
                  </div>
                </div>
                <div className="mb-4">
                  <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#c8c8d0] mb-0.5 drop-shadow">Reputation · beats the market</div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-sans font-black text-[42px] leading-none tabular-nums tracking-[-0.04em] drop-shadow-lg" style={{ color: heroColor }}>{proven ? `+${lcb.toFixed(3)}` : (resolved > 0 ? lcb.toFixed(3) : '—')}</span>
                    <span className="font-mono text-[11px] text-[#c8c8d0]">LCB</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-px bg-[#ffffff14] rounded-xl overflow-hidden border border-[#ffffff14] backdrop-blur-sm">
                  {stats.map(s => (
                    <div key={s.k} className="bg-[#0a0a0ecc] px-2 py-2.5 text-center">
                      <div className="font-mono text-[8px] text-[#9a9aa4] tracking-[0.1em] uppercase mb-1">{s.k}</div>
                      <div className="font-sans font-bold text-[14px] tabular-nums text-white">{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* background uploader — a real file, not a link */}
        <div className="mt-4 flex items-center gap-2.5">
          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={onFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="flex-1 rounded-xl border border-[#242430] bg-[#0c0c12] text-[#ccc] font-semibold text-[13px] py-3 hover:border-[#c8ff00]/40 hover:text-white transition-all inline-flex items-center justify-center gap-2">
            <span>🎬</span> {bg ? 'Change background' : 'Upload image or video'}
          </button>
          {bg && <button onClick={() => { if (bg.url) URL.revokeObjectURL(bg.url); setBg(null) }} className="rounded-xl border border-[#242430] bg-[#0c0c12] text-[#888] text-[13px] px-4 hover:text-white transition-colors">Clear</button>}
        </div>

        {/* actions */}
        <div className="flex items-center gap-2.5 mt-2.5">
          <button onClick={download} disabled={dl === 'working'} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#c8ff00] text-black font-bold text-[13px] py-3 hover:bg-[#d8ff40] transition-colors disabled:opacity-60">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" /></svg>
            {dl === 'working' ? 'Rendering…' : dl === 'error' ? 'Try again' : 'Download PNG'}
          </button>
          <a href={intent} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-white text-black font-bold text-[13px] px-4 py-3 hover:bg-[#e8e8e8] transition-colors no-underline">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            Post
          </a>
          <button onClick={copy} className="rounded-xl border border-[#242430] bg-[#0c0c12] text-[#bbb] font-semibold text-[13px] px-4 py-3 hover:text-white transition-all">{copied ? '✓' : 'Copy'}</button>
        </div>
        <div className="font-mono text-[10px] text-[#48484f] mt-3 text-center leading-relaxed">
          Upload your own image or video, then download the card and attach it to your post. Image backgrounds bake into the PNG; video plays here for screen-capture. The auto link-preview needs the live brier.world domain.
        </div>
      </div>
    </div>
  )
}
