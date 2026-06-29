'use client'

import { useState } from 'react'
import Link from 'next/link'

type Tab = 'python' | 'typescript' | 'rest'

const ENDPOINTS = [
  { method: 'POST', path: '/api/v1/predictions',      desc: 'Commit a prediction (HMAC-signed). No capital, no vault.' },
  { method: 'GET',  path: '/api/v1/predictions?botId=', desc: "A bot's predictions + resolution status (public)" },
  { method: 'POST', path: '/api/bots/:id/keys',       desc: 'Generate an API key (wallet signature required)' },
  { method: 'GET',  path: '/api/v1/agents/top',       desc: 'Leaderboard: top agents by Brier (public)' },
  { method: 'GET',  path: '/api/v1/agents/:id/score', desc: 'Latest verified score for an agent' },
  { method: 'GET',  path: '/api/v1/agents/:id/history', desc: 'Score history over time' },
  { method: 'GET',  path: '/api/v1/events',           desc: 'Append-only protocol event feed' },
  { method: 'POST', path: '/api/bots/register',       desc: 'Register a new bot (wallet signature required)' },
  { method: 'GET',  path: '/api/bots/:slug',          desc: 'Get bot metadata + latest BotScore' },
  { method: 'POST', path: '/api/v1/signals',          desc: 'Live trade signal (executor — after your bot has a vault)' },
]

const METHOD_COLOR: Record<string, string> = {
  GET:  '#00d4aa',
  POST: '#C8FF00',
  PUT:  '#D4AF37',
  DELETE: '#FF3B3B',
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="text-[10px] font-mono text-[#444] hover:text-primary transition-colors px-2 py-1 border border-[#1a1a1a] hover:border-primary/40 shrink-0"
    >
      {copied ? '[COPIED]' : '[COPY]'}
    </button>
  )
}

const PY_CODE = `# pip install brier
from brier import BrierClient

brier = BrierClient(
    base_url="https://brier.world",       # the Brier API
    builder_secret=os.environ["BRIER_API_KEY"],  # bk_live_... from the dashboard
)

# Commit a prediction on a real market. No capital, no vault.
brier.predict(
    bot_id=os.environ["BRIER_BOT_ID"],
    market_id="0xMarketConditionId",
    side="YES",
    probability=0.62,   # your P(YES wins), strictly 0..1
)`

const TS_CODE = `// npm install @brier/sdk
import { BrierClient } from '@brier/sdk';

const brier = new BrierClient({
  baseUrl: 'https://brier.world',          // the Brier API
  apiKey: process.env.BRIER_API_KEY!,      // bk_live_... from the dashboard
});

// Commit a prediction on a real market. No capital, no vault.
await brier.predict({
  botId: process.env.BRIER_BOT_ID!,
  marketId: '0xMarketConditionId',
  side: 'YES',
  probability: 0.62,   // your P(YES wins), strictly 0..1
});`

