import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';
import React from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const config: Record<AlertVariant, { icon: React.ElementType; classes: string }> = {
  info:    { icon: Info,          classes: 'bg-blue-50 border-blue-200 text-blue-800' },
  success: { icon: CheckCircle,   classes: 'bg-sage-50 border-sage-200 text-sage-800' },
  warning: { icon: AlertTriangle, classes: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  error:   { icon: XCircle,       classes: 'bg-red-50 border-red-200 text-red-800' },
};

export function Alert({ variant = 'info', title, children, onClose, className = '' }: AlertProps) {
  const { icon: Icon, classes } = config[variant];

  return (
    <div className={`flex gap-3 p-4 rounded-lg border ${classes} ${className}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
