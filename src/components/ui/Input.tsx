import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  tip?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, tip, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium mb-2 text-gray-200">
          {label}
        </label>
        <input
          ref={ref}
          className={`w-full bg-[var(--input)] border border-border text-white rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:border-primary focus:shadow-[0_0_0_1px_var(--ring)] ${className}`}
          {...props}
        />
        {tip && <p className="text-xs text-muted mt-2">{tip}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
