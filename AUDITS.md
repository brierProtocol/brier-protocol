# BRIER PROTOCOL — AUDITORÍAS

Cuatro prompts independientes. Cada uno se corre por separado en Claude Code
(u otro asistente) **cuando corresponde** — ver "Cuándo correr" en cada sección.
Son de solo lectura: reportan PASS / FAIL / WARNING, no arreglan nada.

---

## AUDITORÍA 1 — SEGURIDAD & FLUJO DE DINERO

> **Cuándo correr:** antes de cualquier deploy a mainnet, o si tocaste `deposits`,
> `withdraw`, `circuit-breaker`, o contratos.

```
Sos auditor de seguridad de Brier Protocol. Revisá el flujo completo de dinero —
desde que un LP deposita USDC hasta que lo retira — y reportá cualquier
vulnerabilidad o inconsistencia. No arregles nada todavía, solo reportá.

Checklist obligatorio:

DEPÓSITOS (/api/deposits)
- [ ] El txHash se valida con regex antes de ir a la DB (0x + 64 hex)
- [ ] Anti-replay: el txHash se busca en DB antes de procesar
- [ ] La TX se verifica on-chain con ethers.getTransactionReceipt y status === 1
- [ ] El evento Transfer se valida contra la dirección USDC configurada (no cualquier ERC20)
- [ ] El vault de destino en el log coincide con bot.vaultAddress
- [ ] El sender on-chain coincide con depositorWallet declarado
- [ ] Si USDC_ADDRESS no está configurado, se logea un warning (no falla silenciosamente)
- [ ] El depósito duplicado concurrente está cubierto con catch P2002
- [ ] El TVL y shares se actualizan en una sola transacción atómica ($transaction)
- [ ] depositBlockReason() se llama antes de crear el depósito

RETIROS (/api/withdraw)
- [ ] La TX se verifica on-chain igual que en depósitos
- [ ] El Transfer va DESDE el vault HACIA el LP (no al revés)
- [ ] El monto retirado on-chain se usa, no el declarado por el cliente
- [ ] TVL y shares nunca quedan negativos (Math.min aplicado)
- [ ] VaultDeposit.active se marca false en la misma $transaction

CIRCUIT BREAKER (/api/cron/circuit-breaker)
- [ ] El endpoint está protegido con CRON_SECRET en producción
- [ ] La pausa on-chain tiene try/catch propio (no rompe el cron si falla la chain)
- [ ] Los errores por bot son individuales (un bot que falla no detiene el resto)
- [ ] Se registra un incubationLog antes de pausar

CONTRATOS (BrierVault.sol)
- [ ] No hay reentrancy en deposit/withdraw/redeem
- [ ] El circuit breaker on-chain solo lo puede llamar el owner/admin
- [ ] skinInGame no puede ser retirado por el builder antes del cierre del vault
- [ ] La factory clona correctamente y cada vault tiene su propio storage

GENERAL
- [ ] Ningún endpoint de dinero acepta input del cliente como monto — siempre se verifica on-chain
- [ ] No hay console.log que exponga private keys o datos sensibles
- [ ] Las env vars críticas (EXECUTOR_PRIVATE_KEY, RPC_URL, CRON_SECRET) tienen guards de "si no está, no ejecuta"

Al terminar: listá en formato PASS / FAIL / WARNING cada ítem. Para los FAIL,
explicá el riesgo concreto y el fix sugerido.
```

---

## AUDITORÍA 2 — BASE DE DATOS & FLUJO DE DATOS

> **Cuándo correr:** antes de cada commit que toque API routes, Prisma queries, o el schema.

