import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Card from '../components/Card';
import {
  TrendingUp, TrendingDown, Activity, RefreshCw, Wifi, WifiOff,
  BarChart3, Zap, Droplets, X, ArrowUpDown, LayoutGrid, Layers,
  Search, ChevronDown,
} from 'lucide-react';
import { getMarketData, getFullForecast } from '../lib/api';
import type { StockData, FullForecastResult } from '../lib/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, Legend, Cell, PieChart, Pie,
  ReferenceLine,
} from 'recharts';

type SortField = 'variation' | 'capitalisation' | 'quantite' | 'dernier';
type SortDir = 'asc' | 'desc';
type ViewMode = 'grid' | 'sector';

/** Interpolated background + text color for a given variation % */
function getHeatmapStyle(variation: number): React.CSSProperties & { textColor: string } {
  const clamp = Math.max(-6, Math.min(6, variation));
  let bg: string;
  let textColor = '#fff';
  if (clamp > 0) {
    const t = Math.min(clamp / 6, 1);
    // green gradient: light → deep
    const r = Math.round(220 - t * 186);
    const g = Math.round(252 - t * 107);
    const b = Math.round(231 - t * 180);
    bg = `rgb(${r},${g},${b})`;
    textColor = t < 0.25 ? '#065f46' : '#ffffff';
  } else if (clamp < 0) {
    const t = Math.min(Math.abs(clamp) / 6, 1);
    const r = Math.round(254 - t * 68);
    const g = Math.round(226 - t * 178);
    const b = Math.round(226 - t * 178);
    bg = `rgb(${r},${g},${b})`;
    textColor = t < 0.25 ? '#991b1b' : '#ffffff';
  } else {
    bg = '#e2e8f0';
    textColor = '#475569';
  }
  return { backgroundColor: bg, textColor };
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'variation', label: 'Variation %' },
  { value: 'capitalisation', label: 'Capitalisation' },
  { value: 'quantite', label: 'Volume' },
  { value: 'dernier', label: 'Prix' },
];

