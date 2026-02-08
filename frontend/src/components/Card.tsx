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
    <div
      className={`rounded-xl overflow-hidden ${className}`}
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)',
      }}
    >
      {(title || headerAction) && (
        <div
          className="px-6 py-4 flex justify-between items-center"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            {title && (
              <h3 className="text-lg font-semibold" style={{ color: 'var(--content)' }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm mt-1" style={{ color: 'var(--content-tertiary)' }}>
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
