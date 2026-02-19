import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        {...props}
        className={`
          w-full px-3 py-2 text-sm rounded-lg border bg-white resize-y min-h-[80px]
          placeholder:text-gray-400
          focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent
          disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
          transition-colors duration-150
          ${error ? 'border-red-400 focus:ring-red-300' : 'border-sage-200 hover:border-sage-300'}
          ${className}
        `}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
