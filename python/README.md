# BVMT Market API — Python Backend

REST API for Bourse de Tunis (BVMT) market data, analysis, and anomaly detection.  
Built with **FastAPI** + **Pydantic**, designed for integration with the React/TypeScript frontend.

---

## Project Structure

```
python/
├── bvmt/                  # Core Python package
│   ├── __init__.py        #   Package exports
│   ├── config.py          #   Shared constants & thresholds
│   ├── models.py          #   Pydantic data models
│   ├── scraper.py         #   Market data fetcher (BVMT REST API)
│   ├── analyzer.py        #   Top hausse/baisse & market summary
│   ├── anomaly.py         #   Anomaly detection (stateless + streaming)
│   └── api.py             #   FastAPI REST endpoints
│
├── tests/                 # API tests
│   └── test_api.py        #   Smoke test for all endpoints
│
├── legacy/                # Old standalone scripts (reference only)
│   ├── scraper.py
│   ├── analyze.py
│   └── anomaly_detector.py
│
├── data/                  # Generated data outputs
│   ├── *.csv              #   Market data & alert exports
│   └── *.html             #   Scraped page sources
│
├── run.py                 # Server entry point
├── requirements.txt       # Python dependencies
├── .gitignore
└── README.md              # ← You are here
```

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Start the server

```bash
# Simple
py run.py

# With auto-reload (development)
py run.py --reload

# Custom port
py run.py --port 3001
```

Or directly with uvicorn (must run from inside `python/`):

```bash
cd python
py -m uvicorn bvmt.api:app --reload --port 8000
```

### 3. Open the docs

- Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/market` | All stocks — full market data |
| GET | `/api/analysis?top_n=5` | Top gainers/losers + market summary |
| GET | `/api/anomalies` | Single-snapshot anomaly detection |
| GET | `/api/stream/status` | Live anomaly engine status |
| GET | `/api/stream/alerts` | Full report from live engine |
| POST | `/api/stream/reset` | Reset the live engine |

## Testing

Start the server, then:

```bash
py tests/test_api.py
```

## Architecture

```
BVMT REST API ──→ scraper.py ──→ models (Pydantic)
                                    │
                        ┌───────────┼───────────┐
                        ▼           ▼           ▼
                   analyzer.py  anomaly.py   api.py (FastAPI)
                   (top movers) (detectors)  (REST endpoints)
                                    │
                              AnomalyEngine
                           (stateful, streaming,
                            background polling)
```
