'use client';

import { useState, useMemo } from 'react';
import { TranscriptViewerProps } from '../../lib/types/video-insights';
import { 
  Play, 
  Search, 
  Clock, 
  ChevronDown, 
  ChevronRight,
  Volume2,
  FileText,
  Download,
  Copy
} from 'lucide-react';

export default function TranscriptViewer({ 
  transcript, 
  onTimestampClick, 
  searchQuery = '', 
  highlightText = '' 
}: TranscriptViewerProps) {
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  // Filter and highlight transcript chunks
  const processedChunks = useMemo(() => {
    const chunks = transcript.chunks || [];
    let filteredChunks = chunks;

    // Filter by search term if provided
    if (searchTerm.trim()) {
      filteredChunks = chunks.filter(chunk => 
        chunk.text.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Add highlighting
    return filteredChunks.map((chunk, index) => {
      let highlightedText = chunk.text;
      
      // Highlight search term
      if (searchTerm.trim()) {
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>');
      }
      
      // Highlight specific text
      if (highlightText.trim()) {
        const regex = new RegExp(`(${highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark class="bg-blue-200 dark:bg-blue-800 px-1 rounded">$1</mark>');
      }

      return {
        ...chunk,
        index,
        highlightedText,
        duration: chunk.end_time - chunk.start_time
      };
    });
  }, [transcript.chunks, searchTerm, highlightText]);

  // Format timestamp
  const formatTimestamp = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle chunk expansion
  const toggleChunkExpansion = (index: number) => {
    const newExpanded = new Set(expandedChunks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedChunks(newExpanded);
  };

  // Copy transcript to clipboard
  const copyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(transcript.full_text);
      // You might want to show a toast notification here
    } catch (error) {
      console.error('Failed to copy transcript:', error);
    }
  };

  // Download transcript as text file
  const downloadTranscript = () => {
    const blob = new Blob([transcript.full_text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${transcript.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalChunks = transcript.chunks?.length || 0;
  const visibleChunks = processedChunks.length;

  return (
    <div className="bg-theme-card border border-theme-border rounded-xl">
      {/* Header */}
      <div className="p-4 border-b border-theme-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-theme-text">Transcript</h3>
            <span className="text-sm text-theme-text-muted">
              ({visibleChunks} of {totalChunks} segments)
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={copyTranscript}
              className="p-2 hover:bg-theme-card-hover rounded-lg transition-colors"
              title="Copy transcript"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={downloadTranscript}
              className="p-2 hover:bg-theme-card-hover rounded-lg transition-colors"
              title="Download transcript"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-theme-text-muted" />
            <input
              type="text"
              placeholder="Search transcript..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-theme-bg border border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Display options */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFullTranscript(!showFullTranscript)}
              className="text-sm text-blue-500 hover:text-blue-600 transition-colors"
            >
              {showFullTranscript ? 'Show Segments' : 'Show Full Text'}
            </button>
            {transcript.language && (
              <span className="text-sm text-theme-text-muted">
                Language: {transcript.language.toUpperCase()}
              </span>
            )}
            {transcript.confidence_score && (
              <span className="text-sm text-theme-text-muted">
                Confidence: {Math.round(transcript.confidence_score * 100)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {showFullTranscript ? (
          // Full transcript view
          <div className="p-4">
            <div 
              className="prose prose-sm max-w-none text-theme-text leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: transcript.full_text
                  .replace(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), 
                    '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>')
              }}
            />
          </div>
        ) : (
          // Segmented view
          <div className="divide-y divide-theme-border">
            {processedChunks.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-theme-text-muted" />
                <p className="text-theme-text-muted">
                  {searchTerm ? 'No matching segments found' : 'No transcript available'}
                </p>
              </div>
            ) : (
              processedChunks.map((chunk) => (
                <div key={chunk.index} className="group">
                  <div className="p-4 hover:bg-theme-card-hover transition-colors">
                    <div className="flex items-start space-x-3">
                      {/* Timestamp */}
                      <button
                        onClick={() => onTimestampClick(chunk.start_time)}
                        className="flex-shrink-0 flex items-center space-x-1 text-sm text-blue-500 hover:text-blue-600 transition-colors bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded"
                        title="Jump to timestamp"
                      >
                        <Play className="w-3 h-3" />
                        <span>{formatTimestamp(chunk.start_time)}</span>
                      </button>

                      {/* Text content */}
                      <div className="flex-1 min-w-0">
                        <div 
                          className="text-theme-text leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: chunk.highlightedText }}
                        />
                        
                        {/* Duration indicator */}
                        <div className="mt-2 flex items-center space-x-2 text-xs text-theme-text-muted">
                          <Clock className="w-3 h-3" />
                          <span>{chunk.duration.toFixed(1)}s duration</span>
                          <span>•</span>
                          <span>
                            {formatTimestamp(chunk.start_time)} - {formatTimestamp(chunk.end_time)}
                          </span>
                        </div>
                      </div>

                      {/* Expand/Collapse (for future features) */}
                      <button
                        onClick={() => toggleChunkExpansion(chunk.index)}
                        className="flex-shrink-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {expandedChunks.has(chunk.index) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Expanded content (for future features like speaker detection, etc.) */}
                    {expandedChunks.has(chunk.index) && (
                      <div className="mt-3 pl-16 text-sm text-theme-text-muted">
                        <div className="bg-theme-bg p-2 rounded">
                          Additional metadata or controls could go here
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer with stats */}
      {processedChunks.length > 0 && (
        <div className="p-3 border-t border-theme-border bg-theme-bg text-xs text-theme-text-muted">
          <div className="flex items-center justify-between">
            <span>
              {visibleChunks} segments{searchTerm && ` matching "${searchTerm}"`}
            </span>
            <span>
              Total duration: {formatTimestamp(
                Math.max(...(transcript.chunks?.map(c => c.end_time) || [0]))
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}