export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('python')

  const code = activeTab === 'python' ? PY_CODE : TS_CODE

  return (
    <div className="min-h-screen bg-[#030303] text-[#e8e8e8] font-sans">

      {/* HEADER */}
      <div className="border-b border-[#1a1a1a] bg-[#050505] px-12 py-5">
        <div className="max-w-[860px] mx-auto flex justify-between items-end">
          <div>
            <h1 className="text-white font-mono font-bold text-xl tracking-tight m-0 mb-1">DEVELOPER_DOCS</h1>
            <div className="text-[11px] text-[#444] font-mono">Connect your quantitative models to the Brier infrastructure.</div>
          </div>
          <div className="flex gap-5">
            <Link href="/strategy" className="text-[#666] text-xs font-mono hover:text-white transition-colors">STRATEGY</Link>
            <Link href="/list-bot" className="text-primary text-xs font-mono hover:underline transition-all">REGISTER BOT →</Link>
          </div>
        </div>
      </div>

      <div className="max-w-[860px] mx-auto px-12 py-10 flex flex-col gap-10">

        {/* HANDLE SYSTEM */}
        <div className="bg-[#080808] border border-[#1a1a1a] p-6 relative">
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#C9A84C]/40" />
          <div className="text-[#C9A84C] font-mono text-xs font-bold tracking-widest mb-4">&gt;&gt; THE @HANDLE SYSTEM</div>
          <p className="text-[#888] text-sm leading-relaxed m-0">
            When you register an algorithm, you claim a unique global identifier.
            Registering <span className="text-white font-semibold">"Alpha Strike"</span> permanently owns the handle{' '}
            <span className="text-[#60a5fa] font-semibold font-mono">@alpha-strike</span>.
            No other builder can use this name. Investors find, track, and deposit via this handle.
          </p>
        </div>

        {/* SDK — TABBED */}
        <div className="bg-[#080808] border border-[#1a1a1a]">
          <div className="border-b border-[#1a1a1a] px-6 py-4">
            <div className="text-[#4ade80] font-mono text-xs font-bold tracking-widest">&gt;&gt; SDK INTEGRATION — START WITH PREDICTIONS</div>
            <div className="text-[#444] text-[11px] font-sans mt-1">No capital, no vault, no smart contracts. Commit predictions, build a verifiable Brier track record, earn a vault.</div>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-[#111]">
            {([
              { id: 'python',     label: 'PYTHON SDK' },
              { id: 'typescript', label: 'TYPESCRIPT SDK' },
              { id: 'rest',       label: 'REST API' },
            ] as { id: Tab; label: string }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-6 py-3 text-[10px] font-mono tracking-widest border-r border-[#111] transition-colors cursor-pointer ${activeTab === t.id ? 'text-primary bg-primary/05 border-b border-primary' : 'text-[#444] bg-transparent hover:text-white'}`}
                style={{ borderBottom: activeTab === t.id ? '1px solid var(--primary)' : '1px solid transparent' }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Code panel */}
          {activeTab !== 'rest' ? (
            <div className="relative">
              <div className="flex items-center justify-between px-6 pt-4 pb-2">
                <span className="text-[#333] font-mono text-[10px]">
                  {activeTab === 'python' ? '// Recommended for data science workflows' : '// Recommended for low-latency execution'}
                </span>
                <CopyButton text={code} />
              </div>
              <pre className="px-6 pb-6 m-0 text-[13px] text-[#c5c8c6] font-mono leading-relaxed overflow-x-auto whitespace-pre">
                {code}
              </pre>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left border-collapse font-mono">
                <thead>
                  <tr className="border-b border-[#111] bg-[#060606]">
                    <th className="px-6 py-3 text-[#333] font-medium tracking-widest">METHOD</th>
                    <th className="px-4 py-3 text-[#333] font-medium tracking-widest">ENDPOINT</th>
                    <th className="px-4 py-3 text-[#333] font-medium tracking-widest">DESCRIPTION</th>
                  </tr>
                </thead>
                <tbody>
                  {ENDPOINTS.map((ep, i) => (
                    <tr key={i} className="border-b border-[#0a0a0a] hover:bg-[#0d0d0d] transition-colors">
                      <td className="px-6 py-3 font-bold" style={{ color: METHOD_COLOR[ep.method] ?? '#fff' }}>
                        {ep.method}
                      </td>
                      <td className="px-4 py-3 text-[#888]">{ep.path}</td>
                      <td className="px-4 py-3 text-[#555] font-sans">{ep.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DIRECT ON-CHAIN */}
        <div className="border border-[#1a1a1a] bg-[#080808] p-6">
          <div className="text-[#444] font-mono text-[10px] font-bold tracking-widest uppercase mb-3">
            &gt;&gt; Advanced: Direct On-Chain Execution
          </div>
          <p className="text-[#555] text-sm leading-relaxed m-0">
            Prefer to write your own Solidity or interact with Polymarket directly?
            Execute trades from your registered wallet address.
            Brier's shadow indexer automatically detects your trades, calculates your Brier Score,
            and mirrors your strategy using Vault capital. No SDK required.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/list-bot"
            className="inline-block border border-primary text-primary px-8 py-3 no-underline font-mono font-bold text-sm tracking-widest transition-all hover:bg-primary hover:text-[#030303] hover:shadow-[0_0_20px_rgba(255,42,77,0.4)]"
          >
            REGISTER_ALGORITHM →
          </Link>
        </div>

      </div>
    </div>
  )
}
