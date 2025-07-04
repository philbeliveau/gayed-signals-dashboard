'use client';

import React from 'react';
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

export interface ErrorAlertProps {
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  onDismiss?: () => void;
  autoDismiss?: boolean;
  autoDismissTime?: number;
  className?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  message,
  type = 'error',
  onDismiss,
  autoDismiss = false,
  autoDismissTime = 5000,
  className = ''
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (autoDismiss && autoDismissTime > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onDismiss) {
          onDismiss();
        }
      }, autoDismissTime);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, autoDismissTime, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible) return null;

  const typeStyles = {
    error: {
      container: 'bg-theme-danger-bg border-theme-danger-border',
      text: 'text-theme-danger',
      icon: AlertTriangle
    },
    warning: {
      container: 'bg-theme-warning-bg border-theme-warning-border',
      text: 'text-theme-warning',
      icon: AlertTriangle
    },
    info: {
      container: 'bg-theme-info-bg border-theme-info-border',
      text: 'text-theme-info',
      icon: Info
    },
    success: {
      container: 'bg-theme-success-bg border-theme-success-border',
      text: 'text-theme-success',
      icon: CheckCircle
    }
  };

  const style = typeStyles[type];
  const IconComponent = style.icon;

  return (
    <div 
      className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 ${style.container} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <IconComponent className={`w-5 h-5 ${style.text} mt-0.5 flex-shrink-0`} />
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${style.text} font-medium`}>
          {message}
        </p>
      </div>
      
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className={`flex-shrink-0 p-1 rounded-md hover:bg-black/5 transition-colors ${style.text}`}
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default ErrorAlert;