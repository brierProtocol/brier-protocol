"""
Brier Executor SDK — Python client para enviar trade signals desde tu Bot (ADAN) al Brier Protocol.

Sync usage:
    import uuid
    with BrierExecutorClient(base_url="http://localhost:3001", secret_key="YOUR_SECRET") as client:
        result = client.send_trade_signal(
            trade_id=str(uuid.uuid4()),
            bot_id="cuid-of-your-bot",
            vault_address="0x123...",
            direction="LONG",
            entry_price=0.55,
            size=100.0,
            confidence=0.9,
            market_id="0xabc...",
            outcome_index=0
        )

Async usage (recomendado para bots concurrentes):
    async with AsyncBrierExecutorClient(base_url="http://localhost:3001", secret_key="YOUR_SECRET") as client:
        result = await client.send_trade_signal(...)
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Any, Literal

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

# ─── Excepciones ──────────────────────────────────────────────────────────────

class BrierError(Exception):
    """Base exception para errores del SDK."""

class BrierAuthError(BrierError):
    """HMAC inválido o timestamp expirado (HTTP 401)."""

class BrierRateLimitError(BrierError):
    """Rate limit excedido (HTTP 429). No hacer retry automático."""

class BrierForbiddenError(BrierError):
    """IP no autorizada (HTTP 403)."""

class BrierServerError(BrierError):
    """Error del servidor (HTTP 5xx). Se hace retry automático."""

# ─── Helpers internos ─────────────────────────────────────────────────────────

def _sign(secret: str, timestamp_ms: int, body: dict[str, Any]) -> str:
    body_str = json.dumps(body, separators=(",", ":"), ensure_ascii=False)
    payload = f"{timestamp_ms}.{body_str}".encode()
    return hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()

def _auth_headers(secret: str, body: dict[str, Any]) -> dict[str, str]:
    ts = int(time.time() * 1000)
    return {
        "Content-Type": "application/json",
        "x-timestamp": str(ts),
        "x-signature": _sign(secret, ts, body),
    }

def _raise_for_status(response: httpx.Response) -> dict[str, Any]:
    if response.status_code == 401:
        raise BrierAuthError(f"Auth failed: {response.text}")
    if response.status_code == 403:
        raise BrierForbiddenError(f"IP not allowed: {response.text}")
    if response.status_code == 429:
        raise BrierRateLimitError("Rate limit exceeded — slow down")
    if response.status_code >= 400 and response.status_code < 500:
        raise BrierError(f"Client error {response.status_code}: {response.text}")
    if response.status_code >= 500:
        raise BrierServerError(f"Server error {response.status_code}: {response.text}")
    response.raise_for_status()
    return response.json()

# ─── Cliente Síncrono ─────────────────────────────────────────────────────────

class BrierExecutorClient:
    def __init__(self, base_url: str, secret_key: str, timeout: float = 10.0):
        self._url = base_url.rstrip("/")
        self._secret = secret_key
        self._http = httpx.Client(timeout=timeout)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type(BrierServerError),
        reraise=True,
    )
    def send_trade_signal(
        self,
        trade_id: str,
        bot_id: str,
        vault_address: str,
        direction: Literal["LONG", "SHORT"],
        entry_price: float,
        size: float,
        confidence: float,
        market_id: str,
        outcome_index: int
    ) -> dict[str, Any]:
        """
        Envía un signal de trade al executor de Brier Protocol.
        Los parámetros mapean directamente a la interfaz SignalBody del servidor TypeScript.
        """
        body = {
            "tradeId": trade_id,
            "botId": bot_id,
            "vaultAddress": vault_address,
            "direction": direction,
            "entryPrice": entry_price,
            "size": size,
            "confidence": confidence,
            "marketId": market_id,
            "outcomeIndex": outcome_index
        }
        resp = self._http.post(
            f"{self._url}/api/v1/signals",
            content=json.dumps(body, separators=(",", ":")),
            headers=_auth_headers(self._secret, body),
        )
        return _raise_for_status(resp)

    def health_check(self) -> dict[str, Any]:
        resp = self._http.get(f"{self._url}/health")
        resp.raise_for_status()
        return resp.json()

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> "BrierExecutorClient":
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()

# ─── Cliente Asíncrono ────────────────────────────────────────────────────────

class AsyncBrierExecutorClient:
    def __init__(self, base_url: str, secret_key: str, timeout: float = 10.0):
        self._url = base_url.rstrip("/")
        self._secret = secret_key
        self._timeout = timeout
        self._http: httpx.AsyncClient | None = None

    async def _client(self) -> httpx.AsyncClient:
        if self._http is None:
            self._http = httpx.AsyncClient(timeout=self._timeout)
        return self._http

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type(BrierServerError),
        reraise=True,
    )
    async def send_trade_signal(
        self,
        trade_id: str,
        bot_id: str,
        vault_address: str,
        direction: Literal["LONG", "SHORT"],
        entry_price: float,
        size: float,
        confidence: float,
        market_id: str,
        outcome_index: int
    ) -> dict[str, Any]:
        body = {
            "tradeId": trade_id,
            "botId": bot_id,
            "vaultAddress": vault_address,
            "direction": direction,
            "entryPrice": entry_price,
            "size": size,
            "confidence": confidence,
            "marketId": market_id,
            "outcomeIndex": outcome_index
        }
        http = await self._client()
        resp = await http.post(
            f"{self._url}/api/v1/signals",
            content=json.dumps(body, separators=(",", ":")),
            headers=_auth_headers(self._secret, body),
        )
        return _raise_for_status(resp)

    async def health_check(self) -> dict[str, Any]:
        http = await self._client()
        resp = await http.get(f"{self._url}/health")
        resp.raise_for_status()
        return resp.json()

    async def close(self) -> None:
        if self._http:
            await self._http.aclose()
            self._http = None

    async def __aenter__(self) -> "AsyncBrierExecutorClient":
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self.close()
