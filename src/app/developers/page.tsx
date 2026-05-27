'use client'

import Link from 'next/link'

export default function DevelopersPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-body), sans-serif', color: '#EFEFEF', padding: '3rem 1.5rem' }}>
      
      {/* HEADER */}
      <div style={{ maxWidth: 800, margin: '0 auto', marginBottom: '3rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1.5rem' }}>
        <div style={{ color: '#fff', fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display), sans-serif', letterSpacing: '-0.5px', marginBottom: '0.5rem' }}>
          Developer Documentation
        </div>
        <div style={{ fontSize: '14px', color: '#888', fontFamily: 'var(--font-mono), monospace' }}>
          Connect your quantitative models to the Brier protocol infrastructure.
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        {/* NAMING CONVENTION */}
        <div style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.5)' }}>
          <div style={{ color: '#C9A84C', fontWeight: 700, marginBottom: '1.5rem', fontFamily: 'var(--font-display), sans-serif', fontSize: '1.1rem', letterSpacing: '0.5px' }}>
            &gt;&gt; THE @HANDLE SYSTEM
          </div>
          <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#aaa' }}>
            When you register an algorithm on Brier, you are claiming a unique, global identifier. 
            <br/><br/>
            If you register the name <span style={{ color: '#fff', fontWeight: 600 }}>"Alpha Strike"</span>, your bot permanently owns the handle <span style={{ color: '#60a5fa', fontWeight: 600 }}>@alpha-strike</span>. No other builder can use this name. 
            This handle is how investors will find, track, and deposit capital into your vault.
          </div>
        </div>

        {/* SDK OVERVIEW */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ color: '#4ade80', fontWeight: 700, marginBottom: '1.5rem', fontFamily: 'var(--font-display), sans-serif', fontSize: '1.1rem', letterSpacing: '0.5px' }}>
            &gt;&gt; THE @BRIER/SDK (ZERO-CRYPTO INTEGRATION)
          </div>
          <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#aaa', marginBottom: '2rem' }}>
            You do not need to understand smart contracts, manage gas fees, or deal with blockchain indexing. 
            The Brier SDK abstracts the entire financial layer so you can focus strictly on your prediction logic.
          </div>

          <div style={{ background: '#050505', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', marginBottom: '1rem' }}>
            <div style={{ color: '#666', fontSize: '11px', marginBottom: '0.75rem', fontFamily: 'var(--font-mono), monospace' }}>// 1. Install the SDK</div>
            <div style={{ color: '#EFEFEF', fontSize: '13px', fontFamily: 'var(--font-mono), monospace' }}>pip install brier-sdk</div>
          </div>

          <div style={{ background: '#050505', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px' }}>
            <div style={{ color: '#666', fontSize: '11px', marginBottom: '0.75rem', fontFamily: 'var(--font-mono), monospace' }}>// 2. Three lines of code to deploy capital</div>
            <pre style={{ margin: 0, fontSize: '13px', color: '#c5c8c6', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono), monospace', lineHeight: 1.5 }}>
<span style={{ color: '#c084fc' }}>import</span> brier_sdk<br/><br/>
<span style={{ color: '#666' }}># Initialize with the private key of the wallet you registered</span><br/>
client = brier_sdk.Client(private_key=<span style={{ color: '#4ade80' }}>"0xYOUR_SECRET_KEY"</span>)<br/><br/>
<span style={{ color: '#666' }}># Send your prediction. Brier executes the on-chain trade automatically.</span><br/>
client.predict(<br/>
{'    '}market_id=<span style={{ color: '#4ade80' }}>"polymarket-btc-100k"</span>,<br/>
{'    '}outcome=<span style={{ color: '#4ade80' }}>"YES"</span>,<br/>
{'    '}confidence=<span style={{ color: '#60a5fa' }}>0.95</span><br/>
)
            </pre>
          </div>
        </div>

        {/* ON-CHAIN ALTERNATIVE */}
        <div style={{ border: '1px solid rgba(255,255,255,0.06)', background: '#0A0A0A', borderRadius: '8px', padding: '2rem' }}>
          <div style={{ color: '#666', fontWeight: 600, marginBottom: '1rem', fontFamily: 'var(--font-mono), monospace', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            &gt;&gt; Advanced: Direct On-Chain Execution
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#888' }}>
            Prefer to write your own Solidity or interact with Polymarket directly? Simply execute trades from your registered wallet address. 
            Brier's background indexer will automatically detect your trades, calculate your Brier Score, and mirror your strategy using Vault capital. No SDK required.
          </div>
        </div>

        <div style={{ marginTop: '4rem', textAlign: 'center' }}>
          <Link href="/list-bot" style={{ display: 'inline-block', background: '#2563EB', color: '#fff', borderRadius: '4px', textDecoration: 'none', padding: '14px 32px', fontWeight: 600, fontSize: '14px', boxShadow: '0 4px 14px 0 rgba(37,99,235,0.39)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#1d4ed8'} onMouseOut={e => e.currentTarget.style.background = '#2563EB'}>
            Register Algorithm →
          </Link>
        </div>

      </div>
    </div>
  )
}
