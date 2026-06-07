'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { motion, AnimatePresence } from 'framer-motion'
import BotIrisAvatar from './BotIrisAvatar'
import { botEye } from '@/lib/botIdentity'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  createdAt: string
  read: boolean
}

function NotificationBell({ address }: { address: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?address=${address}`)
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
    } catch {
    }
  }, [address])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleOpen() {
    setOpen((prev) => !prev)
    if (!open && notifications.some(n => !n.read)) {
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, markAll: true }),
        })
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      } catch { }
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        onClick={handleOpen}
        className="bg-transparent border border-[#222] rounded-none text-[#888] font-sans text-[11px] font-medium px-3 py-1 cursor-pointer transition-colors hover:border-[#444] hover:text-white tracking-wide"
        aria-label="Notifications"
      >
        [ ALERTS ]
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-primary text-[#030303] text-[10px] font-bold h-4 min-w-[16px] flex items-center justify-center px-1 shadow-[0_0_10px_rgba(255,42,77,0.5)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-0 top-[calc(100%+8px)] w-[340px] bg-[#0a0a0a] border border-[#1a1a1a] z-[100] shadow-[0_4px_24px_rgba(0,0,0,0.5)] overflow-hidden origin-top"
          >
          <div className="p-3 border-b border-[#1a1a1a] flex justify-between items-center">
            <span className="font-sans text-[11px] text-white tracking-wide uppercase font-semibold">Alerts</span>
            {notifications.length > 0 && (
              <span className="font-mono text-[10px] text-primary font-bold">
                {notifications.length} EVT
              </span>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="p-6 text-center font-mono text-xs text-[#555]">NO NEW EVENTS</div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto scrollbar-thin">
              {notifications.slice(0, 8).map((n) => (
                <div key={n.id} className={`p-3 border-b border-[#1a1a1a] ${n.read ? 'bg-transparent' : 'bg-[#111]'}`}>
                  <div className="font-mono text-xs text-primary mb-1 flex gap-2 items-start font-bold">
                    <span>&gt;</span>
                    <span>{n.title}</span>
                  </div>
                  <div className="font-mono text-[11px] text-[#FFFFFF] leading-relaxed pl-4">
                    {n.message}
                  </div>
                  <div className="font-mono text-[10px] text-[#555] mt-1 pl-4">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function GlobalSearch({ isLarge = false }: { isLarge?: boolean } = {}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{bots: any[], users: any[]}>({bots: [], users: []})
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.length < 2) {
      setResults({bots: [], users: []})
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) setResults(await res.json())
      } catch (e) {}
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className={`relative ${isLarge ? 'w-full max-w-2xl mx-auto mb-16' : 'mr-4'}`} ref={searchRef}>
      <input 
        type="text"
        placeholder="Search bots..."
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        className={`bg-[#0a0a0a] border border-[#222] text-white font-sans outline-none transition-all placeholder:text-[#555] focus:border-[#444] focus:shadow-none hover:border-[#444] ${isLarge ? 'w-full text-sm px-4 py-3' : 'w-48 text-[11px] px-3 py-[6px]'}`}
      />
      
      <AnimatePresence>
        {open && query.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute top-full mt-2 left-0 bg-[rgba(3,3,3,0.95)] backdrop-blur-md border border-[#1a1a1a] z-[100] shadow-[0_4px_24px_rgba(0,0,0,0.5)] overflow-hidden ${isLarge ? 'w-full' : 'w-64'}`}
          >
            <div className="p-2 border-b border-[#1a1a1a] bg-[#0a0a0a]">
              <span className="font-sans text-[9px] text-[#888] tracking-wide font-medium uppercase">Results</span>
            </div>
            {results.bots.length === 0 && results.users.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-[#555] font-sans">No matches found</div>
            ) : (
              <div className="max-h-64 overflow-y-auto scrollbar-thin">
                {results.bots.length > 0 && (
                  <div className="p-2">
                    <div className="text-[10px] text-[#888] font-sans font-medium mb-2 tracking-wide uppercase">Algorithms</div>
                    {results.bots.map(b => (
                      <div 
                        key={b.id} 
                        className="p-2 border border-transparent hover:bg-[#111] hover:border-[#222] cursor-pointer transition-all mb-1 flex items-center gap-2 group"
                        onClick={() => { setOpen(false); setQuery(''); router.push(`/bot/${b.slug}`) }}
                      >
                        <div className="w-6 h-6 flex items-center justify-center rounded-full overflow-hidden border border-[#222] group-hover:border-[#444] transition-colors">
                          <BotIrisAvatar {...botEye(b)} size={24} />
                        </div>
                        <div>
                          <div className="text-[11px] text-white font-semibold font-sans group-hover:text-primary transition-colors">{b.name}</div>
                          <div className="text-[10px] text-[#666] font-sans">{b.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {results.users.length > 0 && (
                  <div className="p-2 border-t border-[#1a1a1a] bg-[rgba(0,0,0,0.2)]">
                    <div className="text-[10px] text-[#888] font-sans font-medium mb-2 tracking-wide uppercase">Operators</div>
                    {results.users.map(u => (
                      <div 
                        key={u.walletAddress} 
                        className="p-2 border border-transparent hover:bg-[#111] hover:border-[#222] cursor-pointer transition-all mb-1 flex items-center gap-2 group"
                        onClick={() => { setOpen(false); setQuery(''); router.push(`/maker/${u.walletAddress}`) }}
                      >
                        {u.pfpUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.pfpUrl} alt="pfp" className="w-6 h-6 rounded-none border border-[#222] group-hover:border-[#444] transition-colors" />
                        ) : (
                          <div className="w-6 h-6 bg-[#0a0a0a] border border-[#222] flex items-center justify-center text-[8px] text-[#555] group-hover:border-[#444] group-hover:text-white transition-colors">
                            usr
                          </div>
                        )}
                        <div>
                          <div className="text-[11px] text-white font-semibold font-sans group-hover:text-primary transition-colors">{u.name || 'Anonymous'}</div>
                          <div className="text-[10px] text-[#555] font-mono">{u.walletAddress.substring(0,8)}...</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Navbar() {
  const { address, isConnected } = useAccount()
  const pathname = usePathname()

  const navLinks = [
    { href: '/leaderboard', label: 'LEADERBOARD' },
    { href: '/discover',    label: 'DISCOVER'    },
    { href: '/list-bot',    label: 'DEPLOY_BOT'  },
    { href: '/dashboard',   label: 'DASHBOARD'   },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-[rgba(3,3,3,0.95)] backdrop-blur-md border-b border-[#1a1a1a] h-14 flex items-center px-6">
      <Link href="/" className="font-mono text-sm font-bold text-primary no-underline mr-8 flex items-center relative group">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140px] h-[60px] bg-[radial-gradient(ellipse_at_center,rgba(255,42,77,0.15)_0%,transparent_70%)] blur-md pointer-events-none -z-10 transition-opacity opacity-50 group-hover:opacity-100" />
        <pre className="whitespace-pre text-[5px] leading-[6px] font-bold drop-shadow-[0_0_5px_rgba(255,42,77,0.4)] transition-all group-hover:drop-shadow-[0_0_15px_rgba(255,42,77,0.8)] m-0">
{`    ____       _           
   / __ )_____(_)__  _____ 
  / __  / ___/ / _ \\/ ___/ 
 / /_/ / /  / /  __/ /     
/_____/_/  /_/\\___/_/      `}
        </pre>
      </Link>

      <div className="flex items-center gap-1 flex-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`font-sans text-[11px] no-underline px-3 py-[6px] tracking-wide transition-colors font-medium ${
              pathname === link.href 
                ? 'text-white border-b-2 border-primary bg-transparent' 
                : 'text-[#888] bg-transparent border-b-2 border-transparent hover:text-white'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <GlobalSearch />
        
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openChainModal, openConnectModal, authenticationStatus, mounted }) => {
            const ready = mounted && authenticationStatus !== 'loading'
            const connected = ready && account && chain && (!authenticationStatus || authenticationStatus === 'authenticated')

            const btnBase = "border-none font-mono text-[11px] font-bold px-3 py-1 cursor-pointer tracking-widest"

            return (
              <div {...(!ready && { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none' } })}>
                {(() => {
                  if (!connected) {
                    return (
                      <button onClick={openConnectModal} type="button" className={`${btnBase} bg-primary text-[#030303] shadow-[0_0_10px_rgba(255,42,77,0.2)] hover:shadow-[0_0_15px_rgba(255,42,77,0.4)] transition-all`}>
                        [CONNECT_WALLET]
                      </button>
                    )
                  }
                  if (chain.unsupported) {
                    return (
                      <button onClick={openChainModal} type="button" className={`${btnBase} bg-primary text-[#030303]`}>
                        [WRONG_NETWORK]
                      </button>
                    )
                  }
                  return (
                    <div className="flex items-center gap-2">
                      <NotificationBell address={account.address} />
                      <Link href={`/maker/${account.address}`} className={`${btnBase} bg-[#110508] border border-primary text-primary hover:bg-primary hover:text-[#030303] transition-colors no-underline flex items-center`}>
                        [PROFILE]
                      </Link>
                      <button onClick={openChainModal} type="button" className={`${btnBase} bg-[#0a0a0a] text-[#EFEFEF] border border-[#222] hover:text-white hover:border-[#444] transition-colors`}>
                        {chain.name}
                      </button>
                      <button onClick={openAccountModal} type="button" className={`${btnBase} bg-[#0a0a0a] text-white border border-primary shadow-[0_0_5px_rgba(255,42,77,0.2)] hover:bg-[#111]`}>
                        {account.displayName}
                      </button>
                    </div>
                  )
                })()}
              </div>
            )
          }}
        </ConnectButton.Custom>
      </div>
    </nav>
  )
}
