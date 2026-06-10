'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function VaultPage() {
  const [amount, setAmount] = useState('')
  const [action, setAction] = useState<'deposit' | 'withdraw'>('deposit')
  const [toast, setToast] = useState('')

  const handleExecute = () => {
    if (!amount) return
    setToast(`> EXECUTING ${action.toUpperCase()} OF ${amount} USDC...`)
    setTimeout(() => setToast(`> ${action.toUpperCase()} SUCCESSFUL. TX: 0x8b...1a`), 1500)
    setTimeout(() => { setToast(''); setAmount('') }, 4000)
  }

  const isDeposit = action === 'deposit'
  const accent = isDeposit ? '#C8FF00' : '#ff3b3b'

  return (
    <div className="min-h-screen bg-[#030303] text-[#e8e8e8] font-sans">

      {/* HEADER */}
      <div className="border-b border-[#1a1a1a] bg-[#050505] px-12 py-5">
        <div className="max-w-[800px] mx-auto flex justify-between items-center flex-wrap gap-3">
          <div className="font-mono text-sm font-bold text-white tracking-tight">
            CONTRACT_INTERACTION <span className="text-primary">/vault/SIGMA-7</span>
          </div>
          <Link href="/dashboard" className="text-[#444] hover:text-white transition-colors no-underline font-mono text-xs">
            ← TERMINAL
          </Link>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-12 py-10 flex flex-col gap-6">

        {/* VAULT STATE */}
        <div className="bg-[#080808] border border-[#1a1a1a] relative">
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40" />
          <div className="px-6 py-3 border-b border-[#111] text-primary font-mono text-xs font-bold tracking-widest">
            &gt;&gt; VAULT_STATE_READ
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#111]">
            {[
              { label: 'TARGET_BOT',   value: 'SIGMA-7',          color: 'text-primary' },
              { label: 'CONTRACT',     value: '0x42f...e981',     color: 'text-white' },
              { label: 'SETTLEMENT',   value: 'USDC',             color: 'text-[#C8FF00]' },
              { label: 'GLOBAL_TVL',   value: '$1.4M USDC',       color: 'text-white' },
              { label: 'YOUR_BALANCE', value: '$50,000',          color: 'text-[#C8FF00]' },
              { label: 'UNREAL_PNL',   value: '+$7,440 (+14.9%)', color: 'text-[#C8FF00]' },
              { label: 'PERF_FEE',     value: '10%',              color: 'text-white' },
              { label: 'LOCKUP',       value: 'NONE',             color: 'text-white' },
            ].map((m) => (
              <div key={m.label} className="bg-[#080808] p-4">
                <div className="text-[9px] text-[#444] font-mono tracking-widest uppercase mb-1">{m.label}</div>
                <div className={`text-sm font-mono font-bold ${m.color}`}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* INTERACTION */}
        <div className="bg-[#080808] border border-dashed border-[#1a1a1a] p-6">
          <div className="text-[#C9A84C] font-mono text-xs font-bold tracking-widest mb-6">
            &gt;&gt; VAULT_WRITE_OPERATION
          </div>

          {/* Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setAction('deposit')}
              className={`flex-1 py-3 font-mono text-xs font-bold tracking-widest transition-all border ${
                isDeposit
                  ? 'bg-[#C8FF00]/10 text-[#C8FF00] border-[#C8FF00]/40'
                  : 'bg-transparent text-[#444] border-[#1a1a1a] hover:text-white hover:border-[#333]'
              }`}
            >
              DEPOSIT
            </button>
            <button
              onClick={() => setAction('withdraw')}
              className={`flex-1 py-3 font-mono text-xs font-bold tracking-widest transition-all border ${
                !isDeposit
                  ? 'bg-[#ff3b3b]/10 text-[#ff3b3b] border-[#ff3b3b]/40'
                  : 'bg-transparent text-[#444] border-[#1a1a1a] hover:text-white hover:border-[#333]'
              }`}
            >
              WITHDRAW
            </button>
          </div>

          {/* Amount */}
          <div className="mb-6">
            <label className="text-[10px] text-[#444] font-mono tracking-widest uppercase block mb-2">
              Input Amount (USDC)
            </label>
            <div className="flex">
              <span className="bg-[#030303] border border-[#1a1a1a] border-r-0 px-4 flex items-center text-[#444] font-mono">$</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-[#030303] border border-[#1a1a1a] text-white font-mono px-4 py-3 outline-none focus:border-[#333] transition-colors placeholder:text-[#333]"
              />
              <button
                onClick={() => setAmount(isDeposit ? '10000' : '57440')}
                className="bg-[#030303] border border-[#1a1a1a] border-l-0 px-5 text-primary font-mono text-xs font-bold hover:bg-[#0d0d0d] transition-colors"
              >
                MAX
              </button>
            </div>
          </div>

          <button
            onClick={handleExecute}
            disabled={!amount}
            className="w-full py-3.5 font-mono text-sm font-bold tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: amount ? accent : '#1a1a1a',
              color: amount ? '#030303' : '#444',
              boxShadow: amount ? `0 0 20px ${accent}44` : 'none',
            }}
          >
            EXECUTE_TRANSACTION
          </button>
        </div>

        {/* LOG */}
        <div className="font-mono text-xs">
          {toast ? (
            <div
              className="p-4 border"
              style={{
                color: toast.includes('SUCCESS') ? '#C8FF00' : '#ff3b3b',
                background: toast.includes('SUCCESS') ? 'rgba(200,255,0,0.06)' : 'rgba(255,59,59,0.06)',
                borderColor: toast.includes('SUCCESS') ? 'rgba(200,255,0,0.2)' : 'rgba(255,59,59,0.2)',
              }}
            >
              {toast}
            </div>
          ) : (
            <div className="p-4 text-[#333] border border-[#111]">
              <span className="cursor-blink">&gt; Awaiting user input</span>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
