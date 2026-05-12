'use client'

import { motion, TargetAndTransition } from 'framer-motion'
import { useEffect } from 'react'

export type Mood = 'cool' | 'happy' | 'excited' | 'neutral' | 'anxious' | 'sad' | 'suspicious'

interface BotCharacterProps {
  mood: Mood
  size?: number
  accentColor?: string
  animate?: boolean
  className?: string
}

// Eye shapes per mood
const eyeConfigs: Record<Mood, {
  leftEye: string
  rightEye: string
  leftPupil: string
  rightPupil: string
  leftBrow?: string
  rightBrow?: string
}> = {
  cool: {
    // Squinting — half-closed rectangles
    leftEye:   'M10,18 Q20,12 30,18 Q20,24 10,18 Z',
    rightEye:  'M50,18 Q60,12 70,18 Q60,24 50,18 Z',
    leftPupil: 'M17,17 A4,3 0 1,1 23,17 A4,3 0 1,1 17,17 Z',
    rightPupil:'M57,17 A4,3 0 1,1 63,17 A4,3 0 1,1 57,17 Z',
  },
  happy: {
    // Classic round happy eyes
    leftEye:   'M10,10 A12,14 0 1,1 34,10 A12,14 0 1,1 10,10 Z',
    rightEye:  'M46,10 A12,14 0 1,1 70,10 A12,14 0 1,1 46,10 Z',
    leftPupil: 'M16,12 A7,8 0 1,1 28,12 A7,8 0 1,1 16,12 Z',
    rightPupil:'M52,12 A7,8 0 1,1 64,12 A7,8 0 1,1 52,12 Z',
  },
  excited: {
    // Huge excited eyes — wide open
    leftEye:   'M6,8 A16,18 0 1,1 38,8 A16,18 0 1,1 6,8 Z',
    rightEye:  'M42,8 A16,18 0 1,1 74,8 A16,18 0 1,1 42,8 Z',
    leftPupil: 'M14,12 A9,10 0 1,1 30,12 A9,10 0 1,1 14,12 Z',
    rightPupil:'M50,12 A9,10 0 1,1 66,12 A9,10 0 1,1 50,12 Z',
  },
  neutral: {
    // Standard oval eyes
    leftEye:   'M10,10 A11,13 0 1,1 32,10 A11,13 0 1,1 10,10 Z',
    rightEye:  'M48,10 A11,13 0 1,1 70,10 A11,13 0 1,1 48,10 Z',
    leftPupil: 'M15,12 A6,7 0 1,1 27,12 A6,7 0 1,1 15,12 Z',
    rightPupil:'M53,12 A6,7 0 1,1 65,12 A6,7 0 1,1 53,12 Z',
  },
  anxious: {
    // Worried — tilted inner brows
    leftEye:   'M10,10 A11,13 0 1,1 32,10 A11,13 0 1,1 10,10 Z',
    rightEye:  'M48,10 A11,13 0 1,1 70,10 A11,13 0 1,1 48,10 Z',
    leftPupil: 'M15,12 A6,7 0 1,1 27,12 A6,7 0 1,1 15,12 Z',
    rightPupil:'M53,12 A6,7 0 1,1 65,12 A6,7 0 1,1 53,12 Z',
    leftBrow:  'M8,4 Q21,0 28,4',   // angled up-inward
    rightBrow: 'M52,4 Q59,0 72,4',
  },
  sad: {
    // Droopy — bottom-heavy ovals
    leftEye:   'M10,12 A11,11 0 1,1 32,12 A11,11 0 1,1 10,12 Z',
    rightEye:  'M48,12 A11,11 0 1,1 70,12 A11,11 0 1,1 48,12 Z',
    leftPupil: 'M16,16 A5,6 0 1,1 26,16 A5,6 0 1,1 16,16 Z',
    rightPupil:'M54,16 A5,6 0 1,1 64,16 A5,6 0 1,1 54,16 Z',
    leftBrow:  'M8,6 Q21,10 28,6',  // drooping outward
    rightBrow: 'M52,6 Q59,10 72,6',
  },
  suspicious: {
    // One squint, one raised — asymmetric
    leftEye:   'M10,15 Q20,8 30,15 Q20,22 10,15 Z',  // squinting
    rightEye:  'M48,8 A11,14 0 1,1 70,8 A11,14 0 1,1 48,8 Z', // wide
    leftPupil: 'M16,14 A5,4 0 1,1 24,14 A5,4 0 1,1 16,14 Z',
    rightPupil:'M54,11 A6,7 0 1,1 64,11 A6,7 0 1,1 54,11 Z',
    leftBrow:  'M8,8 Q21,4 28,8',
    rightBrow: 'M52,2 Q59,6 72,2',  // raised high
  },
}

// Mouth shapes per mood
const mouthPaths: Record<Mood, string> = {
  cool:      'M25,58 Q40,68 55,58',           // subtle side smirk
  happy:     'M20,55 Q40,75 60,55',           // big smile
  excited:   'M22,52 Q40,78 58,52 Q40,85 22,52 Z', // open oval mouth
  neutral:   'M28,58 Q40,62 52,58',           // flat slight curve
  anxious:   'M25,65 Q40,55 55,65',           // upside down frown
  sad:       'M22,68 Q40,55 58,68',           // deep frown
  suspicious:'M28,60 Q40,66 52,58',           // asymmetric smirk
}

