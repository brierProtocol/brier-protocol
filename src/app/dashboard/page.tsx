'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BotCard } from '@/components/BotCard';
import { useBots } from '@/hooks/useBots';
import { useAccount } from 'wagmi';
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
  { bot: 'HERMES-Q', deposited: 10000, current: 14780, roi: 47.8, color: '#7B2FFF' },
  { bot: 'PHANTOM-X', deposited: 5000, current: 6925, roi: 38.5, color: '#FF1493' },
  { bot: 'SIGMA-FLOW', deposited: 3000, current: 3807, roi: 26.9, color: '#00BCD4' },
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
  
  // Form State
  const { address } = useAccount();
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    color: '#0A0A0A',
    strategyType: '',
    description: '',
    source: 'POLYMARKET',
    polyWalletAddress: '',
    builderCarry: 20,
    markets: 'Crypto',
  });

  const { data } = useBots();
  const allBots = data?.pages.flatMap(p => p.data) || [];
  const myBots = allBots.slice(0, 2);

  const handleComingSoon = (action: string) => {
    toast(`Coming Soon — ${action} is not yet available.`, { icon: '🔐' });
  };

  const handleDeploy = async () => {
    if (!address) {
      toast.error('Please connect your wallet first.');
      return;
    }

    try {
      const payload = {
        ...formData,
        builderAddress: address,
        markets: formData.markets.split(',').map(m => m.trim()),
        builderCarry: Number(formData.builderCarry)
      };

      const res = await fetch('/api/bots/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit bot');
      }

      toast.success('Bot successfully deployed for incubation!');
      setShowPublishModal(false);
      setPublishStep(1);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen px-4 py-10 sm:py-16 bg-[#F5F3EE]">
      <div className="mx-auto max-w-6xl">
        {/* ═══ PROFILE HEADER ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 flex flex-col sm:flex-row gap-8 items-center sm:items-start bg-white p-8 sm:p-10 rounded-[24px] shadow-sm"
        >
          {/* Geometric avatar */}
          <div className="relative shrink-0">
            <div className="h-28 w-28 rounded-[20px] bg-[#0A0A0A] p-[2px]">
              <div className="h-full w-full rounded-[18px] bg-white flex items-center justify-center overflow-hidden">
                <svg width="60" height="60" viewBox="0 0 40 40" fill="none">
                  <rect x="4" y="4" width="14" height="14" rx="4" fill="#C8FF00" />
                  <rect x="22" y="4" width="14" height="14" rx="4" fill="#7B2FFF" />
                  <rect x="4" y="22" width="14" height="14" rx="4" fill="#00C2FF" />
                  <rect x="22" y="22" width="14" height="14" rx="4" fill="#FF6B35" />
                </svg>
              </div>
            </div>
            <span className="absolute -bottom-2 -right-2 h-8 w-8 flex items-center justify-center rounded-full border-[3px] border-white bg-[#C8FF00] text-[#0A0A0A] text-lg">
              ✦
            </span>
          </div>

          <div className="text-center sm:text-left flex-1">
            <h1 className="font-[var(--font-syne)] text-[32px] sm:text-[48px] font-[900] uppercase tracking-tight text-[#0A0A0A] mb-1 leading-none">
              @Lord14sol
            </h1>
            <p className="font-[var(--font-dm-mono)] text-sm text-[#0A0A0A]/50 font-bold mb-5">
              0x1234...5678
            </p>
            
            <div className="flex flex-wrap gap-x-8 gap-y-4 justify-center sm:justify-start">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-[#0A0A0A]/40 mb-1">Builder Since</p>
                <p className="font-[var(--font-dm-mono)] font-bold text-[#0A0A0A] text-lg">Jan 2025</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-[#0A0A0A]/40 mb-1">Total Earnings</p>
                <p className="font-[var(--font-dm-mono)] font-bold text-[#0A0A0A] text-lg bg-[#C8FF00] px-2 rounded-md inline-block">$12,847</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-[#0A0A0A]/40 mb-1">Active Vaults</p>
                <p className="font-[var(--font-dm-mono)] font-bold text-[#0A0A0A] text-lg">2</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleComingSoon('Settings')}
            className="rounded-full border-2 border-[#0A0A0A] bg-transparent px-8 py-3 font-[var(--font-dm-mono)] text-sm font-bold uppercase tracking-wider text-[#0A0A0A] transition-all hover:bg-[#0A0A0A] hover:text-white active:scale-[0.97]"
          >
            Settings
          </button>
        </motion.div>

        {/* ═══ MY BOTS ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16"
        >
          <h2 className="font-[var(--font-syne)] text-[32px] font-[900] uppercase tracking-tight text-[#0A0A0A] mb-6">
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
              transition={{ delay: myBots.length * 0.05 }}
              whileHover={{ y: -4 }}
              className="group relative flex flex-col items-center justify-center rounded-[20px] bg-white border-2 border-dashed border-[#E0E0E0] py-16 transition-all hover:border-[#0A0A0A] cursor-pointer min-h-[380px]"
            >
              <div className="w-16 h-16 rounded-full bg-[#F5F3EE] flex items-center justify-center text-2xl mb-4 group-hover:bg-[#0A0A0A] group-hover:text-white transition-colors">
                +
              </div>
              <span className="font-[var(--font-syne)] text-[24px] font-[900] uppercase tracking-tight text-[#0A0A0A]">
                Deploy Bot
              </span>
            </motion.button>
          </div>
        </motion.div>

        {/* ═══ MY EARNINGS ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <h2 className="font-[var(--font-syne)] text-[32px] font-[900] uppercase tracking-tight text-[#0A0A0A] mb-6">
            Earnings
          </h2>

          <div className="bg-white rounded-[24px] p-6 sm:p-8 shadow-sm">
            {/* Earning stats */}
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <div className="rounded-[16px] bg-[#F5F3EE] p-6">
                <p className="font-[var(--font-dm-mono)] text-[40px] leading-none font-bold text-[#0A0A0A] mb-2">$12,847</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#0A0A0A]/50">Total Carry Earned</p>
              </div>
              <div className="rounded-[16px] bg-[#C8FF00] p-6">
                <p className="font-[var(--font-dm-mono)] text-[40px] leading-none font-bold text-[#0A0A0A] mb-2">$2,341</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#0A0A0A]/70">This Month</p>
              </div>
              <div className="rounded-[16px] bg-[#F5F3EE] p-6">
                <p className="font-[var(--font-dm-mono)] text-[40px] leading-none font-bold text-[#0A0A0A] mb-2">$891</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#0A0A0A]/50">Pending (Unrealized)</p>
              </div>
            </div>

            {/* Earnings chart */}
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockEarnings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={{ stroke: '#E0E0E0' }} tickLine={false} dy={10} />
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
                    formatter={(value) => [`$${value}`, 'Earnings']}
                  />
                  <Bar dataKey="earnings" fill="#0A0A0A" radius={[6, 6, 6, 6]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* ═══ MY DEPOSITS (Bento style) ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <h2 className="font-[var(--font-syne)] text-[32px] font-[900] uppercase tracking-tight text-[#0A0A0A] mb-6">
            My Deposits
          </h2>
          <div className="bg-white rounded-[24px] p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col gap-3">
              {mockDeposits.map((dep) => (
                <div key={dep.bot} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-[16px] bg-[#F5F3EE] gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-12 rounded-full" style={{ background: dep.color }} />
                    <span className="font-[var(--font-syne)] text-[24px] font-[900] uppercase text-[#0A0A0A]">{dep.bot}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-6 sm:gap-12 text-right">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-[#0A0A0A]/40 mb-1">Deposited</p>
                      <p className="font-[var(--font-dm-mono)] font-bold text-base text-[#0A0A0A]">${dep.deposited.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-[#0A0A0A]/40 mb-1">Current</p>
                      <p className="font-[var(--font-dm-mono)] font-bold text-base text-[#0A0A0A]">${dep.current.toLocaleString()}</p>
                    </div>
                    <div className="min-w-[70px]">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-[#0A0A0A]/40 mb-1">ROI</p>
                      <p className={`font-[var(--font-dm-mono)] font-bold text-xl ${dep.roi >= 0 ? 'text-[#0A0A0A]' : 'text-[#FF3D00]'}`}>
                        +{dep.roi.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
            onClick={() => setShowPublishModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-xl rounded-[32px] bg-white p-8 sm:p-10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-10">
                <h2 className="font-[var(--font-syne)] text-[32px] font-[900] uppercase tracking-tight text-[#0A0A0A]">
                  Publish Bot
                </h2>
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="h-10 w-10 rounded-full bg-[#F5F3EE] text-[#0A0A0A] flex items-center justify-center text-xl hover:bg-[#E0E0E0] transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Step indicators */}
              <div className="flex items-center gap-2 mb-10">
                {publishSteps.map((step) => (
                  <div key={step.id} className="flex items-center gap-2 flex-1">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-[var(--font-dm-mono)] text-sm font-bold transition-all ${
                      publishStep >= step.id
                        ? 'bg-[#0A0A0A] text-white'
                        : 'bg-[#F5F3EE] text-[#0A0A0A]/40'
                    }`}>
                      {publishStep > step.id ? '✓' : step.id}
                    </div>
                    {step.id < 4 && (
                      <div className={`flex-1 h-1 rounded-full transition-all ${
                        publishStep > step.id ? 'bg-[#0A0A0A]' : 'bg-[#F5F3EE]'
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Current step content */}
              <div className="mb-10 min-h-[220px]">
                <h3 className="font-[var(--font-syne)] text-[24px] font-[900] uppercase text-[#0A0A0A] mb-6">
                  {publishSteps[publishStep - 1].title}
                </h3>
                <div className="space-y-4">
                  {publishStep === 1 && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0A0A0A]/50 mb-2">Bot Name</label>
                        <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded-[16px] bg-[#F5F3EE] px-5 py-4 font-[var(--font-dm-mono)] text-sm outline-none focus:ring-2 focus:ring-[#0A0A0A]" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0A0A0A]/50 mb-2">Tagline</label>
                        <input type="text" value={formData.tagline} onChange={e => setFormData({...formData, tagline: e.target.value})} className="w-full rounded-[16px] bg-[#F5F3EE] px-5 py-4 font-[var(--font-dm-mono)] text-sm outline-none focus:ring-2 focus:ring-[#0A0A0A]" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0A0A0A]/50 mb-2">Brand Color (Hex)</label>
                        <input type="text" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className="w-full rounded-[16px] bg-[#F5F3EE] px-5 py-4 font-[var(--font-dm-mono)] text-sm outline-none focus:ring-2 focus:ring-[#0A0A0A]" />
                      </div>
                    </>
                  )}
                  {publishStep === 2 && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0A0A0A]/50 mb-2">Data Source</label>
                        <select value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full rounded-[16px] bg-[#F5F3EE] px-5 py-4 font-[var(--font-dm-mono)] text-sm outline-none focus:ring-2 focus:ring-[#0A0A0A]">
                          <option value="POLYMARKET">Polymarket</option>
                          <option value="KALSHI">Kalshi</option>
                        </select>
                      </div>
                      {formData.source === 'POLYMARKET' ? (
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0A0A0A]/50 mb-2">Polygon Wallet Address</label>
                          <input type="text" value={formData.polyWalletAddress} onChange={e => setFormData({...formData, polyWalletAddress: e.target.value})} className="w-full rounded-[16px] bg-[#F5F3EE] px-5 py-4 font-[var(--font-dm-mono)] text-sm outline-none focus:ring-2 focus:ring-[#0A0A0A]" />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0A0A0A]/50 mb-2">Kalshi API Key</label>
                          <input type="password" placeholder="Enter read-only API key" className="w-full rounded-[16px] bg-[#F5F3EE] px-5 py-4 font-[var(--font-dm-mono)] text-sm outline-none focus:ring-2 focus:ring-[#0A0A0A]" />
                        </div>
                      )}
                    </>
                  )}
                  {publishStep === 3 && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0A0A0A]/50 mb-2">Builder Carry (%)</label>
                        <input type="number" value={formData.builderCarry} onChange={e => setFormData({...formData, builderCarry: Number(e.target.value)})} className="w-full rounded-[16px] bg-[#F5F3EE] px-5 py-4 font-[var(--font-dm-mono)] text-sm outline-none focus:ring-2 focus:ring-[#0A0A0A]" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0A0A0A]/50 mb-2">Strategy Description</label>
                        <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full rounded-[16px] bg-[#F5F3EE] px-5 py-4 font-[var(--font-dm-mono)] text-sm outline-none focus:ring-2 focus:ring-[#0A0A0A] min-h-[100px]" />
                      </div>
                    </>
                  )}
                  {publishStep === 4 && (
                    <div className="bg-[#F5F3EE] rounded-[16px] p-6 text-sm font-[var(--font-dm-mono)]">
                      <p className="mb-2"><strong>Name:</strong> {formData.name}</p>
                      <p className="mb-2"><strong>Source:</strong> {formData.source}</p>
                      <p className="mb-2"><strong>Carry:</strong> {formData.builderCarry}%</p>
                      <p className="text-xs opacity-50 mt-4">By deploying, you agree to the Brier Protocol terms. Your bot will enter a 30-day incubation period.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    if (publishStep > 1) setPublishStep(publishStep - 1);
                    else setShowPublishModal(false);
                  }}
                  className="flex-1 rounded-[999px] border-2 border-[#0A0A0A] bg-transparent py-4 font-[var(--font-dm-mono)] text-sm font-bold uppercase tracking-wider text-[#0A0A0A] transition-all hover:bg-[#0A0A0A] hover:text-white active:scale-[0.97]"
                >
                  {publishStep === 1 ? 'Cancel' : 'Back'}
                </button>
                <button
                  onClick={() => {
                    if (publishStep < 4) {
                      setPublishStep(publishStep + 1);
                    } else {
                      handleDeploy();
                    }
                  }}
                  className="flex-1 rounded-[999px] bg-[#0A0A0A] py-4 font-[var(--font-dm-mono)] text-sm font-bold uppercase tracking-wider text-white transition-all hover:opacity-90 active:scale-[0.97]"
                >
                  {publishStep === 4 ? 'Deploy' : 'Next Step'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
