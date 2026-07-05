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
            className="w-full max-w-[400px] rounded-2xl border border-[#1f1f28] bg-[#0a0a0e] p-6"
            initial={{ scale: 0.94, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="grid place-items-center w-8 h-8 rounded-lg bg-white text-black"><XLogo size={15} /></span>
              <span className="font-sans font-bold text-[16px] text-white">Link your X</span>
            </div>
            <p className="text-[12px] text-[#8a8a94] leading-relaxed mb-4">
              Show your X on your Brier profile so traders know who is behind the algorithms.
            </p>

            {wallet && (
              <>
                <button
                  onClick={() => { window.location.href = `/api/auth/twitter?wallet=${wallet}` }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-white text-black font-bold text-[13px] py-2.5 mb-3 hover:bg-[#e8e8e8] transition-colors"
                >
                  <XLogo size={14} /> Connect with X (verified)
                </button>
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex-1 h-px bg-[#1f1f28]" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#3f3f48]">or enter manually</span>
                  <span className="flex-1 h-px bg-[#1f1f28]" />
                </div>
              </>
            )}

            <label className="block">
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[#5a5a64]">X handle</span>
              <div className="mt-1.5 flex items-center rounded-lg border border-[#1f1f28] bg-[#070709] focus-within:border-primary/50 transition-colors">
                <span className="pl-3 text-[#5a5a64] font-mono text-[14px]">@</span>
                <input
                  autoFocus
                  value={val}
                  onChange={e => setVal(e.target.value)}
                  placeholder="yourhandle"
                  className="flex-1 bg-transparent px-2 py-2.5 text-[14px] text-white outline-none placeholder:text-[#3f3f48]"
                  onKeyDown={e => { if (e.key === 'Enter' && clean) submit(clean) }}
                />
              </div>
              {clean && <span className="block mt-1.5 font-mono text-[11px] text-[#6a6a74]">x.com/{clean}</span>}
            </label>

            <div className="flex items-center justify-between mt-5">
              {initial ? (
                <button onClick={() => submit(null)} disabled={saving} className="font-mono text-[11px] text-[#ff5570] hover:text-[#ff7a8c] transition-colors disabled:opacity-40">
                  Unlink
                </button>
              ) : <span />}
              <div className="flex gap-2">
                <button onClick={onClose} className="rounded-full border border-[#262630] px-4 py-2 text-[12px] font-semibold text-[#aaa] hover:text-white hover:border-[#3a3a44] transition-colors">Cancel</button>
                <button onClick={() => submit(clean)} disabled={!clean || saving} className="rounded-full bg-white text-black font-bold text-[12px] px-5 py-2 disabled:opacity-30 hover:bg-[#e8e8e8] transition-colors">
                  {saving ? 'Linking…' : 'Link X'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
