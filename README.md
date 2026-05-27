# Brier

> *The Intelligence Layer for Prediction Markets.*

> "Deploy capital into verified quant bots. Every trade resolved by objective reality. The Bloomberg Terminal of Prediction Markets."

**Brier** is an institutional-grade social and capital deployment layer for prediction market algorithms. It serves as a public directory, verification oracle, and automated vault manager for quantitative trading bots operating on platforms like Polymarket and Kalshi. 

By strictly indexing on-chain resolution data, Brier mathematically enforces performance metrics (Brier Scores, Win Rates, TVL) to ensure that the prediction market landscape is fully transparent, meritocratic, and instantly investable.

---

## 🏛 Architecture Overview

Brier is built on a modern, high-performance web stack designed for real-time data indexing and premium user experience.

### Tech Stack
*   **Framework:** Next.js 16 (App Router)
*   **Language:** TypeScript
*   **Database:** SQLite via Prisma ORM (Designed for seamless migration to PostgreSQL in production)
*   **Web3 Integration:** Wagmi & Viem for raw browser provider detection and message signing.
*   **Styling:** Custom "Dark Luxury" design system using inline React styling, global CSS, and CSS Modules. Fonts: *Syne* (Display), *Inter* (Body) & *DM Mono* (Monospace for data).

### Core Systems

#### 1. The Directory & Leaderboard (`/discover`, `/leaderboard`)
The central nervous system of Brier. Algorithms are ranked not by popularity, but by pure mathematical proficiency.
*   **Brier Score Algorithm:** The lower the score, the better the prediction accuracy. The leaderboard strictly sorts by this metric.
*   **Proof of Work:** All scores are derived from verified on-chain transactions.
*   **Engagement:** Users can directly "Heart" algorithms, providing social consensus directly to quantitative models.

#### 2. The Social & Identity Layer (`/maker/[address]`)
A fully-featured social network for Quant Architects.
*   **Maker Profiles:** Wallet-bound identities where builders can upload Base64-encoded profile pictures, write trading theses (bios), and display their entire deployed fleet of algorithms.
*   **Engagement Mechanics:** Investors can "Follow" builders to track their latest algorithm deployments.
*   **API Routes:** `/api/users`, `/api/hearts`, `/api/follows` manage the relational data.

#### 3. Algorithm Submission (`/list-bot`)
The gateway for builders to register their bots.
*   **Cryptographic Verification:** Requires an active Web3 wallet connection. Builders must sign a unique message containing a timestamp to cryptographically link the algorithm to their on-chain identity.
*   **Paper Trading Phase:** All new bots enter a 30-day paper trading phase to establish a baseline Brier score before accepting external capital.

#### 4. The Vault System (`/vault/[botId]`)
The smart-contract integration layer (Frontend implemented, Contracts pending).
*   Once a bot achieves a Brier Score below `0.25`, its Vault automatically unlocks.
*   Users can deposit USDC directly into the bot's designated trading pool.
*   The protocol mathematically enforces that bots cannot alter historic resolution states.

---

## 🛡 Security Architecture (The "Mirror" Mechanism)

When managing millions of dollars, the protocol architecture assumes that every bot builder is potentially malicious. **Builders never touch the depositors' money.**

When an investor deposits USDC into a bot's Vault, the money is locked inside a Brier Smart Contract. Brier protects capital using a **"Mirror" mechanism**:
1. The bot builder trades with their *own* money (e.g., $50) from their registered wallet on Polymarket.
2. Brier's indexer detects that the builder bought "YES" on a specific market.
3. Instantly, the Brier Smart Contract automatically executes that *exact same trade*, but using the Vault's capital (e.g., $100,000).

**Why this is unbreakable:**
*   **No Withdrawals:** The builder has zero access to the Vault contract and cannot withdraw depositors' funds.
*   **Skin in the Game:** The builder must trade with their own money. If they make a malicious trade to sabotage the vault, they lose their own capital.
*   **Trustless:** We do not need to read the builder's source code. We only trust the immutable on-chain footprint of their trades.

---

## 🔌 How Builders Connect Their Bots

We provide two distinct ways for builders to connect their algorithms to Brier, depending on their technical expertise.

### Method 1: The "Zero-Code" REST API (Simplest)
For data scientists and AI builders who don't want to deal with crypto wallets, gas fees, or smart contracts.
1. Register on Brier to get an API Key.
2. Run your Python/Node script locally (e.g., an agent using Claude).
3. Send a simple HTTP POST request to Brier:
   ```json
   POST /api/v1/predict
   { "marketId": "0x123...", "outcome": "YES", "confidence": 0.85 }
   ```
4. Brier tracks these predictions, calculates your Brier Score, and handles the actual on-chain execution if the bot is approved for a Vault.

### Method 2: The On-Chain Indexer (Most Secure)
For native DeFi builders who want maximum privacy and control.
1. The builder registers their Ethereum execution wallet on Brier.
2. The builder runs their bot locally and executes trades directly on Polymarket using their own USDC.
3. **No Brier API needed.** Brier silently watches the Polygon blockchain. Every time the registered wallet trades on Polymarket, Brier logs it, updates the Brier Score, and triggers the Vault's "Mirror" trade.

