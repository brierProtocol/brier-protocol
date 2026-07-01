# Conectar un bot a Brier Protocol (v1 — Reputación)

Este documento es el flujo correcto para conectar un bot (p.ej. ADAN) a Brier en
la fase actual. Reemplaza a la versión anterior, que describía el camino de
capital (`sendTradeSignal` → executor on-chain). Ese camino es de Fase 3 y hoy
está **apagado**; cablearlo ahora es la causa típica de que "algo no concuerde".

## La idea en una frase

Corres tu bot en tu máquina. **Sin capital de Brier**, demuestras habilidad
prediciendo mercados de Polymarket. Brier mide tu Brier Score **relativo al
mercado** durante la shadow phase. Cuando superas el gate, Brier te abre un
**vault** que terceros con dinero pueden fondear. Tú operas ese capital, nunca lo
retiras.

## Lo que NO debes usar todavía

`BrierExecutorClient.sendTradeSignal()` (Fastify executor + BullMQ + on-chain) es
la **capa de capital, Fase 3**. En v1 está detrás de un feature flag en OFF y el
executor ni siquiera corre en local. No lo conectes en esta fase.

## 1. Instalar el SDK (por npm, no copiando el archivo)

El SDK es el paquete `@brier/sdk`. En desarrollo local, instálalo desde la ruta
del monorepo (o con `npm pack` + el tarball); la publicación al registry de npm
queda para el release:

```bash
# desde el repo de tu bot
npm install /ruta/a/brier-protocol/packages/brier-sdk
# o: (cd brier-protocol/packages/brier-sdk && npm run build && npm pack)
#    npm install /ruta/a/brier-sdk-1.0.0.tgz
```

## 2. Registrar el bot y obtener las claves

En la web de Brier (`/list-bot`) o vía `POST /api/bots/register`, registra el bot
con su **wallet REAL de Polymarket** (formato `0x` + 40 hex). Recibes un `apiKey`
y un `apiSecret`; el secret se muestra **una sola vez**.

> Importante: la wallet debe ser la que realmente opera en Polymarket. Es la que
> Brier indexa on-chain para verificar tus categorías y tu track record. Una
> wallet placeholder (p.ej. `0xADAN...PRED`) hace que el indexado no encuentre
> nada.

En el `.env` de tu bot:

```env
BRIER_BASE_URL="http://localhost:3000/api"
BRIER_API_KEY="br_..."
BRIER_API_SECRET="el_secreto_hex_de_64_caracteres"
```

## 3a. Camino A — Predicciones (recomendado en v1)

Tu bot envía su probabilidad para un mercado. El SDK agrega el timestamp y la
firma HMAC-SHA256 automáticamente.

```javascript
import { BrierClient } from '@brier/sdk';

const brier = new BrierClient({
  apiKey: process.env.BRIER_API_KEY,
  apiSecret: process.env.BRIER_API_SECRET,
  baseUrl: process.env.BRIER_BASE_URL,
});

// Cuando tu MoE/ensemble produce una probabilidad para un mercado:
await brier.predict({
  marketId,                 // id del mercado de Polymarket
  marketTitle: market.title,
  forecast: P_ensemble,     // estrictamente entre 0 y 1
});
```

Brier captura el precio real del mercado en ese instante y puntúa tu skill contra
el mercado. Una predicción por bot por mercado (no se puede reenviar tras el
movimiento del precio: es anti cherry-picking).

## 3b. Camino B — Reportar apuestas reales (paper-trade)

Si tu bot **ya ejecuta** en Polymarket (como el trade de Finlandia), repórtalo a
Brier para que quede en tu track record y el watcher lo resuelva:

```
POST /api/bots/<slug>/paper-trade
headers:
  x-brier-key: <BOT_INGEST_KEY>          # clave de ingesta de shadow (env de Brier)
body (JSON):
  {
    "marketId": "0x...",                 // conditionId de Polymarket (0x + hex)
    "marketTitle": "Finland ...",
    "side": "YES" | "NO",
    "amount": 25,                        // tamaño de la apuesta
    "entryPrice": 0.62,                  // precio de entrada, en (0,1)
    "externalTradeId": "adan-<uuid>"     // id único, idempotente
  }
```

> Requisito clave: `marketId` debe ser el **conditionId** de Polymarket (`0x…`),
> no el título ni el slug. El watcher resuelve contra el CLOB usando ese id. Si
> mandas otra cosa, el trade entra pero nunca se resuelve.

## 4. Qué pasa después (el flujo)

- **Camino A:** `predict()` → tabla `Prediction` → el cron `resolve-and-score`
  resuelve contra Polymarket y recalcula tu Brier + skill relativo.
- **Camino B:** `paper-trade` → tabla `TradeEvent` (PENDING) → el
  `shadow-watcher` la resuelve a WIN/LOSS contra el CLOB → el score cron recalcula
  tu Brier.

Ambos alimentan el mismo objetivo: acumular predicciones resueltas con buen Brier
hasta superar el gate y desbloquear el vault. La capa de capital (executor,
vault on-chain) se activa **después**, en Fase 3.
