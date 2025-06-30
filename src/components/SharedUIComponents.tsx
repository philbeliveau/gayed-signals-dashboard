'use client';

import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Activity,
  BarChart3
} from 'lucide-react';

// =============================================================================
// STRESS INDICATOR COMPONENT
// =============================================================================

export interface StressIndicatorProps {
  level: 'low' | 'medium' | 'high';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  label?: string;
  showLabel?: boolean;
}

export const StressIndicator: React.FC<StressIndicatorProps> = ({ 
  level, 
  size = 'md', 
  animated = true,
  label,
  showLabel = false 
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };

  const colorClasses = {
    low: 'bg-theme-success',
    medium: 'bg-theme-warning',
    high: 'bg-theme-danger'
  };

  const levelLabels = {
    low: 'Low Risk',
    medium: 'Medium Risk', 
    high: 'High Risk'
  };

  const displayLabel = label || levelLabels[level];

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`${sizeClasses[size]} ${colorClasses[level]} rounded-full ${animated ? 'animate-pulse' : ''}`}
        title={displayLabel}
        aria-label={`Stress level: ${displayLabel}`}
      />
      {showLabel && (
        <span className="text-sm text-theme-text-muted">{displayLabel}</span>
      )}
    </div>
  );
};

// =============================================================================
// TREND ARROW COMPONENT
// =============================================================================

export interface TrendArrowProps {
  value: number;
  showValue?: boolean;
  prefix?: string;
  suffix?: string;
  invert?: boolean;
  size?: 'sm' | 'md' | 'lg';
  threshold?: number;
}

export const TrendArrow: React.FC<TrendArrowProps> = ({ 
  value, 
  showValue = true, 
  prefix = '', 
  suffix = '%',
  invert = false,
  size = 'md',
  threshold = 0
}) => {
  const actualValue = invert ? -value : value;
  const isPositive = actualValue > threshold;
  const isNeutral = Math.abs(actualValue) <= threshold;

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const colorClass = isNeutral 
    ? 'text-theme-text-muted' 
    : isPositive 
      ? 'text-theme-success' 
      : 'text-theme-danger';

  const IconComponent = isNeutral ? null : isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className={`flex items-center gap-1 ${colorClass}`}>
      {IconComponent && <IconComponent className={sizeClasses[size]} />}
      {showValue && (
        <span className={`font-medium ${textSizeClasses[size]}`}>
          {prefix}{Math.abs(value).toFixed(value < 10 ? 1 : 0)}{suffix}
        </span>
      )}
    </div>
  );
};

// =============================================================================
// DATA CARD COMPONENT
// =============================================================================

export interface DataCardProps {
  title: string;
  value: string | number;
  change?: number;
  subtitle?: string;
  icon?: React.ReactNode;
  status?: 'normal' | 'warning' | 'critical';
  loading?: boolean;
  invertTrend?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const DataCard: React.FC<DataCardProps> = ({ 
  title, 
  value, 
  change, 
  subtitle, 
  icon, 
  status = 'normal', 
  loading = false, 
  invertTrend = false,
  size = 'md',
  onClick
}) => {
  const statusColors = {
    normal: 'border-theme-border bg-theme-card',
    warning: 'border-theme-warning-border bg-theme-warning-bg',
    critical: 'border-theme-danger-border bg-theme-danger-bg'
  };

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const titleSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const valueSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl', 
    lg: 'text-3xl'
  };

