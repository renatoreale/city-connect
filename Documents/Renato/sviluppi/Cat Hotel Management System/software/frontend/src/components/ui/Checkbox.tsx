import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  error?: string;
}

export function Checkbox({ label, description, error, className = '', ...props }: CheckboxProps) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer group ${className}`}>
      <input
        type="checkbox"
        {...props}
        className="mt-0.5 w-4 h-4 rounded border-sage-300 text-sage-500 focus:ring-sage-400 cursor-pointer"
      />
      <div>
        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
          {label}
        </span>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      </div>
    </label>
  );
}
