import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}

export default function Card({ title, subtitle, children, className = '', headerAction }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden ${className}`}>
      {(title || headerAction) && (
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
