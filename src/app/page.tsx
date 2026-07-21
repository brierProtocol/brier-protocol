'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import AmbientDots from '@/components/AmbientDots'

export default function ComingSoon() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    // Simulate API call and connect nicely later
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
      setEmail('')
    }, 1200)
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#030303] text-white selection:bg-primary/30">
      <AmbientDots />

      {/* Deep Space Atmosphere */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Core red glow */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-[0.04] mix-blend-overlay" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg px-6 flex flex-col items-center text-center"
      >
        {/* Logo */}
        <div className="mb-14 cursor-default select-none group flex flex-col items-center">
          <h1 className="font-sans font-extrabold text-[64px] md:text-[80px] tracking-[-0.05em] leading-none text-white transition-transform duration-500 hover:scale-105">
            Brier<span className="text-primary group-hover:drop-shadow-[0_0_20px_rgba(255,42,77,0.8)] transition-all duration-300">.</span>
          </h1>
        </div>

        {/* Content */}
        <div className="space-y-5 mb-12">
          <h2 className="font-sans font-extrabold text-[36px] md:text-[48px] tracking-[-0.04em] leading-tight">
            Coming Soon
          </h2>
        </div>

        {/* Form */}
        <div className="w-full max-w-sm mx-auto">
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.form 
                key="form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
                transition={{ duration: 0.4 }}
                onSubmit={handleSubmit}
                className="relative group w-full"
              >
                <div className="absolute -inset-[2px] bg-gradient-to-r from-primary/40 to-transparent rounded-full blur-md opacity-0 group-hover:opacity-100 transition duration-700" />
                <div className="relative flex items-center bg-[#080808] border border-[#1a1a1a] rounded-full p-1.5 focus-within:border-primary/60 focus-within:bg-[#0a0a0a] transition-all duration-300 shadow-2xl">
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email..."
                    required
                    className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[15px] text-white px-5 placeholder:text-[#444] font-sans"
                    style={{ boxShadow: 'none' }}
                  />
                  <button 
                    type="submit"
                    disabled={loading}
                    className="bg-primary hover:bg-[#ff1a3d] text-[#030303] font-sans font-bold text-[14px] px-7 py-3.5 rounded-full transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(255,42,77,0.25)] hover:shadow-[0_0_30px_rgba(255,42,77,0.5)]"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-[#030303] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Notify me
                        <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-[#080808] border border-[#1a1a1a] rounded-[24px] p-8 flex flex-col items-center gap-4 shadow-[0_0_40px_rgba(255,42,77,0.12)] relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                <div className="text-primary rounded-full bg-primary/10 p-3 mb-2 shadow-[0_0_20px_rgba(255,42,77,0.2)]">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <h3 className="font-sans font-bold text-[22px] tracking-tight text-white">You're on the list.</h3>
                <p className="text-[#888] text-[14px] text-center max-w-[240px] leading-relaxed">
                  We'll send you an update as soon as the algorithms go live.
                </p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="mt-3 text-[#444] hover:text-[#999] font-sans text-[12px] underline underline-offset-4 transition-colors"
                >
                  Register another email
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
      </motion.div>
    </div>
  )
}
