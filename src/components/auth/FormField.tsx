'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  helpText?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required = false,
  helpText,
  children,
  className = ''
}) => {
  const fieldId = React.useId();
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;

  return (
    <div className={`space-y-1 ${className}`}>
      <label 
        htmlFor={fieldId} 
        className="block text-sm font-medium text-theme-text mb-1"
      >
        {label}
        {required && (
          <span className="text-theme-danger ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      
      <div className="relative">
        {React.cloneElement(children as React.ReactElement, {
          id: fieldId,
          'aria-describedby': [
            error ? errorId : null,
            helpText ? helpId : null
          ].filter(Boolean).join(' ') || undefined,
          'aria-invalid': !!error,
          className: `w-full px-3 py-2 border rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-theme-primary ${
            error 
              ? 'border-theme-danger bg-theme-danger-bg' 
              : 'border-theme-border bg-theme-card hover:border-theme-border-hover'
          } text-theme-text placeholder-theme-text-muted`
        })}
        
        {error && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <AlertTriangle className="w-4 h-4 text-theme-danger" />
          </div>
        )}
      </div>
      
      {helpText && !error && (
        <p id={helpId} className="text-xs text-theme-text-muted">
          {helpText}
        </p>
      )}
      
      {error && (
        <p id={errorId} className="text-xs text-theme-danger flex items-center gap-1" role="alert">
          <AlertTriangle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;