# Brier Protocol — CONTEXT

> Documento de contexto para devs y asistentes de IA. Resume qué es el proyecto,
> el stack, cómo correrlo, la convención de ramas y las trampas conocidas.

## Qué es el proyecto

Brier Protocol es una plataforma Web3 de **vaults no custodiales para bots
algorítmicos de prediction markets** (Polymarket). Un quant sin capital despliega
un bot, demuestra su rendimiento on-chain vía **Brier Score** durante una *shadow
phase*, y si alcanza Tier-1 se le crea un **vault ERC-4626** que inversores fondean
con USDC. El operador puede operar el capital pero nunca retirarlo; las ganancias
se reparten **60% depositantes / 30% builder / 10% protocolo**.

## Stack técnico

- **App:** Next.js 16 (App Router, Turbopack), TypeScript (strict), Tailwind v4,
  Framer Motion. ⚠️ Es un Next.js con breaking changes — ver `AGENTS.md`: leer
  `node_modules/next/dist/docs/` antes de escribir código.
- **Web3:** RainbowKit + wagmi v3 + viem (auth wallet-native, MetaMask).
- **Datos:** Prisma + PostgreSQL (Supabase en prod). Cliente singleton en
  `src/lib/db/prisma.ts`.
- **Contratos:** Solidity + Hardhat. `BrierVault` (ERC-4626 upgradeable) +
  `BrierVaultFactory` (clones EIP-1167). Deploy a Polygon Amoy (test) / mainnet.
- **Executor (`brier-executor/`):** servicio Node/TS (Fastify + BullMQ/Redis).
  Recibe señales firmadas con HMAC → CLOB de Polymarket; watcher de resolución.

### Estructura de `src/`

```
src/
  app/            páginas y layouts (App Router) + app/api (route handlers)
  components/
    ui/           presentacionales genéricos (charts, skeletons, modal)
    bot/          específicos de bots (avatar, tarjetas, panel de token, PostBody)
    layout/       Navbar, etc.
  hooks/          hooks reutilizables (useCountUp, useBots)
  lib/
    abis/         ABIs de contratos centralizados
    db/           cliente Prisma + helpers de datos
    ...           score-engine, bondingCurve, incubation, vault-factory, etc.
  types/          interfaces TS globales (index.ts) + ethereum.d.ts
  constants/      direcciones/decimales de red desde env (contracts.ts)
  data/           datos demo/seed para la UI
```

## Cómo correrlo localmente

```bash
npm install                          # respeta .npmrc (legacy-peer-deps)
# Postgres: definir DATABASE_URL y DIRECT_URL en .env.local
npm run db:push && npm run db:seed   # esquema + 3 bots demo
npm run dev                          # http://localhost:3000

# Verificación
npx tsc --noEmit                     # typecheck (strict, 0 errores)
npm run test:scoring                 # motor de Brier Score
npm run test:contracts               # suite Hardhat
npm run build                        # build de producción
```

## Convención de ramas

```
main          producción — solo se toca con PR aprobado
dev           integración — acá mergean todos (el repo usa "dev", no "develop")
feat/xxx      features nuevas
fix/xxx       bug fixes
refactor/xxx  limpieza sin cambio de funcionalidad
chore/xxx     mantenimiento (gitignore, deps, etc.)
docs/xxx      solo documentación
```

**Regla:** nunca pushear directo a `main`. Todo entra por **PR hacia `dev`** con
al menos **1 review**.

## Trampas conocidas

- **Rate limit en `middleware.ts`:** el `Map()` en memoria NO funciona en
  serverless (cada lambda tiene el suyo). Está estructurado + con TODO para
  Upstash Redis (`UPSTASH_REDIS_REST_URL` / `_TOKEN`).
- **Sin FK Bot→User:** `Bot.walletAddress` no tiene relación Prisma con `User`;
  el perfil del maker se resuelve con un **join manual por wallet** en cada route
  (ver `api/bots/route.ts`, `api/bots/[slug]/route.ts`).
- **`.npmrc legacy-peer-deps`:** por el conflicto rainbowkit ↔ wagmi v3. No
  actualizar esas deps sin resolver el peer conflict primero.
- **README dice Arbitrum, pero Polymarket vive en Polygon.** Ignorar esa parte
  del README. Red: Amoy (dev) / Polygon mainnet (prod).
- **OpenZeppelin fijado en `5.0.2` exacto** (la 5.6 eliminó
  `ReentrancyGuardUpgradeable`). No correr `npm update` sin revisar esto.
- **USDC tiene 6 decimales, NO 18.** Crítico en todo cálculo de monto. Ver
  `src/constants/contracts.ts` (`USDC_DECIMALS`).
- **`next_dev.log`** ya está en `.gitignore` (además de `*.log`).
- **Bug latente `sharpeRatio`:** `discover/page.tsx` y `leaderboard/page.tsx` leen
  `score.sharpeRatio`, que NO existe en el modelo (`BotScore.sharpe`). Hoy cae al
  fallback (queda 0/undefined). Tipado como alias opcional para no cambiar
  comportamiento — **arreglar intencionalmente** cambiándolo a `sharpe`.
- **Código muerto (componentes sin usar):** `BotCard`, `BotCardSkeleton`,
  `FloatingBubbles`, `LeaderboardRowSkeleton`, `MiniChart`, `StatCard`,
  `WalletConnect`. Quedaron reorganizados pero sin importadores. Candidatos a
  borrar (ojo: `WalletConnect` además fuerza un switch a Arbitrum — obsoleto).
- **Mocks pendientes (no es código real todavía):** indexer de Polymarket
  (`lib/polymarket-indexer.ts`), oráculo de resolución (`brier-executor/.../watcher.ts`,
  hoy resuelve al azar) y el price feed del Risk Engine en `worker.ts` (hardcoded
  0.50). Marcados con TODO en el código.

## Estado

Contratos **sin auditar** — no depositar fondos reales antes de una auditoría.
Runbooks de despliegue: `GO_LIVE.md`, `DEPLOY_AMOY.md`.
