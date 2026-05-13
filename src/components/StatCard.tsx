'use client';

import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  positive?: boolean;
  negative?: boolean;
  suffix?: string;
  prefix?: string;
  large?: boolean;
  className?: string;
}

export function StatCard({ label, value, positive, negative, suffix, prefix, large, className = '' }: StatCardProps) {
  const valueColor = positive ? 'text-[#00F0FF]' : negative ? 'text-[#FF3D00]' : 'text-white';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[32px] bg-white/5 backdrop-blur-xl p-6 sm:p-8 border border-white/10 ${className}`}
    >
      <p className={`font-[var(--font-dm-mono)] font-bold ${valueColor} ${large ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl'} mb-2 tracking-tighter`}>
        {prefix}
        {value}
        {suffix}
      </p>
      <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
        {label}
      </p>
    </motion.div>
  );
}
