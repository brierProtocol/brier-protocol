# BRIER PROTOCOL — RESULTADOS DE AUDITORÍAS

> Corrida: 2026-06-30 / 2026-07-01. Rama auditada: `dev`.
> Cada auditoría reporta PASS / FAIL / WARNING. Plantillas en [`AUDITS.md`](./AUDITS.md).
> **Nota transversal:** el flujo de capital está desactivado en v1 (`FEATURES.CAPITAL_LAYER`)
> hasta auditar los contratos — varios hallazgos aplican para cuando se encienda (marcados 🟡 capital-layer).

---

## 🎯 PRIORIDADES (qué arreglar primero)

**Crítico (rompe estado / plata):**
1. **Circuit-breaker con lógica invertida + `brierScore` mal semantizado** (A2·FAIL-4) — guarda skill relativo con signo (más alto = mejor) pero el breaker asume más alto = peor → un bot que **mejora** se auto-cierra el vault. 🟡
2. **`/api/withdraw` sin anti-replay** (A1·F1) — reenviar el txHash decrementa TVL de nuevo → TVL corrupto. 🟡
3. **Depósito no atómico** (A1·F3 = A2·FAIL-3) — si crashea entre `create` y `$transaction`, el LP pagó USDC pero no recibe shares (reintento da 409). 🟡
4. **Reparto 60/30/10 nunca se escribe en DB** (A2·FAIL-1) — `recordDistribution()` sin llamadores → NAV/PnL nunca reflejan trading; `builderEarnings=0`. 🟡

