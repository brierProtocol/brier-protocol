/**
 * Bot starter — the ready-to-run folder brier.world hands a builder right after
 * deploy. Zero installs: the SDK is bundled as a plain file and the .env comes
 * pre-filled with the keys generated moments earlier, so the whole flow is
 * unzip → `node index.js` → the deploy page turns green on the first ping.
 *
 * The credentials arrive from the client (which just received them from the
 * keys endpoint); nothing here reads or stores secrets server-side.
 */
import type { ZipEntry } from '@/lib/zip'

export interface StarterConfig {
  slug: string
  botId: string
  /** The bot's bk_live_ secret, used by the SDK to sign every request. */
  apiKey: string
  /** Brier API origin, e.g. https://brier.world */
  baseUrl: string
}

export function starterFiles(cfg: StarterConfig): ZipEntry[] {
  const dir = `${cfg.slug}-brier-bot`
  return [
    { name: `${dir}/package.json`, data: packageJson(cfg) },
    { name: `${dir}/.env`, data: envFile(cfg) },
    { name: `${dir}/.gitignore`, data: '.env\nnode_modules/\n' },
    { name: `${dir}/brier-sdk.js`, data: SDK_JS },
    { name: `${dir}/index.js`, data: indexJs() },
    { name: `${dir}/README.md`, data: readme(cfg) },
  ]
}

function packageJson(cfg: StarterConfig): string {
  return JSON.stringify(
    {
      name: `${cfg.slug}-brier-bot`,
      private: true,
      type: 'module',
      engines: { node: '>=18' },
      scripts: { start: 'node index.js' },
    },
    null,
    2,
  ) + '\n'
}

function envFile(cfg: StarterConfig): string {
  return [
    '# Your bot\'s credentials. Keep this file private, never commit it.',
    `BRIER_URL=${cfg.baseUrl}`,
    `BRIER_BOT_ID=${cfg.botId}`,
    `BRIER_BOT_SLUG=${cfg.slug}`,
    `BRIER_API_KEY=${cfg.apiKey}`,
    '',
  ].join('\n')
}

function readme(cfg: StarterConfig): string {
  return [
    `# ${cfg.slug} on Brier`,
    '',
    'Your bot, ready to run. Node 18+ is the only requirement.',
    '',
    '    node index.js',
    '',
    `Then watch ${cfg.baseUrl}/bot/${cfg.slug} light up: the first ping marks your`,
    'bot as connected, and each committed prediction starts building your track',
    'record. No capital, no vault, just forecasts scored against reality.',
    '',
    'What the starter does on each run:',
    '',
    '1. Pings Brier to prove the bot is alive.',
    '2. Pulls open YES/NO markets from Polymarket\'s public API.',
    '3. Commits up to 3 predictions using a demo strategy.',
    '',
    'Your job: open `index.js` and replace `myProbability()` with your model.',
    'That function is the whole game.',
    '',
    'The SDK is bundled (`brier-sdk.js`, zero dependencies). Your API key lives',
    'in `.env` and signs every request; if you lose it, issue a new one from',
    'your bot\'s profile.',
    '',
  ].join('\n')
}

function indexJs(): string {
  return `// index.js — your bot. Run it: node index.js
//
// It connects to Brier, finds real open Polymarket markets and commits
// predictions. Replace myProbability() with your model. That is the whole game.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BrierClient } from './brier-sdk.js'

// Load the .env sitting next to this file (no dependencies needed).
const here = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(here, '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\\n')) {
    const i = line.indexOf('=')
    if (i > 0 && !line.startsWith('#')) {
      const key = line.slice(0, i).trim()
      if (!process.env[key]) process.env[key] = line.slice(i + 1).trim()
    }
  }
}

const BRIER_URL = process.env.BRIER_URL
const BOT_ID = process.env.BRIER_BOT_ID
const API_KEY = process.env.BRIER_API_KEY
if (!BRIER_URL || !BOT_ID || !API_KEY) {
  console.error('Missing BRIER_URL / BRIER_BOT_ID / BRIER_API_KEY in .env')
  process.exit(1)
}

const brier = new BrierClient({ baseUrl: BRIER_URL, apiKey: API_KEY })

// ── 1. Connect. The first ping marks your bot as connected on Brier. ──────
await brier.ping(BOT_ID)
console.log('[ok] connected to Brier as ' + (process.env.BRIER_BOT_SLUG || BOT_ID))

// ── 2. Find real markets. ─────────────────────────────────────────────────
// Primary: Brier's market feed (same source your track record uses, works on
// every network). Fallback: Polymarket's public API directly.
async function fetchOpenMarkets() {
  try {
    const res = await fetch(BRIER_URL + '/api/v1/markets/open')
    const data = await res.json()
    const open = (data.markets || []).filter((m) => m.marketId && m.marketId.startsWith('0x'))
    if (open.length > 0) {
      return open.map((m) => ({ conditionId: m.marketId, question: m.title, pYes: m.pYes }))
    }
  } catch { console.log('[..] Brier market feed unreachable, trying Polymarket directly') }
  try {
    const gamma =
      'https://gamma-api.polymarket.com/markets' +
      '?active=true&closed=false&limit=50&order=volume24hr&ascending=false'
    const markets = await (await fetch(gamma)).json()
    return (Array.isArray(markets) ? markets : [])
      .filter((m) => {
        if (!m.conditionId || !m.conditionId.startsWith('0x')) return false
        let outcomes = []
        try { outcomes = JSON.parse(m.outcomes || '[]') } catch { /* skip */ }
        return outcomes.length === 2 && outcomes[0] === 'Yes'
      })
      .map((m) => {
        let pYes = null
        try { pYes = Number(JSON.parse(m.outcomePrices || '[]')[0]) || null } catch { /* unknown */ }
        return { conditionId: m.conditionId, question: m.question, pYes }
      })
  } catch { /* fall through */ }
  return []
}

const open = await fetchOpenMarkets()
console.log('[ok] ' + open.length + ' open YES/NO markets found')
if (open.length === 0) {
  console.log('')
  console.log('No open markets reachable right now.')
  console.log('Your bot IS connected to Brier. Run again in a few minutes.')
  process.exit(0)
}

// ── 3. Your model. ────────────────────────────────────────────────────────
// Demo strategy: nudge the market price 3 points toward 0.5, a mild "the
// crowd overreacts" prior. It exists so the pipeline runs end to end.
// Replace it with YOUR edge: this function is why your bot will win or lose.
function myProbability(marketPYes) {
  const nudged = marketPYes + (marketPYes > 0.5 ? -0.03 : 0.03)
  return Math.min(0.97, Math.max(0.03, nudged))
}

// ── 4. Commit up to 3 predictions. ────────────────────────────────────────
let committed = 0
for (const m of open) {
  if (committed >= 3) break
  const marketPYes = typeof m.pYes === 'number' ? m.pYes : 0.5

  const pYes = myProbability(marketPYes)
  const side = pYes >= 0.5 ? 'YES' : 'NO'
  const probability = side === 'YES' ? pYes : 1 - pYes // P(chosen side wins)

  try {
    await brier.predict({
      botId: BOT_ID,
      marketId: m.conditionId,
      side,
      probability,
      marketTitle: m.question,
    })
    committed++
    console.log('[ok] committed ' + side + ' p=' + probability.toFixed(2) + ' on: ' + m.question)
  } catch (err) {
    if (err && err.statusCode === 409) continue // already predicted this market
    throw err
  }
}

console.log('')
console.log('Done. ' + committed + ' new predictions committed.')
console.log('Watch them resolve: ' + BRIER_URL + '/bot/' + (process.env.BRIER_BOT_SLUG || BOT_ID))
console.log('Next: open index.js and make myProbability() smarter.')
`
}

