'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import BotCharacter from '@/components/BotCharacter'
import { motion } from 'framer-motion'

const ASCII_LOGO = `
    ____       _           
   / __ )_____(_)__  _____ 
  / __  / ___/ / _ \\/ ___/ 
 / /_/ / /  / /  __/ /     
/_____/_/  /_/\\___/_/      
`

export default function Home() {
  const [topBots, setTopBots] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/bots')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Sort by Brier Score and take top 5
          const sorted = data.sort((a: any, b: any) => {
            const brierA = a.scores?.[0]?.brierScore ?? a.brierScore ?? 1
            const brierB = b.scores?.[0]?.brierScore ?? b.brierScore ?? 1
            return brierA - brierB
          })
          setTopBots(sorted.slice(0, 5))
        }
      })
      .catch(console.error)
  }, [])

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  }

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { ease: 'easeOut', duration: 0.5 } }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#EFEFEF', fontFamily: 'var(--font-body), sans-serif', padding: '3rem 1.5rem' }}>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ maxWidth: 1000, margin: '0 auto' }}
      >
        
        {/* ASCII HEADER */}
        <motion.div variants={itemVariants} style={{ marginBottom: '3rem', position: 'relative' }}>
          
          {/* Backlight glowing layer for the huge logo */}
          <div style={{
            position: 'absolute',
            top: '30%',
            left: '10%',
            transform: 'translate(-50%, -50%)',
            width: '300px',
            height: '100px',
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.1) 0%, rgba(37,99,235,0.05) 40%, rgba(0,0,0,0) 70%)',
            filter: 'blur(20px)',
            pointerEvents: 'none',
            zIndex: 0,
          }} />

          <div 
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#fff'
              e.currentTarget.style.textShadow = '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#2563EB'
              e.currentTarget.style.textShadow = '0 0 20px rgba(37, 99, 235, 0.6), 0 0 40px rgba(37, 99, 235, 0.3)'
            }}
            style={{ 
              color: '#2563EB', 
              whiteSpace: 'pre', 
              fontSize: 'clamp(8px, 1.5vw, 14px)', 
              fontWeight: 700, 
              lineHeight: 1.2, 
              fontFamily: 'var(--font-mono), monospace', 
              textShadow: '0 0 20px rgba(37, 99, 235, 0.6), 0 0 40px rgba(37, 99, 235, 0.3)', 
              animation: 'float 4s ease-in-out infinite', 
              display: 'inline-block',
              transition: 'all 0.3s ease',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {ASCII_LOGO}
          </div>
          <div style={{ color: '#666', marginTop: '0.5rem', fontWeight: 500, letterSpacing: '0.5px', fontFamily: 'var(--font-mono), monospace', fontSize: 'clamp(8px, 1.5vw, 14px)' }}>
            &gt; CAPITALMAXXING FOR DEVS. VAULTMAXXING FOR INVESTORS.
          </div>
        </motion.div>

        {/* MOTD */}
        <motion.div variants={itemVariants} style={{ 
          background: '#0A0A0A', 
          border: '1px solid rgba(255,255,255,0.06)', 
          padding: '1.5rem', 
          marginBottom: '4rem',
          borderRadius: '8px',
          boxShadow: '0 4px 20px -10px rgba(0,0,0,0.5)'
        }}>
          <div style={{ color: '#2563EB', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem', marginBottom: '0.75rem', fontFamily: 'var(--font-mono), monospace', fontSize: '12px', letterSpacing: '0.5px' }}>
            --- MESSAGE OF THE DAY ---
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.7, color: '#aaa', fontFamily: 'var(--font-mono), monospace' }}>
            <span style={{ color: '#4ade80' }}>&gt; Welcome to Brier.</span><br/>
            Humans are terrible at probability. Machines are not.<br/>
            Brier is an index of algorithmic trading bots executing on prediction markets.<br/>
            <br/>
            <span style={{ color: '#EFEFEF', fontWeight: 600 }}>RULES OF ENGAGEMENT:</span><br/>
            1. All algorithms must survive a 30-day on-chain paper trading phase.<br/>
            2. Algorithms are ranked strictly by their Brier Score (lower = better).<br/>
            3. Vaults open automatically for top-tier bots. Depositors yield profits. Builders earn 10% performance fees.<br/>
          </div>
        </motion.div>

        {/* DIRECTORY LINKS */}
        <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
          
          {/* Investor Box */}
          <div style={{ 
            background: '#030303', 
            border: '1px solid #333', 
            padding: '2rem',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
          onMouseOver={e => { e.currentTarget.style.background = '#050505'; e.currentTarget.style.borderColor = '#00C9C0'; }}
          onMouseOut={e => { e.currentTarget.style.background = '#030303'; e.currentTarget.style.borderColor = '#333'; }}
          >
            <div style={{ color: '#00C9C0', fontWeight: 700, marginBottom: '1rem', fontFamily: 'var(--font-mono), monospace', fontSize: '14px', letterSpacing: '1px' }}>&gt; YIELD_MAX_VAULTS.EXE</div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '2rem', lineHeight: 1.6, height: 40, fontFamily: 'var(--font-mono), monospace' }}>
              Deploy capital into verified algorithmic prediction vaults. Zero emotion, strictly mathematics.
            </div>
            <Link href="/discover" style={{ 
              display: 'inline-block', 
              background: '#000', 
              border: '1px solid #00C9C0',
              color: '#00C9C0', 
              textDecoration: 'none', 
              padding: '8px 24px', 
              fontWeight: 700, 
              fontSize: '12px',
              fontFamily: 'var(--font-mono), monospace',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#00C9C0'; e.currentTarget.style.color = '#000'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#00C9C0'; }}
            >
              [ENTER_CATALOG]
            </Link>
          </div>

          {/* Builder Box */}
          <div style={{ 
            background: '#030303', 
            border: '1px dashed #333', 
            padding: '2rem',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={e => { e.currentTarget.style.background = '#050505'; e.currentTarget.style.borderColor = '#00FF00'; }}
          onMouseOut={e => { e.currentTarget.style.background = '#030303'; e.currentTarget.style.borderColor = '#333'; }}
          >
            <div style={{ color: '#00FF00', fontWeight: 700, marginBottom: '1rem', fontFamily: 'var(--font-mono), monospace', fontSize: '14px', letterSpacing: '1px' }}>&gt; ALGO_MAKER_NODE.EXE</div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '2rem', lineHeight: 1.6, height: 40, fontFamily: 'var(--font-mono), monospace' }}>
              Submit your prediction model. Prove your Brier Score on-chain. Attract capital.
            </div>
            <Link href="/list-bot" style={{ 
              display: 'inline-block', 
              background: '#000',
              border: '1px solid #00FF00', 
              color: '#00FF00', 
              textDecoration: 'none', 
              padding: '8px 24px', 
              fontWeight: 700, 
              fontSize: '12px',
              fontFamily: 'var(--font-mono), monospace',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#00FF00'; e.currentTarget.style.color = '#000'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#00FF00'; }}
            >
              [SUBMIT_ALGORITHM]
            </Link>
          </div>

        </motion.div>

        {/* TOP BOTS — RETRO TERMINAL QUANT TABLE */}
        <motion.div variants={itemVariants} style={{ 
          background: '#030303', 
          border: '1px solid #2563EB', 
          borderRadius: '4px', 
          padding: '2rem',
          boxShadow: '0 0 25px rgba(37,99,235,0.15)',
          position: 'relative',
          fontFamily: 'var(--font-mono), monospace'
        }}>
          {/* Terminal corner accents */}
          <div style={{ position: 'absolute', top: -1, left: -1, width: 8, height: 8, borderTop: '2px solid #00C9C0', borderLeft: '2px solid #00C9C0' }}></div>
          <div style={{ position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderTop: '2px solid #00C9C0', borderRight: '2px solid #00C9C0' }}></div>
          <div style={{ position: 'absolute', bottom: -1, left: -1, width: 8, height: 8, borderBottom: '2px solid #00C9C0', borderLeft: '2px solid #00C9C0' }}></div>
          <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderBottom: '2px solid #00C9C0', borderRight: '2px solid #00C9C0' }}></div>

          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(37,99,235,0.3)', paddingBottom: '0.8rem' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563EB', letterSpacing: '1px' }}>
              &gt; TOP_ALGORITHMS.EXE
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: '#666', borderBottom: '1px solid rgba(37,99,235,0.2)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <th style={{ padding: '0.5rem 1rem 1rem 1rem', fontWeight: 600 }}>[ RANK / ALGORITHM ]</th>
                <th style={{ padding: '0.5rem 1rem 1rem 1rem', fontWeight: 600 }}>[ BRIER ]</th>
                <th style={{ padding: '0.5rem 1rem 1rem 1rem', fontWeight: 600 }}>[ WIN_RATE ]</th>
                <th style={{ padding: '0.5rem 1rem 1rem 1rem', fontWeight: 600 }}>[ STATUS ]</th>
                <th style={{ padding: '0.5rem 1rem 1rem 1rem', fontWeight: 600, textAlign: 'right' }}>[ VAULT_TVL ]</th>
              </tr>
            </thead>
            <tbody>
              {topBots.length > 0 ? topBots.map((bot, i) => {
                const brier = bot.scores?.[0]?.brierScore ?? bot.brierScore ?? 0
                const wr = bot.scores?.[0]?.winRate ?? bot.winRate ?? 0
                const tvl = bot.currentTVL ?? bot.tvl ?? 0
                const isLive = (bot.status || '').toLowerCase() === 'live'
                return (
                  <tr key={bot.id} style={{ 
                    borderBottom: '1px dashed rgba(37,99,235,0.1)', 
                    background: i === 0 ? 'rgba(37,99,235,0.04)' : 'transparent',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = 'rgba(0,201,192,0.05)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = i === 0 ? 'rgba(37,99,235,0.04)' : 'transparent';
                  }}
                  >
                    <td style={{ padding: '1.2rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                        <div style={{ color: i === 0 ? '#00C9C0' : '#555', fontWeight: 700 }}>
                          [{String(i + 1).padStart(2, '0')}]
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <Link href={`/bot/${bot.slug || bot.id}`} style={{ color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '14px', letterSpacing: '0.5px' }}
                            onMouseOver={e => e.currentTarget.style.color = '#00C9C0'}
                            onMouseOut={e => e.currentTarget.style.color = '#fff'}
                          >
                            {bot.name}
                          </Link>
                          <span style={{ color: '#555', fontSize: '11px' }}>
                            by <Link href={`/maker/${bot.walletAddress || 'anon'}`} style={{ color: '#2563EB', textDecoration: 'none' }}
                              onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'}
                              onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}
                            >{(bot.walletAddress || 'anon').substring(0, 8)}...</Link>
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1rem', color: brier <= 0.25 ? '#00FF00' : '#ef4444', fontWeight: 700, fontSize: '14px', textShadow: brier <= 0.25 ? '0 0 10px rgba(0,255,0,0.3)' : 'none' }}>
                      [{brier.toFixed(3)}]
                    </td>
                    <td style={{ padding: '1.2rem 1rem', color: '#00C9C0', fontWeight: 600 }}>
                      {(wr * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: '1.2rem 1rem' }}>
                      <div style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontSize: '10px', 
                        fontWeight: 700,
                        padding: '2px 8px', 
                        borderRadius: '2px',
                        background: isLive ? 'rgba(0,201,192,0.1)' : 'rgba(37,99,235,0.1)',
                        color: isLive ? '#00C9C0' : '#2563EB',
                        border: `1px solid ${isLive ? 'rgba(0,201,192,0.2)' : 'rgba(37,99,235,0.2)'}`
                      }}>
                        {isLive ? '█ LIVE' : '░ PAPER'}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1rem', textAlign: 'right', color: '#C9A84C', fontWeight: 700 }}>
                      ${tvl.toLocaleString()}
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: '#555', fontSize: '11px' }}>
                    <div style={{ animation: 'pulse-badge 2s infinite' }}>&gt; SYNCHRONIZING WITH BLOCKCHAIN INDEXER...</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link href="/discover" style={{ 
              display: 'inline-block',
              padding: '10px 30px',
              border: '1px solid #2563EB',
              background: 'transparent',
              color: '#2563EB',
              textDecoration: 'none', 
              fontSize: '12px', 
              fontWeight: 700,
              borderRadius: '2px',
              transition: 'all 0.2s ease',
              letterSpacing: '1px'
            }}
              onMouseOver={e => { 
                e.currentTarget.style.background = '#2563EB'; 
                e.currentTarget.style.color = '#000';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(37,99,235,0.4)';
              }}
              onMouseOut={e => { 
                e.currentTarget.style.background = 'transparent'; 
                e.currentTarget.style.color = '#2563EB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              &gt; EXECUTE DIRECTORY DISCOVERY
            </Link>
          </div>
        </motion.div>

        {/* FOOTER */}
        <motion.div variants={itemVariants} style={{ marginTop: '5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', fontFamily: 'var(--font-mono), monospace' }}>
          <div>Brier v1.0.0-rc</div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/developers" style={{ color: '#666', textDecoration: 'none' }} onMouseOver={e => e.currentTarget.style.color = '#EFEFEF'} onMouseOut={e => e.currentTarget.style.color = '#666'}>[Docs]</Link>
            <span style={{ cursor: 'pointer', transition: 'color 0.2s ease' }} onMouseOver={e => e.currentTarget.style.color = '#EFEFEF'} onMouseOut={e => e.currentTarget.style.color = '#666'}>[Twitter]</span>
            <span style={{ cursor: 'pointer', transition: 'color 0.2s ease' }} onMouseOver={e => e.currentTarget.style.color = '#EFEFEF'} onMouseOut={e => e.currentTarget.style.color = '#666'}>[GitHub]</span>
          </div>
        </motion.div>

      </motion.div>
    </div>
  )
}
