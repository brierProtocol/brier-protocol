'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WalletConnect } from './WalletConnect'

const NAV_LINKS = [
  { href: '/', label: 'HOME' },
  { href: '/discover', label: 'CATALOG' },
  { href: '/leaderboard', label: 'RANKINGS' },
  { href: '/dashboard', label: 'DASHBOARD' },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: '#050505',
      borderBottom: '1px solid #1a1a1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1rem',
      height: '40px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '11px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/" style={{
          fontWeight: 'bold',
          color: '#2563EB',
          textDecoration: 'none',
        }}>
          BRIER
        </Link>
        <span style={{ color: '#333' }}>|</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                style={{
                  color: isActive ? '#fff' : '#555',
                  textDecoration: 'none',
                  background: isActive ? '#1a1a1a' : 'transparent',
                  padding: '2px 6px',
                }}
              >
                [{label}]
              </Link>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ color: '#555' }}>Status: ONLINE</span>
        <WalletConnect />
        <Link href="/list-bot" style={{
          background: '#2563EB',
          color: '#000',
          border: 'none',
          fontFamily: 'inherit',
          fontSize: '11px',
          fontWeight: 'bold',
          textDecoration: 'none',
          padding: '2px 8px',
        }}>
          SUBMIT_ALGORITHM
        </Link>
      </div>
    </nav>
  )
}

export default Navbar
