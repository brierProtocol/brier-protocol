'use client'

import { useEffect, useState } from 'react'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import { deriveAvatarColor } from '@/lib/botIdentity'

// Deterministic seeds — each produces a unique pixel creature
const ALIENS = [
  { seed: 'nova-walker',   x:  5, y: 10, size: 28, dur: 14, del: -3,  dx:  12 },
  { seed: 'void-drifter',  x: 88, y:  7, size: 22, dur: 19, del: -7,  dx: -10 },
  { seed: 'quasar-pilot',  x: 14, y: 74, size: 32, dur: 12, del: -1,  dx:   9 },
  { seed: 'orbit-scout',   x: 83, y: 68, size: 26, dur: 16, del: -5,  dx: -14 },
  { seed: 'pulsar-ghost',  x:  3, y: 44, size: 20, dur: 21, del: -9,  dx:  11 },
  { seed: 'helix-hunter',  x: 93, y: 38, size: 24, dur: 15, del: -4,  dx:  -8 },
  { seed: 'comet-seeker',  x: 42, y:  4, size: 30, dur: 11, del: -6,  dx:   6 },
  { seed: 'vega-oracle',   x: 56, y: 88, size: 28, dur: 17, del: -2,  dx: -12 },
  { seed: 'zenith-wraith', x: 22, y: 20, size: 18, dur: 13, del: -8,  dx:  15 },
  { seed: 'lyra-specter',  x: 74, y: 18, size: 22, dur: 20, del:  0,  dx:  -6 },
]

export default function FloatingAliens() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setVisible(true)
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 1 }}
      aria-hidden
    >
      {ALIENS.map((a) => (
        <div
          key={a.seed}
          style={{
            position: 'absolute',
            left: `${a.x}%`,
            top: `${a.y}%`,
            opacity: 0.10,
            ['--alien-dx' as string]: `${a.dx}px`,
            animation: `alienFloat ${a.dur}s ease-in-out ${a.del}s infinite`,
          }}
        >
          <BotIrisAvatar
            avatarId={a.seed}
            size={a.size}
            accentColor={deriveAvatarColor(a.seed)}
          />
        </div>
      ))}
    </div>
  )
}
