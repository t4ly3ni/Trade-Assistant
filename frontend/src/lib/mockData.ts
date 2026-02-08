// Mock data for BVMT (Bourse des Valeurs Mobilières de Tunis)

export const stocks = [
  { id: '1', symbol: 'BIAT', name: 'Banque Internationale Arabe de Tunisie', sector: 'Banques', market_cap: 2800000000, created_at: '2024-01-01' },
  { id: '2', symbol: 'BNA', name: 'Banque Nationale Agricole', sector: 'Banques', market_cap: 1200000000, created_at: '2024-01-01' },
  { id: '3', symbol: 'SFBT', name: 'Société Frigorifique et Brasserie de Tunis', sector: 'Agroalimentaire', market_cap: 2100000000, created_at: '2024-01-01' },
  { id: '4', symbol: 'PGH', name: 'Poulina Group Holding', sector: 'Holdings', market_cap: 1500000000, created_at: '2024-01-01' },
  { id: '5', symbol: 'STB', name: 'Société Tunisienne de Banque', sector: 'Banques', market_cap: 900000000, created_at: '2024-01-01' },
  { id: '6', symbol: 'ATTIJARI', name: 'Attijari Bank', sector: 'Banques', market_cap: 1100000000, created_at: '2024-01-01' },
  { id: '7', symbol: 'TLNET', name: 'Telnet Holding', sector: 'Technologie', market_cap: 400000000, created_at: '2024-01-01' },
  { id: '8', symbol: 'SAH', name: 'SAH Lilas', sector: 'Industrie', market_cap: 600000000, created_at: '2024-01-01' },
  { id: '9', symbol: 'SOTUVER', name: 'Société Tunisienne de Verreries', sector: 'Industrie', market_cap: 350000000, created_at: '2024-01-01' },
  { id: '10', symbol: 'TJARI', name: 'Tunisie Leasing & Factoring', sector: 'Services Financiers', market_cap: 500000000, created_at: '2024-01-01' },
];

function generatePricesForStock(stockId: string, basePrice: number, days: number = 30): any[] {
  const prices = [];
  let price = basePrice;
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const change = (Math.random() - 0.48) * basePrice * 0.03;
    price = Math.max(price + change, basePrice * 0.7);
    const open = price + (Math.random() - 0.5) * basePrice * 0.01;
    const high = Math.max(price, open) + Math.random() * basePrice * 0.015;
    const low = Math.min(price, open) - Math.random() * basePrice * 0.015;

    prices.push({
      id: `price-${stockId}-${i}`,
      stock_id: stockId,
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(price.toFixed(2)),
      volume: Math.floor(Math.random() * 50000) + 5000,
      created_at: date.toISOString(),
    });
  }
  return prices;
}

const basePrices: Record<string, number> = {
  '1': 112.50, '2': 14.80, '3': 21.40, '4': 11.90, '5': 5.60,
  '6': 42.30, '7': 8.75, '8': 15.20, '9': 7.90, '10': 19.50,
};

export const allStockPrices: Record<string, any[]> = {};
for (const stock of stocks) {
  allStockPrices[stock.id] = generatePricesForStock(stock.id, basePrices[stock.id]);
}

function generatePredictions(stockId: string): any[] {
  const prices = allStockPrices[stockId];
  const lastPrice = prices[prices.length - 1].close;
  const predictions = [];
  const today = new Date();

  for (let i = 1; i <= 5; i++) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + i);
    const predicted = lastPrice * (1 + (Math.random() - 0.45) * 0.04);
    predictions.push({
      id: `pred-${stockId}-${i}`,
      stock_id: stockId,
      prediction_date: today.toISOString().split('T')[0],
      target_date: targetDate.toISOString().split('T')[0],
      predicted_price: parseFloat(predicted.toFixed(2)),
      confidence: parseFloat((0.65 + Math.random() * 0.25).toFixed(2)),
      predicted_volume: Math.floor(Math.random() * 40000) + 10000,
      model_version: 'LSTM-v1.2',
      created_at: today.toISOString(),
    });
  }
  return predictions;
}

export const allPredictions: Record<string, any[]> = {};
for (const stock of stocks) {
  allPredictions[stock.id] = generatePredictions(stock.id);
}

