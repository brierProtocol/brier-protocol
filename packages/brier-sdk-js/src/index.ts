/**
 * @brier/sdk — build a verifiable prediction track record in ~10 lines.
 *
 * The fast path is `predict()`: commit a probability on a real market and let
 * Brier resolve it independently and score your Brier. No capital, no vault, no
 * on-chain anything. Once your bot earns a vault, `sendTradeSignal()` drives live
 * execution (that one talks to the executor, so pass `executorUrl`).
 *
 * Every request is signed with your bot's API key (HMAC-SHA256 over
 * `${timestamp}.${body}`). Node 18+ (native fetch).
 */
import crypto from 'node:crypto'

export type MarketType = 'SPOT' | 'PERP'
export type ActionType = 'OPEN' | 'CLOSE'
export type Direction = 'LONG' | 'SHORT' | 'YES' | 'NO'

/** A prediction: a probability committed on a real market before it resolves. */
export interface PredictionInput {
  /** Your bot's id (from the dashboard). */
  botId: string
  /** The market conditionId you are predicting on. */
  marketId: string
  /** Probability that your chosen `side` wins, strictly between 0 and 1. */
  probability: number
  /** Which side you back. */
  side: 'YES' | 'NO'
  /** Optional human label for the market. */
  marketTitle?: string
}

/** A live trade signal (advanced — only after your bot has a vault). */
export interface BrierTradeSignal {
  tradeId: string
  botId: string
  vaultAddress: string
  marketId: string
  outcomeIndex: number
  entryPrice: number
  size: number
  confidence: number
  direction?: Direction
  marketType?: MarketType
  actionType?: ActionType
  leverage?: number
  stopLossPrice?: number
  takeProfitPrice?: number
  maxSlippageBps?: number
}

export class BrierError extends Error {
  constructor(public statusCode: number, message: string) {
    super(`Brier API Error [${statusCode}]: ${message}`)
    this.name = 'BrierError'
  }
}

export interface BrierClientOptions {
  /** Brier API base URL, e.g. https://brier.world — used for predictions & reads. */
  baseUrl: string
  /** Your bot's API key (bk_live_...). Shown once in the dashboard. */
  apiKey: string
  /** Executor base URL — only needed for live `sendTradeSignal()`. */
  executorUrl?: string
  /** Max retries on 5xx / network errors (default 3). 4xx never retries. */
  maxRetries?: number
  /** Per-request timeout in ms (default 10000). */
  timeoutMs?: number
}

export class BrierClient {
  private readonly baseUrl: string
  private readonly executorUrl?: string
  private readonly apiKey: string
  private readonly maxRetries: number
  private readonly timeoutMs: number

  constructor(opts: BrierClientOptions) {
    if (!opts.baseUrl) throw new Error('BrierClient: baseUrl is required')
    if (!opts.apiKey) throw new Error('BrierClient: apiKey is required')
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '')
    this.executorUrl = opts.executorUrl?.replace(/\/+$/, '')
    this.apiKey = opts.apiKey
    this.maxRetries = opts.maxRetries ?? 3
    this.timeoutMs = opts.timeoutMs ?? 10_000
  }

  /**
   * Commit a prediction on a real market. This is how you build a Brier track
   * record — no capital, no vault. Resolved independently when the market settles.
   */
  async predict(p: PredictionInput): Promise<unknown> {
    const body = JSON.stringify({
      botId: p.botId,
      marketId: p.marketId,
      probability: p.probability,
      side: p.side,
      ...(p.marketTitle ? { marketTitle: p.marketTitle } : {}),
    })
    return this.signedPost(`${this.baseUrl}/api/v1/predictions`, body)
  }

  /** Sends a live trade signal to the executor (requires `executorUrl` + a vault). */
  async sendTradeSignal(signal: BrierTradeSignal): Promise<unknown> {
    if (!this.executorUrl) {
      throw new Error('BrierClient: executorUrl is required for sendTradeSignal (live trading)')
    }
    const body = JSON.stringify({ marketType: 'SPOT', actionType: 'OPEN', leverage: 1.0, ...signal })
    return this.signedPost(`${this.executorUrl}/api/v1/signals`, body)
  }

  /** Liveness check against the Brier API. */
  async health(): Promise<unknown> {
    const res = await this.fetchWithTimeout(`${this.baseUrl}/health`, { method: 'GET' })
    if (!res.ok) throw new BrierError(res.status, 'Health check failed')
    return res.json()
  }

  /** Signs and POSTs a body, retrying 5xx/network with backoff; never retries 4xx. */
  private async signedPost(url: string, body: string): Promise<unknown> {
    let attempt = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempt++
      try {
        const timestamp = Date.now()
        const res = await this.fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-timestamp': String(timestamp),
            'x-signature': this.sign(timestamp, body),
          },
          body,
        })
        const data = await res.json().catch(() => null)
        if (res.ok) return data
        if (res.status >= 400 && res.status < 500) {
          throw new BrierError(res.status, (data as any)?.error || res.statusText)
        }
        throw new BrierError(res.status, (data as any)?.error || 'Internal Server Error')
      } catch (err) {
        if (err instanceof BrierError && err.statusCode >= 400 && err.statusCode < 500) throw err
        if (attempt >= this.maxRetries) throw err
        await sleep(2 ** (attempt - 1) * 1000)
      }
    }
  }

  private sign(timestamp: number, body: string): string {
    return crypto.createHmac('sha256', this.apiKey).update(`${timestamp}.${body}`).digest('hex')
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs)
    try {
      return await fetch(url, { ...init, signal: ctrl.signal })
    } finally {
      clearTimeout(t)
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}
