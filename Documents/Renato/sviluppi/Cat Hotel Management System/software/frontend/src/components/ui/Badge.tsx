type BadgeVariant = 'sage' | 'red' | 'orange' | 'blue' | 'gray' | 'yellow';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  sage:   'bg-sage-100 text-sage-700 border border-sage-200',
  red:    'bg-red-100 text-red-700 border border-red-200',
  orange: 'bg-orange-100 text-orange-700 border border-orange-200',
  blue:   'bg-blue-100 text-blue-700 border border-blue-200',
  gray:   'bg-gray-100 text-gray-600 border border-gray-200',
  yellow: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
};

export function Badge({ variant = 'sage', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
