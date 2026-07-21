'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccount, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { motion, AnimatePresence } from 'framer-motion'
import MakerAvatar from '@/components/MakerAvatar'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { personLabel } from '@/lib/identity'

interface NotificationActor {
  walletAddress: string
  handle: string | null
  name: string | null
  pfpUrl: string | null
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  createdAt: string
  read: boolean
  actor?: NotificationActor | null
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
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-[calc(100%+8px)] w-[340px] bg-[#0a0a0a] border border-[#1a1a1a] z-[100] shadow-[0_4px_24px_rgba(0,0,0,0.5)] overflow-hidden origin-top-right"
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
                <div key={n.id} className={`p-3 border-b border-[#1a1a1a] flex gap-3 ${n.read ? 'bg-transparent' : 'bg-[#111]'}`}>
                  {/* actor face — the human who triggered this, same identity as
                      everywhere else (Link to their profile). */}
                  {n.actor && (
                    <Link href={`/maker/${n.actor.walletAddress}`} onClick={() => setOpen(false)} className="shrink-0 rounded-[5px] overflow-hidden self-start no-underline">
                      <MakerAvatar address={n.actor.walletAddress} pfpUrl={n.actor.pfpUrl} size={30} square />
                    </Link>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-sans text-[12px] text-white mb-0.5 leading-snug">
                      {n.actor && (
                        <Link href={`/maker/${n.actor.walletAddress}`} onClick={() => setOpen(false)} className="font-bold text-white hover:text-primary transition-colors no-underline">
                          {personLabel(n.actor, n.actor.walletAddress)}{' '}
                        </Link>
                      )}
                      <span className={n.actor ? 'text-[#b4b4be]' : 'text-white font-semibold'}>{n.message}</span>
                    </div>
                    <div className="font-mono text-[10px] text-[#555]">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
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

function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Landing nav stays informational only. The single way "into the product" is the
  // Launch App CTA, so Stats/Ecosystem no longer compete with it.
  const links = [
    { href: '/how-it-works', label: 'How it works' },
    { href: '/docs', label: 'Docs' },
  ]

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 h-16 transition-all duration-300 ${
        scrolled ? 'bg-[rgba(3,3,3,0.8)] backdrop-blur-md border-b border-[#141414]' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <Link href="/" className="no-underline group">
        <span className="font-sans font-extrabold text-white text-[20px] tracking-[-0.04em] leading-none">
          Brier<span className="text-primary inline-block group-hover:scale-125 transition-transform animate-pulse">.</span>
        </span>
      </Link>

      <div className="hidden md:flex items-center gap-9 absolute left-1/2 -translate-x-1/2">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="font-sans text-[14px] text-[#bbb] hover:text-white transition-colors no-underline">
            {l.label}
          </Link>
        ))}
      </div>

      <Link
        href="/app"
        className="bg-primary text-[#030303] font-sans font-bold text-[13px] px-5 py-2.5 rounded-full transition-all hover:shadow-[0_0_20px_rgba(255,42,77,0.45)] no-underline"
      >
        Launch App
      </Link>
    </nav>
  )
}

