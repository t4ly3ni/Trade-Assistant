import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Card from '../components/Card';
import ChatBot, { type ChatSuggestion } from '../components/ChatBot';
import {
  Wallet, TrendingUp, TrendingDown, Activity, DollarSign,
  PieChart as PieChartIcon, Shield, Target, AlertTriangle,
  ShoppingCart, ChevronRight, ChevronDown, Eye, BarChart3,
  Zap, Clock, X, CheckCircle, Plus, Minus, History, User,
  Sparkles, Info, ArrowUpRight, ArrowDownRight, RefreshCw,
  HelpCircle, ArrowRight, Loader2, BookOpen, Search,
  Brain, Timer, ThumbsUp, ThumbsDown,
  Newspaper, BarChart2, Bell, BellRing,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar,
} from 'recharts';
import {
  getPortfolio, getPortfolioPositions, getStockSentiment,
  getFullForecast, getAnomalyReport,
} from '../lib/api';
import type { StockSentiment, FullForecastResult, Alert } from '../lib/types';

// ─── Types & Constants ──────────────────────────────────────────

interface Portfolio {
  id: string;
  name: string;
  initial_capital: number;
  current_value: number;
  cash_balance: number;
  risk_profile: string;
}

interface Position {
  id: string;
  quantity: number;
  average_buy_price: number;
  current_price: number;
  total_value: number;
  profit_loss: number;
  profit_loss_percent: number;
  purchase_date: string;
  stocks: { symbol: string; name: string; sector: string };
}

interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  symbol: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  date: string;
  status: 'completed' | 'pending';
}

interface ProfileAnswers {
  experience: number;
  risk: number;
  horizon: number;
  amount: number;
}

interface StockDetailCache {
  sentiment?: StockSentiment | null;
  forecast?: FullForecastResult | null;
  loading: boolean;
  error?: string;
}

interface InvestmentDecision {
  id: string;
  symbol: string;
  alertId: string;
  decision: 'buy' | 'sell' | 'wait';
  reasoning: string;
  priceAtDecision: number;
  priceNow?: number;         // updated later
  outcome?: 'profit' | 'loss' | 'pending';
  outcomePercent?: number;
  sentimentScore?: number;
  forecastDirection?: string;
  decisionDate: string;
  executedDate?: string;      // when they actually entered/exited
  executedPrice?: number;
}

interface IntradayPoint {
  time: string;
  price: number;
  volume: number;
  isSpike?: boolean;
}

type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

// Profile questionnaire
const PROFILE_QUESTIONS = [
  {
    id: 'experience',
    question: 'Quelle est votre expérience en investissement boursier ?',
    icon: BookOpen,
    options: [
      { label: 'Débutant – Je découvre la bourse', value: 1, emoji: '🌱' },
      { label: 'Intermédiaire – J\'ai quelques connaissances', value: 2, emoji: '📊' },
      { label: 'Expert – Je trade régulièrement', value: 3, emoji: '🎯' },
    ],
  },
  {
    id: 'risk',
    question: 'Quel niveau de risque êtes-vous prêt à accepter ?',
    icon: Shield,
    options: [
      { label: 'Faible – Je préfère la sécurité', value: 1, emoji: '🛡️' },
      { label: 'Modéré – Un équilibre rendement/risque', value: 2, emoji: '⚖️' },
      { label: 'Élevé – Je vise le rendement maximal', value: 3, emoji: '🚀' },
    ],
  },
  {
    id: 'horizon',
    question: 'Quel est votre horizon d\'investissement ?',
    icon: Clock,
    options: [
      { label: 'Court terme – Moins d\'un an', value: 1, emoji: '⏱️' },
      { label: 'Moyen terme – 1 à 3 ans', value: 2, emoji: '📅' },
      { label: 'Long terme – Plus de 3 ans', value: 3, emoji: '🏗️' },
    ],
  },
];

const ALLOCATION_TARGETS: Record<RiskProfile, { label: string; stocks: number; bonds: number; cash: number }> = {
  conservative: { label: 'Conservateur', stocks: 20, bonds: 50, cash: 30 },
  moderate:     { label: 'Modéré',       stocks: 40, bonds: 30, cash: 30 },
  aggressive:   { label: 'Agressif',     stocks: 70, bonds: 20, cash: 10 },
};

const PROFILE_COLORS: Record<RiskProfile, { bg: string; text: string; border: string; badge: string }> = {
  conservative: { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800' },
  moderate:     { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' },
  aggressive:   { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200', badge: 'bg-red-100 text-red-800' },
};

const DONUT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const ALLOCATION_COLORS = { stocks: '#3b82f6', bonds: '#10b981', cash: '#f59e0b' };

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 'tx-1', type: 'buy', symbol: 'BIAT', name: 'BIAT', quantity: 150, price: 105.20, total: 15780, date: '2024-07-15', status: 'completed' },
  { id: 'tx-2', type: 'buy', symbol: 'SFBT', name: 'SFBT', quantity: 800, price: 19.80, total: 15840, date: '2024-08-01', status: 'completed' },
  { id: 'tx-3', type: 'buy', symbol: 'PGH', name: 'PGH', quantity: 2000, price: 11.20, total: 22400, date: '2024-09-10', status: 'completed' },
  { id: 'tx-4', type: 'buy', symbol: 'ATTIJARI', name: 'ATTIJARI', quantity: 400, price: 44.10, total: 17640, date: '2024-10-05', status: 'completed' },
  { id: 'tx-5', type: 'buy', symbol: 'TLNET', name: 'TLNET', quantity: 2500, price: 8.10, total: 20250, date: '2024-11-20', status: 'completed' },
];

const AVAILABLE_STOCKS = [
  { symbol: 'BIAT', name: 'Banque Internationale Arabe de Tunisie', price: 112.50, sector: 'Banques' },
  { symbol: 'BNA', name: 'Banque Nationale Agricole', price: 14.80, sector: 'Banques' },
  { symbol: 'SFBT', name: 'Société Frigorifique et Brasserie de Tunis', price: 21.40, sector: 'Agroalimentaire' },
  { symbol: 'PGH', name: 'Poulina Group Holding', price: 11.90, sector: 'Holdings' },
  { symbol: 'STB', name: 'Société Tunisienne de Banque', price: 5.60, sector: 'Banques' },
  { symbol: 'ATTIJARI', name: 'Attijari Bank', price: 42.30, sector: 'Banques' },
  { symbol: 'TLNET', name: 'Telnet Holding', price: 8.75, sector: 'Technologie' },
  { symbol: 'SAH', name: 'SAH Lilas', price: 15.20, sector: 'Industrie' },
  { symbol: 'SOTUVER', name: 'Société Tunisienne de Verreries', price: 7.90, sector: 'Industrie' },
  { symbol: 'TUNTEL', name: 'Tunisie Télécom', price: 8.45, sector: 'Télécommunications' },
  { symbol: 'ENNAKL', name: 'Ennakl Automobiles', price: 12.30, sector: 'Distribution' },
  { symbol: 'MONOPRIX', name: 'Monoprix', price: 6.85, sector: 'Distribution' },
  { symbol: 'SOTIPAPIER', name: 'Sotipapier', price: 4.52, sector: 'Industrie' },
  { symbol: 'DH', name: 'Délice Holding', price: 15.70, sector: 'Agroalimentaire' },
];

// ─── Helpers ────────────────────────────────────────────────────

function detectProfile(answers: ProfileAnswers): RiskProfile {
  const score = answers.experience + answers.risk + answers.horizon;
  if (score <= 4) return 'conservative';
  if (score <= 7) return 'moderate';
  return 'aggressive';
}

function generatePerformanceData(initial: number, current: number, days = 30) {
  const data = [];
  const trend = (current - initial) / days;
  let val = initial;
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    val += trend + (Math.random() - 0.48) * initial * 0.005;
    val = Math.max(val, initial * 0.9);
    data.push({
      date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      value: parseFloat(val.toFixed(2)),
    });
  }
  data[data.length - 1].value = current;
  return data;
}

function getRecommendation(forecast?: FullForecastResult | null, sentiment?: StockSentiment | null) {
  let score = 0;
  const reasons: string[] = [];

  if (forecast?.price?.forecasts?.length) {
    const lastForecast = forecast.price.forecasts[forecast.price.forecasts.length - 1];
    const priceDiff = ((lastForecast.predicted_close - forecast.price.last_actual_price) / forecast.price.last_actual_price) * 100;
    if (priceDiff > 1) { score += 2; reasons.push(`Prévision haussière +${priceDiff.toFixed(1)}% sur ${forecast.price.forecasts.length} jours`); }
    else if (priceDiff < -1) { score -= 2; reasons.push(`Prévision baissière ${priceDiff.toFixed(1)}%`); }
    else { reasons.push('Prévision stable'); }
  }

  if (sentiment) {
    if (sentiment.overall_score > 0.3) { score += 2; reasons.push(`Sentiment positif (${(sentiment.overall_score * 100).toFixed(0)}%)`); }
    else if (sentiment.overall_score < -0.3) { score -= 2; reasons.push(`Sentiment négatif (${(sentiment.overall_score * 100).toFixed(0)}%)`); }
    else { reasons.push('Sentiment neutre'); }
    if (sentiment.overall_explanation) reasons.push(sentiment.overall_explanation);
  }

  const rec = score >= 2 ? 'ACHETER' : score <= -2 ? 'VENDRE' : 'CONSERVER';
  const color = rec === 'ACHETER' ? 'text-green-700 bg-green-100' : rec === 'VENDRE' ? 'text-red-700 bg-red-100' : 'text-amber-700 bg-amber-100';
  return { recommendation: rec, score, reasons, color };
}

