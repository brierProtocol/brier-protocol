import Fastify from 'fastify';
import { Queue } from 'bullmq';
import { createRequire } from 'module';
import crypto from 'node:crypto';
import { candidateSecrets, verifyAgainst } from './keys.js';
const require = createRequire(import.meta.url);
const Redis = require('ioredis');

const fastify = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

const redis = new Redis(redisConfig);
const signalQueue = new Queue('trade-signals', { connection: redisConfig });
const settlementQueue = new Queue('trade-settlements', { connection: redisConfig });

// Mock configuration (In production, these would be fetched dynamically from a DB or contract)
const VAULT_TOTAL_POOL = 1_000_000; // 1M USDC
const MAX_CAPACITY = 200_000; // Max allowed total lock

// Slippage por defecto si el bot no especifica uno (200 bps = 2%).
const DEFAULT_MAX_SLIPPAGE_BPS = 200;
const MAX_ALLOWED_SLIPPAGE_BPS = 1000; // techo duro: nunca aceptar peor de 10%

const ALLOWED_IPS: string[] | null = process.env.EXECUTOR_ALLOWED_IPS
  ? process.env.EXECUTOR_ALLOWED_IPS.split(',').map(s => s.trim()).filter(Boolean)
  : null;

/**
 * Authenticates a signed request using the bot's OWN key(s). Reads the timestamp
 * and signature headers, enforces the 5-min replay window, resolves the bot's
 * active secrets, and verifies the HMAC against any of them. Fails closed: a bot
 * with no valid key is rejected (no global default to fall back on). On failure
 * it sends the reply and returns false; the caller returns immediately.
 */
async function authenticate(request: any, reply: any): Promise<boolean> {
  const timestamp = request.headers['x-timestamp'] as string | undefined;
  const signature = request.headers['x-signature'] as string | undefined;

  if (!timestamp || !signature) {
    reply.code(400).send({ error: 'Missing x-timestamp or x-signature headers' });
    return false;
  }

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > 300_000) {
    reply.code(401).send({ error: 'Request expired or invalid timestamp' });
    return false;
  }

  const botId = request.body?.botId as string | undefined;
  if (!botId) {
    reply.code(400).send({ error: 'Missing botId' });
    return false;
  }

  const secrets = await candidateSecrets(botId);
  if (secrets.length === 0) {
    fastify.log.warn({ botId }, 'No active API key for bot — rejecting');
    reply.code(401).send({ error: 'No active API key for this bot. Generate one in the dashboard.' });
    return false;
  }

  const rawBody = JSON.stringify(request.body);
  if (!verifyAgainst(secrets, timestamp, rawBody, signature)) {
    fastify.log.warn({ botId }, 'HMAC verification failed');
    reply.code(401).send({ error: 'Invalid signature' });
    return false;
  }

  return true;
}

async function checkRateLimit(key: string): Promise<boolean> {
  const bucket = `rl:${key}:${Math.floor(Date.now() / 60_000)}`;
  const count = await redis.incr(bucket);
  if (count === 1) await redis.expire(bucket, 60);
  return count <= 30;
}

// IP allowlist — corre antes de cualquier handler
fastify.addHook('onRequest', async (req, reply) => {
  if (!ALLOWED_IPS) return;

  const forwarded = req.headers['x-forwarded-for'] as string | undefined;
  const clientIp = (forwarded?.split(',')[0] ?? req.ip).trim();

  if (!ALLOWED_IPS.includes(clientIp)) {
    fastify.log.warn({ clientIp }, 'Blocked request from unlisted IP');
    return reply.code(403).send({ error: 'Forbidden' });
  }
});

fastify.get('/health', async () => ({
  status: 'ok',
  uptime: Math.floor(process.uptime()),
  timestamp: Date.now(),
  redis: await redis.ping().then(() => 'ok').catch(() => 'error'),
}));

interface SignalBody {
  tradeId: string;
  botId: string;
  vaultAddress: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;        // precio esperado por el bot (0..1 en mercados de Polymarket)
  size: number;
  confidence: number;
  marketId: string;
  outcomeIndex: number;
  maxSlippageBps?: number;   // tolerancia de slippage en basis points (100 = 1%)
}

