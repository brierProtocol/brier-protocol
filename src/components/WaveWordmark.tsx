'use client'

import { useState } from 'react'

/**
 * Wordmark gigante "Brier." en el footer.
 * Las letras siguen un efecto Wave al pasar el mouse (rebotan en secuencia).
 * "start vaultmaxxing" va SIEMPRE visible debajo, en itálica elegante.
 * Mantiene Inter + punto rojo intactos.
 */
export default function WaveWordmark({ className = '' }: { className?: string }) {
  const [hover, setHover] = useState(false)
  const letters = ['B', 'r', 'i', 'e', 'r']

  return (
    <div className="flex flex-col items-center select-none">
      <div
        className={`cursor-pointer leading-none ${className}`}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        role="img"
        aria-label="Brier"
      >
        {letters.map((ch, i) => (
          <span
            key={i}
            className="inline-block font-sans font-extrabold tracking-[-0.05em] text-white"
            style={{
              transform: hover ? 'translateY(-0.1em)' : 'translateY(0)',
              transition: 'transform 0.42s cubic-bezier(.34,1.56,.64,1)',
              transitionDelay: `${i * 55}ms`,
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
      </div>

      {/* siempre visible, itálica elegante */}
      <div className="mt-2 italic font-sans text-[#9a9a9a] tracking-[0.04em] text-[clamp(13px,1.6vw,20px)]">
        start vaultmaxxing
      </div>
    </div>
  )
}
