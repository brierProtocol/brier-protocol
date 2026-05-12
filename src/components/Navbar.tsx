'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { useConnect, useAccount, useDisconnect, useChainId, useSwitchChain } from 'wagmi';

function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, error } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const isPolygon = chainId === 137;

  useEffect(() => {
    if (error) {
      if ((error as any).name === 'ConnectorNotFoundError') {
        toast.error('Wallet not found. Please install a wallet extension.');
      } else if (error.name === 'UserRejectedRequestError') {
        toast.error('Connection rejected. Please try again.');
      } else {
        toast.error('Failed to connect wallet.');
      }
    }
  }, [error]);

  if (isConnected) {
    if (!isPolygon) {
      return (
        <button
          onClick={() => switchChain({ chainId: 137 })}
          className="wallet-pill bg-[#FF3D00] text-white border-none animate-pulse"
        >
          Switch to Polygon
        </button>
      );
    }
    return (
      <button
        onClick={() => disconnect()}
        className="wallet-pill connected"
      >
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      className="wallet-pill"
    >
      Connect Wallet
    </button>
  );
}

const navLinks = [
  { href: '/discover', label: 'Discover' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/dashboard', label: 'Dashboard' },
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

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-all duration-500 bg-[#0A0A0A]/90 backdrop-blur-3xl border-b border-white/5 ${
        scrolled ? 'py-4' : 'py-6'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 sm:px-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-xl bg-[#C8FF00] flex items-center justify-center font-[var(--font-syne)] font-[900] text-[#0A0A0A] text-2xl group-hover:scale-110 transition-transform">
            B
          </div>
          <span className="font-[var(--font-syne)] text-2xl font-[900] tracking-tighter uppercase text-white group-hover:text-[#C8FF00] transition-colors">
            Brier<span className="opacity-20 italic ml-1 group-hover:opacity-100 transition-opacity">Protocol</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-[var(--font-dm-mono)] text-[10px] font-bold uppercase tracking-[0.3em] transition-all hover:text-[#C8FF00] relative ${
                pathname === link.href ? 'text-[#C8FF00]' : 'text-white/30'
              }`}
            >
              {link.label}
              {pathname === link.href && (
                <motion.span
                  layoutId="nav-glow"
                  className="absolute -bottom-4 left-0 w-full h-[2px] bg-[#C8FF00] shadow-[0_0_10px_rgba(200,255,0,0.5)]"
                />
              )}
            </Link>
          ))}
          <div className="h-6 w-[1px] bg-white/10" />
          <ConnectButton />
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center sm:hidden">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-white p-2"
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden bg-[#0A0A0A]/95 backdrop-blur-3xl border-b border-white/5 overflow-hidden"
          >
            <div className="flex flex-col gap-6 px-6 py-10">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`font-[var(--font-syne)] text-3xl font-[900] uppercase tracking-tighter ${
                    pathname === link.href ? 'text-[#C8FF00]' : 'text-white/40'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-6 border-t border-white/10">
                <ConnectButton />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
