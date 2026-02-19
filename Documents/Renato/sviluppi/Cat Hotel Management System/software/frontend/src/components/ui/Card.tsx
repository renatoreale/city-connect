import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  padding?: boolean;
}

export function Card({
  children,
  className = '',
  title,
  subtitle,
  actions,
  padding = true,
}: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-sage-200 shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-sage-100">
          <div>
            {title && <h3 className="text-sm font-semibold text-gray-800">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padding ? 'p-5' : ''}>{children}</div>
    </div>
  );
}
