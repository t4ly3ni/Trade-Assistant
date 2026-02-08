# BVMT Intelligent Trading Assistant System

Système d'Assistant Intelligent de Trading pour la Bourse des Valeurs Mobilières de Tunis (BVMT)

---

## Quick Start (TL;DR)

```bash
# 1. Backend — install & run
cd python
pip install -r requirements.txt
py run.py --reload                 # → http://127.0.0.1:8000

# 2. Frontend — install & run (new terminal)
cd frontend
npm install
npm run dev                        # → http://localhost:5173

# 3. CrewAI Agent (optional, new terminal)
cd python
py -m agent.main --quick           # Quick single-stock analysis
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
├── frontend/              # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/    # Card, Layout, ChatBot
│   │   ├── pages/         # Overview, StockAnalysis, Portfolio, Surveillance
│   │   ├── lib/           # API client, types, mock data, supabase
│   │   ├── App.tsx        # Page router
│   │   └── main.tsx       # Entry point
│   ├── package.json
│   └── vite.config.ts
│
├── python/                # FastAPI backend + CrewAI agents
│   ├── bvmt/              # Core API package
│   │   ├── api.py         # FastAPI REST endpoints (market, analysis, anomaly, sentiment, chat)
│   │   ├── scraper.py     # BVMT market data fetcher
│   │   ├── analyzer.py    # Top hausse/baisse analysis
│   │   ├── anomaly.py     # Anomaly detection engine
│   │   ├── models.py      # Pydantic data models
│   │   └── config.py      # Constants & thresholds
│   │
│   ├── agent/             # CrewAI multi-agent investment advisor
│   │   ├── crew.py        # Main crew orchestration (6 agents, 6 tasks)
│   │   ├── main.py        # CLI entry point
│   │   ├── config/        # YAML configs (agents.yaml, tasks.yaml)
│   │   └── tools/         # Custom tools (market_data, anomaly, sentiment, news, portfolio)
│   │
│   ├── sentiment/         # News sentiment analysis module
│   │   ├── system.py      # TradingSentimentSystem
│   │   ├── scraper.py     # News scraper
│   │   └── analyzer.py    # Sentiment classifier
│   │
│   ├── data/              # CSV data files (market data, anomaly alerts)
│   ├── tests/             # API tests
│   ├── run.py             # Server entry point
│   ├── requirements.txt   # Python dependencies
│   └── .env               # API keys (OPENROUTER_API_KEY)
│
└── supabase/              # Database migrations
    └── migrations/
```

---

## Step-by-Step Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd bvmt
```

### 2. Backend Setup (Python / FastAPI)

```bash
cd python

# Create a virtual environment (recommended)
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Install all dependencies
pip install -r requirements.txt
```

#### Configure environment variables

Create a `.env` file inside `python/`:

```env
# Required for CrewAI chatbot
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Optional — enables live web search for news
SERPER_API_KEY=your-serper-key-here
```

#### Start the API server

```bash
# Development mode (auto-reload on code changes)
py run.py --reload

# Production mode
py run.py

# Custom host/port
py run.py --host 0.0.0.0 --port 3001
```

The API will be available at:
- **API**: http://127.0.0.1:8000
- **Swagger docs**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc

### 3. Frontend Setup (React / Vite)

Open a **new terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at: **http://localhost:5173**

#### Other frontend commands

```bash
npm run build      # Build for production (output in dist/)
npm run preview    # Preview the production build locally
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript type checking
```

### 4. CrewAI Investment Agent (Optional)

The AI agent uses OpenRouter to call LLMs. Make sure `OPENROUTER_API_KEY` is set in `python/.env`.

Open a **new terminal**:

```bash
cd python

# Full crew run (6 agents — profile, market, news, anomaly, portfolio, chatbot)
py -m agent.main

# Quick single-stock analysis (4 agents — faster)
py -m agent.main --quick

# Analyze a specific stock
py -m agent.main --stock SFBT

# Customize the investor profile
py -m agent.main --name "Leila" --capital 10000 --profile "Dynamique"

