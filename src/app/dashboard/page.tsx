'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BotCharacter } from '@/components/BotCharacter';
import { BotCard } from '@/components/BotCard';
import { bots } from '@/data/bots';
import toast from 'react-hot-toast';

const mockEarnings = [
  { month: 'Oct', earnings: 1200 },
  { month: 'Nov', earnings: 1890 },
  { month: 'Dec', earnings: 2100 },
  { month: 'Jan', earnings: 2450 },
  { month: 'Feb', earnings: 1980 },
  { month: 'Mar', earnings: 2760 },
  { month: 'Apr', earnings: 2341 },
];

const mockDeposits = [
  { bot: 'HERMES-Q', deposited: 10000, current: 14780, roi: 47.8 },
  { bot: 'PHANTOM-X', deposited: 5000, current: 6925, roi: 38.5 },
  { bot: 'SIGMA-FLOW', deposited: 3000, current: 3807, roi: 26.9 },
];

const publishSteps = [
  { id: 1, title: 'Bot Details', fields: ['Bot name', 'Description / tagline', 'Markets', 'Strategy type'] },
  { id: 2, title: 'Connect API', fields: ['API key (read-only)', 'Platform verification'] },
  { id: 3, title: 'Vault Settings', fields: ['Builder carry % (10-30%)', 'Min deposit', 'Max TVL cap', 'Lock period'] },
  { id: 4, title: 'Review + Publish', fields: ['Confirm all settings', 'Submit for verification'] },
];

