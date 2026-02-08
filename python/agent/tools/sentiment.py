"""
Sentiment Analysis Tool — Uses the existing sentiment module to analyze
news sentiment for BVMT stocks.
"""

import os
import sys
from typing import Type

from crewai.tools import BaseTool
from pydantic import BaseModel, Field

# Ensure the python/ dir is on sys.path so we can import `sentiment`
_repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

from sentiment.system import TradingSentimentSystem


# Module-level singleton
_sentiment_system: TradingSentimentSystem | None = None


def _get_sentiment_system() -> TradingSentimentSystem:
    global _sentiment_system
    if _sentiment_system is None:
        _sentiment_system = TradingSentimentSystem()
    return _sentiment_system


class SentimentInput(BaseModel):
    """Input for sentiment analysis tool."""
    stock_symbol: str = Field(
        description=(
            "Stock ticker symbol to analyze sentiment for "
            "(e.g. 'SFBT', 'BIAT', 'ATB', 'TUNTEL'). "
            "Uses existing stock symbol list."
        )
    )
    max_articles: int = Field(
        default=5,
        description="Maximum number of news articles to analyze (default 5).",
    )


class SentimentAnalysisTool(BaseTool):
    """Analyze news sentiment for a BVMT stock using the sentiment engine."""

    name: str = "bvmt_sentiment_analysis"
    description: str = (
        "Analyze news sentiment for a Tunisian stock. "
        "Returns overall sentiment (positive/negative/neutral), "
        "confidence score, article summaries, and explanations."
    )
    args_schema: Type[BaseModel] = SentimentInput

    def _run(self, stock_symbol: str, max_articles: int = 5) -> str:
        system = _get_sentiment_system()

        sym = stock_symbol.upper()
        # Check if symbol is in the supported list
        supported = system.scraper.stock_symbols
        if sym not in [s.upper() for s in supported]:
            return (
                f"Symbol '{sym}' is not in the sentiment analysis database.\n"
                f"Supported symbols: {', '.join(supported)}\n"
                f"Note: Sentiment data is available for major BVMT stocks only."
            )

        try:
            result = system.analyze_stock(sym, max_articles)
        except Exception as e:
            return f"Sentiment analysis failed for {sym}: {e}"

        if not result.get("articles_analyzed"):
            return f"No news articles found for {stock_symbol}."

        lines = [
            f"═══ SENTIMENT ANALYSIS: {result['symbol']} ═══",
            f"Overall sentiment: {result['sentiment'].upper()}",
            f"Score: {result['overall_score']} (scale: -1.0 to +1.0)",
            f"Confidence: {result['confidence']:.1%}",
            f"Articles analyzed: {result['articles_analyzed']}",
            "",
            "── Distribution ──",
            f"  Positive: {result['sentiment_distribution']['positive']}",
            f"  Negative: {result['sentiment_distribution']['negative']}",
            f"  Neutral:  {result['sentiment_distribution']['neutral']}",
            "",
            f"── Explanation ──",
            f"  {result['overall_explanation']}",
            "",
            "── Article Details ──",
        ]
        for a in result.get("articles", []):
            lines.append(
                f"\n  Title: {a['title']}\n"
                f"  Source: {a['source']} ({a['language']})\n"
                f"  Sentiment: {a['sentiment_label']} "
                f"(score={a['sentiment_score']:.2f}, "
                f"conf={a['confidence']:.1%})\n"
                f"  Explanation: {a.get('explanation', 'N/A')}"
            )

        return "\n".join(lines)
