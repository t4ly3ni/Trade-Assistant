import { useEffect, useState } from 'react';
import Card from '../components/Card';
import { TrendingUp, TrendingDown, AlertCircle, ChevronDown, Activity, Target } from 'lucide-react';
import { getStocks, getStockPrices, getPredictions, getSentimentAnalysis, getRecommendations } from '../lib/api';

interface Stock {
  id: string;
  symbol: string;
  name: string;
  sector: string;
}

interface StockPrice {
  date: string;
  close: number;
  volume: number;
}

interface Prediction {
  target_date: string;
  predicted_price: number;
  confidence: number;
}

interface Sentiment {
  sentiment_score: number;
  sentiment_label: string;
  analyzed_at: string;
  confidence: number;
  news_articles: {
    title: string;
    source: string;
    published_at: string;
  };
}

interface Recommendation {
  recommendation: string;
  confidence_score: number;
  target_price: number;
  reasoning: string;
  created_at: string;
}

export default function StockAnalysis() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [prices, setPrices] = useState<StockPrice[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [sentiment, setSentiment] = useState<Sentiment[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    async function fetchStocks() {
      try {
        const stocksData = await getStocks();
        setStocks(stocksData);
        if (stocksData.length > 0) {
          setSelectedStock(stocksData[0]);
        }
      } catch (error) {
        console.error('Error fetching stocks:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStocks();
  }, []);

  useEffect(() => {
    if (!selectedStock) return;

    async function fetchStockData() {
      try {
        const [pricesData, predictionsData, sentimentData, recommendationsData] = await Promise.all([
          getStockPrices(selectedStock.id, 30),
          getPredictions(selectedStock.id),
          getSentimentAnalysis(selectedStock.id),
          getRecommendations(selectedStock.id, 1),
        ]);

        setPrices(pricesData.reverse());
        setPredictions(predictionsData);
        setSentiment(sentimentData);
        setRecommendations(recommendationsData);
      } catch (error) {
        console.error('Error fetching stock data:', error);
      }
    }

    fetchStockData();
  }, [selectedStock]);

  const currentPrice = prices.length > 0 ? prices[prices.length - 1].close : 0;
  const previousPrice = prices.length > 1 ? prices[prices.length - 2].close : currentPrice;
  const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;

  const avgSentiment = sentiment.length > 0
    ? sentiment.reduce((sum, s) => sum + s.sentiment_score, 0) / sentiment.length
    : 0;

  const getSentimentColor = (score: number) => {
    if (score > 0.3) return 'text-green-600';
    if (score < -0.3) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getSentimentLabel = (score: number) => {
    if (score > 0.3) return 'Positif';
    if (score < -0.3) return 'Négatif';
    return 'Neutre';
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec.toLowerCase()) {
      case 'buy':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'sell':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  const getRecommendationLabel = (rec: string) => {
    switch (rec.toLowerCase()) {
      case 'buy':
        return 'ACHETER';
      case 'sell':
        return 'VENDRE';
      default:
        return 'CONSERVER';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analyse de Valeur</h1>
          <p className="text-slate-600 mt-2">Analyse détaillée et prévisions</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center space-x-3 px-6 py-3 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-500 transition-colors shadow-sm"
          >
            <div className="text-left">
              {selectedStock && (
                <>
                  <p className="font-bold text-slate-900">{selectedStock.symbol}</p>
                  <p className="text-xs text-slate-500">{selectedStock.name}</p>
                </>
              )}
            </div>
            <ChevronDown className="h-5 w-5 text-slate-400" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-10 max-h-96 overflow-y-auto">
              {stocks.map((stock) => (
                <button
                  key={stock.id}
                  onClick={() => {
                    setSelectedStock(stock);
                    setShowDropdown(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                >
                  <p className="font-semibold text-slate-900">{stock.symbol}</p>
                  <p className="text-xs text-slate-500">{stock.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{stock.sector}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedStock && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <p className="text-sm font-medium text-slate-500">Prix Actuel</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">{currentPrice.toFixed(2)} TND</p>
              <div className="flex items-center mt-2">
                {priceChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                )}
                <span className={`text-sm font-semibold ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              </div>
            </Card>

            <Card>
              <p className="text-sm font-medium text-slate-500">Sentiment</p>
              <p className={`text-2xl font-bold mt-2 ${getSentimentColor(avgSentiment)}`}>
                {getSentimentLabel(avgSentiment)}
              </p>
              <p className="text-xs text-slate-500 mt-2">Score: {avgSentiment.toFixed(2)}</p>
            </Card>

            <Card>
              <p className="text-sm font-medium text-slate-500">Prévision 5J</p>
              {predictions.length > 0 && (
                <>
                  <p className="text-2xl font-bold text-slate-900 mt-2">
                    {predictions[predictions.length - 1].predicted_price.toFixed(2)} TND
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Confiance: {(predictions[predictions.length - 1].confidence * 100).toFixed(0)}%
                  </p>
                </>
              )}
            </Card>

            <Card>
              <p className="text-sm font-medium text-slate-500">Recommandation</p>
              {recommendations.length > 0 && (
                <>
                  <p className={`text-xl font-bold mt-2 px-3 py-1 rounded-lg inline-block ${getRecommendationColor(recommendations[0].recommendation)}`}>
                    {getRecommendationLabel(recommendations[0].recommendation)}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Confiance: {(recommendations[0].confidence_score * 100).toFixed(0)}%
                  </p>
                </>
              )}
            </Card>
          </div>

          <Card title="Évolution des Prix" subtitle="30 derniers jours">
            <div className="relative h-64">
              <svg className="w-full h-full" viewBox="0 0 800 200">
                <defs>
                  <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                {prices.length > 0 && (
                  <>
                    <path
                      d={prices.map((p, i) => {
                        const x = (i / (prices.length - 1)) * 800;
                        const minPrice = Math.min(...prices.map(p => p.close));
                        const maxPrice = Math.max(...prices.map(p => p.close));
                        const y = 180 - ((p.close - minPrice) / (maxPrice - minPrice)) * 160;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="rgb(59, 130, 246)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path
                      d={prices.map((p, i) => {
                        const x = (i / (prices.length - 1)) * 800;
                        const minPrice = Math.min(...prices.map(p => p.close));
                        const maxPrice = Math.max(...prices.map(p => p.close));
                        const y = 180 - ((p.close - minPrice) / (maxPrice - minPrice)) * 160;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ') + ' L 800 200 L 0 200 Z'}
                      fill="url(#priceGradient)"
                    />
                  </>
                )}
              </svg>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Prévisions 5 Jours" subtitle={`Modèle: ${predictions.length > 0 ? 'LSTM-v1.2' : 'N/A'}`}>
              <div className="space-y-3">
                {predictions.map((pred, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {new Date(pred.target_date).toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-slate-500">J+{index + 1}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{pred.predicted_price.toFixed(2)} TND</p>
                      <div className="flex items-center justify-end mt-1">
                        <Target className="h-3 w-3 text-blue-600 mr-1" />
                        <span className="text-xs text-slate-500">
                          {(pred.confidence * 100).toFixed(0)}% confiance
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Analyse de Sentiment" subtitle="Actualités récentes">
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {sentiment.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">Aucune actualité récente</p>
                ) : (
                  sentiment.map((item, index) => (
                    <div key={index} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                            {item.news_articles.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{item.news_articles.source}</p>
                        </div>
                        <span className={`ml-3 px-2 py-1 rounded text-xs font-semibold ${
                          item.sentiment_label === 'positive'
                            ? 'bg-green-100 text-green-700'
                            : item.sentiment_label === 'negative'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {item.sentiment_label === 'positive' ? 'Positif' : item.sentiment_label === 'negative' ? 'Négatif' : 'Neutre'}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-slate-400">
                          {new Date(item.analyzed_at).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-xs text-slate-500">
                          Score: {item.sentiment_score.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {recommendations.length > 0 && (
            <Card
              title="Recommandation de l'Agent"
              subtitle="Analyse basée sur ML, sentiment et indicateurs techniques"
            >
              <div className={`p-6 rounded-xl border-2 ${getRecommendationColor(recommendations[0].recommendation)}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-3xl font-bold mb-2">
                      {getRecommendationLabel(recommendations[0].recommendation)}
                    </p>
                    <p className="text-sm opacity-75">
                      Confiance: {(recommendations[0].confidence_score * 100).toFixed(0)}% |
                      Prix cible: {recommendations[0].target_price?.toFixed(2) || 'N/A'} TND
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8" />
                </div>
                <div className="bg-white bg-opacity-50 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Justification:</p>
                  <p className="text-sm leading-relaxed">{recommendations[0].reasoning}</p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