**Alto (seguridad / consistencia):**
5. **Faltan security headers** (A4·FAIL-1) — sin X-Frame-Options / X-Content-Type-Options → clickjacking/MIME-sniff.
6. **`/api/users` filtra `error.message` al cliente** (A4·FAIL-3) — fuga de detalle interno.
7. **Env var de USDC inconsistente** (A1·F2 + A4·#6) — deposits usa `process.env.USDC_ADDRESS`, resto usa `NEXT_PUBLIC_`; y hay una dirección USDC.e hardcodeada distinta a la native USDC. Token-spoofing si mal seteado. 🟡
8. **Retiro (UX)**: sin confirmación, sin feedback, y **mismatch de unidades** (input "USDC" pero `redeem()` espera shares) (A3). 🟡
9. **Fees inconsistentes en toda la app**: `vault/[botId]` 20/3, `DepositorView` 30/10, protocolo 60/30/10 (A3).
10. **Leaderboard full scan** (A2·FAIL-5) — `/api/bots` ignora `status/limit/cursor`.

**Casing de wallets sin normalizar al escribir** (A2·WARN-1) — riesgo de posiciones duplicadas; conviene arreglarlo temprano porque es sistémico.

---

## AUDITORÍA 1 — SEGURIDAD & FLUJO DE DINERO

**Depósitos (`src/app/api/deposits/route.ts`)**
| Ítem | Estado |
|---|---|
| txHash regex (0x+64hex) | ✅ `:39` · Anti-replay (find + P2002) ✅ `:44`,`:157` · on-chain receipt+status ✅ `:60` |
| Transfer vs USDC | ⚠️ **F2** · vault=vaultAddress ✅ `:87` · sender=depositor ✅ `:109` · warn si no USDC ✅ `:95` |
| TVL+shares en `$transaction` | ⚠️ **F3** · `depositBlockReason()` antes ✅ `:118` |

**Retiros (`src/app/api/withdraw/route.ts`)**: on-chain ✅`:35` · Transfer vault→LP ✅`:55` · monto on-chain ✅`:59` · Math.min TVL/shares ✅`:96` · active=false en $transaction ✅`:88` · **anti-replay ❌ F1**.

**Circuit breaker** — ✅ todo PASS: CRON_SECRET `:17`, pausa con try/catch `:73`, errores por bot `:33`, incubationLog antes `:54`.

**Contratos (`BrierVault.sol`)**: withdraw/redeem nonReentrant ✅ · deposit/mint sin nonReentrant ⚠️ **F4** · breaker solo executor/owner ✅ · builder no retira skin ✅ (**F5**) · factory clona con storage propio ✅.

### Hallazgos
- **F1 [FAIL] withdraw sin anti-replay** — reenviar txHash re-decrementa `currentTVL` (`:96`) → TVL corrupto. *Fix:* txHash único en retiros.
- **F2 [WARN/FAIL] deposits usa `process.env.USDC_ADDRESS`** (`:12`), el resto `NEXT_PUBLIC_USDC_ADDRESS`. Si solo seteás la NEXT_PUBLIC, la validación anti-token-falso queda apagada. *Fix:* usar `USDC_ADDRESS_ENV`.
- **F3 [WARN] `vaultDeposit.create` fuera del `$transaction`** (`:142` vs `:164`). *Fix:* incluirlo en el transaction.
- **F4 [WARN] deposit()/mint() sin `nonReentrant`.**
- **F5 [WARN diseño] skinInGame sin recupero en cierre normal.**

---

## AUDITORÍA 2 — BASE DE DATOS & FLUJO DE DATOS

| # | Ítem | Estado |
|---|------|--------|
| 1-2 | Singleton Prisma / URLs separadas | PASS |
| 3 | Pooling (pgbouncer) | WARNING (no verificable en código → WARN-6) |
| 4 | Bot.walletAddress→User | WARNING (WARN-1) |
| 5,7 | VaultDeposit.botId / TradeEvent.botId | PASS |
| 6 | VaultPosition unique | WARNING (case-sensitivity, WARN-1) |
| 8,10,11 | dashboard active / bots[slug] scores / isLatest atómico | PASS |
| 9 | Leaderboard usa índices | **FAIL-5** |
| 12,14,16,17 | withdraw insensitive / retiro atómico / navPerShare / sharesMinted | PASS |
| 13 | Depósito atómico | **FAIL-3** |
| 15,19 | Profit split + scores en $transaction / totalProfitEarned | **FAIL-1, FAIL-2** |
| 18 | Brier Score en [0,1] | **FAIL-4** |
| 20,21,22 | TVL>0/shares0 · TVL negativo concurrente · elegible sin vault | WARNING (WARN-3/4/5) |

### Hallazgos FAIL
- **FAIL-1 · El reparto 60/30/10 no se escribe en DB.** `src/lib/distribution.ts:18,37` (`recordDistribution`/`builderEarnings`) **sin llamadores**. `resolve-and-score/route.ts:75-78` solo actualiza `TradeEvent`, nunca `Distribution`/`currentTVL`/`totalProfitEarned`. → NAV/PnL nunca reflejan trading; `builderEarnings=0`. *Fix:* bookear en `resolve-and-score` dentro de un `$transaction` (currentTVL += profitNeto, recordDistribution, prorratear depositorCut).
- **FAIL-2 · `totalProfitEarned` nunca se actualiza** (`deposits/route.ts:152` lo fija en 0, único escritor). Parte de FAIL-1.
- **FAIL-3 · Depósito no atómico** — `deposits/route.ts:142-161` crea `VaultDeposit` fuera del `$transaction` `:164-187`. Crash intermedio → depósito registrado (txHash consumido) sin shares; reintento 409. *Fix:* todo en un `$transaction`.
- **FAIL-4 · `brierScore` guarda skill relativo con signo (~[−1,+1], más alto=mejor).** `cron/score:69,77` y `resolve-and-score:119,123` guardan `rep.skill`. (a) viola invariante [0,1]; (b) **crítico:** el circuit-breaker (`circuit-breaker:48-49`) hace `delta = current − weekAgo` y pausa si `≥0.08` asumiendo *más alto=peor* → **un bot que mejora se auto-cierra el vault**; (c) `reputationScore` debería ser LCB 0..100 pero guarda ~0.03. *Fix:* separar `brierScore` (Brier absoluto), `relativeSkill`, `lcb`, `reputationScore=clamp(50+lcb*100,0,100)`; reorientar el breaker a caída de skill.
- **FAIL-5 · Leaderboard full scan** — `useBots.ts:9` manda `sort/status/limit/cursor` pero `bots/route.ts:4-40` solo lee `owner` → `findMany` sobre toda la tabla sin `take`, sin índices, paginación rota. *Fix:* aplicar where/take/cursor/orderBy indexado.

### Hallazgos WARNING
- **WARN-1 · Casing de wallet sin normalizar al escribir** (`deposits:134-136,173,180` guardan crudo). El unique `@@unique([userWallet,botId])` es case-sensitive en Postgres → mismo LP con checksum vs minúsculas crea **dos** VaultPosition; withdraw cierra una sola → shares huérfanas. *Fix:* `.toLowerCase()` antes de persistir (User, VaultDeposit, VaultPosition, Bot).
- **WARN-2 · withdraw `updateMany` (`:88`) filtra wallet exacta** mientras la posición se busca insensitive (`:74`) → deposits quedan `active:true` con posición vacía. *Fix:* mismo filtro insensitive.
- **WARN-3 · TVL negativo bajo retiros concurrentes** — el clamp `Math.min(x, bot.currentTVL)` (`:96`) usa lectura fuera del `$transaction`. *Fix:* clamp con lectura fresca dentro de la tx / `GREATEST(0,…)` en SQL.
- **WARN-4 · `currentTVL>0` con `totalShares===0`** (`portfolio.ts:9-11` navPerShare=1 ignora TVL). *Fix:* documentar/forzar invariante `totalShares===0 ⇒ currentTVL===0`.
- **WARN-5 · Bots VAULT_ELIGIBLE sin vaultAddress** — no hay invariante que lo garantice. *Fix:* validar en la transición de estado.
- **WARN-6 · Pooling no verificable en código** — confirmar en `.env`/Supabase que `DATABASE_URL` use `pgbouncer=true&connection_limit=1` y `DIRECT_URL` el `:5432`. (El singleton está OK: no cachea en `globalThis` en prod.)

---

## AUDITORÍA 3 — UX & FLUJO DE USUARIO

- **Builder (`list-bot/page.tsx`)** — FUNCIONA, con **1 edge ROTO**: pide 2 firmas (registro + API keys); el bot se crea antes de la 2ª firma (`register/route.ts:79`). Si el usuario **rechaza la firma de keys** (`:101`), queda un bot **sin keys** y reintentar falla ("name already exists"). Slug/wallet/error-409/secretKey-una-vez: FUNCIONA (`:307`,`:344`,`:395`).
- **Shadow phase (`bot/[slug]`)** — FUNCIONA: PAPER, progreso/barras a Tier-1 visibles (`:229`,`:564`), badge cambia SHADOW→ELIGIBLE→OPEN (`:557`). Menor: no hay celebración al cruzar Tier-1.
- **Inversor — INCOMPLETO/ROTO**:
  - `/bot/[slug]` (real): gated por `CAPITAL_LAYER` (OFF por defecto, `features.ts:11`). Con flag ON, Approve→Deposit con toast por paso (`:184`), pero **tras confirmar NO re-fetchea** → TVL/posición stale hasta recargar.
  - `/discover`: muestra PAPER solo como catálogo (sin botón depósito) → correcto.
  - `/vault/[botId]` **ROTO pero HUÉRFANO** (no enlazado; `/vault`→`/discover`): setState en render (`:72-102`), data mockeada (`:253`,`:504`), fees 20/3 (`:339`) inconsistentes, `winRate*100` → NaN% si undefined.
- **Retiro (`DepositorView.tsx`) — ROTO/INCOMPLETO**: botón visible ✅ `:130`; **sin modal de confirmación** (`:40`); **sin feedback** (solo `isPending`, no espera receipt, no surface del error, no refetch); **mismatch de unidades** — input "USDC" pero `redeem(parseUnits(amt,6))` espera **shares** (`:45`,`:124`).
- **Errores — INCOMPLETO**: hay `app/error.tsx` (no pantallas en blanco) ✅, pero los **500 se enmascaran**: `/discover` → "no results" (`:76`); `/bot/[slug]` → **404** para un 500 (`:120`); `/dashboard` → portfolio vacío silencioso.
- **Mobile** — mayormente FUNCIONA; **a revisar visual**: filas de `BuilderConsole` con grid fijo sin colapso (`:131`) → posible overflow a 375px.
- **Animaciones — INCOMPLETO**: `prefers-reduced-motion` en `globals.css:205` solo cubre CSS, **no** Framer Motion ni el canvas del loader. `useCountUp` cubre 0/undefined ✅; scroll con rAF ✅; BlockchainLoader no bloquea ✅.
- **Menores**: `console.log` de debug en `Navbar.tsx:304`; fees inconsistentes en toda la app (`DepositorView:92` 30/10 vs `vault:339` 20/3 vs 60/30/10).

---

## AUDITORÍA 4 — CÓDIGO & CALIDAD

`tsc --noEmit` → **0 errores** · `test:scoring` **11/11 PASS** · `test:contracts` **2 FAIL** (ver nota ⚠️).

| Ítem | Estado |
|---|---|
| TS strict / tipos en /types / duplicación / constants por env | PASS |
| `any` en rutas API / respuestas API tipadas | WARNING |
| Estructura /app | PASS · /lib sin componentes React | WARNING (#5) |
| Archivos >400 líneas | WARNING (#7) |
| .env.example / env.ts falla claro | PASS (WARN menor #9) |
| Catch sin stack al cliente | **FAIL-3** (1 ruta) |
| P2002 / secrets / next_dev.log / rate limiting | PASS |
| **Security headers** | **FAIL-1** |
| test:scoring | PASS · **test:contracts** | **FAIL-2** ⚠️ |

### Hallazgos FAIL
- **FAIL-1 · Faltan security headers** (`next.config.ts`) — sin X-Frame-Options/X-Content-Type-Options/Referrer-Policy. *Fix:* `async headers()` con DENY / nosniff / strict-origin / HSTS.
- **FAIL-2 · `test:contracts` 2 fallos** (`test/BrierVault.test.js:405,423`): "TradeWrittenOff no existe" + re-settlement con mensaje equivocado. ⚠️ **Probable artifacts stale**: el source `BrierVault.sol` SÍ tiene `event TradeWrittenOff` (`:53`) y `markTradeStale` (`:216`), y la suite pasó 23/23 antes en la sesión. *Fix:* `npx hardhat clean && hardhat compile` y re-correr; si persiste, alinear test/contrato.
- **FAIL-3 · `/api/users/route.ts:68` devuelve `error.message` al cliente** → fuga de detalle. *Fix:* `{ error: 'Internal server error' }`, detalle solo en `console.error`.

### Hallazgos WARNING
- **#4 · `catch (e: any)` en ~23 rutas** — usar `catch (e: unknown)` + narrowing.
- **#5 · `src/lib/providers.tsx` es un componente React en /lib** — mover a `src/app`/`src/components`.
- **#6 · Direcciones hardcodeadas** en `resolve-and-score:56,58` (CTF + USDC inline), y USDC.e (`0x2791…`) ≠ native USDC de `constants/contracts.ts:25` (`0x3c49…`). *Fix:* importar de constants y unificar.
- **#7 · Archivos >400 líneas** (pages, justificable): `bot/[slug]` 644, `vault/[botId]` 524, `maker/[address]` 512, `docs` 452, `list-bot` 450, `data/bots.ts` 435, `HowItWorks` 419.
- **#8 · Test key de Hardhat como fallback** (`worker.ts:38`, `hardhat.config.js:5`) — fallar si falta la key en entornos no-locales.
- **#9 · `.env.example` no lista Upstash** (`UPSTASH_REDIS_REST_URL/_TOKEN`, usadas en `middleware.ts:50`).
- **#10 · `let _ratelimit: any`** (`middleware.ts:13`) — tipar.

### PASS destacados
Sin duplicación (useCountUp/PostBody/ABI únicos); tipos centralizados en `types/index.ts`; rate limiting cubre deposits/withdraw/register (Upstash + fallback); P2002 capturado en deposits; `env.ts` falla claro en prod; `.gitignore` cubre `.env*` y logs; scoring cubre edge cases (brier=0, trades=0).

### Nota de método (Windows)
`test:scoring`/`test:contracts` usan prefijo env estilo bash → **fallan vía `npm run` en Windows** (cmd.exe). *Fix recomendado:* `cross-env` (ya se arregló `db:seed` de esta forma; falta el resto).
</content>
