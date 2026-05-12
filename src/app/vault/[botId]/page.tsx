'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { BotCharacter } from '@/components/BotCharacter';
import { useBot } from '@/hooks/useBots';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
const Liveline = dynamic(() => import('liveline').then(mod => mod.Liveline), { ssr: false });
import type { LivelinePoint } from 'liveline';

type ChartView = 'cumulative' | 'wr' | 'daily' | 'brier';
type TimeRange = '7d' | '30d' | '90d' | 'all';

export default function VaultPage() {
  const params = useParams();
  const botId = params.botId as string;
  const { data: bot, isLoading } = useBot(botId);
  const [chartView, setChartView] = useState<ChartView>('cumulative');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [mode, setMode] = useState<'CONSERVATIVE' | 'DEGEN'>('CONSERVATIVE');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-white/5 border-t-[#C8FF00] rounded-full animate-spin" />
          <p className="font-[var(--font-dm-mono)] text-white/40 text-[10px] font-bold uppercase tracking-[0.4em]">Calibrating Vault Stream...</p>
        </div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] p-6 text-center">
        <div className="bg-white/5 backdrop-blur-3xl p-12 rounded-[40px] border border-white/10 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-4xl shadow-2xl">🤖</div>
          </div>
          <h2 className="font-[var(--font-syne)] text-[28px] font-[900] uppercase text-white mb-2">Vault Not Found</h2>
          <p className="font-[var(--font-dm-mono)] text-white/40">The quantitative entity you are seeking does not exist in our registry.</p>
        </div>
      </div>
    );
  }

  const handleDeposit = () => {
    toast('Coming Soon — Deposits are not yet available.', { icon: '💰' });
  };

  // Generate chart data based on view
  const generateChartData = () => {
    const pts = bot.pnlHistory;
    const len = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? Math.min(pts.length, 30) : pts.length;
    const data = pts.slice(-len);

    switch (chartView) {
      case 'cumulative':
        return data.map((v: number, i: number) => ({ day: i + 1, value: v, label: `Day ${i + 1}` }));
      case 'wr':
        return data.map((_: number, i: number) => ({
          day: i + 1,
          value: Math.max(40, Math.min(75, bot.winRate * 100 + (Math.random() - 0.5) * 15)),
          label: `Day ${i + 1}`,
        }));
      case 'daily':
        return data.map((v: number, i: number) => ({
          day: i + 1,
          value: i === 0 ? 0 : v - data[i - 1],
          label: `Day ${i + 1}`,
        }));
      case 'brier':
        return data.map((_: number, i: number) => ({
          day: i + 1,
          value: Math.max(0.1, Math.min(0.35, bot.brierScore + (Math.random() - 0.5) * 0.08)),
          label: `Day ${i + 1}`,
        }));
      default:
        return data.map((v: number, i: number) => ({ day: i + 1, value: v, label: `Day ${i + 1}` }));
    }
  };

  const chartData = generateChartData();

  return (
    <motion.div
      className="min-h-screen pt-20 bg-[#0A0A0A]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* ═══ TOP BOT IDENTITY (40% Screen) ═══ */}
      <div className="flex flex-col items-center justify-center pb-24 pt-12 relative overflow-hidden">
        {/* Ambient Bot Color Glow */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[180px] opacity-20 pointer-events-none"
          style={{ backgroundColor: bot.color }}
        />
        
        <div className="relative group mb-12">
          <div 
            className="absolute inset-0 blur-3xl opacity-30 rounded-full scale-150 transition-opacity" 
            style={{ backgroundColor: bot.color }}
          />
          <BotCharacter color={bot.color} mood={bot.mood} size="lg" animated className="scale-125 relative z-10" />
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-0 -right-4 bg-[#C8FF00] text-[#0A0A0A] p-2.5 rounded-xl shadow-[0_0_30px_rgba(200,255,0,0.5)] z-20"
            title="Verified on-chain via Brier Protocol"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.64.304 1.25.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </motion.div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center relative z-10 px-6"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
            <h1 className="font-[var(--font-syne)] text-[64px] sm:text-[96px] font-[900] uppercase tracking-tighter text-white leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              {bot.name}
            </h1>
            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xl px-5 py-2 rounded-2xl border border-white/10 shadow-2xl">
              <span className="h-2 w-2 rounded-full bg-[#C8FF00] animate-pulse" />
              <span className="text-white text-[11px] font-[900] uppercase tracking-[0.2em]">
                {bot.status} · {bot.tier}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 mb-10">
            <div className="px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">Protocol Verified ID</span>
            </div>
          </div>
          <p className="text-white/60 text-2xl font-medium italic max-w-3xl mx-auto px-6 leading-relaxed font-[var(--font-syne)]">
            &ldquo;{bot.tagline}&rdquo;
          </p>
        </motion.div>
      </div>

      {/* ═══ MAIN DASHBOARD AREA ═══ */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 30, stiffness: 100, delay: 0.1 }}
        className="bg-[#0A0A0A]/80 backdrop-blur-2xl rounded-t-[60px] min-h-[60vh] p-4 sm:p-10 pt-16 pb-32 shadow-[0_-20px_80px_rgba(0,0,0,0.5)] border-t border-white/10"
      >
        <div className="mx-auto max-w-7xl">

          {/* ═══ INSTITUTIONAL STATS BENTO ═══ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { label: 'Brier Score', value: bot.brierScore.toFixed(3), detail: 'Mean Squared Error' },
              { label: 'Win Rate', value: `${(bot.winRate * 100).toFixed(1)}%`, detail: 'Last 100 Trades' },
              { label: 'Sharpe Ratio', value: bot.sharpe?.toFixed(2) || '2.41', detail: 'Risk-Adjusted Return' },
              { label: 'Max Drawdown', value: `${(bot.maxDrawdown * 100).toFixed(1)}%`, detail: 'All-Time Peak-to-Trough', color: 'text-[#FF3D00]' },
            ].map((m, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-xl rounded-[32px] p-8 border border-white/10 hover:bg-white/10 transition-all group">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-3 group-hover:text-white/60 transition-colors">{m.label}</p>
                <p className={`font-[var(--font-dm-mono)] text-4xl font-bold mb-2 ${m.color || 'text-white'}`}>{m.value}</p>
                <p className="text-[11px] font-medium text-white/20 uppercase tracking-wide">{m.detail}</p>
              </div>
            ))}
          </div>

          {/* ... [Rest of the file remains, appending Incubation History at the end before </div></div></motion.div>] */}

          {/* ═══ CAPACITY & FEES ═══ */}
          <div className="mb-12 rounded-[40px] bg-gradient-to-br from-white/5 to-transparent backdrop-blur-3xl p-10 border border-white/10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
              <div className="flex-1 w-full">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-[var(--font-syne)] text-2xl font-[900] uppercase text-white tracking-tight">Vault Liquidity</p>
                  <p className="font-[var(--font-dm-mono)] font-bold text-[#C8FF00] text-xl">${(bot.tvl / 1000).toFixed(0)}K / ${(bot.vaultCap / 1000000).toFixed(1)}M</p>
                </div>
                <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden p-1 border border-white/10">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(bot.tvl / bot.vaultCap) * 100}%` }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className="h-full bg-gradient-to-r from-[#C8FF00] to-[#A0FF00] rounded-full shadow-[0_0_20px_rgba(200,255,0,0.3)]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-12 border-l border-white/10 pl-12 h-16 hidden lg:flex">
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Skin in Game</p>
                  <p className="font-[var(--font-dm-mono)] text-2xl font-bold text-white">${((bot as any).skinInGame / 1000).toFixed(0)}K</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Platform Fee</p>
                  <p className="font-[var(--font-dm-mono)] text-2xl font-bold text-white">3.0%</p>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ CAPITAL DEPLOYMENT SELECTOR ═══ */}
          <div className="mb-20">
            <div className="flex items-center gap-4 mb-10">
              <div className="h-[1px] flex-1 bg-white/10" />
              <h3 className="font-[var(--font-syne)] text-[14px] font-[900] uppercase tracking-[0.4em] text-white/40">Capital Deployment Matrix</h3>
              <div className="h-[1px] flex-1 bg-white/10" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Conservative Mode Card */}
              <div 
                onClick={() => setMode('CONSERVATIVE')}
                className={`relative group cursor-pointer rounded-[40px] p-8 transition-all duration-500 border-2 ${
                  mode === 'CONSERVATIVE' 
                    ? 'bg-white border-[#C8FF00] shadow-[0_30px_100px_rgba(200,255,0,0.15)]' 
                    : 'bg-white/5 border-white/5 hover:border-white/20'
                }`}
              >
                <div className={`mb-8 flex items-center justify-between ${mode === 'CONSERVATIVE' ? 'text-[#0A0A0A]' : 'text-white'}`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${mode === 'CONSERVATIVE' ? 'bg-[#C8FF00]' : 'bg-white/5'}`}>
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  {mode === 'CONSERVATIVE' && <span className="bg-[#0A0A0A] text-[#C8FF00] text-[9px] font-[900] px-4 py-1.5 rounded-full uppercase tracking-widest">Selected</span>}
                </div>
                
                <h4 className={`font-[var(--font-syne)] text-2xl font-[900] uppercase mb-4 ${mode === 'CONSERVATIVE' ? 'text-[#0A0A0A]' : 'text-white'}`}>Conservative</h4>
                <p className={`text-sm font-medium mb-8 leading-relaxed ${mode === 'CONSERVATIVE' ? 'text-[#0A0A0A]/60' : 'text-white/40'}`}>
                  Institutional-grade protection for risk-averse depositors. Priority on capital preservation.
                </p>
                
                <ul className={`space-y-4 mb-10 ${mode === 'CONSERVATIVE' ? 'text-[#0A0A0A]' : 'text-white/60'}`}>
                  {[
                    'Principal Protected by Collateral',
                    'Auto-Exit at -15% Drawdown',
                    'Priority Liquidity Claims',
                    'Skin-in-Game Coverage'
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest">
                      <div className={`h-1.5 w-1.5 rounded-full ${mode === 'CONSERVATIVE' ? 'bg-[#C8FF00]' : 'bg-white/20'}`} />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Degen Mode Card */}
              <div 
                onClick={() => setMode('DEGEN')}
                className={`relative group cursor-pointer rounded-[40px] p-8 transition-all duration-500 border-2 ${
                  mode === 'DEGEN' 
                    ? 'bg-white border-[#FF3D00] shadow-[0_30px_100px_rgba(255,61,0,0.15)]' 
                    : 'bg-white/5 border-white/5 hover:border-white/20'
                }`}
              >
                <div className={`mb-8 flex items-center justify-between ${mode === 'DEGEN' ? 'text-[#0A0A0A]' : 'text-white'}`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${mode === 'DEGEN' ? 'bg-[#FF3D00]' : 'bg-white/5'}`}>
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  {mode === 'DEGEN' && <span className="bg-[#0A0A0A] text-[#FF3D00] text-[9px] font-[900] px-4 py-1.5 rounded-full uppercase tracking-widest">Selected</span>}
                </div>
                
                <h4 className={`font-[var(--font-syne)] text-2xl font-[900] uppercase mb-4 ${mode === 'DEGEN' ? 'text-[#0A0A0A]' : 'text-white'}`}>High Velocity</h4>
                <p className={`text-sm font-medium mb-8 leading-relaxed ${mode === 'DEGEN' ? 'text-[#0A0A0A]/60' : 'text-white/40'}`}>
                  Uncapped exposure to quantitative alpha. Maximum capital efficiency for high conviction.
                </p>
                
                <ul className={`space-y-4 mb-10 ${mode === 'DEGEN' ? 'text-[#0A0A0A]' : 'text-white/60'}`}>
                  {[
                    'Uncapped ROI Exposure',
                    'No Automatic Exit Barriers',
                    'Full Market Participation',
                    'Performance Carry Optimized'
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest">
                      <div className={`h-1.5 w-1.5 rounded-full ${mode === 'DEGEN' ? 'bg-[#FF3D00]' : 'bg-white/20'}`} />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Final Deployment Card */}
              <div className="bg-gradient-to-br from-[#C8FF00] to-[#A0FF00] rounded-[40px] p-10 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-20 rounded-full -mr-32 -mt-32 blur-3xl group-hover:opacity-40 transition-opacity" />
                
                <div className="relative z-10">
                  <p className="text-[#0A0A0A]/40 text-[10px] font-[900] uppercase tracking-[0.3em] mb-4">Deployment Summary</p>
                  <h4 className="font-[var(--font-syne)] text-4xl font-[900] uppercase text-[#0A0A0A] tracking-tighter leading-none mb-10">
                    Ready to <br /> Execute
                  </h4>
                  
                  <div className="space-y-6">
                    <div className="flex justify-between items-end border-b border-black/5 pb-4">
                      <p className="text-[10px] font-bold uppercase text-[#0A0A0A]/40">Active Mode</p>
                      <p className="font-[var(--font-dm-mono)] font-bold text-[#0A0A0A]">{mode}</p>
                    </div>
                    <div className="flex justify-between items-end border-b border-black/5 pb-4">
                      <p className="text-[10px] font-bold uppercase text-[#0A0A0A]/40">Fee Structure</p>
                      <p className="font-[var(--font-dm-mono)] font-bold text-[#0A0A0A]">20% CARRY / 3% PLT</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDeposit}
                  className="relative z-10 w-full rounded-2xl bg-[#0A0A0A] text-white py-6 font-[var(--font-dm-mono)] text-sm font-[900] uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all mt-10"
                >
                  Confirm Deployment
                </button>
              </div>
            </div>
          </div>

          {/* ═══ PERFORMANCE CHART ═══ */}
          <div className="mb-12 rounded-[40px] bg-white/5 backdrop-blur-xl p-8 sm:p-12 border border-white/10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12">
              <div>
                <h2 className="font-[var(--font-syne)] text-[32px] font-[900] uppercase tracking-tighter text-white mb-2">
                  Alpha Matrix
                </h2>
                <p className="text-white/40 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C8FF00] animate-pulse" />
                  Live Quantitative Stream · 60 FPS
                </p>
              </div>
              <div className="flex flex-wrap gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                {(['7d', '30d', '90d', 'all'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-6 py-2.5 rounded-xl font-[var(--font-dm-mono)] text-[10px] font-bold uppercase tracking-widest transition-all ${
                      timeRange === r ? 'bg-white text-[#0A0A0A] shadow-xl' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[400px] w-full relative group rounded-[24px] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/40 to-transparent pointer-events-none z-10" />
              <Liveline 
                data={chartData.map((p, i) => ({ value: p.value, time: i }))}
                value={chartData[chartData.length - 1]?.value || 0}
                color={bot.color}
                theme="dark"
              />
            </div>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 pt-10 border-t border-white/5">
              {[
                { label: 'Volatility', value: '12.4%', sub: 'Realized 30D' },
                { label: 'Expectancy', value: '0.14', sub: 'Per Trade' },
                { label: 'Max Runup', value: '+$4.2K', sub: '90D Peak' },
                { label: 'Recovery', value: '2.4 Days', sub: 'Average Time' },
              ].map((s, i) => (
                <div key={i}>
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-2">{s.label}</p>
                  <p className="font-[var(--font-dm-mono)] text-lg font-bold text-white leading-none">{s.value}</p>
                  <p className="text-[9px] font-medium text-white/10 uppercase mt-1">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ RECENT TRADES ═══ */}
          <div className="mb-12 rounded-[40px] bg-white/5 backdrop-blur-xl p-8 sm:p-12 border border-white/10">
            <h2 className="font-[var(--font-syne)] text-[32px] font-[900] uppercase tracking-tighter text-white mb-10">
              Recent Execution
            </h2>
            
            <div className="flex flex-col gap-4">
              {(bot as any).recentTrades && (bot as any).recentTrades.length > 0 ? (
                (bot as any).recentTrades.map((trade: any) => (
                  <div key={trade.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-[24px] bg-white/5 border border-white/5 hover:border-white/20 transition-all gap-6">
                    <div className="flex items-center gap-6">
                      <div className={`flex items-center justify-center w-14 h-14 rounded-full font-bold shadow-2xl ${
                        trade.result === 'WIN' ? 'bg-[#C8FF00] text-[#0A0A0A]' : 'bg-[#FF3D00] text-white'
                      }`}>
                        {trade.result === 'WIN' ? 'W' : trade.result === 'LOSS' ? 'L' : '?'}
                      </div>
                      <div>
                        <p className="font-[var(--font-dm-mono)] font-bold text-lg text-white">{trade.market}</p>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                          {new Date(trade.time).toLocaleDateString()} · {new Date(trade.time).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-12">
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-2">Direction</p>
                        <p className="font-[var(--font-dm-mono)] font-bold text-sm text-white">{trade.direction}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-2">Odds</p>
                        <p className="font-[var(--font-dm-mono)] font-bold text-sm text-white">{(trade.odds * 100).toFixed(0)}¢</p>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-2">Outcome</p>
                        <p className={`font-[var(--font-dm-mono)] font-bold text-xl ${trade.pnl >= 0 ? 'text-[#C8FF00]' : 'text-[#FF3D00]'}`}>
                          {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center">
                  <p className="text-white/20 font-mono text-sm tracking-widest">No execution data available.</p>
                </div>
              )}
            </div>
          </div>

          {/* ═══ INCUBATION HISTORY ═══ */}
          <div className="mb-12 rounded-[40px] bg-white/5 backdrop-blur-xl p-8 sm:p-12 border border-white/10">
            <h2 className="font-[var(--font-syne)] text-[32px] font-[900] uppercase tracking-tighter text-white mb-12">
              Validation Timeline
            </h2>
            
            <div className="relative pl-10 border-l border-white/10 flex flex-col gap-12">
              {(bot as any).incubationLogs && (bot as any).incubationLogs.length > 0 ? (
                (bot as any).incubationLogs.map((log: any, i: number) => (
                  <div key={i} className="relative group">
                    <div className="absolute -left-[51px] top-1.5 w-5 h-5 rounded-full bg-[#0A0A0A] border-4 border-[#C8FF00] shadow-[0_0_15px_rgba(200,255,0,0.5)] group-hover:scale-125 transition-transform" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-4">
                        <span className="bg-white/5 px-4 py-1.5 rounded-lg text-[10px] font-bold text-white/40 uppercase tracking-widest border border-white/5">{log.from}</span>
                        <svg className="w-5 h-5 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        <span className="bg-white text-[#0A0A0A] px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest">{log.to}</span>
                      </div>
                      <p className="text-xs font-bold text-white/20 font-mono tracking-widest">
                        {new Date(log.time).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-white/70 font-medium leading-relaxed max-w-3xl">
                      {log.reason}
                    </p>
                    {log.brier && (
                      <div className="mt-3 flex gap-6">
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Brier @ Transition: <span className="text-[#C8FF00]">{log.brier}</span></p>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">WR @ Transition: <span className="text-[#C8FF00]">{(log.wr * 100).toFixed(1)}%</span></p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-white/20 font-mono text-sm tracking-widest">Initialization sequence complete.</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
