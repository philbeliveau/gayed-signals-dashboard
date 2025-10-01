/**
 * Signal Confidence Tooltip Component
 *
 * Displays detailed explanation of signal confidence score
 * Shows data sources, quality, and why confidence might be reduced
 */

'use client';

import { useState } from 'react';
import { Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface DataProvenance {
  sources: {
    name: string;
    symbols: string[];
    fetchedAt: string;
    dataPoints: number;
    apiSuccess: boolean;
  }[];
  validationPassed: boolean;
  confidenceReduction: number;
  missingDataSources: string[];
}

interface SignalConfidenceTooltipProps {
  confidence: number;
  provenance?: DataProvenance;
  className?: string;
}

export default function SignalConfidenceTooltip({
  confidence,
  provenance,
  className = ''
}: SignalConfidenceTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Calculate base confidence (before reduction)
  const baseConfidence = provenance
    ? Math.min(100, confidence + provenance.confidenceReduction)
    : confidence;

  // Determine confidence level
  const getConfidenceLevel = () => {
    const pct = confidence * 100;
    if (pct >= 80) return { label: 'High', color: 'text-theme-success' };
    if (pct >= 60) return { label: 'Moderate', color: 'text-theme-warning' };
    return { label: 'Low', color: 'text-theme-danger' };
  };

  const confidenceLevel = getConfidenceLevel();

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-theme-card-secondary hover:bg-theme-card-hover border border-theme-border rounded-lg transition-colors"
      >
        <span className="text-sm font-medium text-theme-text">
          {Math.round(confidence * 100)}%
        </span>
        <Info className="w-4 h-4 text-theme-text-muted" />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 left-0 mt-2 w-80 bg-theme-card border border-theme-border rounded-xl shadow-xl p-4 animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-theme-border">
            <div>
              <h4 className="text-sm font-semibold text-theme-text">Signal Confidence</h4>
              <div className={`text-xs ${confidenceLevel.color} font-medium`}>
                {confidenceLevel.label} Confidence
              </div>
            </div>
            <div className="text-2xl font-bold text-theme-text">
              {Math.round(confidence * 100)}%
            </div>
          </div>

          {/* Confidence Breakdown */}
          {provenance && provenance.confidenceReduction > 0 && (
            <div className="mb-4 p-3 bg-theme-warning-bg border border-theme-warning-border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-theme-text-muted">Base Confidence:</span>
                <span className="text-sm font-semibold text-theme-text">
                  {Math.round(baseConfidence)}%
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-theme-warning flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Data Reduction:
                </span>
                <span className="text-sm font-semibold text-theme-warning">
                  -{provenance.confidenceReduction}%
                </span>
              </div>
              <div className="pt-2 border-t border-theme-warning-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-theme-text">Final Confidence:</span>
                  <span className="text-sm font-bold text-theme-text">
                    {Math.round(confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Data Sources Status */}
          {provenance && (
            <div className="space-y-2 mb-4">
              <div className="text-xs font-medium text-theme-text mb-2">Data Sources:</div>
              {provenance.sources.map((source, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 bg-theme-card-secondary rounded-md"
                >
                  {source.apiSuccess ? (
                    <CheckCircle className="w-3.5 h-3.5 text-theme-success flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-theme-danger flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-theme-text">
                      {source.name}
                    </div>
                    <div className="text-xs text-theme-text-muted">
                      {source.dataPoints} data points
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Missing Data Sources */}
          {provenance && provenance.missingDataSources.length > 0 && (
            <div className="p-3 bg-theme-danger-bg border border-theme-danger-border rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-theme-danger flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-theme-danger mb-1">
                    Unavailable Sources:
                  </div>
                  <div className="text-xs text-theme-text-muted">
                    {provenance.missingDataSources.join(', ')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Validation Status */}
          {provenance && (
            <div className="flex items-center justify-between p-2 bg-theme-card-secondary rounded-md">
              <span className="text-xs text-theme-text-muted">Data Validation:</span>
              <span className={`text-xs font-medium ${provenance.validationPassed ? 'text-theme-success' : 'text-theme-danger'}`}>
                {provenance.validationPassed ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Passed
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Failed
                  </span>
                )}
              </span>
            </div>
          )}

          {/* No Provenance Data */}
          {!provenance && (
            <div className="p-3 bg-theme-card-secondary rounded-lg">
              <div className="text-xs text-theme-text-muted text-center">
                Detailed provenance data not available for this signal
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
