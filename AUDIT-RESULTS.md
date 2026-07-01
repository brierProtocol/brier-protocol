# BRIER PROTOCOL — RESULTADOS DE AUDITORÍAS

> Corrida: 2026-06-30 / 2026-07-01. Rama auditada: `dev`.
> Cada auditoría reporta PASS / FAIL / WARNING. Las plantillas están en [`AUDITS.md`](./AUDITS.md).
> **Nota transversal:** el flujo de capital está desactivado en v1 (`FEATURES.CAPITAL_LAYER`)
> hasta auditar los contratos — varios hallazgos aplican para cuando se encienda.

---

## AUDITORÍA 1 — SEGURIDAD & FLUJO DE DINERO

### Resumen por ítem

**Depósitos (`src/app/api/deposits/route.ts`)**
| Ítem | Estado |
|---|---|
| txHash validado con regex (0x+64hex) | ✅ PASS (`:39`) |
| Anti-replay (busca txHash + catch P2002) | ✅ PASS (`:44`, `:157`) |
| Verifica on-chain `getTransactionReceipt` + `status===1` | ✅ PASS (`:60`) |
| Transfer validado contra dirección USDC | ⚠️ WARNING → **F2** |
| Vault destino = `bot.vaultAddress` | ✅ PASS (`:87`) |
| Sender on-chain = `depositorWallet` | ✅ PASS (`:109`) |
| Warning si USDC no configurado | ✅ PASS (`:95`) |
| P2002 duplicado concurrente | ✅ PASS (`:157`) |
| TVL + shares en `$transaction` atómica | ⚠️ WARNING → **F3** |
| `depositBlockReason()` antes de crear | ✅ PASS (`:118`) |

**Retiros (`src/app/api/withdraw/route.ts`)**
| Ítem | Estado |
|---|---|
| Verifica on-chain igual que depósitos | ✅ PASS (`:35`) |
| Transfer DESDE vault HACIA LP | ✅ PASS (`:55`) |
| Usa monto on-chain, no el del cliente | ✅ PASS (`:59`) |
| TVL/shares nunca negativos (`Math.min`) | ✅ PASS (`:96`) |
| `active=false` en la misma `$transaction` | ✅ PASS (`:88`) |
| **Anti-replay del txHash** | ❌ FAIL → **F1** |

**Circuit breaker (`src/app/api/cron/circuit-breaker/route.ts`)** — ✅ todo PASS
Protegido con `CRON_SECRET` (`:17`), pausa on-chain con try/catch propio (`:73`), errores por bot individuales (`:33`), `incubationLog` antes de pausar (`:54`).

**Contratos (`contracts/BrierVault.sol`)**
| Ítem | Estado |
|---|---|
| Sin reentrancy en withdraw/redeem | ✅ PASS (`nonReentrant`) |
| Sin reentrancy en deposit/mint | ⚠️ WARNING → **F4** |
| Circuit breaker solo executor/owner | ✅ PASS |
| Builder no retira skinInGame antes del cierre | ✅ PASS (ver **F5**) |
| Factory clona con storage propio | ✅ PASS (Initializable) |

### Hallazgos

**F1 — `/api/withdraw` sin anti-replay [FAIL — prioridad alta]**
A diferencia de deposits, withdraw no valida si el `txHash` ya se procesó. Reenviar el mismo
txHash de retiro decrementa `currentTVL` de nuevo (`:96`) aunque la posición ya esté en 0 →
**TVL corrupto/negativo**. *Fix:* `txHash` único en retiros + rechazar duplicados, como en deposits.

**F2 — Deposits usa otra env var de USDC que el resto [WARNING/FAIL]**
`deposits` valida contra `process.env.USDC_ADDRESS` (`:12`) mientras el resto usa
`NEXT_PUBLIC_USDC_ADDRESS`. Si seteás solo la NEXT_PUBLIC (como dice `.env.example`), la
protección anti-token-falso de deposits queda **apagada** → riesgo de inflar TVL con un ERC20 trucho.
*Fix:* usar `USDC_ADDRESS_ENV` (NEXT_PUBLIC) en deposits, que ya está importado.

**F3 — `vaultDeposit.create` fuera de la `$transaction` [WARNING]**
El registro del depósito (`:142`) va antes del `$transaction` que sube TVL+shares+posición (`:164`).
Si el transaction falla, queda un depósito sin TVL actualizado. *Fix:* meterlo en el mismo `$transaction`.

**F4 — `deposit()`/`mint()` sin `nonReentrant` [WARNING]**
withdraw/redeem tienen `nonReentrant`, deposit/mint no (solo `whenNotPaused`). Riesgo bajo con
ERC4626 + SafeERC20, pero conviene por consistencia.

**F5 — skinInGame sin vía de recupero en cierre normal [WARNING de diseño]**
El builder nunca puede retirar el skin (correcto), pero tampoco hay función para devolvérselo si el
vault cierra sin circuit breaker → queda trabado. Considerar recupero post-cierre.

**Veredicto:** flujo muy bien construido (deposits casi perfecto). Antes de mainnet, priorizar
**F1** (anti-replay en withdraw) y **F2** (env var de USDC).

---

## AUDITORÍA 2 — BASE DE DATOS & FLUJO DE DATOS

_⏳ En curso (agente corriendo). Se completa al terminar._

---

## AUDITORÍA 3 — UX & FLUJO DE USUARIO

_⏳ En curso (agente corriendo). Se completa al terminar._

---

## AUDITORÍA 4 — CÓDIGO & CALIDAD

_⏳ En curso (agente corriendo). Se completa al terminar._
