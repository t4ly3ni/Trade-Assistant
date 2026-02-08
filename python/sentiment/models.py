"""
Pydantic response models for the BVMT Sentiment API.
These mirror the TypeScript interfaces in types.ts for frontend integration.
"""

from __future__ import annotations

from pydantic import BaseModel
from typing import Any, Dict, List, Optional


# ── Explanation sub-models ──────────────────────────────────────────────────

class KeywordDetail(BaseModel):
    word: str
    language: str
    count: int = 0
    impact: float = 0.0


class KeywordCounts(BaseModel):
    count: int = 0
    top_terms: List[str] = []


class KeywordBreakdown(BaseModel):
    positive_keywords: List[KeywordDetail] = []
    negative_keywords: List[KeywordDetail] = []
    positive: KeywordCounts = KeywordCounts()
    negative: KeywordCounts = KeywordCounts()
    neutral: KeywordCounts = KeywordCounts()


class LanguageScore(BaseModel):
    score: float = 0.0
    keywords_found: int = 0
    positive_hits: int = 0
    negative_hits: int = 0


class ExplanationDetail(BaseModel):
    summary: str = ""
    intensity: str = "Neutral"
    key_findings: List[str] = []
    keyword_breakdown: KeywordBreakdown = KeywordBreakdown()
    language_analysis: Dict[str, LanguageScore] = {}
    sector_insights: Optional[str] = None
    recommendation: str = ""


# ── Article-level result ────────────────────────────────────────────────────

class ArticleSentiment(BaseModel):
    id: str
    title: str
    source: str
    language: str
    published_date: str
    sentiment_score: float
    sentiment_label: str
    confidence: float
    analysis_method: str = "keyword_based"
    positive_keywords: int = 0
    negative_keywords: int = 0
    explanation: Optional[str] = None
    explanation_detail: Optional[ExplanationDetail] = None


# ── Stock-level result ──────────────────────────────────────────────────────

class SentimentDistribution(BaseModel):
    positive: int = 0
    negative: int = 0
    neutral: int = 0


class StockSentiment(BaseModel):
    symbol: str
    overall_score: float
    sentiment: str
    confidence: float
    articles_analyzed: int
    sentiment_distribution: SentimentDistribution = SentimentDistribution()
    overall_explanation: str = ""
    analysis_timestamp: str = ""
    articles: List[ArticleSentiment] = []


# ── API response wrappers ──────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "healthy"
    timestamp: str


class StocksListResponse(BaseModel):
    tunisian_stocks: List[str]
    count: int


class AllStocksResponse(BaseModel):
    timestamp: str
    stocks_analyzed: int
    results: Dict[str, StockSentiment]


class ServiceInfo(BaseModel):
    service: str = "BVMT Stock Sentiment Analysis API"
    version: str
    endpoints: Dict[str, str]


class ErrorResponse(BaseModel):
    error: str
    detail: str = ""
