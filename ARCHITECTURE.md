# Brier Protocol — Arquitectura

> "No estamos construyendo un protocolo de trading. Estamos construyendo la
> infraestructura que permite que una economía de agentes autónomos compita,
> construya reputación y acceda a capital mediante evidencia verificable."

**El producto es Confianza Verificable.** El moat no es el contrato ni el frontend
(eso se copia). El moat es el dataset de predicciones históricas, la reputación
on-chain y los efectos de red. Pensar como AWS: construir infraestructura, no apps.

**KPI principal:** número de agentes independientes generando predicciones
verificables dentro de Brier. Si esa cifra crece, capital/datos/reputación crecen
sobre una base sólida.

---

## Las 8 capas

```
Capa 1  Bot Engine          cualquier lenguaje → SDK Brier (TS / Python)
Capa 2  Prediction Event    cada predicción es un evento (no solo el score)
Capa 3  Indexer / Backend   recibe, valida, persiste, versiona
Capa 4  Database            Postgres/Supabase — append-only, nunca borrar
Capa 5  Metric Engine       Brier, Sharpe, Drawdown, Calibration, …
Capa 6  Oracle              publica solo lo relevante hacia blockchain
Capa 7  Smart Contracts     Vault ERC-4626, shares, deposits, circuit breakers
Capa 8  Frontend            visualiza — no calcula, no decide, no almacena
```

Regla de oro: **nunca mezclar responsabilidades entre capas.** El bot no conoce
blockchain. El contrato no hace ML. El frontend no calcula métricas.

---

## Flujo MVP (la hipótesis a demostrar)

```
Bot → Predicción → Resultado → Registro → Cálculo → Score → Blockchain → Frontend → Usuario
```

Un solo agente real (ADAN) recorriendo el ciclo completo en Polymarket ya valida
la tesis. No requiere capital real para demostrarlo.

---

## Mapa del sistema (hacia dónde vamos)

```
                    Builders
                       │
              Python SDK / TS SDK
                       │
                 Prediction API
                       │
  ───────────────  Event Bus  ───────────────
        │             │              │
     Indexer      Analytics       Oracle
        │             │              │
     Database    Metric Engine    Blockchain
        │                           │
        └─────────────┬─────────────┘
                      │
                  Frontend
                      │
               Capital Providers
```

---

## Estado real de cada pieza (junio 2026)

| Capa / pieza | Archivo | Estado |
|---|---|---|
| SDK TypeScript | `scripts/brier-sdk.ts` | REAL (HMAC, retry, SPOT+PERP) |
| SDK Python | `packages/brier-sdk-py/` | REAL (paridad de firma con Node verificada) |
| Prediction API (ingest) | `brier-executor/src/server.ts` | REAL (`POST /api/v1/signals`, HMAC) |
| Indexer | `src/lib/polymarket-indexer.ts` | REAL (data-api de Polymarket) |
| Oracle de resolución | `brier-executor/src/watcher.ts` | REAL (CLOB markets endpoint) |
| Metric Engine | `src/lib/score-engine.ts` | REAL (Brier/winRate/Sharpe/DD) |
| Scoring loop | `src/app/api/cron/score` | REAL (horario, promueve tiers) |
| Event Bus | `src/lib/events/bus.ts` + `ProtocolEvent` | REAL (append-only) |
| API pública de reputación | `src/app/api/v1/*` | REAL (top/score/history/markets/events) |
| Circuit breaker | `src/app/api/cron/circuit-breaker` | REAL (auto-pause del vault) |
| Vault | `contracts/BrierVault.sol` | REAL pero SIN AUDITAR |
| Risk Engine price feed | `brier-executor/src/worker.ts` | **MOCK** (hardcoded 0.50) |

---

## Event Bus (la columna vertebral)

Todo lo relevante emite un evento append-only a `ProtocolEvent`. Los productores
emiten; nunca saben quién escucha. Consumidores futuros (alertas, analytics,
dashboards, oracle, auditorías) leen los mismos eventos sin tocar a los productores.

Catálogo en `src/lib/events/bus.ts`:
`AgentRegistered`, `PredictionCreated`, `PredictionResolved`, `TradeOpened`,
`TradeClosed`, `ScoreUpdated`, `VaultOpened`, `VaultPaused`, `VaultResumed`,
`CapitalDeposited`, `CapitalWithdrawn`.

Regla: la emisión es best-effort (nunca rompe la acción de negocio) y el log
**nunca se borra** — la historia es el activo.

---

## API pública de reputación (`/api/v1`)

La superficie sobre la que terceros construyen. Read-only, CORS-abierta, versionada,
datos reales (un campo es `null` cuando la evidencia aún no existe).

```
GET /api/v1/agents/top              ranking por Brier (lower=better)
GET /api/v1/agents/{id}/score       snapshot de reputación de un agente
GET /api/v1/agents/{id}/history     la evidencia cruda detrás del score
GET /api/v1/markets                 mercados que la economía de agentes predice
GET /api/v1/events                  el feed append-only del Event Bus
```

`{id}` resuelve por bot id, slug o wallet.

---

## Gate de promoción a Tier-1 (vault)

Un bot LIVE abre vault solo si supera TODOS los umbrales (`src/lib/incubation.ts`):

- **≥ 100 predicciones resueltas**
- **Brier ≤ 0.20**
- **Drawdown ≤ 25%**
- **≥ 21 días en shadow**

Reparto de ganancias (hardcoded en el contrato): **60% depositantes / 30% builder /
10% protocolo.** El builder nunca puede retirar el capital de los depositantes.

---

## Roadmap técnico

| Fase | Objetivo |
|---|---|
| T0 | Todo genera eventos *(Event Bus en marcha)* |
| T1 | Todo queda persistido *(append-only, sin borrar)* |
| T2 | Todo puede reproducirse *(replay desde eventos)* |
| T3 | Todo puede auditarse *(historial verificable)* |
| T4 | Todo escala horizontalmente *(10 → 100k agentes)* |

Antes de fondos reales: auditoría externa del contrato, admin EOA → Gnosis Safe
multisig, timelock en upgrades, rate-limit distribuido (Upstash), y price feed real
para que el stop-loss de PERPS funcione.

---

## Cómo decidir features

Antes de implementar, preguntar: ¿aumenta evidencia? ¿reduce incertidumbre? ¿mejora
onboarding? ¿mejora seguridad? ¿mejora datos? ¿mejora efectos de red? Si la respuesta
es NO a todas, probablemente no es prioridad.
