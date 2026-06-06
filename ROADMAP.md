# 🛣️ Brier Protocol — Roadmap

Estado a fecha de la rama `fix/funcionalidad-base`.

## ✅ Hecho en esta ronda (bugs concretos)

- **Búsqueda** reescrita con Prisma (`contains` + `insensitive`). Antes el SQL crudo
  `FROM Bot` sin comillas reventaba en Postgres y `LIKE` no encontraba por mayúsculas.
- **Likes (hearts)**: nuevo `GET /api/hearts?botId=&userId=` → contador + si ya diste like.
- **Followers/following**: nuevo `GET /api/follows?address=&viewerId=` → listas, contadores, isFollowing.
- **Depósitos**: anti-replay real (campo `txHash @unique` + dedupe + manejo de carrera P2002),
  validación de que el token sea USDC (`NEXT_PUBLIC_USDC_ADDRESS`), monto sin pérdida de
  precisión (`formatUnits`), RPC configurable (Amoy por defecto).
- **Incubación**: drawdown real (`maxDrawdown`) + regla de mínimo 7 días en shadow.
- **Build/deps**: OZ fijado a `5.0.2` exacto (la 5.6.1 eliminó `ReentrancyGuardUpgradeable`),
  `dotenv` declarado, `.npmrc` con `legacy-peer-deps` para el choque rainbowkit↔wagmi.

## 🔜 Fase 1 — Retiros y "claim" (1–2 días)

- `POST /api/withdraw`: registra la salida de un LP (verifica el evento on-chain del vault,
  marca `VaultDeposit.active=false`, `exitedAt`, `exitReason`, decrementa TVL).
- Vista de ganancias del creador: ya cobra el 30% automáticamente en cada `settleMarket`;
  falta agregarlo y mostrarlo en su perfil (sumar `FeesDistributed` / trades resueltos).
- UI inversor: modal de depósito con "cuadritos" explicativos (retiro instantáneo del idle
  capital, pero el capital en trades activos espera a que el mercado resuelva).

## 🔜 Fase 2 — Trading real Polymarket (1–2 semanas)

- Integrar el **CLOB de Polymarket** (hoy `worker.ts` tiene los `TODO` de PERP).
  Mercados objetivo: cripto up/down 5m y 15m.
- **Oráculo real** de resolución en `brier-executor/src/watcher.ts` (hoy resuelve al azar):
  consultar la Gamma/CLOB API para `closed` + lado ganador y disparar `settleMarket`.
- **Indexer real** en `src/lib/polymarket-indexer.ts` (hoy es mock): parsear `TransferSingle`
  del CTF, mapear market/outcome y poblar `TradeEvent`.

## 🔜 Fase 3 — Tiempo real + pulido (3–5 días)

- WebSocket/polling para números en vivo en perfil y vault (TVL, PnL, % generado).
- Recalcular `BotScore` (Brier/winRate/sharpe/maxDrawdown) en cada settle y snapshot diario.
- Notificaciones en vivo (depósito recibido, trade abierto/cerrado, circuit breaker).

## ⚠️ Deuda técnica a vigilar

- Alinear de verdad `@rainbow-me/rainbowkit` con `wagmi` v3 y quitar `.npmrc legacy-peer-deps`.
- `skinInGame` en el contrato se contabiliza en `totalAssets()` pero nunca se transfiere
  al vault en `initialize` → revisar antes de mainnet (distorsiona el precio de las shares).
- Definir red única: desarrollo en Polygon Amoy, producción en Polygon mainnet
  (Polymarket NO vive en Arbitrum, pese a lo que dice el README).
- Quitar `next_dev.log` (784 KB) del repo y añadirlo al `.gitignore`.
