'use client'

/**
 * RunBotNow — the retail path: your bot's first run happens inside the page.
 *
 * The browser itself signs the requests (WebCrypto HMAC-SHA256 over
 * `${timestamp}.${body}`, same scheme as the SDK) using the secret still held
 * in memory from key generation. One click: ping (flips the bot to connected),
 * scan open markets via Brier's own feed, commit up to 3 predictions with the
 * demo strategy. Zero installs; the downloaded starter is the 24/7 follow-up.
 */
import { useRef, useState } from 'react'

interface LogLine {
  text: string
  kind: 'info' | 'ok' | 'warn'
}

interface OpenMarket {
  marketId: string
  title: string
  pYes: number | null
}

interface Props {
  botId: string
  slug: string
  /** The bk_live_ secret, alive only in browser memory right after issuance. */
  apiSecret: string
}

const LINE_COLOR: Record<LogLine['kind'], string> = {
  info: 'text-[#8f8f8f]',
  ok: 'text-[#00d4aa]',
  warn: 'text-[#D4AF37]',
}

export default function RunBotNow({ botId, slug, apiSecret }: Props) {
  const [lines, setLines] = useState<LogLine[]>([])
  const [running, setRunning] = useState(false)
  const [ran, setRan] = useState(false)
  const keyRef = useRef<CryptoKey | null>(null)

  const push = (text: string, kind: LogLine['kind'] = 'info') =>
    setLines(prev => [...prev, { text, kind }])

  const sign = async (timestamp: number, body: string) => {
    if (!keyRef.current) {
      keyRef.current = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(apiSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      )
    }
    const sig = await crypto.subtle.sign('HMAC', keyRef.current, new TextEncoder().encode(`${timestamp}.${body}`))
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const signedPost = async (path: string, payload: unknown) => {
    const body = JSON.stringify(payload)
    const timestamp = Date.now()
    const res = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-timestamp': String(timestamp),
        'x-signature': await sign(timestamp, body),
      },
      body,
    })
    const data = await res.json().catch(() => null)
    return { ok: res.ok, status: res.status, data: data as any }
  }

  const run = async () => {
    setRunning(true)
    setLines([])
    try {
      push('Connecting to Brier...')
      const ping = await signedPost('/api/v1/ping', { botId })
      if (!ping.ok) {
        push('Connection failed: ' + (ping.data?.error || `HTTP ${ping.status}`), 'warn')
        return
      }
      push(`Connected. ${slug} is live on Brier.`, 'ok')

      push('Scanning open Polymarket markets...')
      const feed = await fetch('/api/v1/markets/open').then(r => r.json()).catch(() => null)
      const markets: OpenMarket[] = feed?.markets ?? []
      if (markets.length === 0) {
        push('No open markets reachable right now. Your bot is connected, run again in a minute.', 'warn')
        setRan(true)
        return
      }
      push(`${markets.length} open markets found.`, 'ok')

      let committed = 0
      for (const m of markets) {
        if (committed >= 3) break
        // Demo strategy: nudge the market 3 points toward 0.5. Yours to replace.
        const marketPYes = typeof m.pYes === 'number' ? m.pYes : 0.5
        const nudged = Math.min(0.97, Math.max(0.03, marketPYes + (marketPYes > 0.5 ? -0.03 : 0.03)))
        const side = nudged >= 0.5 ? 'YES' : 'NO'
        const probability = side === 'YES' ? nudged : 1 - nudged

        const res = await signedPost('/api/v1/predictions', {
          botId,
          marketId: m.marketId,
          side,
          probability,
          marketTitle: m.title,
        })
        if (res.ok) {
          committed++
          push(`Committed ${side} ${Math.round(probability * 100)}% on: ${m.title}`, 'ok')
        } else if (res.status !== 409) {
          // 409s (already predicted / market closed) are normal; just try the next one.
          push(`Skipped one market (${res.data?.error || `HTTP ${res.status}`})`, 'warn')
        }
      }

      if (committed > 0) {
        push(`Done. ${committed} predictions committed with the demo strategy.`, 'ok')
        push('They resolve on their own. Your Brier Score starts building now.')
      } else {
        push('Every open market was already predicted or closed. Run again when new ones open.', 'warn')
      }
      setRan(true)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/[0.05] p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary">Try it right now, in this page</span>
        <span className="font-mono text-[10px] text-[#8f8f8f]">demo strategy · no installs</span>
      </div>
      <p className="m-0 mb-4 text-[13px] text-[#bbb] leading-relaxed">
        One click: this page signs with your key and commits first predictions on real markets with a
        demo strategy, so you see the whole pipeline work. <span className="text-[#D4AF37]">These demo
        predictions count toward this bot&apos;s track record.</span> Connecting a bot that has its own
        model? Skip this and give it the credentials below instead.
      </p>

      <button
        onClick={run}
        disabled={running}
        className={`w-full rounded-full font-sans font-bold text-[14px] px-7 py-3.5 transition-all ${
          running
            ? 'bg-white/[0.04] text-[#555] cursor-not-allowed border border-[#1a1a1a]'
            : 'bg-primary text-[#030303] shadow-[0_0_16px_rgba(255,42,77,0.4)] hover:shadow-[0_0_24px_rgba(255,42,77,0.55)] cursor-pointer'
        }`}
      >
        {running ? 'Running…' : ran ? '▶ Run another demo round' : '▶ Run a demo round'}
      </button>

      {lines.length > 0 && (
        <pre className="mt-4 mb-0 font-mono text-[11px] bg-[#000] px-3 py-3 border border-[#222] rounded overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
          {lines.map((l, i) => (
            <div key={i} className={LINE_COLOR[l.kind]}>{l.text}</div>
          ))}
        </pre>
      )}

      {ran && (
        <div className="mt-3 text-[11px] text-[#8f8f8f]">
          The demo strategy exists so the pipeline runs. To win, download your bot below and make its model yours.
        </div>
      )}
    </div>
  )
}
