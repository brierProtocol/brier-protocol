-- CreateTable
CREATE TABLE "Bot" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tagline" TEXT,
    "color" TEXT NOT NULL DEFAULT '#0A0A0A',
    "mood" TEXT NOT NULL DEFAULT 'neutral',
    "status" TEXT NOT NULL DEFAULT 'PAPER',
    "tier" TEXT NOT NULL DEFAULT 'NONE',
    "pfpUrl" TEXT,
    "avatarId" TEXT NOT NULL DEFAULT 'void-eye',
    "eyeShape" TEXT NOT NULL DEFAULT 'round',
    "marketType" TEXT NOT NULL DEFAULT 'SPOT',
    "resolution" TEXT NOT NULL DEFAULT 'EPOCH',
    "mandate" TEXT NOT NULL DEFAULT 'DIRECTIONAL',
    "maxLeverage" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verifiedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastIndexedAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3),
    "walletAddress" TEXT NOT NULL,
    "ownerWallet" TEXT,
    "vaultAddress" TEXT,
    "skinInGame" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vaultCap" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentTVL" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalShares" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vaultOpen" BOOLEAN NOT NULL DEFAULT false,
    "vaultClosedAt" TIMESTAMP(3),
    "vaultCloseReason" TEXT,
    "strategyType" TEXT NOT NULL DEFAULT 'hybrid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "rateLimitCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Bot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotMarket" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WHITELISTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotMarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeEvent" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "marketTitle" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "actionType" TEXT NOT NULL DEFAULT 'OPEN',
    "leverage" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "stopLossPrice" DOUBLE PRECISION,
    "takeProfitPrice" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION NOT NULL,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "resolvedPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outcome" TEXT NOT NULL DEFAULT 'PENDING',
    "brierContrib" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "executionWallet" TEXT NOT NULL,
    "fraudFlag" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'POLYMARKET',
    "externalTradeId" TEXT,
    "conditionId" TEXT,
    "vaultBookedAt" TIMESTAMP(3),

    CONSTRAINT "TradeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotScore" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "brierScore" DOUBLE PRECISION NOT NULL,
    "winRate" DOUBLE PRECISION NOT NULL,
    "sharpe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "totalVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDrawdown" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "relativeSkill" DOUBLE PRECISION,
    "lcb" DOUBLE PRECISION,
    "reputationScore" DOUBLE PRECISION,
    "resolvedPredictions" INTEGER NOT NULL DEFAULT 0,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BotScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultDeposit" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "txHash" TEXT,
    "depositorWallet" TEXT NOT NULL,
    "amountUsdc" DOUBLE PRECISION NOT NULL,
    "shares" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kind" TEXT NOT NULL DEFAULT 'DEPOSIT',
    "mode" TEXT NOT NULL DEFAULT 'CONSERVATIVE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "totalProfitEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitedAt" TIMESTAMP(3),
    "exitReason" TEXT,

    CONSTRAINT "VaultDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultPosition" (
    "id" TEXT NOT NULL,
    "userWallet" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "shares" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costBasisUsdc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "realizedPnlUsdc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mode" TEXT NOT NULL DEFAULT 'CONSERVATIVE',
    "firstDepositAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Distribution" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "grossProfitUsdc" DOUBLE PRECISION NOT NULL,
    "depositorCut" DOUBLE PRECISION NOT NULL,
    "builderCut" DOUBLE PRECISION NOT NULL,
    "protocolCut" DOUBLE PRECISION NOT NULL,
    "sourceTradeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Distribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncubationLog" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "brierAtTransition" DOUBLE PRECISION,
    "winRateAtTransition" DOUBLE PRECISION,
    "tradesAtTransition" INTEGER,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggeredBy" TEXT NOT NULL DEFAULT 'AUTOMATIC',

    CONSTRAINT "IncubationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronLog" (
    "id" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolyConnection" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "lastBlockSynced" BIGINT NOT NULL DEFAULT 0,
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "PolyConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KalshiConnection" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "keyIv" TEXT NOT NULL,
    "keyAuthTag" TEXT NOT NULL,
    "kalshiUserId" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'idle',

    CONSTRAINT "KalshiConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PnlSnapshot" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "pnlUsd" DOUBLE PRECISION NOT NULL,
    "cumulativePnl" DOUBLE PRECISION NOT NULL,
    "tradesCount" INTEGER NOT NULL,

    CONSTRAINT "PnlSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "walletAddress" TEXT NOT NULL,
    "handle" TEXT,
    "name" TEXT,
    "bio" TEXT,
    "pfpUrl" TEXT,
    "xHandle" TEXT,
    "xVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("walletAddress")
);

-- CreateTable
CREATE TABLE "UserEquitySnapshot" (
    "id" TEXT NOT NULL,
    "userWallet" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "balanceUsdc" DOUBLE PRECISION NOT NULL,
    "investedUsdc" DOUBLE PRECISION NOT NULL,
    "pnlUsdc" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "UserEquitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Heart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Heart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Waitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "builderId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "marketTitle" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL DEFAULT '',
    "side" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "marketProbabilityAtCommit" DOUBLE PRECISION NOT NULL,
    "liquidity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolution" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProtocolEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "botId" TEXT,
    "vaultAddress" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProtocolEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotToken" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supply" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reserve" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "basePrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0001,
    "slope" DOUBLE PRECISION NOT NULL DEFAULT 0.000000005,
    "graduationMcap" DOUBLE PRECISION NOT NULL DEFAULT 50000,
    "status" TEXT NOT NULL DEFAULT 'BONDING',
    "holdersCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenTrade" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "usdc" DOUBLE PRECISION NOT NULL,
    "shares" DOUBLE PRECISION NOT NULL,
    "priceAfter" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenTrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenHolding" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "shares" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenHolding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bot_slug_key" ON "Bot"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Bot_apiKey_key" ON "Bot"("apiKey");

-- CreateIndex
CREATE INDEX "Bot_walletAddress_idx" ON "Bot"("walletAddress");

-- CreateIndex
CREATE INDEX "Bot_ownerWallet_idx" ON "Bot"("ownerWallet");

-- CreateIndex
CREATE INDEX "Bot_status_idx" ON "Bot"("status");

-- CreateIndex
CREATE INDEX "Bot_tier_idx" ON "Bot"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "BotMarket_botId_marketId_key" ON "BotMarket"("botId", "marketId");

-- CreateIndex
CREATE INDEX "TradeEvent_botId_outcome_idx" ON "TradeEvent"("botId", "outcome");

-- CreateIndex
CREATE INDEX "TradeEvent_botId_timestamp_idx" ON "TradeEvent"("botId", "timestamp");

-- CreateIndex
CREATE INDEX "TradeEvent_executionWallet_idx" ON "TradeEvent"("executionWallet");

-- CreateIndex
CREATE INDEX "TradeEvent_botId_resolvedAt_idx" ON "TradeEvent"("botId", "resolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TradeEvent_source_externalTradeId_key" ON "TradeEvent"("source", "externalTradeId");

-- CreateIndex
CREATE UNIQUE INDEX "BotScore_botId_snapshotDate_key" ON "BotScore"("botId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "VaultDeposit_txHash_key" ON "VaultDeposit"("txHash");

-- CreateIndex
CREATE INDEX "VaultDeposit_depositorWallet_idx" ON "VaultDeposit"("depositorWallet");

-- CreateIndex
CREATE INDEX "VaultDeposit_botId_idx" ON "VaultDeposit"("botId");

-- CreateIndex
CREATE INDEX "VaultPosition_botId_idx" ON "VaultPosition"("botId");

-- CreateIndex
CREATE UNIQUE INDEX "VaultPosition_userWallet_botId_key" ON "VaultPosition"("userWallet", "botId");

-- CreateIndex
CREATE INDEX "Distribution_botId_createdAt_idx" ON "Distribution"("botId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PolyConnection_botId_key" ON "PolyConnection"("botId");

-- CreateIndex
CREATE UNIQUE INDEX "KalshiConnection_botId_key" ON "KalshiConnection"("botId");

-- CreateIndex
CREATE UNIQUE INDEX "PnlSnapshot_botId_date_key" ON "PnlSnapshot"("botId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE INDEX "UserEquitySnapshot_userWallet_date_idx" ON "UserEquitySnapshot"("userWallet", "date");

-- CreateIndex
CREATE UNIQUE INDEX "UserEquitySnapshot_userWallet_date_key" ON "UserEquitySnapshot"("userWallet", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE UNIQUE INDEX "Heart_userId_botId_key" ON "Heart"("userId", "botId");

-- CreateIndex
CREATE INDEX "Notification_walletAddress_read_idx" ON "Notification"("walletAddress", "read");

-- CreateIndex
CREATE UNIQUE INDEX "Waitlist_email_key" ON "Waitlist"("email");

-- CreateIndex
CREATE INDEX "Prediction_botId_status_idx" ON "Prediction"("botId", "status");

-- CreateIndex
CREATE INDEX "Prediction_marketId_idx" ON "Prediction"("marketId");

-- CreateIndex
CREATE INDEX "ProtocolEvent_type_createdAt_idx" ON "ProtocolEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "ProtocolEvent_botId_createdAt_idx" ON "ProtocolEvent"("botId", "createdAt");

-- CreateIndex
CREATE INDEX "ProtocolEvent_vaultAddress_createdAt_idx" ON "ProtocolEvent"("vaultAddress", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BotToken_botId_key" ON "BotToken"("botId");

-- CreateIndex
CREATE INDEX "BotToken_status_idx" ON "BotToken"("status");

-- CreateIndex
CREATE INDEX "TokenTrade_tokenId_createdAt_idx" ON "TokenTrade"("tokenId", "createdAt");

-- CreateIndex
CREATE INDEX "TokenTrade_wallet_idx" ON "TokenTrade"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "TokenHolding_tokenId_wallet_key" ON "TokenHolding"("tokenId", "wallet");

-- AddForeignKey
ALTER TABLE "Bot" ADD CONSTRAINT "Bot_ownerWallet_fkey" FOREIGN KEY ("ownerWallet") REFERENCES "User"("walletAddress") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotMarket" ADD CONSTRAINT "BotMarket_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeEvent" ADD CONSTRAINT "TradeEvent_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotScore" ADD CONSTRAINT "BotScore_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultDeposit" ADD CONSTRAINT "VaultDeposit_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultPosition" ADD CONSTRAINT "VaultPosition_userWallet_fkey" FOREIGN KEY ("userWallet") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultPosition" ADD CONSTRAINT "VaultPosition_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Distribution" ADD CONSTRAINT "Distribution_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncubationLog" ADD CONSTRAINT "IncubationLog_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolyConnection" ADD CONSTRAINT "PolyConnection_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KalshiConnection" ADD CONSTRAINT "KalshiConnection_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PnlSnapshot" ADD CONSTRAINT "PnlSnapshot_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_wallet_fkey" FOREIGN KEY ("wallet") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEquitySnapshot" ADD CONSTRAINT "UserEquitySnapshot_userWallet_fkey" FOREIGN KEY ("userWallet") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Heart" ADD CONSTRAINT "Heart_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotToken" ADD CONSTRAINT "BotToken_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenTrade" ADD CONSTRAINT "TokenTrade_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "BotToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenHolding" ADD CONSTRAINT "TokenHolding_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "BotToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

