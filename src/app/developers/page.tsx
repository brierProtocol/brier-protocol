import Link from 'next/link'

export default function DevelopersPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-mono), monospace', color: '#c5c8c6', padding: '2rem 1rem' }}>
      
      {/* HEADER */}
      <div style={{ maxWidth: 800, margin: '0 auto', marginBottom: '2rem', borderBottom: '1px solid #1a1a1a', paddingBottom: '1rem' }}>
        <div style={{ color: '#2563EB', fontSize: 24, fontWeight: 'bold', fontFamily: 'var(--font-body), sans-serif', marginBottom: '0.5rem' }}>
          Developer Documentation
        </div>
        <div style={{ fontSize: 13, color: '#555' }}>
          Connect your prediction models to the Brier protocol effortlessly.
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        {/* NAMING CONVENTION */}
        <div style={{ border: '1px solid #1a1a1a', background: '#0a0a0a', padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ color: '#C9A84C', fontWeight: 'bold', marginBottom: '1rem', fontFamily: 'var(--font-body), sans-serif' }}>
            &gt;&gt; THE @HANDLE SYSTEM
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: '#888' }}>
            When you register an algorithm on Brier, you are claiming a unique, global identifier. 
            <br/><br/>
            If you register the name <span style={{ color: '#fff', fontWeight: 'bold' }}>"Alpha Strike"</span>, your bot permanently owns the handle <span style={{ color: '#2563EB' }}>@alpha-strike</span>. No other builder can use this name. 
            This handle is how investors will find, track, and deposit capital into your vault.
          </div>
        </div>

        {/* SDK OVERVIEW */}
        <div style={{ border: '1px dashed #333', background: '#0a0a0a', padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ color: '#22c55e', fontWeight: 'bold', marginBottom: '1rem', fontFamily: 'var(--font-body), sans-serif' }}>
            &gt;&gt; THE @BRIER/SDK (ZERO-CRYPTO INTEGRATION)
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: '#888', marginBottom: '1.5rem' }}>
            You do not need to understand smart contracts, manage gas fees, or deal with blockchain indexing. 
            The Brier SDK abstracts the entire financial layer so you can focus strictly on your prediction logic.
          </div>

          <div style={{ background: '#000', padding: '1rem', border: '1px solid #1a1a1a', marginBottom: '1rem' }}>
            <div style={{ color: '#555', fontSize: 11, marginBottom: '0.5rem' }}>// 1. Install the SDK</div>
            <div style={{ color: '#fff', fontSize: 13 }}>pip install brier-sdk</div>
          </div>

          <div style={{ background: '#000', padding: '1rem', border: '1px solid #1a1a1a' }}>
            <div style={{ color: '#555', fontSize: 11, marginBottom: '0.5rem' }}>// 2. Three lines of code to deploy capital</div>
            <pre style={{ margin: 0, fontSize: 13, color: '#c5c8c6', whiteSpace: 'pre-wrap' }}>
<span style={{ color: '#c678dd' }}>import</span> brier_sdk<br/><br/>
<span style={{ color: '#555' }}># Initialize with the private key of the wallet you registered</span><br/>
client = brier_sdk.Client(private_key=<span style={{ color: '#98c379' }}>"0xYOUR_SECRET_KEY"</span>)<br/><br/>
<span style={{ color: '#555' }}># Send your prediction. Brier executes the on-chain trade automatically.</span><br/>
client.predict(<br/>
{'    '}market_id=<span style={{ color: '#98c379' }}>"polymarket-btc-100k"</span>,<br/>
{'    '}outcome=<span style={{ color: '#98c379' }}>"YES"</span>,<br/>
{'    '}confidence=<span style={{ color: '#d19a66' }}>0.95</span><br/>
)
            </pre>
          </div>
        </div>

        {/* ON-CHAIN ALTERNATIVE */}
        <div style={{ border: '1px solid #1a1a1a', background: '#050505', padding: '1.5rem' }}>
          <div style={{ color: '#555', fontWeight: 'bold', marginBottom: '0.5rem', fontFamily: 'var(--font-body), sans-serif' }}>
            &gt;&gt; ADVANCED: DIRECT ON-CHAIN EXECUTION
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.6, color: '#555' }}>
            Prefer to write your own Solidity or interact with Polymarket directly? Simply execute trades from your registered wallet address. 
            Brier's background indexer will automatically detect your trades, calculate your Brier Score, and mirror your strategy using Vault capital. No SDK required.
          </div>
        </div>

        <div style={{ marginTop: '3rem', textAlign: 'center' }}>
          <Link href="/list-bot" style={{ display: 'inline-block', background: '#2563EB', color: '#000', textDecoration: 'none', padding: '10px 24px', fontWeight: 'bold', fontSize: 13 }}>
            [ REGISTER ALGORITHM ]
          </Link>
        </div>

      </div>
    </div>
  )
}
