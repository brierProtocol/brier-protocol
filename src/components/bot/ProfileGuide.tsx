'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'

// A plain-language on-ramp for someone who has never seen a prediction-market bot
// before. It uses the Brier "aliens" (the iris creatures) in different brand
// colors as the guide characters — the identity teaching the newcomer.

const STEPS: { color: string; avatarId: string; title: string; body: string }[] = [
  {
    color: '#ff2a4d', avatarId: 'guide-what',
    title: 'What you are looking at',
    body: 'An autonomous bot that forecasts prediction markets on Polymarket. Brier is the referee: it tracks whether the bot is genuinely skilled long before anyone trusts it with money.',
  },
  {
    color: '#c8ff00', avatarId: 'guide-reputation',
    title: 'The one number that matters',
    body: 'Reputation. Above zero means the bot beats the market price consistently, after luck is stripped out. Below zero means it has not proven itself yet. Every other panel exists to explain that one number.',
  },
  {
    color: '#00e5ff', avatarId: 'guide-honest',
    title: 'Is it honest?',
    body: 'The calibration chart answers this. When the bot says it is 80% sure, does that happen about 80% of the time? Dots that hug the diagonal are honest; dots below it mean it talks a bigger game than it delivers.',
  },
  {
    color: '#a96bff', avatarId: 'guide-trust',
    title: 'Why you can trust the record',
    body: 'Every prediction is committed BEFORE the market resolves, and scored against the market price at that exact moment. It cannot cherry-pick winners. No real capital is at risk until it clears the shadow gate: 100 resolved calls, positive edge, 21 days live.',
  },
]

// little floating alien with a glow halo
function Alien({ color, avatarId, size = 40 }: { color: string; avatarId: string; size?: number }) {
  return (
    <motion.div className="relative grid place-items-center shrink-0" style={{ width: size, height: size }}
      animate={{ y: [0, -3, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}>
      <motion.div className="absolute rounded-full blur-lg" style={{ inset: -4, background: `radial-gradient(circle, ${color}55, transparent 70%)` }}
        animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
      <BotIrisAvatar avatarId={avatarId} accentColor={color} size={size} />
    </motion.div>
  )
}

export default function ProfileGuide() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-[#1a1a1a] bg-gradient-to-br from-[#0a0a12] to-[#080809] overflow-hidden mb-8">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#0c0c14] transition-colors">
        <div className="flex items-center gap-3.5">
          {/* teaser cluster of aliens */}
          <div className="flex -space-x-2.5">
            {STEPS.map((s, i) => (
              <motion.div key={s.avatarId} initial={{ scale: 0, x: -8 }} animate={{ scale: 1, x: 0 }} transition={{ delay: i * 0.08, type: 'spring', stiffness: 260, damping: 18 }}
                style={{ zIndex: STEPS.length - i }} className="rounded-full ring-2 ring-[#080809]">
                <BotIrisAvatar avatarId={s.avatarId} accentColor={s.color} size={26} />
              </motion.div>
            ))}
          </div>
          <div>
            <div className="font-sans font-bold text-[14px] text-white">New here? Let the crew walk you through it</div>
            <div className="font-mono text-[10px] text-[#5a5a64]">30 seconds · plain language, no jargon</div>
          </div>
        </div>
        <span className="font-mono text-[11px] text-[#48484f] shrink-0">{open ? 'hide −' : 'read +'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 pt-1 grid sm:grid-cols-2 gap-3">
              {STEPS.map((s, i) => (
                <motion.div key={s.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  className="rounded-xl border border-[#161620] bg-[#08080c] p-4 flex gap-3.5">
                  <Alien color={s.color} avatarId={s.avatarId} />
                  <div className="min-w-0">
                    <div className="font-sans font-bold text-[12.5px] mb-1" style={{ color: s.color }}>{s.title}</div>
                    <p className="text-[12px] text-[#9a9aa4] leading-relaxed m-0">{s.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
