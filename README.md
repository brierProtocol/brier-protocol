# BRIER PROTOCOL

**Non-custodial vaults for algorithmic prediction-market bots.**
Build a bot with zero capital, prove its edge on-chain through its Brier Score,
and let investors fund it. Builders earn from skill, not from their wallet.

> Ranked by math, not marketing. Predicts on Polymarket. Settled on Polygon.

---

## The idea

A skilled forecaster with **no money** can:

1. Deploy a prediction bot (free, no capital required)
2. Prove it works in a **shadow phase** that Brier runs and scores against reality
3. Pass the bar (see **Eligibility rules**) and a **vault** opens for it
4. Investors fund the vault with USDC. The builder earns a share of the profit, **never risking their own capital**, and can run farms of bots

Investors get **non-custodial** exposure to verified algorithms: deposit USDC,
receive ERC-4626 shares, redeem anytime 1:1 at NAV. The bot can trade the
capital but can **never withdraw it** — the same trust model as Hyperliquid vaults.

The whole point: turn forecasting skill into income without gatekeeping by capital.
Imagine "how to earn from a Polymarket bot without a single dollar" as a real path.

---

## Eligibility rules (shadow → vault)

A bot only manages real money after it proves itself **inside Brier**. All three
conditions must be met:

| Gate | Threshold |
|---|---|
| Resolved predictions | **≥ 100** (measured by outcomes settled, not by days) |
| Brier Score | **≤ 0.20** (0.25 is a coin flip; 0.20 demands a real edge) |
| Active window | **≥ 21 days** |

Notes:
- **Measured by predictions, not by a fixed "7 days".** Sample size is what makes a
  Brier Score statistically meaningful. A bot that got lucky on 5 calls does not qualify.
- **Specialisation is allowed and encouraged.** A bot can focus on one kind of market
  (weather, politics, crypto, geopolitics) or be a generalist. The edge is the builder's
  choice. We do not require a spread across categories.
- Anti-gaming is an internal scoring detail: a bot is scored **once per resolved market**
  (not per re-submission), so it cannot inflate the count by spamming the same event.
- **No builder capital required.** A skin-in-the-game buffer is **optional**: a builder who
  wants to signal extra confidence can post one, but it is never mandatory. The barrier is
  effort (100 good resolved predictions over 21 days) and the bot's public Brier reputation.

---

## Verification (why a track record cannot be faked)

The track record runs **inside Brier**, never imported from a builder's local machine:

- Every prediction is signed and **timestamped before** the market resolves. The forecast
  cannot be changed after the outcome is known.
- Outcomes are settled by an **external oracle** (Polymarket CLOB), not self-reported.
- Even if a builder ran the bot locally, on Brier it starts from zero.

Anti-scam is **architectural, not identity-based**: the worst a bad actor can do is run a
bot that predicts poorly and sinks on its own public score. Funds are protected by the
non-custodial vault (the bot can never withdraw depositor capital) plus a 15% drawdown
circuit breaker. **Security is the top priority** — contracts must be audited before real
deposits, and key handling must be best-in-class.

---

## Architecture

```
Builder ──deploy bot (free)──► Brier (SHADOW)
                                │ predictions signed + timestamped on Brier
   Polymarket trades ──────────┤ indexer → TradeEvent → scoring (Brier/Sharpe/DD)
                                ▼
              eligibility met (100 resolved · Brier ≤ 0.20 · 21d) → vault deploys
                                │
Investor ──deposit USDC────────►│ ERC-4626 vault  ◄── executor trades Polymarket CLOB
                                │                      (FAK orders, slippage-bounded)
   market resolves ────────────┤ watcher (CLOB) → settleMarket → profit split
                                ▼
Investor ──redeem shares───────► principal + profit (1:1 @ NAV, instant)
```

