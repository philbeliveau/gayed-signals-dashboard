'use client';

import { useState } from 'react';
import { BookOpen, FileText, Download, X, ExternalLink, ChevronRight } from 'lucide-react';
import { getSignalDescription, getSignalPapers, type ResearchPaper } from '@/lib/data/signal-descriptions';

interface SignalMethodologyCardProps {
  signalType: string;
  currentSignal: 'Risk-On' | 'Risk-Off' | 'Neutral';
  className?: string;
}

export default function SignalMethodologyCard({
  signalType,
  currentSignal,
  className = ''
}: SignalMethodologyCardProps) {
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<ResearchPaper | null>(null);
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);

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

  const handleViewPaper = (paper: ResearchPaper) => {
    setSelectedPaper(paper);
    setShowPDFModal(true);
  };

  const handleClosePDFModal = () => {
    setShowPDFModal(false);
    setSelectedPaper(null);
  };

  const handleDownloadPaper = (paper: ResearchPaper) => {
    if (paper.blobUrl) {
      window.open(paper.blobUrl, '_blank');
    }
  };

  return (
    <>
      {/* Compact Button to Open Methodology */}
      <button
        onClick={() => setShowMethodologyModal(true)}
        className={`w-full py-2 px-3 bg-theme-card border border-theme-border/30 hover:border-theme-primary/50 rounded-lg transition-all flex items-center justify-between gap-2 text-sm group ${className}`}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-theme-primary" />
          <span className="text-theme-text-muted group-hover:text-theme-text">View Methodology & Research</span>
        </div>
        <ChevronRight className="w-4 h-4 text-theme-text-muted group-hover:text-theme-primary transition-colors" />
      </button>

      {/* Methodology Modal - Opens on Button Click */}
      {showMethodologyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowMethodologyModal(false)}>
          <div className="bg-theme-card border-2 border-theme-border rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-theme-card border-b border-theme-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-theme-primary rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-theme-text">
                    {description.displayName}
                  </h3>
                  <p className="text-xs text-theme-text-muted">Signal Methodology & Research</p>
                </div>
              </div>
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-theme-card-secondary transition-colors flex items-center justify-center"
              >
                <X className="w-5 h-5 text-theme-text-muted" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Current Signal Interpretation */}
              <div className="bg-theme-card-secondary/50 border border-theme-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${
                    currentSignal === 'Risk-On' ? 'bg-theme-success' :
                    currentSignal === 'Risk-Off' ? 'bg-theme-danger' :
                    'bg-theme-warning'
                  } animate-pulse`}></div>
                  <div className="text-xs font-bold text-theme-text uppercase tracking-wider">
                    Current: {currentSignal}
                  </div>
                </div>
                <p className="text-sm text-theme-text leading-relaxed">
                  {getCurrentInterpretation()}
                </p>
              </div>

              {/* Methodology */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-theme-primary" />
                  <h4 className="text-sm font-bold text-theme-text uppercase">How It Works</h4>
                </div>
                <p className="text-sm text-theme-text-muted leading-relaxed">
                  {description.methodology}
                </p>
              </div>

              {/* Research Papers */}
              {papers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-theme-success" />
                    <h4 className="text-sm font-bold text-theme-text uppercase">
                      Research Papers ({papers.length})
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {papers.map((paper) => (
                      <div
                        key={paper.id}
                        className="bg-theme-card-secondary/30 border border-theme-border/50 rounded-lg p-3"
                      >
                        <h5 className="text-sm font-bold text-theme-text mb-1">
                          {paper.title}
                        </h5>
                        <div className="text-xs text-theme-text-muted mb-2">
                          {paper.authors.join(', ')} • {paper.year}
                        </div>
                        <p className="text-xs text-theme-text-light mb-3">
                          {paper.description}
                        </p>

                        {paper.blobUrl && (
                          <button
                            onClick={() => handleViewPaper(paper)}
                            className="w-full px-3 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg transition-all text-xs font-semibold flex items-center justify-center gap-2"
                          >
                            <BookOpen className="w-4 h-4" />
                            <span>Read Paper</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal - Full Screen */}
      {showPDFModal && selectedPaper && selectedPaper.blobUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col">
          {/* Modal Header */}
          <div className="bg-theme-card border-b border-theme-border p-4 flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-4">
              <h3 className="text-lg font-bold text-theme-text truncate">
                {selectedPaper.title}
              </h3>
              <p className="text-sm text-theme-text-muted">
                {selectedPaper.authors.join(', ')} • {selectedPaper.year}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleDownloadPaper(selectedPaper)}
                className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg transition-colors flex items-center space-x-2 text-sm font-medium touch-manipulation"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </button>
              <button
                onClick={handleClosePDFModal}
                className="p-2 hover:bg-theme-card-hover rounded-lg text-theme-text-muted hover:text-theme-text transition-colors touch-manipulation"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 overflow-hidden bg-gray-100">
            <iframe
              src={`${selectedPaper.blobUrl}#view=FitH`}
              className="w-full h-full border-0"
              title={selectedPaper.title}
            />
          </div>

          {/* Mobile Helper */}
          <div className="sm:hidden bg-theme-card border-t border-theme-border p-3 text-center">
            <p className="text-xs text-theme-text-muted">
              Swipe to scroll • Pinch to zoom
            </p>
          </div>
        </div>
      )}
    </>
  );
}