const newsTitles = [
  { title: "BIAT annonce des résultats record pour le premier semestre", source: "Tunis Afrique Presse", label: "positive" },
  { title: "Le secteur bancaire tunisien en hausse grâce aux réformes", source: "Leaders", label: "positive" },
  { title: "Inquiétudes sur la liquidité du marché tunisien", source: "Webmanagercenter", label: "negative" },
  { title: "PGH diversifie ses activités à l'international", source: "L'Économiste Maghrébin", label: "positive" },
  { title: "Ralentissement attendu dans le secteur agroalimentaire", source: "Business News", label: "negative" },
  { title: "La BVMT lance un nouveau programme de modernisation", source: "TAP", label: "positive" },
  { title: "Les investisseurs étrangers reviennent sur le marché tunisien", source: "Kapitalis", label: "positive" },
  { title: "Analyse: Les valeurs technologiques sous pression", source: "Webmanagercenter", label: "negative" },
  { title: "Stabilité attendue pour les indices cette semaine", source: "Leaders", label: "neutral" },
  { title: "Nouvelles régulations pour le marché obligataire tunisien", source: "L'Économiste Maghrébin", label: "neutral" },
  { title: "SFBT poursuit sa stratégie d'expansion régionale", source: "Business News", label: "positive" },
  { title: "Le dinar tunisien en légère appréciation face à l'euro", source: "TAP", label: "positive" },
  { title: "Résultats mitigés pour le secteur industriel tunisien", source: "Kapitalis", label: "neutral" },
  { title: "SAH Lilas maintient sa position de leader", source: "Leaders", label: "positive" },
  { title: "Baisse des volumes d'échanges sur la BVMT", source: "Webmanagercenter", label: "negative" },
];

export function generateNewsArticles(stockId?: string, limit: number = 10): any[] {
  const articles = [];
  const now = new Date();

  for (let i = 0; i < limit; i++) {
    const newsItem = newsTitles[i % newsTitles.length];
    const publishedAt = new Date(now);
    publishedAt.setHours(publishedAt.getHours() - i * 3);

    articles.push({
      id: `news-${i}`,
      stock_id: stockId || stocks[i % stocks.length].id,
      title: newsItem.title,
      content: `Contenu détaillé de l'article: ${newsItem.title}`,
      source: newsItem.source,
      url: '#',
      published_at: publishedAt.toISOString(),
      language: 'fr',
      created_at: publishedAt.toISOString(),
    });
  }
  return articles;
}

export function generateSentimentAnalysis(stockId: string): any[] {
  const sentiments = [];
  const now = new Date();

  for (let i = 0; i < 20; i++) {
    const newsItem = newsTitles[i % newsTitles.length];
    const analyzedAt = new Date(now);
    analyzedAt.setHours(analyzedAt.getHours() - i * 4);

    const scoreMap: Record<string, number> = {
      positive: 0.3 + Math.random() * 0.5,
      negative: -(0.3 + Math.random() * 0.5),
      neutral: (Math.random() - 0.5) * 0.4,
    };

    sentiments.push({
      id: `sent-${stockId}-${i}`,
      article_id: `news-${i}`,
      stock_id: stockId,
      sentiment_score: parseFloat(scoreMap[newsItem.label].toFixed(2)),
      sentiment_label: newsItem.label,
      confidence: parseFloat((0.7 + Math.random() * 0.25).toFixed(2)),
      analyzed_at: analyzedAt.toISOString(),
      created_at: analyzedAt.toISOString(),
      news_articles: {
        title: newsItem.title,
        source: newsItem.source,
        published_at: analyzedAt.toISOString(),
      },
    });
  }
  return sentiments;
}

export function generateAnomalies(resolved: boolean = false, limit: number = 50): any[] {
  const anomalyTypes = ['volume_spike', 'price_jump', 'suspicious_pattern'];
  const severities = ['critical', 'high', 'medium', 'low'];
  const descriptions = [
    "Volume d'échanges 5x supérieur à la moyenne des 30 derniers jours",
    'Variation de prix de +4.2% en 15 minutes, dépassant le seuil de 3%',
    "Pattern de trading inhabituel détecté: ordres répétitifs de même taille",
    "Pic de volume anormal coïncidant avec une absence d'actualité",
    "Mouvement de prix contraire à la tendance sectorielle",
    "Concentration inhabituelle d'ordres sur le carnet",
    "Écart significatif entre prix de clôture et dernière transaction",
  ];

  const anomalies = [];
  const now = new Date();
  const count = Math.min(limit, resolved ? 8 : 12);

  for (let i = 0; i < count; i++) {
    const detectedAt = new Date(now);
    detectedAt.setHours(detectedAt.getHours() - i * 2);
    const stock = stocks[i % stocks.length];
    const baseVal = basePrices[stock.id];

    anomalies.push({
      id: `anomaly-${resolved ? 'r' : 'u'}-${i}`,
      stock_id: stock.id,
      anomaly_type: anomalyTypes[i % anomalyTypes.length],
      severity: severities[i % severities.length],
      description: descriptions[i % descriptions.length],
      detected_value: parseFloat((baseVal * (1 + Math.random() * 0.15)).toFixed(2)),
      expected_value: parseFloat(baseVal.toFixed(2)),
      deviation: parseFloat((1.5 + Math.random() * 3).toFixed(2)),
      detected_at: detectedAt.toISOString(),
      resolved,
      created_at: detectedAt.toISOString(),
      stocks: {
        symbol: stock.symbol,
        name: stock.name,
      },
    });
  }
  return anomalies;
}

