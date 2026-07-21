'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

// Defined as its own module component (not inside the page) — a component
// redefined on every render gets a new identity, so React remounts its subtree
// and inputs lose focus after one keystroke. That was the "can only type one
// letter" comment bug. Panels rise into view once as you scroll; border warms
// on hover.
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`rounded-2xl border border-[#1a1a1a] bg-[#080809] overflow-hidden transition-colors duration-300 hover:border-[#26262e] ${className}`}
    >{children}</motion.div>
  )
}

export default Panel