### Stack
| Layer | Tech |
|---|---|
| **App** | Next.js 16 (App Router, Turbopack), TypeScript, Tailwind v4, Framer Motion, Three.js |
| **Data** | Prisma + PostgreSQL (Supabase in prod); shadow indexer mirrors on-chain events |
| **Chain** | `BrierVault` (ERC-4626) + `BrierVaultFactory` (EIP-1167 clones) on Polygon |
| **Executor** | Node/TS service: HMAC-signed signals → queue → Polymarket CLOB; resolution watcher |

---

## v1 scope

v1 is **product and infrastructure only**: the bot rails, the scoring, the vaults,
the security. Make Brier useful and safe first.

- **No token, no coin.** The conviction-token / Shadow-Market launch layer is **out of
  scope for v1** and removed from all public messaging (landing, docs).
- Token-related code still exists in the repo (`/api/tokens`, `launchpad`, `TokenPanel`,
  `lib/bondingCurve.ts`, parts of the bot page). It is **dormant for v1** and should be
  cleanly removed or gated in a dedicated pass so it never appears in the product.
- Polymarket is **not blocked in the US** as of 2026 (confirm current regulatory status
  before making legal claims on the site).

---

## Landing (presentation site)

`/` is a marketing landing, separate from the app:

- 3D planet hero (Brier core, vaults orbiting, users as red nodes) with a readability vignette
- "No pay to play" flagship statement
- **The Brier Stack** — 3D scene that settles on each stage (Deploy → Shadow → Vault → Earn) as you scroll, synced notes
- **Everything is on-chain** — glass block chain with a flowing data stream
- **Two ways in** — depositors (earn passively) vs builders (build on Polymarket, no capital)
- Manifesto, giant `Brier.` footer with the Wave wordmark and social icons
- Sunset scroll: black at top, reddish in the middle, black again at the footer

The app lives at `/app` behind "Launch App". Docs at `/docs` (GitBook style, ⌘K search).

---

## Pages

`/` landing · `/app` product · `/discover` · `/leaderboard` · `/dashboard` ·
`/list-bot` · `/bot/[slug]` · `/maker/[address]` · `/vault` · `/how-it-works` ·
`/strategy` · `/developers` · `/docs` · `/about` · `/faq` · `/terms` · `/privacy`

---

## Quick start (local)

```bash
npm install
# set DATABASE_URL & DIRECT_URL in .env.local
npm run db:push
npm run db:seed        # demo bots
npm run dev            # http://localhost:3000
```

### Tests
```bash
npm run test:scoring    # Brier scoring engine
npm run test:contracts  # Hardhat suite (split, capacity, circuit breaker, admin)
```

### Smart contracts
```bash
npm run deploy:hardhat  # local dry-run
npm run deploy:amoy     # Polygon Amoy testnet (needs a funded PRIVATE_KEY)
```

---

## Economics

On profit only — **no management fee, nothing on losses**:

| Recipient | Share |
|---|---|
| Depositors (NAV growth) | **60%** |
| Builder | **30%** |
| Protocol | **10%** |

A 15% drawdown trips the circuit breaker (pause). If a builder posted an optional
buffer, it absorbs losses first.

---

## Environment variables

See `.env.example`. Core: `DATABASE_URL`, `DIRECT_URL`, `ENCRYPTION_SECRET`,
`CRON_SECRET`, `NEXT_PUBLIC_WC_PROJECT_ID`, `NEXT_PUBLIC_USDC_ADDRESS`,
`VAULT_FACTORY_ADDRESS`, `EXECUTOR_PRIVATE_KEY`.

---

## Status

Platform built and tested (scoring + contracts). To go live: Supabase + Vercel for the
showcase, Polygon Amoy for vault mechanics, then a mainnet deploy **with an audit** before
any real deposits.

Runbooks: [`GO_LIVE.md`](./GO_LIVE.md) · [`DEPLOY_AMOY.md`](./DEPLOY_AMOY.md)

---

## Disclaimer

Prediction markets and algorithmic strategies carry risk of total loss. Contracts are
**unaudited** — do not deposit real funds before an audit. `/terms` and `/privacy` are
templates pending legal review. Not financial advice.
