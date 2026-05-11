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
  const valueColor = positive ? 'text-[#C8FF00]' : negative ? 'text-[#FF3D00]' : 'text-[#0A0A0A]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[20px] bg-white p-5 sm:p-6 ${className}`}
    >
      <p className={`font-[var(--font-dm-mono)] font-bold ${valueColor} ${large ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl'} mb-1`}>
        {prefix}
        {value}
        {suffix}
      </p>
      <p className="text-xs font-medium text-[#0A0A0A]/50 uppercase tracking-wider">
        {label}
      </p>
    </motion.div>
  );
}
