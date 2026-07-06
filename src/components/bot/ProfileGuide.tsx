'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'

// A plain-language on-ramp for someone who has never seen a prediction-market bot.
// The Brier "aliens" (iris creatures) in four brand colors are the guide crew —
// the identity teaching the newcomer.

const STEPS: { color: string; avatarId: string; k: string; title: string; body: string }[] = [
  { color: '#ff2a4d', avatarId: 'guide-what', k: '01', title: 'What this is', body: 'An autonomous bot that forecasts prediction markets on Polymarket. Brier is the referee that tracks whether it is genuinely skilled — long before anyone trusts it with money.' },
  { color: '#c8ff00', avatarId: 'guide-reputation', k: '02', title: 'The one number', body: 'Reputation. Above zero, the bot beats the market price consistently, luck stripped out. Below zero, unproven. Every panel here exists to explain that single number.' },
  { color: '#00e5ff', avatarId: 'guide-honest', k: '03', title: 'Is it honest?', body: 'The honesty check. When it says 80%, does that happen 80% of the time? You watch the gap between what it promised and what really happened.' },
  { color: '#a96bff', avatarId: 'guide-trust', k: '04', title: 'Why trust it', body: 'Every call is committed BEFORE the market resolves and scored against the market price then — no cherry-picking. No real capital until it clears the gate: 100 calls, positive edge, 21 days.' },
]

function Alien({ color, avatarId, size = 46 }: { color: string; avatarId: string; size?: number }) {
  return (
    <motion.div className="relative grid place-items-center shrink-0" style={{ width: size, height: size }}
      animate={{ y: [0, -4, 0] }} transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}>
      <motion.div className="absolute rounded-full blur-xl" style={{ inset: -6, background: `radial-gradient(circle, ${color}66, transparent 70%)` }}
        animate={{ opacity: [0.35, 0.85, 0.35] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} />
      <BotIrisAvatar avatarId={avatarId} accentColor={color} size={size} />
    </motion.div>
  )
}

export default function ProfileGuide() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative rounded-2xl border border-[#1a1a22] overflow-hidden mb-8">
      {/* animated sheen border accent */}
      <motion.div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #ff2a4d, #c8ff00, #00e5ff, #a96bff, transparent)', backgroundSize: '200% 100%' }}
        animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />
      <div className="bg-gradient-to-br from-[#0b0b14] to-[#08080b]">
        <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-5 text-left hover:bg-[#0d0d16] transition-colors">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {STEPS.map((s, i) => (
                <motion.div key={s.avatarId} initial={{ scale: 0, x: -10 }} animate={{ scale: 1, x: 0 }} transition={{ delay: i * 0.08, type: 'spring', stiffness: 260, damping: 18 }}
                  style={{ zIndex: STEPS.length - i }} className="rounded-full ring-2 ring-[#08080b]">
                  <BotIrisAvatar avatarId={s.avatarId} accentColor={s.color} size={34} />
                </motion.div>
              ))}
            </div>
            <div>
              <div className="font-sans font-bold text-[16px] text-white tracking-tight">New here? The crew explains it in 30 seconds</div>
              <div className="font-mono text-[10px] text-[#5a5a64] mt-0.5">no jargon · plain language · four cards</div>
            </div>
          </div>
          <span className="font-mono text-[11px] text-[#6a6a74] shrink-0 border border-[#242430] rounded-full px-3 py-1.5">{open ? 'hide' : 'read'}</span>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-5 pb-5 pt-1 grid sm:grid-cols-2 gap-3.5">
                {STEPS.map((s, i) => (
                  <motion.div key={s.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                    className="relative rounded-xl border border-[#161620] bg-[#08080c] p-4 flex gap-4 overflow-hidden">
                    <div className="absolute top-3 right-3 font-mono text-[10px] font-bold" style={{ color: `${s.color}55` }}>{s.k}</div>
                    <Alien color={s.color} avatarId={s.avatarId} />
                    <div className="min-w-0">
                      <div className="font-sans font-bold text-[13.5px] mb-1" style={{ color: s.color }}>{s.title}</div>
                      <p className="text-[12px] text-[#9a9aa4] leading-relaxed m-0">{s.body}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
