import { supabase } from './supabase';

export async function getStocks() {
  const { data, error } = await supabase
    .from('stocks')
    .select('*')
    .order('market_cap', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getStockPrices(stockId: string, days: number = 30) {
  const { data, error } = await supabase
    .from('stock_prices')
    .select('*')
    .eq('stock_id', stockId)
    .order('date', { ascending: false })
    .limit(days);

  if (error) throw error;
  return data;
}

export async function getPredictions(stockId: string) {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('stock_id', stockId)
    .eq('prediction_date', new Date().toISOString().split('T')[0])
    .order('target_date', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getNewsArticles(stockId?: string, limit: number = 10) {
  let query = supabase
    .from('news_articles')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (stockId) {
    query = query.eq('stock_id', stockId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getSentimentAnalysis(stockId: string) {
  const { data, error } = await supabase
    .from('sentiment_analysis')
    .select(`
      *,
      news_articles (
        title,
        source,
        published_at
      )
    `)
    .eq('stock_id', stockId)
    .order('analyzed_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}

export async function getAnomalies(resolved: boolean = false, limit: number = 50) {
  const { data, error } = await supabase
    .from('anomalies')
    .select(`
      *,
      stocks (
        symbol,
        name
      )
    `)
    .eq('resolved', resolved)
    .order('detected_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getPortfolio() {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPortfolioPositions(portfolioId: string) {
  const { data, error } = await supabase
    .from('portfolio_positions')
    .select(`
      *,
      stocks (
        symbol,
        name,
        sector
      )
    `)
    .eq('portfolio_id', portfolioId)
    .order('total_value', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getRecommendations(stockId?: string, limit: number = 15) {
  let query = supabase
    .from('recommendations')
    .select(`
      *,
      stocks (
        symbol,
        name
      )
    `)
    .gt('valid_until', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (stockId) {
    query = query.eq('stock_id', stockId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getTopMovers() {
  const { data: stocks, error: stocksError } = await supabase
    .from('stocks')
    .select('id, symbol, name');

  if (stocksError) throw stocksError;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const priceData = await Promise.all(
    stocks.map(async (stock) => {
      const { data: prices } = await supabase
        .from('stock_prices')
        .select('date, close')
        .eq('stock_id', stock.id)
        .in('date', [today, yesterday])
        .order('date', { ascending: false })
        .limit(2);

      if (prices && prices.length === 2) {
        const change = ((prices[0].close - prices[1].close) / prices[1].close) * 100;
        return {
          ...stock,
          current_price: prices[0].close,
          change: change,
        };
      }
      return null;
    })
  );

  const validData = priceData.filter(d => d !== null);
  const gainers = [...validData].sort((a, b) => b!.change - a!.change).slice(0, 5);
  const losers = [...validData].sort((a, b) => a!.change - b!.change).slice(0, 5);

  return { gainers, losers };
}

export async function getMarketSentiment() {
  const { data, error } = await supabase
    .from('sentiment_analysis')
    .select('sentiment_score, sentiment_label')
    .gte('analyzed_at', new Date(Date.now() - 7 * 86400000).toISOString());

  if (error) throw error;

  const avgScore = data.reduce((sum, item) => sum + item.sentiment_score, 0) / data.length;
  const positive = data.filter(d => d.sentiment_label === 'positive').length;
  const negative = data.filter(d => d.sentiment_label === 'negative').length;
  const neutral = data.filter(d => d.sentiment_label === 'neutral').length;

  return {
    score: avgScore,
    distribution: { positive, negative, neutral },
  };
}
