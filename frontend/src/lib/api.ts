import type {
  MarketResponse,
  AnalysisResponse,
  AnomalyReport,
  StreamStatus,
  AllStocksSentimentResponse,
  StockSentiment,
  FullForecastResult,
} from './types';

import {
  portfolio as mockPortfolio,
  portfolioPositions as mockPositions,
} from './mockData';

const API_BASE = 'http://127.0.0.1:8000';

// ─── Real API calls (FastAPI backend) ───────────────────────────

export async function getMarketData(): Promise<MarketResponse> {
  const res = await fetch(`${API_BASE}/api/market`);
  if (!res.ok) throw new Error(`Market API error: ${res.status}`);
  return res.json();
}

export async function getAnalysis(topN: number = 5): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/api/analysis?top_n=${topN}`);
  if (!res.ok) throw new Error(`Analysis API error: ${res.status}`);
  return res.json();
}

export async function getAnomalyReport(): Promise<AnomalyReport> {
  const res = await fetch(`${API_BASE}/api/anomalies`);
  if (!res.ok) throw new Error(`Anomaly API error: ${res.status}`);
  return res.json();
}

export async function getStreamStatus(): Promise<StreamStatus> {
  const res = await fetch(`${API_BASE}/api/stream/status`);
  if (!res.ok) throw new Error(`Stream status error: ${res.status}`);
  return res.json();
}

export async function getStreamAlerts(): Promise<AnomalyReport> {
  const res = await fetch(`${API_BASE}/api/stream/alerts`);
  if (!res.ok) throw new Error(`Stream alerts error: ${res.status}`);
  return res.json();
}

export async function resetStream(): Promise<{ status: string; timestamp: string }> {
  const res = await fetch(`${API_BASE}/api/stream/reset`, { method: 'POST' });
  if (!res.ok) throw new Error(`Stream reset error: ${res.status}`);
  return res.json();
}

export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error('API unreachable');
  return res.json();
}

// ─── Portfolio (mock — no backend equivalent yet) ───────────────

export async function getPortfolio() {
  return mockPortfolio;
}

export async function getPortfolioPositions(_portfolioId: string) {
  return [...mockPositions].sort((a, b) => b.total_value - a.total_value);
}

// ─── Sentiment API calls (same server) ─────────────────────────

export async function getAllSentiments(): Promise<AllStocksSentimentResponse> {
  const res = await fetch(`${API_BASE}/api/sentiment/all`);
  if (!res.ok) throw new Error(`Sentiment all error: ${res.status}`);
  return res.json();
}

export async function getStockSentiment(symbol: string): Promise<StockSentiment> {
  const res = await fetch(`${API_BASE}/api/sentiment/${symbol}`);
  if (!res.ok) throw new Error(`Sentiment error for ${symbol}: ${res.status}`);
  return res.json();
}

// ─── Chat API (OpenRouter LLM) ──────────────────────────────────

// ─── Forecasting API ────────────────────────────────────────────

export async function getForecastStocks(): Promise<{ stocks: string[] }> {
  const res = await fetch(`${API_BASE}/api/forecast/stocks`);
  if (!res.ok) throw new Error(`Forecast stocks error: ${res.status}`);
  return res.json();
}

export async function getFullForecast(
  symbol: string,
  modelType: string = 'prophet',
  forecastDays: number = 5,
): Promise<FullForecastResult> {
  const res = await fetch(`${API_BASE}/api/forecast/full`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbol,
      model_type: modelType,
      forecast_days: forecastDays,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Forecast error: ${res.status}`);
  }
  return res.json();
}

// ─── Chat API (OpenRouter LLM) contd ───────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  investor_name?: string;
  investor_profile?: string;
  investment_amount?: number;
}

export interface ChatResponse {
  reply: string;
  timestamp: string;
}

export async function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Chat error: ${res.status}`);
  }
  return res.json();
}
