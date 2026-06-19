'use client'

import { useState } from 'react'

/**
 * Wordmark gigante "Brier." con efecto Wave (Efecto 2 aprobado).
 * Al pasar el mouse: las letras rebotan en secuencia, el relleno se vuelve hueco
 * (contorno, dejando ver el negro del fondo) y aparece "start vaultmaxxing".
 * Se usa SOLO en el footer del landing. Mantiene Inter + punto rojo intactos.
 */
export default function WaveWordmark({ className = '' }: { className?: string }) {
  const [hover, setHover] = useState(false)

  const letters = ['B', 'r', 'i', 'e', 'r']

  return (
    <div
      className={`relative select-none cursor-pointer leading-none ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role="img"
      aria-label="Brier"
    >
      {letters.map((ch, i) => (
        <span
          key={i}
          className="inline-block font-sans font-extrabold tracking-[-0.05em]"
          style={{
            transform: hover ? 'translateY(-0.1em)' : 'translateY(0)',
            transition: 'transform 0.42s cubic-bezier(.34,1.56,.64,1), color 0.3s ease, -webkit-text-stroke-color 0.3s ease',
            transitionDelay: `${i * 55}ms`,
            color: hover ? 'transparent' : '#ffffff',
            WebkitTextStroke: hover ? '2px #ffffff' : '0px transparent',
          }}
        >
          {ch}
        </span>
      ))}
      <span
        className="inline-block font-sans font-extrabold tracking-[-0.05em] text-primary"
        style={{
          transform: hover ? 'translateY(-0.1em)' : 'translateY(0)',
          transition: 'transform 0.42s cubic-bezier(.34,1.56,.64,1)',
          transitionDelay: `${letters.length * 55}ms`,
        }}
      >
        .
      </span>

      {/* aparece al hover */}
      <div
        className="absolute left-1/2 -translate-x-1/2 font-mono uppercase tracking-[0.3em] text-primary whitespace-nowrap"
        style={{
          bottom: '-0.2em',
          fontSize: '0.085em',
          opacity: hover ? 1 : 0,
          transform: hover ? 'translate(-50%, 0)' : 'translate(-50%, 0.6em)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        start vaultmaxxing
      </div>
    </div>
  )
}
