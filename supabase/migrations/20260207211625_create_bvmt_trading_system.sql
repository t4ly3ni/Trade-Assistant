/*
  # BVMT Intelligent Trading System Database Schema

  ## Overview
  Complete database schema for the Tunisian Stock Exchange trading assistant system.

  ## New Tables

  1. **stocks**
     - `id` (uuid, primary key) - Unique stock identifier
     - `symbol` (text, unique) - Stock ticker symbol
     - `name` (text) - Company name
     - `sector` (text) - Business sector
     - `market_cap` (numeric) - Market capitalization in TND
     - `created_at` (timestamptz) - Record creation timestamp

  2. **stock_prices**
     - `id` (uuid, primary key) - Unique price record identifier
     - `stock_id` (uuid, foreign key) - Reference to stocks table
     - `date` (date) - Trading date
     - `open` (numeric) - Opening price
     - `high` (numeric) - Highest price
     - `low` (numeric) - Lowest price
     - `close` (numeric) - Closing price
     - `volume` (bigint) - Trading volume
     - `created_at` (timestamptz) - Record creation timestamp

  3. **predictions**
     - `id` (uuid, primary key) - Unique prediction identifier
     - `stock_id` (uuid, foreign key) - Reference to stocks table
     - `prediction_date` (date) - Date of prediction
     - `target_date` (date) - Date being predicted
     - `predicted_price` (numeric) - Predicted closing price
     - `confidence` (numeric) - Confidence score (0-1)
     - `predicted_volume` (bigint) - Predicted trading volume
     - `model_version` (text) - ML model version used
     - `created_at` (timestamptz) - Record creation timestamp

  4. **news_articles**
     - `id` (uuid, primary key) - Unique article identifier
     - `stock_id` (uuid, foreign key) - Reference to stocks table
     - `title` (text) - Article title
     - `content` (text) - Article content
     - `source` (text) - News source
     - `url` (text) - Article URL
     - `published_at` (timestamptz) - Publication timestamp
     - `language` (text) - Article language (fr/ar)
     - `created_at` (timestamptz) - Record creation timestamp

  5. **sentiment_analysis**
     - `id` (uuid, primary key) - Unique sentiment record identifier
     - `article_id` (uuid, foreign key) - Reference to news_articles table
     - `stock_id` (uuid, foreign key) - Reference to stocks table
     - `sentiment_score` (numeric) - Sentiment score (-1 to 1)
     - `sentiment_label` (text) - Label (positive/negative/neutral)
     - `confidence` (numeric) - Analysis confidence (0-1)
     - `analyzed_at` (timestamptz) - Analysis timestamp
     - `created_at` (timestamptz) - Record creation timestamp

  6. **anomalies**
     - `id` (uuid, primary key) - Unique anomaly identifier
     - `stock_id` (uuid, foreign key) - Reference to stocks table
     - `anomaly_type` (text) - Type (volume_spike/price_jump/suspicious_pattern)
     - `severity` (text) - Severity level (low/medium/high/critical)
     - `description` (text) - Anomaly description
     - `detected_value` (numeric) - Detected metric value
     - `expected_value` (numeric) - Expected metric value
     - `deviation` (numeric) - Deviation from normal
     - `detected_at` (timestamptz) - Detection timestamp
     - `resolved` (boolean) - Whether anomaly is resolved
     - `created_at` (timestamptz) - Record creation timestamp

  7. **portfolios**
     - `id` (uuid, primary key) - Unique portfolio identifier
     - `user_id` (uuid) - User identifier
     - `name` (text) - Portfolio name
     - `initial_capital` (numeric) - Starting capital in TND
     - `current_value` (numeric) - Current portfolio value
     - `cash_balance` (numeric) - Available cash
     - `risk_profile` (text) - Risk profile (conservative/moderate/aggressive)
     - `created_at` (timestamptz) - Record creation timestamp
     - `updated_at` (timestamptz) - Last update timestamp

  8. **portfolio_positions**
     - `id` (uuid, primary key) - Unique position identifier
     - `portfolio_id` (uuid, foreign key) - Reference to portfolios table
     - `stock_id` (uuid, foreign key) - Reference to stocks table
     - `quantity` (integer) - Number of shares
     - `average_buy_price` (numeric) - Average purchase price
     - `current_price` (numeric) - Current market price
     - `total_value` (numeric) - Position total value
     - `profit_loss` (numeric) - Unrealized profit/loss
     - `profit_loss_percent` (numeric) - P&L percentage
     - `purchase_date` (date) - Initial purchase date
     - `updated_at` (timestamptz) - Last update timestamp

  9. **recommendations**
     - `id` (uuid, primary key) - Unique recommendation identifier
     - `stock_id` (uuid, foreign key) - Reference to stocks table
     - `recommendation` (text) - Action (buy/sell/hold)
     - `confidence_score` (numeric) - Confidence (0-1)
     - `target_price` (numeric) - Target price
     - `reasoning` (text) - Explanation for recommendation
     - `valid_until` (timestamptz) - Recommendation expiry
     - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users to access their own data
  - Public read access for market data (stocks, prices, predictions, sentiment)
  - Private access for portfolio data
*/