export const portfolio = {
  id: 'portfolio-1',
  user_id: 'user-1',
  name: 'Portefeuille Principal',
  initial_capital: 100000,
  current_value: 118500,
  cash_balance: 22300,
  risk_profile: 'moderate',
  created_at: '2024-06-01T00:00:00Z',
  updated_at: new Date().toISOString(),
};

export const portfolioPositions = [
  {
    id: 'pos-1', portfolio_id: 'portfolio-1', stock_id: '1', quantity: 150,
    average_buy_price: 105.20, current_price: 112.50, total_value: 16875,
    profit_loss: 1095, profit_loss_percent: 6.94, purchase_date: '2024-07-15',
    updated_at: new Date().toISOString(),
    stocks: { symbol: 'BIAT', name: 'Banque Internationale Arabe de Tunisie', sector: 'Banques' },
  },
  {
    id: 'pos-2', portfolio_id: 'portfolio-1', stock_id: '3', quantity: 800,
    average_buy_price: 19.80, current_price: 21.40, total_value: 17120,
    profit_loss: 1280, profit_loss_percent: 8.08, purchase_date: '2024-08-01',
    updated_at: new Date().toISOString(),
    stocks: { symbol: 'SFBT', name: 'Société Frigorifique et Brasserie de Tunis', sector: 'Agroalimentaire' },
  },
  {
    id: 'pos-3', portfolio_id: 'portfolio-1', stock_id: '4', quantity: 2000,
    average_buy_price: 11.20, current_price: 11.90, total_value: 23800,
    profit_loss: 1400, profit_loss_percent: 6.25, purchase_date: '2024-09-10',
    updated_at: new Date().toISOString(),
    stocks: { symbol: 'PGH', name: 'Poulina Group Holding', sector: 'Holdings' },
  },
  {
    id: 'pos-4', portfolio_id: 'portfolio-1', stock_id: '6', quantity: 400,
    average_buy_price: 44.10, current_price: 42.30, total_value: 16920,
    profit_loss: -720, profit_loss_percent: -4.08, purchase_date: '2024-10-05',
    updated_at: new Date().toISOString(),
    stocks: { symbol: 'ATTIJARI', name: 'Attijari Bank', sector: 'Banques' },
  },
  {
    id: 'pos-5', portfolio_id: 'portfolio-1', stock_id: '7', quantity: 2500,
    average_buy_price: 8.10, current_price: 8.75, total_value: 21875,
    profit_loss: 1625, profit_loss_percent: 8.02, purchase_date: '2024-11-20',
    updated_at: new Date().toISOString(),
    stocks: { symbol: 'TLNET', name: 'Telnet Holding', sector: 'Technologie' },
  },
];

export function generateRecommendations(stockId?: string, limit: number = 15): any[] {
  const recs = [];
  const types = ['buy', 'sell', 'hold'];
  const reasonings = [
    "L'analyse technique montre un croisement haussier des moyennes mobiles 20/50 jours, couplé à un sentiment positif des actualités récentes et des fondamentaux solides.",
    "Les indicateurs RSI et MACD suggèrent une zone de surachat. Le sentiment du marché reste prudent avec des volumes en baisse.",
    "La valeur est correctement évaluée selon nos modèles. Les fondamentaux restent stables avec un potentiel de croissance modéré à moyen terme.",
    "Signal d'achat fort: breakout au-dessus de la résistance clé avec volume élevé. Le consensus des analystes est positif.",
    "Position défensive recommandée: la valeur offre un bon rendement de dividende et une faible volatilité dans un contexte incertain.",
  ];

  const targetStocks = stockId ? stocks.filter(s => s.id === stockId) : stocks;
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 7);

  for (let i = 0; i < Math.min(limit, targetStocks.length); i++) {
    const stock = targetStocks[i % targetStocks.length];
    const price = basePrices[stock.id];
    const rec = types[i % types.length];
    const targetMultiplier = rec === 'buy' ? 1.08 : rec === 'sell' ? 0.95 : 1.02;

    recs.push({
      id: `rec-${stock.id}-${i}`,
      stock_id: stock.id,
      recommendation: rec,
      confidence_score: parseFloat((0.65 + Math.random() * 0.3).toFixed(2)),
      target_price: parseFloat((price * targetMultiplier).toFixed(2)),
      reasoning: reasonings[i % reasonings.length],
      valid_until: validUntil.toISOString(),
      created_at: new Date().toISOString(),
      stocks: {
        symbol: stock.symbol,
        name: stock.name,
      },
    });
  }
  return recs;
}

export function getMarketSentimentData() {
  return {
    score: 0.25,
    distribution: {
      positive: 42,
      negative: 18,
      neutral: 25,
    },
  };
}
