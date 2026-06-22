'use client'

import { motion } from 'framer-motion'
import BotIrisAvatar from './BotIrisAvatar'

/**
 * The bot's live uplink to Brier, drawn like a directed Space-Invaders signal:
 * the alien transmits data packets down a wire to the Brier core. Status is
 * inferred from on-chain activity (the truth) — we read the wallet, not the
 * builder's machine, so we frame it honestly.
 */
export default function BotUplink({
  eye, status, lastFill,
}: {
  eye: { avatarId: string; accentColor: string; shape?: any }
  status: 'live' | 'awaiting'
  lastFill?: string | null
}) {
  const live = status === 'live'
  const accent = live ? '#00d4aa' : '#5a5a5a'

  return (
    <div className="relative rounded-2xl border border-[#1a1a1a] bg-[#070708] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-70" style={{ backgroundImage: 'radial-gradient(1px 1px at 15% 30%,#ffffff22 50%,transparent),radial-gradient(1px 1px at 80% 22%,#ffffff1a 50%,transparent),radial-gradient(1px 1px at 62% 70%,#ffffff22 50%,transparent),radial-gradient(1px 1px at 38% 82%,#ff2a4d33 50%,transparent)' }} />
      <div className="relative p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-[#888]">Uplink</span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-widest" style={{ color: accent }}>
            <span className="relative flex h-2 w-2">
              {live && <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: accent }} />}
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: accent }} />
            </span>
            {live ? 'TRANSMITTING' : 'NO SIGNAL'}
          </span>
        </div>

        <div className="relative flex items-center justify-between h-[92px] px-1">
          {/* alien node */}
          <div className="relative z-10 flex flex-col items-center gap-1.5" style={{ opacity: live ? 1 : 0.4 }}>
            <div className="rounded-lg overflow-hidden border-2" style={{ borderColor: live ? `${accent}66` : '#222' }}>
              <BotIrisAvatar {...eye} size={48} />
            </div>
            <span className="font-mono text-[8px] tracking-[0.2em] text-[#777]">ALIEN</span>
          </div>

          {/* wire */}
          <div className="absolute left-[78px] right-[78px] top-[26px] h-px" style={live ? { background: `${accent}55` } : { borderTop: '1px dashed #242424' }}>
            {live
              ? [0, 1, 2, 3].map(i => (
                  <motion.span key={i} className="absolute top-1/2 w-1.5 h-1.5 rounded-[1px]" style={{ background: accent, marginTop: -3, boxShadow: `0 0 6px ${accent}` }}
                    initial={{ left: '0%', opacity: 0 }}
                    animate={{ left: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.4, ease: 'linear' }} />
                ))
              : <span className="absolute left-1/2 -translate-x-1/2 -top-[7px] bg-[#070708] px-2 font-mono text-[8px] tracking-[0.2em] text-[#555]">link down</span>}
          </div>

          {/* brier core */}
          <div className="relative z-10 flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-full grid place-items-center border-2 border-primary/30">
              <motion.span className="rounded-full bg-primary" style={{ width: 18, height: 18 }}
                animate={live ? { boxShadow: ['0 0 6px #ff2a4d', '0 0 18px #ff2a4d', '0 0 6px #ff2a4d'] } : {}}
                transition={{ duration: 2, repeat: Infinity }} />
            </div>
            <span className="font-mono text-[8px] tracking-[0.2em] text-[#777]">BRIER</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px bg-[#161616] border border-[#161616] rounded-lg overflow-hidden mt-3">
          {([
            ['Node', live ? 'ONLINE' : 'OFFLINE', live ? '#00d4aa' : '#ff5570'],
            ['Signal', live ? 'RECEIVING' : 'SILENT', live ? '#00d4aa' : '#777'],
            ['Last fill', lastFill || 'never', '#e8e8e8'],
          ] as [string, string, string][]).map(([k, v, c]) => (
            <div key={k} className="bg-[#070708] px-3 py-2">
              <div className="text-[8px] font-mono text-[#555] tracking-[0.18em] uppercase mb-0.5">{k}</div>
              <div className="font-mono font-bold text-[12px] tabular-nums" style={{ color: c }}>{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-2.5 text-[10px] text-[#555] leading-relaxed">Inferred from on-chain activity. Brier watches the wallet, not the machine.</div>
      </div>
    </div>
  )
}