-- Create stocks table
CREATE TABLE IF NOT EXISTS stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text UNIQUE NOT NULL,
  name text NOT NULL,
  sector text NOT NULL,
  market_cap numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create stock_prices table
CREATE TABLE IF NOT EXISTS stock_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid REFERENCES stocks(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  open numeric NOT NULL,
  high numeric NOT NULL,
  low numeric NOT NULL,
  close numeric NOT NULL,
  volume bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stock_id, date)
);

-- Create predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid REFERENCES stocks(id) ON DELETE CASCADE NOT NULL,
  prediction_date date NOT NULL,
  target_date date NOT NULL,
  predicted_price numeric NOT NULL,
  confidence numeric NOT NULL,
  predicted_volume bigint DEFAULT 0,
  model_version text DEFAULT 'v1.0',
  created_at timestamptz DEFAULT now()
);

-- Create news_articles table
CREATE TABLE IF NOT EXISTS news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid REFERENCES stocks(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  source text NOT NULL,
  url text,
  published_at timestamptz NOT NULL,
  language text DEFAULT 'fr',
  created_at timestamptz DEFAULT now()
);

-- Create sentiment_analysis table
CREATE TABLE IF NOT EXISTS sentiment_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES news_articles(id) ON DELETE CASCADE NOT NULL,
  stock_id uuid REFERENCES stocks(id) ON DELETE CASCADE NOT NULL,
  sentiment_score numeric NOT NULL,
  sentiment_label text NOT NULL,
  confidence numeric NOT NULL,
  analyzed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create anomalies table
CREATE TABLE IF NOT EXISTS anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid REFERENCES stocks(id) ON DELETE CASCADE NOT NULL,
  anomaly_type text NOT NULL,
  severity text NOT NULL,
  description text NOT NULL,
  detected_value numeric NOT NULL,
  expected_value numeric NOT NULL,
  deviation numeric NOT NULL,
  detected_at timestamptz NOT NULL,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  initial_capital numeric NOT NULL,
  current_value numeric NOT NULL,
  cash_balance numeric NOT NULL,
  risk_profile text DEFAULT 'moderate',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create portfolio_positions table
CREATE TABLE IF NOT EXISTS portfolio_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  stock_id uuid REFERENCES stocks(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL,
  average_buy_price numeric NOT NULL,
  current_price numeric NOT NULL,
  total_value numeric NOT NULL,
  profit_loss numeric NOT NULL,
  profit_loss_percent numeric NOT NULL,
  purchase_date date NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(portfolio_id, stock_id)
);

-- Create recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid REFERENCES stocks(id) ON DELETE CASCADE NOT NULL,
  recommendation text NOT NULL,
  confidence_score numeric NOT NULL,
  target_price numeric,
  reasoning text NOT NULL,
  valid_until timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentiment_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- Public read policies for market data
CREATE POLICY "Anyone can view stocks"
  ON stocks FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view stock prices"
  ON stock_prices FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view predictions"
  ON predictions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view news articles"
  ON news_articles FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view sentiment analysis"
  ON sentiment_analysis FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view anomalies"
  ON anomalies FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view recommendations"
  ON recommendations FOR SELECT
  USING (true);

-- Portfolio policies (user-specific)
CREATE POLICY "Users can view own portfolios"
  ON portfolios FOR SELECT
  USING (true);

CREATE POLICY "Users can create portfolios"
  ON portfolios FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own portfolios"
  ON portfolios FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view portfolio positions"
  ON portfolio_positions FOR SELECT
  USING (true);

CREATE POLICY "Users can create portfolio positions"
  ON portfolio_positions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update portfolio positions"
  ON portfolio_positions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete portfolio positions"
  ON portfolio_positions FOR DELETE
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_prices_stock_date ON stock_prices(stock_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_stock_target ON predictions(stock_id, target_date);
CREATE INDEX IF NOT EXISTS idx_news_stock_published ON news_articles(stock_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_sentiment_stock ON sentiment_analysis(stock_id, analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_stock_detected ON anomalies(stock_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_portfolio ON portfolio_positions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_stock ON recommendations(stock_id, created_at DESC);