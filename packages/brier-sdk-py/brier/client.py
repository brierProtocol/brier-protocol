"""
Brier Protocol — Python SDK.

Connect any Python agent to the Brier Executor in minutes. The client signs
every request with HMAC-SHA256 (the scheme the executor verifies) and sends
trade signals to be executed on Polymarket.

Zero third-party dependencies — standard library only, so `pip install brier`
is instant and adds nothing to your agent's footprint.

Quickstart — your first prediction (no capital, no vault)
---------------------------------------------------------
    from brier import BrierClient

    client = BrierClient(
        base_url="https://brier.world",      # the Brier API
        builder_secret="bk_live_...",         # your bot's API key from the dashboard
    )

    client.predict(
        bot_id="your-bot-id",
        market_id="0xMarketConditionId",
        side="YES",
        probability=0.62,                     # your P(YES wins), strictly 0..1
    )

Going live (later, once your bot has a vault) needs the executor URL:

    client = BrierClient(
        base_url="https://brier.world",
        executor_url="https://executor.brier.world",
        builder_secret="bk_live_...",
    )
    client.send_trade_signal(TradeSignal(...))
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, asdict
from typing import Any, Optional


__all__ = ["BrierClient", "TradeSignal", "Prediction", "BrierError"]


class BrierError(Exception):
    """Raised when the Brier Executor rejects a request."""

    def __init__(self, status_code: int, message: str):
        super().__init__(f"Brier API Error [{status_code}]: {message}")
        self.status_code = status_code
        self.message = message


@dataclass
class TradeSignal:
    """A single trade signal for the executor.

    Mirrors the executor's SignalBody. `size` is in USDC; `entry_price` and
    `confidence` are probabilities in [0, 1] (Polymarket markets price 0..1).
    """

    trade_id: str
    bot_id: str
    vault_address: str
    direction: str                      # "LONG" | "SHORT"
    entry_price: float
    size: float
    confidence: float
    market_id: str
    outcome_index: int
    max_slippage_bps: Optional[int] = None   # e.g. 200 = 2% (executor caps at 1000)

    def to_body(self) -> dict[str, Any]:
        # Field names must match the executor's SignalBody (camelCase).
        body: dict[str, Any] = {
            "tradeId": self.trade_id,
            "botId": self.bot_id,
            "vaultAddress": self.vault_address,
            "direction": self.direction,
            "entryPrice": self.entry_price,
            "size": self.size,
            "confidence": self.confidence,
            "marketId": self.market_id,
            "outcomeIndex": self.outcome_index,
        }
        if self.max_slippage_bps is not None:
            body["maxSlippageBps"] = self.max_slippage_bps
        return body


@dataclass
class Prediction:
    """A prediction: a probability committed on a real market before it resolves.

    No capital, no vault. `probability` is P(your `side` wins), strictly in (0, 1).
    """

    bot_id: str
    market_id: str
    side: str                     # "YES" | "NO"
    probability: float
    market_title: Optional[str] = None

    def to_body(self) -> dict[str, Any]:
        body: dict[str, Any] = {
            "botId": self.bot_id,
            "marketId": self.market_id,
            "probability": self.probability,
            "side": self.side,
        }
        if self.market_title:
            body["marketTitle"] = self.market_title
        return body


def _js_number(n: Any) -> Any:
    """Render a number the way JavaScript's JSON.stringify would.

    The executor signs `JSON.stringify(request.body)` (Fastify re-serializes the
    parsed body with JS semantics). JS has no int/float split, so 100.0 becomes
    "100", not "100.0". We collapse integral floats to int so our signed string
    matches the executor's byte-for-byte.
    """
    if isinstance(n, bool):
        return n
    if isinstance(n, float) and n.is_integer():
        return int(n)
    return n


def _canonical_json(body: dict[str, Any]) -> str:
    """Serialize exactly like the executor will re-serialize it.

    - no spaces (separators=(',', ':')) to match JSON.stringify
    - integral floats collapsed to int (see _js_number)
    - ensure_ascii=False so non-ASCII matches JS output
    - insertion order preserved (do not sort keys)
    """
    normalized = {k: _js_number(v) for k, v in body.items()}
    return json.dumps(normalized, separators=(",", ":"), ensure_ascii=False)


class BrierClient:
    """HMAC-authenticated client for the Brier Executor."""

    def __init__(
        self,
        base_url: str,
        builder_secret: str,
        executor_url: Optional[str] = None,
        timeout: float = 15.0,
    ):
        if not base_url or not builder_secret:
            raise ValueError("BrierClient requires both base_url and builder_secret")
        self.base_url = base_url.rstrip("/")               # Brier API — predictions & reads
        self.executor_url = executor_url.rstrip("/") if executor_url else None  # live trading
        self._secret = builder_secret.encode("utf-8")
        self.timeout = timeout

    def _sign(self, timestamp: int, body_str: str) -> str:
        payload = f"{timestamp}.{body_str}".encode("utf-8")
        return hmac.new(self._secret, payload, hashlib.sha256).hexdigest()

    def _post_signed(self, path: str, body: dict[str, Any], max_retries: int = 3, base: Optional[str] = None) -> dict[str, Any]:
        body_str = _canonical_json(body)
        root = base or self.base_url

        last_err: Optional[Exception] = None
        for attempt in range(max_retries):
            timestamp = int(time.time() * 1000)  # milliseconds, like Date.now()
            signature = self._sign(timestamp, body_str)
            req = urllib.request.Request(
                f"{root}{path}",
                data=body_str.encode("utf-8"),
                method="POST",
                headers={
                    "Content-Type": "application/json",
                    "x-timestamp": str(timestamp),
                    "x-signature": signature,
                },
            )
            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    return json.loads(resp.read().decode("utf-8") or "{}")
            except urllib.error.HTTPError as e:
                detail = _read_error(e)
                # 4xx is the caller's fault — do not retry.
                if 400 <= e.code < 500:
                    raise BrierError(e.code, detail) from None
                last_err = BrierError(e.code, detail)
            except urllib.error.URLError as e:
                last_err = e

            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # 1s, 2s, 4s backoff

        if isinstance(last_err, BrierError):
            raise last_err
        raise BrierError(0, f"Request failed after {max_retries} attempts: {last_err}")

    def predict(self, *, bot_id: str, market_id: str, side: str, probability: float,
                market_title: Optional[str] = None, max_retries: int = 3) -> dict[str, Any]:
        """Commit a prediction on a real market — the no-capital path to a track record.

        Builds your Brier Score with no vault and no money. Resolved independently
        when the market settles. Raises BrierError on a 4xx or after exhausting retries.
        """
        body = Prediction(
            bot_id=bot_id, market_id=market_id, side=side,
            probability=probability, market_title=market_title,
        ).to_body()
        return self._post_signed("/api/v1/predictions", body, max_retries)

    def send_trade_signal(self, signal: TradeSignal, max_retries: int = 3) -> dict[str, Any]:
        """Send a signed trade signal to the executor (live trading — requires executor_url).

        Raises BrierError on a 4xx (bad request / auth / risk rejection) or after
        exhausting retries on 5xx / network errors.
        """
        if not self.executor_url:
            raise ValueError("send_trade_signal requires executor_url (live trading)")
        return self._post_signed("/api/v1/signals", signal.to_body(), max_retries, base=self.executor_url)

    def health_check(self) -> dict[str, Any]:
        """GET /health — no auth required."""
        req = urllib.request.Request(f"{self.base_url}/health", method="GET")
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode("utf-8") or "{}")
        except urllib.error.HTTPError as e:
            raise BrierError(e.code, _read_error(e)) from None


def _read_error(e: urllib.error.HTTPError) -> str:
    try:
        data = json.loads(e.read().decode("utf-8"))
        return data.get("error", e.reason)
    except Exception:
        return str(e.reason)
