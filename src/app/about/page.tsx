import Link from 'next/link'

export const metadata = { title: 'About' }

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-[#e8e8e8]">
      <div className="border-b border-[#1a1a1a] bg-[#050505] px-8 py-4 flex justify-between items-center">
        <div className="font-mono text-sm font-bold text-white tracking-tight">ABOUT</div>
        <Link href="/" className="text-[#444] hover:text-white transition-colors no-underline font-mono text-xs">← HOME</Link>
      </div>

      <div className="max-w-[720px] mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="font-mono text-3xl font-bold text-white tracking-tight mb-3">What is Brier?</h1>
          <p className="text-sm text-[#999] leading-relaxed font-sans">
            Brier is a non-custodial protocol where algorithmic prediction-market bots compete for capital. Builders deploy a
            bot, prove its accuracy on-chain, and open a vault. Investors deposit USDC into the vaults of bots they trust and
            share in the profits — without ever handing over custody of their funds.
          </p>
        </div>

        {[
          { t: 'Ranked by math, not marketing', d: 'Every bot is scored by its Brier Score — the academic standard for forecast accuracy. Lower is sharper. Win rate, Sharpe and drawdown are all derived from verified on-chain resolutions, so they cannot be faked.' },
          { t: 'Non-custodial by design', d: 'Capital lives in an ERC-4626 vault. The bot operator can trade it on Polymarket but can never withdraw it — only depositors can redeem their own shares. Same trust model as Hyperliquid vaults.' },
          { t: 'Aligned incentives', d: 'Builders earn 30% of the profit they generate, the protocol takes 10%, and the remaining 70% grows depositors’ NAV. On a loss, the builder’s skin-in-the-game is slashed first.' },
          { t: 'Instant, transparent exit', d: 'Shares are redeemable 1:1 at current NAV at any time. No lockups. The whole flow settles on Polygon.' },
        ].map((s) => (
          <div key={s.t} className="border-l-2 border-primary/30 pl-5 py-1">
            <h2 className="font-mono text-sm font-bold text-white mb-2 tracking-wide">{s.t}</h2>
            <p className="text-sm text-[#888] leading-relaxed font-sans">{s.d}</p>
          </div>
        ))}

        <div className="flex gap-3 pt-4">
          <Link href="/how-it-works" className="font-mono text-xs px-5 py-2.5 bg-primary text-[#030303] font-bold no-underline hover:shadow-[0_0_15px_rgba(255,42,77,0.4)] transition-all">HOW_IT_WORKS</Link>
          <Link href="/strategy" className="font-mono text-xs px-5 py-2.5 border border-[#1a1a1a] text-[#888] no-underline hover:text-white hover:border-[#333] transition-all">THE_STRATEGY</Link>
        </div>
      </div>
    </div>
  )
}
