// ─── Types matching the FastAPI backend (bvmt.models) ───────────

export interface StockData {
  isin: string;
  valeur: string;
  ticker: string;
  groupe: string;
  statut: string;
  ord_a: number;
  qty_a: number;
  achat: number;
  vente: number;
  qty_v: number;
  ord_v: number;
  reference: number;
  cto: number;
  vto: number;
  qto: number;
  ouverture: number;
  dernier: number;
  variation: number;
  dern_qty: number;
  quantite: number;
  capitalisation: number;
  p_haut: number;
  p_bas: number;
  s_haut: number;
  s_bas: number;
  heure: string;
}

export interface MarketResponse {
  timestamp: string;
  count: number;
  stocks: StockData[];
}

export interface TopMover {
  valeur: string;
  ticker: string;
  groupe: string;
  reference: number;
  dernier: number;
  variation: number;
  quantite: number;
  capitalisation: number;
}

export interface MarketSummary {
  hausses: number;
  baisses: number;
  inchanges: number;
  actives: number;
  total: number;
  volume_total: number;
}

export interface AnalysisResponse {
  timestamp: string;
  top_hausse: TopMover[];
  top_baisse: TopMover[];
  summary: MarketSummary;
}

export interface Alert {
  timestamp: string;
  isin: string;
  valeur: string;
  anomaly_type: string;
  severity: string;
  message: string;
  current_value: number;
  threshold: number;
  details: string;
}

export interface AnomalyReport {
  timestamp: string;
  total_alerts: number;
  alerts: Alert[];
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  top_flagged: { valeur: string; count: number }[];
}

export interface StreamStatus {
  running: boolean;
  snapshots_ingested: number;
  total_alerts: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  top_flagged: { valeur: string; count: number }[];
}

// ─── Sentiment API types (sentiment module on port 8001) ────────

export interface KeywordDetail {
  word: string;
  language: string;
  count: number;
  impact: number;
}

export interface KeywordCounts {
  count: number;
  top_terms: string[];
}

export interface KeywordBreakdown {
  positive_keywords: KeywordDetail[];
  negative_keywords: KeywordDetail[];
  positive: KeywordCounts;
  negative: KeywordCounts;
  neutral: KeywordCounts;
}

export interface LanguageScore {
  score: number;
  keywords_found: number;
  positive_hits: number;
  negative_hits: number;
}

export interface ExplanationDetail {
  summary: string;
  intensity: string;
  key_findings: string[];
  keyword_breakdown: KeywordBreakdown;
  language_analysis: Record<string, LanguageScore>;
  sector_insights: string | null;
  recommendation: string;
}

export interface ArticleSentiment {
  id: string;
  title: string;
  source: string;
  language: string;
  published_date: string;
  sentiment_score: number;
  sentiment_label: string;
  confidence: number;
  analysis_method: string;
  positive_keywords: number;
  negative_keywords: number;
  explanation: string | null;
  explanation_detail: ExplanationDetail | null;
}

export interface SentimentDistribution {
  positive: number;
  negative: number;
  neutral: number;
}

export interface StockSentiment {
  symbol: string;
  overall_score: number;
  sentiment: string;
  confidence: number;
  articles_analyzed: number;
  sentiment_distribution: SentimentDistribution;
  overall_explanation: string;
  analysis_timestamp: string;
  articles: ArticleSentiment[];
}

export interface AllStocksSentimentResponse {
  timestamp: string;
  stocks_analyzed: number;
  results: Record<string, StockSentiment>;
}

export interface SentimentHealthResponse {
  status: string;
  timestamp: string;
}

export interface StocksListResponse {
  tunisian_stocks: string[];
  count: number;
}

// ─── Forecasting types ──────────────────────────────────────────────

export interface ForecastPoint {
  date: string;
  predicted_close: number;
  lower_bound: number;
  upper_bound: number;
  confidence_interval_95: string;
}

export interface PriceForecastResult {
  symbol: string;
  model: string;
  forecast_date: string;
  last_actual_price: number;
  last_actual_date: string;
  forecasts: ForecastPoint[];
}

export interface VolumeForecastPoint {
  date: string;
  predicted_volume: number;
  lower_bound: number;
  upper_bound: number;
}

export interface VolumeForecastResult {
  symbol: string;
  model: string;
  forecast_type: string;
  forecasts: VolumeForecastPoint[];
}

export interface LiquidityResult {
  symbol: string;
  current_liquidity_score: number;
  threshold: number;
  classification: 'High' | 'Low';
  high_liquidity_probability: number;
  low_liquidity_probability: number;
  recent_volume: number;
  volume_ratio: number;
  volatility: number;
}

export interface FullForecastResult {
  symbol: string;
  model: string;
  price: PriceForecastResult;
  volume: VolumeForecastResult;
  liquidity: LiquidityResult;
}
