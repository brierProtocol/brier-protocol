/**
 * @brier/sdk — connect a prediction bot to Brier in ~10 lines.
 *
 * The SDK signs every signal with your bot's API key (HMAC-SHA256 over
 * `${timestamp}.${body}`) and sends it to the executor. Get a key from the bot
 * dashboard ("Generate API key"); it is shown once. Node 18+ (native fetch).
 */
import crypto from 'node:crypto'

export type MarketType = 'SPOT' | 'PERP'
export type ActionType = 'OPEN' | 'CLOSE'
export type Direction = 'LONG' | 'SHORT' | 'YES' | 'NO'

export interface BrierTradeSignal {
  /** Unique id for this signal (idempotency). Use a uuid. */
  tradeId: string
  /** Your bot's id (from the dashboard). */
  botId: string
  /** The bot's on-chain vault address. */
  vaultAddress: string
  /** The outcome token / market id being traded. */
  marketId: string
  /** Index of the outcome being bet on (0 or 1 for binary markets). */
  outcomeIndex: number
  /** Probability you assign to the outcome, 0..1. Also the entry price. */
  entryPrice: number
  /** USDC notional for this signal. */
  size: number
  /** Your confidence, 0..1 (telemetry). */
  confidence: number
  direction?: Direction
  marketType?: MarketType
  actionType?: ActionType
  leverage?: number
  stopLossPrice?: number
  takeProfitPrice?: number
  /** Slippage tolerance in basis points (100 = 1%). Defaults server-side to 200. */
  maxSlippageBps?: number
}

export class BrierError extends Error {
  constructor(public statusCode: number, message: string) {
    super(`Brier API Error [${statusCode}]: ${message}`)
    this.name = 'BrierError'
  }
}

export interface BrierClientOptions {
  /** Executor base URL, e.g. https://executor.brier.world */
  baseUrl: string
  /** Your bot's API key (bk_live_...). Shown once in the dashboard. */
  apiKey: string
  /** Max retries on 5xx / network errors (default 3). 4xx never retries. */
  maxRetries?: number
  /** Per-request timeout in ms (default 10000). */
  timeoutMs?: number
}

export class BrierClient {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly maxRetries: number
  private readonly timeoutMs: number

  constructor(opts: BrierClientOptions) {
    if (!opts.baseUrl) throw new Error('BrierClient: baseUrl is required')
    if (!opts.apiKey) throw new Error('BrierClient: apiKey is required')
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '')
    this.apiKey = opts.apiKey
    this.maxRetries = opts.maxRetries ?? 3
    this.timeoutMs = opts.timeoutMs ?? 10_000
  }

  private sign(timestamp: number, body: string): string {
    return crypto.createHmac('sha256', this.apiKey).update(`${timestamp}.${body}`).digest('hex')
  }

  /** Sends a trade signal. Retries 5xx/network with exponential backoff; never retries 4xx. */
  async sendTradeSignal(signal: BrierTradeSignal): Promise<unknown> {
    const body = JSON.stringify({
      marketType: 'SPOT',
      actionType: 'OPEN',
      leverage: 1.0,
      ...signal,
    })

    let attempt = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempt++
      try {
        const timestamp = Date.now()
        const res = await this.fetchWithTimeout(`${this.baseUrl}/api/v1/signals`, {
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

        // 4xx is a client error (bad key, bad payload) — surface it, do not retry.
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

  /** Liveness check against the executor. */
  async health(): Promise<unknown> {
    const res = await this.fetchWithTimeout(`${this.baseUrl}/health`, { method: 'GET' })
    if (!res.ok) throw new BrierError(res.status, 'Health check failed')
    return res.json()
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
