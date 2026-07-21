'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useRef } from 'react'
import BotIrisAvatar from './BotIrisAvatar'

/**
 * The bot as protagonist — clean edition. No spinning rings or orbiting motes:
 * just a crisp framed portrait on a soft, static glow that breathes gently only
 * while the bot is actually online. It floats and tilts toward the cursor, so it
 * feels alive without the busy "aura" spin.
 */
export default function BotHeroPortrait({
  eye, pfpUrl, name, online = false, size = 128,
}: {
  eye: { avatarId: string; accentColor: string; shape?: any }
  pfpUrl?: string | null
  name: string
  online?: boolean
  size?: number
}) {
  const stage = size + 40
  const ref = useRef<HTMLDivElement>(null)

  // Mouse-follow tilt: the creature notices you.
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const rotateY = useSpring(useTransform(rawX, [-120, 120], [-12, 12]), { stiffness: 90, damping: 15 })
  const rotateX = useSpring(useTransform(rawY, [-120, 120], [9, -9]), { stiffness: 90, damping: 15 })

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    rawX.set(e.clientX - (r.left + r.width / 2))
    rawY.set(e.clientY - (r.top + r.height / 2))
  }
  function onMouseLeave() { rawX.set(0); rawY.set(0) }

  const a = eye.accentColor

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="relative grid place-items-center shrink-0 select-none"
      style={{ width: stage, height: stage }}
    >
      {/* soft static glow — breathes only while online, no rotation */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none blur-2xl"
        style={{ background: `radial-gradient(circle at 50% 45%, ${a}30 0%, ${a}10 45%, transparent 72%)` }}
        animate={{ opacity: online ? [0.5, 0.8, 0.5] : 0.2 }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* the creature — clean frame, floats, tilts toward the cursor */}
      <motion.div
        className="relative z-10"
        style={{ rotateX, rotateY, transformPerspective: 800 }}
        animate={{ y: online ? [0, -5, 0] : 0 }}
        transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {pfpUrl ? (
          <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${a}55`, boxShadow: `0 0 28px ${a}26, inset 0 0 0 1px #ffffff08` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pfpUrl} alt={name} style={{ width: size, height: size }} className="object-cover" />
          </div>
        ) : (
          <div className="rounded-full" style={{ boxShadow: `0 0 28px ${a}22` }}>
            <BotIrisAvatar {...eye} size={size} />
          </div>
        )}
      </motion.div>
    </div>
  )
}
