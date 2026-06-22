'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import { botEye } from '@/lib/botIdentity'

type SearchBot = { id: string; name: string; slug: string; status: string; tier: string; pfpUrl: string | null }
type SearchUser = { walletAddress: string; name: string | null; handle: string | null; pfpUrl: string | null }

// Search the arena: finds published algorithms (bots) and logged-in operators
// (users) through /api/search. Styled to match the rest of the product.
export default function ArenaSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ bots: SearchBot[]; users: SearchUser[] }>({ bots: [], users: [] })
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) { setResults({ bots: [], users: [] }); setLoading(false); return }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) setResults(await res.json())
      } catch { /* ignore */ }
      setLoading(false)
    }, 280)
    return () => clearTimeout(t)
  }, [query])

  const hasResults = results.bots.length > 0 || results.users.length > 0
  const go = (href: string) => { setOpen(false); setQuery(''); router.push(href) }

  return (
    <div className="mt-20">
      <div className="mb-5">
        <h2 className="m-0 text-white font-sans font-extrabold tracking-tight text-[22px]">Search the arena</h2>
        <div className="text-[11px] text-[#8a8a8a] font-mono mt-1.5 tracking-wider">find any algorithm or the operator behind it.</div>
      </div>

      <div ref={ref} className="relative max-w-2xl">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666] pointer-events-none">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.2-4.2" />
          </svg>
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search algorithms and operators…"
          className="w-full bg-[#0a0a0a] border border-[#1f1f1f] text-white font-sans text-[14px] outline-none transition-all pl-11 pr-4 py-3.5 rounded-xl placeholder:text-[#555] focus:border-primary/50 focus:bg-[#0c0c0c] focus:shadow-[0_0_24px_rgba(255,42,77,0.08)] hover:border-[#2a2a2a]"
        />

        <AnimatePresence>
          {open && query.trim().length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.99 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="absolute top-full mt-2 left-0 right-0 bg-[rgba(7,7,8,0.97)] backdrop-blur-xl border border-[#1f1f1f] rounded-xl z-50 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              {loading && !hasResults ? (
                <div className="p-5 text-center text-[11px] text-[#555] font-mono">Searching…</div>
              ) : !hasResults ? (
                <div className="p-5 text-center text-[11px] text-[#555] font-mono">No matches for &ldquo;{query}&rdquo;</div>
              ) : (
                <div className="max-h-[340px] overflow-y-auto scrollbar-thin py-1">
                  {results.bots.length > 0 && (
                    <div className="px-2 py-1.5">
                      <div className="px-2 text-[9px] text-[#666] font-mono font-semibold tracking-[0.18em] uppercase mb-1">Algorithms</div>
                      {results.bots.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => go(`/bot/${b.slug}`)}
                          className="w-full text-left px-2 py-2 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors flex items-center gap-3 group"
                        >
                          <span className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full overflow-hidden border border-[#222] group-hover:border-[#3a3a3a] transition-colors">
                            <BotIrisAvatar {...botEye(b as any)} size={28} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13px] text-white font-sans font-semibold truncate group-hover:text-primary transition-colors">{b.name}</span>
                            <span className="block text-[10px] text-[#666] font-mono truncate">{b.status?.toLowerCase()}</span>
                          </span>
                          <span className="text-[#444] group-hover:text-primary transition-colors text-xs">→</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {results.users.length > 0 && (
                    <div className="px-2 py-1.5 border-t border-[#161616]">
                      <div className="px-2 text-[9px] text-[#666] font-mono font-semibold tracking-[0.18em] uppercase mb-1">Operators</div>
                      {results.users.map((u) => (
                        <button
                          key={u.walletAddress}
                          onClick={() => go(`/maker/${u.walletAddress}`)}
                          className="w-full text-left px-2 py-2 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors flex items-center gap-3 group"
                        >
                          {u.pfpUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.pfpUrl} alt="" className="w-7 h-7 shrink-0 rounded-full object-cover border border-[#222] group-hover:border-[#3a3a3a] transition-colors" />
                          ) : (
                            <span className="w-7 h-7 shrink-0 rounded-full bg-[#0f0f0f] border border-[#222] flex items-center justify-center text-[9px] text-[#555] font-mono group-hover:border-[#3a3a3a] transition-colors">
                              {(u.handle || u.name || '0x')[0]?.toUpperCase()}
                            </span>
                          )}
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13px] text-white font-sans font-semibold truncate group-hover:text-primary transition-colors">{u.handle ? `@${u.handle}` : (u.name || 'Anonymous')}</span>
                            <span className="block text-[10px] text-[#666] font-mono truncate">{u.walletAddress.substring(0, 10)}…</span>
                          </span>
                          <span className="text-[#444] group-hover:text-primary transition-colors text-xs">→</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
