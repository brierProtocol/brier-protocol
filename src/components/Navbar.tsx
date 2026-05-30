'use client'
// src/components/Navbar.tsx

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { motion, AnimatePresence } from 'framer-motion'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Notification {
  id: string
  type: string
  title: string
  message: string
  createdAt: string
  read: boolean
}

// ---------------------------------------------------------------------------
// NotificationBell
// ---------------------------------------------------------------------------

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
      // silent fail — notifications are non-critical
    }
  }, [address])

  // Initial fetch + 30-second polling
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close on outside click
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
        // API expects { address, markAll: true } — not { ids: [...] }
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, markAll: true }),
        })
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      } catch { /* silent */ }
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  const typeIcon: Record<string, string> = {
    VAULT_UNLOCKED:    '🟢',
    TRADE_EXECUTED:    '⚡',
    TRADE_SETTLED:     '✅',
    DEPOSIT_RECEIVED:  '💰',
    WITHDRAWAL_READY:  '💸',
    CIRCUIT_BREAKER:   '⚠️',
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        style={{
          background: 'none',
          border: '1px solid #333',
          borderRadius: '4px',
          color: '#ccc',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: '14px',
          padding: '6px 10px',
          position: 'relative',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = '#2563EB')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = '#333')}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              background: '#2563EB',
              color: '#fff',
              borderRadius: '9999px',
              fontSize: '10px',
              fontWeight: 700,
              height: '16px',
              minWidth: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 8px)',
              width: '340px',
              background: '#0a0a0a',
              border: '1px solid #222',
              borderRadius: '6px',
              zIndex: 100,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              transformOrigin: 'top',
            }}
          >
          {/* Header */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid #1a1a1a',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#666', letterSpacing: '0.08em' }}>
              NOTIFICATIONS
            </span>
            {notifications.length > 0 && (
              <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#444' }}>
                {notifications.length} ITEM{notifications.length !== 1 ? 'S' : ''}
              </span>
            )}
          </div>

          {/* Items */}
          {notifications.length === 0 ? (
            <div
              style={{
                padding: '24px 14px',
                textAlign: 'center',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#444',
              }}
            >
              NO NEW NOTIFICATIONS
            </div>
          ) : (
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {notifications.slice(0, 8).map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid #111',
                    background: n.read ? 'transparent' : 'rgba(37,99,235,0.05)',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: '#e0e0e0',
                      marginBottom: '4px',
                      display: 'flex',
                      gap: '6px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span>{typeIcon[n.type] ?? '📌'}</span>
                    <span style={{ fontWeight: 600 }}>{n.title}</span>
                  </div>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: '#666',
                      lineHeight: 1.5,
                      paddingLeft: '22px',
                    }}
                  >
                    {n.message}
                  </div>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '10px',
                      color: '#333',
                      marginTop: '6px',
                      paddingLeft: '22px',
                    }}
                  >
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

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------

export default function Navbar() {
  const { address, isConnected } = useAccount()
  const pathname = usePathname()

  const navLinks = [
    { href: '/leaderboard', label: 'LEADERBOARD' },
    { href: '/discover',    label: 'DISCOVER'    },
    { href: '/list-bot',    label: 'LIST BOT'    },
    { href: '/dashboard',   label: 'DASHBOARD'   },
  ]

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1a1a1a',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '0',
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        onMouseEnter={(e) => {
          const target = e.currentTarget.querySelector('.ascii-logo') as HTMLDivElement
          if (target) {
            target.style.color = '#fff'
            target.style.textShadow = '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.4)'
          }
        }}
        onMouseLeave={(e) => {
          const target = e.currentTarget.querySelector('.ascii-logo') as HTMLDivElement
          if (target) {
            target.style.color = '#2563EB'
            target.style.textShadow = '0 0 10px rgba(37, 99, 235, 0.4)'
          }
        }}
        style={{
          fontFamily: 'monospace',
          fontSize: '14px',
          fontWeight: 700,
          color: '#2563EB', // Strictly original brand blue
          textDecoration: 'none',
          marginRight: '32px',
          display: 'flex',
          alignItems: 'center',
          position: 'relative', // To contain the absolute glowing background
        }}
      >
        {/* Backlight glowing layer (blanco al centro difuminándose) */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '140px',
          height: '60px',
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.2) 0%, rgba(37,99,235,0.1) 40%, rgba(0,0,0,0) 70%)',
          filter: 'blur(10px)',
          pointerEvents: 'none',
          zIndex: -1,
        }} />

        <div 
          className="ascii-logo"
          style={{
            whiteSpace: 'pre',
            fontSize: '5px',
            lineHeight: '6px',
            fontWeight: 700,
            textShadow: '0 0 10px rgba(37, 99, 235, 0.4)', // Original subtle shadow
            transition: 'all 0.3s ease', // Smooth transition for hover effect
          }}
        >
{`    ____       _           
   / __ )_____(_)__  _____ 
  / __  / ___/ / _ \\/ ___/ 
 / /_/ / /  / /  __/ /     
/_____/_/  /_/\\___/_/      `}
        </div>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              color: pathname === link.href ? '#fff' : '#666',
              textDecoration: 'none',
              padding: '6px 10px',
              borderRadius: '4px',
              letterSpacing: '0.06em',
              background: pathname === link.href ? '#111' : 'transparent',
              borderBottom: pathname === link.href ? '1px solid #2563EB' : '1px solid transparent',
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={(e) => {
              if (pathname !== link.href) {
                ;(e.currentTarget as HTMLAnchorElement).style.color = '#fff'
                ;(e.currentTarget as HTMLAnchorElement).style.background = '#111'
              }
            }}
            onMouseLeave={(e) => {
              if (pathname !== link.href) {
                ;(e.currentTarget as HTMLAnchorElement).style.color = '#666'
                ;(e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
              }
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Right side: Bell + Connect */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isConnected && address && (
          <NotificationBell address={address} />
        )}
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            authenticationStatus,
            mounted,
          }) => {
            const ready = mounted && authenticationStatus !== 'loading'
            const connected =
              ready &&
              account &&
              chain &&
              (!authenticationStatus ||
                authenticationStatus === 'authenticated')

            const btnStyle: React.CSSProperties = {
              background: '#2563EB',
              color: '#000',
              border: 'none',
              fontFamily: 'monospace',
              fontSize: '11px',
              fontWeight: 'bold',
              padding: '4px 10px',
              cursor: 'pointer',
            }

            return (
              <div
                {...(!ready && {
                  'aria-hidden': true,
                  style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <button onClick={openConnectModal} type="button" style={btnStyle}>
                        [CONNECT_WALLET]
                      </button>
                    )
                  }

                  if (chain.unsupported) {
                    return (
                      <button onClick={openChainModal} type="button" style={{ ...btnStyle, background: '#ef4444', color: '#fff' }}>
                        [WRONG_NETWORK]
                      </button>
                    )
                  }

                  return (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Link href={`/maker/${account.address}`} style={{ ...btnStyle, background: '#2563EB', color: '#000', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                        [PROFILE]
                      </Link>

                      <button
                        onClick={openChainModal}
                        style={{ ...btnStyle, background: '#1a1a1a', color: '#fff', border: '1px solid #333' }}
                        type="button"
                      >
                        {chain.name}
                      </button>

                      <button onClick={openAccountModal} type="button" style={{ ...btnStyle, background: '#1a1a1a', color: '#00C9C0', border: '1px solid #00C9C0' }}>
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
