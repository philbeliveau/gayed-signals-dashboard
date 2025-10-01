/**
 * Data Quality Warning Component
 *
 * Displays prominent warnings when data sources are unavailable or degraded
 * Enforces transparency per data-integrity-policy.md
 */

'use client';

import { AlertTriangle, XCircle, Info, ExternalLink } from 'lucide-react';

export interface DataQualityIssue {
  severity: 'error' | 'warning' | 'info';
  source: string;
  message: string;
  impact?: string;
}

interface DataQualityWarningProps {
  issues: DataQualityIssue[];
  confidenceReduction: number;
  className?: string;
  onLearnMore?: () => void;
}

export default function DataQualityWarning({
  issues,
  confidenceReduction,
  className = '',
  onLearnMore
}: DataQualityWarningProps) {
  if (issues.length === 0) return null;

  // Group issues by severity
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  // Determine overall severity
  const overallSeverity = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'info';

  const severityConfig = {
    error: {
      icon: <XCircle className="w-5 h-5" />,
      bgColor: 'bg-theme-danger-bg',
      borderColor: 'border-theme-danger-border',
      textColor: 'text-theme-danger',
      title: 'Data Quality Error'
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5" />,
      bgColor: 'bg-theme-warning-bg',
      borderColor: 'border-theme-warning-border',
      textColor: 'text-theme-warning',
      title: 'Data Quality Warning'
    },
    info: {
      icon: <Info className="w-5 h-5" />,
      bgColor: 'bg-theme-primary-bg',
      borderColor: 'border-theme-primary-border',
      textColor: 'text-theme-primary',
      title: 'Data Quality Notice'
    }
  };

  const config = severityConfig[overallSeverity];

  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded-xl p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className={`${config.textColor} flex-shrink-0 mt-0.5`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-base sm:text-lg font-semibold ${config.textColor} mb-1`}>
            {config.title}
          </h3>
          <p className="text-sm text-theme-text-muted">
            {errors.length > 0
              ? 'Critical data sources are unavailable. Signal accuracy may be significantly impacted.'
              : warnings.length > 0
              ? 'Some data sources are unavailable. Analysis is based on available data only.'
              : 'Data quality information for transparency.'}
          </p>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-3 mb-4">
        {/* Errors */}
        {errors.map((issue, index) => (
          <div key={`error-${index}`} className="flex items-start gap-3 p-3 bg-theme-danger-bg/50 border border-theme-danger-border/50 rounded-lg">
            <XCircle className="w-4 h-4 text-theme-danger flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-theme-text mb-1">
                {issue.source}
              </div>
              <div className="text-xs text-theme-text-muted mb-1">
                {issue.message}
              </div>
              {issue.impact && (
                <div className="text-xs text-theme-danger font-medium">
                  Impact: {issue.impact}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Warnings */}
        {warnings.map((issue, index) => (
          <div key={`warning-${index}`} className="flex items-start gap-3 p-3 bg-theme-warning-bg/50 border border-theme-warning-border/50 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-theme-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-theme-text mb-1">
                {issue.source}
              </div>
              <div className="text-xs text-theme-text-muted mb-1">
                {issue.message}
              </div>
              {issue.impact && (
                <div className="text-xs text-theme-warning font-medium">
                  Impact: {issue.impact}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Info */}
        {infos.map((issue, index) => (
          <div key={`info-${index}`} className="flex items-start gap-3 p-3 bg-theme-primary-bg/50 border border-theme-primary-border/50 rounded-lg">
            <Info className="w-4 h-4 text-theme-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-theme-text mb-1">
                {issue.source}
              </div>
              <div className="text-xs text-theme-text-muted">
                {issue.message}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confidence Impact */}
      {confidenceReduction > 0 && (
        <div className="flex items-center justify-between p-3 bg-theme-card-secondary border border-theme-border rounded-lg mb-4">
          <div>
            <div className="text-sm font-medium text-theme-text mb-1">
              Confidence Reduction
            </div>
            <div className="text-xs text-theme-text-muted">
              Signal confidence reduced due to missing data sources
            </div>
          </div>
          <div className={`text-2xl font-bold ${config.textColor}`}>
            -{confidenceReduction}%
          </div>
        </div>
      )}

      {/* Policy Compliance Notice */}
      <div className="flex items-start gap-2 p-3 bg-theme-card-secondary border border-theme-border rounded-lg">
        <Info className="w-4 h-4 text-theme-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-theme-text mb-1">
            ✅ Real Data Only Policy
          </div>
          <div className="text-xs text-theme-text-muted leading-relaxed">
            This system uses <strong>only real data</strong> from verified APIs. When data sources are unavailable,
            we explicitly inform you rather than generating synthetic estimates. No fallback data is used.
          </div>
        </div>
      </div>

      {/* Learn More Link */}
      {onLearnMore && (
        <button
          onClick={onLearnMore}
          className="flex items-center gap-2 text-xs text-theme-primary hover:text-theme-primary-hover font-medium mt-4 transition-colors"
        >
          <span>Learn more about data integrity</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
