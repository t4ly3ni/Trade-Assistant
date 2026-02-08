# BVMT Market API — Python Backend

REST API for the Bourse de Tunis (BVMT) — market data, analysis, anomaly detection, sentiment analysis, ML forecasting, and AI chatbot.  
Built with **FastAPI** + **Pydantic** + **CrewAI** + **OpenRouter**, designed for integration with the React/TypeScript frontend.

---

## Project Structure

```
python/
├── bvmt/                        # Core API package
│   ├── __init__.py              #   Package exports
│   ├── config.py                #   BVMT API URLs, anomaly thresholds (vol σ=3, price=5%, etc.)
│   ├── models.py                #   Pydantic models & enums (StockData, Alert, AnomalyReport, etc.)
│   ├── scraper.py               #   Market data fetcher (live BVMT REST API + CSV fallback)
│   ├── analyzer.py              #   Top hausse/baisse & market summary (pure functions)
│   ├── anomaly.py               #   Stateless snapshot detector + stateful AnomalyEngine (deque 200)
│   └── api.py                   #   FastAPI — 17+ REST endpoints, CORS, background monitor
│
├── agent/                       # CrewAI multi-agent investment advisor
│   ├── __init__.py
│   ├── crew.py                  #   BVMTInvestmentCrew — 6 agents, 6 sequential tasks, OpenRouter LLM
│   ├── main.py                  #   CLI entry point (argparse) — full crew or --quick mode
│   ├── config/
│   │   ├── agents.yaml          #   Agent definitions (role, goal, backstory)
│   │   └── tasks.yaml           #   Task templates with variable interpolation
│   └── tools/                   # 5 custom CrewAI tools
│       ├── __init__.py
│       ├── market_data.py       #   MarketDataTool — CSV queries (overview, stock, top_movers, search)
│       ├── anomaly_detection.py #   AnomalyDetectionTool — alert CSV filter by ticker/severity
│       ├── sentiment.py         #   SentimentAnalysisTool — wraps TradingSentimentSystem
│       ├── news_search.py       #   TunisiaNewsSearchTool — SerperDev API + mock fallback
│       └── portfolio.py         #   PortfolioCalculatorTool — allocations by risk profile
│
├── sentiment/                   # News sentiment analysis module
│   ├── __init__.py
│   ├── config.py                #   Keyword lists (FR/AR/EN), stock symbols, news sources, thresholds
│   ├── models.py                #   Pydantic models (ArticleSentiment, StockSentiment, ExplanationDetail)
│   ├── scraper.py               #   NewsScraper — generates demo articles with configurable bias
│   ├── analyzer.py              #   SentimentAnalyzer — keyword NLP, context dampening, explainability
│   ├── system.py                #   TradingSentimentSystem — orchestrates scraper + analyzer
│   ├── api.py                   #   Standalone FastAPI server (port 8001, also integrated into main API)
│   └── __main__.py              #   Module runner
│
├── BVMT_Stock_Forecasting/      # ML forecasting module
│   ├── api_server.py            #   Standalone FastAPI server (also integrated into main API)
│   ├── requirements.txt         #   Additional dependencies
│   └── forecasting/
│       ├── __init__.py
│       ├── pipeline.py          #   BVMTDataPipeline — synthetic OHLCV + features (MA, EMA, MACD, RSI, Bollinger)
│       ├── predictor.py         #   High-level API — predict_stock(), predict_volume(), predict_liquidity()
│       ├── evaluator.py         #   ModelEvaluator — RMSE, MAE, MAPE, directional accuracy
│       ├── visualizer.py        #   Matplotlib chart generators (price, volume, comparison)
│       └── models/
│           ├── __init__.py
│           ├── prophet.py       #   Simplified Prophet — linear trend + weekly seasonality + 95% CI
│           ├── arima.py         #   From-scratch ARIMA(p,d,q) — OLS on differenced series
│           └── lstm.py          #   Simplified LSTM — MinMaxScaler + moving average approximation
│
├── data/                        # CSV data files
│   ├── bvmt_market_data.csv     #   Full market snapshot (all stock fields)
│   ├── bvmt_top5_hausse_baisse.csv  # Top 5 gainers/losers
│   └── anomaly_alerts.csv       #   Historical anomaly alerts
│
├── notebooks/                   # Jupyter demo notebooks
│   ├── BVMT_Demo_Complete_ENHANCED.ipynb
│   └── BVMT_Demo_Complete_FIXED.ipynb
│
├── legacy/                      # Old standalone scripts (reference only, do not use)
│   ├── scraper.py
│   ├── analyze.py
│   └── anomaly_detector.py
│
├── tests/
│   └── test_api.py              # API smoke tests for all endpoints
│
├── run.py                       # Server entry point (uvicorn wrapper with CLI args)
├── requirements.txt             # Python dependencies
└── .env                         # API keys (OPENROUTER_API_KEY, SERPER_API_KEY)
```