export default function StockAnalysis() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const forecastSectionRef = useRef<HTMLDivElement>(null);

  const [forecastResult, setForecastResult] = useState<FullForecastResult | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [forecastModel, setForecastModel] = useState<string>('prophet');
  const [forecastDays, setForecastDays] = useState<number>(5);

  // Heatmap controls
  const [sortField, setSortField] = useState<SortField>('variation');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredStock, setHoveredStock] = useState<string | null>(null);
  const [expandedSector, setExpandedSector] = useState<string | null>(null);

  const fetchData = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      setError(null);
      const data = await getMarketData();
      setStocks(data.stocks);
      setLastUpdate(data.timestamp);
      if (selectedStock) {
        const updated = data.stocks.find(s => s.isin === selectedStock.isin);
        if (updated) setSelectedStock(updated);
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

  const handleStockClick = (stock: StockData) => {
    setSelectedStock(stock);
    setTimeout(() => {
      forecastSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
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

  useEffect(() => {
    setForecastResult(null);
    setForecastError(null);
  }, [selectedStock?.isin]);

  /** Filtered, sorted stocks */
  const filteredStocks = useMemo(() => {
    let list = [...stocks];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.ticker.toLowerCase().includes(q) ||
          s.valeur.toLowerCase().includes(q) ||
          s.groupe.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      return sortDir === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });
    return list;
  }, [stocks, searchQuery, sortField, sortDir]);

  /** Stocks grouped by sector */
  const sectorGroups = useMemo(() => {
    const groups: Record<string, StockData[]> = {};
    filteredStocks.forEach((s) => {
      const sector = s.groupe || 'Autre';
      if (!groups[sector]) groups[sector] = [];
      groups[sector].push(s);
    });
    // Sort sectors by total market cap descending
    return Object.entries(groups).sort(
      ([, a], [, b]) =>
        b.reduce((sum, s) => sum + s.capitalisation, 0) -
        a.reduce((sum, s) => sum + s.capitalisation, 0),
    );
  }, [filteredStocks]);

  /** Market summary stats */
  const marketStats = useMemo(() => {
    const up = stocks.filter((s) => s.variation > 0).length;
    const down = stocks.filter((s) => s.variation < 0).length;
    const flat = stocks.filter((s) => s.variation === 0).length;
    const avgVar = stocks.length ? stocks.reduce((s, st) => s + st.variation, 0) / stocks.length : 0;
    return { up, down, flat, avgVar };
  }, [stocks]);

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
    <div className="space-y-5">
      {/* ─── Header ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Market Heatmap</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {stocks.length} valeurs&nbsp;&middot;&nbsp;
            <span className="text-green-600 font-semibold">{marketStats.up} hausse</span>,{' '}
            <span className="text-red-600 font-semibold">{marketStats.down} baisse</span>,{' '}
            <span className="text-slate-500 font-semibold">{marketStats.flat} inchangées</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            <Wifi className="h-3 w-3 text-green-500 mr-1.5" />
            <span>{lastUpdate}</span>
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

      {/* ─── Controls bar ───────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher ticker, nom ou secteur…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
            />
          </div>

          <div className="h-6 w-px bg-slate-200 hidden md:block" />

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-slate-400" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm"
              title={sortDir === 'desc' ? 'Décroissant' : 'Croissant'}
            >
              {sortDir === 'desc' ? '↓' : '↑'}
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden md:block" />

          {/* View mode */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Grille
            </button>
            <button
              onClick={() => setViewMode('sector')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'sector' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layers className="h-4 w-4" />
              Secteurs
            </button>
          </div>

          {/* Gradient Legend */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-semibold text-red-600">-6%</span>
            <div
              className="w-36 h-5 rounded-full"
              style={{
                background:
                  'linear-gradient(to right, #b91c1c, #ef4444, #fca5a5, #e2e8f0, #86efac, #22c55e, #15803d)',
              }}
            />
            <span className="text-xs font-semibold text-green-600">+6%</span>
          </div>
        </div>
      </div>

      {/* ─── Heatmap: Grid view ─────────────────────────── */}
      {viewMode === 'grid' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          {filteredStocks.length === 0 ? (
            <p className="text-center text-slate-400 py-12">Aucun résultat pour « {searchQuery} »</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5">
              {filteredStocks.map((stock) => {
                const style = getHeatmapStyle(stock.variation);
                const isSelected = selectedStock?.isin === stock.isin;
                const isHovered = hoveredStock === stock.isin;
                return (
                  <button
                    key={stock.isin}
                    onClick={() => handleStockClick(stock)}
                    onMouseEnter={() => setHoveredStock(stock.isin)}
                    onMouseLeave={() => setHoveredStock(null)}
                    className={`relative group rounded-lg transition-all duration-200 text-left overflow-hidden
                      ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                      ${isHovered ? 'scale-105 z-10 shadow-lg' : 'shadow-sm hover:shadow-md'}
                    `}
                    style={{ backgroundColor: style.backgroundColor }}
                  >
                    <div className="px-2.5 py-3 flex flex-col items-center justify-center min-h-[88px]">
                      <span
                        className="font-bold text-sm leading-tight truncate w-full text-center"
                        style={{ color: style.textColor }}
                      >
                        {stock.ticker}
                      </span>
                      <span
                        className="text-[10px] leading-tight truncate w-full text-center mt-0.5 opacity-75"
                        style={{ color: style.textColor }}
                      >
                        {stock.valeur.length > 14
                          ? stock.valeur.substring(0, 12) + '…'
                          : stock.valeur}
                      </span>
                      <span
                        className="font-extrabold text-base mt-1"
                        style={{ color: style.textColor }}
                      >
                        {stock.variation >= 0 ? '+' : ''}
                        {stock.variation.toFixed(2)}%
                      </span>
                      <span
                        className="text-[10px] opacity-60 mt-0.5"
                        style={{ color: style.textColor }}
                      >
                        {stock.dernier.toFixed(2)} TND
                      </span>
                    </div>

                    {/* Hover tooltip */}
                    {isHovered && (
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 bg-slate-900 text-white rounded-lg shadow-xl px-4 py-3 text-xs whitespace-nowrap pointer-events-none">
                        <div className="font-bold text-sm mb-1">{stock.ticker} — {stock.valeur}</div>
                        <div className="text-slate-300 mb-1">{stock.groupe || '—'}</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
                          <span className="text-slate-400">Prix:</span>
                          <span className="font-semibold text-right">{stock.dernier.toFixed(3)} TND</span>
                          <span className="text-slate-400">Variation:</span>
                          <span className={`font-semibold text-right ${stock.variation >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stock.variation >= 0 ? '+' : ''}{stock.variation.toFixed(2)}%
                          </span>
                          <span className="text-slate-400">Volume:</span>
                          <span className="font-semibold text-right">{stock.quantite.toLocaleString()}</span>
                          <span className="text-slate-400">Cap:</span>
                          <span className="font-semibold text-right">{(stock.capitalisation / 1_000_000).toFixed(1)}M</span>
                          <span className="text-slate-400">Ref:</span>
                          <span className="font-semibold text-right">{stock.reference.toFixed(3)}</span>
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-2.5 h-2.5 bg-slate-900 rotate-45 -mt-1.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Heatmap: Sector view ──────────────────────── */}
      {viewMode === 'sector' && (
        <div className="space-y-3">
          {sectorGroups.map(([sector, sectorStocks]) => {
            const sectorCap = sectorStocks.reduce((s, st) => s + st.capitalisation, 0);
            const sectorAvg = sectorStocks.reduce((s, st) => s + st.variation, 0) / sectorStocks.length;
            const isExpanded = expandedSector === null || expandedSector === sector;
            return (
              <div key={sector} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Sector header */}
                <button
                  onClick={() => setExpandedSector(expandedSector === sector ? null : sector)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getHeatmapStyle(sectorAvg).backgroundColor }}
                    />
                    <h3 className="font-bold text-slate-800 text-sm">{sector}</h3>
                    <span className="text-xs text-slate-400">{sectorStocks.length} valeurs</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-bold ${sectorAvg >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {sectorAvg >= 0 ? '+' : ''}{sectorAvg.toFixed(2)}%
                    </span>
                    <span className="text-xs text-slate-400">{(sectorCap / 1_000_000).toFixed(0)}M TND</span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>
                {/* Sector stocks */}
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-11 gap-1.5">
                      {sectorStocks.map((stock) => {
                        const style = getHeatmapStyle(stock.variation);
                        const isSelected = selectedStock?.isin === stock.isin;
                        const isHovered = hoveredStock === stock.isin;
                        return (
                          <button
                            key={stock.isin}
                            onClick={() => handleStockClick(stock)}
                            onMouseEnter={() => setHoveredStock(stock.isin)}
                            onMouseLeave={() => setHoveredStock(null)}
                            className={`relative group rounded-lg transition-all duration-200
                              ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                              ${isHovered ? 'scale-105 z-10 shadow-lg' : 'shadow-sm hover:shadow-md'}
                            `}
                            style={{ backgroundColor: style.backgroundColor }}
                          >
                            <div className="px-2 py-2.5 flex flex-col items-center justify-center min-h-[76px]">
                              <span className="font-bold text-xs truncate w-full text-center" style={{ color: style.textColor }}>
                                {stock.ticker}
                              </span>
                              <span className="font-extrabold text-sm mt-0.5" style={{ color: style.textColor }}>
                                {stock.variation >= 0 ? '+' : ''}{stock.variation.toFixed(2)}%
                              </span>
                              <span className="text-[10px] opacity-60" style={{ color: style.textColor }}>
                                {stock.dernier.toFixed(2)}
                              </span>
                            </div>

                            {/* Hover tooltip */}
                            {isHovered && (
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 bg-slate-900 text-white rounded-lg shadow-xl px-4 py-3 text-xs whitespace-nowrap pointer-events-none">
                                <div className="font-bold text-sm mb-1">{stock.ticker} — {stock.valeur}</div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
                                  <span className="text-slate-400">Prix:</span>
                                  <span className="font-semibold text-right">{stock.dernier.toFixed(3)} TND</span>
                                  <span className="text-slate-400">Variation:</span>
                                  <span className={`font-semibold text-right ${stock.variation >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {stock.variation >= 0 ? '+' : ''}{stock.variation.toFixed(2)}%
                                  </span>
                                  <span className="text-slate-400">Volume:</span>
                                  <span className="font-semibold text-right">{stock.quantite.toLocaleString()}</span>
                                  <span className="text-slate-400">Cap:</span>
                                  <span className="font-semibold text-right">{(stock.capitalisation / 1_000_000).toFixed(1)}M</span>
                                </div>
                                <div className="absolute left-1/2 -translate-x-1/2 top-full w-2.5 h-2.5 bg-slate-900 rotate-45 -mt-1.5" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Forecast Section */}
      {selectedStock && (
        <div ref={forecastSectionRef} className="scroll-mt-6">
          <Card
            title={`Analyse & Prévisions: ${selectedStock.ticker}`}
            subtitle={selectedStock.valeur}
            headerAction={
              <button
                onClick={() => setSelectedStock(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            }
          >
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-600">Prix Actuel</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{selectedStock.dernier.toFixed(3)} TND</p>
                  <div className="flex items-center mt-1">
                    {selectedStock.variation >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                    )}
                    <span className={`text-xs font-semibold ${selectedStock.variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedStock.variation >= 0 ? '+' : ''}{selectedStock.variation.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-green-600">Volume</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{(selectedStock.quantite / 1000).toFixed(1)}K</p>
                  <p className="text-xs text-slate-500 mt-1">Quantité échangée</p>
                </div>

                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-purple-600">Capitalisation</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{(selectedStock.capitalisation / 1_000_000).toFixed(1)}M</p>
                  <p className="text-xs text-slate-500 mt-1">TND</p>
                </div>

                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-orange-600">Statut</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{selectedStock.statut || 'N/A'}</p>
                  <p className="text-xs text-slate-500 mt-1">{selectedStock.heure}</p>
                </div>
              </div>

              {/* Order Book Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-green-700 mb-2">Achat (Bid)</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-600">Prix:</span>
                      <span className="font-bold text-green-700">{selectedStock.achat.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-600">Quantité:</span>
                      <span className="font-semibold text-slate-900">{selectedStock.qty_a.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-red-700 mb-2">Vente (Ask)</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-600">Prix:</span>
                      <span className="font-bold text-red-700">{selectedStock.vente.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-600">Quantité:</span>
                      <span className="font-semibold text-slate-900">{selectedStock.qty_v.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Forecast Controls */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Prévisions de Prix & Volume
                </h3>
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Modèle</label>
                    <select
                      value={forecastModel}
                      onChange={(e) => setForecastModel(e.target.value)}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="prophet">Prophet</option>
                      <option value="arima">ARIMA</option>
                      <option value="lstm">LSTM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Période</label>
                    <select
                      value={forecastDays}
                      onChange={(e) => setForecastDays(Number(e.target.value))}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {[3, 5, 7, 10, 14].map((d) => (
                        <option key={d} value={d}>{d} jours</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleForecast}
                    disabled={forecastLoading}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                    {forecastError}
                  </div>
                )}

                {/* Forecast Results */}
                {forecastResult && (
                  <div className="mt-6 space-y-6">
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <p className="text-xs font-semibold text-blue-600">Dernier Prix</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">
                          {forecastResult.price.last_actual_price.toFixed(2)} <span className="text-sm font-normal text-slate-500">TND</span>
                        </p>
                      </div>
                      <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
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
                      <div className={`rounded-xl p-4 border ${forecastResult.liquidity.classification === 'High' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <p className="text-xs font-semibold flex items-center gap-1">
                          <Droplets className="h-3 w-3" />
                          <span className={forecastResult.liquidity.classification === 'High' ? 'text-green-600' : 'text-red-600'}>Liquidité</span>
                        </p>
                        <p className="text-xl font-bold text-slate-900 mt-1">{forecastResult.liquidity.classification === 'High' ? 'Haute' : 'Basse'}</p>
                        <p className="text-xs text-slate-500 mt-1">Score: {forecastResult.liquidity.current_liquidity_score.toFixed(1)}</p>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                        <p className="text-xs font-semibold text-purple-600 flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Volatilité
                        </p>
                        <p className="text-xl font-bold text-slate-900 mt-1">{(forecastResult.liquidity.volatility * 100).toFixed(2)}%</p>
                        <p className="text-xs text-slate-500 mt-1">Ratio: {forecastResult.liquidity.volume_ratio.toFixed(2)}x</p>
                      </div>
                    </div>

                    {/* Price Forecast Chart */}
                    <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-6">
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
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            stroke="#64748b"
                            domain={['auto', 'auto']}
                            tickFormatter={(v: number) => v.toFixed(1)}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}
                            formatter={(value: number) => [`${value.toFixed(2)} TND`]}
                          />
                          <Legend />
                          <Area type="monotone" dataKey="max" stroke="transparent" fill="url(#colorCI)" name="Borne Haute" />
                          <Area type="monotone" dataKey="min" stroke="transparent" fill="url(#colorCI)" name="Borne Basse" />
                          <Area type="monotone" dataKey="prix" stroke="#3b82f6" strokeWidth={3} fill="none" dot={{ r: 5, fill: '#3b82f6' }} name="Prix Prévu" />
                          <ReferenceLine
                            y={forecastResult.price.last_actual_price}
                            stroke="#ef4444"
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            label={{ value: `Actuel: ${forecastResult.price.last_actual_price.toFixed(2)}`, position: 'insideTopLeft', fill: '#ef4444', fontSize: 11 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Volume Forecast Chart */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-green-600" />
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
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
                            <YAxis tick={{ fontSize: 11 }} stroke="#64748b" tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                              contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0' }}
                              formatter={(value: number) => [value.toLocaleString(), 'Volume']}
                            />
                            <Bar dataKey="volume" name="Volume Prévu" radius={[6, 6, 0, 0]}>
                              {forecastResult.volume.forecasts.map((_, i) => (
                                <Cell key={i} fill={i === 0 ? '#10b981' : '#86efac'} />
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
                          <div className="w-32 h-32">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: 'Haute', value: Math.round(forecastResult.liquidity.high_liquidity_probability * 100) },
                                    { name: 'Basse', value: Math.round(forecastResult.liquidity.low_liquidity_probability * 100) },
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={30}
                                  outerRadius={50}
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
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500" />
                              <span className="text-sm text-slate-600">Haute</span>
                              <span className="ml-auto font-bold text-slate-900">{(forecastResult.liquidity.high_liquidity_probability * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500" />
                              <span className="text-sm text-slate-600">Basse</span>
                              <span className="ml-auto font-bold text-slate-900">{(forecastResult.liquidity.low_liquidity_probability * 100).toFixed(0)}%</span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Volume Récent</span>
                                <span className="font-semibold text-slate-900">{forecastResult.liquidity.recent_volume.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
