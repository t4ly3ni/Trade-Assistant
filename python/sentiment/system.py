"""
Orchestration: combines scraper + analyzer into a unified system.
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from .analyzer import SentimentAnalyzer
from .scraper import NewsScraper
from .config import POSITIVE_THRESHOLD, NEGATIVE_THRESHOLD


class TradingSentimentSystem:
    """Main system that combines sentiment analyzer and news scraper."""

    def __init__(self) -> None:
        self.analyzer = SentimentAnalyzer()
        self.scraper = NewsScraper()

    def analyze_stock(self, symbol: str, max_articles: int = 5) -> Dict[str, Any]:
        """Analyze sentiment for a specific stock symbol."""
        articles = self.scraper.get_articles_for_stock(symbol, max_articles)
        if not articles:
            return self._empty_result(symbol)

        analyzed: List[Dict[str, Any]] = []
        scores: List[float] = []

        for article in articles:
            sentiment = self.analyzer.analyze_sentiment(article["content"], symbol)
            analyzed.append({
                "id": article["id"],
                "title": article["title"],
                "source": article["source"],
                "language": article["language"],
                "published_date": article["published_date"],
                "sentiment_score": sentiment["score"],
                "sentiment_label": sentiment["label"],
                "confidence": sentiment["confidence"],
                "analysis_method": sentiment["method"],
                "positive_keywords": sentiment.get("positive_keywords", 0),
                "negative_keywords": sentiment.get("negative_keywords", 0),
                "explanation": sentiment.get("explanation"),
                "explanation_detail": sentiment.get("explanation_detail"),
            })
            scores.append(sentiment["score"])

        overall = sum(scores) / len(scores)
        if overall > POSITIVE_THRESHOLD:
            label = "positive"
        elif overall < NEGATIVE_THRESHOLD:
            label = "negative"
        else:
            label = "neutral"

        avg_conf = sum(a["confidence"] for a in analyzed) / len(analyzed)

        dist = {
            "positive": sum(1 for a in analyzed if a["sentiment_label"] == "positive"),
            "negative": sum(1 for a in analyzed if a["sentiment_label"] == "negative"),
            "neutral":  sum(1 for a in analyzed if a["sentiment_label"] == "neutral"),
        }

        explanation = (
            f"Overall {label} sentiment from {len(analyzed)} articles. "
            f"Distribution: {dist['positive']} positive, "
            f"{dist['negative']} negative, {dist['neutral']} neutral."
        )
        if analyzed and analyzed[0].get("explanation"):
            explanation += f" Example: {analyzed[0]['explanation']}"

        return {
            "symbol": symbol,
            "overall_score": round(overall, 3),
            "sentiment": label,
            "confidence": round(avg_conf, 3),
            "articles_analyzed": len(analyzed),
            "sentiment_distribution": dist,
            "overall_explanation": explanation,
            "analysis_timestamp": datetime.now().isoformat(),
            "articles": analyzed,
        }

    def analyze_multiple(
        self, symbols: List[str], max_articles: int = 3
    ) -> Dict[str, Any]:
        """Analyze sentiment for multiple stock symbols."""
        return {s: self.analyze_stock(s, max_articles) for s in symbols}

    def export_json(
        self, results: Dict, path: str = "sentiment_results.json"
    ) -> None:
        """Export results to a JSON file."""
        with open(path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

    @staticmethod
    def _empty_result(symbol: str) -> Dict[str, Any]:
        return {
            "symbol": symbol,
            "overall_score": 0.0,
            "sentiment": "neutral",
            "confidence": 0.0,
            "articles_analyzed": 0,
            "sentiment_distribution": {"positive": 0, "negative": 0, "neutral": 0},
            "overall_explanation": "",
            "analysis_timestamp": datetime.now().isoformat(),
            "articles": [],
        }
