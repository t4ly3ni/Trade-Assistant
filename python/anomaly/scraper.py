"""
bvmt.scraper — Market data fetcher
Exposes pure functions that return typed models (no print, no file I/O).
"""

import requests
from datetime import datetime

from .config import API_URL, API_HEADERS
from .models import StockData, MarketResponse, StockSnapshot


def fetch_market_data() -> MarketResponse:
    """
    Fetch all stocks from the BVMT REST API.
    Returns a MarketResponse with timestamp, count, and list of StockData.
    """
    resp = requests.get(API_URL, headers=API_HEADERS, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    markets = data.get("markets", [])

    stocks: list[StockData] = []
    for m in markets:
        ref = m.get("referentiel", {})
        lim = m.get("limit", {})
        stocks.append(StockData(
            isin=m.get("isin", ""),
            valeur=ref.get("stockName", ""),
            ticker=ref.get("ticker", ""),
            groupe=ref.get("valGroup", ""),
            statut=m.get("status", "").strip(),
            ord_a=int(lim.get("askOrd", 0)),
            qty_a=int(lim.get("askQty", 0)),
            achat=float(lim.get("ask", 0)),
            vente=float(lim.get("bid", 0)),
            qty_v=int(lim.get("bidQty", 0)),
            ord_v=int(lim.get("bidOrd", 0)),
            cours_de_reference=float(m.get("close", 0)),
            cto=float(m.get("cto", 0)),
            vto=float(m.get("vto", 0)),
            qto=float(m.get("qto", 0) or 0),
            ouverture=float(m.get("open", 0)),
            dernier=float(m.get("last", 0)),
            variation=float(m.get("change", 0)),
            dern_qty=int(m.get("trVolume", 0)),
            quantite=int(m.get("volume", 0)),
            capitalisation=float(m.get("caps", 0)),
            p_haut=float(m.get("high", 0)),
            p_bas=float(m.get("low", 0)),
            s_haut=float(m.get("max", 0)),
            s_bas=float(m.get("min", 0)),
            heure=m.get("time", ""),
        ))

    return MarketResponse(
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        count=len(stocks),
        stocks=stocks,
    )


def fetch_snapshots() -> list[StockSnapshot]:
    """
    Fetch current market data and return as list of StockSnapshot
    (used by the anomaly engine for streaming).
    """
    resp = requests.get(API_URL, headers=API_HEADERS, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    markets = data.get("markets", [])
    snapshots: list[StockSnapshot] = []

    for m in markets:
        ref = m.get("referentiel", {})
        lim = m.get("limit", {})
        snapshots.append(StockSnapshot(
            timestamp=now,
            isin=m.get("isin", ""),
            valeur=ref.get("stockName", ""),
            ticker=ref.get("ticker", ""),
            last=float(m.get("last", 0)),
            close=float(m.get("close", 0)),
            change=float(m.get("change", 0)),
            volume=int(m.get("volume", 0)),
            caps=float(m.get("caps", 0)),
            ask=float(lim.get("ask", 0)),
            bid=float(lim.get("bid", 0)),
            ask_qty=int(lim.get("askQty", 0)),
            bid_qty=int(lim.get("bidQty", 0)),
            ask_ord=int(lim.get("askOrd", 0)),
            bid_ord=int(lim.get("bidOrd", 0)),
            high=float(m.get("high", 0)),
            low=float(m.get("low", 0)),
            status=m.get("status", "").strip(),
            cto=float(m.get("cto", 0)),
            vto=float(m.get("vto", 0)),
        ))

    return snapshots
