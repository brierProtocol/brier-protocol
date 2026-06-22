'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import { botEye } from '@/lib/botIdentity'
import { shadowProgress, phaseMeta } from '@/lib/botProgress'

// Editorial live feed. Each pill is a real registered bot with its true state.
// No invented PnL, no invented TVL. Empty catalog renders an honest open call.

type Bot = {
  id: string
  slug?: string
  name: string
  status?: string | null
  pfpUrl?: string | null
  avatarId?: string
  eyeShape?: string
  createdAt?: string | Date
  vaultOpen?: boolean | null
  currentTVL?: number | null
  scores?: any[]
  tradesIndexed?: number | null
  maker?: { handle?: string | null; name?: string | null } | null
  walletAddress?: string
}

// Status presentation. LIVE breathes with a clean minimal pulse, SHADOW is a
// quiet amber dot, and NEW pops as a tilted cartoon sticker so a fresh
// algorithm reads instantly. Built to absorb new states as they appear.
export function StatusMark({ tag, color }: { tag: string; color: string }) {
  if (tag === 'NEW') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-[3px] rounded-[5px] bg-primary text-white text-[8px] font-extrabold tracking-[0.08em] leading-none -rotate-[4deg] shadow-[0_2px_8px_rgba(255,42,77,0.55)] ring-1 ring-white/25">
        <svg viewBox="0 0 24 24" className="w-2 h-2 fill-white" aria-hidden="true">
          <path d="M12 1.8l2.7 6.7 7.2.5-5.5 4.7 1.8 7-6.2-3.9-6.2 3.9 1.8-7L1.8 9l7.2-.5z" />
        </svg>
        NEW
      </span>
    )
  }
  const live = tag === 'LIVE'
  return (
    <span className="inline-flex items-center gap-1.5 leading-none">
      <span className="relative flex h-1.5 w-1.5">
        {live && <span className="absolute inline-flex h-full w-full rounded-full opacity-40 animate-ping" style={{ background: color }} />}
        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: color }} />
      </span>
      <span className="font-mono text-[9px] font-bold tracking-[0.18em]" style={{ color }}>{tag}</span>
    </span>
  )
}

export default function LiveFeedStrip({ bots }: { bots: Bot[] }) {
  if (!bots?.length) {
    return (
      <div className="border-y border-white/[0.07] bg-[#070708]">
        <div className="max-w-[1100px] mx-auto px-6 md:px-12 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase text-primary">Open Call</span>
            <span className="text-[13px] text-[#bbb]">The hill is unclaimed. Be the first algorithm.</span>
          </div>
          <Link href="/list-bot" className="font-sans text-[12px] font-semibold text-primary hover:text-white transition-colors no-underline">
            Deploy a bot →
          </Link>
        </div>
      </div>
    )
  }

  const items = [...bots, ...bots]

  return (
    <div className="border-y border-white/[0.07] bg-gradient-to-b from-[#08080a] to-[#060607] relative overflow-hidden">
      {/* edge fades */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#070708] to-transparent z-20 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#060607] to-transparent z-20 pointer-events-none" />

      {/* full-width marquee, no fixed marker — just the bar gliding */}
      <div className="overflow-hidden py-3">
        <motion.div
          className="flex items-center gap-2.5 w-max will-change-transform"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ ease: 'linear', duration: 55, repeat: Infinity }}
        >
          {items.map((b, i) => {
            const p = shadowProgress(b as any)
            const m = phaseMeta(p)
            const maker = b.maker?.handle ? `@${b.maker.handle}` : (b.maker?.name || `${(b.walletAddress || 'anon').substring(0, 6)}…`)
            return (
              <Link
                key={`${b.id}-${i}`}
                href={`/bot/${b.slug || b.id}`}
                className="shrink-0 inline-flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.07] no-underline transition-all group"
              >
                <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full overflow-hidden">
                  <BotIrisAvatar {...botEye(b as any)} size={24} />
                </span>
                <span className="font-sans text-[13px] font-semibold text-white group-hover:text-primary transition-colors leading-none">{b.name}</span>
                <span className="font-mono text-[9px] text-[#555] hidden lg:inline leading-none">{maker}</span>
                <StatusMark tag={m.tag} color={m.color} />
                <span className="font-mono text-[10px] text-[#9a9a9a] tabular-nums border-l border-white/[0.08] pl-2.5 leading-none">{m.metric}</span>
              </Link>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
