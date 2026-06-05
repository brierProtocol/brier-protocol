/**
 * Brier Executor SDK — TypeScript/Node.js Client
 * 
 * Este SDK permite que ADAN (y otros bots en Node.js) envíen señales de trade
 * de forma segura al Brier Protocol usando firmas HMAC.
 * 
 * Requisitos: Node.js >= 18 (usa fetch nativo)
 */

import crypto from 'node:crypto';

export interface BrierTradeSignal {
  tradeId: string;
  botId: string;
  vaultAddress: string;
  
  // Nuevos campos HFT / Perps
  marketType: 'SPOT' | 'PERP';
  actionType: 'OPEN' | 'CLOSE';
  direction: 'LONG' | 'SHORT' | 'YES' | 'NO';
  leverage?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  
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
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.secretKey = secretKey;
    
    // ARCHITECTURE NOTE: En el futuro, inyectaremos aquí la Lógica de Derivación de Llaves
    // (Auth Nivel 2 de Polymarket) para generar llaves efímeras (session keys) por trade,
    // evitando exponer la llave maestra del Vault o del Creador en la memoria de cada orden.
  }

  private signPayload(timestamp: number, bodyStr: string): string {
    const payload = `${timestamp}.${bodyStr}`;
    return crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');
  }

  private getAuthHeaders(bodyStr: string): Record<string, string> {
    const timestamp = Date.now();
    const signature = this.signPayload(timestamp, bodyStr);
    return {
      'Content-Type': 'application/json',
      'x-timestamp': timestamp.toString(),
      'x-signature': signature
    };
  }

  public async sendTradeSignal(signal: BrierTradeSignal, maxRetries: number = 3): Promise<any> {
    // Valores por defecto seguros para evitar liquidaciones
    const safeSignal = {
        ...signal,
        leverage: signal.leverage || 1.0,
        marketType: signal.marketType || 'SPOT',
        actionType: signal.actionType || 'OPEN'
    };

    const bodyStr = JSON.stringify(safeSignal);
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
        if (response.ok) return data;
        
        if (response.status >= 400 && response.status < 500) {
          throw new BrierError(response.status, data?.error || response.statusText);
        }
        
        throw new BrierError(response.status, data?.error || 'Internal Server Error');
      } catch (error: any) {
        attempt++;
        if (error instanceof BrierError && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }
        if (attempt >= maxRetries) throw error;
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise(res => setTimeout(res, backoffMs));
      }
    }
  }

  public async healthCheck(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
    return await response.json();
  }
}
