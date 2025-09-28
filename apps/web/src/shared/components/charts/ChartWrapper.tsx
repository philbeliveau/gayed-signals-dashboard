'use client';

import { ReactNode, useEffect, useState } from 'react';

interface ChartWrapperProps {
  children: ReactNode;
  height?: number;
  className?: string;
  loading?: boolean;
  error?: string;
  title?: string;
  description?: string;
}

/**
 * ChartWrapper - Standardized wrapper for all chart components
 * 
 * Features:
 * - Handles SSR/client-side rendering issues
 * - Provides consistent loading and error states
 * - Ensures proper container sizing for ResponsiveContainer
 * - Manages theme integration
 */
export default function ChartWrapper({ 
  children, 
  height = 400, 
  className = '',
  loading = false,
  error,
  title,
  description
}: ChartWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (loading) {
    return (
      <div className={`chart-loading ${className}`} style={{ height, minHeight: height }}>
        <div className="flex flex-col items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary mb-2"></div>
          <div className="text-theme-text-muted text-sm">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`chart-error ${className}`} style={{ height, minHeight: height }}>
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-theme-danger text-2xl mb-2">⚠</div>
          <div className="text-theme-danger font-medium mb-1">Chart Error</div>
          <div className="text-theme-text-muted text-sm max-w-md">{error}</div>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className={`chart-loading ${className}`} style={{ height, minHeight: height }}>
        <div className="flex flex-col items-center justify-center h-full">
          <div className="animate-pulse bg-theme-bg-secondary h-8 w-32 rounded mb-2"></div>
          <div className="text-theme-text-muted text-sm">Initializing chart...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-theme-card border border-theme-border rounded-xl p-3 sm:p-6 ${className}`} style={{ overflow: 'visible' }}>
      {/* Header - mobile optimized */}
      {(title || description) && (
        <div className="mb-3 sm:mb-4">
          {title && (
            <h3 className="text-base sm:text-lg font-semibold text-theme-text mb-1">{title}</h3>
          )}
          {description && (
            <p className="text-xs sm:text-sm text-theme-text-muted">{description}</p>
          )}
        </div>
      )}

      {/* Chart Container - mobile responsive heights */}
      <div
        className="chart-container relative"
        style={{
          height: 'auto',
          minHeight: '300px', // Mobile: 300px
          width: '100%',
          overflow: 'visible'
        }}
      >
        <div
          className="chart-responsive-wrapper h-full w-full mobile-chart-wrapper"
          style={{
            height: 'auto',
            minHeight: '300px', // Mobile: 300px
            overflow: 'visible'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}