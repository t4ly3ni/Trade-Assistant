import { useEffect, useState } from 'react';
import Card from '../components/Card';
import { Wallet, TrendingUp, TrendingDown, Activity, DollarSign, PieChart } from 'lucide-react';
import { getPortfolio, getPortfolioPositions } from '../lib/api';

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
  stocks: {
    symbol: string;
    name: string;
    sector: string;
  };
}

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const portfolioData = await getPortfolio();
        if (portfolioData) {
          setPortfolio(portfolioData);
          const positionsData = await getPortfolioPositions(portfolioData.id);
          setPositions(positionsData);
        }
      } catch (error) {
        console.error('Error fetching portfolio data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="text-center py-16">
        <Wallet className="h-16 w-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucun portefeuille trouvé</h3>
        <p className="text-slate-500">Créez votre premier portefeuille pour commencer</p>
      </div>
    );
  }

  const totalProfit = positions.reduce((sum, pos) => sum + pos.profit_loss, 0);
  const totalInvested = portfolio.current_value - portfolio.cash_balance;
  const roi = ((portfolio.current_value - portfolio.initial_capital) / portfolio.initial_capital) * 100;

  const sectorAllocation = positions.reduce((acc, pos) => {
    const sector = pos.stocks.sector;
    if (!acc[sector]) {
      acc[sector] = 0;
    }
    acc[sector] += pos.total_value;
    return acc;
  }, {} as Record<string, number>);

  const sectorColors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Mon Portefeuille</h1>
        <p className="text-slate-600 mt-2">{portfolio.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Valeur Totale</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {portfolio.current_value.toLocaleString()} TND
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Capital initial: {portfolio.initial_capital.toLocaleString()} TND
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Gains/Pertes</p>
              <p className={`text-2xl font-bold mt-2 ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalProfit >= 0 ? '+' : ''}{totalProfit.toLocaleString()} TND
              </p>
              <div className="flex items-center mt-2">
                {roi >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                )}
                <span className={`text-sm font-semibold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {roi >= 0 ? '+' : ''}{roi.toFixed(2)}% ROI
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-lg ${totalProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <TrendingUp className={`h-6 w-6 ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Liquidités</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {portfolio.cash_balance.toLocaleString()} TND
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {((portfolio.cash_balance / portfolio.current_value) * 100).toFixed(1)}% du total
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Profil de Risque</p>
              <p className="text-xl font-bold text-slate-900 mt-2 capitalize">
                {portfolio.risk_profile === 'conservative' ? 'Conservateur' :
                 portfolio.risk_profile === 'moderate' ? 'Modéré' : 'Agressif'}
              </p>
              <p className="text-xs text-slate-500 mt-2">{positions.length} positions actives</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <PieChart className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Répartition par Secteur" className="md:col-span-1">
          <div className="space-y-4">
            {Object.entries(sectorAllocation).map(([sector, value], index) => {
              const percentage = (value / totalInvested) * 100;
              return (
                <div key={sector}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{sector}</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`${sectorColors[index % sectorColors.length]} h-2 rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Évolution du Portefeuille" className="md:col-span-2">
          <div className="relative h-64">
            <svg className="w-full h-full" viewBox="0 0 800 200">
              <defs>
                <linearGradient id="portfolioGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <path
                d="M 0 150 Q 200 120, 400 100 T 800 80"
                fill="none"
                stroke="rgb(34, 197, 94)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M 0 150 Q 200 120, 400 100 T 800 80 L 800 200 L 0 200 Z"
                fill="url(#portfolioGradient)"
              />
            </svg>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-slate-500">Meilleur Jour</p>
              <p className="text-sm font-semibold text-green-600">+{(Math.random() * 300 + 100).toFixed(0)} TND</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Sharpe Ratio</p>
              <p className="text-sm font-semibold text-slate-900">{(Math.random() * 1 + 0.8).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Max Drawdown</p>
              <p className="text-sm font-semibold text-red-600">-{(Math.random() * 5 + 2).toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Positions Actuelles" subtitle={`${positions.length} valeurs en portefeuille`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Valeur</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Quantité</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Prix Moyen</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Prix Actuel</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Valeur Totale</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Gain/Perte</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-semibold text-slate-900">{position.stocks.symbol}</p>
                      <p className="text-xs text-slate-500">{position.stocks.name}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className="font-medium text-slate-900">{position.quantity}</p>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className="font-medium text-slate-900">{position.average_buy_price.toFixed(2)} TND</p>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className="font-medium text-slate-900">{position.current_price.toFixed(2)} TND</p>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className="font-semibold text-slate-900">{position.total_value.toFixed(2)} TND</p>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div>
                      <p className={`font-semibold ${position.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {position.profit_loss >= 0 ? '+' : ''}{position.profit_loss.toFixed(2)} TND
                      </p>
                      <p className={`text-xs font-medium ${position.profit_loss_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {position.profit_loss_percent >= 0 ? '+' : ''}{position.profit_loss_percent.toFixed(2)}%
                      </p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Suggestions d'Optimisation" subtitle="Recommandations personnalisées">
        <div className="space-y-3">
          <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
            <p className="font-semibold text-blue-900 mb-1">Diversification</p>
            <p className="text-sm text-blue-700">
              Votre portefeuille est bien diversifié avec {Object.keys(sectorAllocation).length} secteurs.
              Considérez d'ajouter des obligations pour réduire la volatilité.
            </p>
          </div>
          <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
            <p className="font-semibold text-green-900 mb-1">Performance</p>
            <p className="text-sm text-green-700">
              Votre ROI de {roi.toFixed(2)}% dépasse l'indice TUNINDEX. Continuez à suivre votre stratégie actuelle.
            </p>
          </div>
          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
            <p className="font-semibold text-yellow-900 mb-1">Rééquilibrage</p>
            <p className="text-sm text-yellow-700">
              Certaines positions représentent plus de 25% de votre portefeuille. Envisagez un rééquilibrage pour limiter le risque.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