// Body animation per mood
const bodyAnimations: Record<Mood, TargetAndTransition> = {
  cool:      { rotate: [0, -2, 2, 0], transition: { repeat: Infinity, duration: 4 } },
  happy:     { y: [0, -4, 0], transition: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } },
  excited:   { scale: [1, 1.04, 1], rotate: [0, -3, 3, 0], transition: { repeat: Infinity, duration: 0.6 } },
  neutral:   { y: [0, -2, 0], transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' } },
  anxious:   { x: [0, -2, 2, -1, 1, 0], transition: { repeat: Infinity, duration: 0.5 } },
  sad:       { y: [0, 1, 0], transition: { repeat: Infinity, duration: 4, ease: 'easeInOut' } },
  suspicious:{ rotate: [0, -1, 0], transition: { repeat: Infinity, duration: 3 } },
}

// Accent colors per mood
const moodColors: Record<Mood, string> = {
  cool:      '#C8FF00',
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
  animate = true,
  className = ''
}: BotCharacterProps) {
  const color = moodColors[mood]
  const eyes = eyeConfigs[mood]
  const mouth = mouthPaths[mood]
  const bodyAnim = animate ? bodyAnimations[mood] : {}

  // Sweat drops for anxious
  const showSweat = mood === 'anxious'
  // Stars/sparkles for excited
  const showSparkles = mood === 'excited'

  return (
    <motion.div
      className={`relative select-none ${className}`}
      style={{ width: size, height: size }}
      animate={bodyAnim}
      role="img"
      aria-label={`Bot character feeling ${mood}`}
    >
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* === BODY === */}
        {/* Shadow blob under character */}
        <ellipse cx="60" cy="115" rx="28" ry="6" fill="rgba(0,0,0,0.3)" />
        
        {/* Main body — rounded square with personality */}
        <rect
          x="20" y="25"
          width="80" height="80"
          rx="32" ry="32"
          fill={color}
          stroke="#080808"
          strokeWidth="3"
        />
        
        {/* Inner lighter highlight on body */}
        <rect
          x="26" y="30"
          width="30" height="20"
          rx="14" ry="14"
          fill="rgba(255,255,255,0.15)"
        />

        {/* === ARMS === */}
        {/* Left arm */}
        <path
          d="M20,65 Q8,70 12,85 Q16,90 22,82"
          fill={color}
          stroke="#080808"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Right arm */}
        <path
          d="M100,65 Q112,70 108,85 Q104,90 98,82"
          fill={color}
          stroke="#080808"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* === LEGS === */}
        {/* Left leg */}
        <path
          d="M40,100 Q36,112 32,115 Q38,118 44,112 Q46,106 44,100"
          fill={color}
          stroke="#080808"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Right leg */}
        <path
          d="M80,100 Q84,112 88,115 Q82,118 76,112 Q74,106 76,100"
          fill={color}
          stroke="#080808"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* === FACE AREA (white circle) === */}
        <ellipse
          cx="60" cy="58"
          rx="30" ry="28"
          fill="#F5F5F0"
          stroke="#080808"
          strokeWidth="2"
        />

        {/* === EYES === */}
        {/* Left Eye White */}
        <path d={eyes.leftEye} fill="#080808" />
        {/* Left Pupil (white dot in black eye) */}
        <path d={eyes.leftPupil} fill="#F5F5F0" />
        {/* Left eye shine */}
        <circle
          cx={mood === 'sad' ? 20 : 19}
          cy={mood === 'sad' ? 10 : 9}
          r="2"
          fill="white"
          opacity="0.9"
        />

        {/* Right Eye White */}
        <path d={eyes.rightEye} fill="#080808" />
        {/* Right Pupil */}
        <path d={eyes.rightPupil} fill="#F5F5F0" />
        {/* Right eye shine */}
        <circle
          cx={mood === 'sad' ? 56 : 55}
          cy={mood === 'sad' ? 10 : 9}
          r="2"
          fill="white"
          opacity="0.9"
        />

        {/* === EYEBROWS (mood-specific) === */}
        {eyes.leftBrow && (
          <path
            d={eyes.leftBrow}
            fill="none"
            stroke="#080808"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}
        {eyes.rightBrow && (
          <path
            d={eyes.rightBrow}
            fill="none"
            stroke="#080808"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}

        {/* === MOUTH === */}
        <path
          d={mouth}
          fill={mood === 'excited' ? '#080808' : 'none'}
          stroke={mood === 'excited' ? 'none' : '#080808'}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Teeth for excited */}
        {mood === 'excited' && (
          <path
            d="M30,62 Q40,72 50,62 L50,68 Q40,78 30,68 Z"
            fill="white"
          />
        )}

        {/* === SWEAT DROPS (anxious) === */}
        {showSweat && (
          <>
            <ellipse cx="78" cy="30" rx="3" ry="5" fill="#6B9FFF" opacity="0.8" />
            <ellipse cx="85" cy="22" rx="2" ry="3.5" fill="#6B9FFF" opacity="0.6" />
          </>
        )}

        {/* === SPARKLES (excited) === */}
        {showSparkles && (
          <>
            <text x="8" y="35" fontSize="10" fill={color}>✦</text>
            <text x="102" y="30" fontSize="8" fill={color}>✦</text>
            <text x="100" y="50" fontSize="6" fill={color}>✦</text>
          </>
        )}

        {/* === SUSPICIOUS crossed arms detail === */}
        {mood === 'suspicious' && (
          <path
            d="M30,72 Q40,68 50,72 Q60,68 70,72 Q60,76 50,74 Q40,76 30,72 Z"
            fill="rgba(0,0,0,0.2)"
            stroke="#080808"
            strokeWidth="1.5"
          />
        )}
      </svg>
    </motion.div>
  )
}

export default BotCharacter;