export default function Navbar() {
  const { address, isConnected } = useAccount()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (pathname === '/home') return <LandingNav />
  if (pathname === '/') return null
  // Docs trae su propio header (logo + search ⌘K + tabs) — sin navbar global encima
  if (pathname.startsWith('/docs')) return null

  // Deploy lives inside the arena (/app) and Discover as a primary CTA, so it no
  // longer needs a nav slot competing with the core views.
  const navLinks = [
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/discover',    label: 'Discover'    },
    { href: '/dashboard',   label: 'Dashboard'   },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-[rgba(3,3,3,0.95)] backdrop-blur-md border-b border-[#1a1a1a] h-14 flex items-center px-6">
      {/* Inside the product the wordmark returns to the app home, not the landing */}
      <Link href="/app" className="no-underline mr-8 flex items-baseline group">
        <span className="font-sans font-extrabold text-white text-[19px] tracking-[-0.03em] leading-none">
          Brier<span className="text-primary group-hover:drop-shadow-[0_0_8px_rgba(255,42,77,0.8)] transition-all">.</span>
        </span>
      </Link>

      {/* Desktop links */}
      <div className="hidden md:flex items-center gap-1 flex-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`relative font-sans text-[13px] no-underline px-3.5 py-1.5 rounded-md transition-all ${
              pathname === link.href
                ? 'text-white font-semibold bg-white/[0.04]'
                : 'text-[#999] font-medium hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            {link.label}
            {pathname === link.href && (
              <span className="absolute left-3.5 right-3.5 -bottom-[1px] h-[2px] bg-primary shadow-[0_0_8px_rgba(255,42,77,0.6)]" />
            )}
          </Link>
        ))}
      </div>

      {/* Mobile spacer */}
      <div className="flex-1 md:hidden" />

      <div className="flex items-center gap-3">
        {/* Hamburger (mobile only) */}
        <button
          onClick={() => setMobileOpen(v => !v)}
          aria-label="Menu"
          className="md:hidden flex flex-col gap-[3px] p-2 border border-[#1a1a1a] hover:border-primary/50 transition-colors"
        >
          <span className={`block w-4 h-[1.5px] bg-white transition-all ${mobileOpen ? 'translate-y-[4.5px] rotate-45' : ''}`} />
          <span className={`block w-4 h-[1.5px] bg-white transition-all ${mobileOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-4 h-[1.5px] bg-white transition-all ${mobileOpen ? '-translate-y-[4.5px] -rotate-45' : ''}`} />
        </button>

        
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openChainModal, openConnectModal, authenticationStatus, mounted }) => {
            const ready = mounted && authenticationStatus !== 'loading'
            const connected = ready && account && chain && (!authenticationStatus || authenticationStatus === 'authenticated')

            const btnBase = "font-sans text-[12px] font-semibold px-4 py-2 cursor-pointer rounded-full transition-all"

            return (
              <div {...(!ready && { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none' } })}>
                {(() => {
                  if (!connected) {
                    return (
                      <button onClick={openConnectModal} type="button" className={`${btnBase} bg-primary text-[#030303] shadow-[0_0_14px_rgba(255,42,77,0.25)] hover:shadow-[0_0_22px_rgba(255,42,77,0.5)]`}>
                        Connect Wallet
                      </button>
                    )
                  }
                  if (chain.unsupported) {
                    return (
                      <button onClick={openChainModal} type="button" className={`${btnBase} bg-primary text-[#030303] shadow-[0_0_14px_rgba(255,42,77,0.4)]`}>
                        Wrong network
                      </button>
                    )
                  }
                  return (
                    <div className="flex items-center gap-2.5">
                      <NotificationBell address={account.address} />
                      <AccountButton account={account} openAccountModal={openAccountModal} />
                    </div>
                  )
                })()}
              </div>
            )
          }}
        </ConnectButton.Custom>
      </div>

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden absolute top-14 left-0 right-0 bg-[rgba(3,3,3,0.98)] backdrop-blur-md border-b border-[#1a1a1a] flex flex-col px-6 py-3 z-50"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`font-sans text-[14px] font-medium no-underline py-3 border-b border-[#111] transition-colors ${
                  pathname === link.href ? 'text-primary' : 'text-[#999] hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

function AccountButton({ account, openAccountModal }: { account: any, openAccountModal: () => void }) {
  const user = useCurrentUser(account.address)
  const { disconnect } = useDisconnect()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click / Escape — a dropdown should never trap the user.
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const short = `${account.address.slice(0, 6)}…${account.address.slice(-4)}`

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        className={`rounded-full pl-[3px] pr-3 py-[3px] bg-[#0d0d0d] border transition-all cursor-pointer flex items-center gap-2 ${open ? 'border-primary/60' : 'border-[#222] hover:border-[#3a3a3a]'}`}
      >
        <MakerAvatar address={account.address} pfpUrl={user?.pfpUrl} size={30} />
        <span className="hidden md:inline font-sans text-[12px] font-semibold text-[#eaeaea] max-w-[120px] truncate">
          {personLabel(user, account.address)}
        </span>
        <motion.svg animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7a7a84" strokeWidth="2.5" className="hidden md:block">
          <path d="M6 9l6 6 6-6" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 mt-2 w-[224px] rounded-2xl border border-[#1e1e26] bg-[#0a0a0e] shadow-[0_16px_40px_rgba(0,0,0,0.6)] overflow-hidden z-50"
          >
            {/* identity header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#141420] bg-gradient-to-b from-[#101018] to-transparent">
              <MakerAvatar address={account.address} pfpUrl={user?.pfpUrl} size={38} />
              <div className="min-w-0">
                <div className="font-sans font-bold text-[13px] text-white truncate">{personLabel(user, account.address)}</div>
                <div className="font-mono text-[10px] text-[#6a6a74] truncate">{short}</div>
              </div>
            </div>
            <div className="p-1.5">
              <Link href={`/maker/${account.address}`} onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#d4d4dc] hover:bg-white/[0.05] hover:text-white transition-colors no-underline">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7"/></svg>
                Your profile
              </Link>
              <button onClick={() => { setOpen(false); openAccountModal() }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#d4d4dc] hover:bg-white/[0.05] hover:text-white transition-colors cursor-pointer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="14" height="12" rx="2"/><path d="M17 9l4 3-4 3"/></svg>
                Wallet & network
              </button>
              <button onClick={() => { setOpen(false); disconnect() }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#ff6b81] hover:bg-[#ff2a4d14] transition-colors cursor-pointer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
                Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
