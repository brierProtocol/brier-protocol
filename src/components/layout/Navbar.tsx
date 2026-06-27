'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { motion, AnimatePresence } from 'framer-motion'
import MakerAvatar from '@/components/profile/MakerAvatar'

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

  if (pathname === '/') return <LandingNav />
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
                      <Link href={`/maker/${account.address}`} className="font-sans text-[12px] font-semibold px-4 py-2 rounded-full border border-[#222] text-[#ccc] hover:text-white hover:border-[#444] transition-all no-underline hidden sm:flex items-center">
                        Profile
                      </Link>
                      <button
                        onClick={openAccountModal}
                        type="button"
                        aria-label="Account"
                        className="rounded-[9px] p-[3px] bg-[#0d0d0d] border border-[#222] hover:border-primary/60 transition-all cursor-pointer flex items-center"
                      >
                        <MakerAvatar address={account.address} size={28} />
                      </button>
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
