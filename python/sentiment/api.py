"""
FastAPI server for the BVMT Sentiment Analysis module.
Run with: python -m sentiment.api  (from the repo root)
"""

from datetime import datetime
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from .config import API_HOST, API_PORT, API_VERSION, STOCK_SYMBOLS
from .models import (
    AllStocksResponse,
    ErrorResponse,
    HealthResponse,
    ServiceInfo,
    StockSentiment,
    StocksListResponse,
)
from .system import TradingSentimentSystem

# ── App setup ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="BVMT Sentiment API",
    version=API_VERSION,
    responses={400: {"model": ErrorResponse}},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

system = TradingSentimentSystem()

# ── Routes (order matters: static paths before path params) ─────────────────


@app.get("/", response_model=ServiceInfo)
def root() -> ServiceInfo:
    return ServiceInfo(
        version=API_VERSION,
        endpoints={
            "/health": "Check API health",
            "/stocks": "List available stock symbols",
            "/sentiment/all": "Get sentiment for all stocks",
            "/sentiment/{symbol}": "Get sentiment for a specific stock",
        },
    )


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(timestamp=datetime.now().isoformat())


@app.get("/stocks", response_model=StocksListResponse)
def list_stocks() -> StocksListResponse:
    return StocksListResponse(
        tunisian_stocks=system.scraper.stock_symbols,
        count=len(system.scraper.stock_symbols),
    )


# ⚠ /sentiment/all MUST come BEFORE /sentiment/{symbol}
@app.get("/sentiment/all", response_model=AllStocksResponse)
def get_all_sentiments() -> AllStocksResponse:
    try:
        stocks: List[str] = STOCK_SYMBOLS[:8]        # ATB → UIB
        results = system.analyze_multiple(stocks, max_articles=2)
        return AllStocksResponse(
            timestamp=datetime.now().isoformat(),
            stocks_analyzed=len(stocks),
            results=results,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/sentiment/{symbol}", response_model=StockSentiment)
def get_sentiment(symbol: str) -> StockSentiment:
    sym = symbol.upper()
    if sym not in STOCK_SYMBOLS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown symbol '{sym}'. Valid: {STOCK_SYMBOLS}",
        )
    try:
        return system.analyze_stock(sym, max_articles=3)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── Entrypoint ──────────────────────────────────────────────────────────────

def main() -> None:
    print(f"Starting BVMT Sentiment API on http://localhost:{API_PORT}")
    print(f"Docs: http://localhost:{API_PORT}/docs")
    uvicorn.run(
        "sentiment.api:app",
        host=API_HOST,
        port=API_PORT,
        reload=True,
    )


if __name__ == "__main__":
    main()
