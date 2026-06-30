import crypto from 'node:crypto'
import fetch from 'node-fetch'

// ─────────────────────────────────────────────────────────────
// BRIER PROTOCOL - OFICIAL ADAN INTEGRATION EXAMPLE
// ─────────────────────────────────────────────────────────────
// Este script demuestra cómo un bot puede autenticarse de manera segura,
// firmar payloads con HMAC y enviar predicciones al protocolo Brier.

// 1. Configuración de API Keys (obtenidas del dashboard)
const API_KEY = process.env.BRIER_API_KEY || 'sk_test_tu_api_key'
const API_SECRET = process.env.BRIER_API_SECRET || 'tu_api_secret_64_hex'
const BRIER_URL = process.env.BRIER_API_URL || 'http://localhost:3000/api/predictions/commit'

/**
 * Función para firmar y enviar una predicción de forma segura a Brier
 */
async function sendPrediction(marketId: string, conditionId: string, side: 'YES' | 'NO', confidence: number, marketTitle: string) {
  const timestamp = Date.now().toString()
  
  // 2. Construir payload
  const payload = {
    marketId,
    conditionId,
    side,
    confidence,
    marketTitle
  }
  const rawBody = JSON.stringify(payload)

  // 3. Generar firma HMAC-SHA256
  // Se concatena el timestamp con el rawBody para evitar ataques de replay
  const signature = crypto
    .createHmac('sha256', API_SECRET)
    .update(timestamp + rawBody)
    .digest('hex')

  console.log(`[ADAN] Enviando predicción para el mercado: ${marketId}`)
  console.log(`       Side: ${side} | Confianza: ${(confidence * 100).toFixed(2)}%`)

  try {
    // 4. Enviar request con los headers de seguridad
    const response = await fetch(BRIER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'x-timestamp': timestamp,
        'x-signature': signature,
      },
      body: rawBody,
    })

    const data = await response.json()

    // 5. Validar respuesta
    if (!response.ok) {
      console.error(`[ERROR] Falló la predicción: ${response.status}`, data)
      return null
    }

    console.log(`[EXITO] Predicción confirmada. ID: ${data.predictionId}`)
    console.log(`        Probabilidad capturada del mercado: ${data.capturedMarketMidpoint}`)
    if (data.devFallback) {
      console.warn(`        ⚠️ Nota: ${data.note}`)
    }
    
    return data

  } catch (error) {
    console.error(`[FATAL] Excepción al contactar Brier Protocol:`, error)
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// FLUJO DE EJECUCIÓN (Ejemplo simulando un análisis)
// ─────────────────────────────────────────────────────────────
async function runAdanCycle() {
  console.log('Iniciando ciclo de predicciones de ADAN...')

  // Simulación de los resultados del análisis del agente ADAN
  const targetMarkets = [
    {
      marketId: '0x1234567890abcdef1234567890abcdef12345678', // Ejemplo ID
      conditionId: '0x9876543210fedcba',
      side: 'YES' as const,
      confidence: 0.85, // 85% seguro de YES
      marketTitle: 'Bitcoin a $100k antes de 2025?'
    },
    {
      marketId: '0xabcdef1234567890abcdef1234567890abcdef12',
      conditionId: '0x1234567890fedcba',
      side: 'NO' as const,
      confidence: 0.12, // Muy baja confianza (o alta confianza en NO si usamos 1-p)
      marketTitle: 'Ethereum flippea a Bitcoin este año?'
    }
  ]

  // Procesamos los mercados de forma secuencial (para respetar rate limits)
  for (const market of targetMarkets) {
    await sendPrediction(
      market.marketId, 
      market.conditionId, 
      market.side, 
      market.confidence, 
      market.marketTitle
    )
    
    // Pequeño delay de cortesía (anti rate-limit)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('Ciclo completado. Predicciones almacenadas de manera inmutable.')
}

// Ejecutar si el script es llamado directamente
if (require.main === module) {
  runAdanCycle()
}
