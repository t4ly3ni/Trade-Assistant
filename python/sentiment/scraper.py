"""
Mock news scraper for Tunisian financial news.
Generates realistic demo articles for BVMT stocks.
"""

import random
from datetime import datetime, timedelta
from typing import Any, Dict, List

from .config import COMPANY_DATA, NEWS_SOURCES, STOCK_SYMBOLS


class NewsScraper:
    """Generates mock French/Arabic financial news articles for demo."""

    def __init__(self) -> None:
        self.stock_symbols = STOCK_SYMBOLS
        self.company_data = COMPANY_DATA
        self.sources = NEWS_SOURCES

    # ── Public API ──────────────────────────────────────────────────────────

    def scrape_news(self, source: str = "all", max_articles: int = 10) -> List[Dict[str, Any]]:
        """Return mock news articles from selected sources."""
        if source == "all":
            keys = ["kapitalis", "ilboursa"]
        elif source in self.sources:
            keys = [source]
        else:
            keys = ["kapitalis"]

        articles: List[Dict[str, Any]] = []
        for src_key in keys:
            info = self.sources[src_key]
            lang = info["language"]
            count = random.randint(2, min(4, max_articles))

            for i in range(count):
                symbol = random.choice(self.stock_symbols)
                data = (
                    self._french_article(symbol)
                    if lang == "fr"
                    else self._arabic_article(symbol)
                )
                articles.append({
                    "id": f"{src_key}_{i}_{datetime.now().timestamp()}",
                    "title": data["title"],
                    "content": data["content"],
                    "source": info["name"],
                    "source_url": info["url"],
                    "published_date": self._random_date().isoformat(),
                    "scraped_date": datetime.now().isoformat(),
                    "language": lang,
                    "mentioned_stocks": [symbol],
                    "keywords": data["keywords"],
                    "base_sentiment_score": data["base_score"],
                })
        return articles

    def get_articles_for_stock(
        self, symbol: str, max_articles: int = 5
    ) -> List[Dict[str, Any]]:
        """Return articles that mention *symbol*.

        The mock scraper generates random stocks per article, so we generate
        a larger pool and also force-generate some articles for the requested
        symbol to ensure we always return results.
        """
        pool = self.scrape_news("all", max_articles * 3)

        # Force-generate articles for the target symbol so we always have data
        forced: List[Dict[str, Any]] = []
        lang_cycle = ["fr", "ar"]
        for idx in range(max_articles):
            lang = lang_cycle[idx % 2]
            data = (
                self._french_article(symbol)
                if lang == "fr"
                else self._arabic_article(symbol)
            )
            src_key = "kapitalis" if lang == "fr" else "ilboursa"
            info = self.sources[src_key]
            forced.append({
                "id": f"{src_key}_forced_{idx}_{datetime.now().timestamp()}",
                "title": data["title"],
                "content": data["content"],
                "source": info["name"],
                "source_url": info["url"],
                "published_date": self._random_date().isoformat(),
                "scraped_date": datetime.now().isoformat(),
                "language": lang,
                "mentioned_stocks": [symbol],
                "keywords": data["keywords"],
                "base_sentiment_score": data["base_score"],
            })

        # Merge: pick matching articles from pool first, then fill from forced
        matched = [
            a for a in pool
            if symbol.upper() in [s.upper() for s in a["mentioned_stocks"]]
        ]
        result = matched[:max_articles]
        for a in forced:
            if len(result) >= max_articles:
                break
            result.append(a)
        return result[:max_articles]

    def extract_stock_symbols(self, text: str) -> List[str]:
        """Extract known stock symbols mentioned in text."""
        text_lower = text.lower()
        found: List[str] = []
        for sym in self.stock_symbols:
            if sym.lower() in text_lower:
                found.append(sym)
        for sym, data in self.company_data.items():
            if data["fr"].lower() in text_lower and sym not in found:
                found.append(sym)
            if data["ar"] in text and sym not in found:
                found.append(sym)
        return list(set(found))

    # ── Article generators ─────────────────────────────────────────────────

    def _french_article(self, symbol: str) -> Dict[str, Any]:
        cd = self.company_data[symbol]
        templates = [
            (f"{cd['fr']} annonce des résultats exceptionnels pour le trimestre",
             ["excellent", "positif", "croissance", "profit", "réussite", "record"], 0.8),
            (f"{cd['fr']} fait face à des défis dans le secteur {cd['sector']}",
             ["défis", "difficultés", "ralentissement", "problème", "crise", "risque"], -0.6),
            (f"Nouveau contrat pour {cd['fr']} avec un partenaire international",
             ["contrat", "partenariat", "accord", "collaboration", "opportunité", "développement"], 0.7),
            (f"{cd['fr']} maintient une position stable malgré le contexte économique",
             ["stable", "maintien", "résilient", "équilibre", "pérennité", "durable"], 0.1),
            (f"Baisse des ventes pour {cd['fr']} au dernier trimestre",
             ["baisse", "réduction", "déclin", "chute", "perte", "ralentissement"], -0.5),
        ]
        title, kw, base = random.choice(templates)
        content = (
            f"{title}. La société a démontré une performance remarquable dans un "
            f"environnement complexe. Les analystes suivent avec attention l'évolution "
            f"de {cd['fr']}. Le secteur {cd['sector']} connaît des transformations "
            f"importantes. Les investisseurs anticipent des développements futurs."
        )
        return {"title": title, "content": content, "keywords": kw, "base_score": base}

    def _arabic_article(self, symbol: str) -> Dict[str, Any]:
        cd = self.company_data[symbol]
        templates = [
            (f"{cd['ar']} تعلن عن نتائج استثنائية للربع",
             ["ممتاز", "إيجابي", "نمو", "ربح", "نجاح", "قياسي"], 0.8),
            (f"{cd['ar']} تواجه تحديات في قطاع {cd['sector']}",
             ["تحديات", "صعوبات", "تباطؤ", "مشكلة", "أزمة", "خطر"], -0.6),
            (f"عقد جديد لـ {cd['ar']} مع شريك دولي",
             ["عقد", "شراكة", "اتفاق", "تعاون", "فرصة", "تطوير"], 0.7),
            (f"{cd['ar']} تحافظ على وضع مستقر رغم الظروف الاقتصادية",
             ["مستقر", "ثبات", "مرونة", "توازن", "استدامة", "دائم"], 0.1),
            (f"انخفاض مبيعات {cd['ar']} في الربع الأخير",
             ["انخفاض", "تراجع", "هبوط", "خسارة", "عجز", "تباطؤ"], -0.5),
        ]
        title, kw, base = random.choice(templates)
        content = (
            f"{title}. أظهرت الشركة أداءً ملحوظاً في بيئة معقدة. "
            f"يتبع المحللون بتأنّ تطورات {cd['ar']}. "
            f"يشهد قطاع {cd['sector']} تحولات كبيرة. "
            f"يتوقع المستثمرون تطورات مستقبلية للشركة."
        )
        return {"title": title, "content": content, "keywords": kw, "base_score": base}

    @staticmethod
    def _random_date(days_back: int = 7) -> datetime:
        now = datetime.now()
        return now - timedelta(
            days=random.randint(0, days_back),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
        )
