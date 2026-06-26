"""
Brier Python SDK — quickstart.

Drop this signal-sending block where your agent currently does paper trading,
right after your sizing logic (Kelly, etc.) has given the green light.

Run:
    BRIER_EXECUTOR_URL=https://api.yourdomain.com \
    BRIER_BUILDER_SECRET=<hex> \
    BRIER_BOT_ID=<cuid> \
    BRIER_VAULT_ADDRESS=0x... \
    python quickstart.py
"""

import os
import uuid

from brier import BrierClient, TradeSignal, BrierError


def main() -> None:
    client = BrierClient(
        base_url=os.environ["BRIER_EXECUTOR_URL"],
        builder_secret=os.environ["BRIER_BUILDER_SECRET"],
    )

    # 1) Is the executor alive?
    print("health:", client.health_check())

    # 2) Your model produced a prediction. Turn it into a signed signal.
    p_ensemble = 0.71          # your model's probability
    side_is_yes = p_ensemble > 0.5
    stake = 100                # USDC, from your sizer

    signal = TradeSignal(
        trade_id=f"adan-{uuid.uuid4()}",   # unique per signal (replay protection)
        bot_id=os.environ["BRIER_BOT_ID"],
        vault_address=os.environ["BRIER_VAULT_ADDRESS"],
        direction="LONG" if side_is_yes else "SHORT",
        entry_price=0.62,                  # current market price (0..1)
        size=stake,
        confidence=p_ensemble,
        market_id="0xConditionId",         # Polymarket CTF conditionId
        outcome_index=0 if side_is_yes else 1,
        max_slippage_bps=200,              # 2% — executor sends a bounded FAK order
    )

    try:
        res = client.send_trade_signal(signal)
        print("accepted:", res)            # { "message": "...", "tradeId": "..." }
    except BrierError as e:
        # 4xx = bad request / auth / risk rejection. Log it; do not blind-retry.
        print(f"rejected ({e.status_code}): {e.message}")


if __name__ == "__main__":
    main()
