# BRIER PROTOCOL

**Non-custodial vaults for algorithmic prediction-market bots.**
Build a bot with zero capital, prove its edge on-chain via Brier Score, and let
investors fund it. Builders earn from skill, not from their wallet.

> Ranked by math, not marketing. Traded on Polymarket. Settled on Polygon.

---

## The idea

A skilled quant with **no money** can:
1. Deploy a prediction bot (free)
2. Prove it works through a 7-day **shadow phase** — real stats, real **Brier Score**
3. Get a vault that **investors fund** with USDC
4. Earn **30% of the profit** without ever risking their own capital — and run *farms of bots*

Investors get **non-custodial** exposure to verified algorithms: deposit USDC,
receive ERC-4626 shares, redeem anytime 1:1 at NAV. The operator can trade the
capital but can **never withdraw it** — same trust model as Hyperliquid vaults.

---

## Architecture

```
Builder ──deploy bot──► Brier (PAPER)
                          │ shadow phase (7d)
   Polymarket trades ─────┤ indexer → TradeEvent → scoring (Brier/Sharpe/DD)
                          ▼
                   Tier-1 reached → BrierVaultFactory deploys a clone vault
                          │
Investor ──deposit USDC──►│ ERC-4626 vault  ◄── executor trades Polymarket CLOB
                          │                      (FAK orders, slippage-bounded)
   market resolves ───────┤ watcher (CLOB) → settleMarket → 60/30/10 split
                          ▼
Investor ──redeem shares──► principal + profit (1:1 @ NAV, instant)
```

### Stack
| Layer | Tech |
|---|---|
| **App** | Next.js 16 (App Router, Turbopack), TypeScript, Tailwind v4, Framer Motion |
| **Data** | Prisma + PostgreSQL (Supabase in prod); shadow indexer mirrors on-chain events |
| **Chain** | `BrierVault` (ERC-4626, upgradeable) + `BrierVaultFactory` (EIP-1167 clones) on Polygon |
| **Executor** | Node/TS service: HMAC-signed signals → BullMQ/Redis → Polymarket CLOB; resolution watcher |

---

## Features (built & tested)

- **Wallet-native** auth (RainbowKit + wagmi + viem); MetaMask works out of the box
- **Bot creation** with a permanent **eye signature** — 24 colors × 12 shapes (procedural canvas avatar)
- **Real Brier scoring** from resolved trades — Brier, win rate, Sharpe, max drawdown, ROI, age, sample-size confidence
- **Automatic tier promotion** (LIVE → Tier-1) → auto-deploys the bot's vault
- **Social layer** — profiles, @handles, comments, hearts, follows, global search
- **Live NAV** read on-chain when a vault exists
- **Vault mechanics** — deposit / shares / redeem, skin-in-the-game buffer, 15% circuit breaker, 60/30/10 profit split
- **Slippage protection** — Fill-And-Kill orders bounded by a worst-price limit
- **UX** — terminal aesthetic, mobile menu, page/popup transitions, How-It-Works modal, strategy & docs pages, 404 / error / loading, SEO + favicon

---

## Pages

`/` landing · `/discover` · `/leaderboard` · `/dashboard` · `/list-bot` ·
`/bot/[slug]` · `/maker/[address]` · `/vault` · `/how-it-works` · `/strategy` ·
`/developers` · `/about` · `/faq` · `/terms` · `/privacy`

---

## Quick start (local)

```bash
# 1. Install
npm install

# 2. Database (Postgres) — set DATABASE_URL & DIRECT_URL in .env.local
npm run db:push
npm run db:seed        # 3 demo bots

# 3. Run
npm run dev            # http://localhost:3000
```

### Tests
```bash
npm run test:scoring    # Brier scoring engine — 11/11 PASS
npm run test:contracts  # Hardhat suite — 21/21 PASS (split, capacity, circuit breaker, admin)
```

### Smart contracts
```bash
npm run deploy:hardhat  # local dry-run (impl + factory)
npm run deploy:amoy     # Polygon Amoy testnet (needs a funded PRIVATE_KEY)
```

---

## Economics

On profit only — **no management fee, nothing on losses**:

| Recipient | Share |
|---|---|
| Builder | **30%** |
| Protocol | **10%** |
| Depositors (NAV growth) | **60%** |

The builder's skin-in-the-game is slashed first on drawdown; a 15% drawdown trips
the circuit breaker (slash + pause).

---

## Environment variables

See `.env.example`. Core: `DATABASE_URL`, `DIRECT_URL`, `ENCRYPTION_SECRET`,
`CRON_SECRET`, `NEXT_PUBLIC_WC_PROJECT_ID`, `NEXT_PUBLIC_USDC_ADDRESS`,
`VAULT_FACTORY_ADDRESS`, `EXECUTOR_PRIVATE_KEY`.

---

## Status

**Code-complete and tested.** The platform — social, scoring, indexer, resolution,
CLOB execution, vault auto-creation, NAV reads — is built; scoring 11/11 and
contracts 21/21 pass. To go live:

- **Showcase (free):** Supabase + Vercel — `GO_LIVE.md` Phase 0
- **Vault mechanics (free):** Polygon Amoy — `DEPLOY_AMOY.md`
- **Real money:** mainnet deploy + **audit** before external deposits

Runbooks: [`GO_LIVE.md`](./GO_LIVE.md) · [`DEPLOY_AMOY.md`](./DEPLOY_AMOY.md)

---

## Disclaimer

Prediction markets and algorithmic strategies carry risk of total loss. Contracts
are **unaudited** — do not deposit real funds before an audit. `/terms` and
`/privacy` are templates pending legal review. Not financial advice.