  if (loading) {
    return (
      <div className={`bg-theme-card border border-theme-border rounded-xl ${sizeClasses[size]} animate-pulse`}>
        <div className="h-4 bg-theme-bg-secondary rounded mb-2"></div>
        <div className="h-8 bg-theme-bg-secondary rounded mb-2"></div>
        <div className="h-3 bg-theme-bg-secondary rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div 
      className={`rounded-xl border transition-all duration-200 hover:border-theme-border-hover hover:shadow-lg ${statusColors[status]} ${sizeClasses[size]} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`text-theme-text-muted uppercase tracking-wide ${titleSizeClasses[size]}`}>{title}</div>
        {icon && <div className="text-theme-text-muted">{icon}</div>}
      </div>
      
      <div className="flex items-center justify-between">
        <div className={`font-bold text-theme-text ${valueSizeClasses[size]}`}>{value}</div>
        {change !== undefined && <TrendArrow value={change} invert={invertTrend} size={size} />}
      </div>
      
      {subtitle && (
        <div className="text-xs text-theme-text-light mt-1">{subtitle}</div>
      )}
    </div>
  );
};

// =============================================================================
// ALERT BANNER COMPONENT
// =============================================================================

export interface AlertBannerProps {
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  onDismiss?: () => void;
  persistent?: boolean;
  timestamp?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  message,
  type,
  onDismiss,
  persistent = false,
  timestamp,
  action
}) => {
  const typeStyles = {
    info: {
      container: 'bg-theme-info-bg border-theme-info-border',
      text: 'text-theme-info',
      icon: <Activity className="w-5 h-5" />
    },
    warning: {
      container: 'bg-theme-warning-bg border-theme-warning-border',
      text: 'text-theme-warning',
      icon: <AlertTriangle className="w-5 h-5" />
    },
    error: {
      container: 'bg-theme-danger-bg border-theme-danger-border',
      text: 'text-theme-danger',
      icon: <AlertTriangle className="w-5 h-5" />
    },
    success: {
      container: 'bg-theme-success-bg border-theme-success-border',
      text: 'text-theme-success',
      icon: <TrendingUp className="w-5 h-5" />
    }
  };

  const style = typeStyles[type];

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${style.container}`}>
      <div className={style.text}>
        {style.icon}
      </div>
      
      <div className="flex-1">
        <div className={`font-medium ${style.text}`}>
          {message}
        </div>
        {timestamp && (
          <div className="text-xs text-theme-text-muted mt-1">
            {new Date(timestamp).toLocaleString()}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {action && (
          <button
            onClick={action.onClick}
            className={`px-3 py-1 text-xs font-medium rounded-lg hover:opacity-80 transition-opacity ${style.text} border`}
          >
            {action.label}
          </button>
        )}
        
        {onDismiss && !persistent && (
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-black/10 rounded transition-colors"
            aria-label="Dismiss alert"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// METRIC COMPARISON COMPONENT
// =============================================================================

export interface MetricComparisonProps {
  current: number;
  previous: number;
  label: string;
  format?: 'number' | 'percentage' | 'currency';
  period?: string;
  showDifference?: boolean;
}

export const MetricComparison: React.FC<MetricComparisonProps> = ({
  current,
  previous,
  label,
  format = 'number',
  period = 'vs. previous',
  showDifference = true
}) => {
  const difference = current - previous;
  const percentChange = previous !== 0 ? (difference / previous) * 100 : 0;

  const formatValue = (value: number) => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return `$${value.toLocaleString()}`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-theme-text-muted text-sm">{label}</span>
        <span className="text-theme-text font-medium">{formatValue(current)}</span>
      </div>
      
      {showDifference && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-theme-text-light">{period}</span>
          <div className="flex items-center gap-1">
            <TrendArrow value={percentChange} showValue={false} />
            <span className={`${percentChange > 0 ? 'text-theme-success' : percentChange < 0 ? 'text-theme-danger' : 'text-theme-text-muted'}`}>
              {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// LOADING SKELETON COMPONENT
// =============================================================================

export interface LoadingSkeletonProps {
  type: 'card' | 'chart' | 'table' | 'text';
  count?: number;
  height?: string;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type,
  count = 1,
  height = 'auto',
  className = ''
}) => {
  const skeletons = Array.from({ length: count });

  switch (type) {
    case 'card':
      return (
        <div className={`grid gap-4 ${className}`}>
          {skeletons.map((_, i) => (
            <div key={i} className="bg-theme-card border border-theme-border rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-theme-bg-secondary rounded mb-2 w-1/3"></div>
              <div className="h-8 bg-theme-bg-secondary rounded mb-2 w-1/2"></div>
              <div className="h-3 bg-theme-bg-secondary rounded w-1/4"></div>
            </div>
          ))}
        </div>
      );

    case 'chart':
      return (
        <div className={`bg-theme-card border border-theme-border rounded-xl p-6 ${className}`}>
          <div className="h-4 bg-theme-bg-secondary rounded mb-4 w-48 animate-pulse"></div>
          <div className={`bg-theme-bg-secondary rounded animate-pulse ${height !== 'auto' ? height : 'h-64'}`}></div>
        </div>
      );

    case 'table':
      return (
        <div className={`bg-theme-card border border-theme-border rounded-xl overflow-hidden ${className}`}>
          <div className="p-4 border-b border-theme-border">
            <div className="h-4 bg-theme-bg-secondary rounded w-32 animate-pulse"></div>
          </div>
          {skeletons.map((_, i) => (
            <div key={i} className="p-4 border-b border-theme-border last:border-b-0 flex justify-between">
              <div className="h-4 bg-theme-bg-secondary rounded w-1/3 animate-pulse"></div>
              <div className="h-4 bg-theme-bg-secondary rounded w-1/4 animate-pulse"></div>
            </div>
          ))}
        </div>
      );

    case 'text':
    default:
      return (
        <div className={`space-y-2 ${className}`}>
          {skeletons.map((_, i) => (
            <div key={i} className="h-4 bg-theme-bg-secondary rounded animate-pulse" style={{ width: `${Math.random() * 40 + 60}%` }}></div>
          ))}
        </div>
      );
  }
};

// =============================================================================
// STATUS BADGE COMPONENT
// =============================================================================

export interface StatusBadgeProps {
  status: 'online' | 'offline' | 'warning' | 'error' | 'loading';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  animated = true
}) => {
  const statusStyles = {
    online: {
      dot: 'bg-theme-success',
      text: 'text-theme-success',
      defaultLabel: 'Online'
    },
    offline: {
      dot: 'bg-theme-text-muted',
      text: 'text-theme-text-muted',
      defaultLabel: 'Offline'
    },
    warning: {
      dot: 'bg-theme-warning',
      text: 'text-theme-warning',
      defaultLabel: 'Warning'
    },
    error: {
      dot: 'bg-theme-danger',
      text: 'text-theme-danger',
      defaultLabel: 'Error'
    },
    loading: {
      dot: 'bg-theme-info',
      text: 'text-theme-info',
      defaultLabel: 'Loading'
    }
  };

  const sizeClasses = {
    sm: { dot: 'w-2 h-2', text: 'text-xs' },
    md: { dot: 'w-3 h-3', text: 'text-sm' },
    lg: { dot: 'w-4 h-4', text: 'text-base' }
  };

  const style = statusStyles[status];
  const sizeClass = sizeClasses[size];
  const displayLabel = label || style.defaultLabel;

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClass.dot} ${style.dot} rounded-full ${animated && status !== 'offline' ? 'animate-pulse' : ''}`} />
      {displayLabel && (
        <span className={`font-medium ${style.text} ${sizeClass.text}`}>
          {displayLabel}
        </span>
      )}
    </div>
  );
};

// =============================================================================
// EXPORTS
// =============================================================================

// Export all components for easy importing
export {
  // Also re-export the individual component files for specific imports
};

// Export default object with all components
export default {
  StressIndicator,
  TrendArrow,
  DataCard,
  AlertBanner,
  MetricComparison,
  LoadingSkeleton,
  StatusBadge
};