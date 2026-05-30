/**
 * Brier Executor SDK — TypeScript/Node.js Client
 * 
 * Este SDK permite que ADAN (y otros bots en Node.js) envíen señales de trade
 * de forma segura al Brier Protocol usando firmas HMAC.
 * 
 * Requisitos: Node.js >= 18 (usa fetch nativo)
 * 
 * Uso:
 * const brier = new BrierExecutorClient("http://localhost:3001", "YOUR_SECRET_KEY");
 * const result = await brier.sendTradeSignal({ ... });
 */

import crypto from 'node:crypto';

export interface BrierTradeSignal {
  tradeId: string;
  botId: string;
  vaultAddress: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  size: number;
  confidence: number;
  marketId: string;
  outcomeIndex: number;
}

export class BrierError extends Error {
  constructor(public statusCode: number, message: string) {
    super(`Brier API Error [${statusCode}]: ${message}`);
    this.name = 'BrierError';
  }
}

export class BrierExecutorClient {
  private readonly baseUrl: string;
  private readonly secretKey: string;

  constructor(baseUrl: string, secretKey: string) {
    if (!baseUrl || !secretKey) {
      throw new Error("BrierExecutorClient requires both baseUrl and secretKey");
    }
    // Asegurar que no termine en barra
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.secretKey = secretKey;
  }

  /**
   * Genera la firma HMAC-SHA256
   */
  private signPayload(timestamp: number, bodyStr: string): string {
    const payload = `${timestamp}.${bodyStr}`;
    return crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');
  }

  /**
   * Genera los headers criptográficos requeridos por el Fastify Server
   */
  private getAuthHeaders(bodyStr: string): Record<string, string> {
    const timestamp = Date.now();
    const signature = this.signPayload(timestamp, bodyStr);

    return {
      'Content-Type': 'application/json',
      'x-timestamp': timestamp.toString(),
      'x-signature': signature
    };
  }

  /**
   * Envía una señal de trading con reintentos automáticos (exponencial backoff)
   * por si hay errores de red o el servidor devuelve HTTP 5xx.
   */
  public async sendTradeSignal(
    signal: BrierTradeSignal,
    maxRetries: number = 3
  ): Promise<any> {
    const bodyStr = JSON.stringify(signal);
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const headers = this.getAuthHeaders(bodyStr);
        const response = await fetch(`${this.baseUrl}/api/v1/signals`, {
          method: 'POST',
          headers,
          body: bodyStr
        });

        const data = await response.json().catch(() => null);

        // Success (202 Accepted)
        if (response.ok) {
          return data;
        }

        // Si es un error 400-499, NO reintentar (es error del cliente: HMAC inválido, etc)
        if (response.status >= 400 && response.status < 500) {
          // Excepción: 429 Rate Limit (podríamos reintentar, pero la guía dice fallar rápido)
          throw new BrierError(response.status, data?.error || response.statusText);
        }

        // Si es 500+, lanzar para capturar en el catch y reintentar
        throw new BrierError(response.status, data?.error || 'Internal Server Error');

      } catch (error: any) {
        attempt++;
        // Si fue un error de autenticación 4xx, lo propagamos inmediatamente
        if (error instanceof BrierError && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }

        if (attempt >= maxRetries) {
          throw error; // Se agotaron los reintentos
        }

        // Exponential backoff: 1s, 2s, 4s...
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise(res => setTimeout(res, backoffMs));
      }
    }
  }

  /**
   * Verifica la conexión con el servidor
   */
  public async healthCheck(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return await response.json();
  }
}
