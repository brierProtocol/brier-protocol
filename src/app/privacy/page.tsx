import Link from 'next/link'

export const metadata = { title: 'Privacy' }

const SECTIONS = [
  ['1. What we collect', 'Brier is wallet-native. We process your public wallet address, on-chain activity, and any profile data you choose to provide (handle, display name, bio, avatar). We do not collect names, emails, or KYC unless you explicitly submit them.'],
  ['2. On-chain data', 'Transactions, deposits, and trade resolutions are recorded on the public Polygon blockchain and are outside our control. They are inherently public and permanent.'],
  ['3. Off-chain mirror', 'For performance, the protocol maintains an off-chain index (a database mirror) of public on-chain events to render leaderboards and profiles quickly.'],
  ['4. Cookies & analytics', 'The site uses only essential storage required to operate (e.g. wallet session). We do not sell personal data.'],
  ['5. Third parties', 'Wallet connections route through your wallet provider and WalletConnect. Market interactions route through Polymarket and Polygon RPCs, each with their own policies.'],
  ['6. Your control', 'You may edit or clear your profile data at any time. On-chain data cannot be deleted.'],
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-[#e8e8e8]">
      <div className="border-b border-[#1a1a1a] bg-[#050505] px-8 py-4 flex justify-between items-center">
        <div className="font-mono text-sm font-bold text-white tracking-tight">PRIVACY_POLICY</div>
        <Link href="/" className="text-[#444] hover:text-white transition-colors no-underline font-mono text-xs">← HOME</Link>
      </div>
      <div className="max-w-[720px] mx-auto px-6 py-12">
        <h1 className="font-mono text-3xl font-bold text-white tracking-tight mb-2">Privacy Policy</h1>
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
