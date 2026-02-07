import { useEffect, useState } from 'react';
import Card from '../components/Card';
import { AlertTriangle, Filter, Activity, Shield, TrendingUp, BarChart3 } from 'lucide-react';
import { getAnomalies } from '../lib/api';

interface Anomaly {
  id: string;
  anomaly_type: string;
  severity: string;
  description: string;
  detected_value: number;
  expected_value: number;
  deviation: number;
  detected_at: string;
  resolved: boolean;
  stocks: {
    symbol: string;
    name: string;
  };
}

export default function Surveillance() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [filteredAnomalies, setFilteredAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [unresolvedData, resolvedData] = await Promise.all([
          getAnomalies(false, 100),
          getAnomalies(true, 50),
        ]);
        const allAnomalies = [...unresolvedData, ...resolvedData];
        setAnomalies(allAnomalies);
        setFilteredAnomalies(unresolvedData);
      } catch (error) {
        console.error('Error fetching anomalies:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    let filtered = anomalies.filter((a) => showResolved ? true : !a.resolved);

    if (selectedType !== 'all') {
      filtered = filtered.filter((a) => a.anomaly_type === selectedType);
    }

    if (selectedSeverity !== 'all') {
      filtered = filtered.filter((a) => a.severity === selectedSeverity);
    }

    setFilteredAnomalies(filtered);
  }, [anomalies, selectedType, selectedSeverity, showResolved]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'volume_spike':
        return <BarChart3 className="h-5 w-5" />;
      case 'price_jump':
        return <TrendingUp className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'volume_spike':
        return 'Pic de Volume';
      case 'price_jump':
        return 'Saut de Prix';
      case 'suspicious_pattern':
        return 'Pattern Suspect';
      default:
        return type;
    }
  };

  const criticalCount = anomalies.filter((a) => a.severity === 'critical' && !a.resolved).length;
  const highCount = anomalies.filter((a) => a.severity === 'high' && !a.resolved).length;
  const unresolvedCount = anomalies.filter((a) => !a.resolved).length;

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
        <h1 className="text-3xl font-bold text-slate-900">Surveillance & Alertes</h1>
        <p className="text-slate-600 mt-2">Détection d'anomalies en temps réel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Alertes Actives</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{unresolvedCount}</p>
              <p className="text-xs text-slate-500 mt-2">Non résolues</p>
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
              <p className="text-xs text-slate-500 mt-2">Nécessitent attention immédiate</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Haute Priorité</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{highCount}</p>
              <p className="text-xs text-slate-500 mt-2">À surveiller de près</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Taux de Résolution</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {((anomalies.filter((a) => a.resolved).length / anomalies.length) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {anomalies.filter((a) => a.resolved).length} résolues
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card
        title="Filtres"
        headerAction={
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-500">
              {filteredAnomalies.length} résultat(s)
            </span>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Type d'Anomalie</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">Tous les types</option>
              <option value="volume_spike">Pic de Volume</option>
              <option value="price_jump">Saut de Prix</option>
              <option value="suspicious_pattern">Pattern Suspect</option>
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
              <option value="critical">Critique</option>
              <option value="high">Haute</option>
              <option value="medium">Moyenne</option>
              <option value="low">Faible</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Statut</label>
            <label className="flex items-center px-4 py-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-slate-700">Afficher les résolues</span>
            </label>
          </div>
        </div>
      </Card>

      <Card title="Feed d'Alertes" subtitle="Temps réel">
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {filteredAnomalies.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Aucune anomalie détectée</p>
              <p className="text-sm text-slate-400 mt-2">Le marché fonctionne normalement</p>
            </div>
          ) : (
            filteredAnomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className={`p-5 rounded-xl border-2 ${getSeverityColor(anomaly.severity)} ${
                  anomaly.resolved ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`p-3 rounded-lg ${anomaly.resolved ? 'bg-slate-100' : 'bg-white bg-opacity-50'}`}>
                      {getTypeIcon(anomaly.anomaly_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-bold text-lg">{anomaly.stocks.symbol}</span>
                        <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded font-semibold">
                          {getTypeLabel(anomaly.anomaly_type)}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${getSeverityBadgeColor(anomaly.severity)}`} />
                        <span className="text-xs font-semibold uppercase">
                          {anomaly.severity}
                        </span>
                        {anomaly.resolved && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-semibold">
                            RÉSOLUE
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium mb-3">{anomaly.description}</p>
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <p className="text-slate-600 mb-1">Valeur Détectée</p>
                          <p className="font-bold">{anomaly.detected_value.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-slate-600 mb-1">Valeur Attendue</p>
                          <p className="font-bold">{anomaly.expected_value.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-slate-600 mb-1">Déviation</p>
                          <p className="font-bold">{anomaly.deviation.toFixed(2)}σ</p>
                        </div>
                      </div>
                      <p className="text-xs mt-3 opacity-75">
                        Détecté le {new Date(anomaly.detected_at).toLocaleString('fr-FR', {
                          dateStyle: 'long',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  </div>
                  <AlertTriangle className="h-6 w-6 ml-4" />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card title="Statistiques de Détection" subtitle="Dernières 24 heures">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-2">Pics de Volume</p>
            <p className="text-3xl font-bold text-slate-900">
              {anomalies.filter((a) => a.anomaly_type === 'volume_spike' && !a.resolved).length}
            </p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-2">Sauts de Prix</p>
            <p className="text-3xl font-bold text-slate-900">
              {anomalies.filter((a) => a.anomaly_type === 'price_jump' && !a.resolved).length}
            </p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-2">Patterns Suspects</p>
            <p className="text-3xl font-bold text-slate-900">
              {anomalies.filter((a) => a.anomaly_type === 'suspicious_pattern' && !a.resolved).length}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