/** Generate simulated intraday volume+price data with a spike around spikeTime */
function generateIntradayData(basePrice: number, spikeTime: string, spikeMultiplier = 8): IntradayPoint[] {
  const points: IntradayPoint[] = [];
  const spikeHour = parseInt(spikeTime.split(':')[0]);
  const spikeMin = parseInt(spikeTime.split(':')[1]);
  let price = basePrice;
  for (let h = 9; h <= 14; h++) {
    for (let m = 0; m < 60; m += 5) {
      const isSpike = h === spikeHour && Math.abs(m - spikeMin) <= 10;
      const normalVol = 200 + Math.floor(Math.random() * 300);
      const volume = isSpike ? normalVol * spikeMultiplier : normalVol;
      const priceMove = isSpike ? basePrice * 0.03 : (Math.random() - 0.49) * basePrice * 0.003;
      price += priceMove;
      points.push({
        time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
        price: parseFloat(price.toFixed(2)),
        volume,
        isSpike,
      });
    }
  }
  return points;
}

// ─── Alert Investigation Modal ──────────────────────────────────

function AlertInvestigationModal({
  alert,
  sentiment,
  forecast,
  loading,
  onClose,
  onDecision,
}: {
  alert: Alert;
  sentiment: StockSentiment | null;
  forecast: FullForecastResult | null;
  loading: boolean;
  onClose: () => void;
  onDecision: (decision: 'buy' | 'sell' | 'wait', reasoning: string) => void;
}) {
  const [activePanel, setActivePanel] = useState<'chart' | 'news' | 'analysis'>('chart');
  const [decisionNote, setDecisionNote] = useState('');

  // Extract a ticker from the alert valeur
  const symbol = alert.valeur?.split(' ')[0] || 'N/A';
  const basePrice = AVAILABLE_STOCKS.find(s => s.symbol === symbol)?.price || 21.40;
  const alertTime = new Date(alert.timestamp);
  const spikeTime = `${alertTime.getHours().toString().padStart(2, '0')}:${alertTime.getMinutes().toString().padStart(2, '0')}`;

  // Generate intraday data with spike
  const intradayData = useMemo(() => generateIntradayData(basePrice, spikeTime), [basePrice, spikeTime]);

  // News related to this alert
  const relatedNews = useMemo(() => {
    const articles = sentiment?.articles || [];
    if (articles.length > 0) return articles.slice(0, 3);
    // Fallback simulated news if no real articles
    const newsTime = new Date(alertTime);
    newsTime.setMinutes(newsTime.getMinutes() - 3);
    return [{
      id: 'sim-1',
      title: `${symbol} annonce un partenariat stratégique majeur`,
      source: 'Business News TN',
      language: 'fr',
      published_date: newsTime.toISOString(),
      sentiment_score: 0.82,
      sentiment_label: 'positive',
      confidence: 0.9,
      analysis_method: 'keywords',
      positive_keywords: 8,
      negative_keywords: 1,
      explanation: 'Article très positif évoquant croissance et expansion',
      explanation_detail: null,
    }];
  }, [sentiment, symbol, alertTime]);

  // Forecast summary
  const forecastSummary = useMemo(() => {
    if (!forecast?.price?.forecasts?.length) return null;
    const last = forecast.price.forecasts[forecast.price.forecasts.length - 1];
    const diff = ((last.predicted_close - forecast.price.last_actual_price) / forecast.price.last_actual_price) * 100;
    const volatility = forecast.liquidity?.volatility || 0;
    return {
      direction: diff > 1 ? 'haussière' : diff < -1 ? 'baissière' : 'stable',
      pctChange: diff,
      lastPrice: forecast.price.last_actual_price,
      targetPrice: last.predicted_close,
      volatility,
      highVolatility: volatility > 0.03 || Math.abs(diff) > 5,
      liquidity: forecast.liquidity?.classification || 'High',
    };
  }, [forecast]);

  const rec = getRecommendation(forecast, sentiment);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Investigation : {symbol}</h3>
              <p className="text-sm text-red-100">{alert.anomaly_type?.replace(/_/g, ' ')} &bull; {alert.severity}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Alert summary bar */}
        <div className="px-6 py-3 bg-red-50 border-b border-red-200 flex items-center gap-4 flex-shrink-0">
          <Zap className="h-4 w-4 text-red-600" />
          <p className="text-sm text-red-800 font-medium flex-1">{alert.message}</p>
          <span className="text-xs text-red-600">
            <Clock className="h-3 w-3 inline mr-1" />
            {new Date(alert.timestamp).toLocaleString('fr-FR')}
          </span>
        </div>

        {/* Panel tabs */}
        <div className="flex border-b border-slate-200 px-6 flex-shrink-0">
          {([
            { id: 'chart' as const, label: 'Volume & Prix', icon: BarChart2 },
            { id: 'news' as const, label: 'Actualités', icon: Newspaper },
            { id: 'analysis' as const, label: 'Analyse IA', icon: Brain },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activePanel === tab.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-blue-600">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Chargement de l&apos;analyse...</span>
            </div>
          ) : (
            <>
              {/* ── Chart Panel ──────────────────────────────── */}
              {activePanel === 'chart' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Volume intrajournalier</h4>
                    <p className="text-xs text-slate-500 mb-3">
                      Pic détecté à {spikeTime} — Volume {alert.current_value ? `${((alert.current_value / (alert.threshold || 1)) * 100).toFixed(0)}%` : '+800%'} au-dessus de la normale
                    </p>
                    <div className="h-56 bg-slate-50 rounded-xl p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={intradayData} barSize={3}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={11} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <Tooltip
                            formatter={(v: number, name: string) => [
                              name === 'volume' ? v.toLocaleString() : `${v.toFixed(2)} TND`,
                              name === 'volume' ? 'Volume' : 'Prix',
                            ]}
                            labelStyle={{ fontWeight: 600 }}
                            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                          />
                          <Bar
                            dataKey="volume"
                            fill="#3b82f6"
                            radius={[2, 2, 0, 0]}
                            // @ts-ignore — Recharts cell styling
                            isAnimationActive={false}
                          >
                            {intradayData.map((entry, i) => (
                              <Cell key={i} fill={entry.isSpike ? '#ef4444' : '#93c5fd'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Évolution du prix</h4>
                    <div className="h-44 bg-slate-50 rounded-xl p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={intradayData}>
                          <defs>
                            <linearGradient id="alertPriceGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={11} />
                          <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <Tooltip
                            formatter={(v: number) => [`${v.toFixed(2)} TND`, 'Prix']}
                            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                          />
                          <Area type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={2} fill="url(#alertPriceGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* ── News Panel ───────────────────────────────── */}
              {activePanel === 'news' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900">Actualités liées à {symbol}</h4>
                  {relatedNews.length === 0 ? (
                    <p className="text-sm text-slate-500 italic py-4">Aucune actualité trouvée.</p>
                  ) : (
                    <div className="space-y-3">
                      {relatedNews.map((article, i) => (
                        <div key={article.id || i} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg flex-shrink-0 ${
                              article.sentiment_label === 'positive' ? 'bg-green-100' :
                              article.sentiment_label === 'negative' ? 'bg-red-100' : 'bg-gray-100'
                            }`}>
                              <Newspaper className={`h-4 w-4 ${
                                article.sentiment_label === 'positive' ? 'text-green-600' :
                                article.sentiment_label === 'negative' ? 'text-red-600' : 'text-gray-600'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-sm text-slate-900">{article.title}</h5>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-xs text-slate-500">{article.source}</span>
                                <span className="text-xs text-slate-400">
                                  {new Date(article.published_date).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  article.sentiment_label === 'positive' ? 'bg-green-100 text-green-700' :
                                  article.sentiment_label === 'negative' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {article.sentiment_score > 0 ? '+' : ''}{(article.sentiment_score * 100).toFixed(0)}%
                                </span>
                              </div>
                              {article.explanation && (
                                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{article.explanation}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-800">
                      <Info className="h-3 w-3 inline mr-1" />
                      La première news est apparue <strong>3 min avant</strong> le pic de volume, ce qui suggère une réaction du marché à cette annonce.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Analysis Panel ───────────────────────────── */}
              {activePanel === 'analysis' && (
                <div className="space-y-4">
                  {/* Sentiment */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        <h4 className="font-semibold text-sm text-slate-900">Sentiment</h4>
                      </div>
                      {sentiment ? (
                        <>
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`text-3xl font-bold ${
                              sentiment.overall_score > 0.2 ? 'text-green-600' :
                              sentiment.overall_score < -0.2 ? 'text-red-600' : 'text-amber-600'
                            }`}>
                              {sentiment.overall_score > 0 ? '+' : ''}{(sentiment.overall_score * 100).toFixed(0)}%
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              sentiment.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                              sentiment.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {sentiment.sentiment === 'positive' ? 'Positif' :
                               sentiment.sentiment === 'negative' ? 'Négatif' : 'Neutre'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {sentiment.overall_explanation || 'Analyse basée sur les actualités récentes.'}
                          </p>
                          <p className="text-xs text-slate-400 mt-2">{sentiment.articles_analyzed} articles analysés</p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-500 italic">Données sentiment non disponibles.</p>
                      )}
                    </div>

                    {/* Forecast */}
                    <div className="p-4 bg-white rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <h4 className="font-semibold text-sm text-slate-900">Prévision</h4>
                      </div>
                      {forecastSummary ? (
                        <>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Direction</span>
                              <span className={`font-semibold ${forecastSummary.pctChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {forecastSummary.direction} ({forecastSummary.pctChange >= 0 ? '+' : ''}{forecastSummary.pctChange.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Prix cible</span>
                              <span className="font-semibold text-slate-900">{forecastSummary.targetPrice.toFixed(2)} TND</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Liquidité</span>
                              <span className={`font-semibold ${forecastSummary.liquidity === 'High' ? 'text-green-600' : 'text-red-600'}`}>
                                {forecastSummary.liquidity === 'High' ? 'Élevée' : 'Faible'}
                              </span>
                            </div>
                          </div>
                          {forecastSummary.highVolatility && (
                            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-xs text-amber-800 font-medium flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Volatilité élevée prévue, prudence recommandée
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-slate-500 italic">Prévisions non disponibles.</p>
                      )}
                    </div>
                  </div>

                  {/* AI Recommendation */}
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-indigo-600" />
                      <h4 className="font-semibold text-sm text-slate-900">Recommandation IA</h4>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-lg font-bold px-3 py-1 rounded-lg ${rec.color}`}>
                        {rec.recommendation}
                      </span>
                    </div>
                    <ul className="text-xs text-slate-600 space-y-1">
                      {rec.reasons.slice(0, 4).map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle className="h-3 w-3 text-indigo-500 mt-0.5 flex-shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Decision footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex-shrink-0">
          <p className="text-xs text-slate-500 mb-2 font-medium">Votre décision :</p>
          <div className="flex items-center gap-2 mb-3">
            <input
              value={decisionNote}
              onChange={e => setDecisionNote(e.target.value)}
              placeholder="Raison de votre décision (optionnel)..."
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onDecision('buy', decisionNote || 'Signal positif confirmé par sentiment et news')}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <ThumbsUp className="h-4 w-4" />
              Acheter maintenant
            </button>
            <button
              onClick={() => onDecision('wait', decisionNote || 'Volatilité élevée, j\'attends la stabilisation')}
              className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-medium text-sm hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
            >
              <Timer className="h-4 w-4" />
              Attendre 24h
            </button>
            <button
              onClick={() => onDecision('sell', decisionNote || 'Risque trop élevé, je vends ma position')}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <ThumbsDown className="h-4 w-4" />
              Vendre / Éviter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Wizard Component ───────────────────────────────────

function ProfileWizard({ onComplete }: { onComplete: (profile: RiskProfile, amount: number) => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<ProfileAnswers>({ experience: 0, risk: 0, horizon: 0, amount: 5000 });
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const isAmountStep = step === PROFILE_QUESTIONS.length;
  const isResultStep = step === PROFILE_QUESTIONS.length + 1;
  const detectedProfile = detectProfile(answers);
  const target = ALLOCATION_TARGETS[detectedProfile];
  const colors = PROFILE_COLORS[detectedProfile];

  function handleOptionSelect(value: number) {
    setSelectedOption(value);
    const key = PROFILE_QUESTIONS[step].id as keyof ProfileAnswers;
    setAnswers(prev => ({ ...prev, [key]: value }));
  }

  function handleNext() {
    if (step < PROFILE_QUESTIONS.length && selectedOption === null) return;
    setSelectedOption(null);
    setStep(s => s + 1);
  }

  function handleBack() {
    setSelectedOption(null);
    setStep(s => Math.max(0, s - 1));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
            style={{ width: `${((step + 1) / (PROFILE_QUESTIONS.length + 2)) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 mb-4">
              {isResultStep ? <CheckCircle className="h-7 w-7 text-blue-600" /> :
               isAmountStep ? <DollarSign className="h-7 w-7 text-blue-600" /> :
               <User className="h-7 w-7 text-blue-600" />}
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {isResultStep ? 'Votre Profil Investisseur' :
               isAmountStep ? 'Montant à Investir' :
               'Questionnaire de Profil'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isResultStep ? 'Voici notre recommandation personnalisée' :
               isAmountStep ? 'Combien souhaitez-vous investir ?' :
               `Étape ${step + 1} sur ${PROFILE_QUESTIONS.length + 1}`}
            </p>
          </div>

          {/* Questions */}
          {!isAmountStep && !isResultStep && (
            <div>
              <p className="font-medium text-slate-800 mb-4">
                {PROFILE_QUESTIONS[step].question}
              </p>
              <div className="space-y-3">
                {PROFILE_QUESTIONS[step].options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleOptionSelect(opt.value)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedOption === opt.value
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="mr-3">{opt.emoji}</span>
                    <span className="font-medium text-slate-800">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount step */}
          {isAmountStep && (
            <div>
              <p className="font-medium text-slate-800 mb-4">
                Quel montant souhaitez-vous investir en dinars tunisiens (TND) ?
              </p>
              <div className="relative">
                <input
                  type="number"
                  value={answers.amount}
                  onChange={(e) => setAnswers(prev => ({ ...prev, amount: Math.max(100, Number(e.target.value)) }))}
                  min={100}
                  step={500}
                  className="w-full p-4 text-2xl font-bold text-center border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">TND</span>
              </div>
              <div className="flex gap-2 mt-4">
                {[1000, 5000, 10000, 50000, 100000].map(v => (
                  <button
                    key={v}
                    onClick={() => setAnswers(prev => ({ ...prev, amount: v }))}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                      answers.amount === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {v >= 1000 ? `${v / 1000}k` : v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Result step */}
          {isResultStep && (
            <div>
              <div className={`p-5 rounded-xl border-2 ${colors.border} ${colors.bg} mb-6`}>
                <div className="flex items-center gap-3 mb-3">
                  <Shield className={`h-6 w-6 ${colors.text}`} />
                  <span className={`text-lg font-bold ${colors.text}`}>{target.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                    Profil détecté
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  Avec un investissement de <strong>{answers.amount.toLocaleString()} TND</strong>, nous recommandons :
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <p className="text-2xl font-bold text-blue-700">{target.stocks}%</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">Actions</p>
                  <p className="text-xs text-slate-500">{(answers.amount * target.stocks / 100).toLocaleString()} TND</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <p className="text-2xl font-bold text-green-700">{target.bonds}%</p>
                  <p className="text-xs text-green-600 font-medium mt-1">Obligations</p>
                  <p className="text-xs text-slate-500">{(answers.amount * target.bonds / 100).toLocaleString()} TND</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-xl">
                  <p className="text-2xl font-bold text-amber-700">{target.cash}%</p>
                  <p className="text-xs text-amber-600 font-medium mt-1">Liquidité</p>
                  <p className="text-xs text-slate-500">{(answers.amount * target.cash / 100).toLocaleString()} TND</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={handleBack}
              disabled={step === 0}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Retour
            </button>
            {isResultStep ? (
              <button
                onClick={() => onComplete(detectedProfile, answers.amount)}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Commencer à investir
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!isAmountStep && selectedOption === null}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                Suivant <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Trade Modal Component ──────────────────────────────────────

function TradeModal({ type, stock, cashAvailable, maxQty, onClose, onConfirm }: {
  type: 'buy' | 'sell';
  stock: { symbol: string; name: string; price: number };
  cashAvailable: number;
  maxQty: number;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(type === 'buy' ? 10 : Math.min(10, maxQty));
  const total = quantity * stock.price;
  const isBuy = type === 'buy';
  const maxBuyQty = Math.floor(cashAvailable / stock.price);
  const effectiveMax = isBuy ? maxBuyQty : maxQty;
  const isValid = quantity > 0 && quantity <= effectiveMax;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className={`px-6 py-4 ${isBuy ? 'bg-green-600' : 'bg-red-600'} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            {isBuy ? <ShoppingCart className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
            <h3 className="font-semibold">{isBuy ? 'Acheter' : 'Vendre'} {stock.symbol}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-sm font-semibold text-slate-900">{stock.name}</p>
            <p className="text-xs text-slate-500">{stock.symbol} &bull; Prix actuel: {stock.price.toFixed(2)} TND</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Quantité</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 10))}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                min={1}
                max={effectiveMax}
                className="flex-1 p-3 text-center text-lg font-bold border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none"
              />
              <button
                onClick={() => setQuantity(q => Math.min(effectiveMax, q + 10))}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>Max: {effectiveMax.toLocaleString()} actions</span>
              {isBuy && <span>Disponible: {cashAvailable.toLocaleString()} TND</span>}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Prix unitaire</span>
              <span className="font-medium">{stock.price.toFixed(2)} TND</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Quantité</span>
              <span className="font-medium">{quantity}</span>
            </div>
            <hr className="border-slate-200" />
            <div className="flex justify-between">
              <span className="font-medium text-slate-800">Total</span>
              <span className={`text-lg font-bold ${isBuy ? 'text-green-700' : 'text-red-700'}`}>
                {total.toLocaleString(undefined, { minimumFractionDigits: 2 })} TND
              </span>
            </div>
          </div>

          {!isValid && quantity > 0 && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              {isBuy ? 'Solde insuffisant pour cet ordre' : 'Quantité supérieure à votre position'}
            </p>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50">
              Annuler
            </button>
            <button
              onClick={() => isValid && onConfirm(quantity)}
              disabled={!isValid}
              className={`flex-1 py-3 rounded-xl font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isBuy ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isBuy ? 'Confirmer l\'achat' : 'Confirmer la vente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Portfolio Component ───────────────────────────────────

export default function PortfolioPage() {
  // Core state
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Profile state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [investorProfile, setInvestorProfile] = useState<RiskProfile>('moderate');
  const [investorName] = useState('Ahmed');
  const [investmentAmount, setInvestmentAmount] = useState(5000);

  // Detail state
  const [expandedPosition, setExpandedPosition] = useState<string | null>(null);
  const [stockDetailsCache, setStockDetailsCache] = useState<Record<string, StockDetailCache>>({});

  // Trade state
  const [tradeModal, setTradeModal] = useState<{ type: 'buy' | 'sell'; stock: { symbol: string; name: string; price: number } } | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);

  // Chat focus
  const [chatFocusStock, setChatFocusStock] = useState<string | undefined>(undefined);

  // Chat suggestions displayed on page
  const [chatSuggestions, setChatSuggestions] = useState<ChatSuggestion[]>([]);

  // Chat reset key – changes to force chatbot re-init
  const [chatResetKey, setChatResetKey] = useState(0);

  // Alert investigation state
  const [investigatedAlert, setInvestigatedAlert] = useState<Alert | null>(null);
  const [alertDetailLoading, setAlertDetailLoading] = useState(false);
  const [alertSentiment, setAlertSentiment] = useState<StockSentiment | null>(null);
  const [alertForecast, setAlertForecast] = useState<FullForecastResult | null>(null);

  // Decision tracker state
  const [decisions, setDecisions] = useState<InvestmentDecision[]>([]);
  const [showDecisionHistory, setShowDecisionHistory] = useState(false);

  // Notification state
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [seenAlertIds, setSeenAlertIds] = useState<Set<string>>(new Set());
  const [notifToasts, setNotifToasts] = useState<Alert[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  // UI state
  const [showTransactions, setShowTransactions] = useState(false);
  const [activeTab, setActiveTab] = useState<'positions' | 'trade'>('positions');

  // Refs
  const chatRef = useRef<HTMLDivElement>(null);

  // ── LocalStorage persistence ──────────────────────────────────
  const STORAGE_KEY = 'bvmt_portfolio_state';

  // Load saved state on mount (handled inside fetchData now)
  // This effect only runs for saving changes

  // Save state whenever it changes
  useEffect(() => {
    if (!portfolio) return;
    const state = {
      transactions,
      investorProfile,
      investmentAmount,
      chatSuggestions,
      decisions,
      portfolioOverrides: {
        initial_capital: portfolio.initial_capital,
        current_value: portfolio.current_value,
        cash_balance: portfolio.cash_balance,
        risk_profile: portfolio.risk_profile,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [transactions, investorProfile, investmentAmount, portfolio, chatSuggestions, decisions]);

  // ── Data fetching ─────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const portfolioData = await getPortfolio();
      if (portfolioData) {
        // Apply saved overrides from localStorage on top of fetched data
        let savedOverrides: any = null;
        let savedTx: Transaction[] | null = null;
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            savedOverrides = parsed.portfolioOverrides;
            savedTx = parsed.transactions;
            if (parsed.investorProfile) setInvestorProfile(parsed.investorProfile as RiskProfile);
            if (parsed.investmentAmount) setInvestmentAmount(parsed.investmentAmount);
            if (parsed.chatSuggestions?.length) setChatSuggestions(parsed.chatSuggestions);
            if (parsed.decisions?.length) setDecisions(parsed.decisions);
          }
        } catch { /* ignore */ }

        if (savedOverrides) {
          setPortfolio({ ...portfolioData, ...savedOverrides });
          setInvestorProfile((savedOverrides.risk_profile as RiskProfile) || 'moderate');
          setInvestmentAmount(savedOverrides.initial_capital || portfolioData.initial_capital);
        } else {
          setPortfolio(portfolioData);
          setInvestorProfile((portfolioData.risk_profile as RiskProfile) || 'moderate');
          setInvestmentAmount(portfolioData.initial_capital);
        }

        const positionsData = await getPortfolioPositions(portfolioData.id);
        // If we have saved capital different from mock, scale positions
        if (savedOverrides && savedOverrides.initial_capital !== portfolioData.initial_capital) {
          const ratio = savedOverrides.initial_capital / portfolioData.initial_capital;
          setPositions(positionsData.map(p => {
            const newQty = Math.max(1, Math.round(p.quantity * ratio));
            const newTotal = parseFloat((newQty * p.current_price).toFixed(2));
            const newPL = parseFloat(((p.current_price - p.average_buy_price) * newQty).toFixed(2));
            const newPLPct = p.average_buy_price > 0 ? parseFloat(((newPL / (p.average_buy_price * newQty)) * 100).toFixed(2)) : 0;
            return { ...p, quantity: newQty, total_value: newTotal, profit_loss: newPL, profit_loss_percent: newPLPct };
          }));
        } else {
          setPositions(positionsData);
        }

        if (savedTx?.length) setTransactions(savedTx);
      } else {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const report = await getAnomalyReport();
      if (report?.alerts) {
        // Detect new alerts compared to what we've seen
        const newOnes = report.alerts.filter(a => {
          const aid = `${a.isin || ''}_${a.timestamp}_${a.valeur}`;
          return !seenAlertIds.has(aid);
        });
        setAlerts(report.alerts);
        if (newOnes.length > 0) {
          // Show toast notifications for new alerts (max 3)
          setNotifToasts(newOnes.slice(0, 3));
          // Mark all current alerts as seen
          setSeenAlertIds(prev => {
            const next = new Set(prev);
            report.alerts.forEach(a => next.add(`${a.isin || ''}_${a.timestamp}_${a.valeur}`));
            return next;
          });
        }
      }
    } catch {
      // silently fail – alerts are optional
    }
  }, [seenAlertIds]);

  useEffect(() => {
    fetchData();
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [fetchData, fetchAlerts]);

  // Auto-dismiss toast notifications after 6 seconds
  useEffect(() => {
    if (notifToasts.length === 0) return;
    const timer = setTimeout(() => setNotifToasts([]), 6000);
    return () => clearTimeout(timer);
  }, [notifToasts]);

  // Close notification panel on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    }
    if (showNotifPanel) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifPanel]);

  // ── Stock detail fetching (lazy, cached) ──────────────────────
  const fetchStockDetail = useCallback(async (symbol: string) => {
    if (stockDetailsCache[symbol] && (stockDetailsCache[symbol].loading ||
        stockDetailsCache[symbol].sentiment !== undefined ||
        stockDetailsCache[symbol].forecast !== undefined)) return;

    setStockDetailsCache(prev => ({ ...prev, [symbol]: { loading: true } }));
    try {
      const [sentiment, forecast] = await Promise.allSettled([
        getStockSentiment(symbol),
        getFullForecast(symbol, 'prophet', 5),
      ]);
      setStockDetailsCache(prev => ({
        ...prev,
        [symbol]: {
          sentiment: sentiment.status === 'fulfilled' ? sentiment.value : null,
          forecast: forecast.status === 'fulfilled' ? forecast.value : null,
          loading: false,
        },
      }));
    } catch (err: any) {
      setStockDetailsCache(prev => ({ ...prev, [symbol]: { loading: false, error: err.message } }));
    }
  }, [stockDetailsCache]);

  // ── Position expand handler ───────────────────────────────────
  function handleExpandPosition(posId: string, symbol: string) {
    if (expandedPosition === posId) {
      setExpandedPosition(null);
    } else {
      setExpandedPosition(posId);
      fetchStockDetail(symbol);
    }
  }

  // ── Chat suggestion handler ──────────────────────────────────
  function handleChatSuggestions(newSuggestions: ChatSuggestion[]) {
    setChatSuggestions(prev => {
      // Merge new suggestions, replacing existing ones for same symbol
      const map = new Map(prev.map(s => [s.symbol, s]));
      for (const s of newSuggestions) map.set(s.symbol, s);
      return Array.from(map.values()).slice(-10); // keep last 10
    });
  }

  // ── Beginner trade explanation via chatbot ─────────────────────
  function openTradeWithExplanation(type: 'buy' | 'sell', stock: { symbol: string; name: string; price: number }) {
    const isBeginner = investorProfile === 'conservative' || investmentAmount <= 5000;
    if (isBeginner) {
      // Auto-open chatbot with explanation before showing trade modal
      setChatFocusStock(`explain-${type}-${stock.symbol}-${Date.now()}`);
      // Small delay so the chatbot can open, then show trade modal
      setTimeout(() => setTradeModal({ type, stock }), 400);
    } else {
      setTradeModal({ type, stock });
    }
  }

  // ── Alert investigation handlers ──────────────────────────────
  async function handleInvestigateAlert(alert: Alert) {
    const symbol = alert.valeur?.split(' ')[0] || '';
    if (!symbol) return;
    setInvestigatedAlert(alert);
    setAlertDetailLoading(true);
    setAlertSentiment(null);
    setAlertForecast(null);
    try {
      const [sentRes, foreRes] = await Promise.allSettled([
        getStockSentiment(symbol),
        getFullForecast(symbol, 'prophet', 5),
      ]);
      setAlertSentiment(sentRes.status === 'fulfilled' ? sentRes.value : null);
      setAlertForecast(foreRes.status === 'fulfilled' ? foreRes.value : null);
    } catch { /* silent */ }
    setAlertDetailLoading(false);
  }

  function handleAlertDecision(decision: 'buy' | 'sell' | 'wait', reasoning: string) {
    if (!investigatedAlert) return;
    const symbol = investigatedAlert.valeur?.split(' ')[0] || 'N/A';
    const stockInfo = AVAILABLE_STOCKS.find(s => s.symbol === symbol);
    const price = stockInfo?.price || alertForecast?.price?.last_actual_price || 0;

    const newDecision: InvestmentDecision = {
      id: `dec-${Date.now()}`,
      symbol,
      alertId: investigatedAlert.isin || investigatedAlert.timestamp,
      decision,
      reasoning,
      priceAtDecision: price,
      sentimentScore: alertSentiment?.overall_score,
      forecastDirection: alertForecast?.price?.forecasts?.length
        ? (((alertForecast.price.forecasts[alertForecast.price.forecasts.length - 1].predicted_close - alertForecast.price.last_actual_price) / alertForecast.price.last_actual_price * 100) > 0 ? 'haussière' : 'baissière')
        : undefined,
      decisionDate: new Date().toISOString(),
      outcome: 'pending',
    };

    setDecisions(prev => [newDecision, ...prev]);

    // If decision is 'buy', open trade modal
    if (decision === 'buy' && stockInfo) {
      setInvestigatedAlert(null);
      setTimeout(() => setTradeModal({ type: 'buy', stock: stockInfo }), 300);
    } else if (decision === 'sell' && stockInfo && positions.some(p => p.stocks.symbol === symbol)) {
      setInvestigatedAlert(null);
      setTimeout(() => setTradeModal({ type: 'sell', stock: stockInfo }), 300);
    } else {
      setInvestigatedAlert(null);
      if (decision === 'wait') {
        setTradeSuccess(`⏳ Décision enregistrée : Attendre pour ${symbol}. Le système suivra l'évolution.`);
        setTimeout(() => setTradeSuccess(null), 5000);
      }
    }
  }

  // Update pending decisions with current prices (simulate outcome tracking)
  useEffect(() => {
    if (decisions.length === 0) return;
    const updated = decisions.map(dec => {
      if (dec.outcome !== 'pending') return dec;
      const stock = AVAILABLE_STOCKS.find(s => s.symbol === dec.symbol);
      if (!stock || !dec.priceAtDecision) return dec;
      const daysSince = (Date.now() - new Date(dec.decisionDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 0.01) return dec; // too soon

      // Simulate price movement
      const drift = (Math.random() - 0.45) * 0.05;
      const currentPrice = dec.priceAtDecision * (1 + drift);
      const pctChange = ((currentPrice - dec.priceAtDecision) / dec.priceAtDecision) * 100;

      // If waited and at least 1 day, resolve
      if (dec.decision === 'wait' && daysSince >= 1) {
        return {
          ...dec,
          priceNow: parseFloat(currentPrice.toFixed(2)),
          outcomePercent: parseFloat(pctChange.toFixed(2)),
          outcome: 'pending' as const,  // stays pending until user acts
        };
      }
      // If bought or sold, track performance
      if (dec.decision === 'buy' || dec.decision === 'sell') {
        return {
          ...dec,
          priceNow: parseFloat(currentPrice.toFixed(2)),
          outcomePercent: parseFloat(pctChange.toFixed(2)),
          outcome: (pctChange >= 0 ? 'profit' : 'loss') as 'profit' | 'loss',
        };
      }
      return dec;
    });
    // Only update if something changed
    const hasChange = updated.some((d, i) => d.priceNow !== decisions[i].priceNow || d.outcome !== decisions[i].outcome);
    if (hasChange) setDecisions(updated);
  }, [alerts]); // re-evaluate when alerts refresh

  // ── Trade execution ───────────────────────────────────────────
  function executeTrade(type: 'buy' | 'sell', symbol: string, name: string, price: number, quantity: number) {
    const total = quantity * price;
    const now = new Date().toISOString().split('T')[0];

    if (type === 'buy') {
      setPortfolio(prev => {
        if (!prev) return prev;
        return { ...prev, cash_balance: prev.cash_balance - total };
      });
      const existingIdx = positions.findIndex(p => p.stocks.symbol === symbol);
      if (existingIdx >= 0) {
        setPositions(prev => prev.map((p, i) => {
          if (i !== existingIdx) return p;
          const newQty = p.quantity + quantity;
          const newAvg = (p.average_buy_price * p.quantity + price * quantity) / newQty;
          const newTotal = newQty * p.current_price;
          const pl = (p.current_price - newAvg) * newQty;
          return { ...p, quantity: newQty, average_buy_price: newAvg, total_value: newTotal, profit_loss: pl, profit_loss_percent: (pl / (newAvg * newQty)) * 100 };
        }));
      } else {
        const avStock = AVAILABLE_STOCKS.find(s => s.symbol === symbol);
        const newPos: Position = {
          id: `pos-new-${Date.now()}`,
          quantity,
          average_buy_price: price,
          current_price: price,
          total_value: total,
          profit_loss: 0,
          profit_loss_percent: 0,
          purchase_date: now,
          stocks: { symbol, name, sector: avStock?.sector || 'Autre' },
        };
        setPositions(prev => [...prev, newPos]);
      }
    } else {
      setPortfolio(prev => {
        if (!prev) return prev;
        return { ...prev, cash_balance: prev.cash_balance + total };
      });
      setPositions(prev =>
        prev.map(p => {
          if (p.stocks.symbol !== symbol) return p;
          const newQty = p.quantity - quantity;
          if (newQty <= 0) return null as unknown as Position;
          const newTotal = newQty * p.current_price;
          const pl = (p.current_price - p.average_buy_price) * newQty;
          return { ...p, quantity: newQty, total_value: newTotal, profit_loss: pl, profit_loss_percent: (pl / (p.average_buy_price * newQty)) * 100 };
        }).filter(Boolean)
      );
    }

    const tx: Transaction = { id: `tx-${Date.now()}`, type, symbol, name, quantity, price, total, date: now, status: 'completed' };
    setTransactions(prev => [tx, ...prev]);

    // Recalculate current_value = cash + all position values after a tick
    setTimeout(() => {
      setPositions(latestPositions => {
        const posValue = latestPositions.reduce((s, p) => s + p.total_value, 0);
        setPortfolio(prev => prev ? { ...prev, current_value: prev.cash_balance + posValue } : prev);
        return latestPositions;
      });
    }, 0);

    setTradeModal(null);
    setTradeSuccess(`${type === 'buy' ? 'Achat' : 'Vente'} de ${quantity} ${symbol} confirmé(e) !`);
    setTimeout(() => setTradeSuccess(null), 4000);
  }

  // ── Profile complete handler ──────────────────────────────────
  function handleProfileComplete(profile: RiskProfile, amount: number) {
    setInvestorProfile(profile);
    setInvestmentAmount(amount);
    setShowOnboarding(false);

    // Reset chatbot with new profile context & clear old suggestions
    setChatResetKey(k => k + 1);
    setChatSuggestions([]);

    // Scale the entire portfolio proportionally to the new capital
    setPortfolio(prev => {
      if (!prev) return prev;
      const ratio = amount / prev.initial_capital;
      return {
        ...prev,
        risk_profile: profile,
        initial_capital: amount,
        current_value: parseFloat((prev.current_value * ratio).toFixed(2)),
        cash_balance: parseFloat((prev.cash_balance * ratio).toFixed(2)),
      };
    });

    // Scale all positions proportionally
    setPositions(prev =>
      prev.map(p => {
        const ratio = amount / (portfolio?.initial_capital || 100000);
        const newQty = Math.max(1, Math.round(p.quantity * ratio));
        const newTotal = parseFloat((newQty * p.current_price).toFixed(2));
        const newPL = parseFloat(((p.current_price - p.average_buy_price) * newQty).toFixed(2));
        const newPLPct = p.average_buy_price > 0 ? parseFloat(((newPL / (p.average_buy_price * newQty)) * 100).toFixed(2)) : 0;
        return { ...p, quantity: newQty, total_value: newTotal, profit_loss: newPL, profit_loss_percent: newPLPct };
      })
    );

    // Scale transactions too
    setTransactions(prev => {
      const ratio = amount / (portfolio?.initial_capital || 100000);
      return prev.map(tx => {
        const newQty = Math.max(1, Math.round(tx.quantity * ratio));
        return { ...tx, quantity: newQty, total: parseFloat((newQty * tx.price).toFixed(2)) };
      });
    });
  }

  // ── Derived data ──────────────────────────────────────────────
  const totalProfit = useMemo(() => positions.reduce((s, p) => s + p.profit_loss, 0), [positions]);
  const totalInvested = useMemo(() => positions.reduce((s, p) => s + p.total_value, 0), [positions]);
  const roi = useMemo(() => portfolio ? ((portfolio.current_value - portfolio.initial_capital) / portfolio.initial_capital) * 100 : 0, [portfolio]);

  const sectorAllocation = useMemo(() => {
    const sectors: Record<string, number> = {};
    positions.forEach(p => { sectors[p.stocks.sector] = (sectors[p.stocks.sector] || 0) + p.total_value; });
    return sectors;
  }, [positions]);

  const performanceData = useMemo(() =>
    portfolio ? generatePerformanceData(portfolio.initial_capital, portfolio.current_value) : [],
  [portfolio]);

  const targetAllocation = ALLOCATION_TARGETS[investorProfile];
  const actualStocksPercent = portfolio ? ((totalInvested / portfolio.current_value) * 100) : 0;
  const actualCashPercent = portfolio ? ((portfolio.cash_balance / portfolio.current_value) * 100) : 0;

  // Filter anomaly alerts for portfolio stocks
  const portfolioAlerts = useMemo(() => {
    const symbols = positions.map(p => p.stocks.symbol.toUpperCase());
    return alerts.filter(a =>
      symbols.some(s => a.valeur?.toUpperCase().includes(s))
    ).slice(0, 5);
  }, [alerts, positions]);

  // Count of all alerts (for notification badge)
  const unreadAlertCount = alerts.length;

  // Allocation donut data
  const targetDonutData = [
    { name: 'Actions', value: targetAllocation.stocks },
    { name: 'Obligations', value: targetAllocation.bonds },
    { name: 'Liquidité', value: targetAllocation.cash },
  ];
  const actualDonutData = [
    { name: 'Actions', value: parseFloat(actualStocksPercent.toFixed(1)) },
    { name: 'Obligations', value: 0 },
    { name: 'Liquidité', value: parseFloat(actualCashPercent.toFixed(1)) },
  ];
  const donutColors = [ALLOCATION_COLORS.stocks, ALLOCATION_COLORS.bonds, ALLOCATION_COLORS.cash];

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ── No portfolio — show onboarding ────────────────────────────
  if (!portfolio) {
    return (
      <>
        <div className="text-center py-16">
          <Wallet className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Bienvenue sur votre espace portefeuille</h3>
          <p className="text-slate-500 mb-6">Répondez à quelques questions pour créer votre profil investisseur</p>
          <button
            onClick={() => setShowOnboarding(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Commencer le questionnaire
          </button>
        </div>
        {showOnboarding && <ProfileWizard onComplete={handleProfileComplete} />}
      </>
    );
  }

  const profileColors = PROFILE_COLORS[investorProfile];

  return (
    <div className="space-y-6">
      {/* Profile Onboarding Modal */}
      {showOnboarding && <ProfileWizard onComplete={handleProfileComplete} />}

      {/* Trade Modal */}
      {tradeModal && (
        <TradeModal
          type={tradeModal.type}
          stock={tradeModal.stock}
          cashAvailable={portfolio.cash_balance}
          maxQty={tradeModal.type === 'sell'
            ? (positions.find(p => p.stocks.symbol === tradeModal.stock.symbol)?.quantity || 0)
            : Infinity}
          onClose={() => setTradeModal(null)}
          onConfirm={(qty) => executeTrade(tradeModal.type, tradeModal.stock.symbol, tradeModal.stock.name, tradeModal.stock.price, qty)}
        />
      )}

      {/* Alert Investigation Modal */}
      {investigatedAlert && (
        <AlertInvestigationModal
          alert={investigatedAlert}
          sentiment={alertSentiment}
          forecast={alertForecast}
          loading={alertDetailLoading}
          onClose={() => setInvestigatedAlert(null)}
          onDecision={handleAlertDecision}
        />
      )}

      {/* Trade Success Toast */}
      {tradeSuccess && (
        <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">{tradeSuccess}</span>
        </div>
      )}

      {/* ── Alert Toast Notifications (on refresh / new alerts) ── */}
      {notifToasts.length > 0 && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-full max-w-lg animate-in slide-in-from-top">
          {notifToasts.map((toast, i) => (
            <div
              key={i}
              onClick={() => { setNotifToasts([]); handleInvestigateAlert(toast); }}
              className="bg-white border border-red-200 shadow-2xl rounded-xl px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-red-50 transition-colors"
              style={{ animation: `slideDown 0.4s ease ${i * 0.1}s both` }}
            >
              <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                <BellRing className="h-5 w-5 text-red-600 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-900">{toast.valeur}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    toast.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {toast.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{toast.message}</p>
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <Search className="h-3 w-3" /> Cliquer pour investiguer
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setNotifToasts(prev => prev.filter((_, j) => j !== i)); }}
                className="text-slate-400 hover:text-slate-600 flex-shrink-0 mt-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mon Portefeuille</h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-slate-600">{portfolio.name}</p>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${profileColors.badge}`}>
              <Shield className="h-3 w-3 inline mr-1" />
              {targetAllocation.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className={`relative p-2 rounded-lg transition-colors ${
                showNotifPanel ? 'bg-red-50 text-red-600' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
              }`}
              title="Notifications d'alertes"
            >
              {unreadAlertCount > 0 ? (
                <BellRing className="h-5 w-5" />
              ) : (
                <Bell className="h-5 w-5" />
              )}
              {unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
                  {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotifPanel && (
              <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="font-semibold text-sm text-slate-900">Alertes Détectées</span>
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">{alerts.length}</span>
                  </div>
                  <button onClick={() => setShowNotifPanel(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {alerts.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Aucune alerte pour le moment</p>
                    </div>
                  ) : (
                    alerts.slice(0, 10).map((alert, i) => (
                      <div
                        key={i}
                        onClick={() => { setShowNotifPanel(false); handleInvestigateAlert(alert); }}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                            alert.severity === 'CRITICAL' ? 'bg-red-100' : 'bg-orange-100'
                          }`}>
                            <Zap className={`h-3.5 w-3.5 ${
                              alert.severity === 'CRITICAL' ? 'text-red-600' : 'text-orange-500'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-900">{alert.valeur}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {alert.anomaly_type?.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{alert.message}</p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[10px] text-slate-400">
                                <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                                {new Date(alert.timestamp).toLocaleString('fr-FR')}
                              </p>
                              <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                <Search className="h-2.5 w-2.5" /> Détails
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {alerts.length > 10 && (
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-center">
                    <span className="text-xs text-slate-500">+{alerts.length - 10} autres alertes</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowOnboarding(true)}
            className="px-3 py-2 text-sm text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
          >
            <User className="h-4 w-4" />
            Modifier profil
          </button>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ── Summary Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Valeur Totale</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {portfolio.current_value.toLocaleString()} TND
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Capital: {portfolio.initial_capital.toLocaleString()} TND
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Gains/Pertes</p>
              <p className={`text-2xl font-bold mt-1 ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalProfit >= 0 ? '+' : ''}{totalProfit.toLocaleString()} TND
              </p>
              <div className="flex items-center mt-2">
                {roi >= 0 ? <TrendingUp className="h-4 w-4 text-green-600 mr-1" /> : <TrendingDown className="h-4 w-4 text-red-600 mr-1" />}
                <span className={`text-sm font-semibold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {roi >= 0 ? '+' : ''}{roi.toFixed(2)}% ROI
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-xl ${totalProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              {totalProfit >= 0 ? <ArrowUpRight className="h-6 w-6 text-green-600" /> : <ArrowDownRight className="h-6 w-6 text-red-600" />}
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Liquidités</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {portfolio.cash_balance.toLocaleString()} TND
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {actualCashPercent.toFixed(1)}% du portefeuille
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Positions</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{positions.length}</p>
              <p className="text-xs text-slate-500 mt-2">
                {Object.keys(sectorAllocation).length} secteurs
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Anomaly Alerts Banner ────────────────────────────────── */}
      {portfolioAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-900">Alertes sur vos positions ({portfolioAlerts.length})</h3>
          </div>
          <div className="space-y-2">
            {portfolioAlerts.map((alert, i) => (
              <div
                key={i}
                onClick={() => handleInvestigateAlert(alert)}
                className="flex items-start gap-3 p-3 bg-white/70 rounded-lg border border-red-100 cursor-pointer hover:bg-red-50 hover:shadow transition-all group"
                title="Cliquer pour analyser cette alerte"
              >
                <Zap className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                  alert.severity === 'CRITICAL' ? 'text-red-600' : alert.severity === 'WARNING' ? 'text-orange-500' : 'text-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">{alert.valeur}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {alert.anomaly_type?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{alert.message}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-slate-400">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date(alert.timestamp).toLocaleString('fr-FR')}
                    </p>
                    <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <Search className="h-3 w-3" /> Investiguer
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Decision History ─────────────────────────────────────── */}
      {decisions.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-slate-900">Historique des Décisions ({decisions.length})</h3>
            </div>
            <button
              onClick={() => setShowDecisionHistory(!showDecisionHistory)}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              {showDecisionHistory ? 'Réduire' : 'Voir tout'}
            </button>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total', value: decisions.length, color: 'text-slate-700', bg: 'bg-slate-50' },
              { label: 'Achat', value: decisions.filter(d => d.decision === 'buy').length, color: 'text-green-700', bg: 'bg-green-50' },
              { label: 'Attente', value: decisions.filter(d => d.decision === 'wait').length, color: 'text-amber-700', bg: 'bg-amber-50' },
              { label: 'Évité', value: decisions.filter(d => d.decision === 'sell').length, color: 'text-red-700', bg: 'bg-red-50' },
            ].map(stat => (
              <div key={stat.label} className={`${stat.bg} rounded-lg p-2.5 text-center`}>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Recent / All decisions */}
          <div className="space-y-2">
            {(showDecisionHistory ? decisions : decisions.slice(0, 3)).map(dec => (
              <div key={dec.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                {dec.decision === 'buy' ? (
                  <ThumbsUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : dec.decision === 'wait' ? (
                  <Timer className="h-4 w-4 text-amber-600 flex-shrink-0" />
                ) : (
                  <ThumbsDown className="h-4 w-4 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">{dec.symbol}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      dec.decision === 'buy' ? 'bg-green-100 text-green-700' :
                      dec.decision === 'wait' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {dec.decision === 'buy' ? 'Acheté' : dec.decision === 'wait' ? 'En attente' : 'Évité'}
                    </span>
                    {dec.outcome && dec.outcome !== 'pending' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        dec.outcome === 'profit' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {dec.outcomePercent !== undefined ? `${dec.outcomePercent > 0 ? '+' : ''}${dec.outcomePercent}%` : dec.outcome}
                      </span>
                    )}
                  </div>
                  {dec.reasoning && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{dec.reasoning}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span>Prix: {dec.priceAtDecision?.toFixed(2)} TND</span>
                    {dec.priceNow && <span>→ {dec.priceNow.toFixed(2)} TND</span>}
                    {dec.sentimentScore !== undefined && (
                      <span>Sentiment: {dec.sentimentScore > 0 ? '+' : ''}{dec.sentimentScore.toFixed(2)}</span>
                    )}
                    <span>{new Date(dec.decisionDate).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
                {dec.decision === 'wait' && dec.outcome === 'pending' && (
                  <button
                    onClick={() => {
                      const stock = AVAILABLE_STOCKS.find(s => s.symbol === dec.symbol);
                      if (stock) setTradeModal({ type: 'buy', stock });
                    }}
                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                  >
                    <ArrowUpRight className="h-3 w-3" /> Entrer position
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Allocation Comparison + Performance Chart ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Allocation Comparison */}
        <Card title="Allocation du Portefeuille" subtitle="Cible vs Actuelle" className="lg:col-span-1">
          <div className="space-y-6">
            {/* Target donut */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Target className="h-3 w-3" /> Cible ({targetAllocation.label})
              </p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={targetDonutData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                      {targetDonutData.map((_, i) => (
                        <Cell key={i} fill={donutColors[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => (
                        <span className="text-xs text-slate-600">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Actual donut */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Eye className="h-3 w-3" /> Actuelle
              </p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={actualDonutData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                      {actualDonutData.map((_, i) => (
                        <Cell key={i} fill={donutColors[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => (
                        <span className="text-xs text-slate-600">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gap analysis */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1 mb-1">
                <Info className="h-3 w-3" /> Écart d&apos;allocation
              </p>
              <p className="text-xs text-amber-700">
                {actualDonutData[1].value === 0
                  ? 'Vous n\'avez pas d\'obligations. Envisagez d\'en ajouter pour réduire la volatilité.'
                  : 'Bonne diversification entre classes d\'actifs.'}
              </p>
            </div>
          </div>
        </Card>

        {/* Performance Chart */}
        <Card title="Évolution du Portefeuille" subtitle="30 derniers jours" className="lg:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <defs>
                  <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} interval="preserveStartEnd" />
                <YAxis
                  domain={['dataMin - 1000', 'dataMax + 1000']}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => [`${v.toLocaleString()} TND`, 'Valeur']}
                  labelStyle={{ color: '#1e293b', fontWeight: 600 }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} fill="url(#perfGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Performance metrics */}
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">ROI Total</p>
              <p className={`text-sm font-bold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Meilleur Jour</p>
              <p className="text-sm font-bold text-green-600">+{(Math.random() * 2 + 0.5).toFixed(1)}%</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Sharpe Ratio</p>
              <p className="text-sm font-bold text-slate-900">{(0.8 + Math.random() * 0.7).toFixed(2)}</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Max Drawdown</p>
              <p className="text-sm font-bold text-red-600">-{(2 + Math.random() * 3).toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Sector Allocation Bars ───────────────────────────────── */}
      <Card title="Répartition Sectorielle" subtitle={`${Object.keys(sectorAllocation).length} secteurs`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(sectorAllocation)
            .sort(([, a], [, b]) => b - a)
            .map(([sector, value], index) => {
              const pct = totalInvested > 0 ? (value / totalInvested) * 100 : 0;
              return (
                <div key={sector} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{sector}</span>
                    <span className="text-sm font-bold text-slate-900">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{value.toLocaleString()} TND</p>
                </div>
              );
            })}
        </div>
      </Card>

      {/* ── Tabs: Positions / Quick Trade ─────────────────────────── */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('positions')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'positions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Eye className="h-4 w-4 inline mr-1.5" />
          Positions ({positions.length})
        </button>
        <button
          onClick={() => setActiveTab('trade')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'trade' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <ShoppingCart className="h-4 w-4 inline mr-1.5" />
          Acheter une action
        </button>
      </div>

      {/* ── Positions Table with Expandable Detail ───────────────── */}
      {activeTab === 'positions' && (
        <Card
          title="Positions Actuelles"
          subtitle={`${positions.length} valeurs \u2022 Cliquez pour voir l'analyse détaillée`}
          headerAction={
            <button
              onClick={() => setShowTransactions(!showTransactions)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <History className="h-4 w-4" />
              {showTransactions ? 'Masquer historique' : 'Historique'}
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valeur</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qté</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">P. Moyen</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">P. Actuel</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valeur</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">P/L</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => {
                  const isExpanded = expandedPosition === position.id;
                  const detail = stockDetailsCache[position.stocks.symbol];
                  const rec = detail && !detail.loading ? getRecommendation(detail.forecast, detail.sentiment) : null;

                  return (
                    <RowGroup key={position.id}>
                      {/* Main row */}
                      <tr
                        className={`border-b transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50 border-blue-200' : 'border-slate-100 hover:bg-slate-50'}`}
                        onClick={() => handleExpandPosition(position.id, position.stocks.symbol)}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-blue-600" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                            <div>
                              <p className="font-semibold text-slate-900">{position.stocks.symbol}</p>
                              <p className="text-xs text-slate-500">{position.stocks.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-medium">{position.quantity.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right font-medium">{position.average_buy_price.toFixed(2)}</td>
                        <td className="py-4 px-4 text-right font-medium">{position.current_price.toFixed(2)}</td>
                        <td className="py-4 px-4 text-right font-semibold">{position.total_value.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right">
                          <p className={`font-semibold ${position.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {position.profit_loss >= 0 ? '+' : ''}{position.profit_loss.toFixed(0)} TND
                          </p>
                          <p className={`text-xs font-medium ${position.profit_loss_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {position.profit_loss_percent >= 0 ? '+' : ''}{position.profit_loss_percent.toFixed(2)}%
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => openTradeWithExplanation('buy', { symbol: position.stocks.symbol, name: position.stocks.name, price: position.current_price })}
                              className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                            >
                              Acheter
                            </button>
                            <button
                              onClick={() => openTradeWithExplanation('sell', { symbol: position.stocks.symbol, name: position.stocks.name, price: position.current_price })}
                              className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                            >
                              Vendre
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 px-6 py-5">
                              {detail?.loading ? (
                                <div className="flex items-center justify-center py-8 gap-2 text-blue-600">
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                  <span className="text-sm">Chargement de l&apos;analyse...</span>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                  {/* Forecast */}
                                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                      <TrendingUp className="h-4 w-4 text-blue-600" />
                                      <h4 className="font-semibold text-sm text-slate-900">Prévision 5 jours</h4>
                                    </div>
                                    {detail?.forecast?.price?.forecasts?.length ? (
                                      <>
                                        {detail.forecast.price.forecasts.map((f, i) => {
                                          const diff = ((f.predicted_close - position.current_price) / position.current_price * 100);
                                          return (
                                            <div key={i} className="flex justify-between items-center py-1 text-xs">
                                              <span className="text-slate-500">{new Date(f.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' })}</span>
                                              <span className="font-medium">{f.predicted_close.toFixed(2)} TND</span>
                                              <span className={`font-semibold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                                              </span>
                                            </div>
                                          );
                                        })}
                                        {detail.forecast.liquidity && (
                                          <div className="mt-3 pt-3 border-t border-slate-100">
                                            <p className="text-xs text-slate-500">
                                              Liquidité: <span className={`font-semibold ${detail.forecast.liquidity.classification === 'High' ? 'text-green-600' : 'text-red-600'}`}>
                                                {detail.forecast.liquidity.classification === 'High' ? 'Élevée' : 'Faible'}
                                              </span>
                                            </p>
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <p className="text-xs text-slate-500 italic">Prévisions non disponibles. Vérifiez que le backend est actif.</p>
                                    )}
                                  </div>

                                  {/* Sentiment */}
                                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Sparkles className="h-4 w-4 text-indigo-600" />
                                      <h4 className="font-semibold text-sm text-slate-900">Sentiment</h4>
                                    </div>
                                    {detail?.sentiment ? (
                                      <>
                                        <div className="flex items-center gap-3 mb-3">
                                          <div className={`text-2xl font-bold ${
                                            detail.sentiment.overall_score > 0.2 ? 'text-green-600' :
                                            detail.sentiment.overall_score < -0.2 ? 'text-red-600' : 'text-amber-600'
                                          }`}>
                                            {(detail.sentiment.overall_score * 100).toFixed(0)}%
                                          </div>
                                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                            detail.sentiment.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                                            detail.sentiment.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                                            'bg-amber-100 text-amber-700'
                                          }`}>
                                            {detail.sentiment.sentiment === 'positive' ? 'Positif' :
                                             detail.sentiment.sentiment === 'negative' ? 'Négatif' : 'Neutre'}
                                          </span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                                          {detail.sentiment.overall_explanation || 'Analyse basée sur les actualités récentes.'}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-2">
                                          {detail.sentiment.articles_analyzed} articles analysés
                                        </p>
                                      </>
                                    ) : (
                                      <p className="text-xs text-slate-500 italic">Sentiment non disponible.</p>
                                    )}
                                  </div>

                                  {/* Recommendation + Actions */}
                                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Target className="h-4 w-4 text-purple-600" />
                                      <h4 className="font-semibold text-sm text-slate-900">Recommandation</h4>
                                    </div>

                                    {rec ? (
                                      <>
                                        <div className="mb-3">
                                          <span className={`text-lg font-bold px-3 py-1.5 rounded-lg ${rec.color}`}>
                                            {rec.recommendation}
                                          </span>
                                        </div>
                                        <ul className="text-xs text-slate-600 space-y-1 mb-4">
                                          {rec.reasons.slice(0, 3).map((r, i) => (
                                            <li key={i} className="flex items-start gap-1">
                                              <CheckCircle className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                                              <span className="line-clamp-2">{r}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </>
                                    ) : (
                                      <p className="text-xs text-slate-500 italic mb-4">Chargement...</p>
                                    )}

                                    {/* Pourquoi? + Actions */}
                                    <div className="space-y-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setChatFocusStock(position.stocks.symbol + '-' + Date.now());
                                        }}
                                        className="w-full py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                                      >
                                        <HelpCircle className="h-3.5 w-3.5" />
                                        Pourquoi ? Demander à l&apos;IA
                                      </button>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openTradeWithExplanation('buy', { symbol: position.stocks.symbol, name: position.stocks.name, price: position.current_price });
                                          }}
                                          className="flex-1 py-2 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                        >
                                          Acheter +
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openTradeWithExplanation('sell', { symbol: position.stocks.symbol, name: position.stocks.name, price: position.current_price });
                                          }}
                                          className="flex-1 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                        >
                                          Vendre
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </RowGroup>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Quick Buy Tab ────────────────────────────────────────── */}
      {activeTab === 'trade' && (
        <Card title="Acheter une Action" subtitle={`Liquidités disponibles: ${portfolio.cash_balance.toLocaleString()} TND`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {AVAILABLE_STOCKS.map(stock => {
              const held = positions.find(p => p.stocks.symbol === stock.symbol);
              return (
                <div
                  key={stock.symbol}
                  className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => openTradeWithExplanation('buy', stock)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{stock.symbol}</p>
                      <p className="text-xs text-slate-500 line-clamp-1">{stock.name}</p>
                    </div>
                    {held && (
                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                        Détenu
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-lg font-bold text-slate-900">{stock.price.toFixed(2)} TND</p>
                      <p className="text-xs text-slate-400">{stock.sector}</p>
                    </div>
                    <span className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      Acheter
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Transaction History (toggle) ──────────────────────────── */}
      {showTransactions && (
        <Card
          title="Historique des Transactions"
          subtitle={`${transactions.length} opérations`}
          headerAction={
            <button onClick={() => setShowTransactions(false)} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Valeur</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Qté</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Prix</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Total</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-600">{tx.date}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        tx.type === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {tx.type === 'buy' ? 'ACHAT' : 'VENTE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{tx.symbol}</td>
                    <td className="py-3 px-4 text-right text-sm">{tx.quantity.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-sm">{tx.price.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-semibold">{tx.total.toLocaleString()} TND</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        tx.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {tx.status === 'completed' ? '\u2713 Exécuté' : '\u23F3 En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Chat AI Suggestions (from conversations) ───────────── */}
      {chatSuggestions.length > 0 && (
        <Card
          title="Suggestions de l'Assistant IA"
          subtitle={`${chatSuggestions.length} suggestion${chatSuggestions.length > 1 ? 's' : ''} issues de vos conversations`}
          headerAction={
            <button
              onClick={() => setChatSuggestions([])}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" />
              Effacer
            </button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {chatSuggestions.map(sug => {
              const actionConfig = {
                buy: { label: 'ACHETER', bg: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', icon: <ArrowUpRight className="h-4 w-4 text-green-600" /> },
                sell: { label: 'VENDRE', bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', icon: <ArrowDownRight className="h-4 w-4 text-red-600" /> },
                hold: { label: 'CONSERVER', bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700', icon: <Activity className="h-4 w-4 text-amber-600" /> },
              }[sug.action];
              const stockInfo = AVAILABLE_STOCKS.find(s => s.symbol === sug.symbol);
              return (
                <div key={sug.id} className={`p-4 rounded-xl border ${actionConfig.bg} flex flex-col gap-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {actionConfig.icon}
                      <span className="font-bold text-slate-900">{sug.symbol}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${actionConfig.badge}`}>
                      {actionConfig.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{sug.reason}</p>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-200/50">
                    <span className="text-[10px] text-slate-400">
                      {new Date(sug.timestamp).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                    </span>
                    {stockInfo && sug.action === 'buy' && (
                      <button
                        onClick={() => openTradeWithExplanation('buy', stockInfo)}
                        className="text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 px-2.5 py-1 rounded-md transition-colors"
                      >
                        Acheter
                      </button>
                    )}
                    {stockInfo && sug.action === 'sell' && positions.some(p => p.stocks.symbol === sug.symbol) && (
                      <button
                        onClick={() => openTradeWithExplanation('sell', stockInfo)}
                        className="text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 px-2.5 py-1 rounded-md transition-colors"
                      >
                        Vendre
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Smart Recommendations ────────────────────────────────── */}
      <Card title="Recommandations Intelligentes" subtitle="Basées sur votre profil et le marché">
        <div className="space-y-3">
          {/* Dynamic recommendation based on profile */}
          <div className={`p-4 ${profileColors.bg} border-l-4 ${profileColors.border} rounded-lg`}>
            <p className={`font-semibold ${profileColors.text} mb-1 flex items-center gap-1`}>
              <Shield className="h-4 w-4" />
              Profil {targetAllocation.label}
            </p>
            <p className={`text-sm ${profileColors.text}`}>
              {investorProfile === 'conservative'
                ? 'Priorisez les valeurs stables et les obligations. Gardez 30% en liquidité pour limiter le risque.'
                : investorProfile === 'moderate'
                ? `Allocation recommandée: ${targetAllocation.stocks}% actions stables, ${targetAllocation.bonds}% obligations, ${targetAllocation.cash}% liquidité. Bon équilibre rendement/risque.`
                : 'Maximisez l\'exposition aux actions à forte croissance. Limitez la liquidité à 10% pour optimiser le rendement.'}
            </p>
          </div>

          {/* Diversification */}
          <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
            <p className="font-semibold text-blue-900 mb-1 flex items-center gap-1">
              <PieChartIcon className="h-4 w-4" />
              Diversification
            </p>
            <p className="text-sm text-blue-700">
              {Object.keys(sectorAllocation).length >= 4
                ? `Bonne diversification avec ${Object.keys(sectorAllocation).length} secteurs. ${
                    actualDonutData[1].value === 0
                    ? 'Ajoutez des obligations pour renforcer la stabilité.'
                    : 'Continuez sur cette stratégie.'}`
                : `Seulement ${Object.keys(sectorAllocation).length} secteurs. Diversifiez vers d'autres industries pour réduire le risque.`}
            </p>
          </div>

          {/* Performance */}
          <div className={`p-4 ${roi >= 0 ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'} border-l-4 rounded-lg`}>
            <p className={`font-semibold ${roi >= 0 ? 'text-green-900' : 'text-red-900'} mb-1 flex items-center gap-1`}>
              <TrendingUp className="h-4 w-4" />
              Performance
            </p>
            <p className={`text-sm ${roi >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {roi >= 5
                ? `Excellent ROI de ${roi.toFixed(2)}% ! Votre stratégie surperforme le TUNINDEX. Envisagez de prendre des bénéfices sur les positions les plus performantes.`
                : roi >= 0
                ? `ROI positif de ${roi.toFixed(2)}%. Bonne performance, continuez votre stratégie.`
                : `ROI négatif de ${roi.toFixed(2)}%. Revoyez vos positions et considérez un rééquilibrage.`}
            </p>
          </div>

          {/* Rebalancing alert */}
          {positions.some(p => totalInvested > 0 && (p.total_value / totalInvested) * 100 > 30) && (
            <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
              <p className="font-semibold text-amber-900 mb-1 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Rééquilibrage suggéré
              </p>
              <p className="text-sm text-amber-700">
                {positions.filter(p => totalInvested > 0 && (p.total_value / totalInvested) * 100 > 30).map(p => p.stocks.symbol).join(', ')} représente{positions.filter(p => totalInvested > 0 && (p.total_value / totalInvested) * 100 > 30).length > 1 ? 'nt' : ''} plus de 30% de votre portefeuille.
                Rééquilibrez pour limiter le risque de concentration.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* ── AI Chatbot ───────────────────────────────────────────── */}
      <div ref={chatRef}>
        <ChatBot
          investorName={investorName}
          investorProfile={targetAllocation.label}
          investmentAmount={investmentAmount}
          focusStock={chatFocusStock}
          onSuggestion={handleChatSuggestions}
          resetKey={chatResetKey}
        />
      </div>
    </div>
  );
}

/** Fragment wrapper for adjacent table rows (row + expanded detail) */
function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
