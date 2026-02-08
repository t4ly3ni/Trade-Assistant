"""
Sentiment Analyzer for Tunisian Stock Market News.
Supports French, Arabic, English with explainability and context-aware scoring.
"""

import re
from typing import Any, Dict, List, Tuple

from .config import (
    AR_NEGATIVE, AR_POSITIVE,
    BASE_CONFIDENCE, COMPANY_KEYWORDS,
    CONTEXT_DAMPENING_FACTOR, CONTEXT_MODIFIERS,
    EN_NEGATIVE, EN_POSITIVE,
    FR_NEGATIVE, FR_POSITIVE, FR_POSITIVE_STRONG,
    LOW_KEYWORD_COUNT, LOW_KEYWORD_DAMPENING,
    MAX_CONFIDENCE, MAX_KEYWORD_OCCURRENCES,
    NEGATIVE_THRESHOLD, NEUTRAL_WORDS,
    POSITIVE_NEUTRAL_CONTEXT_WORDS, POSITIVE_THRESHOLD,
    SCORE_SOFTENING_FACTOR, SCORE_SOFTENING_THRESHOLD,
)


# ── Helpers ─────────────────────────────────────────────────────────────────

def _is_arabic(c: str) -> bool:
    """Check if character is in Arabic Unicode blocks."""
    code = ord(c)
    return (
        0x0600 <= code <= 0x06FF
        or 0x0750 <= code <= 0x077F
        or 0x08A0 <= code <= 0x08FF
        or 0xFB50 <= code <= 0xFDFF
        or 0xFE70 <= code <= 0xFEFF
    )


def get_sentiment_intensity(score: float) -> str:
    """Return human-readable intensity level for a sentiment score."""
    v = abs(score)
    if v > 0.8:
        return "Very strong"
    if v > 0.6:
        return "Strong"
    if v > 0.3:
        return "Moderate"
    if v > 0.1:
        return "Slight"
    return "Neutral"


# ── Analyzer ────────────────────────────────────────────────────────────────