```
Sos auditor de integridad de datos de Brier Protocol. Revisá que la base de datos
esté correctamente conectada y que los datos fluyan sin inconsistencias entre la
app y la DB.

Checklist obligatorio:

CONEXIÓN Y CONFIGURACIÓN
- [ ] prisma.$connect() o el singleton de /lib/db/prisma.ts no se instancia múltiples veces (hot reload en dev lo rompe)
- [ ] DATABASE_URL y DIRECT_URL están separadas (Supabase requiere ambas para serverless)
- [ ] Connection pooling activo (Supabase Transaction Mode en el connection string)

INTEGRIDAD DE RELACIONES
- [ ] Bot.walletAddress referencia un User existente en todos los casos (upsert de User antes de crear Bot)
- [ ] VaultDeposit.botId siempre apunta a un Bot con vaultAddress no null antes de procesar
- [ ] VaultPosition.userWallet_botId es unique — no puede haber dos posiciones del mismo LP en el mismo bot
- [ ] TradeEvent.botId siempre existe en la tabla Bot

QUERIES CRÍTICAS
- [ ] /api/dashboard: trae solo deposits con active: true
- [ ] /api/leaderboard: usa el índice de Bot (walletAddress, status, tier) — no hace full scan
- [ ] /api/bots/[slug]: incluye scores con isLatest: true, no todos los históricos
- [ ] /api/cron/score: actualiza isLatest a false en scores anteriores antes de crear el nuevo
- [ ] /api/withdraw: findFirst de VaultPosition usa mode: 'insensitive' para el walletAddress

TRANSACCIONES ATÓMICAS
- [ ] Depósito: bot.currentTVL + bot.totalShares + VaultPosition en una sola $transaction
- [ ] Retiro: VaultDeposit.active + bot.currentTVL + bot.totalShares + VaultPosition en una sola $transaction
- [ ] settleMarket / resolución: profit split y actualización de scores en una sola $transaction

DATOS CALCULADOS
- [ ] NAV per share = currentTVL / totalShares (con guard si totalShares === 0 → 1)
- [ ] Shares minted = depositAmount / navPerShare
- [ ] Brier Score entre 0 y 1 siempre (score-engine no puede devolver negativos)
- [ ] totalProfitEarned en VaultDeposit se actualiza correctamente en cada settleMarket

EDGE CASES
- [ ] ¿Qué pasa si un bot tiene currentTVL > 0 pero totalShares === 0? (inconsistencia por bug)
- [ ] ¿Qué pasa si dos LPs retiran en simultáneo y el TVL queda negativo?
- [ ] ¿Hay bots en status VAULT_ELIGIBLE_T1 sin vaultAddress? (deberían tenerlo)

Al terminar: listá PASS / FAIL / WARNING por ítem. Para FAIL: explicá qué dato
queda corrupto y cómo corregirlo.
```

---

## AUDITORÍA 3 — UX & FLUJO DE USUARIO

> **Cuándo correr:** antes de mostrar el producto a alguien externo (builder, inversor, aceleradora).

```
Sos auditor de UX de Brier Protocol. Revisá que cada flujo crítico funcione de
punta a punta sin que el usuario quede trabado, confundido, o sin feedback.

Checklist obligatorio:

FLUJO BUILDER (registrar un bot)
- [ ] /list-bot: los 4 pasos del wizard avanzan sin errores
- [ ] El nombre del bot genera un slug único (si ya existe, muestra error claro)
- [ ] La wallet del builder se captura correctamente con wagmi (no null)
- [ ] Al terminar, el bot aparece en /discover y en /bot/[slug]
- [ ] El builder puede ver su bot en /dashboard tab Builder
- [ ] La secretKey se muestra UNA vez y hay advertencia de guardarla

FLUJO SHADOW PHASE
- [ ] El bot recién creado está en status PAPER
- [ ] Las métricas de shadow progress se actualizan (brierScore, winRate, totalTrades)
- [ ] El usuario puede ver el progreso hacia Tier-1 en /bot/[slug]
- [ ] Cuando alcanza Tier-1, el status cambia y hay feedback visible

FLUJO INVERSOR (depositar)
- [ ] /discover muestra bots con status correcto (no muestra PAPER como invertibles)
- [ ] /vault/[botId]: el botón de depósito está deshabilitado si no hay wallet conectada
- [ ] El flujo Approve → Deposit tiene feedback en cada paso (no spinner genérico)
- [ ] Si la TX falla en MetaMask, el usuario ve un error (no queda colgado)
- [ ] Después de depositar, el dashboard muestra la nueva posición
- [ ] El monto depositado coincide con lo que muestra el dashboard

FLUJO DE RETIRO
- [ ] El botón de retiro está en /dashboard, no enterrado
- [ ] Hay modal de confirmación antes de ejecutar
- [ ] Después del redeem, la posición desaparece del dashboard
- [ ] Si el vault está pausado (circuit breaker), el retiro sigue siendo posible

ESTADOS DE ERROR
- [ ] ¿Qué ve el usuario si la wallet se desconecta a mitad de un flujo?
- [ ] ¿Qué ve el usuario si la API devuelve 500?
- [ ] ¿Qué ve el usuario si el RPC está caído?
- [ ] ¿Hay alguna pantalla en blanco sin mensaje de error?

MOBILE
- [ ] /discover se ve bien en 375px
- [ ] /vault/[botId] el botón de depósito es tappeable en mobile
- [ ] /dashboard las tabs de Investor / Builder / TX Log se ven completas
- [ ] El Navbar mobile no tapa contenido crítico

ANIMACIONES
- [ ] Las animaciones de Framer Motion tienen reduced-motion fallback (globals.css lo tiene: animation-duration: 0.001ms en prefers-reduced-motion)
- [ ] El BlockchainLoader de la landing no bloquea el contenido si sessionStorage no está disponible (modo incógnito)
- [ ] El scroll handler de la landing usa requestAnimationFrame (ya implementado — verificar que siga así)
- [ ] Las animaciones de números (useCountUp) no muestran NaN ni Infinity si el valor es 0 o undefined
- [ ] Los skeletons de carga no "flashean" — se ven mientras los datos cargan y desaparecen suavemente

Al terminar: listá cada flujo como FUNCIONA / ROTO / INCOMPLETO con descripción
de qué falla exactamente y en qué pantalla.
```

