'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { BotCharacter } from '@/components/BotCharacter';
import { StatCard } from '@/components/StatCard';
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">🤖</p>
          <h1 className="font-[var(--font-syne)] text-2xl font-bold uppercase text-white mb-2">Bot Not Found</h1>
          <p className="text-[#666] text-sm">The vault you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  const handleDeposit = () => {
    toast('Coming Soon — Deposits are not yet available.', { icon: '💰' });
  };

  const handleWallet = () => {
    toast('Coming Soon — Wallet connect is not yet available.', { icon: '🔐' });
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
    <div className="min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-6xl">
        {/* ═══ BOT IDENTITY ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col sm:flex-row gap-8 items-center sm:items-start"
        >
          {/* Character */}
          <div
            className="rounded-2xl p-6 flex items-center justify-center"
            style={{ background: `${bot.color}15`, minWidth: 200 }}
          >
            <BotCharacter color={bot.color} mood={bot.mood} size="lg" animated />
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="font-[var(--font-syne)] text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-white mb-2">
              {bot.name}
            </h1>
            <p className="text-sm text-[#888] mb-3">
              by <span className="text-[#C8FF00]">@{bot.builder}</span>
            </p>
            <p className="text-sm text-[#666] italic mb-4 max-w-md">
              &ldquo;{bot.tagline}&rdquo;
            </p>

            <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start mb-4">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                bot.status === 'live'
                  ? 'border-[#C8FF00]/30 bg-[#C8FF00]/10 text-[#C8FF00]'
                  : bot.status === 'paused'
                  ? 'border-[#FF8F00]/30 bg-[#FF8F00]/10 text-[#FF8F00]'
                  : 'border-[#666]/30 bg-[#666]/10 text-[#666]'
              }`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                  bot.status === 'live' ? 'bg-[#C8FF00]' : bot.status === 'paused' ? 'bg-[#FF8F00]' : 'bg-[#666]'
                }`} />
                {bot.status}
              </span>
              <span className="text-[10px] text-[#666] uppercase tracking-wider">
                Published {bot.publishedDays} days ago
              </span>
            </div>

            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {bot.markets.map((m) => (
                <span
                  key={m}
                  className="rounded-md border border-[#222] bg-[#111] px-2.5 py-1 text-[10px] text-[#888] uppercase tracking-wider"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ═══ STATS ROW ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          <StatCard label="Win Rate" value={`${(bot.winRate * 100).toFixed(1)}%`} positive={bot.winRate > 0.55} negative={bot.winRate < 0.45} />
          <StatCard label="Brier Score" value={bot.brierScore.toFixed(3)} positive={bot.brierScore < 0.2} negative={bot.brierScore > 0.3} />
          <StatCard label="W/L" value={`${bot.wins} / ${bot.losses}`} />
          <StatCard label="Trades" value={bot.trades} />
          <StatCard label="Best Streak" value={`${bot.bestStreak}W`} positive />
          <StatCard label="Sharpe" value={bot.sharpe.toFixed(2)} positive={bot.sharpe > 1.5} negative={bot.sharpe < 0} />
        </div>

        {/* ═══ VAULT SECTION ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-10 rounded-2xl border border-[#222] bg-[#161616] p-6 sm:p-8"
        >
          <h2 className="font-[var(--font-syne)] text-xl font-extrabold uppercase tracking-wide text-white mb-6">
            Vault
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#666] mb-1">Total TVL</p>
              <p className="text-2xl font-bold text-white">${bot.tvl.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#666] mb-1">Depositors</p>
              <p className="text-2xl font-bold text-white">{bot.depositors}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#666] mb-1">Builder Carry</p>
              <p className="text-2xl font-bold text-white">{bot.builderCarry}%</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#666] mb-1">Platform Fee</p>
              <p className="text-2xl font-bold text-white">5%</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <p className="text-xs text-[#666]">Min deposit: <span className="text-white">$100</span></p>
            <div className="flex gap-3 flex-1 justify-end">
              <button
                onClick={handleWallet}
                className="rounded-lg border border-[#333] bg-transparent px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#888] transition-all hover:border-[#C8FF00] hover:text-[#C8FF00]"
              >
                Connect Wallet
              </button>
              <button
                onClick={handleDeposit}
                className="rounded-lg bg-[#C8FF00] px-6 py-3 text-xs font-bold uppercase tracking-wider text-black transition-all hover:shadow-[0_0_30px_#C8FF0066] hover:scale-105"
              >
                Deposit USDC
              </button>
            </div>
          </div>
        </motion.div>

        {/* ═══ PERFORMANCE CHART ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-10 rounded-2xl border border-[#222] bg-[#161616] p-6 sm:p-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="font-[var(--font-syne)] text-xl font-extrabold uppercase tracking-wide text-white">
              Performance
            </h2>
            <div className="flex gap-2 flex-wrap">
              {([
                ['cumulative', 'Cumulative ROI'],
                ['wr', 'Win Rate Rolling'],
                ['daily', 'Daily P&L'],
                ['brier', 'Brier Rolling'],
              ] as [ChartView, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setChartView(key)}
                  className={`rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                    chartView === key
                      ? 'bg-[#C8FF00]/10 text-[#C8FF00] border border-[#C8FF00]/30'
                      : 'text-[#666] border border-transparent hover:text-[#999]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Time range */}
          <div className="flex gap-2 mb-6">
            {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                  timeRange === range
                    ? 'bg-white/5 text-white border border-[#333]'
                    : 'text-[#555] hover:text-[#888]'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="h-[300px] sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'daily' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="day" tick={{ fill: '#555', fontSize: 10 }} axisLine={{ stroke: '#222' }} />
                  <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={{ stroke: '#222' }} />
                  <Tooltip
                    contentStyle={{
                      background: '#161616',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#ededed',
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#C8FF00"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="day" tick={{ fill: '#555', fontSize: 10 }} axisLine={{ stroke: '#222' }} />
                  <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={{ stroke: '#222' }} />
                  <Tooltip
                    contentStyle={{
                      background: '#161616',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#ededed',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#C8FF00"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#C8FF00' }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* ═══ RECENT TRADES ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-10 rounded-2xl border border-[#222] bg-[#161616] overflow-hidden"
        >
          <div className="p-6 sm:p-8 pb-0">
            <h2 className="font-[var(--font-syne)] text-xl font-extrabold uppercase tracking-wide text-white mb-6">
              Recent Trades
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111] border-b border-[#222]">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555]">Time</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555]">Market</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555]">Dir</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555]">Odds</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555]">Result</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555]">P&L</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555] hidden sm:table-cell">Conf</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555] hidden sm:table-cell">Edge</th>
                </tr>
              </thead>
              <tbody>
                {mockTrades.map((trade) => (
                  <tr
                    key={trade.id}
                    className={`border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors ${
                      trade.result === 'WIN' ? 'border-l-2 border-l-[#C8FF00]/40' : 'border-l-2 border-l-[#FF3D00]/40'
                    }`}
                  >
                    <td className="px-6 py-3 text-[#888] whitespace-nowrap">{trade.time}</td>
                    <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{trade.market}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                        trade.direction === 'YES' ? 'bg-[#C8FF00]/10 text-[#C8FF00]' : 'bg-[#FF3D00]/10 text-[#FF3D00]'
                      }`}>
                        {trade.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#888]">{(trade.odds * 100).toFixed(0)}¢</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${trade.result === 'WIN' ? 'text-[#C8FF00]' : 'text-[#FF3D00]'}`}>
                        {trade.result}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-bold ${trade.pnl >= 0 ? 'text-[#C8FF00]' : 'text-[#FF3D00]'}`}>
                      {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-[#888] hidden sm:table-cell">{(trade.confidence * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3 text-[#888] hidden sm:table-cell">{(trade.edge * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ═══ AGI LAYERS (ADAN only) ═══ */}
        {bot.layers && bot.layers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-10 rounded-2xl border border-[#222] bg-[#161616] p-6 sm:p-8"
          >
            <h2 className="font-[var(--font-syne)] text-xl font-extrabold uppercase tracking-wide text-white mb-4">
              AGI Layers
            </h2>
            <div className="flex flex-wrap gap-2">
              {bot.layers.map((layer) => (
                <span
                  key={layer}
                  className="rounded-full border border-[#C8FF00]/20 bg-[#C8FF00]/5 px-4 py-1.5 text-[11px] font-medium text-[#C8FF00] tracking-wide"
                >
                  {layer}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ ABOUT ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-10 rounded-2xl border border-[#222] bg-[#161616] p-6 sm:p-8"
        >
          <h2 className="font-[var(--font-syne)] text-xl font-extrabold uppercase tracking-wide text-white mb-4">
            About
          </h2>
          <p className="text-sm text-[#888] leading-relaxed max-w-3xl">
            {bot.description}
          </p>
          <div className="mt-4 flex gap-3">
            <span className="rounded-md border border-[#222] bg-[#111] px-3 py-1 text-[10px] text-[#666] uppercase tracking-wider">
              Strategy: {bot.strategyType}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
