# @brier/sdk

Connect a prediction bot to **Brier Protocol** in ~10 lines. The SDK signs every
signal with your bot's API key and sends it to the executor. Node 18+.

## Install

```bash
npm install @brier/sdk
```

## Quickstart

1. Create a bot in the dashboard and copy its **bot id**.
2. Click **Generate API key** (you sign once with your wallet). Copy the `bk_live_...`
   secret — it is shown only once.
3. Send your first signal:

```ts
import { BrierClient } from '@brier/sdk'
import { randomUUID } from 'node:crypto'

const brier = new BrierClient({
  baseUrl: process.env.BRIER_EXECUTOR_URL!, // e.g. https://executor.brier.world
  apiKey: process.env.BRIER_API_KEY!,       // bk_live_...
})

await brier.sendTradeSignal({
  tradeId: randomUUID(),
  botId: process.env.BRIER_BOT_ID!,
  vaultAddress: '0xYourVault',
  marketId: '0xOutcomeToken',
  outcomeIndex: 0,
  entryPrice: 0.62,   // probability you assign, 0..1
  size: 100,          // USDC
  confidence: 0.8,
})
```

That's it. The signal is authenticated, risk-checked, and queued for execution.

## What the SDK handles for you

- **Auth:** HMAC-SHA256 over `${timestamp}.${body}` with your API key.
- **Replay safety:** every request is timestamped (server enforces a 5-min window).
- **Retries:** 5xx and network errors retry with exponential backoff; 4xx never retries.
- **Timeouts:** per-request `AbortController` (default 10s).
- **Typed errors:** failures throw `BrierError` with the HTTP status and server message.

## API

```ts
new BrierClient({ baseUrl, apiKey, maxRetries?, timeoutMs? })

client.sendTradeSignal(signal): Promise<unknown>
client.health(): Promise<unknown>
```

### `BrierTradeSignal`

| field | type | notes |
|---|---|---|
| `tradeId` | string | unique per signal (use a uuid) |
| `botId` | string | from the dashboard |
| `vaultAddress` | string | the bot's vault |
| `marketId` | string | outcome token / market id |
| `outcomeIndex` | number | 0 or 1 for binary markets |
| `entryPrice` | number | probability 0..1 |
| `size` | number | USDC notional |
| `confidence` | number | 0..1 |
| `direction?` | `LONG \| SHORT \| YES \| NO` | |
| `marketType?` | `SPOT \| PERP` | default `SPOT` |
| `maxSlippageBps?` | number | default 200 (2%) |

## Key rotation

Generate a new key before revoking the old one — the executor accepts any active
key for your bot, so there is no downtime. Revoke the old key from the dashboard.

## Security

Treat `bk_live_...` like a password. Keep it in an environment variable, never in
source control. If it leaks, revoke it in the dashboard and generate a new one.
