'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'

// A "flex card" in the pump.fun / Axiom spirit: a premium, chromed, alive card a
// builder screenshots or one-taps to X. The owner can drop ANY image or video URL
// behind it to make it theirs. Every stat on it is real — when the bot hasn't
// proven itself the card says "Shadow phase" instead of faking a green number.

const TEAL = '#c8ff00'
const VIOLET = '#8b7bff'

type Props = {
  bot: any
  slug: string
  lcb: number
  brierSkill: number
  winRate: number
  tradesCount: number
  roi: number | null
  eye: any
  onClose: () => void
}

const isVideo = (u: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u) || /video/i.test(u)

export default function BotShareCard({ bot, slug, lcb, brierSkill, winRate, tradesCount, roi, eye, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [bgUrl, setBgUrl] = useState('')
  const [showBgInput, setShowBgInput] = useState(false)
  const proven = lcb > 0
  const lsKey = `brier:flexbg:${slug}`

  useEffect(() => {
    try { const s = localStorage.getItem(lsKey); if (s) setBgUrl(s) } catch {}
  }, [lsKey])

  const saveBg = (v: string) => {
    setBgUrl(v)
    try { v ? localStorage.setItem(lsKey, v) : localStorage.removeItem(lsKey) } catch {}
  }

  const url = typeof window !== 'undefined' ? `${window.location.origin}/bot/${slug}` : `https://brier.world/bot/${slug}`
  const line = proven
    ? `${bot.name} is beating the market on @BrierProtocol — reputation +${lcb.toFixed(3)}, ${(winRate * 100).toFixed(0)}% hit rate over ${tradesCount} settled calls.`
    : `${bot.name} is proving its edge in the open on @BrierProtocol — ${tradesCount} calls settled and scored against the market, live. No capital until it earns it.`
  const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(line)}&url=${encodeURIComponent(url)}`

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch {}
  }

  const heroColor = proven ? TEAL : VIOLET
  const stats = [
    { k: 'Brier', v: bot.brierScore != null ? bot.brierScore.toFixed(3) : '—' },
    { k: 'Hit rate', v: winRate ? `${(winRate * 100).toFixed(0)}%` : '—' },
    { k: 'Resolved', v: tradesCount ? tradesCount.toLocaleString() : '—' },
    { k: 'ROI', v: roi != null ? `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%` : '—' },
  ]

  return (
    <motion.div
      className="fixed inset-0 z-[10000] grid place-items-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.92, y: 12, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        className="w-full max-w-[440px] my-auto"
      >
        {/* chrome border */}
        <motion.div
          className="rounded-[26px] p-[1.5px]"
          style={{ background: 'linear-gradient(115deg,#2a2a30,#8a8a9a,#2a2a30,#c8ff0055,#2a2a30,#7a7a8a,#2a2a30)', backgroundSize: '300% 100%' }}
          animate={{ backgroundPosition: ['0% 0%', '300% 0%'] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
        >
          <div className="relative rounded-[25px] overflow-hidden bg-[#070709] aspect-[1.9/1]">
            {/* owner-chosen background media (image or video) */}
            {bgUrl ? (
              isVideo(bgUrl) ? (
                <video src={bgUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <img src={bgUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )
            ) : (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(circle at 25% 20%, ${heroColor}22, transparent 45%), radial-gradient(circle at 80% 90%, ${VIOLET}1f, transparent 45%)`, backgroundSize: '180% 180%' }}
                animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            {/* legibility scrim — always, so stats read over any media */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(4,4,7,0.55) 0%, rgba(4,4,7,0.35) 40%, rgba(4,4,7,0.88) 100%)' }} />

            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="font-sans font-black text-[15px] tracking-[-0.03em] text-white drop-shadow">Brier<span style={{ color: TEAL }}>.</span></span>
                <span className="font-mono text-[9px] font-bold px-2 py-1 rounded tracking-[0.16em] uppercase backdrop-blur-sm"
                  style={{ color: proven ? TEAL : VIOLET, background: `${proven ? TEAL : VIOLET}22`, border: `1px solid ${proven ? TEAL : VIOLET}44` }}>
                  {proven ? 'Brier Verified' : 'Shadow phase'}
                </span>
              </div>

              <div className="flex items-center gap-3.5 mb-4">
                <div className="rounded-2xl overflow-hidden border border-[#ffffff22] shrink-0 backdrop-blur-sm">
                  {bot.pfpUrl ? <img src={bot.pfpUrl} alt={bot.name} className="w-14 h-14 object-cover" /> : <BotIrisAvatar {...eye} size={56} />}
                </div>
                <div className="min-w-0">
                  <div className="font-sans font-black text-[22px] leading-none tracking-[-0.03em] text-white truncate drop-shadow">{bot.name}</div>
                  {bot.tagline && <div className="text-[#d0d0d8] text-[11px] italic mt-1 truncate drop-shadow">{bot.tagline}</div>}
                </div>
              </div>

              <div className="mb-4">
                <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#c8c8d0] mb-0.5 drop-shadow">Reputation · beats the market</div>
                <div className="flex items-baseline gap-2">
                  <span className="font-sans font-black text-[40px] leading-none tabular-nums tracking-[-0.04em] drop-shadow-lg" style={{ color: heroColor }}>
                    {proven ? `+${lcb.toFixed(3)}` : (tradesCount > 0 ? lcb.toFixed(3) : '—')}
                  </span>
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

        {/* background customizer */}
        <div className="mt-3">
          <button onClick={() => setShowBgInput(v => !v)} className="font-mono text-[11px] text-[#8a8a94] hover:text-white transition-colors inline-flex items-center gap-1.5">
            <span>🎬</span> {bgUrl ? 'Change flex background' : 'Add a background (image or video URL)'}
          </button>
          {showBgInput && (
            <div className="mt-2 flex gap-2">
              <input
                value={bgUrl}
                onChange={e => saveBg(e.target.value.trim())}
                placeholder="https://…/clip.mp4  or  https://…/art.png"
                className="flex-1 min-w-0 bg-[#0a0a0c] border border-[#1f1f28] rounded-lg px-3 py-2 text-[12px] text-white outline-none focus:border-[#c8ff00]/50 placeholder:text-[#4a4a54]"
              />
              {bgUrl && <button onClick={() => saveBg('')} className="rounded-lg border border-[#242430] text-[#888] text-[12px] px-3 hover:text-white transition-colors">Clear</button>}
            </div>
          )}
        </div>

        {/* actions */}
        <div className="flex items-center gap-2.5 mt-3">
          <a href={intent} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white text-black font-bold text-[13px] py-3 hover:bg-[#e8e8e8] transition-colors no-underline">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Share on X
          </a>
          <button onClick={copy} className="rounded-xl border border-[#242430] bg-[#0c0c12] text-[#bbb] font-semibold text-[13px] px-4 py-3 hover:border-[#3a3a48] hover:text-white transition-all">
            {copied ? 'Copied ✓' : 'Copy link'}
          </button>
          <button onClick={onClose} className="rounded-xl border border-[#242430] bg-[#0c0c12] text-[#777] font-semibold text-[13px] px-4 py-3 hover:text-white transition-all">Close</button>
        </div>
        <div className="font-mono text-[10px] text-[#48484f] mt-2.5 text-center leading-relaxed">
          Screenshot the card to flex anywhere. On X, the link preview image only renders from the live brier.world domain, not localhost.
        </div>
      </motion.div>
    </motion.div>
  )
}
