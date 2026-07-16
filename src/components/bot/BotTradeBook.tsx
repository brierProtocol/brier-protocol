'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { classifyMarket } from '@/lib/marketCategories'
import { Panel } from './Panel'
import { CATEGORY_COLORS, relDay, txOf, type ProfileTrade } from './botProfile.helpers'

const VIOLET = '#8b7bff', TEAL = '#c8ff00'

// The bot's committed calls: filter (ALL/WIN/LOSS/PENDING) + pagination. Owns its
// own filter/limit state and all the book-local derivations (only used here).
export function BotTradeBook({ trades }: { trades: ProfileTrade[] }) {
  const [bookFilter, setBookFilter] = useState<'ALL' | 'WIN' | 'LOSS' | 'PENDING'>('ALL')
  const [bookLimit, setBookLimit] = useState(40)

  const wins = trades.filter(t => t.status === 'WIN' || t.outcome === 'WIN').length
  const losses = trades.filter(t => t.status === 'LOSS' || t.outcome === 'LOSS').length
  const pending = trades.filter(t => t.status === 'PENDING' || t.outcome === 'PENDING').length

  // Prediction book at scale: filter + pagination so a bot with thousands of
  // calls in any category stays fast and navigable.
  const filteredTrades = bookFilter === 'ALL' ? trades : trades.filter(t => (t.status || t.outcome) === bookFilter)
  const visibleTrades = filteredTrades.slice(0, bookLimit)

  // Form guide: the last 10 resolved calls as W/L, oldest → newest. Trades
  // arrive newest-first, so take the head and reverse for reading order.
  const formGuide = trades
    .filter(t => { const st = t.status || t.outcome; return st === 'WIN' || st === 'LOSS' })
    .slice(0, 10)
    .map(t => (t.status || t.outcome) === 'WIN')
    .reverse()

  return (
    <div id="calls" className="scroll-mt-28">
    <Panel>
      <div className="px-5 py-3.5 border-b border-[#141414]">
        <div className="flex items-center justify-between mb-2.5">
          <div><span className="font-sans font-bold text-[14px]">Prediction book</span><span className="ml-2 font-mono text-[10px] text-[#555]">calls locked before resolution · on-chain fills join in capital phase</span></div>
          <span className="font-mono text-[11px] text-[#888] tabular-nums">{trades.length} calls</span>
        </div>
        <div className="flex h-1.5 rounded-full overflow-hidden bg-[#0e0e0e]">
          {wins > 0 && <div style={{ width: `${(wins / trades.length) * 100}%`, background: TEAL }} />}
          {losses > 0 && <div style={{ width: `${(losses / trades.length) * 100}%`, background: '#ff5570' }} />}
          {pending > 0 && <div style={{ width: `${(pending / trades.length) * 100}%`, background: VIOLET }} />}
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-4 font-mono text-[10px]">
            <span style={{ color: TEAL }}>{wins} won</span><span style={{ color: '#ff5570' }}>{losses} lost</span><span style={{ color: VIOLET }}>{pending} pending</span>
            {/* form guide — last 10 resolved, newest on the right */}
            {formGuide.length >= 3 && (
              <span className="flex items-center gap-[3px] pl-2 border-l border-[#1a1a22]" title="last 10 resolved calls, newest right">
                {formGuide.map((won, i) => (
                  <motion.span
                    key={i}
                    className="w-[6px] h-[6px] rounded-[1.5px]"
                    style={{ background: won ? TEAL : '#ff5570', boxShadow: won ? `0 0 5px ${TEAL}55` : '0 0 5px #ff557044' }}
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 18 }}
                  />
                ))}
              </span>
            )}
          </div>
          {/* filters — a bot with thousands of calls stays navigable */}
          <div className="flex gap-1">
            {([['ALL', 'All'], ['WIN', 'Won'], ['LOSS', 'Lost'], ['PENDING', 'Open']] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => { setBookFilter(k); setBookLimit(40) }}
                className={`font-mono text-[9px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                  bookFilter === k ? 'bg-primary text-[#030303] border-primary' : 'bg-transparent text-[#6a6a74] border-[#22222a] hover:text-white hover:border-[#3a3a44]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {trades.length === 0 ? (
        <div className="px-5 py-12 text-center text-[13px] text-[#555]">No calls yet. The moment the bot commits a prediction it shows up here, then flips to WIN or LOSS when the market resolves.</div>
      ) : filteredTrades.length === 0 ? (
        <div className="px-5 py-10 text-center text-[13px] text-[#555]">No {bookFilter === 'PENDING' ? 'open' : bookFilter.toLowerCase()} calls yet.</div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto">
          {visibleTrades.map((t, i) => {
            const tx = txOf(t); const yes = t.side === 'YES' || t.side === 'LONG'
            const status = t.status || t.outcome
            const oc = status === 'WIN' ? TEAL : status === 'LOSS' ? '#ff5570' : VIOLET
            const cat = classifyMarket(t.marketTitle || '') || 'other'
            const catColor = CATEGORY_COLORS[cat] || CATEGORY_COLORS.other
            // How far from the market it dared to stand at commit time.
            const edge = (typeof t.confidence === 'number' && typeof t.marketProbabilityAtCommit === 'number')
              ? t.confidence - t.marketProbabilityAtCommit : null
            return (
              <div key={t.id || i} className="flex items-center gap-3 px-5 py-2.5 border-b border-[#101010] hover:bg-[#0b0b0b] transition-colors" style={{ borderLeft: `2px solid ${oc}` }}>
                <span className="font-mono text-[10px] text-[#555] w-12 shrink-0 tabular-nums">{relDay(t.timestamp)}</span>
                {/* category dot — politics, sports, crypto… every market family reads at a glance */}
                <span className="w-1.5 h-1.5 rounded-full shrink-0" title={cat} style={{ background: catColor, boxShadow: `0 0 5px ${catColor}66` }} />
                <span className="flex-1 min-w-0 text-[12px] text-[#bbb] truncate">{tx ? <a href={`https://polygonscan.com/tx/${tx}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors no-underline">{t.marketTitle} <span className="text-[#444] text-[9px]">↗</span></a> : t.marketTitle}</span>
                <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ color: yes ? TEAL : '#ff5570', background: yes ? `${TEAL}14` : '#ff557014' }}>{t.side}</span>
                <span className="font-mono text-[11px] text-[#999] w-9 text-right tabular-nums shrink-0">{((t.confidence || t.entryPrice || 0) * 100).toFixed(0)}¢</span>
                <span className="font-mono text-[10px] w-11 text-right tabular-nums shrink-0" title="edge vs the market price at commit" style={{ color: edge == null ? '#3a3a44' : edge >= 0 ? TEAL : '#ff5570' }}>{edge == null ? '·' : `${edge >= 0 ? '+' : ''}${Math.round(edge * 100)}%`}</span>
                <span className="font-mono text-[9px] font-bold w-14 text-right shrink-0" style={{ color: oc }}>{status}</span>
              </div>
            )
          })}
          {filteredTrades.length > bookLimit && (
            <button
              onClick={() => setBookLimit(l => l + 60)}
              className="w-full py-3 font-mono text-[11px] font-bold text-[#7a7a84] hover:text-white hover:bg-[#0b0b0b] transition-colors cursor-pointer"
            >
              Show more · {filteredTrades.length - bookLimit} remaining
            </button>
          )}
        </div>
      )}
    </Panel>
    </div>
  )
}

export default BotTradeBook
