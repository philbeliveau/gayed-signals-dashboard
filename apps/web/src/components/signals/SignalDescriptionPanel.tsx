'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, Download, ExternalLink, FileText } from 'lucide-react';
import { getSignalDescription, getSignalPapers, type ResearchPaper } from '@/lib/data/signal-descriptions';

interface SignalDescriptionPanelProps {
  signalType: string;
  currentSignal: 'Risk-On' | 'Risk-Off' | 'Neutral';
  className?: string;
}

export default function SignalDescriptionPanel({
  signalType,
  currentSignal,
  className = ''
}: SignalDescriptionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const description = getSignalDescription(signalType);
  const papers = getSignalPapers(signalType);

  if (!description) return null;

  const getCurrentInterpretation = () => {
    switch (currentSignal) {
      case 'Risk-On':
        return description.interpretation.riskOn;
      case 'Risk-Off':
        return description.interpretation.riskOff;
      case 'Neutral':
        return description.interpretation.neutral;
      default:
        return description.shortDescription;
    }
  };

  const handleDownloadPaper = async (paper: ResearchPaper) => {
    if (!paper.blobUrl) {
      alert('Paper URL not available. Please run the upload-papers endpoint first.');
      return;
    }

    try {
      // Open PDF in new tab (browser will handle download)
      window.open(paper.blobUrl, '_blank');
    } catch (error) {
      console.error('Failed to download paper:', error);
      alert('Failed to download paper. Please try again.');
    }
  };

  return (
    <div className={`bg-theme-card-secondary/30 border border-theme-border/30 rounded-xl overflow-hidden ${className}`}>
      {/* Collapsed Preview - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-theme-card-secondary/50 transition-colors text-left touch-manipulation"
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="w-8 h-8 bg-theme-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-theme-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-theme-text mb-1">What does this mean?</div>
            <div className="text-xs text-theme-text-muted truncate">
              {description.shortDescription}
            </div>
          </div>
        </div>
        <div className="ml-3 flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-theme-text-muted" />
          ) : (
            <ChevronDown className="w-5 h-5 text-theme-text-muted" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-theme-border/30 p-4 sm:p-6 space-y-6 bg-theme-card-secondary/20">
          {/* Current Signal Interpretation */}
          <div className="bg-theme-card border border-theme-border/50 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className={`w-3 h-3 rounded-full ${
                currentSignal === 'Risk-On' ? 'bg-theme-success' :
                currentSignal === 'Risk-Off' ? 'bg-theme-danger' :
                'bg-theme-warning'
              } animate-pulse`}></div>
              <div className="text-sm font-semibold text-theme-text uppercase tracking-wide">
                Current Signal: {currentSignal}
              </div>
            </div>
            <p className="text-sm text-theme-text leading-relaxed">
              {getCurrentInterpretation()}
            </p>
          </div>

          {/* Methodology */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <FileText className="w-4 h-4 text-theme-primary" />
              <h4 className="text-sm font-semibold text-theme-text uppercase tracking-wide">
                Methodology
              </h4>
            </div>
            <p className="text-sm text-theme-text-muted leading-relaxed">
              {description.methodology}
            </p>
          </div>

          {/* Signal Interpretations */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <BookOpen className="w-4 h-4 text-theme-primary" />
              <h4 className="text-sm font-semibold text-theme-text uppercase tracking-wide">
                Signal Interpretations
              </h4>
            </div>
            <div className="space-y-3">
              <div className="bg-theme-success/5 border border-theme-success/20 rounded-lg p-3">
                <div className="text-xs font-semibold text-theme-success mb-1 uppercase tracking-wide">
                  Risk-On
                </div>
                <p className="text-xs text-theme-text-muted leading-relaxed">
                  {description.interpretation.riskOn}
                </p>
              </div>
              <div className="bg-theme-danger/5 border border-theme-danger/20 rounded-lg p-3">
                <div className="text-xs font-semibold text-theme-danger mb-1 uppercase tracking-wide">
                  Risk-Off
                </div>
                <p className="text-xs text-theme-text-muted leading-relaxed">
                  {description.interpretation.riskOff}
                </p>
              </div>
              <div className="bg-theme-warning/5 border border-theme-warning/20 rounded-lg p-3">
                <div className="text-xs font-semibold text-theme-warning mb-1 uppercase tracking-wide">
                  Neutral
                </div>
                <p className="text-xs text-theme-text-muted leading-relaxed">
                  {description.interpretation.neutral}
                </p>
              </div>
            </div>
          </div>

          {/* Research Papers */}
          {papers.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Download className="w-4 h-4 text-theme-primary" />
                <h4 className="text-sm font-semibold text-theme-text uppercase tracking-wide">
                  Research Papers
                </h4>
              </div>
              <div className="space-y-3">
                {papers.map((paper) => (
                  <div
                    key={paper.id}
                    className="bg-theme-card border border-theme-border/50 rounded-lg p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-semibold text-theme-text mb-1 leading-tight">
                          {paper.title}
                        </h5>
                        <div className="text-xs text-theme-text-muted mb-2">
                          {paper.authors.join(', ')} ({paper.year})
                        </div>
                        <p className="text-xs text-theme-text-light leading-relaxed mb-3">
                          {paper.description}
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-theme-text-muted">
                            SSRN ID: {paper.ssrnId}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {paper.blobUrl ? (
                          <button
                            onClick={() => handleDownloadPaper(paper)}
                            className="px-3 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg transition-colors flex items-center space-x-2 text-xs font-medium touch-manipulation min-h-[36px]"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </button>
                        ) : (
                          <div className="px-3 py-2 bg-theme-border/20 text-theme-text-muted rounded-lg text-xs text-center">
                            Upload Required
                          </div>
                        )}
                        <a
                          href={`https://papers.ssrn.com/sol3/papers.cfm?abstract_id=${paper.ssrnId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-theme-card-secondary hover:bg-theme-card-hover border border-theme-border text-theme-text rounded-lg transition-colors flex items-center justify-center space-x-1 text-xs font-medium touch-manipulation min-h-[36px]"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>SSRN</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-theme-warning/5 border border-theme-warning/20 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <div className="text-theme-warning mt-0.5">⚠️</div>
              <div className="text-xs text-theme-text-muted leading-relaxed">
                <strong className="text-theme-warning">Disclaimer:</strong> This information is for educational purposes only
                and does not constitute investment advice. Past performance does not guarantee future results. Always consult
                with a qualified financial advisor before making investment decisions.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
