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
*   **Styling:** Custom "Institutional Brutalism" using a mix of inline React styling, global CSS, and CSS Modules. Fonts: *Inter* (San-serif for readability) & *DM Mono* (Monospace for data).

### Core Systems

#### 1. The Directory & Leaderboard (`/discover`, `/leaderboard`)
The central nervous system of Brier. Algorithms are ranked not by popularity, but by pure mathematical proficiency.
*   **Brier Score Algorithm:** The lower the score, the better the prediction accuracy. The leaderboard strictly sorts by this metric.
*   **Proof of Work:** All scores are derived from verified on-chain transactions.

#### 2. The Social & Identity Layer (`/maker/[address]`)
A fully-featured social network for Quant Architects.
*   **Maker Profiles:** Wallet-bound identities where builders can upload Base64-encoded profile pictures, write trading theses (bios), and display their entire deployed fleet of algorithms.
*   **Engagement Mechanics:** Investors can "Follow" builders and "Heart" specific algorithms to track them.
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
│   │   ├── layout.tsx       # Global Layout & Font Injection (Inter + DM Mono)
│   │   └── template.tsx     # Frame for True Page Transitions
│   ├── components/          # Reusable UI (Navbar, BotCharacters, WalletConnect)
│   ├── indexer/             # Blockchain Syncing Daemon (shadow_daemon.ts)
│   └── lib/                 # Utilities (Wagmi Providers, etc.)
└── package.json
```

---

## 🎨 Design Philosophy: "Institutional Brutalism"

The UI/UX is explicitly designed to bridge the gap between a high-end financial terminal (e.g., Bloomberg, Stripe) and hacker culture (imageboards, terminals).

*   **Color Palette:** Deep Void backgrounds (`#050505`), high-contrast Neon Accents (Green `#22c55e` for live/positive, Blue `#2563EB` for neutral/info, Gold `#C9A84C` for premium/rankings).
*   **Typography:** 
    *   *Inter:* Used for all human-readable text (names, bios, descriptions) to prevent eye strain and ensure a premium feel.
    *   *DM Mono:* Strictly reserved for numerical data, wallet addresses, and code blocks to maintain the "raw terminal" aesthetic.
*   **Micro-interactions:** "Max Expensive" page transitions (blur-fade-ins via `template.tsx`), smooth hover states, and zero-latency Base64 image processing.

---

## 🚀 Roadmap / Next Steps

1. **Smart Contract Integration:** Link the `/vault` deposit/withdraw UI to the deployed `BrierVault.sol` contracts for real USDC routing.
2. **PostgreSQL Migration:** Migrate from SQLite to Postgres for robust production deployment.
3. **Daemon Activation:** Activate `shadow_daemon.ts` on a secure server to begin 24/7 indexing of Kalshi/Polymarket on-chain trade resolutions.
4. **Activity Feeds:** Implement the global and per-profile activity feeds to show real-time algorithm submissions and vault deposits.

---
*Brier Protocol — Truth is the only edge.*
