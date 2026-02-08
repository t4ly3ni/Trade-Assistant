"""
Portfolio Calculator Tool — Computes portfolio allocations, share quantities,
and projected returns for a given risk profile and capital.
"""

import csv
import os
from typing import Type

from crewai.tools import BaseTool
from pydantic import BaseModel, Field


DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")

# Profile-based allocation templates
ALLOCATIONS = {
    "Conservateur": {
        "actions_stables": 0.20,
        "obligations": 0.50,
        "liquidite": 0.30,
        "actions_croissance": 0.00,
        "description": (
            "Profil conservateur : priorité à la préservation du capital. "
            "50% obligations, 20% actions stables (blue chips), 30% liquidité."
        ),
    },
    "Modéré": {
        "actions_stables": 0.40,
        "obligations": 0.30,
        "liquidite": 0.20,
        "actions_croissance": 0.10,
        "description": (
            "Profil modéré : équilibre entre rendement et sécurité. "
            "40% actions stables, 10% actions croissance, 30% obligations, "
            "20% liquidité."
        ),
    },
    "Dynamique": {
        "actions_stables": 0.30,
        "obligations": 0.10,
        "liquidite": 0.10,
        "actions_croissance": 0.50,
        "description": (
            "Profil dynamique : recherche de performance. "
            "50% actions croissance, 30% actions stables, 10% obligations, "
            "10% liquidité."
        ),
    },
}

# Blue-chip / stable BVMT tickers (by market cap & liquidity)
STABLE_STOCKS = ["BIAT", "SFBT", "PGH", "TJARI", "DH", "AB", "BT", "SAH"]
GROWTH_STOCKS = ["NAKL", "CITY", "ECYCL", "CC", "CELL", "PLAST", "LNDOR"]


class PortfolioInput(BaseModel):
    """Input for portfolio calculator."""
    profile: str = Field(
        description="Investor profile: 'Conservateur', 'Modéré', or 'Dynamique'."
    )
    capital: float = Field(
        description="Total investment capital in TND."
    )
    focus_stock: str = Field(
        default="",
        description="A specific stock the investor wants to include (ticker).",
    )


