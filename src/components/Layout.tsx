import { ReactNode } from 'react';
import { LayoutDashboard, TrendingUp, Wallet, AlertTriangle, Activity } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const navigation = [
    { name: 'Vue d\'Ensemble', icon: LayoutDashboard, id: 'overview' },
    { name: 'Analyse de Valeur', icon: TrendingUp, id: 'analysis' },
    { name: 'Mon Portefeuille', icon: Wallet, id: 'portfolio' },
    { name: 'Surveillance', icon: AlertTriangle, id: 'surveillance' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600" />
              <span className="ml-3 text-xl font-bold text-slate-900">
                BVMT Assistant
              </span>
              <span className="ml-2 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                Intelligent Trading System
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-slate-500">
            Système d'Assistant Intelligent de Trading BVMT - IHEC CodeLab 2.0
          </p>
        </div>
      </footer>
    </div>
  );
}