---

## AUDITORÍA 4 — CÓDIGO & CALIDAD

> **Cuándo correr:** después del refactor, o antes de mostrar el repo a un inversor técnico o aceleradora.

```
Sos auditor de calidad de código de Brier Protocol. Revisá que el código sea
mantenible, predecible y sin deuda técnica acumulada que pueda romper cosas en
producción.

Checklist obligatorio:

TYPESCRIPT
- [ ] No hay any[] sin justificación en archivos de API routes
- [ ] Los tipos de Bot, BotScore, VaultDeposit, TradeEvent, User están centralizados en /types
- [ ] Las interfaces de respuesta de API están tipadas (no se retorna any en NextResponse.json)
- [ ] strict: true en tsconfig.json sin errores

DUPLICACIÓN
- [ ] useCountUp() existe en un solo lugar (/hooks/useCountUp.ts)
- [ ] PostBody y posterId en un solo componente (/components/bot/PostBody.tsx)
- [ ] brierVaultABI en un solo archivo (/lib/abis/BrierVault.ts)
- [ ] USDC_ADDRESS y otras constants de red en /constants/contracts.ts usando process.env

ESTRUCTURA
- [ ] /app solo contiene páginas y layouts
- [ ] /components separados por dominio (ui/, bot/, vault/, layout/)
- [ ] /lib no tiene componentes React mezclados con utilidades
- [ ] No hay archivos de más de 400 líneas sin justificación

VARIABLES DE ENTORNO
- [ ] Ninguna address o valor de red está hardcodeado en el código
- [ ] Todas las env vars tienen un .env.example actualizado
- [ ] Las vars que van al cliente llevan NEXT_PUBLIC_ y las que no, no
- [ ] Si una env var crítica falta, el sistema falla con un mensaje claro (no silenciosamente)

MANEJO DE ERRORES
- [ ] Ningún catch devuelve el stack trace al cliente en producción
- [ ] Los errores de Prisma P2002 (unique constraint) están capturados donde corresponde
- [ ] Los errores de ethers (RPC caído, TX no encontrada) tienen mensajes amigables
- [ ] No hay console.error que exponga datos sensibles

SEGURIDAD BÁSICA
- [ ] next_dev.log no está en el repo (.gitignore actualizado)
- [ ] No hay private keys, mnemonics, o API keys commiteados
- [ ] El middleware aplica rate limiting en rutas de dinero (/api/deposits, /api/withdraw, /api/bots/register)
- [ ] Los headers de seguridad están configurados (X-Frame-Options, X-Content-Type-Options)

TESTS
- [ ] npm run test:scoring pasa (11/11)
- [ ] npm run test:contracts pasa (21/21)
- [ ] Los tests cubren los edge cases de score-engine (brierScore = 0, totalTrades = 0, etc.)

Al terminar: listá PASS / FAIL / WARNING por ítem. Para FAIL: mostrá el archivo
y línea exacta.
```
