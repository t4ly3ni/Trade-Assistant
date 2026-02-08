"""
Market Data Tool — Reads BVMT market data from CSV or live API.
Provides stock prices, volumes, order books, top movers.
"""

import csv
import os
from typing import Any, Type

from crewai.tools import BaseTool
from pydantic import BaseModel, Field


DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")


class MarketDataInput(BaseModel):
    """Input for the market data tool."""
    action: str = Field(
        description=(
            "Action to perform. One of: "
            "'overview' — full market snapshot, "
            "'stock' — single stock detail (requires ticker), "
            "'top_movers' — top gainers and losers, "
            "'search' — search stocks by name or ticker"
        )
    )
    ticker: str = Field(
        default="",
        description="Stock ticker symbol (e.g. 'SFBT', 'BIAT'). Required for 'stock' action.",
    )
    query: str = Field(
        default="",
        description="Search query for 'search' action.",
    )


class MarketDataTool(BaseTool):
    """Read BVMT market data from the local CSV data files."""

    name: str = "bvmt_market_data"
    description: str = (
        "Access Bourse de Tunis (BVMT) market data. "
        "Actions: 'overview' for full market, 'stock' for a specific ticker, "
        "'top_movers' for top gainers/losers, 'search' to find stocks by name."
    )
    args_schema: Type[BaseModel] = MarketDataInput

    def _run(self, action: str, ticker: str = "", query: str = "") -> str:
        if action == "overview":
            return self._market_overview()
        elif action == "stock":
            return self._stock_detail(ticker.upper())
        elif action == "top_movers":
            return self._top_movers()
        elif action == "search":
            return self._search_stocks(query)
        return f"Unknown action: {action}. Use overview/stock/top_movers/search."

    def _load_market_csv(self) -> list[dict]:
        path = os.path.join(DATA_DIR, "bvmt_market_data.csv")
        if not os.path.exists(path):
            return []
        with open(path, "r", encoding="utf-8-sig") as f:
            return list(csv.DictReader(f))

    def _load_top5_csv(self) -> list[dict]:
        path = os.path.join(DATA_DIR, "bvmt_top5_hausse_baisse.csv")
        if not os.path.exists(path):
            return []
        with open(path, "r", encoding="utf-8-sig") as f:
            return list(csv.DictReader(f))

    def _market_overview(self) -> str:
        rows = self._load_market_csv()
        if not rows:
            return "No market data available."

        active = [r for r in rows if int(r.get("Quantité", "0") or 0) > 0]
        total_vol = sum(float(r.get("Capitalisation", "0") or 0) for r in active)
        hausse = sum(1 for r in rows if float(r.get("Variation %", "0") or 0) > 0)
        baisse = sum(1 for r in rows if float(r.get("Variation %", "0") or 0) < 0)
        inchange = len(rows) - hausse - baisse

        lines = [
            "═══ BVMT MARKET OVERVIEW ═══",
            f"Total stocks: {len(rows)}",
            f"Active (traded): {len(active)}",
            f"Hausse: {hausse} | Baisse: {baisse} | Inchangé: {inchange}",
            f"Total capitalisation traded: {total_vol:,.0f} TND",
            "",
            "── Sample of active stocks ──",
        ]
        for r in active[:15]:
            var = float(r.get("Variation %", "0") or 0)
            sign = "▲" if var > 0 else ("▼" if var < 0 else "─")
            lines.append(
                f"  {r['Ticker']:8s} | {r['Valeur']:25s} | "
                f"Last: {r['Dernier']:>8s} | Var: {sign}{var:+.2f}% | "
                f"Vol: {r.get('Quantité', '0')}"
            )
        return "\n".join(lines)

    def _stock_detail(self, ticker: str) -> str:
        rows = self._load_market_csv()
        match = [r for r in rows if r.get("Ticker", "").upper() == ticker]
        if not match:
            # Try partial name match
            match = [r for r in rows if ticker.upper() in r.get("Valeur", "").upper()]
        if not match:
            return f"Stock '{ticker}' not found in BVMT data."

        s = match[0]
        return (
            f"═══ {s['Valeur']} ({s['Ticker']}) ═══\n"
            f"ISIN: {s['ISIN']}\n"
            f"Groupe: {s['Groupe']}\n"
            f"Statut: {s.get('Statut', '').strip()}\n"
            f"Cours de référence: {s['Cours de référence']} TND\n"
            f"Ouverture: {s['Ouverture']} TND\n"
            f"Dernier: {s['Dernier']} TND\n"
            f"Variation: {s['Variation %']}%\n"
            f"Plus haut: {s['P.Haut']} TND\n"
            f"Plus bas: {s['P.Bas']} TND\n"
            f"Seuil haut: {s['S.Haut']} TND\n"
            f"Seuil bas: {s['S.Bas']} TND\n"
            f"Quantité échangée: {s.get('Quantité', '0')}\n"
            f"Capitalisation: {s.get('Capitalisation', '0')} TND\n"
            f"Achat: {s['Achat']} (Qté: {s['Qté.A']}, Ordres: {s['Ord.A']})\n"
            f"Vente: {s['Vente']} (Qté: {s['Qté.V']}, Ordres: {s['Ord.V']})\n"
            f"Heure: {s['Heure']}"
        )

    def _top_movers(self) -> str:
        rows = self._load_top5_csv()
        if not rows:
            return "No top movers data available."

        hausse = [r for r in rows if r.get("Type") == "HAUSSE"]
        baisse = [r for r in rows if r.get("Type") == "BAISSE"]

        lines = ["═══ TOP MOVERS ═══", "", "── Top Hausse ──"]
        for r in hausse:
            lines.append(
                f"  {r['Ticker']:8s} | {r['Valeur']:25s} | "
                f"Last: {r['Dernier']:>8s} | Var: +{r['Variation %']}%"
            )
        lines.append("\n── Top Baisse ──")
        for r in baisse:
            lines.append(
                f"  {r['Ticker']:8s} | {r['Valeur']:25s} | "
                f"Last: {r['Dernier']:>8s} | Var: {r['Variation %']}%"
            )
        return "\n".join(lines)

    def _search_stocks(self, query: str) -> str:
        rows = self._load_market_csv()
        q = query.upper()
        matches = [r for r in rows
                    if q in r.get("Valeur", "").upper()
                    or q in r.get("Ticker", "").upper()]
        if not matches:
            return f"No stocks matching '{query}'."

        lines = [f"═══ Search results for '{query}' ({len(matches)} found) ═══"]
        for r in matches:
            var = float(r.get("Variation %", "0") or 0)
            lines.append(
                f"  {r['Ticker']:8s} | {r['Valeur']:25s} | "
                f"Last: {r['Dernier']:>8s} | Var: {var:+.2f}%"
            )
        return "\n".join(lines)
