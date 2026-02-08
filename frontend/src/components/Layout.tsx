import { ReactNode } from 'react';
import { LayoutDashboard, TrendingUp, Wallet, AlertTriangle, Activity } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--surface-secondary)' }}>
      {/* Navigation */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--surface) 85%, transparent)',
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          borderColor: 'var(--border-subtle)',
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-content)' }}
              >
                <Activity className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold" style={{ color: 'var(--content)' }}>
                BVMT
              </span>
              <span
                className="hidden sm:inline text-xs font-medium px-2 py-1 rounded-md"
                style={{
                  backgroundColor: 'var(--surface-tertiary)',
                  color: 'var(--content-tertiary)',
                }}
              >
                Trading Assistant
              </span>
            </div>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`nav-link flex items-center gap-2 ${isActive ? 'nav-link-active' : ''}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <ThemeToggle />

              {/* Mobile nav — simplified inline */}
              <div className="md:hidden flex items-center gap-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`btn-icon btn-ghost ${isActive ? 'nav-link-active' : ''}`}
                      title={item.name}
                      aria-label={item.name}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer
        className="border-t mt-16"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p
            className="text-center text-sm"
            style={{ color: 'var(--content-tertiary)' }}
          >
            Système d'Assistant Intelligent de Trading BVMT — IHEC CodeLab 2.0
          </p>
        </div>
      </footer>
    </div>
  );
}
