'use client'

import { useEffect, useState } from 'react'

/**
 * Everything is on-chain: un block explorer real. Cada bloque muestra un hecho verificable
 * encadenado al anterior por su hash (Prediction -> Resolution -> Score -> Vault).
 * Profundidad 3D con CSS perspective, bloque activo que recorre la cadena, paquetes de datos
 * que fluyen entre bloques. Legible y premium. Inglés, Inter/JetBrains Mono, sin guiones.
 */

const BLOCKS = [
  {
    n: '418', kind: 'PREDICTION', hash: '0x4a1f9c', prev: '0x9c2e07',
    rows: [['event', 'BTC > $100k'], ['forecast', '0.62'], ['stake', 'paper']],
  },
  {
    n: '419', kind: 'RESOLUTION', hash: '0x1b7d44', prev: '0x4a1f9c',
    rows: [['outcome', 'YES'], ['result', 'WIN'], ['oracle', 'Polymarket']],
  },
  {
    n: '420', kind: 'SCORE', hash: '0xe05a18', prev: '0x1b7d44',
    rows: [['brier', '0.149'], ['win rate', '67%'], ['method', 'proper']],
  },
  {
    n: '421', kind: 'VAULT', hash: '0x7d3bb2', prev: '0xe05a18',
    rows: [['deposit', 'settled'], ['nav', 'updated'], ['split', '60/30/10']],
  },
]
const N = BLOCKS.length

export default function BlockchainStrip() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % N), 1700)
    return () => clearInterval(id)
  }, [])

  return (
    <div>
      <style>{`
        @keyframes brierPkt { 0%{left:2%;opacity:0} 12%{opacity:1} 88%{opacity:1} 100%{left:98%;opacity:0} }
        .brier-chain { perspective: 1500px; }
        .brier-blk { transform: rotateY(-12deg) rotateX(3deg); transform-style: preserve-3d; transition: transform .5s cubic-bezier(.16,1,.3,1), border-color .4s, box-shadow .4s; }
        .brier-blk:hover { transform: rotateY(-4deg) translateZ(28px); }
        .brier-blk.on { transform: rotateY(-6deg) translateZ(34px); border-color: rgba(255,42,77,.55); box-shadow: 0 0 44px rgba(255,42,77,.18), inset 0 0 0 1px rgba(255,42,77,.25); }
      `}</style>

      <div className="brier-chain flex items-stretch justify-center gap-0 overflow-x-auto pb-4 px-2">
        {BLOCKS.map((b, i) => (
          <div key={b.n} className="flex items-center shrink-0">
            {/* bloque */}
            <div className={`brier-blk relative w-[208px] bg-gradient-to-b from-[#0c0c11] to-[#070709] border border-[#1e1e26] ${active === i ? 'on' : ''}`}>
              {/* corner ticks */}
              <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-primary/50" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-primary/50" />

              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#17171d]">
                <span className="font-mono text-[12px] font-bold text-white">BLOCK #{b.n}</span>
                <span className={`font-mono text-[8px] tracking-widest ${active === i ? 'text-primary' : 'text-[#555]'}`}>{active === i ? 'LIVE' : 'SEALED'}</span>
              </div>

              <div className="px-4 py-3 font-mono text-[10px] tracking-[0.18em] text-primary mb-1">{b.kind}</div>

              <div className="px-4 pb-3 space-y-1.5">
                {b.rows.map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[11px] font-mono">
                    <span className="text-[#666]">{k}</span>
                    <span className="text-[#e8e8e8]">{v}</span>
                  </div>
                ))}
              </div>

              <div className="px-4 py-2.5 border-t border-[#17171d] font-mono text-[9px] leading-relaxed">
                <div className="text-[#777]">hash <span className="text-primary">{b.hash}</span></div>
                <div className="text-[#444]">prev {b.prev}</div>
              </div>
            </div>

            {/* conector con paquete que fluye */}
            {i < N - 1 && (
              <div className="relative w-10 md:w-16 h-px bg-[#222] mx-1 shrink-0">
                <span
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(255,42,77,0.8)]"
                  style={{ animation: `brierPkt 1.7s linear infinite`, animationDelay: `${i * 0.4}s` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-center mt-6 font-mono text-[10px] text-[#555] tracking-wider">
        every block links to the last by its hash, immutable and public
      </div>
    </div>
  )
}