export default function DashboardPage() {
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishStep, setPublishStep] = useState(1);

  // Mock: user's bots (first 2)
  const myBots = bots.slice(0, 2);

  const handleComingSoon = (action: string) => {
    toast(`Coming Soon — ${action} is not yet available.`, { icon: '🔐' });
  };

  return (
    <div className="min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-6xl">
        {/* ═══ PROFILE HEADER ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col sm:flex-row gap-6 items-center sm:items-start"
        >
          {/* Geometric avatar */}
          <div className="relative">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#C8FF00] to-[#7B2FFF] p-[2px]">
              <div className="h-full w-full rounded-2xl bg-[#161616] flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect x="4" y="4" width="14" height="14" rx="2" fill="#C8FF00" />
                  <rect x="22" y="4" width="14" height="14" rx="2" fill="#7B2FFF" />
                  <rect x="4" y="22" width="14" height="14" rx="2" fill="#00C2FF" />
                  <rect x="22" y="22" width="14" height="14" rx="2" fill="#FF6B35" />
                </svg>
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#161616] bg-[#C8FF00]" />
          </div>

          <div className="text-center sm:text-left flex-1">
            <h1 className="font-[var(--font-syne)] text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white mb-1">
              @Lord14sol
            </h1>
            <p className="text-xs text-[#666] font-mono mb-3">
              Wallet: 0x1234...5678
            </p>
            <div className="flex flex-wrap gap-4 justify-center sm:justify-start text-xs">
              <div>
                <span className="text-[#666] uppercase tracking-wider">Builder since</span>
                <span className="ml-2 text-white font-medium">Jan 2025</span>
              </div>
              <div>
                <span className="text-[#666] uppercase tracking-wider">Total earnings</span>
                <span className="ml-2 text-[#C8FF00] font-bold">$12,847</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleComingSoon('Settings')}
            className="rounded-lg border border-[#333] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#888] transition-all hover:border-[#C8FF00] hover:text-[#C8FF00]"
          >
            Settings
          </button>
        </motion.div>

        {/* ═══ MY BOTS ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="font-[var(--font-syne)] text-xl font-extrabold uppercase tracking-wide text-white mb-6">
            My Bots
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {myBots.map((bot, i) => (
              <BotCard key={bot.id} bot={bot} index={i} />
            ))}

            {/* Publish new bot card */}
            <motion.button
              onClick={() => {
                setShowPublishModal(true);
                setPublishStep(1);
              }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: myBots.length * 0.06 }}
              className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#333] bg-[#111] py-16 transition-all hover:border-[#C8FF00] hover:bg-[#161616] cursor-pointer min-h-[400px]"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">➕</div>
              <span className="font-[var(--font-syne)] text-sm font-bold uppercase tracking-wider text-[#888] group-hover:text-[#C8FF00] transition-colors">
                Publish New Bot
              </span>
            </motion.button>
          </div>
        </motion.div>

        {/* ═══ MY EARNINGS ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="font-[var(--font-syne)] text-xl font-extrabold uppercase tracking-wide text-white mb-6">
            My Earnings
          </h2>

          {/* Earning stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-[#222] bg-[#161616] p-5">
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#666] mb-1">Total Carry Earned</p>
              <p className="text-2xl font-bold text-[#C8FF00] font-[var(--font-syne)]">$12,847</p>
            </div>
            <div className="rounded-xl border border-[#222] bg-[#161616] p-5">
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#666] mb-1">This Month</p>
              <p className="text-2xl font-bold text-[#C8FF00] font-[var(--font-syne)]">$2,341</p>
            </div>
            <div className="rounded-xl border border-[#222] bg-[#161616] p-5">
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#666] mb-1">Pending (Unrealized)</p>
              <p className="text-2xl font-bold text-white font-[var(--font-syne)]">$891</p>
            </div>
          </div>

          {/* Earnings chart */}
          <div className="rounded-xl border border-[#222] bg-[#161616] p-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockEarnings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 11 }} axisLine={{ stroke: '#222' }} />
                <YAxis tick={{ fill: '#555', fontSize: 11 }} axisLine={{ stroke: '#222' }} />
                <Tooltip
                  contentStyle={{
                    background: '#161616',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#ededed',
                  }}
                  formatter={(value) => [`$${value}`, 'Earnings']}
                />
                <Bar dataKey="earnings" fill="#C8FF00" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* ═══ MY DEPOSITS ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="font-[var(--font-syne)] text-xl font-extrabold uppercase tracking-wide text-white mb-6">
            My Deposits
          </h2>
          <div className="overflow-x-auto rounded-xl border border-[#222] bg-[#161616]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111] border-b border-[#222]">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555]">Bot</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555]">Deposited</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555]">Current Value</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#555]">ROI</th>
                </tr>
              </thead>
              <tbody>
                {mockDeposits.map((dep) => (
                  <tr key={dep.bot} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-6 py-4 font-[var(--font-syne)] font-bold uppercase text-white">{dep.bot}</td>
                    <td className="px-4 py-4 text-[#888]">${dep.deposited.toLocaleString()}</td>
                    <td className="px-4 py-4 text-white font-medium">${dep.current.toLocaleString()}</td>
                    <td className={`px-4 py-4 font-bold ${dep.roi >= 0 ? 'text-[#C8FF00]' : 'text-[#FF3D00]'}`}>
                      +{dep.roi.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* ═══ PUBLISH BOT MODAL ═══ */}
      <AnimatePresence>
        {showPublishModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowPublishModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg rounded-2xl border border-[#222] bg-[#111] p-6 sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-[var(--font-syne)] text-xl font-extrabold uppercase tracking-wide text-white">
                  Publish New Bot
                </h2>
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="text-[#666] hover:text-white transition-colors text-xl"
                >
                  ✕
                </button>
              </div>

              {/* Step indicators */}
              <div className="flex items-center gap-2 mb-8">
                {publishSteps.map((step) => (
                  <div key={step.id} className="flex items-center gap-2 flex-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      publishStep >= step.id
                        ? 'bg-[#C8FF00] text-black'
                        : 'bg-[#222] text-[#666]'
                    }`}>
                      {publishStep > step.id ? '✓' : step.id}
                    </div>
                    {step.id < 4 && (
                      <div className={`flex-1 h-0.5 rounded-full transition-all ${
                        publishStep > step.id ? 'bg-[#C8FF00]' : 'bg-[#222]'
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Current step content */}
              <div className="mb-8">
                <h3 className="font-[var(--font-syne)] text-base font-bold uppercase text-white mb-4">
                  Step {publishStep}: {publishSteps[publishStep - 1].title}
                </h3>
                <div className="space-y-3">
                  {publishSteps[publishStep - 1].fields.map((field) => (
                    <div key={field}>
                      <label className="block text-[10px] font-medium uppercase tracking-widest text-[#666] mb-1.5">
                        {field}
                      </label>
                      <input
                        type="text"
                        placeholder={field}
                        className="w-full rounded-lg border border-[#222] bg-[#161616] px-4 py-2.5 text-sm text-white placeholder-[#444] outline-none focus:border-[#C8FF00] transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-between">
                <button
                  onClick={() => {
                    if (publishStep > 1) setPublishStep(publishStep - 1);
                    else setShowPublishModal(false);
                  }}
                  className="rounded-lg border border-[#333] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[#888] transition-all hover:border-[#666]"
                >
                  {publishStep === 1 ? 'Cancel' : 'Back'}
                </button>
                <button
                  onClick={() => {
                    if (publishStep < 4) {
                      setPublishStep(publishStep + 1);
                    } else {
                      handleComingSoon('Publishing');
                      setShowPublishModal(false);
                    }
                  }}
                  className="rounded-lg bg-[#C8FF00] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-black transition-all hover:shadow-[0_0_20px_#C8FF0044]"
                >
                  {publishStep === 4 ? 'Publish Bot' : 'Next'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
