'use client'

import Link from 'next/link'
import { HowItWorksDeck } from '@/components/ui/HowItWorks'

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-[#e8e8e8] flex flex-col">
      <div className="border-b border-[#1a1a1a] bg-[#050505] px-8 py-4 flex justify-between items-center">
        <div className="font-mono text-sm font-bold text-white tracking-tight">HOW_IT_WORKS</div>
        <Link href="/" className="text-[#444] hover:text-white transition-colors no-underline font-mono text-xs">← HOME</Link>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-[920px] h-[600px] max-h-[85vh] border border-[#1a1a1a] overflow-hidden">
          <HowItWorksDeck />
        </div>
      </div>
    </div>
  )
}
