import * as crypto from 'crypto';

export interface BrierConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
}

export interface PredictionPayload {
  marketId: string;
  marketTitle?: string;
  forecast: number; // 0.0 to 1.0
}

export class BrierClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor(config: BrierConfig) {
    if (!config.apiKey || !config.apiSecret) {
      throw new Error('BrierClient requires apiKey and apiSecret');
    }
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = config.baseUrl || 'http://localhost:3000/api';
  }

  /**
   * Commit a prediction to the Brier Protocol Reputation Layer.
   * This function automatically adds the timestamp and HMAC-SHA256 signature.
   */
  async predict(payload: PredictionPayload): Promise<any> {
    if (payload.forecast < 0 || payload.forecast > 1) {
      throw new Error('Forecast must be between 0.0 and 1.0');
    }

    const timestamp = Date.now().toString();
    const rawBody = JSON.stringify(payload);

    // Compute HMAC-SHA256 signature
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(timestamp + rawBody)
      .digest('hex');

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'x-timestamp': timestamp,
      'x-signature': signature,
    };

    const response = await fetch(`${this.baseUrl}/predictions/commit`, {
      method: 'POST',
      headers,
      body: rawBody,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Brier API Error [${response.status}]: ${data.error || JSON.stringify(data)}`);
    }

    return data;
  }
}