/**
 * The bundled SDK, kept dependency-free and backtick-free so it can live as a
 * template string. Mirrors packages/brier-sdk-js (same signing: HMAC-SHA256
 * over "timestamp.body" keyed by the bk_live_ secret) plus ping().
 */
const SDK_JS = `// brier-sdk.js — the Brier SDK, bundled with your starter. Zero dependencies.
// Node 18+ (native fetch). Signs every request with HMAC-SHA256 over
// "timestamp.body" using your bk_live_ API key.
import crypto from 'node:crypto'

export class BrierError extends Error {
  constructor(statusCode, message) {
    super('Brier API Error [' + statusCode + ']: ' + message)
    this.name = 'BrierError'
    this.statusCode = statusCode
  }
}

export class BrierClient {
  constructor(opts) {
    if (!opts || !opts.baseUrl) throw new Error('BrierClient: baseUrl is required')
    if (!opts.apiKey) throw new Error('BrierClient: apiKey is required')
    this.baseUrl = opts.baseUrl.replace(/\\/+$/, '')
    this.apiKey = opts.apiKey
    this.maxRetries = opts.maxRetries || 3
    this.timeoutMs = opts.timeoutMs || 10000
  }

  // Tell Brier your bot is alive. Flips your profile to "connected".
  ping(botId) {
    return this.signedPost(this.baseUrl + '/api/v1/ping', JSON.stringify({ botId }))
  }

  // Commit a prediction on a real market. This is how you build a track record.
  // p: { botId, marketId, probability (0..1, P of your side), side: 'YES'|'NO', marketTitle? }
  predict(p) {
    const payload = {
      botId: p.botId,
      marketId: p.marketId,
      probability: p.probability,
      side: p.side,
    }
    if (p.marketTitle) payload.marketTitle = p.marketTitle
    return this.signedPost(this.baseUrl + '/api/v1/predictions', JSON.stringify(payload))
  }

  // Public read: a bot's committed predictions and their resolution status.
  async predictions(botId, limit) {
    const url = this.baseUrl + '/api/v1/predictions?botId=' +
      encodeURIComponent(botId) + '&limit=' + (limit || 50)
    const res = await this.fetchWithTimeout(url, { method: 'GET' })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new BrierError(res.status, (data && data.error) || res.statusText)
    return data
  }

  // Signs and POSTs a body. Retries 5xx/network with backoff, never retries 4xx.
  async signedPost(url, body) {
    let attempt = 0
    for (;;) {
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
          throw new BrierError(res.status, (data && data.error) || res.statusText)
        }
        throw new BrierError(res.status, (data && data.error) || 'Internal Server Error')
      } catch (err) {
        if (err instanceof BrierError && err.statusCode >= 400 && err.statusCode < 500) throw err
        if (attempt >= this.maxRetries) throw err
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt - 1) * 1000))
      }
    }
  }

  sign(timestamp, body) {
    return crypto.createHmac('sha256', this.apiKey).update(timestamp + '.' + body).digest('hex')
  }

  async fetchWithTimeout(url, init) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs)
    try {
      return await fetch(url, Object.assign({}, init, { signal: ctrl.signal }))
    } finally {
      clearTimeout(t)
    }
  }
}
`
