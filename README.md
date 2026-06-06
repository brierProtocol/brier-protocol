<div align="center">

# 🌿 Brier Protocol

**A decentralized asset-management layer for prediction markets.**
Algorithmic traders prove their edge in public; investors allocate capital to the ones that win.

[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)](contracts/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](src/)
[![ERC-4626](https://img.shields.io/badge/Vault-ERC--4626-2563EB)](contracts/BrierVault.sol)
[![Network](https://img.shields.io/badge/Network-Polygon-8247E5?logo=polygon)](#10-deployment)
[![License](https://img.shields.io/badge/License-MIT-green)](#14-license)

</div>

---

## Table of Contents

1. [The Thesis](#1-the-thesis)
2. [How It Works](#2-how-it-works)
3. [System Architecture](#3-system-architecture)
4. [The Money Flow](#4-the-money-flow)
5. [Smart Contracts](#5-smart-contracts)
6. [Tech Stack](#6-tech-stack)
7. [Repository Layout](#7-repository-layout)
8. [Local Development](#8-local-development)
9. [Environment Variables](#9-environment-variables)
10. [Deployment](#10-deployment)
11. [Security Model](#11-security-model)
12. [Business Model](#12-business-model)
13. [Roadmap](#13-roadmap)
14. [License](#14-license)

---

## 1. The Thesis

Prediction markets (Polymarket, Kalshi) are the purest expression of "being right about
the future" — but two groups can't meet:

- **Quants / builders** have predictive models but no capital and no track record the world can trust.
- **Investors (LPs)** have capital but no edge and no way to tell a lucky gambler from a real forecaster.

Brier Protocol is the **trust layer** between them. A builder's algorithm is forced to prove
itself *in public* during a no-real-money incubation phase, scored by the
[**Brier score**](https://en.wikipedia.org/wiki/Brier_score) — the academic standard for
forecast accuracy. Only after it mathematically demonstrates an edge can it open an
on-chain **ERC-4626 vault** and accept investor capital. Every trade, fee, and withdrawal
is indexed and visible in real time.

> The name is literal: the protocol lives or dies by the Brier score.

---

## 2. How It Works

```
┌─────────────┐   ┌──────────────┐   ┌────────────────┐   ┌──────────────┐   ┌────────────┐
│ 1. CONNECT  │──▶│ 2. LIST BOT  │──▶│ 3. SHADOW /    │──▶│ 4. OPEN      │──▶│ 5. TRADE   │
│   WALLET    │   │   (PAPER)    │   │   INCUBATION   │   │   VAULT      │   │  & SETTLE  │
│ = identity  │   │  no capital  │   │  Brier < 0.20  │   │  ERC-4626    │   │ 60/30/10   │
└─────────────┘   └──────────────┘   │  ≥50 trades    │   │  LPs deposit │   │  split     │
                                      │  ≥7 days       │   │  USDC        │   └────────────┘
                                      └────────────────┘   └──────────────┘
```

| Stage | What happens | Where in the code |
|-------|--------------|-------------------|
| **Connect** | Wallet address *is* your identity; a `User` row is created/updated. | `src/app/api/users` |
| **List bot** | A `Bot` is registered in `PAPER` status, linked to the builder's wallet. | `src/app/api/bots/register` |
| **Shadow** | The bot trades on paper. The engine measures Brier score, win rate, drawdown over time. | `src/lib/score-engine.ts`, `src/lib/incubation.ts` |
| **Graduate** | When it passes (`≥50` resolved trades, Brier `< 0.20`, `≤25%` drawdown, `≥7` days) it becomes `VAULT_ELIGIBLE`. | `src/lib/incubation.ts` |
| **Open vault** | An ERC-4626 vault is cloned (EIP-1167 minimal proxy). | `contracts/BrierVaultFactory.sol` |
| **Invest** | LPs deposit USDC; each deposit is verified against the on-chain `Transfer` event. | `src/app/api/deposits` |
| **Trade** | The off-chain executor receives HMAC-signed signals and calls `executeTrade` on the vault. | `brier-executor/` |
| **Settle** | When a market resolves, profit is split **60% LP · 30% builder · 10% protocol**. | `BrierVault.settleMarket` |

---

## 3. System Architecture

Brier Protocol is **three cooperating systems**, not a monolith:

```
                ┌──────────────────────────────────────────────┐
                │  FRONTEND + API  (Next.js 16, Vercel)         │
                │  • Pages: discover, bot, vault, leaderboard…  │
                │  • Route handlers: bots, deposits, social…    │
                │  • Postgres (Supabase) via Prisma             │
                └───────────────┬──────────────────────────────┘
                                │ HMAC-signed signals
                                ▼
                ┌──────────────────────────────────────────────┐
                │  EXECUTOR  (Fastify + BullMQ + Redis, Docker) │
                │  • /api/v1/signals  → queue → on-chain trade  │
                │  • Resolution watcher  → settleMarket         │
                │  • Risk engine  → stop-loss / circuit breaker │
                └───────────────┬──────────────────────────────┘
                                │ ethers.js
                                ▼
                ┌──────────────────────────────────────────────┐
                │  ON-CHAIN  (Polygon)                          │
                │  • BrierVaultFactory  (EIP-1167 clones)       │
                │  • BrierVault         (ERC-4626 per bot)      │
                │  • Polymarket CTF / CLOB                       │
                └──────────────────────────────────────────────┘
```

---

## 4. The Money Flow

This answers the most common question: *"Where is my money and when do I get it back?"*

A vault holds capital in three buckets:

```
totalAssets()  =  idleCapital  +  activeLockedCapital  +  skinInGame
                  └─ withdrawable   └─ in open trades      └─ builder's stake
                     instantly         (locked until           (slashable)
                                         the market resolves)
```

- **Deposit** → USDC enters `idleCapital`, LP receives ERC-4626 shares.
- **Trade opens** → capital moves `idle → activeLocked`. That slice is *not* withdrawable
  until the market resolves.
- **Market resolves (`settleMarket`)**:
  - If **profit**: `payout − cost` is split. The 30% builder fee and 10% protocol fee are
    transferred out **instantly and automatically** to their wallets — there is no separate
    "claim" button; settlement *is* the claim. The remaining 60% + principal returns to
    `idleCapital`, raising every LP's share value.
  - If **loss**: whatever came back returns to `idleCapital`.
- **Withdraw (LP)** → any `idleCapital` can be redeemed **instantly** (no 48h lock). Capital
  sitting in active trades must wait for those trades to resolve.
- **Circuit breaker** → if drawdown > 15%, the builder's `skinInGame` is slashed into
  `idleCapital` to cushion LPs, and the vault pauses.

> **UI implication (planned):** the bot page should show the vault as a single balance with a
> live PnL overlay — green `+$4,000 (+8.2%)` when in profit, red when down — plus a small
> breakdown of idle vs. locked so an LP knows exactly how much they can pull *right now*.

---

## 5. Smart Contracts

| Contract | Purpose |
|----------|---------|
| **`BrierVault.sol`** | ERC-4626 vault (upgradeable). Holds USDC, executes/settles trades, distributes fees, enforces the 20%-per-trade limit, circuit breaker, and instant idle-capital withdrawals. |
| **`BrierVaultFactory.sol`** | Deploys one vault per approved bot using **EIP-1167 minimal proxy clones** (cheap deploys). |

Built on **OpenZeppelin v5.0.2** (`ERC4626Upgradeable`, `Ownable`, `Pausable`,
`ReentrancyGuard`, `Initializable`). Compiled with Solidity `0.8.24` / `cancun`.

```bash
npm run compile:contracts   # hardhat compile
npm run test:contracts      # hardhat test
```

---

## 6. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, Framer Motion, Recharts |
| Web3 (client) | wagmi, viem, RainbowKit |
| API | Next.js Route Handlers |
| Database | PostgreSQL (Supabase) + Prisma ORM v5 |
| Executor | Fastify, BullMQ, Redis, ethers v6 |
| Contracts | Solidity 0.8.24, OpenZeppelin 5, Hardhat + Ignition |
| Infra | Vercel (web), Docker / Railway (executor) |

---

## 7. Repository Layout

```
brier-protocol/
├── contracts/              # Solidity: BrierVault, BrierVaultFactory, mocks
├── brier-executor/         # Off-chain trade engine (Fastify + BullMQ workers)
│   └── src/                # server.ts, worker.ts, watcher.ts
├── prisma/
│   ├── schema.prisma       # Data model (Bot, VaultDeposit, User, Follow, Heart…)
│   └── seed.ts
├── scripts/                # Deploy scripts (Amoy, Polygon, local)
├── src/
│   ├── app/
│   │   ├── api/            # Route handlers (bots, deposits, search, social, cron…)
│   │   ├── bot/[slug]/     # Public bot page
│   │   ├── vault/[botId]/  # Vault detail
│   │   ├── dashboard/      # Investor dashboard
│   │   ├── discover/       # Bot discovery + filters
│   │   ├── leaderboard/    # Brier-score ranking
│   │   ├── list-bot/       # Builder onboarding
│   │   └── maker/[address]/# Builder profile
│   ├── components/         # BotCard, MiniChart, Navbar, WalletConnect…
│   └── lib/                # prisma, wagmi, score-engine, incubation, indexer…
├── hardhat.config.js
└── ROADMAP.md
```

---

## 8. Local Development

**Prerequisites:** Node.js 20 LTS (Hardhat does not officially support Node 25),
a PostgreSQL database (or a free Supabase project), and optionally Redis for the executor.

```bash
# 1. Install dependencies (legacy-peer-deps is set in .npmrc)
npm install

# 2. Configure environment
cp .env.example .env.local   # then fill in the values (see below)

# 3. Sync the database schema
npx prisma db push

# 4. (optional) Seed demo data
npm run db:seed

# 5. Run the web app
npm run dev                  # http://localhost:3000
```

To run the trade executor (separate service):

```bash
cd brier-executor
npm install
npm run dev                  # Fastify on :3001 (needs Redis)
```

---

## 9. Environment Variables

| Variable | Used by | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Prisma | Pooled Postgres connection string |
| `DIRECT_URL` | Prisma | Direct Postgres connection (migrations) |
| `NEXT_PUBLIC_DEPOSIT_RPC_URL` | Deposits API | RPC for the chain vaults live on (Polygon Amoy by default) |
| `NEXT_PUBLIC_USDC_ADDRESS` | Deposits API | USDC contract address — **set this** to reject fake-token deposits |
| `CRON_SECRET` | Cron jobs | Bearer token protecting `/api/cron/*` |
| `BUILDER_SECRET_KEY` | Executor | HMAC secret for signed trade signals |
| `EXECUTOR_PRIVATE_KEY` | Executor | Wallet key that signs on-chain vault calls |
| `REDIS_HOST` / `REDIS_PORT` | Executor | Redis connection for BullMQ |

---

## 10. Deployment

- **Web + API** → Vercel (`vercel.json` included). CI runs `npm install` (note `.npmrc`) then `next build`.
- **Executor** → Docker / Railway (`brier-executor/Dockerfile`, `railway.toml`).
- **Contracts** → `npx hardhat run scripts/deploy-amoy.ts --network polygonAmoy` (testnet)
  or `scripts/deploy-polygon.ts` (mainnet).

> **Network note:** development targets **Polygon Amoy** (testnet); production targets
> **Polygon mainnet**, where Polymarket actually lives. The protocol does **not** use Arbitrum.

---

## 11. Security Model

- **Deposit anti-replay** — every deposit stores a unique `txHash`; duplicates are rejected.
- **Token spoofing** — deposits are only credited if the `Transfer` originates from the
  configured USDC contract.
- **Sender verification** — the declared depositor must match the on-chain sender.
- **Signed signals** — the executor validates HMAC + timestamp (5-min replay window) + IP allowlist + rate limit.
- **Reentrancy** — all value-moving vault functions are `nonReentrant` and follow checks-effects-interactions.
- **Circuit breaker** — builder stake is slashed and the vault pauses on excessive drawdown.

See [`ROADMAP.md`](ROADMAP.md) for known technical debt
(e.g. `skinInGame` accounting must be reviewed before mainnet).

---

## 12. Business Model

Revenue is the **10% protocol fee** taken on profit at settlement — the protocol only earns
when builders and LPs earn, which aligns every incentive.

```
Profit on a trade  ──▶  60% Liquidity Providers
                        30% Builder (the algorithm's creator)
                        10% Protocol  ◀── this is the business
```

Secondary value: the **Brier-score leaderboard** becomes a credibly-neutral reputation
ledger for forecasters — a moat that compounds as more verified track records accumulate.

---

## 13. Roadmap

See [`ROADMAP.md`](ROADMAP.md) for the full plan. Highlights:

- **Now:** core logic fixes (search, social, deposit security, incubation rules).
- **Next:** withdraw/claim endpoints, investor explainer UX, live PnL overlay.
- **Then:** real Polymarket CLOB integration (5m/15m crypto up-down), real resolution oracle.
- **Later:** real-time (WebSocket) dashboards, daily score snapshots.

---

## 14. License

MIT © Brier Protocol contributors.
