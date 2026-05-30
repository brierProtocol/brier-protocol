# Brier Protocol 

> *The Quantitative Intelligence Layer for Prediction Markets.*

Brier Protocol is an institutional-grade, zero-trust capital deployment engine for predictive artificial intelligence. We bridge the gap between world-class machine learning models and decentralized liquidity.

By strictly indexing on-chain resolution data, Brier mathematically enforces performance metrics (Brier Scores, Win Rates, Max Drawdowns) to ensure the quantitative landscape is fully transparent, meritocratic, and instantly investable.

The Bloomberg Terminal for the prediction economy.

---

## 🏛 The Architecture

Brier is engineered on a modern, high-performance web stack designed for real-time data indexing, cryptographic security, and a premium user experience.

### Technical Foundation
*   **Application Layer:** Next.js 15 (App Router) with React 19
*   **Language:** TypeScript (Strict Mode)
*   **Database:** PostgreSQL via Prisma ORM (High-throughput relational state)
*   **Web3 Integration:** Wagmi, Viem, and Ethers.js for cryptographic transaction verification.
*   **Animation & UI:** Framer Motion and custom HTML5 Canvas for real-time telemetry rendering.
*   **Design System:** Custom "Dark Luxury" brutalism. Fonts: *Syne* (Display), *Inter* (Body) & *DM Mono* (Monospace for data).

### Execution Environment (HFT Engine)
*   **Machine Learning Brain:** Python (XGBoost) modeling with Markovian Gate architectures.
*   **Node.js Executor:** BullMQ and Fastify for deterministic event-loop management and trade orchestration.
*   **Native SDK (`brier-sdk.ts`):** Cryptographically signed payload transmission via HMAC-SHA256 with built-in exponential backoff.

### Core Primitives

#### 1. The Global Index (`/discover`)
The central nervous system of Brier. Algorithms are ranked by pure mathematical proficiency, not popularity.
*   **The Brier Score:** The global standard for predictive accuracy. The leaderboard strictly sorts by this metric.
*   **Proof of Work:** All scores are cryptographically derived from verified on-chain transactions. Zero simulated data.

#### 2. The Identity Layer (`/maker/[address]`)
A fully-featured social network for Quant Architects.
*   **Maker Profiles:** Wallet-bound identities where builders publish their trading theses and display their deployed fleet of predictive algorithms.
*   **Social Consensus:** Investors can follow and signal support for architectures before deploying capital.

#### 3. The Execution Vaults (`/bot/[slug]`)
The smart-contract integration layer featuring a Dual-Mode Interface:
*   **[ DEPLOYER ] Mode (The Maker Terminal):** A secure console exclusively for the bot creator. Features real-time latency heatmaps, RPC ping diagnostics, and a Nuclear Kill Switch for emergency pauses.
*   **[ INVESTOR ] Mode:** A clean, optimized interface allowing users to deploy capital into ERC-4626 Vaults mapped to specific bots. Capital is locked programmatically; the creator never custodies funds.
*   **Mood Engine:** An algorithmic system that dynamically shifts a bot's avatar and UI color palette based on its real-time quantitative health (drawdown, win rate, momentum).

---

## 🛡 Security Architecture: The "Mirror" Engine

When managing millions of dollars in Total Value Locked (TVL), the protocol architecture assumes every bot builder is potentially malicious. **Builders never touch depositors' money.**

Brier protects capital using a proprietary **Off-Chain Mirror Mechanism**:
1. The AI builder executes a trade using their *own* money (e.g., $50) from their registered wallet on Polymarket.
2. Brier's off-chain Indexer (Shadow Daemon) detects the transaction on the Polygon RPC.
3. Instantly, the Brier Smart Contract automatically executes that *exact same trade*, scaled logarithmically using the Vault's capital (e.g., $100,000).

**Why this is unbreakable:**
*   **Zero Custody:** The builder has no access to the Vault contract and cannot withdraw depositors' funds.
*   **Skin in the Game:** The builder must trade with their own money. Malicious trades immediately burn the builder's own capital.
*   **Cryptographic Verification:** Our `POST /api/deposits` endpoint queries the Polygon RPC directly to cryptographically verify deposit transaction receipts before crediting the database. You cannot spoof TVL.

---

## 💻 Local Development

### Prerequisites
*   Node.js (v18+)
*   npm or pnpm
*   Redis (for BullMQ executor queues)

### Initialization

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Database Provisioning:**
   Ensure you have a local PostgreSQL instance running.
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Boot Development Server:**
   ```bash
   npm run dev
   ```
   Access the application at [http://localhost:3000](http://localhost:3000).

---

## ⚡ Production Deployment (Mainnet)

To take Brier Protocol to Mainnet, follow this institutional deployment pipeline.

### 1. PostgreSQL Migration
Migrate to a production-grade PostgreSQL cluster (e.g. Supabase, Vercel Postgres).
```env
DATABASE_URL="postgresql://username:password@hostname:5432/brier_db?sslmode=require"
```
```bash
npx prisma db push
```

### 2. Next.js Cloud Hosting (Vercel)
1. Link your repository to Vercel.
2. Inject the following environment variables:
   - `DATABASE_URL`: Your production PostgreSQL string.
   - `NEXT_PUBLIC_POLYGON_RPC_URL`: Dedicated RPC node (Alchemy, Infura).
   - `POLYMARKET_CTF_ADDRESS`: `0x4D97DCd97eC945f40CF65F87097ACe5EA0476045`.
3. Deploy. Vercel automatically compiles, optimizes, and serves the application over global CDNs.

### 3. Background Executor Operations (24/7 Node)
The execution engine (`brier-executor/src/worker.ts`) manages trade queuing and settlement via BullMQ.
1. Deploy the executor to a highly-available environment (e.g., AWS EC2, Railway).
2. Start the daemon as a background service:
   ```bash
   npm run start:executor
   ```
3. Ensure the container has access to the production database (`DATABASE_URL`), Redis (`REDIS_URL`), and the `EXECUTOR_PRIVATE_KEY`.

---

## 🚨 Pre-Mainnet Deployment Checklist

Before launching Brier Protocol with real capital, the following sequence is mandatory to ensure absolute security and institutional credibility:

1. **Polygon Mumbai Testnet:** Deploy all contracts and indexer on the Mumbai testnet. Provide the bot builders with testnet USDC to execute trades, and verify the `mirror()` function scales correctly.
2. **48-Hour Live Simulation:** Run the executor workers uninterrupted for 48 hours without manual intervention. Verify zero crashes and perfect database/on-chain sync.
3. **Smart Contract Audit:** Submit `BrierVault.sol` and `BrierFactory.sol` to **Code4rena**, Sherlock, or hire a dedicated smart contract auditor. Never deploy real capital without an external security stamp.
4. **Gnosis Safe Ownership:** Ensure the Factory and all deployed Vaults belong to a 2/3 Gnosis Safe Multisig. No single EOA (Externally Owned Account) should possess the ability to call `pause()` or `setDaemon()`.
5. **Vault TVL Caps:** Launch with a hard cap of **$10,000 USDC** per vault for the first 30 days to mitigate risk during the early discovery phase.

---
*Brier — Truth is the only edge.*
