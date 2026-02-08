# BVMT Intelligent Trading Assistant

> **Système d'Assistant Intelligent de Trading pour la Bourse des Valeurs Mobilières de Tunis**

An AI-powered investment platform for the Tunisian Stock Exchange (BVMT), built for the **IHEC CodeLab 2.0** hackathon. Combines real-time market data, anomaly detection, trilingual sentiment analysis, ML-based price forecasting, and a conversational AI chatbot — all tailored for Tunisian retail investors.

---

## Quick Start

```bash
# 1. Backend
cd python
pip install -r requirements.txt
echo "OPENROUTER_API_KEY=sk-or-v1-..." > .env
py run.py --reload                 # → http://127.0.0.1:8000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                        # → http://localhost:5173

# 3. CrewAI Agent CLI (optional, new terminal)
cd python
py -m agent.main --quick           # Quick single-stock analysis
```

---

## Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                 │
│       React 18 · TypeScript · Vite · Tailwind CSS · Recharts      │
│                                                                   │
│  ┌────────────┐ ┌──────────────┐ ┌─────────────┐ ┌────────────┐  │
│  │  Overview   │ │StockAnalysis │ │  Portfolio   │ │Surveillance│  │
│  │ (dashboard) │ │  (heatmap +  │ │ (profile +   │ │  (anomaly  │  │
│  │             │ │  forecasts)  │ │  sim-trading)│ │  monitor)  │  │
│  └────────────┘ └──────────────┘ └─────────────┘ └────────────┘  │
│  Components: Layout · Card · ChatBot · ThemeToggle                │
│  Port: 5173                                                       │
└────────────────────────────┬──────────────────────────────────────┘
                             │ HTTP (fetch)
                             ▼
┌───────────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND · Port 8000                    │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │
│  │ Scraper  │ │ Analyzer │ │ Anomaly  │ │     Sentiment        │ │
│  │ (BVMT    │ │ (top H/B │ │ (z-score │ │ (keyword NLP,        │ │
│  │  API +   │ │  market  │ │  engine, │ │  FR / AR / EN,       │ │
│  │  CSV)    │ │  summary)│ │  stream) │ │  explainability)     │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────────┘ │
│                                                                   │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐  │
│  │     Forecasting      │  │       Chat (OpenRouter LLM)      │  │
│  │ Prophet · ARIMA · LSTM│  │  Gemini 2.0 Flash + market       │  │
│  │ Price · Volume · Liq. │  │  context injection + history     │  │
│  └──────────────────────┘  └──────────────────────────────────┘  │
│                                                                   │
│             Background: AnomalyEngine (30s polling)               │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────────┐
│               CREWAI MULTI-AGENT SYSTEM (CLI + API)               │
│                                                                   │
│  Agents: Profile Analyst · Market Analyst · News Researcher       │
│          Anomaly Detector · Portfolio Advisor · Investment Chatbot │
│                                                                   │
│  Tools:  MarketData · AnomalyDetection · Sentiment                │
│          NewsSearch (SerperDev) · PortfolioCalculator              │
│                                                                   │
│  LLM:   OpenRouter → Gemini / Claude / GPT (configurable)        │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────────┐
│                   SUPABASE (PostgreSQL + RLS)                     │
│                                                                   │
│  stocks · stock_prices · predictions · news_articles              │
│  sentiment_analysis · anomalies · portfolios                      │
│  portfolio_positions · recommendations                            │
└───────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| **Python** | 3.11+ | `python --version` |
| **Node.js** | 18+ | `node --version` |
| **npm** | 9+ | `npm --version` |
| **pip** | latest | `pip --version` |

---

## Project Structure

