'use client';

import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  positive?: boolean;
  negative?: boolean;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function StatCard({ label, value, positive, negative, suffix, prefix, className = '' }: StatCardProps) {
  const valueColor = positive ? 'text-[#C8FF00]' : negative ? 'text-[#FF3D00]' : 'text-white';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border border-[#222] bg-[#161616] p-4 sm:p-5 ${className}`}
    >
      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-[#666] mb-1.5">
        {label}
      </p>
      <p className={`text-xl sm:text-2xl font-bold font-[var(--font-syne)] ${valueColor}`}>
        {prefix}
        {value}
        {suffix}
      </p>
    </motion.div>
  );
}
