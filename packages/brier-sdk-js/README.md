# @brier/sdk

Build a **verifiable prediction track record** in ~10 lines. Commit a probability
on a real market, Brier resolves it independently, your Brier Score updates. No
capital, no vault, no on-chain anything. Node 18+.

## Install

```bash
npm install @brier/sdk
```

## Quickstart — your first prediction (no money required)

1. Create a bot in the dashboard and copy its **bot id**.
2. Click **Generate API key** (you sign once with your wallet). Copy the `bk_live_...`
   secret — it is shown only once.
3. Predict:

```ts
import { BrierClient } from '@brier/sdk'

const brier = new BrierClient({
  baseUrl: 'https://brier.world',     // the Brier API
  apiKey: process.env.BRIER_API_KEY!, // bk_live_...
})

await brier.predict({
  botId: process.env.BRIER_BOT_ID!,
  marketId: '0xMarketConditionId',
  side: 'YES',
  probability: 0.62, // your P(YES wins), strictly between 0 and 1
})
```

That's it. The prediction is committed and timestamped; when the market settles on
Polymarket, Brier resolves it and folds it into your score. Watch it on your profile.

## Going live (later)

Once your bot clears the gate and earns a vault, the same client drives real
execution — just add the executor URL:

```ts
const brier = new BrierClient({
  baseUrl: 'https://brier.world',
  executorUrl: 'https://executor.brier.world',
  apiKey: process.env.BRIER_API_KEY!,
})

await brier.sendTradeSignal({ /* tradeId, botId, vaultAddress, marketId, ... */ })
```

## What the SDK handles for you

- **Auth:** HMAC-SHA256 over `${timestamp}.${body}` with your API key.
- **Replay safety:** every request is timestamped (server enforces a 5-min window).
- **Retries:** 5xx and network errors retry with exponential backoff; 4xx never retries.
- **Timeouts:** per-request `AbortController` (default 10s).
- **Typed errors:** failures throw `BrierError` with the HTTP status and server message.

## API

```ts
new BrierClient({ baseUrl, apiKey, executorUrl?, maxRetries?, timeoutMs? })

client.predict(prediction): Promise<unknown>          // the fast path — no capital
client.sendTradeSignal(signal): Promise<unknown>      // live trading (needs executorUrl)
client.health(): Promise<unknown>
```

### `PredictionInput` (predict)

| field | type | notes |
|---|---|---|
| `botId` | string | from the dashboard |
| `marketId` | string | the market conditionId |
| `side` | `YES \| NO` | which side you back |
| `probability` | number | P(your side wins), strictly 0..1 |
| `marketTitle?` | string | optional label |

One prediction per (bot, market): you can't resubmit after the market moves. The
market must still be open when you commit.

### `BrierTradeSignal` (sendTradeSignal — advanced)

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

Generate a new key before revoking the old one — Brier accepts any active key for
your bot, so there is no downtime. Revoke the old key from the dashboard.

## Security

Treat `bk_live_...` like a password. Keep it in an environment variable, never in
source control. If it leaks, revoke it in the dashboard and generate a new one.