# Use a different LLM model
py -m agent.main --model "openrouter/anthropic/claude-3.5-sonnet"
```

#### CLI flags

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

You need **2 terminals minimum** (3 if you want to use the CLI agent):

| Terminal | Directory | Command | URL |
|----------|-----------|---------|-----|
| 1 - Backend | `python/` | `py run.py --reload` | http://127.0.0.1:8000 |
| 2 - Frontend | `frontend/` | `npm run dev` | http://localhost:5173 |
| 3 - Agent (optional) | `python/` | `py -m agent.main --quick` | CLI output |

> **Important**: Start the backend **before** the frontend. The frontend calls `http://127.0.0.1:8000` for all API data.

### Using the Chatbot

The Portfolio page (http://localhost:5173 → "Mon Portefeuille") has a floating **"Assistant IA"** button in the bottom-right corner. Click it to open the chatbot.

- **Mode Rapide (⚡)**: Instantly returns market data and portfolio suggestions using local tools — no LLM call.
- **Mode IA (🧠)**: Runs the full CrewAI agent pipeline via OpenRouter — slower but provides detailed AI-powered analysis.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/market` | Full market data (all stocks) |
| GET | `/api/analysis?top_n=5` | Top gainers/losers + market summary |
| GET | `/api/anomalies` | Single-snapshot anomaly detection |
| GET | `/api/stream/status` | Live anomaly engine status |
| GET | `/api/stream/alerts` | Full report from live engine |
| POST | `/api/stream/reset` | Reset the live engine |
| GET | `/api/sentiment/stocks` | List available sentiment symbols |
| GET | `/api/sentiment/all` | Sentiment for all tracked stocks |
| GET | `/api/sentiment/{symbol}` | Sentiment for a specific stock |
| POST | `/api/chat` | AI chatbot (full CrewAI pipeline) |
| POST | `/api/chat/quick` | Quick chatbot (direct tool queries) |

### Chat API example

```bash
curl -X POST http://127.0.0.1:8000/api/chat/quick \
  -H "Content-Type: application/json" \
  -d '{"message": "Analyse SFBT", "stock": "SFBT", "investment_amount": 5000}'
```

---

## Testing

```bash
cd python
py tests/test_api.py
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS 3.4, Lucide React |
| **Backend API** | Python 3.11+, FastAPI, Pydantic, Uvicorn |
| **AI Agents** | CrewAI, OpenRouter (Gemini / Claude / GPT) |
| **Sentiment** | Custom scraper + NLP classifier |
| **Database** | Supabase (PostgreSQL) |
| **Data** | CSV files (market data, anomaly alerts) |

## Features

- **Market Overview**: TUNINDEX index, top 5 gainers/losers, global sentiment
- **Stock Analysis**: Price charts, 5-day forecasts, sentiment timeline, AI recommendations
- **Portfolio Management**: Total value, P&L, sector allocation, ROI tracking
- **Anomaly Detection**: Real-time volume spikes, price anomalies, severity classification
- **AI Chatbot**: Floating assistant on Portfolio page (quick mode + full CrewAI mode)
- **Multi-Agent System**: 6 specialized agents (profile, market, news, anomaly, portfolio, chatbot)

## Scénarios d'Utilisation

### Investisseur Débutant
Ahmed veut investir 5000 TND mais ne connaît rien à la bourse. Le système lui recommande un portefeuille diversifié adapté à son profil de risque modéré et explique chaque recommandation via le chatbot IA.

### Trader Actif
Leila surveille les opportunités. Le système détecte un pic de volume anormal sur SFBT et lui envoie une alerte. Elle consulte l'analyse de sentiment et les prévisions avant de prendre sa décision.

### Régulateur (CMF)
Un inspecteur du CMF utilise le module de surveillance pour détecter des manipulations potentielles de marché et générer des rapports d'investigation.

---

## Licence

Ce projet a été développé dans le cadre de l'IHEC CodeLab 2.0.

**Développé pour la Bourse des Valeurs Mobilières de Tunis (BVMT)**
