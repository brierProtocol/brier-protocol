'use client'

import { useState } from 'react'

/**
 * Wordmark gigante "Brier." con efecto Wave (Efecto 2 aprobado).
 * Las letras rebotan hacia arriba en secuencia al pasar el mouse o hacer click.
 * Se usa SOLO en el footer del landing. Mantiene Inter + punto rojo intactos.
 */
export default function WaveWordmark({ className = '' }: { className?: string }) {
  const [wave, setWave] = useState(false)

  const letters = ['B', 'r', 'i', 'e', 'r']

  const trigger = () => {
    setWave(true)
    window.setTimeout(() => setWave(false), 900)
  }

  return (
    <div
      className={`select-none cursor-pointer leading-none ${className}`}
      onMouseEnter={trigger}
      onClick={trigger}
      role="img"
      aria-label="Brier"
    >
      {letters.map((ch, i) => (
        <span
          key={i}
          className="inline-block font-sans font-extrabold tracking-[-0.05em] text-white"
          style={{
            transform: wave ? 'translateY(-0.12em)' : 'translateY(0)',
            transition: 'transform 0.42s cubic-bezier(.34,1.56,.64,1)',
            transitionDelay: `${i * 60}ms`,
          }}
        >
          {ch}
        </span>
      ))}
      <span
        className="inline-block font-sans font-extrabold tracking-[-0.05em] text-primary"
        style={{
          transform: wave ? 'translateY(-0.12em)' : 'translateY(0)',
          transition: 'transform 0.42s cubic-bezier(.34,1.56,.64,1)',
          transitionDelay: `${letters.length * 60}ms`,
        }}
      >
        .
      </span>
    </div>
  )
}