```
bvmt/
├── frontend/                    # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/          # Layout, Card, ChatBot, ThemeToggle
│   │   ├── pages/               # Overview, StockAnalysis, Portfolio, Surveillance
│   │   ├── hooks/               # useTheme (dark/light/system)
│   │   ├── lib/                 # API client, TypeScript types, mock data, Supabase client
│   │   ├── App.tsx              # Page router (state-based navigation)
│   │   └── main.tsx             # Entry point
│   ├── package.json
│   └── vite.config.ts
│
├── python/                      # FastAPI backend + AI modules
│   ├── bvmt/                    # Core API package
│   │   ├── api.py               # FastAPI — 17+ REST endpoints (market, analysis, anomaly, sentiment, forecast, chat)
│   │   ├── scraper.py           # BVMT market data fetcher (live API + CSV fallback)
│   │   ├── analyzer.py          # Top hausse/baisse & market summary (pure functions)
│   │   ├── anomaly.py           # Stateless detector + stateful AnomalyEngine (rolling deque)
│   │   ├── models.py            # Pydantic data models & enums
│   │   └── config.py            # Constants, thresholds, BVMT API URLs
│   │
│   ├── agent/                   # CrewAI multi-agent investment advisor
│   │   ├── crew.py              # Crew orchestration — 6 agents, 6 sequential tasks
│   │   ├── main.py              # CLI entry point (argparse)
│   │   ├── config/
│   │   │   ├── agents.yaml      # Agent definitions (role, goal, backstory)
│   │   │   └── tasks.yaml       # Task templates with variable interpolation
│   │   └── tools/               # 5 custom CrewAI tools
│   │       ├── market_data.py   #   MarketDataTool — CSV queries (overview, stock, top_movers, search)
│   │       ├── anomaly_detection.py # AnomalyDetectionTool — alert CSV filtering
│   │       ├── sentiment.py     #   SentimentAnalysisTool — wraps sentiment module
│   │       ├── news_search.py   #   TunisiaNewsSearchTool — SerperDev API + mock fallback
│   │       └── portfolio.py     #   PortfolioCalculatorTool — allocation by risk profile
│   │
│   ├── sentiment/               # News sentiment analysis module
│   │   ├── system.py            # TradingSentimentSystem — orchestrator
│   │   ├── analyzer.py          # Keyword-based NLP (FR/AR/EN), context dampening, explainability
│   │   ├── scraper.py           # NewsScraper — generates demo articles
│   │   ├── models.py            # Pydantic models (ArticleSentiment, StockSentiment, etc.)
│   │   └── config.py            # Keyword lists, stock symbols, thresholds
│   │
│   ├── BVMT_Stock_Forecasting/  # ML forecasting module
│   │   ├── api_server.py        # Standalone FastAPI server (also integrated into main API)
│   │   ├── forecasting/
│   │   │   ├── pipeline.py      # Data pipeline — synthetic OHLCV + feature engineering (MA, EMA, MACD, RSI, Bollinger)
│   │   │   ├── predictor.py     # High-level API — predict_stock(), predict_volume(), predict_liquidity()
│   │   │   ├── evaluator.py     # Metrics — RMSE, MAE, MAPE, directional accuracy
│   │   │   ├── visualizer.py    # Matplotlib chart generators
│   │   │   └── models/
│   │   │       ├── prophet.py   # Simplified Prophet — trend + weekly seasonality + 95% CI
│   │   │       ├── arima.py     # From-scratch ARIMA(p,d,q) — OLS on differenced data
│   │   │       └── lstm.py      # Simplified LSTM — MinMaxScaler + moving average approximation
│   │   └── requirements.txt
│   │
│   ├── data/                    # CSV data files (market data, anomaly alerts)
│   ├── notebooks/               # Jupyter demo notebooks
│   ├── legacy/                  # Old standalone scripts (reference only)
│   ├── tests/                   # API smoke tests
│   ├── run.py                   # Server entry point (uvicorn wrapper)
│   ├── requirements.txt         # Python dependencies
│   └── .env                     # API keys (not committed)
│
└── supabase/                    # Database
    └── migrations/              # PostgreSQL schema with RLS
```

---

## Setup Guide

### 1. Clone the Repository

```bash
git clone <repository-url>
cd bvmt
```

### 2. Backend (Python / FastAPI)