class SentimentAnalyzer:
    """Keyword-based sentiment analyzer — no ML dependencies."""

    def __init__(self) -> None:
        self._build_keyword_lists()

    # ── Language detection ──────────────────────────────────────────────────

    def detect_language(self, text: str) -> str:
        """Simple rule-based language detection."""
        if not text:
            return "unknown"
        sample = text[:200]
        if any(_is_arabic(c) for c in sample):
            return "ar"
        french_chars = set("éèêëàâäôöûüçÉÈÊËÀÂÄÔÖÛÜÇ")
        if any(c in french_chars for c in sample):
            return "fr"
        return "en"

    # ── Text cleaning ──────────────────────────────────────────────────────

    @staticmethod
    def clean_text(text: str) -> str:
        if not text:
            return ""
        text = re.sub(r"http\S+|www\S+|https\S+", "", text, flags=re.MULTILINE)
        text = re.sub(r"<.*?>", "", text)
        text = re.sub(r"[^\w\s\u0600-\u06FF\u00C0-\u017F.,!?;:\'-]", " ", text)
        return " ".join(text.split())

    # ── Core analysis ──────────────────────────────────────────────────────

    def analyze_sentiment(
        self, text: str, stock_symbol: str | None = None
    ) -> Dict[str, Any]:
        """Analyse text and return score, label, explanation (API-ready dict)."""
        cleaned = self.clean_text(text)
        if len(cleaned) < 10:
            return self._short_text_result()

        text_lower = cleaned.lower()
        has_neutral_ctx = self._has_neutral_context(text_lower)

        neutral_found = [w for w in NEUTRAL_WORDS if w in text_lower]
        positive_found, negative_found = self._find_keywords(
            text_lower, has_neutral_ctx, stock_symbol
        )

        pos_count = sum(w for _, _, w in positive_found)
        neg_count = sum(w for _, _, w in negative_found)

        # Context dampening (negation phrases)
        if any(m in text_lower for m in CONTEXT_MODIFIERS):
            pos_count = max(1, round(pos_count * CONTEXT_DAMPENING_FACTOR))
            neg_count = max(1, round(neg_count * CONTEXT_DAMPENING_FACTOR))

        total = pos_count + neg_count
        if total == 0:
            return self._neutral_result(neutral_found)

        score = (pos_count - neg_count) / total
        score = max(-1.0, min(1.0, score))

        # Softening
        if abs(score) > SCORE_SOFTENING_THRESHOLD:
            score *= SCORE_SOFTENING_FACTOR
        if total < LOW_KEYWORD_COUNT:
            score *= LOW_KEYWORD_DAMPENING

        # Label & confidence
        if score > POSITIVE_THRESHOLD:
            label = "positive"
        elif score < NEGATIVE_THRESHOLD:
            label = "negative"
        else:
            label = "neutral"
        confidence = (
            min(MAX_CONFIDENCE, BASE_CONFIDENCE + abs(score) * 0.5)
            if label != "neutral"
            else BASE_CONFIDENCE
        )

        explanation, explanation_detail = self._build_explanation(
            positive_found, negative_found, neutral_found,
            score, label, total, stock_symbol,
        )

        return {
            "score": round(score, 3),
            "label": label,
            "confidence": round(confidence, 3),
            "explanation": explanation,
            "explanation_detail": explanation_detail,
            "positive_keywords": pos_count,
            "negative_keywords": neg_count,
            "method": "keyword_based",
        }

    # ── Private helpers ────────────────────────────────────────────────────

    def _build_keyword_lists(self) -> None:
        """Pre-build deduplicated (word, lang) tuples."""
        pos: List[Tuple[str, str]] = []
        seen: set = set()
        for w in FR_POSITIVE + FR_POSITIVE_STRONG:
            key = (w, "fr")
            if key not in seen:
                pos.append(key)
                seen.add(key)
        pos += [(w, "ar") for w in AR_POSITIVE]
        pos += [(w, "en") for w in EN_POSITIVE]

        neg = [(w, "fr") for w in FR_NEGATIVE]
        neg += [(w, "ar") for w in AR_NEGATIVE]
        neg += [(w, "en") for w in EN_NEGATIVE]

        self._pos_keywords = pos
        self._neg_keywords = neg

    @staticmethod
    def _has_neutral_context(text_lower: str) -> bool:
        indicators = [
            "stable", "stables", "stabilité", "maintain", "maintien",
            "pas de changement", "no change", "mixed", "مستقر",
        ]
        return any(n in text_lower for n in indicators)

    def _find_keywords(
        self,
        text_lower: str,
        has_neutral_ctx: bool,
        stock_symbol: str | None,
    ) -> Tuple[List[Tuple[str, str, int]], List[Tuple[str, str, int]]]:
        positive_found: List[Tuple[str, str, int]] = []
        negative_found: List[Tuple[str, str, int]] = []

        for word, lang in self._pos_keywords:
            if word in POSITIVE_NEUTRAL_CONTEXT_WORDS and has_neutral_ctx:
                continue
            if word in text_lower:
                n = min(text_lower.count(word), MAX_KEYWORD_OCCURRENCES)
                positive_found.append((word, lang, n))

        for word, lang in self._neg_keywords:
            if word in text_lower:
                n = min(text_lower.count(word), MAX_KEYWORD_OCCURRENCES)
                negative_found.append((word, lang, n))

        # Company-specific keywords
        if stock_symbol and stock_symbol in COMPANY_KEYWORDS:
            data = COMPANY_KEYWORDS[stock_symbol]
            for word in data["positive"]:
                if has_neutral_ctx:
                    continue
                if word in text_lower:
                    n = min(text_lower.count(word), MAX_KEYWORD_OCCURRENCES)
                    positive_found.append((word, "company", n * 2))
            for word in data["negative"]:
                if word in text_lower:
                    n = min(text_lower.count(word), MAX_KEYWORD_OCCURRENCES)
                    negative_found.append((word, "company", n * 2))

        return positive_found, negative_found

    def _build_explanation(
        self,
        positive_found: List[Tuple[str, str, int]],
        negative_found: List[Tuple[str, str, int]],
        neutral_found: List[str],
        score: float,
        label: str,
        total: int,
        stock_symbol: str | None = None,
    ) -> Tuple[str, Dict[str, Any]]:
        """Build rich explanation dict matching ExplanationDetail model."""
        pos_count = sum(w for _, _, w in positive_found)
        neg_count = sum(w for _, _, w in negative_found)
        intensity = get_sentiment_intensity(score)

        def _top(items: List[Tuple[str, str, int]], n: int = 5) -> List[str]:
            seen: Dict[str, int] = {}
            for w, _, wt in items:
                seen[w] = seen.get(w, 0) + wt
            return [t[0] for t in sorted(seen.items(), key=lambda x: -x[1])[:n]]

        top_pos = _top(positive_found)
        top_neg = _top(negative_found)
        top_neutral = list(dict.fromkeys(neutral_found))[:5]

        # Key findings
        findings: List[str] = []
        if pos_count:
            words = sorted({w for w, _, _ in positive_found})[:5]
            findings.append("Key positive indicators: " + ", ".join(f"'{w}'" for w in words))
        if neg_count:
            words = sorted({w for w, _, _ in negative_found})[:5]
            findings.append("Negative terms present: " + ", ".join(f"'{w}'" for w in words))
        elif label == "positive":
            findings.append("No concerning negative terms detected.")
        if neutral_found and (pos_count or neg_count):
            findings.append("Neutral/context terms: " + ", ".join(sorted(set(neutral_found))[:4]))

        # Summary
        if total == 0:
            summary = "Neutral sentiment. No strong sentiment keywords found."
        elif label == "positive":
            neg_part = (
                "No negative terms detected."
                if neg_count == 0
                else f"Some negative terms ({', '.join(top_neg[:2])}) present."
            )
            summary = f"{intensity} positive sentiment ({score:.2f}). Key positive indicators: {', '.join(top_pos[:4])}. {neg_part}"
        elif label == "negative":
            pos_part = (
                "No positive terms."
                if pos_count == 0
                else f"Some positive terms ({', '.join(top_pos[:2])}) also present."
            )
            summary = f"{intensity} negative sentiment ({score:.2f}). Key negative indicators: {', '.join(top_neg[:4])}. {pos_part}"
        else:
            summary = f"Neutral sentiment ({score:.2f}). Balanced positive and negative terms."

        # Recommendation
        if label == "positive" and score > 0.5:
            recommendation = "Overall positive outlook for investment consideration."
        elif label == "negative" and score < -0.5:
            recommendation = "Caution advised; negative indicators present."
        else:
            recommendation = "Mixed or neutral outlook; monitor for further developments."

        # Per-keyword detail
        impact_per_hit = 1.0 / total if total else 0
        pos_kw_detail = self._aggregate_keywords(positive_found, impact_per_hit, positive=True)
        neg_kw_detail = self._aggregate_keywords(negative_found, impact_per_hit, positive=False)

        # Per-language breakdown
        lang_analysis = self._language_breakdown(positive_found, negative_found)

        # Sector insights
        sector_insights = self._sector_insights(positive_found, negative_found, stock_symbol)

        detail: Dict[str, Any] = {
            "summary": summary,
            "intensity": intensity,
            "key_findings": findings,
            "keyword_breakdown": {
                "positive_keywords": pos_kw_detail,
                "negative_keywords": neg_kw_detail,
                "positive": {"count": pos_count, "top_terms": top_pos},
                "negative": {"count": neg_count, "top_terms": top_neg},
                "neutral": {"count": len(neutral_found), "top_terms": top_neutral},
            },
            "language_analysis": lang_analysis,
            "sector_insights": sector_insights or None,
            "recommendation": recommendation,
        }
        return summary, detail

    @staticmethod
    def _aggregate_keywords(
        found: List[Tuple[str, str, int]], impact_per_hit: float, *, positive: bool
    ) -> List[Dict[str, Any]]:
        seen: Dict[str, int] = {}
        result: List[Dict[str, Any]] = []
        for word, lang, weight in found:
            key = f"{word}:{lang}"
            if key not in seen:
                seen[key] = len(result)
                result.append({"word": word, "language": lang, "count": 0, "impact": 0.0})
            result[seen[key]]["count"] += weight
        sign = 1 if positive else -1
        for item in result:
            item["impact"] = round(sign * item["count"] * impact_per_hit, 3)
        return result

    @staticmethod
    def _language_breakdown(
        pos: List[Tuple[str, str, int]], neg: List[Tuple[str, str, int]]
    ) -> Dict[str, Dict[str, Any]]:
        lp: Dict[str, int] = {}
        ln: Dict[str, int] = {}
        for _, lang, w in pos:
            lp[lang] = lp.get(lang, 0) + w
        for _, lang, w in neg:
            ln[lang] = ln.get(lang, 0) + w

        out: Dict[str, Dict[str, Any]] = {}
        for lang in set(list(lp) + list(ln)):
            p, n = lp.get(lang, 0), ln.get(lang, 0)
            t = p + n
            out[lang] = {
                "score": round((p - n) / t if t else 0.0, 3),
                "keywords_found": t,
                "positive_hits": p,
                "negative_hits": n,
            }
        return out

    @staticmethod
    def _sector_insights(
        pos: List[Tuple[str, str, int]],
        neg: List[Tuple[str, str, int]],
        symbol: str | None,
    ) -> str:
        if not symbol or symbol not in COMPANY_KEYWORDS:
            return ""
        data = COMPANY_KEYWORDS[symbol]
        sp = [w for w, _, _ in pos if w in data["positive"]]
        sn = [w for w, _, _ in neg if w in data["negative"]]
        if not sp and not sn:
            return ""
        parts = []
        if sp:
            parts.append(f"positive ({', '.join(sp)})")
        if sn:
            parts.append(f"negative ({', '.join(sn)})")
        return f"Company-specific keywords for {symbol}: {'; '.join(parts)}."

    @staticmethod
    def _short_text_result() -> Dict[str, Any]:
        return {
            "score": 0.0,
            "label": "neutral",
            "confidence": 0.0,
            "explanation": "Text too short to analyze.",
            "explanation_detail": None,
            "positive_keywords": 0,
            "negative_keywords": 0,
            "method": "keyword_based",
        }

    @staticmethod
    def _neutral_result(neutral_found: List[str]) -> Dict[str, Any]:
        summary = "Neutral sentiment. No strong sentiment keywords found; context suggests stable or mixed outlook."
        return {
            "score": 0.0,
            "label": "neutral",
            "confidence": 0.5,
            "explanation": summary,
            "explanation_detail": {
                "summary": summary,
                "intensity": "Neutral",
                "key_findings": ["No sentiment keywords detected; neutral/stable context."],
                "keyword_breakdown": {
                    "positive_keywords": [],
                    "negative_keywords": [],
                    "positive": {"count": 0, "top_terms": []},
                    "negative": {"count": 0, "top_terms": []},
                    "neutral": {"count": len(neutral_found), "top_terms": neutral_found[:5]},
                },
                "language_analysis": {},
                "sector_insights": None,
                "recommendation": "Mixed or neutral outlook; monitor for further developments.",
            },
            "positive_keywords": 0,
            "negative_keywords": 0,
            "method": "keyword_based",
        }
