'use client'

import { useRef, useLayoutEffect, useState, useEffect, useCallback } from 'react'

interface Props {
  triggerEat: boolean
  onEatDone: () => void
}

// Matches Inter 800 tracking-[-0.04em] used throughout brier.world
const FONT: React.CSSProperties = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontWeight: 800,
  fontSize: 'clamp(52px, 9vw, 108px)',
  letterSpacing: '-0.04em',
  lineHeight: 1,
  color: '#ffffff',
  whiteSpace: 'nowrap',
  display: 'inline-block',
}

const EAT_EASE = 'cubic-bezier(0.65, 0, 0.35, 1)'
const EAT_DUR  = 1200 // ms

export default function FloatingLogo({ triggerEat, onEatDone }: Props) {
  const rFull = useRef<HTMLSpanElement>(null)
  const rB    = useRef<HTMLSpanElement>(null)

  // Measured pixel dimensions of "Brier" and "B" in Inter 800 at current font size
  const [m, setM] = useState<{ full: number; b: number; h: number } | null>(null)
  const [eating, setEating] = useState(false)

  const remeasure = useCallback(() => {
    if (!rFull.current || !rB.current) return
    const fr = rFull.current.getBoundingClientRect()
    const br = rB.current.getBoundingClientRect()
    if (fr.width > 0) setM({ full: fr.width, b: br.width, h: fr.height })
  }, [])

  useLayoutEffect(() => {
    remeasure()
    window.addEventListener('resize', remeasure)
    return () => window.removeEventListener('resize', remeasure)
  }, [remeasure])

  // Re-measure after fonts load (Google Fonts are async)
  useEffect(() => {
    const t = setTimeout(remeasure, 250)
    return () => clearTimeout(t)
  }, [remeasure])

  useEffect(() => {
    if (!triggerEat) return
    setEating(true)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const delay = reducedMotion ? 0 : EAT_DUR + 150
    const t = setTimeout(onEatDone, delay)
    return () => clearTimeout(t)
  }, [triggerEat, onEatDone])

  const DOT_PX  = m ? Math.max(12, m.h * 0.14) : 14
  const GAP     = m ? m.h * 0.055 : 7
  const DOT_BOT = m ? m.h * 0.07 : 5

  // During eat: clip width shrinks from fullWidth → bWidth; dot moves with it
  const clipW   = (eating && m) ? m.b : (m?.full ?? undefined)
  const dotLeft = (eating && m) ? m.b + GAP : (m ? m.full + GAP : undefined)

  // Fixed outer width so the logo never reflows/recenters during the animation
  const outerW  = m ? m.full + GAP + DOT_PX + 4 : undefined
  const outerH  = m ? m.h : undefined

  const noMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const eatTransition = !noMotion ? `${EAT_DUR}ms ${EAT_EASE}` : 'none'

  return (
    <div
      style={{
        animation: (eating || noMotion) ? 'none' : 'logoFloat 7s ease-in-out infinite',
      }}
    >
      {/* Offscreen measurement spans — positioned fixed so they don't affect layout */}
      <div
        style={{ position: 'fixed', top: -9999, left: 0, opacity: 0, pointerEvents: 'none' }}
        aria-hidden
      >
        <span ref={rFull} style={FONT}>Brier</span>
        <span ref={rB}    style={FONT}>B</span>
      </div>

      {/* Logo container — fixed size prevents recentering during animation */}
      <div style={{ position: 'relative', width: outerW, height: outerH, flexShrink: 0 }}>
        {/* "Brier" with animated clip — right edge slides left to eat "rier" */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            overflow: 'hidden',
            width: clipW,
            height: '100%',
            transition: eating ? `width ${eatTransition}` : 'none',
          }}
        >
          <span style={FONT}>Brier</span>
        </div>

        {/* Red dot — slides left alongside the shrinking clip boundary */}
        <div
          style={{
            position: 'absolute',
            left: dotLeft,
            bottom: DOT_BOT,
            width: DOT_PX,
            height: DOT_PX,
            borderRadius: '50%',
            background: '#FF2A4D',
            flexShrink: 0,
            boxShadow: `0 0 ${DOT_PX}px rgba(255,42,77,0.9), 0 0 ${DOT_PX * 2}px rgba(255,42,77,0.4)`,
            transition: eating ? `left ${eatTransition}` : 'none',
          }}
        />
      </div>
    </div>
  )
}