---

## 💻 Local Development

### Prerequisites
*   Node.js (v18+)
*   npm or pnpm

### Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Database Initialization:**
   Brier uses Prisma with a local SQLite database (`dev.db`) for rapid iteration.
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the terminal.

4. **Production Build:**
   ```bash
   npm run build
   npm run start
   ```

---

## 📂 Project Structure

```text
brier-protocol/
├── prisma/
│   └── schema.prisma        # Database models (User, Bot, Heart, Follow, Comment)
├── src/
│   ├── app/                 # Next.js 16 App Router
│   │   ├── api/             # REST Endpoints (bots, users, comments, social actions)
│   │   ├── bot/[slug]/      # Individual Algorithm Performance Pages
│   │   ├── dashboard/       # Private Depositor Terminal (WIP)
│   │   ├── discover/        # Algorithm Catalog & Sorting
│   │   ├── leaderboard/     # Global Brier Score Rankings
│   │   ├── list-bot/        # Algorithm Submission & Wallet Signature
│   │   ├── maker/[address]/ # Quant Architect Profiles & Social Hub
│   │   ├── vault/[botId]/   # Capital Deployment Interface
│   │   ├── globals.css      # Core Design Tokens & Page Transition Keyframes
│   │   ├── layout.tsx       # Global Layout & Font Injection (Syne, Inter, DM Mono)
│   │   └── template.tsx     # Frame for True Page Transitions
│   ├── components/          # Reusable UI (Navbar, BotCharacters, WalletConnect)
│   ├── indexer/             # Blockchain Syncing Daemon (shadow_daemon.ts)
│   └── lib/                 # Utilities (Wagmi Providers, etc.)
└── package.json
```

---

## 🎨 Design Philosophy: "Dark Luxury"

The UI/UX is explicitly designed to act as an institutional-grade financial terminal with a premium, cutting-edge aesthetic.

*   **Color Palette:** Deep Void backgrounds (`#050505`), glassmorphism panels with `rgba(255,255,255,0.06)` borders, and high-contrast accents (Green `#4ade80` for positive, Blue `#2563EB` or `#60a5fa` for links, Gold `#C9A84C` for premium sections).
*   **Typography:** 
    *   *Syne:* Display font for striking headers and bot identifiers.
    *   *Inter:* Clean body font for dense information and readability.
    *   *DM Mono:* Strictly reserved for numerical data, wallet addresses, and code blocks to maintain the quantitative feel.
*   **Micro-interactions:** "Max Expensive" page transitions (blur-fade-ins via `template.tsx`), smooth hover states lifting cards with subtle glows, and zero-latency Base64 image processing.

---

## 🚀 On-Chain E2E Trade-Mirroring Simulation

We have built a fully automated E2E system simulator that compiles and deploys Brier smart contracts, seeds the database, executes deposits, triggers Polymarket CTF transactions, and uses the off-chain **Shadow Daemon** to index, mirror, and log the results back to the database!

To run the complete verification loop, execute:
```bash
npx hardhat run src/indexer/simulate_shadow_run.js
```

---

## ⚡ PostgreSQL & Production Deployment Guide

### 1. PostgreSQL Migration
To migrate Brier from the local development SQLite configuration to a production PostgreSQL database (e.g. Supabase, Vercel Postgres, AWS RDS):

1. Open `prisma/schema.prisma` and modify the `datasource db` block:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Define the database connection string in your `.env` file:
   ```env
   DATABASE_URL="postgresql://username:password@hostname:5432/brier_db?sslmode=require"
   ```
3. Push the schema to the live PostgreSQL instance:
   ```bash
   npx prisma db push
   ```

### 2. Next.js Frontend Cloud Hosting (Vercel)
1. Link your GitHub repository containing the Brier Protocol repository to Vercel.
2. Configure the following environment variables:
   - `DATABASE_URL`: Your production PostgreSQL connection string.
   - `NEXT_PUBLIC_POLYGON_RPC_URL`: The RPC node URL (e.g. Alchemy, Quicknode).
   - `POLYMARKET_CTF_ADDRESS`: `0x4D97DCd97eC945f40CF65F87097ACe5EA0476045` (standard conditional token framework).
3. Vercel will automatically compile, optimize, and serve the dApp over global CDNs.

### 3. Background Daemon Cloud Hosting (24/7 Execution)
For the off-chain copying engine (`shadow_daemon.js`) to mirror live trades continuously:
1. Deploy the indexer code to a persistent VPS or container runner (e.g., AWS EC2, Railway, Render).
2. Start the daemon as a background service (e.g., using `pm2` or Docker):
   ```bash
   node src/indexer/shadow_daemon.js
   ```
3. Ensure the daemon container has access to your production database (`DATABASE_URL`), the indexer private key (`DAEMON_PRIVATE_KEY`), and network RPCs.

---
*Brier — Truth is the only edge.*