```bash
cd python

# (Recommended) Create a virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

#### Environment Variables

Create a `.env` file inside `python/`:

```env
# Required — powers the AI chatbot and CrewAI agents
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Optional — enables live web search for news in CrewAI agent
SERPER_API_KEY=your-serper-key-here
```

#### Start the API Server

```bash
# Development (auto-reload)
py run.py --reload

# Production
py run.py

# Custom host/port
py run.py --host 0.0.0.0 --port 3001
```

The API will be available at:
- **API**: http://127.0.0.1:8000
- **Swagger docs**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc

### 3. Frontend (React / Vite)

Open a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at: **http://localhost:5173**

#### Frontend Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite development server |
| `npm run build` | Production build (output in `dist/`) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |

#### Frontend Environment Variables (Optional)

For Supabase integration, create a `.env` file in `frontend/`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. CrewAI Investment Agent (Optional)

Requires `OPENROUTER_API_KEY` in `python/.env`.

```bash
cd python

# Full crew run — 6 agents (profile → market → news → anomaly → portfolio → chatbot)
py -m agent.main

# Quick mode — 4 agents, faster
py -m agent.main --quick

# Analyze a specific stock
py -m agent.main --stock SFBT

# Custom investor profile
py -m agent.main --name "Leila" --capital 10000 --profile "Dynamique"

# Use a different LLM
py -m agent.main --model "openrouter/anthropic/claude-3.5-sonnet"
```

#### CLI Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--quick` | off | Run quick 4-agent analysis instead of full 6-agent crew |
| `--stock` | TUNTEL | Stock ticker to analyze |
| `--name` | Ahmed | Investor name |
| `--capital` | 5000 | Investment amount in TND |
| `--profile` | Modéré | Risk profile (Conservateur / Modéré / Dynamique) |
| `--question` | auto | Specific question to ask the chatbot agent |
| `--model` | openrouter/google/gemini-2.0-flash-001 | LLM model via OpenRouter |

---

## Running Everything Together

You need **2 terminals minimum** (3 for the CLI agent):

| Terminal | Directory | Command | URL |
|----------|-----------|---------|-----|
| 1 — Backend | `python/` | `py run.py --reload` | http://127.0.0.1:8000 |
| 2 — Frontend | `frontend/` | `npm run dev` | http://localhost:5173 |
| 3 — Agent *(optional)* | `python/` | `py -m agent.main --quick` | CLI output |

> **Important**: Start the backend **before** the frontend. The frontend calls `http://127.0.0.1:8000` for all API data.

---

## API Reference

### Market Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check — returns `{status, timestamp}` |
| `GET` | `/api/market` | Full market data for all stocks (live BVMT API or CSV fallback) |
| `GET` | `/api/analysis?top_n=5` | Top N gainers/losers + market summary (volume, trend) |

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
| `GET` | `/api/sentiment/all` | Sentiment scores for all tracked stocks |
| `GET` | `/api/sentiment/{symbol}` | Detailed sentiment for a specific stock (articles, keywords, language breakdown) |

### Forecasting

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/forecast/stocks` | List available stock symbols for forecasting |
| `POST` | `/api/forecast/price` | Price forecast (Prophet / ARIMA / LSTM) for a given stock |
| `POST` | `/api/forecast/volume` | Volume forecast for a given stock |
| `POST` | `/api/forecast/liquidity` | Liquidity classification (High / Low) |
| `POST` | `/api/forecast/full` | Combined price + volume + liquidity forecast in one call |

### AI Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | AI chatbot — sends message + history + market context to OpenRouter LLM |
| `POST` | `/api/chat/quick` | Quick data lookup — returns raw market context without LLM call |

### Example Requests

```bash
# Quick chat
curl -X POST http://127.0.0.1:8000/api/chat/quick \
  -H "Content-Type: application/json" \
  -d '{"message": "Analyse SFBT", "investment_amount": 5000}'

# Full AI chat with history
curl -X POST http://127.0.0.1:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Et pour SFBT, tu penses quoi?",
    "history": [{"role": "user", "content": "Bonjour"}],
    "investor_name": "Ahmed",
    "investor_profile": "Modere",
    "investment_amount": 5000
  }'

