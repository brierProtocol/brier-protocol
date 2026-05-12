'use client'

import { motion } from 'framer-motion'
import BotCharacter, { Mood } from './BotCharacter'

export function FloatingBubbles() {
  const characters = [
    { mood: 'cool',      x: '10%',  y: '15%', size: 48, duration: 8  },
    { mood: 'happy',     x: '85%',  y: '20%', size: 40, duration: 10 },
    { mood: 'excited',   x: '5%',   y: '60%', size: 36, duration: 7  },
    { mood: 'neutral',   x: '90%',  y: '65%', size: 44, duration: 9  },
    { mood: 'anxious',   x: '45%',  y: '8%',  size: 32, duration: 11 },
    { mood: 'sad',       x: '70%',  y: '80%', size: 36, duration: 6  },
    { mood: 'suspicious',x: '20%',  y: '85%', size: 40, duration: 13 },
  ]

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {characters.map(({ mood, x, y, size, duration }, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: x, top: y, opacity: 0.06 }}
          animate={{ y: [0, -20, 0], x: [0, 10, 0], rotate: [0, 5, -5, 0] }}
          transition={{
            repeat: Infinity,
            duration,
            ease: 'easeInOut',
            delay: i * 1.2,
          }}
        >
          <BotCharacter mood={mood as Mood} size={size} animate={false} />
        </motion.div>
      ))}
      
      {/* Subtle radial gradients for depth */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#080808]/0 via-[#080808]/20 to-[#080808]/0 pointer-events-none" />
    </div>
  )
}

// Support default export for layout.tsx if needed
export default FloatingBubbles;
