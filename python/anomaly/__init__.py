"""
bvmt — Modular Python package for BVMT market data & analysis.
Designed for integration with a React/TypeScript frontend via FastAPI.

Modules:
    config   — Shared constants & thresholds
    models   — Pydantic data models (JSON-serializable)
    scraper  — Market data fetcher (pure functions)
    analyzer — Top hausse/baisse & market summary
    anomaly  — Anomaly detection (stateless + streaming engine)
    api      — FastAPI REST endpoints
"""

from .scraper import fetch_market_data, fetch_snapshots
from .analyzer import analyze_market
from .anomaly import detect_anomalies, AnomalyEngine

__all__ = [
    "fetch_market_data",
    "fetch_snapshots",
    "analyze_market",
    "detect_anomalies",
    "AnomalyEngine",
]
