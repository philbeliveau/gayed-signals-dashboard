'use client';

import { useState } from 'react';
import { Youtube, Play, Clock, FileText, CheckCircle, XCircle, Loader2, RefreshCw, Activity, LineChart, Home, Users, Save, Folder } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import FolderManager from '../../components/FolderManager';

interface ProcessingResult {
  success: boolean;
  url: string;
  title: string;
  transcript: string;
  summary: string;
  processing_time: number;
  error: string;
  video_id?: string;
  folder_name?: string;
}

export default function SimpleYouTubePage() {
  const { theme } = useTheme();
  const [url, setUrl] = useState('');
  const [context, setContext] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | undefined>(undefined);
  const [selectedFolderName, setSelectedFolderName] = useState<string>('Root');
  const [saveToDatabase, setSaveToDatabase] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      alert('Please enter a YouTube URL');
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/simple-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtube_url: url,
          summary_mode: 'bullet',
          custom_context: context.trim() || undefined,
          folder_id: selectedFolder || undefined,
          save_to_database: saveToDatabase
        }),
      });

      const data = await response.json();
      setResult(data);
      
      // Show success message if saved to database
      if (data.success && data.video_id && saveToDatabase) {
        console.log(`✅ Video saved to ${data.folder_name || 'Root'} folder`);
      }
    } catch (error) {
      setResult({
        success: false,
        url: url,
        title: '',
        transcript: '',
        summary: '',
        processing_time: 0,
        error: error instanceof Error ? error.message : 'Processing failed'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleFolderSelect = (folderId: string | undefined, folderName?: string) => {
    setSelectedFolder(folderId);
    setSelectedFolderName(folderName || 'Root');
  };

  const formatTime = (seconds: number) => {
    return `${seconds.toFixed(1)} seconds${seconds > 60 ? ` (${(seconds/60).toFixed(1)} minutes)` : ''}`;
  };

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text">{/* Navigation handled by layout.tsx AuthNavigation component */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-theme-text">YouTube Processor</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Folder Manager */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <FolderManager
              selectedFolder={selectedFolder}
              onFolderSelect={handleFolderSelect}
              className="lg:sticky lg:top-6"
            />
          </div>

          {/* Input Form */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="bg-theme-card rounded-lg p-4 sm:p-6 border border-theme-border">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium mb-2">
                YouTube URL
              </label>
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-2 bg-theme-bg border border-theme-border rounded-lg 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-theme-text"
                disabled={processing}
              />
            </div>

            <div>
              <label htmlFor="context" className="block text-sm font-medium mb-2">
                Custom Context (Optional)
              </label>
              <textarea
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Provide specific instructions or context for the AI summary... 
For example: 'Focus on investment strategies mentioned' or 'Summarize the key financial metrics discussed' or 'Extract actionable trading tips'"
                rows={3}
                className="w-full px-4 py-2 bg-theme-bg border border-theme-border rounded-lg 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-theme-text resize-none"
                disabled={processing}
              />
              <p className="text-xs text-theme-text-muted mt-1">
                Leave empty for general summary, or provide specific instructions to guide the AI's focus
              </p>
            </div>

            {/* Save to Database Option */}
            <div className="border-t border-theme-border pt-4">
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveToDatabase}
                    onChange={(e) => setSaveToDatabase(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-theme-border rounded focus:ring-blue-500"
                    disabled={processing}
                  />
                  <span className="text-sm font-medium text-theme-text">Save to Database</span>
                </label>
                {saveToDatabase && (
                  <div className="flex items-center space-x-2 text-sm text-theme-text-muted">
                    <Folder className="w-4 h-4" />
                    <span>Saving to: {selectedFolderName}</span>
                  </div>
                )}
              </div>
              
              {saveToDatabase && (
                <div className="text-sm text-theme-text-muted mb-4">
                  ✅ Video summary will be saved persistently and can be accessed later
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={processing || !url.trim()}
                className="w-full sm:w-auto px-6 py-3 bg-theme-primary hover:bg-theme-primary-hover disabled:bg-theme-text-muted
                         text-white rounded-lg transition-colors flex items-center justify-center space-x-2
                         touch-manipulation min-h-[44px]"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Process Video</span>
                  </>
                )}
              </button>
            </div>
          </form>
            </div>
          </div>
        </div>

        {/* Processing Status */}
        {processing && (
          <div className="bg-theme-card border border-theme-border rounded-lg p-4 mb-6 text-center">
            <div className="flex items-center justify-center space-x-2 text-theme-text">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-medium">Processing video...</span>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4 sm:space-y-6">
            {/* Status Header */}
            <div className={`rounded-lg p-4 border ${
              result.success
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex flex-col space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <div className="flex items-center space-x-2">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <span className="font-medium text-sm sm:text-base">
                      {result.success ? 'Processing Completed Successfully!' : 'Processing Failed'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs sm:text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(result.processing_time)}</span>
                  </div>
                </div>

                {/* Database save status */}
                {result.success && result.video_id && (
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 text-xs sm:text-sm">
                    <div className="flex items-center space-x-2">
                      <Save className="w-4 h-4" />
                      <span>✅ Saved to database</span>
                    </div>
                    {result.folder_name && (
                      <div className="flex items-center space-x-2 sm:ml-2">
                        <span className="hidden sm:inline">•</span>
                        <Folder className="w-4 h-4" />
                        <span>Folder: {result.folder_name}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {result.success ? (
              <>
                {/* Video Info */}
                {result.title && (
                  <div className="bg-theme-card rounded-lg p-4 sm:p-6 border border-theme-border">
                    <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-2 flex items-center space-x-2">
                      <Youtube className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <span>Video Information</span>
                    </h2>
                    <div className="space-y-2">
                      <p className="text-theme-text-muted text-sm sm:text-base">
                        <strong>Title:</strong> <span className="break-words">{result.title}</span>
                      </p>
                      <p className="text-theme-text-muted text-xs sm:text-sm">
                        <strong>URL:</strong> <span className="break-all">{result.url}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Summary */}
                {result.summary && (
                  <div className="bg-theme-card rounded-lg p-4 sm:p-6 border border-theme-border">
                    <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <span>AI Summary</span>
                    </h2>
                    <div className="prose prose-sm max-w-none text-theme-text">
                      <pre className="whitespace-pre-wrap font-sans leading-relaxed text-sm sm:text-base">
                        {result.summary}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Transcript */}
                {result.transcript && (
                  <div className="bg-theme-card rounded-lg p-4 sm:p-6 border border-theme-border">
                    <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>Full Transcript</span>
                    </h2>
                    <div className="max-h-48 sm:max-h-64 overflow-y-auto bg-theme-bg rounded-lg p-3 sm:p-4 border border-theme-border">
                      <p className="text-theme-text-muted text-xs sm:text-sm leading-relaxed">
                        {result.transcript}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Error Display */
              <div className="bg-theme-card rounded-lg p-6 border border-red-200">
                <h2 className="text-xl font-semibold mb-4 text-red-600">Error Details</h2>
                <p className="text-red-700 bg-red-50 p-3 rounded border">
                  {result.error}
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}