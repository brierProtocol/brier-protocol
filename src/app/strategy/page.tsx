import Link from 'next/link'

export const metadata = {
  title: 'BRIER // Quoting Strategy',
  description: 'How Brier bots quote prediction markets — reservation price, inventory bounds, adverse selection, and the kill switch.',
}

// ── Small presentational helpers (server component, no client JS) ──

function Section({ tag, title, accent, children }: { tag: string; title: string; accent: string; children: React.ReactNode }) {
  return (
    <section className="relative bg-[#080808] border border-[#1a1a1a] p-6 md:p-8">
      <span className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: accent }} />
      <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: accent }} />
      <div className="font-mono text-[10px] tracking-[0.3em] mb-1" style={{ color: accent }}>{tag}</div>
      <h2 className="font-mono text-xl md:text-2xl font-bold text-white tracking-tight mb-4">{title}</h2>
      <div className="text-sm text-[#999] leading-relaxed font-sans space-y-3">{children}</div>
    </section>
  )
}

function Formula({ children, note }: { children: string; note?: string }) {
  return (
    <div className="my-3 bg-[#030303] border border-[#1a1a1a] px-4 py-3">
      <pre className="font-mono text-[13px] text-[#C8FF00] whitespace-pre-wrap m-0">{children}</pre>
      {note && <div className="font-mono text-[10px] text-[#555] mt-2">{note}</div>}
    </div>
  )
}

