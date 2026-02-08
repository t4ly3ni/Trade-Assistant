"""
bvmt.api — FastAPI REST backend for TSX frontend integration
Run with:  uvicorn bvmt.api:app --reload --port 8000
"""

import asyncio
import csv
import traceback
from contextlib import asynccontextmanager
from datetime import datetime

import requests as http_requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from typing import List, Optional

from .scraper import fetch_market_data, fetch_snapshots
from .analyzer import analyze_market
from .anomaly import detect_anomalies, AnomalyEngine
from .models import (
    MarketResponse,
    AnalysisResponse,
    AnomalyReport,
)

# Sentiment imports (sibling package)
import sys, os
_repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

# Load .env
load_dotenv(os.path.join(_repo_root, ".env"))

from sentiment.system import TradingSentimentSystem
from sentiment.config import STOCK_SYMBOLS as SENTIMENT_SYMBOLS

# Forecasting imports
_forecast_dir = os.path.join(_repo_root, "BVMT_Stock_Forecasting")
if _forecast_dir not in sys.path:
    sys.path.insert(0, _forecast_dir)

from forecasting import predict_stock, predict_volume, predict_liquidity, get_stock_list


# ─── Global state for the live anomaly engine ────────────────────────
engine = AnomalyEngine()
_monitor_task: asyncio.Task | None = None
_monitor_running = False

# ─── Sentiment system (reused across requests) ───────────────────────
sentiment_system = TradingSentimentSystem()


async def _live_monitor(interval: int = 30):
    """Background loop: polls BVMT API and feeds the anomaly engine."""
    global _monitor_running
    _monitor_running = True
    while _monitor_running:
        try:
            snapshots = fetch_snapshots()
            engine.ingest(snapshots)
        except Exception:
            pass  # network hiccups — just retry next cycle
        await asyncio.sleep(interval)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start / stop the background anomaly monitor with the app."""
    global _monitor_task
    _monitor_task = asyncio.create_task(_live_monitor())
    yield
    _monitor_running_stop()


def _monitor_running_stop():
    global _monitor_running, _monitor_task
    _monitor_running = False
    if _monitor_task:
        _monitor_task.cancel()


# ─── FastAPI App ─────────────────────────────────────────────────────
app = FastAPI(
    title="BVMT Market API",
    description="REST API for Bourse de Tunis market data, analysis & anomaly detection",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the TSX frontend (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── CSV fallback for market data ────────────────────────────────────

_CSV_DATA_DIR = os.path.join(_repo_root, "data")


def _load_market_from_csv() -> MarketResponse:
    """Load market data from bvmt_market_data.csv as fallback."""
    path = os.path.join(_CSV_DATA_DIR, "bvmt_market_data.csv")
    if not os.path.exists(path):
        raise FileNotFoundError(f"CSV file not found: {path}")

    with open(path, "r", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    from .models import StockData
    stocks: list[StockData] = []
    for r in rows:
        stocks.append(StockData(
            isin=r.get("ISIN", ""),
            valeur=r.get("Valeur", ""),
            ticker=r.get("Ticker", ""),
            groupe=r.get("Groupe", "").strip(),
            statut=r.get("Statut", "").strip(),
            ord_a=int(float(r.get("Ord.A", "0") or "0")),
            qty_a=int(float(r.get("Qt\u00e9.A", "0") or "0")),
            achat=float(r.get("Achat", "0") or "0"),
            vente=float(r.get("Vente", "0") or "0"),
            qty_v=int(float(r.get("Qt\u00e9.V", "0") or "0")),
            ord_v=int(float(r.get("Ord.V", "0") or "0")),
            cours_de_reference=float(r.get("Cours de r\u00e9f\u00e9rence", "0") or "0"),
            cto=float(r.get("CTO", "0") or "0"),
            vto=float(r.get("VTO %", "0") or "0"),
            qto=float(r.get("QTO", "0") or "0"),
            ouverture=float(r.get("Ouverture", "0") or "0"),
            dernier=float(r.get("Dernier", "0") or "0"),
            variation=float(r.get("Variation %", "0") or "0"),
            dern_qty=int(float(r.get("Dern Qt\u00e9", "0") or "0")),
            quantite=int(float(r.get("Quantit\u00e9", "0") or "0")),
            capitalisation=float(r.get("Capitalisation", "0") or "0"),
            p_haut=float(r.get("P.Haut", "0") or "0"),
            p_bas=float(r.get("P.Bas", "0") or "0"),
            s_haut=float(r.get("S.Haut", "0") or "0"),
            s_bas=float(r.get("S.Bas", "0") or "0"),
            heure=r.get("Heure", ""),
        ))

    return MarketResponse(
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        count=len(stocks),
        stocks=stocks,
    )


def _get_market_data() -> MarketResponse:
    """Use CSV dataset as primary source; try live BVMT API only as fallback."""
    try:
        return _load_market_from_csv()
    except Exception:
        # CSV not available — try live BVMT API
        return fetch_market_data()


# ─── Endpoints ───────────────────────────────────────────────────────

@app.get("/api/market", response_model=MarketResponse)
async def get_market():
    """Fetch live market data from BVMT, with CSV fallback."""
    try:
        return _get_market_data()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Market data error: {e}")


@app.get("/api/analysis", response_model=AnalysisResponse)
async def get_analysis(top_n: int = Query(5, ge=1, le=20)):
    """Fetch market data and return top hausse / baisse analysis."""
    try:
        market = _get_market_data()
        return analyze_market(market.stocks, top_n=top_n)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Analysis error: {e}")


@app.get("/api/anomalies", response_model=AnomalyReport)
async def get_anomalies():
    """Run anomaly detection on the current market snapshot."""
    try:
        market = _get_market_data()
        return detect_anomalies(market.stocks)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Anomaly detection error: {e}")


@app.get("/api/stream/status")
async def stream_status():
    """Return the live anomaly engine's current status & accumulated report."""
    report = engine.get_report()
    return {
        "running": _monitor_running,
        "snapshots_ingested": engine.snapshot_count,
        "total_alerts": report.total_alerts,
        "by_type": report.by_type,
        "by_severity": report.by_severity,
        "top_flagged": report.top_flagged,
    }


