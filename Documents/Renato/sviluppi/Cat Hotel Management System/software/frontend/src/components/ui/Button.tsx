import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-sage-500 text-white hover:bg-sage-600 focus:ring-sage-400 disabled:bg-sage-300',
  secondary:
    'bg-sage-100 text-sage-700 hover:bg-sage-200 focus:ring-sage-300 disabled:bg-sage-50 disabled:text-sage-300',
  danger:
    'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400 disabled:bg-red-300',
  ghost:
    'bg-transparent text-sage-700 hover:bg-sage-100 focus:ring-sage-300',
  outline:
    'bg-white border border-sage-300 text-sage-700 hover:bg-sage-50 focus:ring-sage-300 disabled:opacity-50',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg
        focus:outline-none focus:ring-2 focus:ring-offset-1
        transition-colors duration-150 cursor-pointer
        disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