---

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure environment

Create a `.env` file:

```env
# Required — powers AI chatbot and CrewAI agents
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Optional — enables live web search for news in CrewAI
SERPER_API_KEY=your-serper-key-here
```

### 3. Start the server

```bash
# Development (auto-reload)
py run.py --reload

# Production
py run.py

# Custom port
py run.py --port 3001
```

Or directly with uvicorn (must run from inside `python/`):

```bash
cd python
py -m uvicorn bvmt.api:app --reload --port 8000
```

### 4. Open the docs

- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## API Endpoints

### Market Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check — `{status, timestamp}` |
| `GET` | `/api/market` | Full market data for all stocks (live BVMT API or CSV fallback) |
| `GET` | `/api/analysis?top_n=5` | Top N gainers/losers + market summary |

### Anomaly Detection

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/anomalies` | Single-snapshot anomaly detection (cross-sectional z-score) |
| `GET` | `/api/stream/status` | Live anomaly engine status (running, snapshots, alert counts) |
| `GET` | `/api/stream/alerts` | Full report from the background streaming engine |
| `POST` | `/api/stream/reset` | Reset the live anomaly engine (clear history) |

### Sentiment Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sentiment/stocks` | List available stock symbols for sentiment analysis |
| `GET` | `/api/sentiment/all` | Sentiment scores for all tracked stocks (top 8) |
| `GET` | `/api/sentiment/{symbol}` | Detailed sentiment — articles, keyword breakdown, language analysis |

### Forecasting

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/forecast/stocks` | List available stock symbols for forecasting |
| `POST` | `/api/forecast/price` | Price forecast (Prophet / ARIMA / LSTM) |
| `POST` | `/api/forecast/volume` | Volume forecast for a given stock |
| `POST` | `/api/forecast/liquidity` | Liquidity classification (High / Low) |
| `POST` | `/api/forecast/full` | Combined price + volume + liquidity forecast |

### AI Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | AI chatbot — message + history + market context → OpenRouter LLM |
| `POST` | `/api/chat/quick` | Quick data lookup — returns raw market context without LLM call |

---

## Module Details

### `bvmt/` — Core API Package

| Module | Responsibility |
|--------|---------------|
| `config.py` | BVMT REST API URL, headers, anomaly thresholds (volume σ=3, price change=5%, order imbalance ratio=5, spread σ=3, min history=3, poll interval=30s) |
| `models.py` | Pydantic models & enums — `StockData`, `MarketResponse`, `TopMover`, `MarketSummary`, `AnalysisResponse`, `Alert`, `AnomalyReport`, `StockSnapshot`, `AlertSeverity`, `AnomalyType` |
| `scraper.py` | Fetches live data from `bvmt.com.tn/rest_api` → typed `MarketResponse` and `StockSnapshot` lists |
| `analyzer.py` | Pure function `analyze_market()` — sorts stocks by variation, computes top N hausse/baisse, market summary |
| `anomaly.py` | *Stateless:* `detect_anomalies()` — cross-sectional z-score on a single snapshot. *Stateful:* `AnomalyEngine` — rolling deque(200), time-series detectors for volume spikes, price anomalies, rapid moves, order imbalances |
| `api.py` | FastAPI app — 17+ endpoints, CORS wildcard, CSV fallback, background `_live_monitor` task (polls every 30s), sentiment integration, forecasting integration, OpenRouter LLM chat with market context injection |

### `sentiment/` — Trilingual Sentiment Analysis

- **Keyword-based NLP** — no ML model required, runs instantly
- **Trilingual** — French, Arabic, English keyword lists with per-language scoring
- **Context-aware** — dampening for negation phrases ("ne pas", "risque de"), neutral context detection
- **Explainability** — per-keyword impact scores, language distribution, sector insights, actionable recommendations
- **Demo scraper** — generates French/Arabic financial articles with configurable sentiment bias

### `agent/` — CrewAI Multi-Agent System

6 specialized agents in a sequential pipeline:

1. **Profile Analyst** — classifies investor risk (Conservateur / Modéré / Dynamique)
2. **Market Analyst** — fetches BVMT data, identifies trends (uses `MarketDataTool`)
3. **News Researcher** — searches and scores news sentiment (uses `TunisiaNewsSearchTool`, `SentimentAnalysisTool`)
4. **Anomaly Detector** — flags risky stocks (uses `AnomalyDetectionTool`, `MarketDataTool`)
5. **Portfolio Advisor** — builds portfolio with share quantities (uses `PortfolioCalculatorTool`)
6. **Investment Chatbot** — explains recommendations in simple French

Tasks are chained with explicit `context` dependencies: profile → market → (news + anomaly) → portfolio → explanation. Quick mode (`--quick`) skips profile/portfolio for a 4-task run.

### `BVMT_Stock_Forecasting/` — ML Forecasting

| Model | Implementation | Details |
|-------|---------------|---------|
| **Prophet** | Simplified, from scratch | Linear trend + weekly seasonality decomposition + 95% confidence intervals |
| **ARIMA** | From scratch | AR(p) via OLS on differenced series, no `statsmodels` dependency |
| **LSTM** | Simplified placeholder | MinMaxScaler + moving average approximation (no TensorFlow) |

**Pipeline features**: Synthetic OHLCV generation (deterministic from symbol hash), feature engineering (MA, EMA, MACD, RSI, Bollinger Bands, volatility, liquidity score).

**Evaluation metrics**: RMSE, MAE, MAPE, directional accuracy.

---

## CrewAI CLI Usage

```bash
# Full crew run (6 agents)
py -m agent.main