export default function StrategyPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-[#e8e8e8]">

      {/* Header */}
      <div className="border-b border-[#1a1a1a] bg-[#050505] px-8 py-4 flex justify-between items-center">
        <div className="font-mono text-sm font-bold text-white tracking-tight">QUOTING_STRATEGY</div>
        <div className="flex gap-5 font-mono text-xs">
          <Link href="/developers" className="text-[#444] hover:text-white transition-colors no-underline">DOCS</Link>
          <Link href="/" className="text-[#444] hover:text-white transition-colors no-underline">← HOME</Link>
        </div>
      </div>

      <div className="max-w-[760px] mx-auto px-6 py-10 flex flex-col gap-5">

        {/* Intro */}
        <div className="mb-2">
          <h1 className="font-mono text-2xl md:text-3xl font-bold text-white tracking-tight mb-3">
            How a Brier bot quotes a market
          </h1>
          <p className="text-sm text-[#888] leading-relaxed font-sans">
            A Brier bot does not <span className="text-[#ccc]">bet</span>. It <span className="text-primary">quotes</span> — posting a bid
            and an ask, capturing the spread, and managing the inventory it accumulates. The edge is not opinion; it is the math
            of where to place those quotes and when to pull them. This is the model behind the engine.
          </p>
        </div>

        <Section tag="MODEL_01" title="The reservation price" accent="#ff2a4d">
          <p>
            Everything starts with one number: the price at which the bot is <em>indifferent</em> to trading. Not the market
            mid — the bot&apos;s own fair value, shifted by how much inventory it is already holding. Avellaneda &amp; Stoikov (2008)
            gave the canonical form:
          </p>
          <Formula note="s = mid price · q = signed inventory · γ = risk aversion · σ² = variance · (T−t) = time to resolution">
{`r = s − q · γ · σ² · (T − t)`}
          </Formula>
          <p>
            If the bot is <span className="text-[#C8FF00]">long</span>, r drops below mid → it quotes to sell. If
            <span className="text-[#ff3b3b]"> short</span>, r rises above mid → it quotes to buy. The bot is always leaning back
            toward flat. That lean is the whole game.
          </p>
        </Section>

        <Section tag="MODEL_02" title="The spread — two sources of edge" accent="#3B82F6">
          <p>The total distance between bid and ask comes from two terms:</p>
          <Formula note="term 1 = inventory-risk compensation · term 2 = pure liquidity-provision profit (survives even at γ→0)">
{`δ = γ · σ² · (T − t)  +  (2/γ) · ln(1 + γ/κ)`}
          </Formula>
          <p>
            The first term widens the spread when the world is volatile. The second is the structural profit of being the
            liquidity provider — it persists even if the bot is risk-neutral. κ measures how much traders chase price: low κ
            means they&apos;ll cross a wide spread, high κ means they won&apos;t.
          </p>
        </Section>

        <Section tag="MODEL_03" title="Inventory bounds — the hard stop" accent="#C9A84C">
          <p>
            Prediction markets settle at exactly <span className="text-white">$0</span> or <span className="text-white">$1</span>.
            There is no hedge for &quot;the probability Trump wins&quot; — no underlying to short. So inventory risk is managed by
            hard limits. Guéant–Lehalle–Fernandez-Tapia (2013) bound it:
          </p>
          <Formula note="Q maps directly to max tolerable loss from a single binary outcome">
{`|q| ≤ Q`}
          </Formula>
          <p>
            As the bot approaches Q, its spreads widen automatically; at Q, quotes disappear. Short 100k YES at $0.40 and the
            market resolves YES? You owe $100k, collected $40k → −$60k from one market. Q is what stops that.
          </p>
        </Section>

        <Section tag="MODEL_04" title="Adverse selection — why the spread isn't greed" accent="#ff3b3b">
          <p>
            Some of the people hitting your quote know more than you — campaign staff with private polls, an athlete who knows
            their own injury. The spread is the tax that lets you survive trading against them. Glosten–Milgrom (1985): at a
            coin-flip price, the minimum spread equals the fraction of informed flow.
          </p>
          <Formula note="μ = fraction of informed traders. Near resolution μ → 1, and naive quoting becomes suicidal.">
{`spread(p = 0.5) ≈ μ`}
          </Formula>
          <p>
            Brier watches <span className="text-white">VPIN</span> (volume-synchronized probability of informed trading) as a
            real-time toxicity alarm. When buy/sell flow goes sharply imbalanced, informed money is arriving — the bot widens or
            pulls quotes <em>before</em> it gets cleaned out.
          </p>
        </Section>

        <Section tag="MODEL_05" title="Why prediction markets break the textbook" accent="#a96bff">
          <ul className="list-none space-y-2">
            <li><span className="text-primary font-mono">›</span> <span className="text-white">Bounded prices.</span> Quote in log-odds space, not raw price — guarantees quotes stay inside (0, 1).</li>
            <li><span className="text-primary font-mono">›</span> <span className="text-white">Terminal settlement.</span> Price must converge to 0 or 1. Volatility undergoes a phase transition near resolution.</li>
            <li><span className="text-primary font-mono">›</span> <span className="text-white">Event jumps.</span> A goal, a ruling, a call — prices jump. Needs jump-diffusion, not smooth Brownian motion.</li>
            <li><span className="text-primary font-mono">›</span> <span className="text-white">No delta-hedge.</span> The &quot;underlying&quot; is an unobservable probability. Risk is managed by spread, limits, and cross-market hedges only.</li>
          </ul>
        </Section>

        <Section tag="STACK" title="What the Brier engine actually does" accent="#00d4aa">
          <p>The executor combines four layers on every quote:</p>
          <div className="grid gap-2 mt-2">
            {[
              ['LAYER_1', 'Base spread from Avellaneda-Stoikov / GLFT, scaled to realized belief volatility (3h / 24h / 7d / 30d).'],
              ['LAYER_2', 'Inventory skew — shifts the midpoint by current position. Long → lower reservation → tighter ask, wider bid.'],
              ['LAYER_3', 'Reward optimization — Polymarket pays ~$12M/yr in maker rebates; two-sided quoting earns ~3× single-sided.'],
              ['LAYER_4', 'Toxicity filter — VPIN / volume anomalies widen or withdraw quotes when informed flow is detected.'],
            ].map(([k, v]) => (
              <div key={k} className="bg-[#030303] border border-[#1a1a1a] p-3 flex gap-3">
                <span className="font-mono text-[10px] text-[#00d4aa] shrink-0 pt-0.5 tracking-widest">{k}</span>
                <span className="text-[13px] text-[#aaa] font-sans">{v}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section tag="SAFETY" title="The kill switch" accent="#ff2a4d">
          <p>
            The most important latency metric is not placing orders — it is <span className="text-white">cancelling</span> them
            before an informed trader fills a stale quote. Brier&apos;s safety stack:
          </p>
          <ul className="list-none space-y-2 mt-1">
            <li><span className="text-primary font-mono">›</span> <span className="text-white">Staged withdrawal</span> — spreads widen as resolution nears; in the final minutes, quotes are fully pulled.</li>
            <li><span className="text-primary font-mono">›</span> <span className="text-white">GTD orders</span> — auto-expire before known high-impact events (Fed prints, election calls).</li>
            <li><span className="text-primary font-mono">›</span> <span className="text-white">cancelAll()</span> — halts every outstanding order on a position breach or toxicity spike.</li>
          </ul>
        </Section>

        {/* References */}
        <div className="bg-[#050505] border border-[#1a1a1a] p-6">
          <div className="font-mono text-[10px] tracking-[0.3em] text-[#555] mb-3">REFERENCES</div>
          <ul className="font-mono text-[11px] text-[#666] space-y-1.5 leading-relaxed">
            <li>Avellaneda &amp; Stoikov — High-Frequency Trading in a Limit Order Book (2008)</li>
            <li>Guéant, Lehalle, Fernandez-Tapia — Dealing with the Inventory Risk (2013)</li>
            <li>Glosten &amp; Milgrom — Bid, Ask and Transaction Prices (1985)</li>
            <li>Kyle — Continuous Auctions and Insider Trading (1985)</li>
            <li>Easley, López de Prado, O&apos;Hara — Flow Toxicity and Liquidity / VPIN (2012)</li>
            <li>Dalen — Toward Black-Scholes for Prediction Markets (2025)</li>
          </ul>
        </div>

        {/* CTA */}
        <div className="flex justify-center py-4">
          <Link href="/list-bot" className="font-mono text-xs font-bold px-6 py-3 bg-primary text-[#030303] no-underline transition-all hover:shadow-[0_0_20px_rgba(255,42,77,0.4)]">
            DEPLOY_YOUR_BOT →
          </Link>
        </div>

      </div>
    </div>
  )
}
