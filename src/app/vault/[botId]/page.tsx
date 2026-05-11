'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { BotCharacter } from '@/components/BotCharacter';
import { getBotById } from '@/data/bots';
import { mockTrades } from '@/data/trades';
import toast from 'react-hot-toast';

type ChartView = 'cumulative' | 'wr' | 'daily' | 'brier';
type TimeRange = '7d' | '30d' | '90d' | 'all';

export default function VaultPage() {
  const params = useParams();
  const botId = params.botId as string;
  const bot = getBotById(botId);
  const [chartView, setChartView] = useState<ChartView>('cumulative');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  if (!bot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3EE]">
        <div className="text-center">
          <p className="text-4xl mb-4">🤖</p>
          <h1 className="font-[var(--font-syne)] text-[32px] font-[900] uppercase text-[#0A0A0A] mb-2">Bot Not Found</h1>
          <p className="text-[#0A0A0A]/60 font-medium">The vault you&apos;re looking for doesn&apos;t exist.</p>
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
        return data.map((v, i) => ({ day: i + 1, value: v, label: `Day ${i + 1}` }));
      case 'wr':
        return data.map((_, i) => ({
          day: i + 1,
          value: Math.max(40, Math.min(75, bot.winRate * 100 + (Math.random() - 0.5) * 15)),
          label: `Day ${i + 1}`,
        }));
      case 'daily':
        return data.map((v, i) => ({
          day: i + 1,
          value: i === 0 ? 0 : v - data[i - 1],
          label: `Day ${i + 1}`,
        }));
      case 'brier':
        return data.map((_, i) => ({
          day: i + 1,
          value: Math.max(0.1, Math.min(0.35, bot.brierScore + (Math.random() - 0.5) * 0.08)),
          label: `Day ${i + 1}`,
        }));
      default:
        return data.map((v, i) => ({ day: i + 1, value: v, label: `Day ${i + 1}` }));
    }
  };

  const chartData = generateChartData();

  return (
    <motion.div
      className="min-h-screen pt-20"
      initial={{ backgroundColor: '#F5F3EE' }}
      animate={{ backgroundColor: bot.color }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    >
      {/* ═══ TOP BOT IDENTITY (40% Screen) ═══ */}
      <div className="flex flex-col items-center justify-center pb-12 pt-4">
        <BotCharacter color={bot.color} mood={bot.mood} size="lg" animated className="mb-8 scale-125" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h1 className="font-[var(--font-syne)] text-[48px] sm:text-[72px] font-[900] uppercase tracking-tight text-white leading-none mb-4">
            {bot.name}
          </h1>
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="rounded-[999px] bg-white px-4 py-1.5 text-sm font-bold capitalize" style={{ color: bot.color }}>
              {bot.mood} Entity
            </span>
            <span className="text-white/80 font-medium">by @{bot.builder}</span>
          </div>
          <p className="text-white text-lg font-medium italic max-w-xl mx-auto opacity-90 px-4">
            &ldquo;{bot.tagline}&rdquo;
          </p>
        </motion.div>
      </div>

      {/* ═══ WHITE SLIDE-UP CARD ═══ */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 120, delay: 0.1 }}
        className="bg-[#F5F3EE] rounded-t-[40px] min-h-[60vh] p-4 sm:p-8 pt-10 sm:pt-14 pb-24 shadow-2xl"
      >
        <div className="mx-auto max-w-6xl">

          {/* ═══ MAIN STATS ROW ═══ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-[20px] bg-white p-6 sm:p-8 flex flex-col justify-center">
              <p className="font-[var(--font-dm-mono)] text-[48px] sm:text-[64px] leading-[1.1] font-bold text-[#0A0A0A]">
                {bot.brierScore.toFixed(3)}
              </p>
              <p className="text-sm font-medium uppercase tracking-wider text-[#0A0A0A]/50 mt-1">Brier Score</p>
            </div>
            <div className="rounded-[20px] bg-white p-6 sm:p-8 flex flex-col justify-center">
              <p className="font-[var(--font-dm-mono)] text-[48px] sm:text-[64px] leading-[1.1] font-bold text-[#0A0A0A]">
                {(bot.winRate * 100).toFixed(1)}%
              </p>
              <p className="text-sm font-medium uppercase tracking-wider text-[#0A0A0A]/50 mt-1">Win Rate</p>
            </div>
            <div className="rounded-[20px] bg-white p-6 sm:p-8 flex flex-col justify-center">
              <p className="font-[var(--font-dm-mono)] text-[48px] sm:text-[64px] leading-[1.1] font-bold text-[#0A0A0A]">
                ${(bot.tvl / 1000).toFixed(0)}k
              </p>
              <p className="text-sm font-medium uppercase tracking-wider text-[#0A0A0A]/50 mt-1">Vault TVL</p>
            </div>
          </div>

          {/* ═══ DEPOSIT CTA BAR ═══ */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 rounded-[20px] bg-white p-6 sm:p-8">
            <div>
              <h3 className="font-[var(--font-syne)] text-[24px] font-[900] uppercase text-[#0A0A0A] mb-1">
                Deposit to {bot.name}
              </h3>
              <p className="text-[#0A0A0A]/60 font-medium">
                Builder Carry: {bot.builderCarry}% · Platform Fee: 5%
              </p>
            </div>
            <button
              onClick={handleDeposit}
              className="w-full sm:w-auto rounded-[999px] bg-[#0A0A0A] px-10 py-5 font-[var(--font-dm-mono)] text-sm font-bold uppercase tracking-wider text-white transition-all active:scale-[0.97]"
            >
              Deposit USDC
            </button>
          </div>

          {/* ═══ PERFORMANCE CHART ═══ */}
          <div className="mb-8 rounded-[20px] bg-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <h2 className="font-[var(--font-syne)] text-[32px] font-[900] uppercase tracking-tight text-[#0A0A0A]">
                Performance
              </h2>
              <div className="flex gap-2 bg-[#F5F3EE] p-1 rounded-full">
                {([
                  ['cumulative', 'ROI'],
                  ['wr', 'W/R'],
                  ['daily', 'Daily'],
                  ['brier', 'Brier'],
                ] as [ChartView, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setChartView(key)}
                    className={`rounded-full px-5 py-2 font-[var(--font-dm-mono)] text-xs font-bold uppercase tracking-wider transition-all ${
                      chartView === key
                        ? 'bg-[#0A0A0A] text-white shadow-sm'
                        : 'text-[#0A0A0A]/60 hover:text-[#0A0A0A]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[350px] sm:h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartView === 'daily' ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={{ stroke: '#E0E0E0' }} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
                    <Tooltip
                      cursor={{ fill: '#F5F3EE' }}
                      contentStyle={{
                        background: '#FFFFFF',
                        border: 'none',
                        borderRadius: '16px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                        fontSize: '14px',
                        fontFamily: 'var(--font-dm-mono)',
                        fontWeight: 'bold',
                        color: '#0A0A0A',
                      }}
                    />
                    <Bar dataKey="value" fill={bot.color} radius={[6, 6, 6, 6]} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={{ stroke: '#E0E0E0' }} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
                    <Tooltip
                      contentStyle={{
                        background: '#FFFFFF',
                        border: 'none',
                        borderRadius: '16px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                        fontSize: '14px',
                        fontFamily: 'var(--font-dm-mono)',
                        fontWeight: 'bold',
                        color: '#0A0A0A',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={bot.color}
                      strokeWidth={4}
                      dot={false}
                      activeDot={{ r: 6, fill: bot.color, stroke: '#FFF', strokeWidth: 2 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* ═══ RECENT TRADES (BENTO STYLE) ═══ */}
          <div className="mb-8 rounded-[20px] bg-white overflow-hidden p-6 sm:p-8">
            <h2 className="font-[var(--font-syne)] text-[32px] font-[900] uppercase tracking-tight text-[#0A0A0A] mb-8">
              Recent Trades
            </h2>
            
            <div className="flex flex-col gap-3">
              {mockTrades.slice(0, 10).map((trade) => (
                <div key={trade.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-[16px] bg-[#F5F3EE] gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold ${
                      trade.result === 'WIN' ? 'bg-[#C8FF00] text-[#0A0A0A]' : 'bg-[#FF3D00] text-white'
                    }`}>
                      {trade.result === 'WIN' ? 'W' : 'L'}
                    </div>
                    <div>
                      <p className="font-[var(--font-dm-mono)] font-bold text-[15px] text-[#0A0A0A]">{trade.market}</p>
                      <p className="text-xs text-[#0A0A0A]/50 font-medium">{trade.time}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8 sm:gap-12">
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-[#0A0A0A]/50 font-bold mb-1">Direction</p>
                      <p className="font-[var(--font-dm-mono)] font-bold text-sm text-[#0A0A0A]">{trade.direction}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-[#0A0A0A]/50 font-bold mb-1">Odds</p>
                      <p className="font-[var(--font-dm-mono)] font-bold text-sm text-[#0A0A0A]">{(trade.odds * 100).toFixed(0)}¢</p>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-[10px] uppercase tracking-wider text-[#0A0A0A]/50 font-bold mb-1">PnL</p>
                      <p className={`font-[var(--font-dm-mono)] font-bold text-lg ${trade.pnl >= 0 ? 'text-[#0A0A0A]' : 'text-[#FF3D00]'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}
