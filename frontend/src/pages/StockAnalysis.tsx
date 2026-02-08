import { useEffect, useState, useCallback, useMemo } from 'react';
import Card from '../components/Card';
import { TrendingUp, TrendingDown, ChevronDown, Activity, Search, RefreshCw, Wifi, WifiOff, ArrowUpDown, BarChart3, Zap, Droplets } from 'lucide-react';
import { getMarketData, getFullForecast } from '../lib/api';
import type { StockData, FullForecastResult } from '../lib/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, Legend, Cell, PieChart, Pie,
  ReferenceLine,
} from 'recharts';

type SortKey = 'valeur' | 'variation' | 'dernier' | 'quantite' | 'capitalisation';

export default function StockAnalysis() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('capitalisation');
  const [sortAsc, setSortAsc] = useState(false);

  // ─── Forecast state ─────────────────────────────────────────────
  const [forecastResult, setForecastResult] = useState<FullForecastResult | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [forecastModel, setForecastModel] = useState<string>('prophet');
  const [forecastDays, setForecastDays] = useState<number>(5);

  const fetchData = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      setError(null);
      const data = await getMarketData();
      setStocks(data.stocks);
      setLastUpdate(data.timestamp);
      // Update selected stock with fresh data
      if (selectedStock) {
        const updated = data.stocks.find(s => s.isin === selectedStock.isin);
        if (updated) setSelectedStock(updated);
      } else if (data.stocks.length > 0) {
        // Select the first stock with the highest market cap
        const sorted = [...data.stocks].sort((a, b) => b.capitalisation - a.capitalisation);
        setSelectedStock(sorted[0]);
      }
    } catch (err) {
      setError("Impossible de se connecter au serveur.");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStock]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredStocks = useMemo(() => {
    let filtered = stocks.filter(s =>
      s.valeur.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.isin.toLowerCase().includes(searchQuery.toLowerCase())
    );
    filtered.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return filtered;
  }, [stocks, searchQuery, sortKey, sortAsc]);

  const dropdownStocks = useMemo(() => {
    return [...stocks]
      .filter(s =>
        s.valeur.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.ticker.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => b.capitalisation - a.capitalisation);
  }, [stocks, searchQuery]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const handleForecast = useCallback(async () => {
    if (!selectedStock) return;
    setForecastLoading(true);
    setForecastError(null);
    setForecastResult(null);
    try {
      const result = await getFullForecast(selectedStock.ticker, forecastModel, forecastDays);
      setForecastResult(result);
    } catch (err: any) {
      setForecastError(err.message || 'Erreur lors de la prévision');
      console.error(err);
    } finally {
      setForecastLoading(false);
    }
  }, [selectedStock, forecastModel, forecastDays]);

  // Clear forecast when stock changes
  useEffect(() => {
    setForecastResult(null);
    setForecastError(null);
  }, [selectedStock?.isin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <WifiOff className="h-16 w-16 text-red-400" />
        <p className="text-red-600 text-center max-w-md">{error}</p>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analyse de Valeur</h1>
          <p className="text-slate-600 mt-2">Données en temps réel — {stocks.length} valeurs</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center text-xs text-slate-500">
            <Wifi className="h-3 w-3 text-green-500 mr-1" />
            <span>{lastUpdate}</span>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-3 px-6 py-3 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-500 transition-colors shadow-sm"
            >
              <div className="text-left">
                {selectedStock && (
                  <>
                    <p className="font-bold text-slate-900">{selectedStock.ticker}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[150px]">{selectedStock.valeur}</p>
                  </>
                )}
              </div>
              <ChevronDown className="h-5 w-5 text-slate-400" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-10 max-h-96 overflow-y-auto">
                <div className="sticky top-0 bg-white p-2 border-b">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                {dropdownStocks.map((stock) => (
                  <button
                    key={stock.isin}
                    onClick={() => {
                      setSelectedStock(stock);
                      setShowDropdown(false);
                      setSearchQuery('');
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                      selectedStock?.isin === stock.isin ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{stock.ticker}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{stock.valeur}</p>
                      </div>
                      <span className={`text-sm font-semibold ${(stock.variation ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(stock.variation ?? 0) >= 0 ? '+' : ''}{(stock.variation ?? 0).toFixed(2)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedStock && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <p className="text-sm font-medium text-slate-500">Dernier Prix</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">{(selectedStock.dernier ?? 0).toFixed(3)} TND</p>
              <div className="flex items-center mt-2">
                {(selectedStock.variation ?? 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                )}
                <span className={`text-sm font-semibold ${(selectedStock.variation ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(selectedStock.variation ?? 0) >= 0 ? '+' : ''}{(selectedStock.variation ?? 0).toFixed(2)}%
                </span>
              </div>
            </Card>

            <Card>
              <p className="text-sm font-medium text-slate-500">Référence</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">{(selectedStock.reference ?? 0).toFixed(3)} TND</p>
              <p className="text-xs text-slate-500 mt-2">Ouverture: {(selectedStock.ouverture ?? 0).toFixed(3)} TND</p>
            </Card>

            <Card>
              <p className="text-sm font-medium text-slate-500">Volume</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">{(selectedStock.quantite ?? 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-2">Dern. Qté: {(selectedStock.dern_qty ?? 0).toLocaleString()}</p>
            </Card>

            <Card>
              <p className="text-sm font-medium text-slate-500">Capitalisation</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {((selectedStock.capitalisation ?? 0) / 1_000_000).toFixed(1)} M
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Statut: <span className={`font-semibold ${selectedStock.statut === 'OUVERT' ? 'text-green-600' : 'text-slate-600'}`}>
                  {selectedStock.statut || '—'}
                </span>
              </p>
            </Card>
          </div>

          {/* Detailed Stock Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Order Book */}
            <Card title="Carnet d'Ordres" subtitle={selectedStock.ticker}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-green-700 mb-3">ACHAT (Bid)</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Prix</span>
                        <span className="font-bold text-green-700">{(selectedStock.achat ?? 0).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Quantité</span>
                        <span className="font-semibold text-slate-900">{(selectedStock.qty_a ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Ordres</span>
                        <span className="font-semibold text-slate-900">{selectedStock.ord_a}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-red-700 mb-3">VENTE (Ask)</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Prix</span>
                        <span className="font-bold text-red-700">{(selectedStock.vente ?? 0).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Quantité</span>
                        <span className="font-semibold text-slate-900">{(selectedStock.qty_v ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Ordres</span>
                        <span className="font-semibold text-slate-900">{selectedStock.ord_v}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spread */}
                {selectedStock.achat > 0 && selectedStock.vente > 0 && (
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <span className="text-xs text-slate-500">Spread: </span>
                    <span className="font-semibold text-slate-900">
                      {((selectedStock.vente ?? 0) - (selectedStock.achat ?? 0)).toFixed(3)} TND
                    </span>
                    <span className="text-xs text-slate-500 ml-2">
                      ({(selectedStock.achat ?? 0) > 0
                        ? (((selectedStock.vente ?? 0) - (selectedStock.achat ?? 0)) / (selectedStock.achat ?? 1) * 100).toFixed(2)
                        : '0.00'}%)
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Price Details */}
            <Card title="Détails de Séance" subtitle={`Heure: ${selectedStock.heure || '—'}`}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Plus Haut</p>
                    <p className="font-bold text-green-700 text-lg">{(selectedStock.p_haut ?? 0).toFixed(3)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Plus Bas</p>
                    <p className="font-bold text-red-700 text-lg">{(selectedStock.p_bas ?? 0).toFixed(3)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Seuil Haut</p>
                    <p className="font-bold text-slate-900 text-lg">{(selectedStock.s_haut ?? 0).toFixed(3)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Seuil Bas</p>
                    <p className="font-bold text-slate-900 text-lg">{(selectedStock.s_bas ?? 0).toFixed(3)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500">CTO</p>
                    <p className="font-semibold text-slate-900">{(selectedStock.cto ?? 0).toFixed(3)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500">VTO %</p>
                    <p className="font-semibold text-slate-900">{(selectedStock.vto ?? 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500">QTO</p>
                    <p className="font-semibold text-slate-900">{(selectedStock.qto ?? 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Groupe</span>
                    <span className="font-semibold text-slate-900">{selectedStock.groupe}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-500">ISIN</span>
                    <span className="font-mono text-xs text-slate-700">{selectedStock.isin}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ─── Forecast Section ─────────────────────────────────── */}
          <Card title="Prévisions" subtitle={selectedStock.ticker}>
            <div className="space-y-6">
              {/* Controls */}
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Modèle</label>
                  <select
                    value={forecastModel}
                    onChange={(e) => setForecastModel(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="prophet">Prophet</option>
                    <option value="arima">ARIMA</option>
                    <option value="lstm">LSTM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Jours</label>
                  <select
                    value={forecastDays}
                    onChange={(e) => setForecastDays(Number(e.target.value))}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {[3, 5, 7, 10, 14].map((d) => (
                      <option key={d} value={d}>{d} jours</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleForecast}
                  disabled={forecastLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {forecastLoading ? (
                    <Activity className="h-4 w-4 animate-spin" />
                  ) : (
                    <BarChart3 className="h-4 w-4" />
                  )}
                  {forecastLoading ? 'Analyse en cours...' : 'Lancer la Prévision'}
                </button>
              </div>

              {forecastError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                  {forecastError}
                </div>
              )}

              {/* Forecast Results */}
              {forecastResult && (
                <div className="space-y-6">
                  {/* Summary Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-blue-600">Dernier Prix</p>
                      <p className="text-xl font-bold text-slate-900 mt-1">
                        {forecastResult.price.last_actual_price.toFixed(2)} <span className="text-sm font-normal text-slate-500">TND</span>
                      </p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-orange-600">Prévision J+1</p>
                      {(() => {
                        const first = forecastResult.price.forecasts[0];
                        const change = first.predicted_close - forecastResult.price.last_actual_price;
                        const pct = (change / forecastResult.price.last_actual_price) * 100;
                        return (
                          <>
                            <p className="text-xl font-bold text-slate-900 mt-1">
                              {first.predicted_close.toFixed(2)} <span className="text-sm font-normal text-slate-500">TND</span>
                            </p>
                            <p className={`text-xs font-semibold mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {change >= 0 ? '+' : ''}{change.toFixed(2)} ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)
                            </p>
                          </>
                        );
                      })()}
                    </div>
                    <div className={`rounded-xl p-4 ${forecastResult.liquidity.classification === 'High' ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className="text-xs font-semibold flex items-center gap-1">
                        <Droplets className="h-3 w-3" />
                        <span className={forecastResult.liquidity.classification === 'High' ? 'text-green-600' : 'text-red-600'}>Liquidité</span>
                      </p>
                      <p className="text-xl font-bold text-slate-900 mt-1">{forecastResult.liquidity.classification === 'High' ? 'Haute' : 'Basse'}</p>
                      <p className="text-xs text-slate-500 mt-1">Score: {forecastResult.liquidity.current_liquidity_score.toFixed(1)}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-purple-600 flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Volatilité
                      </p>
                      <p className="text-xl font-bold text-slate-900 mt-1">{(forecastResult.liquidity.volatility * 100).toFixed(2)}%</p>
                      <p className="text-xs text-slate-500 mt-1">Vol. Ratio: {forecastResult.liquidity.volume_ratio.toFixed(2)}x</p>
                    </div>
                  </div>

                  {/* Price Forecast Chart */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Prévision des Prix — {forecastResult.price.model.toUpperCase()}
                    </h3>
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart
                        data={forecastResult.price.forecasts.map((f) => ({
                          date: f.date,
                          prix: Number(f.predicted_close.toFixed(2)),
                          min: Number(f.lower_bound.toFixed(2)),
                          max: Number(f.upper_bound.toFixed(2)),
                        }))}
                        margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient id="colorCI" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          stroke="#94a3b8"
                          domain={['auto', 'auto']}
                          tickFormatter={(v: number) => v.toFixed(1)}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0' }}
                          formatter={(value: number) => [`${value.toFixed(2)} TND`]}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="max" stroke="transparent" fill="url(#colorCI)" name="Borne Haute" />
                        <Area type="monotone" dataKey="min" stroke="transparent" fill="url(#colorCI)" name="Borne Basse" />
                        <Area type="monotone" dataKey="prix" stroke="#f97316" strokeWidth={3} fill="none" dot={{ r: 5, fill: '#f97316' }} name="Prix Prévu" />
                        <ReferenceLine
                          y={forecastResult.price.last_actual_price}
                          stroke="#3b82f6"
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          label={{ value: `Actuel: ${forecastResult.price.last_actual_price.toFixed(2)}`, position: 'insideTopLeft', fill: '#3b82f6', fontSize: 11 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Volume Forecast Chart */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-indigo-600" />
                        Prévision du Volume
                      </h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart
                          data={forecastResult.volume.forecasts.map((f) => ({
                            date: f.date,
                            volume: f.predicted_volume,
                          }))}
                          margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip
                            contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0' }}
                            formatter={(value: number) => [value.toLocaleString(), 'Volume']}
                          />
                          <Bar dataKey="volume" name="Volume Prévu" radius={[6, 6, 0, 0]}>
                            {forecastResult.volume.forecasts.map((_, i) => (
                              <Cell key={i} fill={i === 0 ? '#6366f1' : '#a5b4fc'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Liquidity Analysis */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Droplets className="h-5 w-5 text-cyan-600" />
                        Analyse de Liquidité
                      </h3>
                      <div className="flex items-center gap-6">
                        <div className="w-40 h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Haute', value: Math.round(forecastResult.liquidity.high_liquidity_probability * 100) },
                                  { name: 'Basse', value: Math.round(forecastResult.liquidity.low_liquidity_probability * 100) },
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={60}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                <Cell fill="#22c55e" />
                                <Cell fill="#ef4444" />
                              </Pie>
                              <Tooltip formatter={(val: number) => `${val}%`} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-sm text-slate-600">Haute Liquidité</span>
                            <span className="ml-auto font-bold text-slate-900">{(forecastResult.liquidity.high_liquidity_probability * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span className="text-sm text-slate-600">Basse Liquidité</span>
                            <span className="ml-auto font-bold text-slate-900">{(forecastResult.liquidity.low_liquidity_probability * 100).toFixed(0)}%</span>
                          </div>
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Volume Récent</span>
                              <span className="font-semibold text-slate-900">{forecastResult.liquidity.recent_volume.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Ratio Volume</span>
                              <span className="font-semibold text-slate-900">{forecastResult.liquidity.volume_ratio.toFixed(2)}x</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Seuil</span>
                              <span className="font-semibold text-slate-900">{forecastResult.liquidity.threshold.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Forecast Table */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <h3 className="font-bold text-slate-900 mb-4">Détails des Prévisions de Prix</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Date</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Prix Prévu (TND)</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Borne Basse</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Borne Haute</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Variation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {forecastResult.price.forecasts.map((f, i) => {
                            const change = f.predicted_close - forecastResult.price.last_actual_price;
                            const pct = (change / forecastResult.price.last_actual_price) * 100;
                            return (
                              <tr key={f.date} className={`border-b border-slate-100 ${i === 0 ? 'bg-blue-50/50' : ''}`}>
                                <td className="py-2.5 px-3 text-sm font-medium text-slate-700">{f.date}</td>
                                <td className="py-2.5 px-3 text-right text-sm font-bold text-slate-900">{f.predicted_close.toFixed(2)}</td>
                                <td className="py-2.5 px-3 text-right text-sm text-slate-500">{f.lower_bound.toFixed(2)}</td>
                                <td className="py-2.5 px-3 text-right text-sm text-slate-500">{f.upper_bound.toFixed(2)}</td>
                                <td className="py-2.5 px-3 text-right">
                                  <span className={`text-sm font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {change >= 0 ? '+' : ''}{pct.toFixed(2)}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Full Market Table */}
      <Card
        title="Tableau du Marché"
        subtitle={`${filteredStocks.length} valeurs`}
        headerAction={
          <div className="relative w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th
                  className="text-left py-3 px-3 text-sm font-semibold text-slate-700 cursor-pointer hover:text-blue-600"
                  onClick={() => handleSort('valeur')}
                >
                  <div className="flex items-center">
                    Valeur <ArrowUpDown className="h-3 w-3 ml-1" />
                  </div>
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-slate-700">Statut</th>
                <th
                  className="text-right py-3 px-3 text-sm font-semibold text-slate-700 cursor-pointer hover:text-blue-600"
                  onClick={() => handleSort('dernier')}
                >
                  <div className="flex items-center justify-end">
                    Dernier <ArrowUpDown className="h-3 w-3 ml-1" />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-3 text-sm font-semibold text-slate-700 cursor-pointer hover:text-blue-600"
                  onClick={() => handleSort('variation')}
                >
                  <div className="flex items-center justify-end">
                    Var % <ArrowUpDown className="h-3 w-3 ml-1" />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-3 text-sm font-semibold text-slate-700 cursor-pointer hover:text-blue-600"
                  onClick={() => handleSort('quantite')}
                >
                  <div className="flex items-center justify-end">
                    Volume <ArrowUpDown className="h-3 w-3 ml-1" />
                  </div>
                </th>
                <th className="text-right py-3 px-3 text-sm font-semibold text-slate-700">Achat</th>
                <th className="text-right py-3 px-3 text-sm font-semibold text-slate-700">Vente</th>
                <th
                  className="text-right py-3 px-3 text-sm font-semibold text-slate-700 cursor-pointer hover:text-blue-600"
                  onClick={() => handleSort('capitalisation')}
                >
                  <div className="flex items-center justify-end">
                    Cap. <ArrowUpDown className="h-3 w-3 ml-1" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStocks.map((stock) => (
                <tr
                  key={stock.isin}
                  onClick={() => setSelectedStock(stock)}
                  className={`border-b border-slate-100 cursor-pointer transition-colors ${
                    selectedStock?.isin === stock.isin
                      ? 'bg-blue-50 hover:bg-blue-100'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-900 text-sm">{stock.ticker}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{stock.valeur}</p>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      stock.statut === 'OUVERT'
                        ? 'bg-green-100 text-green-700'
                        : stock.statut === 'SUSPENDU'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {stock.statut || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-900 text-sm">
                    {(stock.dernier ?? 0) > 0 ? (stock.dernier ?? 0).toFixed(3) : '—'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`text-sm font-semibold ${
                      (stock.variation ?? 0) > 0 ? 'text-green-600' : (stock.variation ?? 0) < 0 ? 'text-red-600' : 'text-slate-500'
                    }`}>
                      {(stock.variation ?? 0) > 0 ? '+' : ''}{(stock.variation ?? 0).toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-sm text-slate-700">
                    {(stock.quantite ?? 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-sm text-green-700">
                    {(stock.achat ?? 0) > 0 ? (stock.achat ?? 0).toFixed(3) : '—'}
                  </td>
                  <td className="py-3 px-3 text-right text-sm text-red-700">
                    {(stock.vente ?? 0) > 0 ? (stock.vente ?? 0).toFixed(3) : '—'}
                  </td>
                  <td className="py-3 px-3 text-right text-sm text-slate-700">
                    {(stock.capitalisation ?? 0) > 0
                      ? ((stock.capitalisation ?? 0) / 1_000_000).toFixed(1) + ' M'
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
