'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useWriteContract } from 'wagmi'
import { parseUnits } from 'viem'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import { botEye } from '@/lib/botIdentity'
import { brierVaultABI } from '@/lib/abis/BrierVault'
import type { Allocation, DashboardHistoryItem } from '@/types'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface DashboardData {
  portfolioValue: number; totalDeposited: number; yield30d: number; totalEarned: number
  annualizedReturn: number; activePositions: number
  allocations: Allocation[]; history: DashboardHistoryItem[]
}

const fmtUsd = (n: number) => `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`

export default function DepositorView({ address }: { address: string }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [withdrawInputs, setWithdrawInputs] = useState<Record<string, string>>({})
  const { writeContract: redeemShares, isPending: isRedeeming } = useWriteContract()

  useEffect(() => {
    if (!address) return
    setLoading(true)
    fetch(`/api/dashboard?address=${address}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [address])

  const handleRedeem = (vaultAddress: string) => {
    const amt = withdrawInputs[vaultAddress]
    if (!amt || isNaN(Number(amt)) || !address) return
    redeemShares({
      address: vaultAddress as `0x${string}`, abi: brierVaultABI, functionName: 'redeem',
      args: [parseUnits(amt, 6), address as `0x${string}`, address as `0x${string}`],
    }, { onSuccess: () => setWithdrawInputs(prev => ({ ...prev, [vaultAddress]: '' })) })
  }

  if (loading) {
    return <div className="py-16 text-center font-mono text-[11px] tracking-[0.2em] uppercase text-[#5a5a64] animate-pulse">loading your deposits…</div>
  }

  const d = data
  const stats = [
    { lab: 'Portfolio value', val: fmtUsd(d?.portfolioValue || 0), cls: 'text-white' },
    { lab: 'Invested', val: fmtUsd(d?.totalDeposited || 0), cls: 'text-white' },
    { lab: 'Earned', val: `${(d?.totalEarned || 0) >= 0 ? '+' : ''}${fmtUsd(d?.totalEarned || 0)}`, cls: (d?.totalEarned || 0) >= 0 ? 'text-[#37d67a]' : 'text-[#ff5570]' },
    { lab: 'Active positions', val: String(d?.activePositions || 0), cls: 'text-white' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.lab} className="bg-[#0e0e12] border border-[#1a1a20] rounded-xl p-4">
            <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#74747e]">{s.lab}</div>
            <div className={`text-[22px] font-bold mt-1.5 ${s.cls}`}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#0b0b0e] border border-[#1a1a20] rounded-xl p-4">
        <div className="text-[13px] text-[#9a9aa2] leading-relaxed">
          Capital is deployed via ERC-4626 shares. Exit is instant: shares redeem 1:1 at current NAV, principal plus profit in one transaction. Builder 30% and protocol 10% are taken from profit only.
        </div>
      </div>

      {/* positions */}
      <div className="flex items-baseline justify-between mt-1 px-1">
        <span className="text-[14px] font-semibold text-white">Your positions</span>
        <span className="text-[11px] text-[#6a6a74]">{d?.allocations?.length || 0} active</span>
      </div>

      {d?.allocations && d.allocations.length > 0 ? (
        <div className="flex flex-col gap-3">
          {d.allocations.map((a: any, i) => (
            <div key={i} className="bg-[#0e0e12] border border-[#1a1a20] rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                  {a.pfpUrl
                    ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={a.pfpUrl} alt={a.bot} className="w-full h-full object-cover" />
                    : <BotIrisAvatar {...botEye(a)} size={40} bg="transparent" />}
                </span>
                <div className="min-w-0">
                  <Link href={`/bot/${a.slug}`} className="text-[14px] font-semibold text-white no-underline hover:text-primary transition-colors truncate block">{a.bot}</Link>
                  <div className="font-mono text-[10px] text-[#5a5a64]">{(a.mode || 'CONSERVATIVE').toLowerCase()}</div>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div><div className="text-[10px] uppercase tracking-[0.05em] text-[#6a6a74]">Deposited</div><div className="text-[13px] text-white">{fmtUsd(a.dep)}</div></div>
                <div><div className="text-[10px] uppercase tracking-[0.05em] text-[#6a6a74]">Earned</div><div className="text-[13px] text-[#37d67a]">{fmtUsd(a.prof)}</div></div>
                <div><div className="text-[10px] uppercase tracking-[0.05em] text-[#6a6a74]">Yield</div><div className="text-[13px] text-white">{a.pct > 0 ? '+' : ''}{a.pct}%</div></div>
              </div>
              <div className="flex items-stretch gap-2 md:w-[230px]">
                <input
                  type="number" placeholder="USDC"
                  value={withdrawInputs[a.vaultAddress ?? ''] || ''}
                  onChange={e => setWithdrawInputs(prev => ({ ...prev, [a.vaultAddress ?? '']: e.target.value }))}
                  disabled={isRedeeming}
                  className="flex-1 min-w-0 bg-[#070709] border border-[#1f1f28] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  onClick={() => handleRedeem(a.vaultAddress ?? '')}
                  disabled={isRedeeming || !withdrawInputs[a.vaultAddress ?? '']}
                  className="bg-primary text-[#050505] font-bold text-[12px] px-4 rounded-lg disabled:opacity-30 hover:shadow-[0_0_18px_rgba(255,42,77,0.4)] transition-all whitespace-nowrap"
                >
                  {isRedeeming ? '…' : 'Withdraw'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center border border-[#1a1a20] rounded-xl bg-[#0b0b0e]">
          <div className="text-[13px] text-[#6a6a74] mb-5">No capital deployed in vaults yet.</div>
          <Link href="/discover" className="inline-flex items-center gap-2 border border-[#2a2a32] text-white font-semibold text-[13px] px-6 py-3 rounded-full no-underline hover:border-primary hover:bg-white/[0.03] transition-all">
            Browse vaults →
          </Link>
        </div>
      )}

      {/* history */}
      {d?.history && d.history.length > 0 && (
        <>
          <div className="text-[14px] font-semibold text-white mt-2 px-1">Activity</div>
          <div className="border border-[#1a1a20] rounded-xl overflow-hidden">
            {d.history.map((act, i) => (
              <div key={act.id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-[#15151a]' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-medium tracking-[0.06em] uppercase px-2 py-0.5 rounded ${act.type === 'earn' ? 'text-[#37d67a] bg-[#0f2418]' : act.type === 'loss' ? 'text-[#ff5570] bg-[#240f14]' : 'text-[#9a9aa2] bg-[#16161a]'}`}>{act.type}</span>
                  <span className="text-[13px] text-white">{act.bot}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[13px] font-medium ${act.amount.includes('+') ? 'text-[#37d67a]' : 'text-[#c5c8c6]'}`}>{act.amount}</span>
                  <span className="font-mono text-[10px] text-[#5a5a64] hidden sm:inline">{act.date}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
