'use client'

import { motion, TargetAndTransition } from 'framer-motion'

export type Mood = 'cool' | 'happy' | 'excited' | 'neutral' | 'anxious' | 'sad' | 'suspicious'

interface BotCharacterProps {
  mood: Mood
  size?: number
  accentColor?: string
  animate?: boolean
  className?: string
}

// Eye and mouth configurations centered around the face (cx=60, cy=58)
const faceConfig: Record<Mood, {
  leftEye: { x: number, y: number, r: number, ry?: number }
  rightEye: { x: number, y: number, r: number, ry?: number }
  mouth: string
  brows?: { left: string, right: string }
  pupilOffset?: { x: number, y: number }
}> = {
  cool: {
    leftEye:  { x: 48, y: 52, r: 8, ry: 4 },
    rightEye: { x: 72, y: 52, r: 8, ry: 4 },
    mouth:    'M48,70 Q60,74 72,70',
    brows:    { left: 'M40,44 Q48,40 56,44', right: 'M64,44 Q72,40 80,44' }
  },
  happy: {
    leftEye:  { x: 48, y: 52, r: 7 },
    rightEye: { x: 72, y: 52, r: 7 },
    mouth:    'M45,72 Q60,84 75,72',
  },
  excited: {
    leftEye:  { x: 48, y: 50, r: 9 },
    rightEye: { x: 72, y: 50, r: 9 },
    mouth:    'M45,70 Q60,86 75,70 Z',
  },
  neutral: {
    leftEye:  { x: 48, y: 52, r: 6 },
    rightEye: { x: 72, y: 52, r: 6 },
    mouth:    'M50,74 Q60,76 70,74',
  },
  anxious: {
    leftEye:  { x: 48, y: 52, r: 6 },
    rightEye: { x: 72, y: 52, r: 6 },
    mouth:    'M50,78 Q60,72 70,78',
    brows:    { left: 'M42,46 Q48,42 54,46', right: 'M66,46 Q72,42 78,46' }
  },
  sad: {
    leftEye:  { x: 48, y: 55, r: 6 },
    rightEye: { x: 72, y: 55, r: 6 },
    mouth:    'M45,82 Q60,74 75,82',
    brows:    { left: 'M42,48 Q48,52 54,48', right: 'M66,48 Q72,52 78,48' }
  },
  suspicious: {
    leftEye:  { x: 48, y: 52, r: 8, ry: 3 },
    rightEye: { x: 72, y: 52, r: 7 },
    mouth:    'M50,74 Q65,78 70,70',
    brows:    { left: 'M40,46 Q48,44 56,46', right: 'M64,40 Q72,38 80,44' }
  },
}

const bodyAnimations: Record<Mood, TargetAndTransition> = {
  cool:      { rotate: [0, -2, 2, 0], transition: { repeat: Infinity, duration: 4 } },
  happy:     { y: [0, -4, 0], transition: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } },
  excited:   { scale: [1, 1.04, 1], rotate: [0, -3, 3, 0], transition: { repeat: Infinity, duration: 0.6 } },
  neutral:   { y: [0, -2, 0], transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' } },
  anxious:   { x: [0, -2, 2, -1, 1, 0], transition: { repeat: Infinity, duration: 0.5 } },
  sad:       { y: [0, 1, 0], transition: { repeat: Infinity, duration: 4, ease: 'easeInOut' } },
  suspicious:{ rotate: [0, -1, 0], transition: { repeat: Infinity, duration: 3 } },
}

const moodColors: Record<Mood, string> = {
  cool:      '#00F0FF',
  happy:     '#00FFC8',
  excited:   '#FFB800',
  neutral:   '#888888',
  anxious:   '#FF9500',
  sad:       '#6B7FFF',
  suspicious:'#FF3B3B',
}

export function BotCharacter({ 
  mood = 'neutral', 
  size = 120,
  accentColor,
  animate = true,
  className = ''
}: BotCharacterProps) {
  const color = moodColors[mood]
  const config = faceConfig[mood]
  const bodyAnim = animate ? bodyAnimations[mood] : {}
  const primaryColor = accentColor || color

  return (
    <motion.div
      className={`relative select-none ${className}`}
      style={{ width: size, height: size }}
      animate={bodyAnim}
    >
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* SHADOW */}
        <ellipse cx="60" cy="112" rx="30" ry="6" fill="rgba(0,0,0,0.2)" />
        
        {/* BODY */}
        <rect
          x="20" y="20"
          width="80" height="85"
          rx="35" ry="35"
          fill={primaryColor}
          stroke="#050505"
          strokeWidth="3.5"
        />
        
        {/* HIGHLIGHT */}
        <rect
          x="28" y="28"
          width="20" height="15"
          rx="10" ry="10"
          fill="rgba(255,255,255,0.2)"
        />

        {/* ARMS */}
        <path d="M20,60 Q5,65 10,80" fill={primaryColor} stroke="#050505" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M100,60 Q115,65 110,80" fill={primaryColor} stroke="#050505" strokeWidth="3.5" strokeLinecap="round" />

        {/* LEGS */}
        <path d="M45,105 L42,112" fill={primaryColor} stroke="#050505" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M75,105 L78,112" fill={primaryColor} stroke="#050505" strokeWidth="3.5" strokeLinecap="round" />

        {/* FACE CIRCLE */}
        <ellipse
          cx="60" cy="58"
          rx="32" ry="30"
          fill="#FFFFFF"
          stroke="#050505"
          strokeWidth="2.5"
        />

        {/* EYES */}
        <ellipse
          cx={config.leftEye.x}
          cy={config.leftEye.y}
          rx={config.leftEye.r}
          ry={config.leftEye.ry || config.leftEye.r}
          fill="#050505"
        />
        <ellipse
          cx={config.rightEye.x}
          cy={config.rightEye.y}
          rx={config.rightEye.r}
          ry={config.rightEye.ry || config.rightEye.r}
          fill="#050505"
        />

        {/* PUPILS (SHINE) */}
        <circle cx={config.leftEye.x - 2} cy={config.leftEye.y - 2} r="2" fill="white" />
        <circle cx={config.rightEye.x - 2} cy={config.rightEye.y - 2} r="2" fill="white" />

        {/* BROWS */}
        {config.brows && (
          <>
            <path d={config.brows.left} fill="none" stroke="#050505" strokeWidth="2.5" strokeLinecap="round" />
            <path d={config.brows.right} fill="none" stroke="#050505" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}

        {/* MOUTH */}
        <path
          d={config.mouth}
          fill={mood === 'excited' ? '#050505' : 'none'}
          stroke={mood === 'excited' ? 'none' : '#050505'}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* SWEAT (Anxious) */}
        {mood === 'anxious' && (
          <path d="M85,45 Q90,40 92,50" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
        )}
      </svg>
    </motion.div>
  )
}

export default BotCharacter;