class PortfolioCalculatorTool(BaseTool):
    """Calculate portfolio allocation and specific stock picks for BVMT investing."""

    name: str = "bvmt_portfolio_calculator"
    description: str = (
        "Calculate an optimal portfolio allocation for a BVMT investor. "
        "Takes risk profile ('Conservateur'/'Modéré'/'Dynamique') and "
        "capital (TND). Returns allocation percentages and specific "
        "stock picks with quantities and costs."
    )
    args_schema: Type[BaseModel] = PortfolioInput

    def _run(self, profile: str, capital: float, focus_stock: str = "") -> str:
        alloc = ALLOCATIONS.get(profile)
        # Try normalized lookup if accented form not found
        if not alloc:
            norm_map = {"modere": "Modéré", "conservateur": "Conservateur", "dynamique": "Dynamique"}
            alloc = ALLOCATIONS.get(norm_map.get(profile.lower(), ""))
        if not alloc:
            return f"Unknown profile: {profile}. Use Conservateur/Modéré/Dynamique."

        # Load current prices
        prices = self._load_prices()

        lines = [
            f"═══ PORTFOLIO RECOMMENDATION ═══",
            f"Profile: {profile}",
            f"Capital: {capital:,.0f} TND",
            f"Strategy: {alloc['description']}",
            "",
            "── Asset Allocation ──",
            f"  Actions stables:     {alloc['actions_stables']:.0%} = {capital * alloc['actions_stables']:,.0f} TND",
            f"  Actions croissance:  {alloc['actions_croissance']:.0%} = {capital * alloc['actions_croissance']:,.0f} TND",
            f"  Obligations (bonds): {alloc['obligations']:.0%} = {capital * alloc['obligations']:,.0f} TND",
            f"  Liquidité (cash):    {alloc['liquidite']:.0%} = {capital * alloc['liquidite']:,.0f} TND",
            "",
        ]

        # Build stock picks
        stable_budget = capital * alloc["actions_stables"]
        growth_budget = capital * alloc["actions_croissance"]

        if stable_budget > 0:
            lines.append("── Actions Stables (Blue Chips) ──")
            picks = self._pick_stocks(STABLE_STOCKS, stable_budget, prices, focus_stock)
            for p in picks:
                lines.append(
                    f"  {p['ticker']:8s} | Prix: {p['price']:.2f} TND | "
                    f"Qté: {p['shares']} | Coût: {p['cost']:.2f} TND | "
                    f"Var: {p['variation']:+.2f}%"
                )
            lines.append(f"  Sous-total: {sum(p['cost'] for p in picks):,.2f} TND")
            lines.append("")

        if growth_budget > 0:
            lines.append("── Actions Croissance ──")
            picks = self._pick_stocks(GROWTH_STOCKS, growth_budget, prices, focus_stock)
            for p in picks:
                lines.append(
                    f"  {p['ticker']:8s} | Prix: {p['price']:.2f} TND | "
                    f"Qté: {p['shares']} | Coût: {p['cost']:.2f} TND | "
                    f"Var: {p['variation']:+.2f}%"
                )
            lines.append(f"  Sous-total: {sum(p['cost'] for p in picks):,.2f} TND")
            lines.append("")

        obligations_amt = capital * alloc["obligations"]
        liquidite_amt = capital * alloc["liquidite"]
        lines.extend([
            "── Obligations ──",
            f"  Emprunts d'État / SICAV obligataire: {obligations_amt:,.0f} TND",
            f"  Rendement estimé: 7-8% annuel",
            "",
            "── Liquidité ──",
            f"  Compte épargne / DAT: {liquidite_amt:,.0f} TND",
            f"  Disponible pour opportunités futures",
            "",
            "── Avertissement ──",
            "  Les performances passées ne préjugent pas des performances futures.",
            "  Investir en bourse comporte des risques de perte en capital.",
        ])

        return "\n".join(lines)

    def _load_prices(self) -> dict[str, dict]:
        path = os.path.join(DATA_DIR, "bvmt_market_data.csv")
        prices = {}
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8-sig") as f:
                for row in csv.DictReader(f):
                    ticker = row.get("Ticker", "").upper()
                    try:
                        prices[ticker] = {
                            "price": float(row.get("Dernier", "0") or 0),
                            "variation": float(row.get("Variation %", "0") or 0),
                            "valeur": row.get("Valeur", ""),
                        }
                    except ValueError:
                        pass
        return prices

    def _pick_stocks(
        self,
        candidates: list[str],
        budget: float,
        prices: dict,
        focus_stock: str = "",
    ) -> list[dict]:
        """Allocate budget across candidate stocks equally, prioritising focus_stock."""
        picks = []
        ordered = list(candidates)

        # Put focus stock first if it's in the candidate list
        if focus_stock:
            fs = focus_stock.upper()
            if fs in ordered:
                ordered.remove(fs)
                ordered.insert(0, fs)
            elif fs in prices:
                ordered.insert(0, fs)

        # Equal allocation across available stocks
        available = [t for t in ordered if t in prices and prices[t]["price"] > 0]
        if not available:
            return []

        per_stock = budget / min(len(available), 4)  # Max 4 stocks per category

        for ticker in available[:4]:
            p = prices[ticker]
            shares = int(per_stock / p["price"])
            if shares < 1:
                shares = 1
            cost = shares * p["price"]
            if cost <= budget:
                picks.append({
                    "ticker": ticker,
                    "valeur": p["valeur"],
                    "price": p["price"],
                    "shares": shares,
                    "cost": cost,
                    "variation": p["variation"],
                })
                budget -= cost

        return picks