# Stock forecast
curl -X POST http://127.0.0.1:8000/api/forecast/full \
  -H "Content-Type: application/json" \
  -d '{"symbol": "SFBT", "model_type": "prophet", "forecast_days": 5}'
```

---

## Features

### Frontend Pages

| Page | Description |
|------|-------------|
| **Vue d'Ensemble** (Overview) | Market dashboard — market phase indicator (CET timezone), 4 summary cards, top 5 hausse/baisse, sentiment per stock with distribution bars, recent anomaly alerts. Auto-refreshes every 30s. |
| **Analyse de Valeur** (Stock Analysis) | Interactive heatmap of all stocks (color-coded by variation %), search & sort, grid/sector view. Click a stock to open the forecast panel — select model (Prophet/ARIMA/LSTM), set horizon (1–30 days), view charts via Recharts. |
| **Mon Portefeuille** (Portfolio) | Full investment simulation — risk profiling questionnaire, portfolio positions with P&L, sector allocation donut chart, performance area chart, transaction history, buy/sell simulated trading, alert investigation modal, AI chatbot integration. |
| **Surveillance** | Anomaly monitoring — snapshot vs live stream toggle, severity/type filters, alert feed with detailed cards, stats per anomaly type (bar charts), top flagged stocks. Auto-refreshes every 15s. |

### AI & ML Capabilities

| Feature | Details |
|---------|---------|
| **CrewAI Multi-Agent System** | 6 specialized agents in a sequential pipeline: Profile Analyst → Market Analyst → News Researcher → Anomaly Detector → Portfolio Advisor → Investment Chatbot |
| **Price Forecasting** | 3 models — simplified Prophet (trend + weekly seasonality + 95% CI), from-scratch ARIMA (OLS on differenced data), simplified LSTM (moving-average approximation). All implemented without heavy ML dependencies. |
| **Sentiment Analysis** | Trilingual keyword-based NLP (French, Arabic, English). Context-aware dampening for negation phrases, company-specific keyword boosts, and full explainability with per-keyword impact scores. |
| **Anomaly Detection** | 4 detector types: volume spikes (z-score > 3σ), price anomalies (> 5% variation), order imbalance (> 5x ratio), spread anomalies (z-score > 3σ). Streaming engine with rolling 200-snapshot history. |
| **AI Chatbot** | OpenRouter → Gemini 2.0 Flash (configurable). Market context injected into system prompt (top movers, anomalies). Personalized by investor name, risk profile, and capital. Conversation history (last 10 messages). |

### Chatbot Modes

The Portfolio page has a floating **"Assistant IA"** button in the bottom-right corner:

- **Mode Rapide (⚡)**: Instantly returns market data using local tools — no LLM call
- **Mode IA (🧠)**: Full LLM-powered analysis via OpenRouter — slower but detailed

---

## Database Schema (Supabase / PostgreSQL)

9 tables with Row-Level Security (RLS) enabled:

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `stocks` | Stock master data | `symbol` (unique), `name`, `sector`, `market_cap` |
| `stock_prices` | Daily OHLCV data | `stock_id` FK, `date`, `open`, `high`, `low`, `close`, `volume` |
| `predictions` | ML forecast results | `stock_id` FK, `target_date`, `predicted_price`, `confidence`, `model_version` |
| `news_articles` | News articles | `stock_id` FK, `title`, `content`, `source`, `language` (fr/ar) |
| `sentiment_analysis` | Article sentiment scores | `article_id` FK, `stock_id` FK, `sentiment_score` (-1 to 1), `sentiment_label` |
| `anomalies` | Detected anomalies | `stock_id` FK, `anomaly_type`, `severity`, `detected_value`, `expected_value`, `resolved` |
| `portfolios` | User portfolios | `user_id`, `initial_capital`, `current_value`, `cash_balance`, `risk_profile` |
| `portfolio_positions` | Stock positions | `portfolio_id` FK, `stock_id` FK, `quantity`, `average_buy_price`, `profit_loss` |
| `recommendations` | AI recommendations | `stock_id` FK, `recommendation` (buy/sell/hold), `confidence_score`, `target_price`, `reasoning` |

**RLS Policies**: Public `SELECT` on market data tables. Full CRUD for portfolio tables.

---

## Tech Stack

### Frontend

| Package | Version |
|---------|---------|
| React | ^18.3.1 |
| TypeScript | ^5.5.3 |
| Vite | ^5.4.2 |
| Tailwind CSS | ^3.4.1 |
| Recharts | ^2.12.7 |
| Lucide React | ^0.344.0 |
| @supabase/supabase-js | ^2.57.4 |

### Backend

| Package | Version |
|---------|---------|
| FastAPI | >=0.110.0 |
| Uvicorn | >=0.27.0 |
| Pydantic | >=2.6.0 |
| Pandas | >=2.2.0 |
| NumPy | >=1.24.0 |
| scikit-learn | >=1.3.0 |
| CrewAI[tools] | >=0.105.0 |
| Requests | >=2.31.0 |
| Matplotlib | >=3.7.0 |
| python-dotenv | (implicit) |

---

## Environment Variables

| Variable | Required | Where | Description |
|----------|----------|-------|-------------|
| `OPENROUTER_API_KEY` | Yes (for chat/agent) | `python/.env` | OpenRouter API key — powers AI chatbot and CrewAI agents |
| `SERPER_API_KEY` | Optional | `python/.env` | SerperDev API key — enables live web search for news in CrewAI |
| `VITE_SUPABASE_URL` | Optional | `frontend/.env` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Optional | `frontend/.env` | Supabase anonymous key |

---

## Testing

```bash
cd python
py tests/test_api.py        # API smoke tests (requires running server)
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| **CSV fallback for market data** | System works offline/demo without the live BVMT exchange |
| **From-scratch ML models** | Prophet, ARIMA implemented without `statsmodels`/`fbprophet` — minimizes dependency weight |
| **Synthetic data for forecasting** | OHLCV generated deterministically from stock symbol hash — reproducible, demo-ready |
| **CSS custom properties for theming** | Instead of Tailwind dark mode classes — enables smooth transitions and a cohesive design system |
| **State-based navigation** | `useState` page switching in `App.tsx` instead of React Router — keeps things simple for 4 views |
| **Background anomaly engine** | `asyncio.create_task` in FastAPI lifespan — polls every 30s, feeds rolling deque(200) |
| **Market context injection** | CSV data injected into LLM system prompt — gives AI real-time context about prices and anomalies |
| **Keyword-based sentiment** | No ML model needed — trilingual keyword lists with explainability, runs instantly |
| **Mock portfolio data** | Portfolio positions are client-side mock data (no backend persistence yet) |
| **CrewAI task chaining** | Sequential with explicit context dependencies: profile → market → (news + anomaly) → portfolio → explanation |

---

## Scénarios d'Utilisation

### Investisseur Débutant
Ahmed veut investir 5,000 TND mais ne connaît rien à la bourse. Le système évalue son profil de risque via un questionnaire, lui recommande un portefeuille diversifié, et explique chaque recommandation via le chatbot IA en français simple.

### Trader Actif
Leila surveille les opportunités. Le système détecte un pic de volume anormal sur SFBT (+340% au-dessus de la moyenne) et lui envoie une alerte de sévérité haute. Elle consulte l'analyse de sentiment, les prévisions Prophet à 5 jours, et prend sa décision.

### Régulateur (CMF)
Un inspecteur du Conseil du Marché Financier utilise le module Surveillance pour détecter des manipulations potentielles — déséquilibres ordres, spreads anormaux, mouvements rapides — et générer des rapports d'investigation avec historique.

---

## License

Developed for the **IHEC CodeLab 2.0** hackathon.

**Built for the Bourse des Valeurs Mobilières de Tunis (BVMT)**
