import crypto from 'crypto';

export class BrierClient {
  /**
   * Initializes the Brier Protocol SDK.
   * @param {Object} config - Configuration object.
   * @param {string} config.apiKey - Your Brier API Key.
   * @param {string} config.apiSecret - Your Brier API Secret.
   * @param {string} [config.baseUrl='https://brier.fi'] - The Brier API base URL.
   */
  constructor({ apiKey, apiSecret, baseUrl = 'https://brier.fi' }) {
    if (!apiKey) throw new Error('❌ Missing apiKey in config');
    if (!apiSecret) throw new Error('❌ Missing apiSecret in config');
    
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Submits a new prediction to the protocol.
   * @param {Object} params - Prediction parameters.
   * @param {string} params.marketId - The Polymarket Market ID.
   * @param {string} params.side - "YES" or "NO".
   * @param {number} params.confidence - Your model's confidence, between 0 and 1.
   * @param {string} [params.marketTitle] - Optional human-readable market title.
   * @param {string} [params.conditionId] - Optional condition ID.
   * @param {number} [params.liquidity] - Optional liquidity parameter.
   */
  async predict({ marketId, side, confidence, marketTitle = 'Unknown Market', conditionId = '', liquidity = 0 }) {
    if (!marketId) throw new Error('❌ Missing marketId');
    if (typeof confidence !== 'number' || confidence <= 0 || confidence >= 1) {
      throw new Error('❌ Invalid confidence value (must be > 0 and < 1)');
    }
    
    const payload = JSON.stringify({
      marketId,
      marketTitle,
      conditionId,
      side,
      confidence,
      liquidity,
    });

    const timestamp = Date.now().toString();
    const signature = crypto.createHmac('sha256', this.apiSecret)
                            .update(timestamp + payload)
                            .digest('hex');

    const MAX_RETRIES = 2;
    let attempt = 0;
    
    while (attempt <= MAX_RETRIES) {
      try {
        const res = await fetch(`${this.baseUrl}/api/predictions/commit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'x-timestamp': timestamp,
            'x-signature': signature,
          },
          body: payload,
          signal: AbortSignal.timeout(8000), // 8 seconds timeout
        });

        if (!res.ok) {
          const errorText = await res.text();
          if (res.status === 401 && errorText.includes('signature')) {
            throw new Error(`❌ Invalid Signature: ${errorText}`);
          } else if (res.status === 401 && errorText.includes('API Key')) {
            throw new Error(`❌ Invalid API Key: ${errorText}`);
          } else {
            throw new Error(`❌ Prediction rejected (${res.status}): ${errorText}`);
          }
        }

        const data = await res.json();
        console.log(`\n✓ Prediction committed`);
        console.log(`  Prediction ID: ${data.predictionId}`);
        console.log(`  Market:        ${marketId} - ${marketTitle}`);
        console.log(`  Confidence:    ${(confidence * 100).toFixed(1)}%`);
        console.log(`  Timestamp:     ${new Date(Number(timestamp)).toISOString()}\n`);
        
        return data;

      } catch (e) {
        attempt++;
        if (e.name === 'TimeoutError' || e.message.includes('fetch')) {
          if (attempt <= MAX_RETRIES) {
            console.warn(`⚠️ Network error. Retrying prediction (${attempt}/${MAX_RETRIES})...`);
            await new Promise(r => setTimeout(r, 1000 * attempt));
            continue;
          }
          throw new Error(`❌ Could not reach Brier API: ${e.message}`);
        }
        throw e;
      }
    }
  }
}
