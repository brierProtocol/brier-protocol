'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import BotCharacter, { Mood } from '@/components/BotCharacter'
import { useBot } from '@/hooks/useBots'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'
const Liveline = dynamic(() => import('liveline').then(mod => mod.Liveline), { ssr: false })

type ChartView = 'cumulative' | 'wr' | 'daily' | 'brier'
type TimeRange = '7d' | '30d' | '90d' | 'all'

export default function VaultPage() {
  const params = useParams()
  const botId = params.botId as string
  const { data: bot, isLoading } = useBot(botId)
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [mode, setMode] = useState<'CONSERVATIVE' | 'DEGEN'>('CONSERVATIVE')

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080808]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-white/5 border-t-[#C8FF00] rounded-full animate-spin" />
          <p className="font-mono text-white/40 text-[10px] font-bold uppercase tracking-[0.4em]">Streaming Data Matrix...</p>
        </div>
      </div>
    )
  }

  if (!bot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080808] p-6 text-center">
        <div className="bg-white/5 backdrop-blur-3xl p-12 rounded-[40px] border border-white/10">
          <h2 className="font-[var(--font-display)] text-3xl font-black text-white mb-2 uppercase">VAULT NOT FOUND</h2>
          <p className="font-mono text-white/40">The quantitative entity you are seeking does not exist.</p>
        </div>
      </div>
    )
  }

  const handleDeposit = () => {
    toast('Coming Soon — Deposits are not yet available.', { 
      style: {
        background: '#080808',
        color: '#F5F5F0',
        border: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px'
      }
    })
  }

  // Determine mood from bot stats
  function getMoodFromStats(b: typeof bot): Mood {
    if (!b) return 'neutral'
    if ((b as any).fraudFlag > 0) return 'suspicious'
    if (b.maxDrawdown < -0.15) return 'sad'
    if (b.brierScore < 0.20 && b.winRate > 0.57) return 'cool'
    if (b.brierScore < 0.25 && b.winRate > 0.54) return 'happy'
    if (b.brierScore > 0.28 || b.winRate < 0.50) return 'anxious'
    return 'neutral'
  }

  const mood = getMoodFromStats(bot)
  const moodColors: Record<Mood, string> = {
    cool:      '#C8FF00',
    happy:     '#00FFC8',
    excited:   '#FFB800',
    neutral:   '#888888',
    anxious:   '#FF9500',
    sad:       '#6B7FFF',
    suspicious:'#FF3B3B',
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: '#080808' }}>
      
      {/* ═══ HERO — Character + Identity ═══ */}
      <div className="relative px-6 pt-24 pb-12 overflow-hidden">
        {/* Background glow behind character */}
        <div
          className="absolute top-12 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[120px]"
          style={{ background: moodColors[mood], opacity: 0.12 }}
        />
        
        <div className="flex flex-col items-center text-center relative z-10">
          {/* Large character */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <BotCharacter mood={mood} accentColor={bot.color} size={160} />
          </motion.div>
          
          {/* Bot name */}
          <h1
            className="text-5xl sm:text-7xl font-black mt-8 mb-2 leading-none tracking-tighter"
            style={{
              fontFamily: 'var(--font-display)',
              color: '#F5F5F0',
            }}
          >
            {bot.name}
          </h1>
          
          {/* Mood label */}
          <p
            className="text-sm font-bold uppercase tracking-[0.3em] mb-8"
            style={{
              fontFamily: 'var(--font-body)',
              color: moodColors[mood],
            }}
          >
            Feeling {mood} today
          </p>
          
          {/* Key metric — HUGE */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="px-12 py-8 rounded-[32px] relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              boxShadow: bot.brierScore < 0.25 ? '0 0 60px rgba(200,255,0,0.08)' : 'none'
            }}
          >
            <div
              className="text-[10px] font-bold tracking-[0.4em] mb-2 opacity-40 uppercase"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              BRIER SCORE
            </div>
            <div
              className="text-7xl sm:text-8xl font-bold leading-none"
              style={{
                fontFamily: 'var(--font-mono)',
                color: bot.brierScore < 0.25 ? '#C8FF00' : '#F5F5F0',
              }}
            >
              {bot.brierScore?.toFixed(3) ?? '—'}
            </div>
            <div
              className="text-xs mt-3 opacity-30 font-bold uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Lower is better · Target: &lt;0.250
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══ STATS GRID ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 px-6 mb-8 max-w-7xl mx-auto">
        {[
          { label: 'WIN RATE',   value: `${(bot.winRate * 100).toFixed(1)}%` },
          { label: 'SHARPE',     value: bot.sharpe?.toFixed(2) || '2.41' },
          { label: 'TRADES',     value: bot.trades?.toLocaleString() },
          { label: 'VOLUME',     value: `$${(bot.tvl/1000).toFixed(0)}K` },
          { label: 'MAX DD',     value: `${(bot.maxDrawdown * 100).toFixed(1)}%` },
          { label: 'DAYS LIVE',  value: '127' },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col gap-1.5 p-5 rounded-[24px]"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
            }}
          >
            <span
              className="text-[10px] font-bold tracking-[0.2em] opacity-30 uppercase"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {label}
            </span>
            <span
              className="text-3xl font-bold leading-none tracking-tight"
              style={{ fontFamily: 'var(--font-mono)', color: '#F5F5F0' }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* ═══ VAULT INTERACTION AREA ═══ */}
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Vault Status & Progress */}
          <div
            className="lg:col-span-2 p-8 rounded-[40px] flex flex-col justify-between"
            style={{
              background: 'rgba(200,255,0,0.04)',
              border: '0.5px solid rgba(200,255,0,0.15)',
              boxShadow: '0 0 40px rgba(200,255,0,0.06)',
            }}
          >
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div
                    className="text-[10px] font-bold tracking-[0.4em] mb-1 text-[#C8FF00] opacity-60 uppercase"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {bot.tier} VAULT
                  </div>
                  <div
                    className="text-5xl font-bold leading-none"
                    style={{ fontFamily: 'var(--font-mono)', color: '#C8FF00' }}
                  >
                    ${(bot.tvl / 1000).toFixed(0)}K
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold opacity-30 tracking-widest uppercase mb-1">Capacity Cap</div>
                  <div className="text-xl font-bold font-mono text-white opacity-60">
                    ${(bot.vaultCap / 1000000).toFixed(0)}M
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div
                className="w-full h-3 rounded-full overflow-hidden p-0.5 bg-black/40 border border-white/5"
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: '#C8FF00', boxShadow: '0 0 20px rgba(200,255,0,0.4)' }}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min((bot.tvl / bot.vaultCap) * 100, 100)}%`
                  }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
              </div>
            </div>

            <div className="mt-8 flex gap-8">
              <div>
                <p className="text-[10px] font-bold opacity-30 tracking-widest uppercase mb-1">Builder Carry</p>
                <p className="text-lg font-bold font-mono text-white">20.0%</p>
              </div>
              <div>
                <p className="text-[10px] font-bold opacity-30 tracking-widest uppercase mb-1">Platform Fee</p>
                <p className="text-lg font-bold font-mono text-white">3.0%</p>
              </div>
              <div>
                <p className="text-[10px] font-bold opacity-30 tracking-widest uppercase mb-1">Withdraw Delay</p>
                <p className="text-lg font-bold font-mono text-white">48H</p>
              </div>
            </div>
          </div>

          {/* Deposit Terminal */}
          <div className="p-8 rounded-[40px] bg-white/[0.04] border border-white/10 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <h3 className="font-[var(--font-display)] text-2xl font-black mb-6 uppercase tracking-tighter">DEPOSIT TERMINAL</h3>
              
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                  <div className="text-[10px] font-bold opacity-30 tracking-widest uppercase mb-2">Network Selection</div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#8247E5]" />
                    <span className="font-mono text-sm font-bold">Polygon Mainnet</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                  <div className="text-[10px] font-bold opacity-30 tracking-widest uppercase mb-2">Vault Mode</div>
                  <div className="flex gap-2">
                    {['CONSERVATIVE', 'DEGEN'].map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m as any)}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-bold tracking-widest transition-all ${
                          mode === m ? 'bg-white text-[#080808]' : 'bg-white/5 text-white/30 hover:text-white/60'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleDeposit}
              className="w-full py-5 rounded-2xl font-bold text-sm mt-8 transition-all"
              style={{
                background: '#C8FF00',
                color: '#080808',
                fontFamily: 'var(--font-display)',
                boxShadow: '0 20px 40px rgba(200,255,0,0.15)'
              }}
            >
              INITIALIZE DEPOSIT
            </motion.button>
          </div>

        </div>
      </div>

      {/* ═══ PERFORMANCE MATRIX (CHART) ═══ */}
      <section className="px-6 max-w-7xl mx-auto mb-12">
        <div className="p-10 rounded-[48px] bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12">
            <div>
              <h2 className="font-[var(--font-display)] text-3xl font-black mb-2 uppercase tracking-tighter">PERFORMANCE MATRIX</h2>
              <p className="text-[10px] font-bold opacity-30 tracking-[0.3em] uppercase">Live Execution Stream · 60 FPS</p>
            </div>
            
            <div className="flex gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5">
              {(['7d', '30d', '90d', 'all'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-bold font-mono transition-all uppercase tracking-widest ${
                    timeRange === r ? 'bg-white text-[#080808]' : 'text-white/30 hover:text-white/60'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[400px] w-full relative group rounded-[32px] overflow-hidden bg-black/20">
            <Liveline 
              data={bot.pnlHistory.map((v, i) => ({ value: v, time: i }))}
              value={bot.pnlHistory[bot.pnlHistory.length - 1] || 0}
              color="#C8FF00"
              theme="dark"
            />
          </div>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-white/5">
            {[
              { label: 'Volatility', value: '12.4%', sub: 'Realized 30D' },
              { label: 'Expectancy', value: '0.14', sub: 'Per Trade' },
              { label: 'Max Runup', value: '+$4.2K', sub: '90D Peak' },
              { label: 'Recovery', value: '2.4 Days', sub: 'Average Time' },
            ].map((s, i) => (
              <div key={i}>
                <p className="text-[10px] font-bold opacity-30 tracking-widest uppercase mb-2">{s.label}</p>
                <p className="text-2xl font-bold text-white font-mono">{s.value}</p>
                <p className="text-[10px] font-bold opacity-10 uppercase mt-1 tracking-wider">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ RECENT EXECUTION ═══ */}
      <section className="px-6 max-w-7xl mx-auto">
        <div className="p-10 rounded-[48px] bg-white/[0.03] border border-white/10">
          <h2 className="font-[var(--font-display)] text-3xl font-black mb-10 uppercase tracking-tighter">RECENT EXECUTION</h2>
          
          <div className="space-y-4">
            {bot.recentTrades?.map((trade) => (
              <div 
                key={trade.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-[28px] bg-black/40 border border-white/5 hover:border-white/10 transition-all gap-6"
              >
                <div className="flex items-center gap-6">
                  <div 
                    className="flex items-center justify-center w-14 h-14 rounded-2xl font-black text-xl shadow-2xl"
                    style={{
                      background: trade.result === 'WIN' ? '#C8FF00' : '#FF3B3B',
                      color: trade.result === 'WIN' ? '#080808' : '#F5F5F0',
                      boxShadow: trade.result === 'WIN' ? '0 0 20px rgba(200,255,0,0.2)' : 'none'
                    }}
                  >
                    {trade.result === 'WIN' ? 'W' : 'L'}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white leading-tight mb-1">{trade.market}</p>
                    <p className="text-[10px] font-bold opacity-30 tracking-[0.2em] uppercase">
                      {trade.direction} · {trade.odds.toFixed(2)} ODDS · {new Date(trade.time).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-12">
                  <div className="text-right">
                    <p className="text-[10px] font-bold opacity-20 tracking-widest uppercase mb-1">Position</p>
                    <p className="text-lg font-bold font-mono text-white">$1,250</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold opacity-20 tracking-widest uppercase mb-1">Result</p>
                    <p 
                      className="text-lg font-bold font-mono"
                      style={{ color: trade.result === 'WIN' ? '#C8FF00' : '#FF3B3B' }}
                    >
                      {trade.result === 'WIN' ? '+' : '-'}${Math.abs(trade.pnl).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
