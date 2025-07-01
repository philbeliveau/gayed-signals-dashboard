'use client';

import { useState } from 'react';
import { SummaryPanelProps, VideoSummaryRequest } from '../../../lib/types/video-insights';
import { 
  FileText, 
  RefreshCw, 
  Download, 
  Copy, 
  Clock,
  User,
  Hash,
  ChevronDown,
  ChevronRight,
  Sparkles,
  List,
  Target,
  Edit3,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const SUMMARY_MODES = [
  {
    id: 'bullet' as const,
    name: 'Bullet Points',
    description: 'Key insights as concise bullet points',
    icon: <List className="w-4 h-4" />,
    color: 'text-blue-500',
  },
  {
    id: 'executive' as const,
    name: 'Executive Summary',
    description: 'Professional summary for decision makers',
    icon: <FileText className="w-4 h-4" />,
    color: 'text-green-500',
  },
  {
    id: 'action_items' as const,
    name: 'Action Items',
    description: 'Actionable takeaways and next steps',
    icon: <Target className="w-4 h-4" />,
    color: 'text-orange-500',
  },
  {
    id: 'timeline' as const,
    name: 'Timeline',
    description: 'Chronological breakdown of key events',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-purple-500',
  },
  {
    id: 'custom' as const,
    name: 'Custom Prompt',
    description: 'Use your own analysis prompt',
    icon: <Edit3 className="w-4 h-4" />,
    color: 'text-pink-500',
  },
];

export default function SummaryPanel({ 
  video, 
  summaries, 
  onRegenerateSummary, 
  isRegenerating 
}: SummaryPanelProps) {
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(
    summaries.length > 0 ? summaries[0].id : null
  );
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerateMode, setRegenerateMode] = useState<VideoSummaryRequest['summary_mode']>('bullet');
  const [customPrompt, setCustomPrompt] = useState('');
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set([summaries[0]?.id].filter(Boolean)));

  const selectedSummary = summaries.find(s => s.id === selectedSummaryId);

  // Toggle summary expansion
  const toggleSummaryExpansion = (summaryId: string) => {
    const newExpanded = new Set(expandedSummaries);
    if (newExpanded.has(summaryId)) {
      newExpanded.delete(summaryId);
    } else {
      newExpanded.add(summaryId);
    }
    setExpandedSummaries(newExpanded);
  };

  // Copy summary to clipboard
  const copySummary = async (summary: typeof summaries[0]) => {
    try {
      await navigator.clipboard.writeText(summary.summary_text);
      // You might want to show a toast notification here
    } catch (error) {
      console.error('Failed to copy summary:', error);
    }
  };

  // Download summary as text file
  const downloadSummary = (summary: typeof summaries[0]) => {
    const content = `Summary for: ${video.title}\nChannel: ${video.channel_name}\nMode: ${summary.mode}\nGenerated: ${new Date(summary.created_at).toLocaleString()}\n\n${summary.summary_text}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summary-${video.title.replace(/[^a-zA-Z0-9]/g, '-')}-${summary.mode}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle regenerate submission
  const handleRegenerateSubmit = async () => {
    try {
      await onRegenerateSummary(
        regenerateMode,
        regenerateMode === 'custom' ? customPrompt : undefined
      );
      setShowRegenerateModal(false);
      setCustomPrompt('');
    } catch (error) {
      console.error('Failed to regenerate summary:', error);
    }
  };

  // Get mode info
  const getModeInfo = (mode: string) => {
    return SUMMARY_MODES.find(m => m.id === mode) || {
      id: mode,
      name: mode.charAt(0).toUpperCase() + mode.slice(1),
      description: '',
      icon: <FileText className="w-4 h-4" />,
      color: 'text-gray-500'
    };
  };

  // Format summary text with line breaks
  const formatSummaryText = (text: string) => {
    return text.split('\n').map((line, index) => (
      <p key={index} className={index > 0 ? 'mt-2' : ''}>{line}</p>
    ));
  };

  return (
    <div className="bg-theme-card border border-theme-border rounded-xl">
      {/* Header */}
      <div className="p-4 border-b border-theme-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-theme-text">AI Summaries</h3>
            <span className="text-sm text-theme-text-muted">({summaries.length})</span>
          </div>
          
          <button
            onClick={() => setShowRegenerateModal(true)}
            disabled={isRegenerating}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
          >
            {isRegenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>New Summary</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {summaries.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-theme-text-muted" />
            <p className="text-theme-text-muted mb-2">No summaries available</p>
            <p className="text-sm text-theme-text-light">Generate your first AI summary using the button above</p>
          </div>
        ) : (
          <div className="divide-y divide-theme-border">
            {summaries.map((summary) => {
              const modeInfo = getModeInfo(summary.mode);
              const isExpanded = expandedSummaries.has(summary.id);
              
              return (
                <div key={summary.id} className="group">
                  <div className="p-4">
                    {/* Summary header */}
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={() => toggleSummaryExpansion(summary.id)}
                        className="flex items-center space-x-2 text-left"
                      >
                        <span className={modeInfo.color}>{modeInfo.icon}</span>
                        <span className="font-medium text-theme-text">{modeInfo.name}</span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-theme-text-muted" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-theme-text-muted" />
                        )}
                      </button>
                      
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copySummary(summary)}
                          className="p-1.5 hover:bg-theme-card-hover rounded transition-colors"
                          title="Copy summary"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadSummary(summary)}
                          className="p-1.5 hover:bg-theme-card-hover rounded transition-colors"
                          title="Download summary"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Summary metadata */}
                    <div className="flex items-center space-x-4 text-xs text-theme-text-muted mb-3">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(summary.created_at).toLocaleDateString()}</span>
                      </div>
                      {summary.word_count && (
                        <div className="flex items-center space-x-1">
                          <Hash className="w-3 h-3" />
                          <span>{summary.word_count} words</span>
                        </div>
                      )}
                      {summary.user_prompt && (
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>Custom prompt</span>
                        </div>
                      )}
                    </div>

                    {/* Custom prompt display */}
                    {summary.user_prompt && isExpanded && (
                      <div className="mb-3 p-2 bg-theme-bg border border-theme-border rounded text-sm">
                        <div className="text-theme-text-muted text-xs mb-1">Custom Prompt:</div>
                        <div className="text-theme-text italic">"{summary.user_prompt}"</div>
                      </div>
                    )}

                    {/* Summary content */}
                    {isExpanded && (
                      <div className="prose prose-sm max-w-none">
                        <div className="text-theme-text leading-relaxed">
                          {formatSummaryText(summary.summary_text)}
                        </div>
                        
                        {/* Key points if available */}
                        {summary.key_points && summary.key_points.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium text-theme-text mb-2">Key Points:</h4>
                            <ul className="space-y-1">
                              {summary.key_points.map((point, index) => (
                                <li key={index} className="flex items-start space-x-2">
                                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-theme-text text-sm">{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Collapsed preview */}
                    {!isExpanded && (
                      <div className="text-theme-text-muted text-sm line-clamp-2">
                        {summary.summary_text.substring(0, 150)}...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Regenerate Modal */}
      {showRegenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-theme-card border border-theme-border rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-theme-text">Generate New Summary</h3>
            </div>

            <div className="space-y-4">
              {/* Mode selection */}
              <div>
                <label className="block text-sm font-medium text-theme-text mb-2">
                  Summary Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SUMMARY_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setRegenerateMode(mode.id)}
                      className={`p-3 border rounded-lg text-left transition-all text-sm ${
                        regenerateMode === mode.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-theme-border hover:border-theme-border-hover hover:bg-theme-card-hover'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={mode.color}>{mode.icon}</span>
                        <span className="font-medium text-theme-text">{mode.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom prompt */}
              {regenerateMode === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">
                    Custom Prompt
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Describe what specific insights you want to extract..."
                    rows={3}
                    className="w-full px-3 py-2 bg-theme-bg border border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowRegenerateModal(false);
                    setCustomPrompt('');
                  }}
                  className="px-4 py-2 text-theme-text-muted hover:text-theme-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegenerateSubmit}
                  disabled={regenerateMode === 'custom' && !customPrompt.trim()}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}