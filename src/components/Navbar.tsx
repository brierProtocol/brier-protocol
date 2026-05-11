'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const navLinks = [
  { href: '/discover', label: 'Discover' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleWallet = () => {
    toast('Coming Soon — Wallet connect is not yet available.', {
      icon: '🔐',
    });
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[#222] bg-[#0A0A0A]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#C8FF00] group-hover:shadow-[0_0_12px_#C8FF00] transition-shadow" />
          <span className="font-[var(--font-syne)] text-lg font-extrabold tracking-wider uppercase text-white">
            Brier Protocol
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium uppercase tracking-wide transition-colors hover:text-[#C8FF00] ${
                pathname === link.href ? 'text-[#C8FF00]' : 'text-[#888]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Wallet button */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/dashboard"
            className={`text-sm font-medium uppercase tracking-wide transition-colors hover:text-[#C8FF00] ${
              pathname === '/dashboard' ? 'text-[#C8FF00]' : 'text-[#888]'
            }`}
          >
            Dashboard
          </Link>
          <button
            onClick={handleWallet}
            className="rounded-lg border border-[#C8FF00] bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#C8FF00] transition-all hover:bg-[#C8FF00] hover:text-black hover:shadow-[0_0_20px_#C8FF0044]"
          >
            Connect Wallet
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <motion.span
            className="block h-0.5 w-5 bg-white rounded"
            animate={mobileOpen ? { rotate: 45, y: 4 } : { rotate: 0, y: 0 }}
          />
          <motion.span
            className="block h-0.5 w-5 bg-white rounded"
            animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
          />
          <motion.span
            className="block h-0.5 w-5 bg-white rounded"
            animate={mobileOpen ? { rotate: -45, y: -4 } : { rotate: 0, y: 0 }}
          />
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-[#222] sm:hidden bg-[#0A0A0A]"
          >
            <div className="flex flex-col gap-4 px-6 py-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`text-sm font-medium uppercase tracking-wide transition-colors ${
                    pathname === link.href ? 'text-[#C8FF00]' : 'text-[#888]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className={`text-sm font-medium uppercase tracking-wide transition-colors ${
                  pathname === '/dashboard' ? 'text-[#C8FF00]' : 'text-[#888]'
                }`}
              >
                Dashboard
              </Link>
              <button
                onClick={() => {
                  handleWallet();
                  setMobileOpen(false);
                }}
                className="mt-2 rounded-lg border border-[#C8FF00] bg-transparent px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#C8FF00] transition-all hover:bg-[#C8FF00] hover:text-black"
              >
                Connect Wallet
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