fastify.post<{ Body: SignalBody }>('/api/v1/signals', async (request, reply) => {
  // Per-bot HMAC auth + replay window (fails closed if the bot has no active key).
  if (!(await authenticate(request, reply))) return;

  const signature = request.headers['x-signature'] as string;

  // Rate limiting (usa los primeros 16 chars de la firma como fingerprint del caller)
  const rlKey = signature.slice(0, 16);
  if (!(await checkRateLimit(rlKey))) {
    return reply.code(429).send({ error: 'Rate limit exceeded (30 req/min)' });
  }

  const { tradeId, botId, vaultAddress, direction, entryPrice, size, confidence, marketId, outcomeIndex } = request.body;

  if (size > VAULT_TOTAL_POOL * 0.20) {
    return reply.status(400).send({ error: 'Risk Validation Failed: Size exceeds 20% of total pool' });
  }

  // --- Protección de slippage ---
  // Calculamos el "peor precio" aceptable. El executor enviará una orden FAK con
  // este límite: si el libro no llena dentro de la tolerancia, se llena parcial o
  // se cancela, NUNCA peor. (Polymarket: el campo price en market orders actúa
  // como worst-price limit.)
  const slippageBps = Math.min(
    Math.max(request.body.maxSlippageBps ?? DEFAULT_MAX_SLIPPAGE_BPS, 0),
    MAX_ALLOWED_SLIPPAGE_BPS
  );
  const slip = slippageBps / 10_000;
  // LONG/BUY: peor precio = más caro; SHORT/SELL: peor precio = más barato.
  const worstPrice =
    direction === 'LONG'
      ? Math.min(entryPrice * (1 + slip), 0.999)
      : Math.max(entryPrice * (1 - slip), 0.001);

  const botStateKey = `bot:${botId}:state`;
  const tradeKey = `trade:${tradeId}`;

  // WATCH / MULTI / EXEC pattern for concurrency
  await redis.watch(botStateKey);

  const currentLockedRaw = await redis.hget(botStateKey, 'activeLockedCapital');
  const currentLocked = currentLockedRaw ? parseFloat(currentLockedRaw) : 0;

  if (currentLocked + size > MAX_CAPACITY) {
    await redis.unwatch();
    return reply.status(400).send({ error: 'Risk Validation Failed: Size exceeds vault max capacity' });
  }

  const multi = redis.multi();

  // Increment locked capital
  multi.hset(botStateKey, 'activeLockedCapital', currentLocked + size);
  
  // Store trade state
  multi.hset(tradeKey, {
    tradeId,
    botId,
    vaultAddress,
    direction,
    entryPrice,
    worstPrice,
    slippageBps,
    size,
    confidence,
    status: 'pending',
    lockedCapital: size,
    timestamp: Date.now()
  });

  const execResult = await multi.exec();

  if (!execResult) {
    return reply.status(409).send({ error: 'Concurrency Error: State modified during evaluation. Please retry.' });
  }

  // Push to BullMQ for Executor Daemon
  await signalQueue.add('execute-trade', {
    tradeId,
    botId,
    vaultAddress,
    marketId,
    outcomeIndex,
    size,
    worstPrice,
    slippageBps
  });

  return reply.status(202).send({ message: 'Signal accepted and queued for execution', tradeId });
});

// =========================================================
// Settlement Endpoint
// =========================================================

interface SettleBody {
  tradeId: string;
  botId: string;
  vaultAddress: string;
  ctfAddress: string;
  conditionId: string;
  collateralToken: string;
  indexSets: number[];
  payout: number;
}

fastify.post<{ Body: SettleBody }>('/api/v1/settle', async (request, reply) => {
  // Per-bot HMAC auth + replay window (fails closed if the bot has no active key).
  if (!(await authenticate(request, reply))) return;

  const { tradeId, botId, vaultAddress, ctfAddress, conditionId, collateralToken, indexSets, payout } = request.body;

  // Verify trade exists and is active
  const tradeStatus = await redis.hget(`trade:${tradeId}`, 'status');
  if (tradeStatus !== 'active') {
    return reply.status(400).send({ error: `Trade ${tradeId} is not active (status: ${tradeStatus || 'not found'})` });
  }

  await settlementQueue.add('settle-trade', {
    tradeId,
    botId,
    vaultAddress,
    ctfAddress,
    conditionId,
    collateralToken,
    indexSets,
    payout
  });

  return reply.status(202).send({ message: 'Settlement queued', tradeId });
});

import { ResolutionWatcher } from './watcher.js';

const watcher = new ResolutionWatcher();

const start = async () => {
  try {
    await fastify.listen({ port: 3001 });
    console.log('Executor Fastify server running on port 3001');
    
    // Start background Oracle polling service
    watcher.start();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
