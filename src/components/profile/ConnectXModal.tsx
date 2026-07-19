'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Lightweight X (Twitter) linking. We don't run OAuth yet, so this stores the
 * handle the user enters and never claims verification — xVerified stays false
 * until a real OAuth flow confirms ownership. Structured so that flow can drop
 * in later without changing the call sites.
 */
export function XLogo({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export default function ConnectXModal({
  open, initial, onClose, onSave, wallet,
}: {
  open: boolean
  initial?: string | null
  onClose: () => void
  onSave: (handle: string | null) => Promise<void>
  /** When provided, enables the real X OAuth flow (verified link). */
  wallet?: string | null
}) {
  const [val, setVal] = useState(initial || '')
  const [saving, setSaving] = useState(false)

  const clean = val.trim().replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '').replace(/^@/, '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15)

  const submit = async (handle: string | null) => {
    setSaving(true)
    try { await onSave(handle); onClose() } finally { setSaving(false) }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[10000] grid place-items-center bg-black/70 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-[400px] rounded-2xl border border-[#1f1f28] bg-[#0a0a0e] p-7 shadow-2xl relative overflow-hidden"
            initial={{ scale: 0.94, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Subtle background glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#fff]/5 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="flex flex-col items-center justify-center text-center mb-6">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg animate-pulse" />
                  <span className="relative grid place-items-center w-12 h-12 rounded-xl bg-gradient-to-b from-white to-[#e0e0e0] text-black shadow-lg">
                    <XLogo size={20} />
                  </span>
                </div>
                <h3 className="font-sans font-bold text-[20px] text-white tracking-tight mb-2">Initialize X Uplink</h3>
                <p className="text-[13px] text-[#8a8a94] leading-relaxed max-w-[280px]">
                  Securely link your X identity to Brier. Let traders verify the mastermind behind the algorithms.
                </p>
              </div>

              {wallet && !initial && (
                <button
                  onClick={() => { window.location.href = `/api/auth/twitter?wallet=${wallet}` }}
                  className="group relative w-full flex items-center justify-center gap-2 rounded-xl bg-white text-black font-bold text-[14px] py-3.5 mb-2 hover:bg-[#f0f0f0] transition-all overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 group-hover:opacity-100 group-hover:animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                  <span className="relative z-10 flex items-center gap-2">
                    <XLogo size={15} /> Authenticate via X
                  </span>
                </button>
              )}

              {initial && (
                <div className="mt-2 mb-6">
                  <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[#5a5a64] block mb-2 text-center">Verified Identity</span>
                  <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 shadow-[0_0_15px_rgba(255,42,77,0.05)]">
                    <XLogo size={14} className="text-white" />
                    <span className="text-[15px] text-white font-mono font-medium">@{initial}</span>
                    <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="font-mono text-[9px] uppercase tracking-wider text-primary">Active</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#1f1f28]">
                {initial ? (
                  <button onClick={() => submit(null)} disabled={saving} className="font-mono text-[11px] uppercase tracking-widest text-[#ff5570] hover:text-[#ff7a8c] transition-colors disabled:opacity-40">
                    {saving ? 'Severing…' : 'Sever Link'}
                  </button>
                ) : <span />}
                <button onClick={onClose} className="rounded-full bg-[#12121a] border border-[#262630] px-5 py-2 text-[12px] font-semibold text-[#aaa] hover:text-white hover:border-[#3a3a44] transition-all">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
