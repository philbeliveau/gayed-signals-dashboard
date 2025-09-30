/**
 * ConversationStarter Component
 * Story 1.8: Multi-Agent Conversation Input Component
 *
 * Component for initiating AutoGen conversations with content input
 */

import React, { useState } from 'react';
import { MessageSquare, Upload, Link, FileText, Play, Loader2 } from 'lucide-react';
import type { ContentSource } from '../types/conversation';
import type { ConsensusSignal } from '../../trading-signals/types/index';

interface ConversationStarterProps {
  onStartConversation: (content: ContentSource, signalContext?: ConsensusSignal) => void;
  isLoading: boolean;
  signalContext?: ConsensusSignal;
}

type ContentType = 'text' | 'url' | 'file';

interface ContentForm {
  type: ContentType;
  title: string;
  content: string;
  url?: string;
}

const CONTENT_TYPE_CONFIGS = {
  text: {
    label: 'Direct Text',
    icon: <FileText className="h-4 w-4" />,
    description: 'Paste financial content directly',
    placeholder: 'Enter financial content, market analysis, or investment thesis to debate...'
  },
  url: {
    label: 'URL/Article',
    icon: <Link className="h-4 w-4" />,
    description: 'Provide URL to analyze',
    placeholder: 'Enter URL to financial article, Substack post, or news content...'
  },
  file: {
    label: 'File Upload',
    icon: <Upload className="h-4 w-4" />,
    description: 'Upload document for analysis',
    placeholder: 'Upload PDF, text file, or document for analysis...'
  }
};

const SAMPLE_CONTENT = [
  {
    title: "Fed Rate Policy Analysis",
    content: "The Federal Reserve is signaling a dovish pivot with potential rate cuts in 2024. Current unemployment at 3.7% and inflation trending toward 2% target suggest policy accommodation may be appropriate. However, geopolitical tensions and energy price volatility create uncertainty for monetary policy decisions.",
    type: 'text' as ContentType
  },
  {
    title: "Market Volatility Concerns",
    content: "Recent VIX readings above 20 indicate elevated market stress. The 10-year Treasury yield inversion has historically preceded recessions. Technology sector valuations remain elevated despite recent corrections. Defensive positioning may be warranted given macro uncertainty.",
    type: 'text' as ContentType
  },
  {
    title: "Dollar Strength Impact",
    content: "The US Dollar Index (DXY) strength above 105 is creating headwinds for emerging markets and commodities. Export-dependent companies face margin pressure from currency translation effects. Dollar strength typically correlates with risk-off sentiment and defensive positioning.",
    type: 'text' as ContentType
  }
];

export function ConversationStarter({
  onStartConversation,
  isLoading,
  signalContext
}: ConversationStarterProps) {
  const [contentForm, setContentForm] = useState<ContentForm>({
    type: 'text',
    title: '',
    content: '',
    url: ''
  });

  const [showSamples, setShowSamples] = useState(false);

  const handleInputChange = (field: keyof ContentForm, value: string) => {
    setContentForm(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (type: ContentType) => {
    setContentForm(prev => ({
      ...prev,
      type,
      title: '',
      content: '',
      url: ''
    }));
  };

  const handleSampleSelect = (sample: typeof SAMPLE_CONTENT[0]) => {
    setContentForm({
      type: sample.type,
      title: sample.title,
      content: sample.content,
      url: ''
    });
    setShowSamples(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!contentForm.title.trim() || (!contentForm.content.trim() && !contentForm.url?.trim())) {
      return;
    }

    const contentSource: ContentSource = {
      type: contentForm.type,
      title: contentForm.title.trim(),
      content: contentForm.content.trim() || contentForm.url?.trim() || '',
      url: contentForm.url?.trim() || undefined,
      metadata: {
        submittedAt: new Date().toISOString()
      }
    };

    onStartConversation(contentSource, signalContext);
  };

  const canSubmit = contentForm.title.trim() &&
    (contentForm.content.trim() || contentForm.url?.trim()) &&
    !isLoading;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Start Agent Conversation</h2>
          <button
            onClick={() => setShowSamples(!showSamples)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showSamples ? 'Hide' : 'Show'} Samples
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Provide financial content for the three AutoGen agents to debate and analyze
        </p>
      </div>

      {/* Sample Content */}
      {showSamples && (
        <div className="border-b border-gray-200 p-4 bg-blue-50">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Sample Content</h3>
          <div className="grid gap-3">
            {SAMPLE_CONTENT.map((sample, index) => (
              <button
                key={index}
                onClick={() => handleSampleSelect(sample)}
                className="text-left p-3 bg-white border border-blue-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <h4 className="font-medium text-blue-900 text-sm">{sample.title}</h4>
                <p className="text-xs text-blue-700 mt-1 line-clamp-2">{sample.content}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Content Type Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">Content Type</label>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(CONTENT_TYPE_CONFIGS).map(([type, config]) => (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeChange(type as ContentType)}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  contentForm.type === type
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  {config.icon}
                  <span className="font-medium text-sm">{config.label}</span>
                </div>
                <p className="text-xs opacity-75">{config.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Title Input */}
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-gray-900 mb-2">
            Content Title
          </label>
          <input
            type="text"
            id="title"
            value={contentForm.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Enter a descriptive title for the content..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Content Input */}
        {contentForm.type === 'text' && (
          <div>
            <label htmlFor="content" className="block text-sm font-semibold text-gray-900 mb-2">
              Financial Content
            </label>
            <textarea
              id="content"
              value={contentForm.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder={CONTENT_TYPE_CONFIGS.text.placeholder}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Characters: {contentForm.content.length} (minimum 50 recommended)
            </p>
          </div>
        )}

        {contentForm.type === 'url' && (
          <div>
            <label htmlFor="url" className="block text-sm font-semibold text-gray-900 mb-2">
              Content URL
            </label>
            <input
              type="url"
              id="url"
              value={contentForm.url || ''}
              onChange={(e) => handleInputChange('url', e.target.value)}
              placeholder={CONTENT_TYPE_CONFIGS.url.placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              The agents will analyze the content from this URL
            </p>
          </div>
        )}

        {contentForm.type === 'file' && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Upload Document
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">File upload coming soon</p>
              <p className="text-xs text-gray-500">Will support PDF, TXT, and DOCX files</p>
            </div>
          </div>
        )}

        {/* Signal Context Display */}
        {signalContext && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Current Signal Context</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Consensus:</span>
                <span className={`ml-2 font-medium ${
                  signalContext.consensus === 'Risk-On' ? 'text-green-600' :
                  signalContext.consensus === 'Risk-Off' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {signalContext.consensus}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Confidence:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {Math.round(signalContext.confidence * 100)}%
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This signal context will be provided to agents for additional market context
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`inline-flex items-center space-x-2 px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm ${
              canSubmit
                ? 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
                : 'text-gray-400 bg-gray-100 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span>{isLoading ? 'Starting Conversation...' : 'Start Agent Debate'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}