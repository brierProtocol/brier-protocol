'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import BotIrisAvatar from '@/components/bot/BotIrisAvatar'
import { botEye } from '@/lib/botIdentity'
import LiveLineChart from './LiveLineChart'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface BuilderBot {
  id: string; slug: string; name: string
  pfpUrl: string | null; color: string; eyeShape: string; avatarId: string
  status: string; tier: string; vaultOpen: boolean; vaultAddress: string | null
  currentTVL: number; vaultCap: number
  brierScore: number | null; winRate: number | null; sharpe: number | null; resolvedTrades: number
  pnl: number | null; pnlSeries: number[]
}
interface BuilderData {
  totalValue: number; netPnl: number; activeBots: number; managedCapital: number; botCount: number
  equitySeries: { date: string; value: number }[]; bots: BuilderBot[]
}

const fmtUsd = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1000) return `$${(n / 1000).toFixed(a >= 100000 ? 0 : 1)}K`
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function statusPill(b: BuilderBot): { label: string; fg: string; bg: string } {
  if (b.vaultOpen) return { label: 'vault open', fg: '#37d67a', bg: '#0f2418' }
  if (b.status === 'LIVE') return { label: 'live', fg: '#37d67a', bg: '#0f2418' }
  if (b.status.startsWith('VAULT_ELIGIBLE')) return { label: 'eligible', fg: '#ff5570', bg: '#240f14' }
  if (b.status === 'PAPER') return { label: 'shadow', fg: '#caa53a', bg: '#221c08' }
  return { label: b.status.toLowerCase(), fg: '#9a9aa2', bg: '#16161a' }
}

function Spark({ data }: { data: number[] }) {
  if (!data || data.length < 2) return <span className="text-[11px] text-[#4a4a52]">—</span>
  const w = 64, h = 22
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
  const up = data[data.length - 1] >= data[0]
  const col = up ? '#37d67a' : '#ff5570'
  const pts = data
    .map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - ((v - min) / range) * (h - 4) - 2).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={w} height={h} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={col} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function BuilderConsole({ address }: { address: string }) {
  const [data, setData] = useState<BuilderData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!address) return
    setLoading(true)
    fetch(`/api/dashboard/builder?address=${address}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [address])

  if (loading) {
    return <div className="py-16 text-center font-mono text-[11px] tracking-[0.2em] uppercase text-[#5a5a64] animate-pulse">loading your bots…</div>
  }

  if (!data || data.botCount === 0) {
    return (
      <div className="py-14 text-center border border-[#1a1a20] rounded-xl bg-[#0b0b0e]">
        <div className="text-[15px] font-semibold text-white mb-1">No bots yet</div>
        <div className="text-[13px] text-[#6a6a74] mb-6">Deploy your first algorithm and it shows up here with its capital and PnL.</div>
        <Link href="/list-bot" className="inline-flex items-center gap-2 bg-primary text-[#050505] font-bold text-[13px] px-6 py-3 rounded-full no-underline hover:shadow-[0_0_22px_rgba(255,42,77,0.45)] transition-all">
          Deploy a bot →
        </Link>
      </div>
    )
  }

  const stats = [
    { lab: 'Total value', val: fmtUsd(data.totalValue), cls: 'text-white' },
    { lab: 'Net PnL', val: `${data.netPnl >= 0 ? '+' : ''}${fmtUsd(data.netPnl)}`, cls: data.netPnl >= 0 ? 'text-[#37d67a]' : 'text-[#ff5570]' },
    { lab: 'Active bots', val: String(data.activeBots), cls: 'text-white' },
    { lab: 'Managed capital', val: fmtUsd(data.managedCapital), cls: 'text-white' },
  ]
  const equity = data.equitySeries.map(e => e.value)
  const equityLabels = data.equitySeries.map(e => e.date)
  const equityUp = equity.length >= 2 && equity[equity.length - 1] >= equity[0]

  return (
    <div className="flex flex-col gap-4">
      {/* aggregate stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.lab} className="bg-[#0e0e12] border border-[#1a1a20] rounded-xl p-4">
            <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#74747e]">{s.lab}</div>
            <div className={`text-[22px] font-bold mt-1.5 ${s.cls}`}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* equity curve (liveline) */}
      <div className="bg-[#0b0b0e] border border-[#1a1a20] rounded-xl p-3">
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-[12px] text-[#9a9aa2]">Equity · all bots</span>
          {equity.length >= 2 && (
            <span className={`text-[12px] ${equityUp ? 'text-[#37d67a]' : 'text-[#ff5570]'}`}>
              {equityUp ? '▲' : '▼'} {fmtUsd(Math.abs(equity[equity.length - 1] - equity[0]))}
            </span>
          )}
        </div>
        <LiveLineChart data={equity} labels={equityLabels} height={210} label="Equity" />
      </div>

      {/* bot list */}
      <div className="flex items-baseline justify-between mt-1 px-1">
        <span className="text-[14px] font-semibold text-white">Your bots</span>
        <span className="text-[11px] text-[#6a6a74]">{data.botCount} deployed</span>
      </div>
      <div className="border border-[#1a1a20] rounded-xl overflow-hidden">
        {data.bots.map((b, i) => {
          const p = statusPill(b)
          return (
            <Link
              key={b.id}
              href={`/bot/${b.slug}`}
              className={`grid grid-cols-[34px_1.5fr_0.9fr_0.9fr_auto] items-center gap-3 px-3 py-3 no-underline hover:bg-white/[0.03] transition-colors ${i > 0 ? 'border-t border-[#15151a]' : ''}`}
            >
              <span className="w-[34px] h-[34px] rounded-lg overflow-hidden flex items-center justify-center">
                {b.pfpUrl
                  ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={b.pfpUrl} alt={b.name} className="w-full h-full object-cover" />
                  : <BotIrisAvatar {...botEye(b as any)} size={34} bg="transparent" />}
              </span>
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-white truncate">{b.name}</div>
                <span className="inline-block mt-0.5 text-[9.5px] tracking-[0.08em] uppercase font-medium px-1.5 py-0.5 rounded" style={{ color: p.fg, background: p.bg }}>{p.label}</span>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.05em] text-[#6a6a74]">TVL</div>
                <div className="text-[13px] text-white">{b.currentTVL > 0 ? fmtUsd(b.currentTVL) : '—'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.05em] text-[#6a6a74]">PnL</div>
                <div className="text-[13px] font-medium">
                  {b.pnl == null
                    ? <span className="text-[#6a6a74] text-[12px]">awaiting</span>
                    : <span className={b.pnl >= 0 ? 'text-[#37d67a]' : 'text-[#ff5570]'}>{b.pnl >= 0 ? '+' : ''}{fmtUsd(b.pnl)}</span>}
                </div>
              </div>
              <div className="pl-1"><Spark data={b.pnlSeries} /></div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
