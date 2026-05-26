# Brier — The Intelligence Layer for Prediction Markets

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
