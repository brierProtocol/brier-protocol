'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useRef } from 'react'
import BotIrisAvatar from './BotIrisAvatar'

/**
 * The bot as protagonist. Every agent on Brier is a small alien intelligence
 * proving itself against reality, and its portrait should feel like one: a
 * creature suspended in its own pocket of space. Orbital rings, drifting motes
 * and a nebula tint all derive from the bot's accent color, and the whole
 * stage breathes only while the bot is actually online (honest, like
 * everything else on the page).
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
  const stage = size + 56 // ring + particle margin around the creature
  const ref = useRef<HTMLDivElement>(null)

  // Mouse-follow tilt: the creature notices you.
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const rotateY = useSpring(useTransform(rawX, [-120, 120], [-14, 14]), { stiffness: 90, damping: 15 })
  const rotateX = useSpring(useTransform(rawY, [-120, 120], [10, -10]), { stiffness: 90, damping: 15 })

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
      {/* nebula tint — the bot's pocket of space */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none blur-2xl"
        style={{ background: `radial-gradient(circle at 50% 45%, ${a}33 0%, ${a}14 40%, transparent 70%)` }}
        animate={{ opacity: online ? [0.55, 0.95, 0.55] : [0.18, 0.3, 0.18], scale: online ? [0.94, 1.06, 0.94] : 1 }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* faint local starfield */}
      <div className="absolute inset-0 pointer-events-none opacity-70" style={{
        backgroundImage: `radial-gradient(1px 1px at 18% 26%, #ffffff2e 50%, transparent), radial-gradient(1px 1px at 78% 18%, ${a}44 50%, transparent), radial-gradient(1px 1px at 66% 82%, #ffffff22 50%, transparent), radial-gradient(1px 1px at 24% 74%, ${a}33 50%, transparent)`,
      }} />

      {/* orbital ring (rotating) */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ inset: 10, border: `1px dashed ${a}30`, borderTopColor: `${a}80` }}
        animate={online ? { rotate: 360 } : {}}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
      />
      {/* counter-orbit ring */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ inset: 24, border: `1px solid ${a}1c`, borderBottomColor: `${a}55` }}
        animate={online ? { rotate: -360 } : {}}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
      />

      {/* orbiting motes — satellites of the creature */}
      {online && [0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute inset-0 pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 9 + i * 4, repeat: Infinity, ease: 'linear', delay: i * 0.8 }}
        >
          <span
            className="absolute rounded-full"
            style={{
              width: 4 - i, height: 4 - i,
              top: 8 + i * 12, left: '50%',
              background: a, boxShadow: `0 0 8px ${a}, 0 0 16px ${a}66`,
            }}
          />
        </motion.div>
      ))}

      {/* the creature itself — floats, tilts toward the cursor */}
      <motion.div
        className="relative z-10"
        style={{ rotateX, rotateY, transformPerspective: 800 }}
        animate={{ y: online ? [0, -6, 0] : 0 }}
        transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {pfpUrl ? (
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: `${a}44`, boxShadow: `0 0 34px ${a}30` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pfpUrl} alt={name} style={{ width: size, height: size }} className="object-cover" />
          </div>
        ) : (
          <BotIrisAvatar {...eye} size={size} />
        )}
      </motion.div>

      {/* status beacon — pinned to the stage, not the creature */}
      <span className="absolute z-20" style={{ bottom: 22, right: 22 }}>
        <motion.span
          className="block rounded-full"
          style={{
            width: 11, height: 11,
            background: online ? '#c8ff00' : '#3a3a44',
            border: '2px solid #060608',
            boxShadow: online ? '0 0 10px #c8ff00aa' : 'none',
          }}
          animate={online ? { opacity: [1, 0.55, 1] } : {}}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      </span>
    </div>
  )
}
