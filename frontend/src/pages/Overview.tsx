import { useEffect, useState, useCallback, useMemo } from 'react';
import Card from '../components/Card';
import { TrendingUp, TrendingDown, AlertCircle, Activity, BarChart3, RefreshCw, Wifi, WifiOff, MessageSquare, ThumbsUp, ThumbsDown, Minus, Clock } from 'lucide-react';
import { getAnalysis, getAnomalyReport, getAllSentiments } from '../lib/api';
import type { AnalysisResponse, AnomalyReport, AllStocksSentimentResponse } from '../lib/types';

// ── BVMT Trading Schedule (CET / Tunisia local time) ────────────
function getMarketPhase(): { label: string; status: 'open' | 'closed' | 'pre' | 'auction' | 'block'; color: string; bgColor: string; dotColor: string; next: string } {
  const now = new Date();
  // Tunisia = CET (UTC+1). Convert current time to CET minutes.
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const cet = new Date(utcMs + 3600000); // UTC+1
  const day = cet.getDay(); // 0=Sun, 6=Sat
  const hh = cet.getHours();
  const mm = cet.getMinutes();
  const mins = hh * 60 + mm; // minutes since midnight CET

  // Weekend
  if (day === 0 || day === 6) {
    return { label: 'Fermé', status: 'closed', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', dotColor: 'bg-red-500', next: 'Ouverture lundi 09:00' };
  }

  // Schedule in CET minutes
  const PRE_OPEN  = 8 * 60 + 30;  // 08:30
  const OPEN      = 9 * 60;        // 09:00
  const CLOSE     = 14 * 60;       // 14:00
  const AUCTION   = 14 * 60 + 5;   // 14:05
  const LAST      = 14 * 60 + 10;  // 14:10
  const BLOCK_END = 14 * 60 + 30;  // 14:30

  if (mins < PRE_OPEN) {
    return { label: 'Fermé', status: 'closed', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', dotColor: 'bg-red-500', next: `Pré-ouverture à 08:30` };
  }
  if (mins < OPEN) {
    return { label: 'Pré-ouverture', status: 'pre', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', dotColor: 'bg-amber-500', next: `Ouverture à 09:00` };
  }
  if (mins < CLOSE) {
    return { label: 'Ouvert', status: 'open', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', dotColor: 'bg-green-500', next: `Clôture à 14:00` };
  }
  if (mins < AUCTION) {
    return { label: 'Fixing', status: 'auction', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', dotColor: 'bg-blue-500', next: `Fixing à 14:05` };
  }
  if (mins < LAST) {
    return { label: 'Dernier cours', status: 'auction', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', dotColor: 'bg-blue-500', next: `Fin à 14:10` };
  }
  if (mins < BLOCK_END) {
    return { label: 'Blocs', status: 'block', color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200', dotColor: 'bg-purple-500', next: `Fin à 14:30` };
  }

  return { label: 'Fermé', status: 'closed', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', dotColor: 'bg-red-500', next: 'Prochaine séance demain 08:30' };
}

export default function Overview() {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyReport | null>(null);
  const [sentiments, setSentiments] = useState<AllStocksSentimentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [marketPhase, setMarketPhase] = useState(getMarketPhase());

  // Update market phase every 30 seconds
  useEffect(() => {
    setMarketPhase(getMarketPhase());
    const t = setInterval(() => setMarketPhase(getMarketPhase()), 30000);
    return () => clearInterval(t);
  }, []);

  const fetchData = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      setError(null);
      const [analysisData, anomalyData, sentimentData] = await Promise.all([
        getAnalysis(5),
        getAnomalyReport(),
        getAllSentiments().catch(() => null),
      ]);
      setAnalysis(analysisData);
      setAnomalies(anomalyData);
      setSentiments(sentimentData);
      setLastUpdate(new Date().toLocaleTimeString('fr-FR'));
    } catch (err) {
      setError("Impossible de se connecter au serveur. Vérifiez que l'API est en marche (uvicorn bvmt.api:app --port 8000).");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'WARNING':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'INFO':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      VOLUME_SPIKE: 'Pic de Volume',
      PRICE_ANOMALY: 'Prix Anormal',
      ORDER_IMBALANCE: 'Déséquilibre Ordres',
      SPREAD_ANOMALY: 'Spread Anormal',
      RAPID_PRICE_MOVE: 'Mouvement Rapide',
      PATTERN_SUSPECT: 'Pattern Suspect',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <WifiOff className="h-16 w-16" style={{ color: 'var(--danger)' }} />
        <p className="text-center max-w-md" style={{ color: 'var(--danger)' }}>{error}</p>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="btn-primary px-6 py-2 rounded-lg transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const summary = analysis?.summary;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--content)' }}>Vue d'Ensemble du Marché</h1>
          <p className="mt-2" style={{ color: 'var(--content-secondary)' }}>Bourse des Valeurs Mobilières de Tunis</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center text-xs" style={{ color: 'var(--content-tertiary)' }}>
            <Wifi className="h-3 w-3 text-green-500 mr-1" />
            <span>Live • {lastUpdate}</span>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Market Status Banner */}
      <div className={`flex items-center justify-between p-4 rounded-xl border ${marketPhase.bgColor}`}>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Clock className={`h-6 w-6 ${marketPhase.color}`} />
            <span className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${marketPhase.dotColor} ${marketPhase.status === 'open' ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-lg font-bold ${marketPhase.color}`}>{marketPhase.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${marketPhase.status === 'open' ? 'bg-green-200 text-green-800' : marketPhase.status === 'closed' ? 'bg-red-200 text-red-800' : marketPhase.status === 'pre' ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800'}`}>
                {marketPhase.status === 'open' ? 'Trading continu' : marketPhase.status === 'closed' ? 'Hors séance' : marketPhase.status === 'pre' ? 'Phase d\'appel' : marketPhase.status === 'block' ? 'Déclarations de blocs' : 'Fixing / Dernier cours'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{marketPhase.next}</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center space-x-4 text-xs text-slate-500">
          <div className="text-right space-y-0.5">
            <p><span className="font-medium text-slate-700">Pré-ouverture</span> 08:30 – 09:00</p>
            <p><span className="font-medium text-slate-700">Trading continu</span> 09:00 – 14:00</p>
          </div>
          <div className="text-right space-y-0.5">
            <p><span className="font-medium text-slate-700">Fixing</span> 14:05</p>
            <p><span className="font-medium text-slate-700">Blocs</span> 14:10 – 14:30</p>
          </div>
        </div>
      </div>

      {/* Market Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--content-tertiary)' }}>Résumé du Marché</p>
              <p className="text-3xl font-bold mt-2" style={{ color: 'var(--content)' }}>{summary?.total || 0}</p>
              <p className="text-xs mt-2" style={{ color: 'var(--content-tertiary)' }}>valeurs cotées</p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-subtle)' }}>
              <Activity className="h-6 w-6" style={{ color: 'var(--accent)' }} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--content-tertiary)' }}>Tendance</p>
              <div className="flex items-center space-x-3 mt-2">
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-lg font-bold text-green-600">{summary?.hausses || 0}</span>
                </div>
                <div className="flex items-center">
                  <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  <span className="text-lg font-bold text-red-600">{summary?.baisses || 0}</span>
                </div>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--content-tertiary)' }}>{summary?.inchanges || 0} inchangées</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--content-tertiary)' }}>Volume Total</p>
              <p className="text-2xl font-bold mt-2" style={{ color: 'var(--content)' }}>
                {summary ? (summary.volume_total / 1_000_000).toFixed(1) : '0'} M
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--content-tertiary)' }}>
                {summary?.actives || 0} valeurs actives
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--content-tertiary)' }}>Alertes Actives</p>
              <p className="text-3xl font-bold mt-2" style={{ color: 'var(--content)' }}>{anomalies?.total_alerts || 0}</p>
              <p className="text-xs mt-2" style={{ color: 'var(--content-tertiary)' }}>anomalies détectées</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Top Hausse / Baisse */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Top 5 Hausse" subtitle="Plus fortes hausses du jour">
          <div className="space-y-3">
            {analysis?.top_hausse.length === 0 && (
              <p className="text-center py-6" style={{ color: 'var(--content-tertiary)' }}>Aucune hausse significative</p>
            )}
            {analysis?.top_hausse.map((stock, index) => (
              <div
                key={stock.ticker + index}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 transition-colors" style={{ backgroundColor: 'var(--surface-secondary)' }}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 rounded-full font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--content)' }}>{stock.ticker}</p>
                    <p className="text-xs truncate max-w-[180px]" style={{ color: 'var(--content-tertiary)' }}>{stock.valeur}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold" style={{ color: 'var(--content)' }}>{stock.dernier.toFixed(3)} TND</p>
                  <div className="flex items-center justify-end">
                    <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                    <span className="text-sm font-semibold text-green-600">
                      +{stock.variation.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Top 5 Baisse" subtitle="Plus fortes baisses du jour">
          <div className="space-y-3">
            {analysis?.top_baisse.length === 0 && (
              <p className="text-center py-6" style={{ color: 'var(--content-tertiary)' }}>Aucune baisse significative</p>
            )}
            {analysis?.top_baisse.map((stock, index) => (
              <div
                key={stock.ticker + index}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 transition-colors" style={{ backgroundColor: 'var(--surface-secondary)' }}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-red-100 text-red-700 rounded-full font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--content)' }}>{stock.ticker}</p>
                    <p className="text-xs truncate max-w-[180px]" style={{ color: 'var(--content-tertiary)' }}>{stock.valeur}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold" style={{ color: 'var(--content)' }}>{stock.dernier.toFixed(3)} TND</p>
                  <div className="flex items-center justify-end">
                    <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                    <span className="text-sm font-semibold text-red-600">
                      {stock.variation.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Sentiment Analysis */}
      <Card title="Analyse de Sentiment" subtitle="Sentiment des actualités par valeur">
        {!sentiments || Object.keys(sentiments.results).length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--content-tertiary)' }}>Aucune donnée de sentiment disponible</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(sentiments.results).map(([symbol, data]) => {
              const sentimentColor =
                data.sentiment === 'positive'
                  ? 'text-green-600'
                  : data.sentiment === 'negative'
                  ? 'text-red-600'
                  : 'text-slate-500';
              const sentimentBg =
                data.sentiment === 'positive'
                  ? 'bg-green-50 border-green-200'
                  : data.sentiment === 'negative'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-slate-50 border-slate-200';
              const SentimentIcon =
                data.sentiment === 'positive'
                  ? ThumbsUp
                  : data.sentiment === 'negative'
                  ? ThumbsDown
                  : Minus;

              return (
                <div
                  key={symbol}
                  className={`p-4 rounded-lg border ${sentimentBg} transition-colors`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${data.sentiment === 'positive' ? 'bg-green-100' : data.sentiment === 'negative' ? 'bg-red-100' : 'bg-slate-100'}`}>
                        <SentimentIcon className={`h-5 w-5 ${sentimentColor}`} />
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--content)' }}>{symbol}</p>
                        <p className="text-xs" style={{ color: 'var(--content-tertiary)' }}>
                          {data.articles_analyzed} article{data.articles_analyzed > 1 ? 's' : ''} analysé{data.articles_analyzed > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${sentimentColor}`}>
                        {data.overall_score > 0 ? '+' : ''}{data.overall_score.toFixed(2)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--content-tertiary)' }}>
                        Confiance: {(data.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  {/* Distribution bar */}
                  {data.articles_analyzed > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center space-x-2 text-xs mb-1">
                        <span className="text-green-600">{data.sentiment_distribution.positive} pos</span>
                        <span className="text-slate-400">|</span>
                        <span className="text-slate-500">{data.sentiment_distribution.neutral} neutre</span>
                        <span className="text-slate-400">|</span>
                        <span className="text-red-600">{data.sentiment_distribution.negative} nég</span>
                      </div>
                      <div className="flex h-2 rounded-full overflow-hidden bg-slate-200">
                        {data.sentiment_distribution.positive > 0 && (
                          <div
                            className="bg-green-500"
                            style={{ width: `${(data.sentiment_distribution.positive / data.articles_analyzed) * 100}%` }}
                          />
                        )}
                        {data.sentiment_distribution.neutral > 0 && (
                          <div
                            className="bg-slate-400"
                            style={{ width: `${(data.sentiment_distribution.neutral / data.articles_analyzed) * 100}%` }}
                          />
                        )}
                        {data.sentiment_distribution.negative > 0 && (
                          <div
                            className="bg-red-500"
                            style={{ width: `${(data.sentiment_distribution.negative / data.articles_analyzed) * 100}%` }}
                          />
                        )}
                      </div>
                    </div>
                  )}
                  {data.overall_explanation && (
                    <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--content-secondary)' }}>{data.overall_explanation}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Recent Alerts */}
      <Card title="Alertes Récentes" subtitle="Anomalies détectées par le système">
        <div className="space-y-3">
          {(!anomalies || anomalies.alerts.length === 0) ? (
            <p className="text-center py-8" style={{ color: 'var(--content-tertiary)' }}>Aucune anomalie détectée</p>
          ) : (
            anomalies.alerts.slice(0, 5).map((alert, idx) => (
              <div
                key={`${alert.isin}-${alert.anomaly_type}-${idx}`}
                className={`p-4 rounded-lg border-2 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="font-semibold">{alert.valeur}</span>
                      <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded">
                        {getTypeLabel(alert.anomaly_type)}
                      </span>
                      <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded font-semibold">
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm mt-2">{alert.message}</p>
                    {alert.details && (
                      <p className="text-xs mt-1 opacity-75">{alert.details}</p>
                    )}
                  </div>
                  <AlertCircle className="h-5 w-5 ml-4 flex-shrink-0" />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
