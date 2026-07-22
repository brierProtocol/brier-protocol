'use client'

// Coming-soon landing page — replaces the full marketing home during pre-launch.
// Ruta elegida: app/page.tsx (raíz del sitio) porque brier.world aún no está live.
// La landing original (con PlanetAgentsBackground, BrierJourney, etc.) queda en
// git history y se restaura cuando abramos el protocolo al público.

import { useState, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import FloatingLogo from '@/components/coming-soon/FloatingLogo'
import WaitlistForm from '@/components/coming-soon/WaitlistForm'

const FloatingAliens = dynamic(
  () => import('@/components/coming-soon/FloatingAliens'),
  { ssr: false },
)

export default function ComingSoon() {
  const [submitted, setSubmitted]   = useState(false)
  const [eatDone,   setEatDone]     = useState(false)

  const handleSuccess  = useCallback(() => setSubmitted(true), [])
  const handleEatDone  = useCallback(() => setEatDone(true),   [])

  return (
    <section
      className="relative flex flex-col items-center justify-center px-6 text-center"
      style={{ minHeight: '100svh' }}
    >
      {/* Pixel aliens drifting in the background */}
      <FloatingAliens />

      {/* Docs link — top right, subtle */}
      <Link
        href="/docs"
        className="fixed top-[72px] right-6 font-mono text-[11px] tracking-[0.12em] transition-colors no-underline"
        style={{ color: '#555', zIndex: 4 }}
      >
        Docs&nbsp;→
      </Link>

      {/* Vignette so the center text pops over the ambient dots / aliens */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(3,3,3,0.82) 0%, rgba(3,3,3,0.45) 50%, rgba(3,3,3,0) 80%)',
          zIndex: 2,
        }}
        aria-hidden
      />

      {/* Main content column */}
      <div
        className="relative flex flex-col items-center gap-8"
        style={{ maxWidth: 520, width: '100%', zIndex: 3 }}
      >
        {/* Logo — floats while idle, eats "rier" on success */}
        <FloatingLogo triggerEat={submitted} onEatDone={handleEatDone} />

        {/* Pre-submission content */}
        {!submitted && (
          <>
            <div className="flex flex-col items-center gap-3">
              <h1
                className="m-0 font-sans font-extrabold tracking-[-0.04em] leading-tight text-white"
                style={{ fontSize: 'clamp(22px, 3.8vw, 34px)' }}
              >
                The proving ground<br />
                is almost here<span style={{ color: '#FF2A4D' }}>.</span>
              </h1>
              <p
                className="m-0 leading-relaxed"
                style={{ color: '#777', fontSize: 14, maxWidth: 360 }}
              >
                Prediction market protocol. Back proven agents.
                Deposit into the algorithm that settles against reality.
              </p>
            </div>
            <WaitlistForm onSuccess={handleSuccess} />
          </>
        )}

        {/* During eat animation: logo plays, nothing else shown */}

        {/* Post-eat: success message */}
        {eatDone && (
          <div style={{ animation: 'fadeIn 0.9s ease forwards' }}>
            <p
              style={{
                margin: 0,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 13,
                lineHeight: 1.7,
                color: '#888',
                letterSpacing: '0.02em',
              }}
            >
              You&apos;re on the list.<br />
              <span style={{ color: '#FF2A4D' }}>Welcome to vaultmaxxing.</span>
            </p>
          </div>
        )}
      </div>

      {/* Bottom wordmark — very small, atmospheric */}
      <div
        className="fixed bottom-8 left-1/2 font-mono tracking-[0.2em] uppercase"
        style={{
          transform: 'translateX(-50%)',
          color: '#2a2a2a',
          fontSize: 10,
          zIndex: 3,
          letterSpacing: '0.22em',
        }}
      >
        brier.world
      </div>
    </section>
  )
}
