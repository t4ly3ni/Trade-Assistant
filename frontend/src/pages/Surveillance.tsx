import { useEffect, useState, useCallback } from 'react';
import Card from '../components/Card';
import { AlertTriangle, Filter, Activity, Shield, TrendingUp, BarChart3, RefreshCw, Wifi, WifiOff, Radio, RotateCcw } from 'lucide-react';
import { getAnomalyReport, getStreamStatus, getStreamAlerts, resetStream } from '../lib/api';
import type { AnomalyReport, Alert, StreamStatus } from '../lib/types';

export default function Surveillance() {
  const [report, setReport] = useState<AnomalyReport | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [streamAlerts, setStreamAlerts] = useState<AnomalyReport | null>(null);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'snapshot' | 'stream'>('snapshot');

  const fetchData = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      setError(null);
      const [reportData, statusData, streamData] = await Promise.all([
        getAnomalyReport(),
        getStreamStatus().catch(() => null),
        getStreamAlerts().catch(() => null),
      ]);
      setReport(reportData);
      setStreamStatus(statusData);
      setStreamAlerts(streamData);
      setLastUpdate(new Date().toLocaleTimeString('fr-FR'));
    } catch (err) {
      setError("Impossible de se connecter au serveur.");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filter alerts based on selected filters
  useEffect(() => {
    const source = viewMode === 'stream' ? streamAlerts : report;
    if (!source) { setFilteredAlerts([]); return; }

    let alerts = [...source.alerts];
    if (selectedType !== 'all') {
      alerts = alerts.filter(a => a.anomaly_type === selectedType);
    }
    if (selectedSeverity !== 'all') {
      alerts = alerts.filter(a => a.severity === selectedSeverity);
    }
    setFilteredAlerts(alerts);
  }, [report, streamAlerts, selectedType, selectedSeverity, viewMode]);

  const handleReset = async () => {
    try {
      await resetStream();
      fetchData(true);
    } catch (err) {
      console.error('Failed to reset stream:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'WARNING':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'INFO':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500';
      case 'WARNING':
        return 'bg-orange-500';
      case 'INFO':
        return 'bg-blue-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'VOLUME_SPIKE':
        return <BarChart3 className="h-5 w-5" />;
      case 'PRICE_ANOMALY':
      case 'RAPID_PRICE_MOVE':
        return <TrendingUp className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
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

  const activeReport = viewMode === 'stream' ? streamAlerts : report;
  const criticalCount = activeReport?.by_severity?.['CRITICAL'] || 0;
  const warningCount = activeReport?.by_severity?.['WARNING'] || 0;
  const infoCount = activeReport?.by_severity?.['INFO'] || 0;

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
          <h1 className="text-3xl font-bold text-slate-900">Surveillance & Alertes</h1>
          <p className="text-slate-600 mt-2">Détection d'anomalies en temps réel</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center text-xs text-slate-500">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Alertes</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{activeReport?.total_alerts || 0}</p>
              <p className="text-xs text-slate-500 mt-2">{filteredAlerts.length} affichées</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Critiques</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{criticalCount}</p>
              <p className="text-xs text-slate-500 mt-2">Attention immédiate</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Avertissements</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{warningCount}</p>
              <p className="text-xs text-slate-500 mt-2">{infoCount} info</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Moteur Live</p>
              <p className="text-xl font-bold mt-2">
                {streamStatus?.running ? (
                  <span className="text-green-600 flex items-center">
                    <Radio className="h-5 w-5 mr-2 animate-pulse" />Actif
                  </span>
                ) : (
                  <span className="text-slate-400">Inactif</span>
                )}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {streamStatus?.snapshots_ingested || 0} snapshots ingérés
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* View Mode Toggle + Filters */}
      <Card
        title="Filtres"
        headerAction={
          <div className="flex items-center space-x-3">
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('snapshot')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'snapshot' ? 'bg-white shadow text-blue-600 font-semibold' : 'text-slate-600'
                }`}
              >
                Snapshot
              </button>
              <button
                onClick={() => setViewMode('stream')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'stream' ? 'bg-white shadow text-blue-600 font-semibold' : 'text-slate-600'
                }`}
              >
                Stream Live
              </button>
            </div>
            {viewMode === 'stream' && (
              <button
                onClick={handleReset}
                className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Réinitialiser le moteur"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset</span>
              </button>
            )}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-500">
                {filteredAlerts.length} résultat(s)
              </span>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Type d'Anomalie</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">Tous les types</option>
              <option value="VOLUME_SPIKE">Pic de Volume</option>
              <option value="PRICE_ANOMALY">Prix Anormal</option>
              <option value="ORDER_IMBALANCE">Déséquilibre Ordres</option>
              <option value="SPREAD_ANOMALY">Spread Anormal</option>
              <option value="RAPID_PRICE_MOVE">Mouvement Rapide</option>
              <option value="PATTERN_SUSPECT">Pattern Suspect</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Sévérité</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">Toutes les sévérités</option>
              <option value="CRITICAL">Critique</option>
              <option value="WARNING">Avertissement</option>
              <option value="INFO">Information</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Alert Feed */}
      <Card title="Feed d'Alertes" subtitle={viewMode === 'stream' ? 'Moteur live' : 'Analyse snapshot'}>
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Aucune anomalie détectée</p>
              <p className="text-sm text-slate-400 mt-2">Le marché fonctionne normalement</p>
            </div>
          ) : (
            filteredAlerts.map((alert, idx) => (
              <div
                key={`${alert.isin}-${alert.anomaly_type}-${idx}`}
                className={`p-5 rounded-xl border-2 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="p-3 rounded-lg bg-white bg-opacity-50">
                      {getTypeIcon(alert.anomaly_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2 flex-wrap gap-y-1">
                        <span className="font-bold text-lg">{alert.valeur}</span>
                        <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded font-semibold">
                          {getTypeLabel(alert.anomaly_type)}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${getSeverityBadgeColor(alert.severity)}`} />
                        <span className="text-xs font-semibold uppercase">
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-2">{alert.message}</p>
                      {alert.details && (
                        <p className="text-xs opacity-75 mb-2">{alert.details}</p>
                      )}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="opacity-60">Valeur Actuelle</p>
                          <p className="font-bold">{alert.current_value.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="opacity-60">Seuil</p>
                          <p className="font-bold">{alert.threshold.toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="text-xs mt-2 opacity-60 font-mono">{alert.isin}</p>
                    </div>
                  </div>
                  <AlertTriangle className="h-6 w-6 ml-4 flex-shrink-0" />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Detection Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Statistiques par Type" subtitle="Répartition des anomalies">
          <div className="space-y-3">
            {activeReport && Object.keys(activeReport.by_type).length > 0 ? (
              Object.entries(activeReport.by_type)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const total = activeReport.total_alerts || 1;
                  const pct = (count / total) * 100;
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{getTypeLabel(type)}</span>
                        <span className="text-sm font-bold text-slate-900">{count}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-center text-slate-500 py-4">Aucune donnée</p>
            )}
          </div>
        </Card>

        <Card title="Valeurs les Plus Signalées" subtitle="Top 10">
          <div className="space-y-2">
            {activeReport && activeReport.top_flagged.length > 0 ? (
              activeReport.top_flagged.map((item, idx) => (
                <div key={item.valeur} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-slate-400 w-6">{idx + 1}</span>
                    <span className="text-sm font-semibold text-slate-900 truncate max-w-[200px]">
                      {item.valeur}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-orange-600">{item.count} alertes</span>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-500 py-4">Aucune valeur signalée</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
