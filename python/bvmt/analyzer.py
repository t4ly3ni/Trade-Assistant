"""
bvmt.analyzer — Top hausse/baisse detection & market summary
Pure functions returning typed models — no print, no file I/O.
"""

from datetime import datetime

from .models import (
    StockData,
    TopMover,
    MarketSummary,
    AnalysisResponse,
)


def analyze_market(stocks: list[StockData], top_n: int = 5) -> AnalysisResponse:
    """
    Analyze a list of stocks to find top gainers, losers, and market summary.
    Returns an AnalysisResponse ready for JSON serialization.
    """
    active = [s for s in stocks if s.quantite > 0 and s.variation != 0]

    # Sort for top hausse / baisse
    sorted_hausse = sorted(active, key=lambda s: s.variation, reverse=True)
    sorted_baisse = sorted(active, key=lambda s: s.variation)

    top_hausse = [
        TopMover(
            valeur=s.valeur,
            ticker=s.ticker,
            groupe=s.groupe,
            reference=s.reference,
            dernier=s.dernier,
            variation=s.variation,
            quantite=s.quantite,
            capitalisation=s.capitalisation,
        )
        for s in sorted_hausse[:top_n]
    ]

    top_baisse = [
        TopMover(
            valeur=s.valeur,
            ticker=s.ticker,
            groupe=s.groupe,
            reference=s.reference,
            dernier=s.dernier,
            variation=s.variation,
            quantite=s.quantite,
            capitalisation=s.capitalisation,
        )
        for s in sorted_baisse[:top_n]
    ]

    # Market summary
    hausse_count = sum(1 for s in stocks if s.variation > 0)
    baisse_count = sum(1 for s in stocks if s.variation < 0)
    inchange_count = sum(1 for s in stocks if s.variation == 0)
    active_count = sum(1 for s in stocks if s.quantite > 0)
    volume_total = sum(s.capitalisation for s in stocks)

    summary = MarketSummary(
        hausses=hausse_count,
        baisses=baisse_count,
        inchanges=inchange_count,
        actives=active_count,
        total=len(stocks),
        volume_total=volume_total,
    )

    return AnalysisResponse(
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        top_hausse=top_hausse,
        top_baisse=top_baisse,
        summary=summary,
    )
