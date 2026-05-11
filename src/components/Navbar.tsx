'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const navLinks = [
  { href: '/discover', label: 'Discover' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleWallet = () => {
    toast('Coming Soon — Wallet connect is not yet available.', {
      icon: '🔐',
    });
  };

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-xl shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-[var(--font-syne)] text-xl font-[900] tracking-tight uppercase text-[#0A0A0A]">
            Brier Protocol
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative text-sm font-medium text-[#0A0A0A] transition-colors hover:opacity-70"
            >
              {link.label}
              {pathname === link.href && (
                <motion.span
                  layoutId="nav-dot"
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-[#C8FF00]"
                />
              )}
            </Link>
          ))}
        </div>

        {/* Right section */}
        <div className="hidden sm:flex items-center gap-4">
          <Link
            href="/dashboard"
            className="relative text-sm font-medium text-[#0A0A0A] transition-colors hover:opacity-70"
          >
            Dashboard
            {pathname === '/dashboard' && (
              <motion.span
                layoutId="nav-dot"
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-[#C8FF00]"
              />
            )}
          </Link>
          <button
            onClick={handleWallet}
            className="rounded-full bg-[#0A0A0A] px-6 py-2.5 text-xs font-bold text-white transition-all hover:opacity-80 active:scale-[0.97]"
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
            className="block h-0.5 w-5 bg-[#0A0A0A] rounded"
            animate={mobileOpen ? { rotate: 45, y: 4 } : { rotate: 0, y: 0 }}
          />
          <motion.span
            className="block h-0.5 w-5 bg-[#0A0A0A] rounded"
            animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
          />
          <motion.span
            className="block h-0.5 w-5 bg-[#0A0A0A] rounded"
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
            className="overflow-hidden sm:hidden bg-white"
          >
            <div className="flex flex-col gap-4 px-6 py-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-base font-medium text-[#0A0A0A]"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="text-base font-medium text-[#0A0A0A]"
              >
                Dashboard
              </Link>
              <button
                onClick={() => {
                  handleWallet();
                  setMobileOpen(false);
                }}
                className="mt-2 rounded-full bg-[#0A0A0A] px-6 py-3 text-sm font-bold text-white active:scale-[0.97]"
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
