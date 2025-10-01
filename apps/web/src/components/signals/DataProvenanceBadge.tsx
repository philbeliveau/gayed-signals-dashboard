/**
 * Data Provenance Badge Component
 *
 * Displays data source information and quality indicators for signals
 * Enforces transparency about data sources per data-integrity-policy.md
 */

'use client';

import { CheckCircle, AlertTriangle, XCircle, Database, Clock } from 'lucide-react';

interface DataSource {
  name: string;
  symbols: string[];
  fetchedAt: string;
  dataPoints: number;
  apiSuccess: boolean;
}

interface DataProvenanceBadgeProps {
  sources: DataSource[];
  validationPassed: boolean;
  confidenceReduction: number;
  missingDataSources: string[];
  compact?: boolean;
  className?: string;
}

export default function DataProvenanceBadge({
  sources,
  validationPassed,
  confidenceReduction,
  missingDataSources,
  compact = false,
  className = ''
}: DataProvenanceBadgeProps) {
  // Calculate data freshness
  const getDataFreshness = (fetchedAt: string): string => {
    const now = new Date();
    const fetched = new Date(fetchedAt);
    const diffMinutes = Math.floor((now.getTime() - fetched.getTime()) / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  // Determine overall quality status
  const getQualityStatus = () => {
    if (missingDataSources.length === 0 && validationPassed) {
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        color: 'text-theme-success bg-theme-success-bg border-theme-success-border',
        label: 'Real Data',
        textColor: 'text-theme-success'
      };
    }
    if (missingDataSources.length > 0 && validationPassed) {
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        color: 'text-theme-warning bg-theme-warning-bg border-theme-warning-border',
        label: 'Partial Data',
        textColor: 'text-theme-warning'
      };
    }
    return {
      icon: <XCircle className="w-4 h-4" />,
      color: 'text-theme-danger bg-theme-danger-bg border-theme-danger-border',
      label: 'Data Issues',
      textColor: 'text-theme-danger'
    };
  };

  const status = getQualityStatus();

  // Compact mode - just a badge
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${status.color} ${className}`}>
        {status.icon}
        <span className="text-xs font-medium">{status.label}</span>
        {sources.length > 0 && (
          <span className="text-xs opacity-75">
            {sources[0].name} • {sources[0].dataPoints} pts
          </span>
        )}
      </div>
    );
  }

  // Full mode - detailed breakdown
  return (
    <div className={`bg-theme-card border border-theme-border rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-theme-text-muted" />
          <h4 className="text-sm font-semibold text-theme-text">Data Sources</h4>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${status.color}`}>
          {status.icon}
          {status.label}
        </div>
      </div>

      {/* Data Sources List */}
      <div className="space-y-2 mb-3">
        {sources.map((source, index) => (
          <div key={index} className="flex items-start justify-between p-2 bg-theme-card-secondary rounded-md">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {source.apiSuccess ? (
                  <CheckCircle className="w-3.5 h-3.5 text-theme-success flex-shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-theme-danger flex-shrink-0" />
                )}
                <span className="text-sm font-medium text-theme-text truncate">
                  {source.name}
                </span>
              </div>
              <div className="text-xs text-theme-text-muted ml-5">
                {source.symbols.join(', ')} • {source.dataPoints} data points
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-theme-text-light ml-2 flex-shrink-0">
              <Clock className="w-3 h-3" />
              {getDataFreshness(source.fetchedAt)}
            </div>
          </div>
        ))}
      </div>

      {/* Missing Data Warning */}
      {missingDataSources.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-theme-warning-bg border border-theme-warning-border rounded-md mb-3">
          <AlertTriangle className="w-4 h-4 text-theme-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-theme-warning mb-1">
              Missing Data Sources
            </div>
            <div className="text-xs text-theme-text-muted">
              {missingDataSources.join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Confidence Impact */}
      {confidenceReduction > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-theme-text-muted">Confidence Reduction:</span>
          <span className={`font-semibold ${status.textColor}`}>
            -{confidenceReduction}%
          </span>
        </div>
      )}

      {/* Validation Status */}
      <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-theme-border">
        <span className="text-theme-text-muted">Data Validation:</span>
        <span className={`font-medium ${validationPassed ? 'text-theme-success' : 'text-theme-danger'}`}>
          {validationPassed ? 'Passed' : 'Failed'}
        </span>
      </div>
    </div>
  );
}
