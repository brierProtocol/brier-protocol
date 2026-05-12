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
      toast.error('Connection failed. Please try again.', {
        style: {
          background: '#080808',
          color: '#F5F5F0',
          border: '0.5px solid rgba(255,59,59,0.2)',
          fontFamily: 'var(--font-mono)',
          borderRadius: '16px',
        }
      });
    }
  }, [error]);

  if (isConnected) {
    if (!isPolygon) {
      return (
        <button
          onClick={() => switchChain({ chainId: 137 })}
          className="px-6 py-2.5 rounded-full bg-[#FF3B3B] text-white text-[10px] font-bold uppercase tracking-widest animate-pulse"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Switch to Polygon
        </button>
      );
    }
    return (
      <button
        onClick={() => disconnect()}
        className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-[#F5F5F0] text-[11px] font-bold font-mono hover:bg-white/10 transition-all"
      >
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      className="px-6 py-2.5 rounded-full bg-[#C8FF00] text-[#080808] text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-[0_10px_20px_rgba(200,255,0,0.15)]"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      Connect Wallet
    </button>
  );
}

const navLinks = [
  { href: '/discover', label: 'Discover' },
  { href: '/leaderboard', label: 'Rankings' },
  { href: '/dashboard', label: 'Portal' },
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
      className={`fixed top-0 z-[100] w-full transition-all duration-500 border-b ${
        scrolled 
          ? 'py-4 bg-[#080808]/80 backdrop-blur-2xl border-white/5 shadow-2xl' 
          : 'py-8 bg-transparent border-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 sm:px-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-4 group">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.1 }}
            className="h-10 w-10 rounded-2xl bg-[#C8FF00] flex items-center justify-center font-[var(--font-display)] font-black text-[#080808] text-2xl shadow-[0_10px_20px_rgba(200,255,0,0.2)]"
          >
            B
          </motion.div>
          <span className="font-[var(--font-display)] text-2xl font-black tracking-tighter uppercase text-[#F5F5F0] leading-none">
            Brier<span className="opacity-20 italic ml-1 group-hover:opacity-100 group-hover:text-[#C8FF00] transition-all">Protocol</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-xl mr-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${
                  pathname === link.href
                    ? 'bg-white text-[#080808] shadow-lg'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                }`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <ConnectButton />
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 text-white/40 hover:text-white transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#080808] border-b border-white/5 overflow-hidden"
          >
            <div className="flex flex-col gap-4 p-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`text-2xl font-black uppercase tracking-tighter ${
                    pathname === link.href ? 'text-[#C8FF00]' : 'text-white/20'
                  }`}
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-6 mt-6 border-t border-white/5">
                <ConnectButton />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
