# Brier — Go-Live Runbook

Status: **mostly real, one critical mock remaining.** Frontend, scoring, indexer,
resolution (oracle), CLOB execution, vault auto-creation and NAV reads are real and
unit-tested (scoring 11/11, contracts 21/21 — note: tests are a floor, NOT an audit).

**Not yet production-safe:**
- **Risk Engine price feed** (`brier-executor/src/worker.ts`) is still hardcoded to
  `0.50`. The PERPS stop-loss cannot be trusted until a live CLOB price WebSocket is
  wired. Do NOT run PERPS with real funds until then.
- Contracts are **unaudited** and the vault admin is an **EOA** (should be a Gnosis
  Safe multisig before real capital).

Everything else below is **operational** (requires your keys/funds/accounts) or
optional hardening.

---

## PHASE 0 — Showcase live (static + social), ~10 min
Goal: a public URL where people browse bots, profiles, leaderboard, how-it-works.

1. **Supabase**: create a project → copy the pooler (`:6543`) and direct (`:5432`) URIs.
2. **Vercel**: import `Lord14sol/brier-protocol`, set production branch.
3. Set env vars (see PHASE 4 table). At minimum: `DATABASE_URL`, `DIRECT_URL`,
   `ENCRYPTION_SECRET`, `CRON_SECRET`.
4. Run once locally against Supabase: `npm run db:push && npm run db:seed`.
5. Deploy. → Static + social layer works.

## PHASE 1 — Vault mechanics on testnet (Amoy), ~15 min
Goal: real deposit → shares → withdraw against a real contract (no real money).

1. New throwaway MetaMask account → copy private key.
2. Fund it at https://faucet.polygon.technology (network **Amoy**).
3. `.env`: `PRIVATE_KEY=0x...`
4. `npm run deploy:amoy` → copy `BrierVaultFactory` address.
5. `.env.local`: `NEXT_PUBLIC_VAULT_FACTORY_ADDRESS`, `VAULT_FACTORY_ADDRESS`,
   `DEPLOYER_PRIVATE_KEY`, `NEXT_PUBLIC_USDC_ADDRESS` (a test USDC on Amoy).
6. Promote a bot to Tier-1 → it auto-deploys a clone vault; test deposit/redeem.

## PHASE 2 — Live trading (Polygon mainnet)
Goal: the executor places real Polymarket orders. **Real money — do PHASE 3 first.**

1. `cd brier-executor && npm install` (pulls @polymarket/clob-client).
2. Fund the executor wallet with USDC + a little POL on Polygon.
3. `.env`: `EXECUTOR_PRIVATE_KEY`, `POLYMARKET_CLOB_URL=https://clob.polymarket.com`,
   `REDIS_HOST/PORT`.
4. Deploy contracts to mainnet (`scripts/deploy-polygon.ts`) with an audited build.
5. Start: `npm run start:server` + `npm run start:worker`; run the watcher.

## PHASE 3 — Before touching real funds (non-negotiable)
- [ ] **Smart-contract audit** (the 21 tests are a floor, not an audit).
- [ ] Move factory/vault admin to a **Gnosis Safe multisig** (not an EOA).
- [ ] Real `NEXT_PUBLIC_WC_PROJECT_ID` (cloud.walletconnect.com) for mobile wallets.
- [ ] Legal review of `/terms` and `/privacy` (currently templates).
- [ ] Error monitoring (Sentry) + API rate limiting.

## PHASE 4 — Environment variables (Vercel + .env)
| Var | Where | Needed for |
|---|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Vercel | data layer |
| `ENCRYPTION_SECRET` (32-byte hex) | Vercel | API-key encryption |
| `CRON_SECRET` | Vercel | protect /api/cron/* |
| `BUILDER_SECRET_KEY` | Vercel/executor | HMAC trade signals |
| `NEXT_PUBLIC_WC_PROJECT_ID` | Vercel | WalletConnect (mobile) |
| `ALCHEMY_API_KEY` | Vercel | RPC |
| `PRIVATE_KEY` / `DEPLOYER_PRIVATE_KEY` | local `.env` | contract deploy |
| `VAULT_FACTORY_ADDRESS` / `NEXT_PUBLIC_VAULT_FACTORY_ADDRESS` | both | vault creation |
| `EXECUTOR_PRIVATE_KEY` | executor | CLOB orders + settlement |
| `NEXT_PUBLIC_USDC_ADDRESS` | both | reject fake-token deposits |

## What is NOT done (and why)
- **Real-time PnL WebSocket** — chosen as polling; a WS feed is infra, not core logic.
- **Live Polymarket execution validation** — impossible without a funded mainnet
  wallet + API creds; the code uses the real `@polymarket/clob-client` API.
- **Audit / legal** — external services, not code.

That's the complete picture. The protocol is built; the rest is launch operations.
