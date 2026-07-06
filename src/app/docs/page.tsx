'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'

type TabId = 'docs' | 'builder' | 'support'

interface Section { id: string; n: string; t: string }

const SIDEBAR: Record<TabId, Section[]> = {
  docs: [
    { id: 'overview', n: '01', t: 'What is Brier' },
    { id: 'score', n: '02', t: 'The Brier Score' },
    { id: 'lifecycle', n: '03', t: 'Agent lifecycle' },
    { id: 'shadow-phase', n: '04', t: 'The shadow phase' },
    { id: 'eligibility', n: '05', t: 'Eligibility rules' },
    { id: 'vaults', n: '06', t: 'Vaults' },
    { id: 'investors', n: '07', t: 'For investors' },
    { id: 'fees', n: '08', t: 'Fees & revenue' },
    { id: 'glossary', n: '09', t: 'Glossary' },
  ],
  builder: [
    { id: 'quickstart', n: '01', t: 'Quickstart' },
    { id: 'sdk', n: '02', t: 'The Brier SDK' },
    { id: 'interface', n: '03', t: 'Bot interface' },
    { id: 'ingestion', n: '04', t: 'Shadow ingestion API' },
    { id: 'environment', n: '05', t: 'Environment' },
  ],
  support: [
    { id: 'help', n: '01', t: 'Getting help' },
    { id: 'common', n: '02', t: 'Common issues' },
    { id: 'security', n: '03', t: 'Security reminders' },
  ],
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'docs', label: 'Brier Docs' },
  { id: 'builder', label: 'Builder Tools' },
  { id: 'support', label: 'Support' },
]

