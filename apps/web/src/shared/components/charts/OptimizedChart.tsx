'use client';

import React, { memo, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import ChartErrorBoundary from '../ChartErrorBoundary';
import { useClientSide } from '../../hooks/useClientSide';

// Dynamically import chart components with better error handling
const ChartComponents = dynamic(
  () => import('./ChartComponents').catch(() => {
    // Fallback if chart components fail to load
    return { default: () => <div className="text-theme-text-muted text-center p-4">Chart unavailable</div> };
  }),
  { 
    ssr: false,
    loading: () => <ChartLoader />
  }
);

interface ChartConfig {
  type: 'line' | 'composed' | 'area';
  dataKeys: string[];
  xAxisKey: string;
  colors?: Record<string, string>;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  formatters?: {
    xAxis?: (value: any) => string;
    yAxis?: (value: any) => string;
    tooltip?: (value: any, name: string) => string;
  };
}

interface OptimizedChartProps {
  data: any[];
  config: ChartConfig;
  loading?: boolean;
  error?: string | null;
  onDataPointClick?: (data: any) => void;
  className?: string;
}

const ChartLoader: React.FC = memo(() => (
  <div className="flex items-center justify-center h-96 bg-theme-card border border-theme-border rounded-lg animate-pulse">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
      <div className="text-theme-text-muted text-sm">Loading chart...</div>
    </div>
  </div>
));

const ChartFallback: React.FC<{ message: string }> = memo(({ message }) => (
  <div className="flex items-center justify-center h-96 bg-theme-card-secondary border border-theme-border rounded-lg">
    <div className="text-center">
      <div className="text-theme-text-muted text-4xl mb-4">📊</div>
      <div className="text-theme-text-muted">{message}</div>
    </div>
  </div>
));

const ChartError: React.FC<{ error: string; onRetry?: () => void }> = memo(({ error, onRetry }) => (
  <div className="flex items-center justify-center h-96 bg-theme-danger-bg border border-theme-danger-border rounded-lg">
    <div className="text-center max-w-md p-4">
      <div className="text-theme-danger text-4xl mb-4">⚠️</div>
      <h3 className="text-lg font-semibold text-theme-danger mb-2">Chart Error</h3>
      <p className="text-theme-text-muted text-sm mb-4">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-theme-danger hover:bg-theme-danger/80 text-white rounded-lg transition-colors text-sm font-medium"
        >
          Retry Chart
        </button>
      )}
    </div>
  </div>
));

/**
 * Optimized chart component with proper SSR handling, error boundaries, and performance optimizations
 * Consolidates chart rendering logic and provides consistent fallback states
 */
const OptimizedChart: React.FC<OptimizedChartProps> = memo(({
  data,
  config,
  loading = false,
  error = null,
  onDataPointClick,
  className = ""
}) => {
  const isClient = useClientSide();
  
  // Memoize processed data to prevent unnecessary recalculations
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Basic data validation and processing
    return data.filter(item => item && typeof item === 'object').map(item => {
      const processed: any = {};
      
      // Ensure required fields exist
      if (item[config.xAxisKey]) {
        processed[config.xAxisKey] = item[config.xAxisKey];
      }
      
      // Process data keys
      config.dataKeys.forEach(key => {
        if (item[key] !== undefined && item[key] !== null) {
          processed[key] = typeof item[key] === 'number' ? item[key] : parseFloat(item[key]) || 0;
        }
      });
      
      return processed;
    });
  }, [data, config]);
  
  // Show loading state
  if (loading) {
    return <ChartLoader />;
  }
  
  // Show error state
  if (error) {
    return <ChartError error={error} />;
  }
  
  // Wait for client-side hydration
  if (!isClient) {
    return <ChartLoader />;
  }
  
  // Show fallback if no data
  if (processedData.length === 0) {
    return <ChartFallback message="No chart data available" />;
  }
  
  return (
    <div className={`chart-container ${className}`}>
      <ChartErrorBoundary
        fallback={
          <ChartFallback message="Chart rendering failed. Please try refreshing the page." />
        }
      >
        <Suspense fallback={<ChartLoader />}>
          <ChartComponents
            data={processedData}
            config={config}
            onDataPointClick={onDataPointClick}
          />
        </Suspense>
      </ChartErrorBoundary>
    </div>
  );
});

OptimizedChart.displayName = 'OptimizedChart';

export default OptimizedChart;
export type { ChartConfig, OptimizedChartProps };
export { ChartLoader, ChartFallback, ChartError };