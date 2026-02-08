import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  market_cap: number;
  created_at: string;
}

export interface StockPrice {
  id: string;
  stock_id: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  created_at: string;
}

export interface Prediction {
  id: string;
  stock_id: string;
  prediction_date: string;
  target_date: string;
  predicted_price: number;
  confidence: number;
  predicted_volume: number;
  model_version: string;
  created_at: string;
}

export interface NewsArticle {
  id: string;
  stock_id: string;
  title: string;
  content: string;
  source: string;
  url: string;
  published_at: string;
  language: string;
  created_at: string;
}

export interface SentimentAnalysis {
  id: string;
  article_id: string;
  stock_id: string;
  sentiment_score: number;
  sentiment_label: string;
  confidence: number;
  analyzed_at: string;
  created_at: string;
}

export interface Anomaly {
  id: string;
  stock_id: string;
  anomaly_type: string;
  severity: string;
  description: string;
  detected_value: number;
  expected_value: number;
  deviation: number;
  detected_at: string;
  resolved: boolean;
  created_at: string;
}

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  initial_capital: number;
  current_value: number;
  cash_balance: number;
  risk_profile: string;
  created_at: string;
  updated_at: string;
}

export interface PortfolioPosition {
  id: string;
  portfolio_id: string;
  stock_id: string;
  quantity: number;
  average_buy_price: number;
  current_price: number;
  total_value: number;
  profit_loss: number;
  profit_loss_percent: number;
  purchase_date: string;
  updated_at: string;
}

export interface Recommendation {
  id: string;
  stock_id: string;
  recommendation: string;
  confidence_score: number;
  target_price: number;
  reasoning: string;
  valid_until: string;
  created_at: string;
}
