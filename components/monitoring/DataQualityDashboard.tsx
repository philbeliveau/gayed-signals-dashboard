'use client';

/**
 * DataQualityDashboard Component
 * Story 4.0f: Monitoring & Observability - Task 1.1
 *
 * Real-time data quality monitoring dashboard for Railway backend data pipeline
 */

import React, { useState, useEffect, useCallback } from 'react';
import type {
  DataQualityDashboardProps,
  QualityMetrics,
  QualityAlert,
  TimeRange,
} from '@/domains/data-pipeline/types/monitoring';

export const DataQualityDashboard: React.FC<DataQualityDashboardProps> = ({
  timeRange,
  sources,
  refreshInterval = 30000, // 30 seconds default
}) => {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [alerts, setAlerts] = useState<QualityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/monitoring/quality-metrics?timeRange=${timeRange}&sources=${sources.join(',')}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch quality metrics: ${response.status}`);
      }

      const data = await response.json();
      setMetrics(data.metrics);
      setAlerts(data.alerts || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching quality metrics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [timeRange, sources]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchMetrics();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchMetrics, refreshInterval]);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading quality metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg
            className="w-5 h-5 text-red-600 mr-2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span className="text-red-800 font-medium">Error loading metrics</span>
        </div>
        <p className="text-red-700 text-sm mt-2">{error}</p>
        <button
          onClick={fetchMetrics}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">No metrics available</p>
      </div>
    );
  }

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Data Quality Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">
            Monitoring {sources.length} data source{sources.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Last updated</p>
          <p className="text-sm text-gray-700">
            {lastUpdate?.toLocaleTimeString() || 'Never'}
          </p>
          {loading && (
            <div className="inline-flex items-center mt-1">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              <span className="ml-1 text-xs text-gray-500">Refreshing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Overall Quality Score */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Quality</h3>
        <div className="flex items-center justify-center">
          <div className="relative">
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center ${getScoreBgColor(
                metrics.overall.overall
              )}`}
            >
              <div className="text-center">
                <div className={`text-4xl font-bold ${getScoreColor(metrics.overall.overall)}`}>
                  {Math.round(metrics.overall.overall)}
                </div>
                <div className="text-xs text-gray-600 mt-1">out of 100</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QualityMetricCard
          title="Freshness"
          score={metrics.overall.freshness}
          subtitle={`Last update: ${new Date(metrics.overall.timestamp).toLocaleTimeString()}`}
        />
        <QualityMetricCard
          title="Completeness"
          score={metrics.overall.completeness}
          subtitle={`${metrics.completeness.completeRecords}/${metrics.completeness.totalRecords} records`}
        />
        <QualityMetricCard
          title="Consistency"
          score={metrics.overall.consistency}
          subtitle={`${metrics.consistency.validationErrors.length} validation errors`}
        />
        <QualityMetricCard
          title="Accuracy"
          score={metrics.overall.accuracy}
          subtitle="Based on validation rules"
        />
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Active Alerts ({alerts.filter((a) => !a.resolved).length})
          </h3>
          <div className="space-y-3">
            {alerts
              .filter((alert) => !alert.resolved)
              .slice(0, 5)
              .map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
          </div>
        </div>
      )}

      {/* Source Quality Comparison */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Source Quality</h3>
        <div className="space-y-3">
          {Object.entries(metrics.sources).map(([source, sourceMetrics]) => (
            <SourceQualityRow key={source} source={source} metrics={sourceMetrics} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Supporting Components
// ============================================================================

interface QualityMetricCardProps {
  title: string;
  score: number;
  subtitle: string;
}

const QualityMetricCard: React.FC<QualityMetricCardProps> = ({ title, score, subtitle }) => {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">{title}</h4>
      <div className={`text-3xl font-bold ${getScoreColor(score)} mb-2`}>
        {Math.round(score)}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full ${getProgressColor(score)}`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
      <p className="text-xs text-gray-600">{subtitle}</p>
    </div>
  );
};

interface AlertItemProps {
  alert: QualityAlert;
}

const AlertItem: React.FC<AlertItemProps> = ({ alert }) => {
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'error':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className={`border rounded-lg p-3 ${getSeverityColor(alert.severity)}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase">{alert.severity}</span>
            <span className="text-xs text-gray-600">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-sm font-medium mb-1">{alert.message}</p>
          <p className="text-xs opacity-75">
            {alert.metric}: {alert.currentValue} (threshold: {alert.threshold})
          </p>
          {alert.recommendation && (
            <p className="text-xs mt-2 italic">💡 {alert.recommendation}</p>
          )}
        </div>
      </div>
    </div>
  );
};

interface SourceQualityRowProps {
  source: string;
  metrics: any;
}

const SourceQualityRow: React.FC<SourceQualityRowProps> = ({ source, metrics }) => {
  const getStatusColor = (availability: number): string => {
    if (availability >= 95) return 'text-green-600';
    if (availability >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{source}</span>
          <span className={`text-sm ${getStatusColor(metrics.availability)}`}>
            {Math.round(metrics.availability)}% uptime
          </span>
        </div>
        <div className="flex gap-4 mt-1 text-xs text-gray-600">
          <span>Quality: {Math.round(metrics.quality.overall)}/100</span>
          <span>Latency: {Math.round(metrics.latency)}ms</span>
          <span>Errors: {(metrics.errorRate * 100).toFixed(2)}%</span>
        </div>
      </div>
      <div className="text-right text-xs text-gray-500">
        <div>Last fetch:</div>
        <div>{new Date(metrics.lastSuccessfulFetch).toLocaleTimeString()}</div>
      </div>
    </div>
  );
};

export default DataQualityDashboard;
