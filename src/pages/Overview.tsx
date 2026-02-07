import { useEffect, useState } from 'react';
import Card from '../components/Card';
import { TrendingUp, TrendingDown, AlertCircle, Activity, Newspaper } from 'lucide-react';
import { getTopMovers, getMarketSentiment, getAnomalies } from '../lib/api';

interface Mover {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  change: number;
}

interface MarketSentiment {
  score: number;
  distribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

interface Anomaly {
  id: string;
  anomaly_type: string;
  severity: string;
  description: string;
  detected_at: string;
  stocks: {
    symbol: string;
    name: string;
  };
}

export default function Overview() {
  const [gainers, setGainers] = useState<Mover[]>([]);
  const [losers, setLosers] = useState<Mover[]>([]);
  const [sentiment, setSentiment] = useState<MarketSentiment | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [moversData, sentimentData, anomaliesData] = await Promise.all([
          getTopMovers(),
          getMarketSentiment(),
          getAnomalies(false, 5),
        ]);

        setGainers(moversData.gainers);
        setLosers(moversData.losers);
        setSentiment(sentimentData);
        setAnomalies(anomaliesData);
      } catch (error) {
        console.error('Error fetching overview data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const tunindexValue = 8542.35;
  const tunindexChange = 0.85;

  const getSentimentColor = (score: number) => {
    if (score > 0.3) return 'text-green-600 bg-green-50';
    if (score < -0.3) return 'text-red-600 bg-red-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const getSentimentLabel = (score: number) => {
    if (score > 0.3) return 'Positif';
    if (score < -0.3) return 'Négatif';
    return 'Neutre';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
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
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Vue d'Ensemble du Marché</h1>
        <p className="text-slate-600 mt-2">Bourse des Valeurs Mobilières de Tunis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">TUNINDEX</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{tunindexValue.toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-sm font-semibold text-green-600">
                  +{tunindexChange}%
                </span>
                <span className="text-xs text-slate-500 ml-2">aujourd'hui</span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Sentiment du Marché</p>
              {sentiment && (
                <>
                  <p className={`text-2xl font-bold mt-2 inline-block px-3 py-1 rounded-lg ${getSentimentColor(sentiment.score)}`}>
                    {getSentimentLabel(sentiment.score)}
                  </p>
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center text-xs">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-slate-600">Positif: {sentiment.distribution.positive}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                      <span className="text-slate-600">Neutre: {sentiment.distribution.neutral}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                      <span className="text-slate-600">Négatif: {sentiment.distribution.negative}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Newspaper className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Alertes Actives</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{anomalies.length}</p>
              <p className="text-xs text-slate-500 mt-2">Anomalies détectées aujourd'hui</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Top 5 Gagnants" subtitle="Plus fortes hausses du jour">
          <div className="space-y-3">
            {gainers.map((stock, index) => (
              <div
                key={stock.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 rounded-full font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{stock.symbol}</p>
                    <p className="text-xs text-slate-500">{stock.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{stock.current_price.toFixed(2)} TND</p>
                  <div className="flex items-center justify-end">
                    <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                    <span className="text-sm font-semibold text-green-600">
                      +{stock.change.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Top 5 Perdants" subtitle="Plus fortes baisses du jour">
          <div className="space-y-3">
            {losers.map((stock, index) => (
              <div
                key={stock.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-red-100 text-red-700 rounded-full font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{stock.symbol}</p>
                    <p className="text-xs text-slate-500">{stock.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{stock.current_price.toFixed(2)} TND</p>
                  <div className="flex items-center justify-end">
                    <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                    <span className="text-sm font-semibold text-red-600">
                      {stock.change.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Alertes Récentes" subtitle="Anomalies détectées par le système">
        <div className="space-y-3">
          {anomalies.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Aucune anomalie détectée</p>
          ) : (
            anomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className={`p-4 rounded-lg border-2 ${getSeverityColor(anomaly.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{anomaly.stocks.symbol}</span>
                      <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded">
                        {anomaly.anomaly_type.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded font-semibold">
                        {anomaly.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm mt-2">{anomaly.description}</p>
                    <p className="text-xs mt-2 opacity-75">
                      {new Date(anomaly.detected_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <AlertCircle className="h-5 w-5 ml-4" />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
