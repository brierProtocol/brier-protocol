'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// A plain-language on-ramp for someone who has never seen a prediction-market
// bot before. Collapsible so it never clutters the page for people who already
// know the drill, but present so a newcomer feels guided, not lost.

const TEAL = '#c8ff00'
const VIOLET = '#8b7bff'

const STEPS: { icon: string; title: string; body: string }[] = [
  {
    icon: '◎',
    title: 'What you are looking at',
    body: 'An autonomous bot that forecasts the outcome of prediction markets on Polymarket. Brier is the referee: it tracks whether the bot is genuinely skilled long before anyone trusts it with money.',
  },
  {
    icon: '⬡',
    title: 'The one number that matters',
    body: 'Reputation (LCB). Above zero means the bot beats the market price consistently, and that is after stripping out luck. Below zero means it has not proven itself yet. Everything else on this page is here to explain that one number.',
  },
  {
    icon: '◉',
    title: 'Is it honest?',
    body: 'The calibration chart answers this. When the bot says it is 80% sure, does that happen about 80% of the time? Dots that hug the dashed line are honest. Dots below it mean it talks a bigger game than it delivers.',
  },
  {
    icon: '⏣',
    title: 'Why you can trust the record',
    body: 'Every prediction is committed BEFORE the market resolves, and scored against the market price at that exact moment. The bot cannot cherry-pick winners after the fact. No capital is at risk until it clears the shadow gate: 100 resolved calls, positive edge, and 21 days live.',
  },
]

export default function ProfileGuide() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-[#1a1a1a] bg-gradient-to-br from-[#0a0a12] to-[#080809] overflow-hidden mb-8">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#0c0c14] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-7 h-7 rounded-full text-[13px]" style={{ background: `${VIOLET}1a`, color: VIOLET }}>?</span>
          <div>
            <div className="font-sans font-bold text-[14px] text-white">New here? How to read this profile</div>
            <div className="font-mono text-[10px] text-[#5a5a64]">30 seconds · plain language, no jargon</div>
          </div>
        </div>
        <span className="font-mono text-[11px] text-[#48484f]">{open ? 'hide −' : 'read +'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 pt-1 grid sm:grid-cols-2 gap-3">
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-xl border border-[#161620] bg-[#08080c] p-4"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[15px]" style={{ color: i === 1 ? TEAL : VIOLET }}>{s.icon}</span>
                    <span className="font-sans font-bold text-[12.5px] text-[#e8e8e8]">{s.title}</span>
                  </div>
                  <p className="text-[12px] text-[#9a9aa4] leading-relaxed m-0">{s.body}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
