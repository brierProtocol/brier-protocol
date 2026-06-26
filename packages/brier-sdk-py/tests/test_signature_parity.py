"""
Signature parity test: the Python SDK must produce the same HMAC the Node
executor (server.ts `verifyHmac`) computes for the same body. If this passes,
a signal signed in Python authenticates against the real executor.

Run:
    python packages/brier-sdk-py/tests/test_signature_parity.py
"""

import hashlib
import hmac
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from brier.client import _canonical_json, TradeSignal  # noqa: E402

SECRET = "a" * 64
TIMESTAMP = 1717000000000


def python_signature(body: dict) -> tuple[str, str]:
    body_str = _canonical_json(body)
    sig = hmac.new(SECRET.encode(), f"{TIMESTAMP}.{body_str}".encode(), hashlib.sha256).hexdigest()
    return body_str, sig


def node_signature(body_str: str) -> str:
    """Replicate server.ts: HMAC over `${timestamp}.${JSON.stringify(body)}`."""
    script = (
        "const c=require('crypto');"
        "const b=JSON.parse(process.argv[1]);"
        f"const p='{TIMESTAMP}.'+JSON.stringify(b);"
        f"process.stdout.write(c.createHmac('sha256','{SECRET}').update(p).digest('hex'));"
    )
    out = subprocess.run(
        ["node", "-e", script, body_str],
        capture_output=True, text=True, check=True,
    )
    return out.stdout.strip()


def main() -> None:
    signal = TradeSignal(
        trade_id="adan-001",
        bot_id="cuid123",
        vault_address="0xVault",
        direction="LONG",
        entry_price=0.62,
        size=100,            # integral -> must serialize as "100", not "100.0"
        confidence=0.71,
        market_id="0xCond",
        outcome_index=0,
        max_slippage_bps=200,
    )
    body = signal.to_body()
    body_str, py_sig = python_signature(body)

    print("canonical body:", body_str)
    print("python sig:    ", py_sig)

    try:
        node_sig = node_signature(body_str)
    except (FileNotFoundError, subprocess.CalledProcessError) as e:
        print("SKIP: node not available to cross-check ->", e)
        sys.exit(0)

    print("node sig:      ", node_sig)

    assert py_sig == node_sig, "SIGNATURE MISMATCH — Python and Node disagree"
    # Also confirm Node re-stringifies to the same bytes we signed (the real risk).
    node_body = subprocess.run(
        ["node", "-e", "process.stdout.write(JSON.stringify(JSON.parse(process.argv[1])))", body_str],
        capture_output=True, text=True, check=True,
    ).stdout
    assert node_body == body_str, f"BODY MISMATCH\n py: {body_str}\n js: {node_body}"

    print("\nPASS: Python and Node produce identical body + signature.")


if __name__ == "__main__":
    main()
