'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import BuilderConsole from '@/components/dashboard/BuilderConsole'
import DepositorView from '@/components/dashboard/DepositorView'

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const [view, setView] = useState<'bots' | 'deposits'>('bots')

  // Gated: the dashboard is your private capital console.
  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-[#08080a] text-white font-sans flex flex-col items-center justify-center px-6 text-center">
        <div className="w-12 h-12 rounded-full border border-[#26262e] flex items-center justify-center mb-5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary" />
        </div>
        <h1 className="m-0 text-[22px] font-extrabold tracking-tight">Connect your wallet</h1>
        <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-[#8a8a94]">
          Your dashboard is private. Connect your wallet to see your bots, their capital and PnL, and manage your deposits.
        </p>
        <p className="mt-6 font-mono text-[11px] tracking-[0.16em] uppercase text-[#5a5a64]">use connect wallet, top right</p>
      </div>
    )
  }

  const short = `${address.slice(0, 6)}…${address.slice(-4)}`

  return (
    <div className="min-h-screen bg-[#08080a] text-white font-sans">
      <div className="max-w-[920px] mx-auto px-5 sm:px-6 py-8">

        {/* header: minimal identity — the profile + X live on /maker, not repeated here */}
        <div className="flex items-center justify-between gap-4 pb-5 border-b border-[#15151a]">
          <div>
            <h1 className="m-0 text-[24px] font-extrabold tracking-[-0.03em]">Dashboard<span className="text-primary">.</span></h1>
            <p className="mt-1 text-[13px] text-[#6a6a74]">Manage your bots and capital.</p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-2 text-[12px] text-[#b9b9c2] border border-[#26262e] rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />{short}
            </span>
          </div>
        </div>

        {/* tabs */}
        <div className="flex items-center gap-1 mt-5 mb-6">
          {([['bots', 'Your bots'], ['deposits', 'Your deposits']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                view === key ? 'bg-primary text-[#050505]' : 'text-[#9a9aa2] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {view === 'bots' ? <BuilderConsole address={address} /> : <DepositorView address={address} />}

      </div>
    </div>
  )
}
