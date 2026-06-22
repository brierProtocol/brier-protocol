'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import { botEye } from '@/lib/botIdentity'
import { shadowProgress, SHADOW_RESOLVED_TARGET, SHADOW_DAYS_TARGET } from '@/lib/botProgress'

// Editorial live feed. Each card is a real registered bot. The tag describes
// the bot's true state (LIVE / IN SHADOW / REGISTERED). No invented PnL, no
// invented TVL. If there are no bots yet, the strip renders a single honest
// "open call" card pointing builders to deploy.

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
  maker?: { handle?: string | null; name?: string | null } | null
  walletAddress?: string
}

function tagFor(p: ReturnType<typeof shadowProgress>) {
  if (p.live) return { label: 'LIVE', color: '#00d4aa' }
  if (p.resolved > 0) return { label: 'IN SHADOW', color: '#ffb000' }
  return { label: 'REGISTERED', color: '#888' }
}

function lineFor(p: ReturnType<typeof shadowProgress>) {
  if (p.live) return 'vault open at NAV'
  if (p.resolved > 0) return `${p.resolved}/${SHADOW_RESOLVED_TARGET} resolved · day ${p.days}/${SHADOW_DAYS_TARGET}`
  return `day ${p.days}/${SHADOW_DAYS_TARGET} of shadow`
}

export default function LiveFeedStrip({ bots }: { bots: Bot[] }) {
  if (!bots?.length) {
    return (
      <div className="border-y border-[#141414] bg-[#050505]">
        <div className="max-w-[1100px] mx-auto px-6 md:px-12 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-primary">Open Call</span>
            <span className="text-[12px] text-[#bbb]">The board is empty. Be the first algorithm.</span>
          </div>
          <Link href="/list-bot" className="font-sans text-[12px] font-semibold text-primary hover:text-white transition-colors no-underline">
            Deploy a bot →
          </Link>
        </div>
      </div>
    )
  }

  // Duplicate the list so the marquee loops seamlessly.
  const items = [...bots, ...bots]

  return (
    <div className="border-y border-[#141414] bg-[#050505] relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none" />

      <div className="flex items-center gap-3 px-6 py-2.5">
        {/* fixed label */}
        <div className="hidden md:flex items-center gap-2 shrink-0 pr-4 mr-1 border-r border-[#1a1a1a]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d4aa] opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00d4aa]" />
          </span>
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[#888]">Live Feed</span>
        </div>

        {/* marquee */}
        <motion.div
          className="flex items-center gap-3 shrink-0 will-change-transform"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ ease: 'linear', duration: 60, repeat: Infinity }}
        >
          {items.map((b, i) => {
            const p = shadowProgress(b as any)
            const tag = tagFor(p)
            const maker = b.maker?.handle ? `@${b.maker.handle}` : (b.maker?.name || `${(b.walletAddress || 'anon').substring(0, 6)}…`)
            return (
              <Link
                key={`${b.id}-${i}`}
                href={`/bot/${b.slug || b.id}`}
                className="shrink-0 inline-flex items-center gap-2.5 bg-[#0a0a0a] border border-[#161616] hover:border-[#2a2a2a] px-2.5 py-1.5 no-underline transition-colors group"
              >
                <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                  <BotIrisAvatar {...botEye(b as any)} size={20} />
                </div>
                <span className="font-sans text-[12px] font-semibold text-white group-hover:text-primary transition-colors">{b.name}</span>
                <span className="font-mono text-[9px] text-[#555] hidden lg:inline">{maker}</span>
                <span
                  className="font-mono text-[9px] tracking-widest px-1.5 py-0.5 border"
                  style={{ color: tag.color, borderColor: `${tag.color}55`, background: `${tag.color}0d` }}
                >
                  {tag.label}
                </span>
                <span className="font-mono text-[10px] text-[#888] hidden md:inline">{lineFor(p)}</span>
              </Link>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
