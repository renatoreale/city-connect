import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: React.ReactNode;
}

export function Input({ label, error, hint, prefix, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            {prefix}
          </div>
        )}
        <input
          {...props}
          className={`
            w-full py-2 text-sm rounded-lg border bg-white
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent
            disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
            transition-colors duration-150
            ${error ? 'border-red-400 focus:ring-red-300' : 'border-sage-200 hover:border-sage-300'}
            ${prefix ? 'pl-9 pr-3' : 'px-3'}
            ${className}
          `}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
