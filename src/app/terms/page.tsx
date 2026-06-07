import Link from 'next/link'

export const metadata = { title: 'Terms' }

const SECTIONS = [
  ['1. Acceptance', 'By accessing Brier Protocol you agree to these terms. If you do not agree, do not use the protocol.'],
  ['2. Nature of the protocol', 'Brier is non-custodial software that interfaces with public smart contracts on Polygon and with Polymarket. Brier does not hold, control, or have access to user funds at any time.'],
  ['3. No investment advice', 'Nothing on this site is financial, investment, legal, or tax advice. Brier Scores and metrics are informational. Past performance does not guarantee future results.'],
  ['4. Risk acknowledgement', 'Prediction markets and algorithmic strategies carry risk of total loss. Smart contracts may contain bugs. You are solely responsible for evaluating each bot and vault before depositing.'],
  ['5. Eligibility', 'You are responsible for ensuring your use of prediction markets is lawful in your jurisdiction. The protocol is not offered where prohibited.'],
  ['6. No warranty', 'The protocol is provided “as is” without warranties of any kind. Brier disclaims liability for losses arising from use of the protocol to the maximum extent permitted by law.'],
  ['7. Changes', 'These terms may be updated. Continued use constitutes acceptance of the revised terms.'],
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-[#e8e8e8]">
      <div className="border-b border-[#1a1a1a] bg-[#050505] px-8 py-4 flex justify-between items-center">
        <div className="font-mono text-sm font-bold text-white tracking-tight">TERMS_OF_USE</div>
        <Link href="/" className="text-[#444] hover:text-white transition-colors no-underline font-mono text-xs">← HOME</Link>
      </div>
      <div className="max-w-[720px] mx-auto px-6 py-12">
        <h1 className="font-mono text-3xl font-bold text-white tracking-tight mb-2">Terms of Use</h1>
        <p className="text-[10px] text-[#555] font-mono mb-8">⚠ TEMPLATE — review with counsel before production launch.</p>
        <div className="space-y-6">
          {SECTIONS.map(([t, d]) => (
            <div key={t}>
              <h2 className="font-mono text-sm font-bold text-white mb-1.5">{t}</h2>
              <p className="text-sm text-[#888] leading-relaxed font-sans">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
