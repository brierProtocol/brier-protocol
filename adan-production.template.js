import { BrierExecutorClient } from './scripts/brier-sdk.ts';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

dotenv.config();

const executorUrl = process.env.BRIER_EXECUTOR_URL || "https://executor.brierprotocol.com";
const builderSecret = process.env.BUILDER_SECRET_KEY || "your_64_char_secret_from_dashboard";
const brier = new BrierExecutorClient(executorUrl, builderSecret);

/**
 * Función Maestra de Ejecución (Soporta Perps y Spot)
 */
async function executeQuantSignal(prediction, marketId, confidenceScore, kellySizeUsdc, isPerp = false, leverage = 1, currentPrice = 0) {
    console.log(`[ADAN-PRED] Generating On-Chain Trade Signal... Confidence: ${confidenceScore}`);
    
    try {
        const tradeId = `adan-trade-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        
        // Cálculo sintético de Stop-Loss (Corta pérdida al 5% del movimiento en contra)
        const stopLossMargin = currentPrice * 0.05;
        const stopLoss = prediction === "YES" || prediction === "LONG" 
            ? currentPrice - stopLossMargin 
            : currentPrice + stopLossMargin;

        const response = await brier.sendTradeSignal({
            tradeId: tradeId,
            botId: process.env.BRIER_BOT_ID || "cuid-brier-adan-pred-v8",
            vaultAddress: process.env.BRIER_VAULT_ADDRESS || "0xYourVaultAddress",
            marketType: isPerp ? 'PERP' : 'SPOT',
            actionType: 'OPEN',
            direction: prediction === "YES" ? "LONG" : "SHORT",
            leverage: isPerp ? leverage : 1,
            stopLossPrice: isPerp ? stopLoss : undefined,
            entryPrice: currentPrice || 0.50,
            size: kellySizeUsdc,
            confidence: confidenceScore,
            marketId: marketId,
            outcomeIndex: prediction === "YES" || prediction === "LONG" ? 0 : 1
        });

        console.log(`[BRIER] Signal Accepted! Trade ID: ${tradeId}`);
        return tradeId;
    } catch (error) {
        console.error(`[FATAL ERROR] Brier Execution Failed:`, error.message);
    }
}

/**
 * Nueva Función: Cerrar Posición Perp Manualmente (Take Profit)
 */
async function closeQuantPosition(tradeId, marketId) {
    console.log(`[ADAN-PRED] Taking Profit / Closing Position: ${tradeId}`);
    try {
        await brier.sendTradeSignal({
            tradeId: tradeId, // Mismo ID para referenciar la posición abierta
            botId: process.env.BRIER_BOT_ID,
            vaultAddress: process.env.BRIER_VAULT_ADDRESS,
            marketType: 'PERP',
            actionType: 'CLOSE',
            direction: 'LONG', // Ignorado en el cierre
            entryPrice: 0,
            size: 0, // Ignorado, cierra el 100%
            confidence: 1,
            marketId: marketId,
            outcomeIndex: 0
        });
        console.log(`[BRIER] Close Signal Accepted!`);
    } catch (error) {
        console.error(`[FATAL ERROR] Failed to close position:`, error.message);
    }
}

// Test execution
executeQuantSignal('YES', '0x123', 0.95, 100, true, 5, 0.50).then(() => console.log('Bot finished.'));
