"""
bvmt.models — Shared Pydantic models for API responses & internal data
"""

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional


# ─── Enums ───────────────────────────────────────────────────────────

class AlertSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class AnomalyType(str, Enum):
    VOLUME_SPIKE = "VOLUME_SPIKE"
    PRICE_ANOMALY = "PRICE_ANOMALY"
    ORDER_IMBALANCE = "ORDER_IMBALANCE"
    SPREAD_ANOMALY = "SPREAD_ANOMALY"
    RAPID_PRICE_MOVE = "RAPID_PRICE_MOVE"
    PATTERN_SUSPECT = "PATTERN_SUSPECT"


# ─── Market Data ─────────────────────────────────────────────────────

class StockData(BaseModel):
    """Flat representation of a single stock's market data"""
    isin: str = ""
    valeur: str = ""
    ticker: str = ""
    groupe: str = ""
    statut: str = ""
    ord_a: int = 0
    qty_a: int = 0
    achat: float = 0.0
    vente: float = 0.0
    qty_v: int = 0
    ord_v: int = 0
    reference: float = Field(0.0, validation_alias="cours_de_reference")
    cto: float = 0.0
    vto: float = 0.0
    qto: float = 0.0
    ouverture: float = 0.0
    dernier: float = 0.0
    variation: float = 0.0
    dern_qty: int = 0
    quantite: int = 0
    capitalisation: float = 0.0
    p_haut: float = 0.0
    p_bas: float = 0.0
    s_haut: float = 0.0
    s_bas: float = 0.0
    heure: str = ""

    model_config = {"populate_by_name": True}


class MarketResponse(BaseModel):
    """Full market data response"""
    timestamp: str
    count: int
    stocks: list[StockData]


# ─── Analysis ────────────────────────────────────────────────────────

class TopMover(BaseModel):
    valeur: str
    ticker: str
    groupe: str
    reference: float
    dernier: float
    variation: float
    quantite: int
    capitalisation: float


class MarketSummary(BaseModel):
    hausses: int
    baisses: int
    inchanges: int
    actives: int
    total: int
    volume_total: float


class AnalysisResponse(BaseModel):
    timestamp: str
    top_hausse: list[TopMover]
    top_baisse: list[TopMover]
    summary: MarketSummary


# ─── Anomaly Detection ──────────────────────────────────────────────

class Alert(BaseModel):
    timestamp: str
    isin: str
    valeur: str
    anomaly_type: str
    severity: str
    message: str
    current_value: float
    threshold: float
    details: str = ""


class AnomalyReport(BaseModel):
    timestamp: str
    total_alerts: int
    alerts: list[Alert]
    by_type: dict[str, int]
    by_severity: dict[str, int]
    top_flagged: list[dict]


# ─── Snapshot (for streaming engine) ────────────────────────────────

class StockSnapshot(BaseModel):
    timestamp: str
    isin: str
    valeur: str
    ticker: str
    last: float
    close: float
    change: float
    volume: int
    caps: float
    ask: float
    bid: float
    ask_qty: int
    bid_qty: int
    ask_ord: int
    bid_ord: int
    high: float
    low: float
    status: str
    cto: float
    vto: float
