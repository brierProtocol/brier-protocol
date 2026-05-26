'use client'

import React from 'react'
import { motion } from 'framer-motion'

export type Mood = 'cool' | 'happy' | 'excited' | 'neutral' | 'anxious' | 'sad' | 'suspicious'

interface BotCharacterProps {
  mood: Mood
  size?: number
  accentColor?: string
  animate?: boolean
  className?: string
}

const moodColors: Record<string, string> = {
  cool:      '#2563EB', // Institutional Blue
  happy:     '#10B981', // Clean Green
  excited:   '#8B5CF6', // Deep Purple
  neutral:   '#9CA3AF', // Slate Gray
  anxious:   '#F59E0B', // Muted Amber
  sad:       '#EF4444', // Alert Red
  suspicious:'#D97706', // Muted Gold
}

// Complex AI Core Generator
export function BotCharacter({ 
  mood = 'neutral', 
  size = 120,
  accentColor,
  animate = true,
  className = ''
}: BotCharacterProps) {
  const color = accentColor || moodColors[mood] || '#888'

  // Dynamic animation speeds based on mood
  const spinSpeed = mood === 'excited' ? 2 : mood === 'anxious' ? 1 : 8;
  const pulseScale = mood === 'excited' ? [1, 1.2, 1] : mood === 'sad' ? [1, 0.9, 1] : [1, 1.05, 1];

  return (
    <div
      className={`relative select-none ${className}`}
      style={{ width: size, height: size, background: '#050505', border: `1px solid ${color}`, borderRadius: '4px', overflow: 'hidden' }}
    >
      <svg
        viewBox="0 0 120 120"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Terminal Grid */}
        <pattern id="microgrid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#111" strokeWidth="0.5"/>
        </pattern>
        <rect width="120" height="120" fill="url(#microgrid)" />

        {/* Outer Tech Ring */}
        <motion.circle 
          cx="60" cy="60" r="45" 
          fill="none" stroke="#222" strokeWidth="2" 
          strokeDasharray="4 8"
          animate={animate ? { rotate: 360 } : {}}
          transition={{ repeat: Infinity, duration: spinSpeed * 3, ease: "linear" }}
          style={{ transformOrigin: 'center' }}
        />

        {/* Middle Targeting Ring */}
        <motion.circle 
          cx="60" cy="60" r="35" 
          fill="none" stroke={color} strokeWidth="1" 
          strokeDasharray="20 10 5 10"
          animate={animate ? { rotate: -360 } : {}}
          transition={{ repeat: Infinity, duration: spinSpeed * 2, ease: "linear" }}
          style={{ transformOrigin: 'center', opacity: 0.6 }}
        />

        {/* Crosshairs */}
        <path d="M 60 10 L 60 25 M 60 95 L 60 110 M 10 60 L 25 60 M 95 60 L 110 60" stroke={color} strokeWidth="1" opacity="0.4" />

        {/* The AI Core (Pupil) */}
        <motion.circle 
          cx="60" cy="60" r="18" 
          fill={color} 
          animate={animate ? { scale: pulseScale, opacity: [0.7, 1, 0.7] } : {}}
          transition={{ repeat: Infinity, duration: spinSpeed, ease: "easeInOut" }}
        />
        <circle cx="60" cy="60" r="8" fill="#000" />
        <circle cx="63" cy="57" r="3" fill="#fff" opacity="0.8" /> {/* Core Reflection */}

        {/* Diagnostic Bars Overlay */}
        <rect x="5" y="10" width="3" height="20" fill={color} opacity="0.3" />
        <rect x="5" y="32" width="3" height="10" fill={color} opacity="0.3" />
        <rect x="112" y="80" width="3" height="30" fill={color} opacity="0.3" />

      </svg>
    </div>
  )
}

export default BotCharacter;
