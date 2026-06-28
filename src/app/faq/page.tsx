import Link from 'next/link'

export const metadata = { title: 'FAQ' }

const FAQS = [
  { q: 'Is my deposit custodial?', a: 'No. Funds sit in an ERC-4626 vault smart contract. The bot operator can trade them on Polymarket but cannot withdraw them. Only you can redeem your shares.' },
  { q: 'Can I withdraw any time?', a: 'Yes. Shares redeem 1:1 at the current NAV with no lockup. You receive your principal plus your share of profits in a single transaction.' },
  { q: 'How are bots ranked?', a: 'Strictly by Brier Score — the standard metric for forecast accuracy (lower = sharper). All metrics derive from verified on-chain resolutions, so they cannot be forged.' },
  { q: 'What does it cost?', a: 'On profit only: the builder keeps 30%, the protocol takes 10%, and 70% grows depositors’ NAV. No management fee. No fee on losses.' },
  { q: 'What happens if a bot loses money?', a: 'The builder’s own skin-in-the-game is slashed first as a buffer. A circuit breaker pauses the vault on a 15% drawdown.' },
  { q: 'What is the shadow phase?', a: 'New bots paper-trade for 7 days while their Brier Score is tracked on-chain. Only bots that clear Tier-1 thresholds can open a vault and accept deposits.' },
  { q: 'Which network and asset?', a: 'Vaults settle on Polygon and are denominated in USDC. Bots trade Polymarket markets.' },
  { q: 'Do I need to trust the builder’s code?', a: 'The builder’s strategy stays private — Brier only reads trade signals via the SDK. You trust the on-chain track record, not the source code.' },
]

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-[#e8e8e8]">
      <div className="border-b border-[#1a1a1a] bg-[#050505] px-8 py-4 flex justify-between items-center">
        <div className="font-mono text-sm font-bold text-white tracking-tight">FAQ</div>
        <Link href="/" className="text-[#444] hover:text-white transition-colors no-underline font-mono text-xs">← HOME</Link>
      </div>

      <div className="max-w-[720px] mx-auto px-6 py-12">
        <h1 className="font-mono text-3xl font-bold text-white tracking-tight mb-8">Frequently asked</h1>
        <div className="divide-y divide-[#111] border-y border-[#1a1a1a]">
          {FAQS.map((f, i) => (
            <details key={i} className="group">
              <summary className="flex items-center justify-between cursor-pointer py-4 list-none">
                <span className="font-mono text-sm text-white pr-4">{f.q}</span>
                <span className="text-primary font-mono text-lg shrink-0 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="text-sm text-[#888] leading-relaxed font-sans pb-4">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="text-xs text-[#555] font-mono mt-8">
          &gt; Still stuck? Read <Link href="/how-it-works" className="text-primary no-underline hover:underline">how it works</Link> or the <Link href="/strategy" className="text-primary no-underline hover:underline">quoting strategy</Link>.
        </p>
      </div>
    </div>
  )
}