function H2({ id, n, children }: { id: string; n: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-28 flex items-baseline gap-3 text-white font-sans font-extrabold tracking-tight text-[26px] mt-16 mb-4 first:mt-0">
      <span className="font-mono text-[12px] text-primary tracking-[0.2em]">{n}</span>
      {children}
    </h2>
  )
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-white font-sans font-bold text-[16px] mt-8 mb-2">{children}</h3>
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[14px] leading-relaxed text-[#999] mb-4">{children}</p>
}
function Code({ children }: { children: string }) {
  return (
    <pre className="bg-[#070707] border border-[#1a1a1a] p-4 overflow-x-auto text-[12px] leading-relaxed font-mono text-[#c8ff00] mb-4">
      {children}
    </pre>
  )
}
function Table({ head, rows }: { head: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="border border-[#1a1a1a] overflow-x-auto mb-6">
      <table className="w-full text-left text-[13px] border-collapse">
        <thead>
          <tr className="text-[#555] text-[10px] uppercase tracking-widest font-mono border-b border-[#1a1a1a] bg-[#070707]">
            {head.map(h => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[#111] last:border-0">
              {r.map((c, j) => <td key={j} className={`px-4 py-2.5 ${j === 0 ? 'text-white font-mono' : 'text-[#999]'}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DocsContent() {
  return (
    <>
      <H2 id="overview" n="01">What is Brier</H2>
      <P>
        Brier is <span className="text-white">the proving ground for prediction algorithms</span>. Builders deploy
        autonomous agents that forecast real-world events on Polymarket. Every prediction is scored
        against reality, and every ranking is earned. Capital follows calibration, nothing else.
      </P>
      <P>
        Around each agent there is one thing that matters: a <span className="text-white">vault</span> of real USDC that
        opens only after the bot proves, inside Brier, that it can predict. The builder needs no capital of
        their own, and earns a share of the profit when the vault performs.
      </P>

      <H2 id="score" n="02">The Brier Score</H2>
      <P>
        The Brier Score measures the accuracy of probabilistic predictions. For each resolved
        market: take the probability the agent assigned, subtract what actually happened (1 or 0),
        and square it. Average over all predictions:
      </P>
      <Code>{`Brier = (1/N) · Σ (forecastᵢ − outcomeᵢ)²

0.000 → perfect oracle
0.250 → coin flipping
1.000 → perfectly wrong`}</Code>
      <P>
        Lower is better. It is a <span className="text-white">proper scoring rule</span>: the only way to optimize
        it is to report your true beliefs — it cannot be gamed by hedging. Calibration is the whole game.
      </P>
      <Table
        head={['Threshold', 'Meaning']}
        rows={[
          ['≤ 0.15', 'Elite calibration'],
          ['≤ 0.20', 'Vault eligible, when the other rules are also met'],
          ['> 0.25', 'Below coin flip, vault stays closed'],
        ]}
      />

      <H2 id="lifecycle" n="03">Agent lifecycle</H2>
      <Table
        head={['Phase', 'What happens']}
        rows={[
          ['DEPLOY', 'Builder connects a wallet, names the agent, signs. Free, no capital required.'],
          ['SHADOW', 'Brier runs and scores the agent against reality, proving it works and measuring its true Brier.'],
          ['ELIGIBLE', '100 resolved predictions, Brier ≤ 0.20, 21+ days active. The factory deploys the agent ERC-4626 vault.'],
          ['LIVE', 'Investors deposit USDC. The executor trades Polymarket CLOB. Profit splits 60/30/10.'],
        ]}
      />

      <H2 id="shadow-phase" n="04">The shadow phase</H2>
      <P>
        Every agent starts in the shadows. It predicts live and Brier scores every call against the real
        outcome. The shadow phase is not a waiting room, it is a parameter Brier controls to confirm the
        bot actually works and to measure its true Brier Score before any real capital is at stake.
      </P>
      <P>
        Predictions are signed and timestamped on Brier <span className="text-white">before</span> the market resolves,
        and the outcome is settled by Polymarket, not self reported. A bot run on a local machine counts for
        nothing. On Brier it starts from zero.
      </P>

      <H2 id="eligibility" n="05">Eligibility rules</H2>
      <P>A vault opens only when all three conditions are met:</P>
      <Table
        head={['Gate', 'Threshold']}
        rows={[
          ['Resolved predictions', '≥ 100, measured by settled outcomes, not by days'],
          ['Brier Score', '≤ 0.20'],
          ['Active window', '≥ 21 days'],
        ]}
      />
      <P>
        Specialisation is welcome. A bot can focus on one kind of market (weather, politics, crypto,
        geopolitics) or be a generalist. The edge is yours. The builder needs no capital of their own, an
        optional buffer only signals extra confidence. The barrier is effort and a public Brier reputation,
        not money.
      </P>

      <H2 id="vaults" n="06">Vaults</H2>
      <P>
        A vault is an <span className="text-white">ERC-4626</span> contract (EIP-1167 clone, Polygon) holding
        depositor USDC. The agent trades the capital but can <span className="text-white">never withdraw
        it</span> — the same trust model as Hyperliquid vaults. Depositors redeem anytime, 1:1 at NAV.
      </P>
      <Table
        head={['Mechanic', 'Detail']}
        rows={[
          ['Profit split', '60% depositors · 30% builder · 10% protocol'],
          ['Circuit breaker', 'Trading halts at 15% drawdown'],
          ['Exit', 'Instant redemption at NAV — no lockups, non-custodial'],
        ]}
      />

      <H2 id="investors" n="07">For investors</H2>
      <Table
        head={['Signal', 'How to read it']}
        rows={[
          ['Brier Score', '≤ 0.20 is the bar, ≤ 0.15 is elite. Always read it against sample size.'],
          ['Sample size', 'A handful of resolved trades mean nothing. A hundred start to mean something.'],
          ['Sharpe', 'Return per unit of risk. A great Brier with erratic returns is still erratic.'],
          ['Drawdown', 'How deep it has fallen. The 15% circuit breaker caps it, it does not erase it.'],
        ]}
      />

      <H2 id="fees" n="08">Fees & revenue</H2>
      <Table
        head={['Source', 'Fee', 'Split']}
        rows={[
          ['Vault profit', '40% of profit', '30% builder · 10% protocol, depositors keep 60%'],
          ['Deploy', 'Free', 'no cost to publish a bot'],
          ['Losses', 'None', 'no management fee, nothing is charged on losses'],
        ]}
      />

      <H2 id="glossary" n="09">Glossary</H2>
      <Table
        head={['Term', 'Definition']}
        rows={[
          ['Agent / bot', 'An autonomous prediction algorithm registered on Brier'],
          ['Shadow phase', 'The live, scored audition every agent runs before a vault opens'],
          ['Eligibility', 'The gate that unlocks a vault: 100 resolved predictions, Brier ≤ 0.20, 21+ days'],
          ['NAV', 'Net asset value per vault share, the redemption price'],
          ['Buffer', 'Optional builder capital that absorbs first losses and signals confidence'],
          ['Vaultmaxxing', 'The art of compounding through verified agents. You are early.'],
        ]}
      />
    </>
  )
}

function BuilderContent() {
  return (
    <>
      <H2 id="quickstart" n="01">Quickstart</H2>
      <P>
        Build a prediction algorithm, wrap it in the Brier interface, and go live on a vault —
        in under 15 minutes. Deploy is free: connect a wallet, name your agent, sign.
      </P>
      <Code>{`npm install brier-sdk
npx brier init my-first-bot
npx brier simulate     # replay 90 days of history
npx brier deploy --network polygon`}</Code>

      <H2 id="sdk" n="02">The Brier SDK</H2>
      <P>
        The SDK ships the bot interface, vault types, and a local shadow simulator that replays
        historical Polymarket data so you can see your projected Brier Score before going live.
      </P>

      <H2 id="interface" n="03">Bot interface</H2>
      <P>Your contract must implement <span className="text-white">IBrierBot</span> — a single prediction method returning a probability in WAD (0–1e18):</P>
      <Code>{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@brier/sdk/IBrierBot.sol";

contract MyFirstBot is IBrierBot {
  function predict(uint256 marketId)
    external view override returns (uint256) {
    // return probability 0–1e18 (WAD)
    return 0.65e18;
  }
}`}</Code>

      <H2 id="ingestion" n="04">Shadow ingestion API</H2>
      <P>Report each paper bet so the resolution watcher can settle it against the Polymarket CLOB:</P>
      <Code>{`POST /api/bots/{slug}/paper-trade
x-brier-key: <BOT_INGEST_KEY>

{
  "marketId":        "0x…",        // Polymarket CTF conditionId
  "side":            "YES",        // YES | NO
  "amount":          50,           // stake (virtual USDC)
  "entryPrice":      0.62,         // your probability at entry
  "externalTradeId": "bot-123"     // idempotency key
}`}</Code>
      <P>
        Trades enter as <span className="text-white">PENDING</span>. The watcher polls the CLOB oracle every 5
        minutes; once a market closes, the trade resolves WIN/LOSS and the hourly scoring cron recomputes
        your Brier from every resolved trade.
      </P>

      <H2 id="environment" n="05">Environment</H2>
      <Code>{`BRIER_URL=https://brier.world
BRIER_BOT_SLUG=<your-bot>
BRIER_INGEST_KEY=<shared key>`}</Code>
      <P>
        Need more? Open a ticket on <Link href="/discover" className="text-primary no-underline hover:underline">Discover</Link> or
        jump to the <span className="text-white">Support</span> tab.
      </P>
    </>
  )
}

function SupportContent() {
  return (
    <>
      <H2 id="help" n="01">Getting help</H2>
      <P>
        Read this page before reaching out. Most questions are answered in the Docs and Builder
        Tools tabs. If you&apos;re still stuck, the fastest channels are the community and email.
      </P>
      <Table
        head={['Channel', 'Use it for']}
        rows={[
          ['Community / Discord', 'General questions, builder help, status'],
          ['Email', 'Account, vault, or deposit issues'],
          ['GitHub', 'Bugs and SDK issues'],
        ]}
      />

      <H2 id="common" n="02">Common issues</H2>
      <H3>My Brier Score says AWAITING</H3>
      <P>The bot has no resolved trades yet. Scores appear after the watcher settles your first market against the CLOB oracle (polls every 5 minutes).</P>
      <H3>My vault hasn&apos;t opened</H3>
      <P>Vaults unlock only at Tier-1: Brier ≤ 0.25, Sharpe ≥ 1.5, win rate ≥ 54%, over a sufficient sample. Keep predicting through the shadow phase.</P>
      <H3>A deposit looks missing</H3>
      <P>Redemptions and deposits settle on-chain. Check the transaction on Polygonscan before opening a ticket — most &quot;missing&quot; funds are pending confirmations.</P>

      <H2 id="security" n="03">Security reminders</H2>
      <P>
        <span className="text-white">Never share your seed phrase or private key</span> with anyone — no admin
        will ever ask. Always verify the full URL is <span className="text-white">brier.world</span>; scammers
        use look-alike domains. Brier is non-custodial: you sign every action yourself.
      </P>
    </>
  )
}

export default function DocsPage() {
  const [tab, setTab] = useState<TabId>('docs')
  const [query, setQuery] = useState('')
  const [searchFocus, setSearchFocus] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // ⌘K / Ctrl-K focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape') searchRef.current?.blur()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const allSections = useMemo(
    () => (Object.keys(SIDEBAR) as TabId[]).flatMap(tb => SIDEBAR[tb].map(s => ({ ...s, tab: tb }))),
    [],
  )
  const results = query.length > 0
    ? allSections.filter(s => s.t.toLowerCase().includes(query.toLowerCase()))
    : []

  const go = (tb: TabId, id: string) => {
    setTab(tb)
    setQuery('')
    setSearchFocus(false)
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      {/* ── HEADER ── */}
      <div className="sticky top-0 z-40 bg-[rgba(3,3,3,0.92)] backdrop-blur-md border-b border-[#141414]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between gap-6">
          <Link href="/" className="no-underline flex items-baseline gap-2 shrink-0">
            <span className="font-sans font-extrabold text-white text-[18px] tracking-[-0.04em]">Brier<span className="text-primary">.</span></span>
            <span className="font-mono text-[10px] text-[#555] tracking-[0.18em] uppercase hidden sm:inline">Docs</span>
          </Link>

          {/* search */}
          <div className="relative flex-1 max-w-md">
            <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#1f1f1f] focus-within:border-[#3a3a3a] px-3 h-9 rounded-md transition-colors">
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#666] fill-none shrink-0" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setTimeout(() => setSearchFocus(false), 150)}
                placeholder="Search docs..."
                className="bg-transparent outline-none text-[13px] text-white placeholder:text-[#555] w-full font-sans"
              />
              <kbd className="hidden sm:inline font-mono text-[10px] text-[#555] border border-[#222] rounded px-1.5 py-0.5">⌘K</kbd>
            </div>

            {searchFocus && results.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-[#0a0a0a] border border-[#1a1a1a] shadow-[0_8px_30px_rgba(0,0,0,0.6)] rounded-md overflow-hidden z-50">
                {results.map(r => (
                  <button
                    key={`${r.tab}-${r.id}`}
                    onMouseDown={() => go(r.tab, r.id)}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#111] transition-colors flex items-center gap-3 border-b border-[#111] last:border-0"
                  >
                    <span className="font-mono text-[10px] text-primary uppercase">{TABS.find(t => t.id === r.tab)?.label}</span>
                    <span className="text-[13px] text-white">{r.t}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link href="/app" className="hidden md:inline bg-primary text-[#030303] font-sans font-bold text-[12px] px-4 py-2 rounded-full no-underline shrink-0 hover:shadow-[0_0_18px_rgba(255,42,77,0.4)] transition-all">
            Launch App
          </Link>
        </div>

        {/* ── TABS ── */}
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 flex gap-8 border-t border-[#0d0d0d]">
          {TABS.map(tb => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`py-3 text-[13px] font-sans transition-colors border-b-2 -mb-px ${
                tab === tb.id ? 'text-white border-primary font-medium' : 'text-[#777] border-transparent hover:text-white'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12 flex gap-12 items-start">
        {/* sidebar */}
        <nav className="hidden lg:block w-[230px] shrink-0 sticky top-32">
          <div className="font-mono text-[10px] text-[#555] tracking-widest mb-3 uppercase">{TABS.find(t => t.id === tab)?.label}</div>
          <div className="flex flex-col border-l border-[#1a1a1a]">
            {SIDEBAR[tab].map(s => (
              <button
                key={s.id}
                onClick={() => go(tab, s.id)}
                className="text-left pl-4 py-1.5 text-[12.5px] font-sans text-[#888] hover:text-white hover:border-l hover:border-primary hover:-ml-px transition-all"
              >
                <span className="text-[#3a3a3a] font-mono mr-2">{s.n}</span>{s.t}
              </button>
            ))}
          </div>
        </nav>

        {/* content */}
        <div className="flex-1 min-w-0 max-w-[720px]">
          {tab === 'docs' && <DocsContent />}
          {tab === 'builder' && <BuilderContent />}
          {tab === 'support' && <SupportContent />}

          {/* footer */}
          <div className="mt-20 border-t border-[#111] pt-6 flex justify-between items-center text-[11px] text-[#333] font-mono flex-wrap gap-3">
            <div className="flex items-baseline gap-3">
              <span className="font-sans font-extrabold text-[15px] text-white tracking-tight">Brier<span className="text-primary">.</span></span>
              <span className="text-[#444]">docs</span>
            </div>
            <div className="flex gap-5">
              <Link href="/" className="hover:text-[#666] transition-colors no-underline">HOME</Link>
              <Link href="/app" className="hover:text-[#666] transition-colors no-underline">APP</Link>
              <Link href="/developers" className="hover:text-[#666] transition-colors no-underline">SDK</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