# Quick mode (4 agents, faster)
py -m agent.main --quick

# Specific stock
py -m agent.main --stock SFBT

# Custom profile
py -m agent.main --name "Leila" --capital 10000 --profile "Dynamique"

# Different LLM
py -m agent.main --model "openrouter/anthropic/claude-3.5-sonnet"
```

| Flag | Default | Description |
|------|---------|-------------|
| `--quick` | off | Quick 4-agent analysis |
| `--stock` | TUNTEL | Stock ticker |
| `--name` | Ahmed | Investor name |
| `--capital` | 5000 | Investment amount (TND) |
| `--profile` | Modéré | Risk profile |
| `--question` | auto | Chatbot question |
| `--model` | openrouter/google/gemini-2.0-flash-001 | LLM model |

---

## Testing

Start the server, then:

```bash
py tests/test_api.py
```

---

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │          FastAPI Application             │
                    │               (api.py)                   │
                    │                                         │
                    │  CORS · Background Monitor · Lifespan   │
                    └──────┬──────┬──────┬──────┬────────────┘
                           │      │      │      │
              ┌────────────┘      │      │      └─────────────┐
              ▼                   ▼      ▼                    ▼
     ┌──────────────┐  ┌──────────┐ ┌─────────┐   ┌──────────────────┐
     │  scraper.py  │  │analyzer  │ │ anomaly │   │   sentiment/     │
     │ (BVMT REST   │  │  .py     │ │  .py    │   │   system.py      │
     │  API + CSV)  │  │ (top H/B)│ │(z-score)│   │  (FR/AR/EN NLP)  │
     └──────┬───────┘  └──────────┘ └────┬────┘   └──────────────────┘
            │                            │
            ▼                            ▼
     ┌──────────────┐          ┌──────────────────┐
     │  models.py   │          │  AnomalyEngine   │
     │  (Pydantic)  │          │ (stateful, deque  │
     │              │          │  200, background  │
     │  config.py   │          │  polling 30s)     │
     │ (thresholds) │          └──────────────────┘
     └──────────────┘

     ┌──────────────────────────────────────────┐
     │        BVMT_Stock_Forecasting/           │
     │  pipeline.py → models/ → predictor.py    │
     │  Prophet · ARIMA · LSTM                  │
     │  Price · Volume · Liquidity              │
     └──────────────────────────────────────────┘

     ┌──────────────────────────────────────────┐
     │           agent/ (CrewAI)                │
     │  crew.py → 6 Agents → 6 Tasks           │
     │  tools/: market · anomaly · sentiment    │
     │          news · portfolio                │
     │  LLM: OpenRouter (configurable)          │
     └──────────────────────────────────────────┘
```

---

## Dependencies

| Package | Version |
|---------|---------|
| FastAPI | >=0.110.0 |
| Uvicorn | >=0.27.0 |
| Pydantic | >=2.6.0 |
| Requests | >=2.31.0 |
| Pandas | >=2.2.0 |
| NumPy | >=1.24.0 |
| scikit-learn | >=1.3.0 |
| CrewAI[tools] | >=0.105.0 |
| PyYAML | >=6.0 |
| Matplotlib | >=3.7.0 |
| python-dotenv | (implicit) |
