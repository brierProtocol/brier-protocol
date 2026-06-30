"""Brier Protocol Python SDK — connect your agent to the Brier Executor."""

from .client import BrierClient, TradeSignal, Prediction, BrierError

__version__ = "0.1.0"
__all__ = ["BrierClient", "TradeSignal", "Prediction", "BrierError"]
