# @brier/sdk

Official Node.js SDK for the Brier Protocol Builder API.

## Installation

```bash
npm install @brier/sdk
```

## Quickstart

```typescript
import { BrierClient } from '@brier/sdk';

// 1. Initialize the client with the keys from your Builder Dashboard
const client = new BrierClient({
  apiKey: process.env.BRIER_API_KEY,
  apiSecret: process.env.BRIER_API_SECRET,
  // baseUrl is optional, defaults to 'https://brier.fi'
  // baseUrl: 'http://localhost:3000'
});

async function run() {
  // 2. Submit a prediction
  try {
    await client.predict({
      marketId: '2737480',       // Valid Polymarket Market ID
      marketTitle: 'Will Ethereum hit $3000?',
      side: 'YES',               // "YES" or "NO"
      confidence: 0.95           // Strict float between 0 and 1
    });
  } catch (error) {
    console.error('Failed to submit prediction:', error.message);
  }
}

run();
```

## Error Handling

The `BrierClient` will automatically retry network failures (up to 2 times). 
If a prediction is rejected for invalid authentication (e.g. bad API Key or signature), it will fail fast and throw a descriptive error:
* `❌ Invalid API Key`
* `❌ Invalid Signature`
* `❌ Invalid confidence value (must be > 0 and < 1)`
