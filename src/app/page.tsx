import Link from 'next/link'
import BotCharacter from '@/components/BotCharacter'

const ASCII_LOGO = `
    ____       _               ____             __                 __
   / __ )_____(_)__  _____    / __ \\_________  / /_____  _________/ /
  / __  / ___/ / _ \\/ ___/   / /_/ / ___/ __ \\/ __/ __ \\/ ___/ __  / 
 / /_/ / /  / /  __/ /      / ____/ /  / /_/ / /_/ /_/ / /__/ /_/ /  
/_____/_/  /_/\\___/_/      /_/   /_/   \\____/\\__/\\____/\\___/\\__,_/   
`

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#c5c8c6', fontFamily: 'var(--font-mono), monospace', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        {/* ASCII HEADER */}
        <div style={{ color: '#2563EB', whiteSpace: 'pre', fontSize: 'clamp(8px, 1.5vw, 14px)', fontWeight: 'bold', marginBottom: '2rem', lineHeight: 1.2 }}>
          {ASCII_LOGO}
          <div style={{ color: '#555', marginTop: '0.5rem' }}>
            &gt; INSTITUTIONAL PREDICTION MARKET INFRASTRUCTURE
            <br />
            &gt; POLYGON NETWORK TARGET ACQUIRED
          </div>
        </div>

        {/* MOTD */}
        <div style={{ border: '1px solid #1a1a1a', background: '#0a0a0a', padding: '1rem', marginBottom: '2rem' }}>
          <div style={{ color: '#2563EB', fontWeight: 'bold', borderBottom: '1px solid #1a1a1a', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
            --- MESSAGE OF THE DAY ---
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            <span style={{ color: '#7ec87e' }}>&gt;Welcome to Brier V1.</span><br/>
            Humans are terrible at probability. Machines are not.<br/>
            Brier is a decentralized index of algorithmic trading bots executing on prediction markets (Polymarket, Kalshi).<br/>
            <br/>
            <span style={{ color: '#cc0000', fontWeight: 'bold' }}>RULES OF ENGAGEMENT:</span><br/>
            1. All bots must survive a 30-day on-chain paper trading phase.<br/>
            2. Bots are ranked strictly by their Brier Score (lower = better).<br/>
            3. Vaults open automatically for top-tier bots. Depositors yield profits. Builders earn 10% performance fees.<br/>
          </div>
        </div>

        {/* DIRECTORY LINKS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
          
          <div style={{ border: '1px solid #1a1a1a', background: '#0a0a0a', padding: '1rem' }}>
            <div style={{ color: '#2563EB', fontWeight: 'bold', marginBottom: '0.5rem' }}>[ INVESTORS ]</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: '1rem', height: 40 }}>
              Deploy capital into verified algorithmic prediction vaults. Zero emotion, fully transparent.
            </div>
            <Link href="/discover" style={{ display: 'inline-block', background: '#2563EB', color: '#000', textDecoration: 'none', padding: '6px 16px', fontWeight: 'bold', fontSize: 13 }}>
              &gt; ENTER CATALOG
            </Link>
          </div>

          <div style={{ border: '1px dashed #333', background: '#0a0a0a', padding: '1rem' }}>
            <div style={{ color: '#22c55e', fontWeight: 'bold', marginBottom: '0.5rem' }}>[ BUILDERS ]</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: '1rem', height: 40 }}>
              Deploy your prediction model. Prove your Brier Score on-chain. Attract capital.
            </div>
            <Link href="/list-bot" style={{ display: 'inline-block', border: '1px solid #22c55e', color: '#22c55e', textDecoration: 'none', padding: '6px 16px', fontWeight: 'bold', fontSize: 13 }}>
              &gt; DEPLOY BOT
            </Link>
          </div>

        </div>

        {/* TOP THREADS PREVIEW */}
        <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ color: '#C9A84C', fontWeight: 'bold' }}>&gt;&gt; ACTIVE_VAULTS_PREVIEW</div>
            <div style={{ fontSize: 12, color: '#555' }}>Network: Polygon | Currency: USDC</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', color: '#555' }}>
                <th style={{ padding: '0.5rem', fontWeight: 'normal' }}>BOT_ID</th>
                <th style={{ padding: '0.5rem', fontWeight: 'normal' }}>BRIER_SCORE</th>
                <th style={{ padding: '0.5rem', fontWeight: 'normal' }}>WIN_RATE</th>
                <th style={{ padding: '0.5rem', fontWeight: 'normal' }}>MONTHLY_YIELD</th>
                <th style={{ padding: '0.5rem', fontWeight: 'normal', textAlign: 'right' }}>TVL</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #1a1a1a', background: 'rgba(37,99,235,0.03)' }}>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <Link href="/bot/sigma-7" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 'bold' }}>[SIGMA-7]</Link>
                  <span style={{ color: '#555', marginLeft: 8, fontSize: 10 }}>by 0x4a...92cf</span>
                </td>
                <td style={{ padding: '0.75rem 0.5rem', color: '#22c55e' }}>0.140</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>82.1%</td>
                <td style={{ padding: '0.75rem 0.5rem', color: '#22c55e' }}>+12.4%</td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>$1,400,000</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <Link href="/bot/oracle-x" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 'bold' }}>[ORACLE-X]</Link>
                  <span style={{ color: '#555', marginLeft: 8, fontSize: 10 }}>by dev-alex.eth</span>
                </td>
                <td style={{ padding: '0.75rem 0.5rem', color: '#22c55e' }}>0.170</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>76.4%</td>
                <td style={{ padding: '0.75rem 0.5rem', color: '#22c55e' }}>+8.9%</td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>$850,000</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <Link href="/bot/adan-pred" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 'bold' }}>[ADAN-PRED]</Link>
                  <span style={{ color: '#555', marginLeft: 8, fontSize: 10 }}>by 0x7f...1182</span>
                </td>
                <td style={{ padding: '0.75rem 0.5rem', color: '#FF6B1A' }}>0.245</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>62.0%</td>
                <td style={{ padding: '0.75rem 0.5rem', color: '#22c55e' }}>+31.2%</td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>$2,100,000</td>
              </tr>
            </tbody>
          </table>
          <div style={{ textAlign: 'right', marginTop: '1rem' }}>
            <Link href="/discover" style={{ color: '#555', textDecoration: 'none', fontSize: 12 }}>
              [View full directory...]
            </Link>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ marginTop: '4rem', borderTop: '1px solid #1a1a1a', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#555' }}>
          <div>Brier v1.0.0-rc</div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span style={{ cursor: 'pointer' }}>[Docs]</span>
            <span style={{ cursor: 'pointer' }}>[Twitter]</span>
            <span style={{ cursor: 'pointer' }}>[GitHub]</span>
          </div>
        </div>

      </div>
    </div>
  )
}
