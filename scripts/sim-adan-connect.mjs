// Simulates ADAN's exact Brier calls (heartbeat + predict) against the local
// server, using ADAN's real slug/key/secret. Proves the connection end-to-end
// without running ADAN's full trading stack.
import crypto from 'crypto'

const URL = process.env.BRIER_URL || 'http://localhost:3000'
const SLUG = process.env.BRIER_BOT_SLUG || 'adan-pred'
const KEY = process.env.BRIER_API_KEY
const SECRET = process.env.BRIER_API_SECRET
if (!KEY || !SECRET) throw new Error('Missing BRIER_API_KEY / BRIER_API_SECRET')

// 1. Heartbeat (like brier-reporter's 4s loop)
const hb = await fetch(`${URL}/api/bots/${SLUG}/heartbeat`, {
  method: 'POST',
  headers: { 'x-brier-key': KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ activity: 'Scanning BTC 5m — OI delta +, VPIN ok', constraints: 'Half-Kelly, edge>3%' }),
})
console.log('HEARTBEAT →', hb.status, await hb.text())

// 2. Predict (like brier-reporter's BrierClient.predict — sends confidence+side)
const payload = JSON.stringify({
  marketId: 'adan-sim-' + process.env.STAMP,
  marketTitle: 'BTC above 100k by Friday?',
  side: 'YES',
  confidence: 0.71,
  category: 'Crypto',
})
const ts = String(process.env.STAMP)
const sig = crypto.createHmac('sha256', SECRET).update(ts + payload).digest('hex')
const pr = await fetch(`${URL}/api/predictions/commit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, 'x-timestamp': ts, 'x-signature': sig },
  body: payload,
})
console.log('PREDICT   →', pr.status, await pr.text())
