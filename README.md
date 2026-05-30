# Brier Protocol 

> *The Quantitative Intelligence Layer for Prediction Markets.*

Brier Protocol is an institutional-grade, zero-trust capital deployment engine for predictive artificial intelligence. We bridge the gap between world-class machine learning models and decentralized liquidity.

By strictly indexing on-chain resolution data, Brier mathematically enforces performance metrics (Brier Scores, Win Rates, Max Drawdowns) to ensure the quantitative landscape is fully transparent, meritocratic, and instantly investable.

The Bloomberg Terminal for the prediction economy.

---

## 🏛 The Architecture

Brier is engineered on a modern, high-performance web stack designed for real-time data indexing, cryptographic security, and a premium user experience.

### Technical Foundation
*   **Application Layer:** Next.js 16 (App Router)
*   **Language:** TypeScript (Strict Mode)
*   **Database:** PostgreSQL via Prisma ORM (High-throughput relational state)
*   **Web3 Integration:** Wagmi, Viem, and Ethers.js for cryptographic transaction verification.
*   **Design System:** Custom "Dark Luxury" brutalism. Fonts: *Syne* (Display), *Inter* (Body) & *DM Mono* (Monospace for data).

### Core Primitives

#### 1. The Global Index (`/discover`)
The central nervous system of Brier. Algorithms are ranked by pure mathematical proficiency, not popularity.
*   **The Brier Score:** The global standard for predictive accuracy. The leaderboard strictly sorts by this metric.
*   **Proof of Work:** All scores are cryptographically derived from verified on-chain transactions. Zero simulated data.

#### 2. The Identity Layer (`/maker/[address]`)
A fully-featured social network for Quant Architects.
*   **Maker Profiles:** Wallet-bound identities where builders publish their trading theses and display their deployed fleet of predictive algorithms.
*   **Social Consensus:** Investors can follow and signal support for architectures before deploying capital.

#### 3. The Execution Vaults (`/vault/[botId]`)
The smart-contract integration layer.
*   Algorithms that achieve a Brier Score below `0.25` are automatically granted an ERC4626 Vault.
*   Investors deposit USDC directly into the algorithm's trading pool.
*   Capital is programmatically locked; the algorithm creator never has custody of investor funds.

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

### Initialization

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Database Provisioning:**
   Brier uses Prisma with a local SQLite database (`dev.db`) for rapid iteration.
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Boot Development Server:**
   ```bash
   npm run dev
   ```
   Access the terminal at [http://localhost:3000](http://localhost:3000).

---

## 🚀 On-Chain E2E Trade-Mirroring Simulation

We have built a fully automated E2E system simulator that compiles Brier smart contracts, seeds the database, executes whale deposits, triggers Polymarket CTF transactions, and uses the off-chain **Shadow Daemon** to index, mirror, and log the results back to the database.

Run the complete verification loop:
```bash
npx hardhat run src/indexer/simulate_shadow_run.js
```

---

## ⚡ Production Deployment (Mainnet)

To take Brier Protocol to Mainnet, follow this institutional deployment pipeline.

### 1. PostgreSQL Migration
Migrate from local SQLite to a production-grade PostgreSQL cluster (e.g. Supabase, Vercel Postgres).

1. Open `prisma/schema.prisma` and modify the datasource block:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Define the connection string in your `.env` file:
   ```env
   DATABASE_URL="postgresql://username:password@hostname:5432/brier_db?sslmode=require"
   ```
3. Push the schema to the live cluster:
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

### 3. Background Daemon Operations (24/7 Execution)
The off-chain copying engine (`shadow_daemon.js`) requires a persistent container to monitor live trades and trigger market settlements continuously.
1. Deploy the indexer code to a highly-available VPS or container runner (e.g., AWS EC2, Railway).
2. Start the daemon as a background service:
   ```bash
   node src/indexer/shadow_daemon.js
   ```
3. Ensure the daemon container has environment access to the production database (`DATABASE_URL`), the indexer's funded private key (`DAEMON_PRIVATE_KEY`), and network RPCs.

---

## 🚨 Pre-Mainnet Deployment Checklist

Before launching Brier Protocol with real capital, the following sequence is mandatory to ensure absolute security and institutional credibility:

1. **Polygon Mumbai Testnet:** Deploy all contracts and indexer on the Mumbai testnet. Provide the bot builders with testnet USDC to execute trades, and verify the `mirror()` function scales correctly.
2. **48-Hour Live Simulation:** Run the `shadow_daemon.js` uninterrupted for 48 hours without manual intervention. Verify zero crashes and perfect database/on-chain sync.
3. **Smart Contract Audit:** Submit `BrierVault.sol` and `BrierFactory.sol` to **Code4rena**, Sherlock, or hire a dedicated smart contract auditor. Never deploy real capital without an external security stamp.
4. **Gnosis Safe Ownership:** Ensure the Factory and all deployed Vaults belong to a 2/3 Gnosis Safe Multisig. No single EOA (Externally Owned Account) should possess the ability to call `pause()` or `setDaemon()`.
5. **Vault TVL Caps:** Launch with a hard cap of **$10,000 USDC** per vault for the first 30 days to mitigate risk during the early discovery phase.

---
*Brier — Truth is the only edge.*
