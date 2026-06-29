# Brier Python SDK

Connect any Python agent to **Brier Protocol** in minutes. Sign trade signals
with HMAC and send them to the Brier Executor, which routes them to Polymarket
and records the prediction on-chain for scoring.

Zero third-party dependencies — standard library only.

## Install

```bash
pip install brier
# or, from this repo:
pip install ./packages/brier-sdk-py
```

## Quickstart (5 steps)

```python
from brier import BrierClient, TradeSignal
import uuid

# 1. Create a client with your builder secret (from the Brier dashboard).
client = BrierClient(
    base_url="https://api.yourdomain.com",
    builder_secret="<64-char hex secret>",
)

# 2. (optional) Check the executor is up.
client.health_check()

# 3. Turn your model's prediction into a signal.
signal = TradeSignal(
    trade_id=f"adan-{uuid.uuid4()}",   # unique per signal
    bot_id="<your bot cuid>",
    vault_address="0xYourVault",
    direction="LONG",                  # or "SHORT"
    entry_price=0.62,                  # market price 0..1
    size=100,                          # USDC
    confidence=0.71,                   # your model's probability
    market_id="0xConditionId",
    outcome_index=0,
    max_slippage_bps=200,              # 2%
)

# 4. Send it. The client signs (HMAC-SHA256) and POSTs to /api/v1/signals.
res = client.send_trade_signal(signal)

# 5. The executor validates, risk-checks, and queues it for execution.
print(res)   # { "message": "Signal accepted and queued for execution", "tradeId": "..." }
```

## Errors

`send_trade_signal` raises `BrierError` on a `4xx` (bad request, invalid
signature, expired timestamp, or risk rejection) and retries `5xx` / network
errors with exponential backoff (default 3 attempts).

```python
from brier import BrierError

try:
    client.send_trade_signal(signal)
except BrierError as e:
    print(e.status_code, e.message)
```

## How auth works

Each request carries two headers:

- `x-timestamp` — milliseconds since epoch (`int(time.time() * 1000)`)
- `x-signature` — `HMAC_SHA256(secret, f"{timestamp}.{body}")` as hex

The executor recomputes the HMAC over `timestamp.JSON.stringify(body)` and
rejects anything older than 5 minutes (replay protection). The SDK serializes
the body to match `JSON.stringify` exactly — no spaces, integral floats
collapsed to integers — so signatures match byte-for-byte across Python and
the Node executor.

> Note on precision: keep numeric fields to a few decimals (round before
> sending). Very high-precision floats can serialize differently between
> Python and JS and break the signature.

## Local parity test

```bash
python packages/brier-sdk-py/tests/test_signature_parity.py
```

Verifies the SDK's HMAC matches Node's `crypto.createHmac` for the same body.
