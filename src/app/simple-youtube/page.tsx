'use client';

import { useState } from 'react';
import { Youtube, Play, Clock, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ProcessingResult {
  success: boolean;
  url: string;
  title: string;
  transcript: string;
  summary: string;
  processing_time: number;
  error: string;
}

export default function SimpleYouTubePage() {
  const [url, setUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);

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
          summary_mode: 'bullet'
        }),
      });

      const data = await response.json();
      setResult(data);
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

  const formatTime = (seconds: number) => {
    return `${seconds.toFixed(1)} seconds${seconds > 60 ? ` (${(seconds/60).toFixed(1)} minutes)` : ''}`;
  };

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
              <Youtube className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-theme-text">Simple YouTube Processor</h1>
          </div>
          <p className="text-theme-text-muted">
            Process YouTube videos synchronously - just like the working test script!
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-theme-card rounded-lg p-6 mb-8 border border-theme-border">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium mb-2">
                YouTube URL
              </label>
              <div className="flex space-x-4">
                <input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 px-4 py-2 bg-theme-bg border border-theme-border rounded-lg 
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-theme-text"
                  disabled={processing}
                />
                <button
                  type="submit"
                  disabled={processing || !url.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 
                           text-white rounded-lg transition-colors flex items-center space-x-2"
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
            </div>
          </form>
        </div>

        {/* Processing Status */}
        {processing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 text-center">
            <div className="flex items-center justify-center space-x-2 text-blue-700">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-medium">Processing video...</span>
            </div>
            <p className="text-blue-600 text-sm mt-1">
              This may take 30-60 seconds. Please wait...
            </p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Status Header */}
            <div className={`rounded-lg p-4 border ${
              result.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center space-x-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <span className="font-medium">
                  {result.success ? 'Processing Completed Successfully!' : 'Processing Failed'}
                </span>
                <div className="flex items-center space-x-1 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(result.processing_time)}</span>
                </div>
              </div>
            </div>

            {result.success ? (
              <>
                {/* Video Info */}
                {result.title && (
                  <div className="bg-theme-card rounded-lg p-6 border border-theme-border">
                    <h2 className="text-xl font-semibold mb-2 flex items-center space-x-2">
                      <Youtube className="w-5 h-5 text-red-500" />
                      <span>Video Information</span>
                    </h2>
                    <p className="text-theme-text-muted mb-2">
                      <strong>Title:</strong> {result.title}
                    </p>
                    <p className="text-theme-text-muted text-sm">
                      <strong>URL:</strong> {result.url}
                    </p>
                  </div>
                )}

                {/* Summary */}
                {result.summary && (
                  <div className="bg-theme-card rounded-lg p-6 border border-theme-border">
                    <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <span>AI Summary</span>
                    </h2>
                    <div className="prose prose-sm max-w-none text-theme-text">
                      <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                        {result.summary}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Transcript */}
                {result.transcript && (
                  <div className="bg-theme-card rounded-lg p-6 border border-theme-border">
                    <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-green-500" />
                      <span>Full Transcript</span>
                    </h2>
                    <div className="max-h-64 overflow-y-auto bg-theme-bg rounded-lg p-4 border border-theme-border">
                      <p className="text-theme-text-muted text-sm leading-relaxed">
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

        {/* Instructions */}
        {!processing && !result && (
          <div className="bg-theme-card rounded-lg p-6 border border-theme-border">
            <h2 className="text-lg font-semibold mb-4">How to Use</h2>
            <div className="space-y-2 text-theme-text-muted">
              <p>1. Paste any YouTube URL in the input field above</p>
              <p>2. Click "Process Video" and wait (usually 30-60 seconds)</p>
              <p>3. Get complete results with transcript and AI summary</p>
              <p className="text-sm text-green-600 mt-4">
                ✅ This works synchronously like the test script - no complex polling!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}