@app.get("/api/stream/alerts", response_model=AnomalyReport)
async def stream_alerts():
    """Return the full anomaly report from the live engine."""
    return engine.get_report()


@app.post("/api/stream/reset")
async def stream_reset():
    """Reset the live anomaly engine (clear history and alerts)."""
    global engine
    engine = AnomalyEngine()
    return {"status": "reset", "timestamp": datetime.now().isoformat()}


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


# ─── Sentiment Endpoints ─────────────────────────────────────────────

@app.get("/api/sentiment/stocks")
async def sentiment_stocks():
    """List available stock symbols for sentiment analysis."""
    return {
        "tunisian_stocks": sentiment_system.scraper.stock_symbols,
        "count": len(sentiment_system.scraper.stock_symbols),
    }


@app.get("/api/sentiment/all")
async def sentiment_all():
    """Get sentiment for all tracked stocks."""
    try:
        stocks: List[str] = SENTIMENT_SYMBOLS[:8]
        results = sentiment_system.analyze_multiple(stocks, max_articles=2)
        return {
            "timestamp": datetime.now().isoformat(),
            "stocks_analyzed": len(stocks),
            "results": results,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/sentiment/{symbol}")
async def sentiment_stock(symbol: str):
    """Get sentiment for a specific stock symbol."""
    sym = symbol.upper()
    if sym not in SENTIMENT_SYMBOLS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown symbol '{sym}'. Valid: {SENTIMENT_SYMBOLS}",
        )
    try:
        return sentiment_system.analyze_stock(sym, max_articles=3)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ─── Chat Endpoint (OpenRouter LLM with market context) ─────────────


# ─── Forecasting Endpoints ───────────────────────────────────────────

class ForecastRequest(BaseModel):
    symbol: str
    model_type: str = "prophet"
    forecast_days: int = 5


class LiquidityForecastRequest(BaseModel):
    symbol: str


@app.get("/api/forecast/stocks")
async def forecast_stock_list():
    """Return the list of available stock symbols for forecasting."""
    return {"stocks": get_stock_list()}


