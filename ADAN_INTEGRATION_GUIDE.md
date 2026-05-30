# Integración de ADAN-PRED (v8.5) con Brier Protocol

Este documento es tu *blueprint* exacto para conectar el núcleo de trading de ADAN (`adan-pred.js`) a los Smart Contracts de Brier Protocol usando el SDK oficial en Node.js.

## 1. Instalación del SDK en ADAN

Copia el archivo `brier-sdk.ts` (o compílalo a `.js`) dentro de la carpeta `src/core/` o `src/api/` de tu repositorio local de ADAN.

En tu archivo `.env` de ADAN, agrega las credenciales que obtendrás al registrar tu bot en la web de Brier:
```env
BRIER_EXECUTOR_URL="https://api.tudominio.com"
BRIER_BUILDER_SECRET="el_secreto_hex_de_64_caracteres"
BRIER_BOT_ID="cuid-de-tu-bot"
BRIER_VAULT_ADDRESS="0xContratoDelVault"
```

## 2. Inyección en `adan-pred.js`

Busca la sección en `adan-pred.js` donde actualmente realizas el *Paper Trading* (después de que el `Kelly Sizer` y todos los bloqueadores como *VPIN* o *Markovian Gate* hayan dado luz verde).

**Antes (Tu código actual aproximado):**
```javascript
if (stake > 0 && P_ensemble > 0.5) {
    logger.info(`[PAPER TRADE] Apostando $${stake} al mercado ${marketId}`);
    db.savePaperTrade(marketId, stake, P_ensemble);
}
```

**Después (Con Brier Protocol inyectado):**
```javascript
// Al inicio de adan-pred.js
import { BrierExecutorClient } from './api/brier-sdk.js'; // o require()
import { v4 as uuidv4 } from 'uuid';

const brierClient = new BrierExecutorClient(
    process.env.BRIER_EXECUTOR_URL,
    process.env.BRIER_BUILDER_SECRET
);

// En tu loop de ejecución
if (stake > 0 && P_ensemble > 0.5) {
    logger.info(`[BRIER PROTOCOL] Ejecutando orden de $${stake} USDC on-chain...`);
    
    try {
        const brierResponse = await brierClient.sendTradeSignal({
            tradeId: `adan-${uuidv4()}`, // Genera un ID único para evitar duplos
            botId: process.env.BRIER_BOT_ID,
            vaultAddress: process.env.BRIER_VAULT_ADDRESS,
            direction: side_is_yes ? 'LONG' : 'SHORT',
            entryPrice: current_market_price,
            size: stake, // Calculado por tu Kelly_sizer.js
            confidence: P_ensemble, // Predicción combinada del MoE Dynasty
            marketId: market.id,
            outcomeIndex: side_is_yes ? 0 : 1
        });
        
        logger.success(`Orden confirmada en Brier Executor! TradeID: ${brierResponse.tradeId}`);
    } catch (error) {
        logger.error(`Error enviando señal a Brier: ${error.message}`);
        // Aquí ADAN puede usar su "Consciousness Journal" para anotar la falla de red
    }
}
```

## 3. ¿Qué sucede después? (El Flujo)

1. `adan-pred.js` llama a `sendTradeSignal()`.
2. El SDK genera una firma criptográfica HMAC con el timestamp actual.
3. El Fastify Executor de Brier recibe la señal, la valida y la bloquea en Redis para prevenir doble gasto.
4. El Worker de Brier toma la señal de BullMQ, la envía a Polymarket y actualiza el balance de tu BrierVault Smart Contract en Sepolia/Polygon.

Todo sucede en menos de ~2 segundos, protegiendo totalmente la lógica pesada de tu ML Brain.