@app.post("/api/forecast/price")
async def forecast_price(req: ForecastRequest):
    """Forecast closing prices for a given stock."""
    try:
        result = await asyncio.to_thread(
            predict_stock,
            req.symbol,
            model_type=req.model_type,
            forecast_days=req.forecast_days,
        )
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Forecast error: {str(e)}")


@app.post("/api/forecast/volume")
async def forecast_volume(req: ForecastRequest):
    """Forecast trading volume for a given stock."""
    try:
        result = await asyncio.to_thread(
            predict_volume,
            req.symbol,
            model_type=req.model_type,
            forecast_days=req.forecast_days,
        )
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Volume forecast error: {str(e)}")


@app.post("/api/forecast/liquidity")
async def forecast_liquidity(req: LiquidityForecastRequest):
    """Classify current liquidity for a given stock."""
    try:
        result = await asyncio.to_thread(predict_liquidity, req.symbol)
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Liquidity error: {str(e)}")


@app.post("/api/forecast/full")
async def forecast_full(req: ForecastRequest):
    """Run price + volume + liquidity forecasts in one call."""
    try:
        price_result, volume_result, liquidity_result = await asyncio.gather(
            asyncio.to_thread(predict_stock, req.symbol, req.model_type, req.forecast_days),
            asyncio.to_thread(predict_volume, req.symbol, req.model_type, req.forecast_days),
            asyncio.to_thread(predict_liquidity, req.symbol),
        )
        return {
            "symbol": req.symbol,
            "model": req.model_type,
            "price": price_result,
            "volume": volume_result,
            "liquidity": liquidity_result,
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Full forecast error: {str(e)}")


# ─── Chat Endpoint contd ────────────────────────────────────────────

_DATA_DIR = os.path.join(_repo_root, "data")
_OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
_DEFAULT_MODEL = "google/gemini-2.0-flash-001"


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    investor_name: str = "Ahmed"
    investor_profile: str = "Modere"
    investment_amount: float = 5000


class ChatResponse(BaseModel):
    reply: str
    timestamp: str


# ─── Market data helpers ─────────────────────────────────────────────

def _read_csv(filename: str) -> list[dict]:
    path = os.path.join(_DATA_DIR, filename)
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def _build_market_context() -> str:
    """Build a concise market data summary to feed the LLM."""
    parts = []

    # Top movers
    top5 = _read_csv("bvmt_top5_hausse_baisse.csv")
    if top5:
        hausse = [r for r in top5 if r.get("Type", "").upper() == "HAUSSE"]
        baisse = [r for r in top5 if r.get("Type", "").upper() == "BAISSE"]
        lines = ["TOP MOVERS DU JOUR:"]
        for r in hausse:
            lines.append(f"  HAUSSE: {r.get('Valeur','')} ({r.get('Ticker','')}) +{r.get('Variation %','')}% -> {r.get('Dernier','')} TND, vol={r.get('Quantité','')}")
        for r in baisse:
            lines.append(f"  BAISSE: {r.get('Valeur','')} ({r.get('Ticker','')}) {r.get('Variation %','')}% -> {r.get('Dernier','')} TND, vol={r.get('Quantité','')}")
        parts.append("\n".join(lines))

    # Key stocks from market data
    market = _read_csv("bvmt_market_data.csv")
    active = [r for r in market
              if r.get("Dernier", "0") not in ("0", "0.0", "")
              and r.get("Quantité", "0") not in ("0", "")]
    if active:
        # Sort by volume desc, take top 20
        try:
            active.sort(key=lambda r: float(r.get("Quantité", "0").replace(",", "")), reverse=True)
        except ValueError:
            pass
        lines = [f"MARCHE BVMT ({len(market)} valeurs, {len(active)} actives):"]
        for r in active[:20]:
            lines.append(
                f"  {r.get('Valeur','')} ({r.get('Ticker','')}) "
                f"cours={r.get('Dernier','')} TND var={r.get('Variation %','')}% "
                f"vol={r.get('Quantité','')} ref={r.get('Cours de référence','')} "
                f"haut={r.get('P.Haut','')} bas={r.get('P.Bas','')}"
            )
        parts.append("\n".join(lines))

    # Anomaly alerts
    anomalies = _read_csv("anomaly_alerts.csv")
    if anomalies:
        lines = [f"ALERTES ANOMALIES ({len(anomalies)} alertes):"]
        for a in anomalies[:10]:
            lines.append(
                f"  [{a.get('Severity','')}] {a.get('Valeur','')} - "
                f"{a.get('Type','')}: {a.get('Message','')}"
            )
        parts.append("\n".join(lines))

    return "\n\n".join(parts) if parts else "Aucune donnee de marche disponible pour le moment."


def _build_system_prompt(investor_name: str, profile: str, capital: float) -> str:
    """Build the system prompt with investor context and market data."""
    market_data = _build_market_context()

    return f"""Tu es un assistant intelligent d'investissement pour la Bourse de Tunis (BVMT).
Tu aides les investisseurs tunisiens a prendre des decisions eclairees.

PROFIL INVESTISSEUR:
- Nom: {investor_name}
- Profil de risque: {profile}
- Capital disponible: {capital:.0f} TND

DONNEES DE MARCHE EN TEMPS REEL:
{market_data}

REGLES:
1. Reponds TOUJOURS en francais de maniere claire et accessible.
2. Sois conversationnel, amical et pedagogique — l'investisseur peut etre debutant.
3. Quand on te pose une question sur une action specifique, utilise les donnees de marche ci-dessus.
4. Pour les recommandations, donne ton avis (Acheter / Conserver / Eviter) avec une justification simple.
5. Mentionne les alertes d'anomalies quand c'est pertinent (volumes suspects, prix anormaux).
6. Pour les allocations de portefeuille, adapte au profil de risque:
   - Conservateur: 50% obligations, 20% actions stables, 30% liquidite
   - Modere: 40% actions stables, 30% obligations, 15% croissance, 15% liquidite
   - Dynamique: 50% croissance, 30% stables, 10% obligations, 10% liquidite
7. Utilise des emojis avec moderation pour rendre la conversation vivante.
8. Si tu ne connais pas la reponse, dis-le honnetement.
9. Garde tes reponses concises (max 200 mots) sauf si on te demande une analyse detaillee.
10. Ne repete jamais les donnees brutes en bloc — integre-les naturellement dans ta reponse."""


def _call_openrouter(messages: list[dict], model: str = _DEFAULT_MODEL) -> str:
    """Call OpenRouter API and return the assistant's reply."""
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        return "Erreur: La cle API OpenRouter n'est pas configuree. Veuillez ajouter OPENROUTER_API_KEY dans le fichier .env"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1024,
    }

    resp = http_requests.post(_OPENROUTER_URL, json=payload, headers=headers, timeout=30)
    resp.raise_for_status()

    data = resp.json()
    choices = data.get("choices", [])
    if not choices:
        return "Desole, je n'ai pas pu generer une reponse. Veuillez reessayer."

    return choices[0].get("message", {}).get("content", "").strip()


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Interactive chat powered by OpenRouter LLM.
    Sends the user's question + conversation history + live market data context.
    """
    try:
        system_prompt = _build_system_prompt(
            req.investor_name, req.investor_profile, req.investment_amount
        )

        # Build messages array: system + history + new user message
        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history (last 10 messages to stay within token limits)
        for msg in req.history[-10:]:
            messages.append({"role": msg.role, "content": msg.content})

        # Add current user message
        messages.append({"role": "user", "content": req.message})

        # Call LLM in a thread to not block the event loop
        reply = await asyncio.to_thread(_call_openrouter, messages)

        return ChatResponse(
            reply=reply,
            timestamp=datetime.now().isoformat(),
        )
    except http_requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Le serveur LLM n'a pas repondu a temps.")
    except http_requests.exceptions.HTTPError as e:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"Erreur OpenRouter: {e.response.status_code}")
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Chat error: {str(exc)}")


@app.post("/api/chat/quick", response_model=ChatResponse)
async def chat_quick(req: ChatRequest):
    """
    Quick data lookup — returns raw market data without LLM processing.
    Used as a fallback when the LLM is unavailable.
    """
    try:
        market_data = _build_market_context()
        return ChatResponse(
            reply=market_data,
            timestamp=datetime.now().isoformat(),
        )
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Quick chat error: {str(exc)}")
