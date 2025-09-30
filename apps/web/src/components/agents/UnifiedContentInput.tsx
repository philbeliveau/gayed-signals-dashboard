'use client';

import React, { useState, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  FileText,
  AlertCircle,
  CheckCircle,
  Globe,
  Video,
  Type,
  Clock,
  Zap,
  Brain
} from 'lucide-react';
import { ContentCard } from '../layout/ProfessionalLayout';
import { AnalysisType, TextAnalysisResponse } from '../../types/agents';

interface UnifiedContentInputProps {
  onSubmit: (content: string, analysisType: AnalysisType, contentType?: ContentType) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

type ContentType = 'text' | 'substack' | 'youtube';

interface ValidationState {
  isValid: boolean;
  message: string;
  type: 'success' | 'warning' | 'error';
}

interface ContentInput {
  text: string;
  substack: string;
  youtube: string;
}

export function UnifiedContentInput({
  onSubmit,
  isLoading = false,
  className = ''
}: UnifiedContentInputProps) {
  const [activeTab, setActiveTab] = useState<ContentType>('text');
  const [content, setContent] = useState<ContentInput>({
    text: '',
    substack: '',
    youtube: ''
  });
  const [analysisType, setAnalysisType] = useState<AnalysisType>('COMPREHENSIVE');
  const [validation, setValidation] = useState<ValidationState>({
    isValid: false,
    message: 'Enter financial content to begin analysis',
    type: 'warning'
  });

  const MAX_TEXT_LENGTH = 10000;
  const MIN_TEXT_LENGTH = 50;

  const validateContent = useCallback((inputContent: string, type: ContentType): ValidationState => {
    if (inputContent.length === 0) {
      return {
        isValid: false,
        message: getEmptyMessage(type),
        type: 'warning'
      };
    }

    switch (type) {
      case 'text':
        return validateDirectText(inputContent);
      case 'substack':
        return validateSubstackUrl(inputContent);
      case 'youtube':
        return validateYouTubeUrl(inputContent);
      default:
        return {
          isValid: false,
          message: 'Invalid content type',
          type: 'error'
        };
    }
  }, []);

  const validateDirectText = (text: string): ValidationState => {
    if (text.length < MIN_TEXT_LENGTH) {
      return {
        isValid: false,
        message: `Content too short. Minimum ${MIN_TEXT_LENGTH} characters required for meaningful analysis.`,
        type: 'error'
      };
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return {
        isValid: false,
        message: `Content too long. Maximum ${MAX_TEXT_LENGTH} characters allowed.`,
        type: 'error'
      };
    }

    // Basic financial relevance check
    const financialKeywords = [
      'market', 'stock', 'bond', 'investment', 'trading', 'price', 'return',
      'portfolio', 'risk', 'financial', 'economic', 'fed', 'interest', 'rate',
      'equity', 'etf', 'fund', 'sector', 'earnings', 'revenue', 'volatility'
    ];

    const lowerText = text.toLowerCase();
    const hasFinancialContent = financialKeywords.some(keyword =>
      lowerText.includes(keyword)
    );

    if (!hasFinancialContent) {
      return {
        isValid: false,
        message: 'Content should be financial or market-related for optimal analysis.',
        type: 'warning'
      };
    }

    return {
      isValid: true,
      message: 'Content ready for AutoGen agent analysis',
      type: 'success'
    };
  };

  const validateSubstackUrl = (url: string): ValidationState => {
    try {
      const urlObj = new URL(url);

      if (!urlObj.hostname.includes('substack.com')) {
        return {
          isValid: false,
          message: 'Please enter a valid Substack article URL',
          type: 'error'
        };
      }

      if (!urlObj.pathname.includes('/p/')) {
        return {
          isValid: false,
          message: 'URL should be a Substack article (containing /p/)',
          type: 'error'
        };
      }

      return {
        isValid: true,
        message: 'Substack URL ready for content extraction and analysis',
        type: 'success'
      };
    } catch {
      return {
        isValid: false,
        message: 'Please enter a valid URL format',
        type: 'error'
      };
    }
  };

  const validateYouTubeUrl = (url: string): ValidationState => {
    try {
      const urlObj = new URL(url);

      if (!urlObj.hostname.includes('youtube.com') && !urlObj.hostname.includes('youtu.be')) {
        return {
          isValid: false,
          message: 'Please enter a valid YouTube video URL',
          type: 'error'
        };
      }

      // Check for video ID presence
      const hasVideoId = urlObj.searchParams.get('v') || urlObj.pathname.includes('/');

      if (!hasVideoId) {
        return {
          isValid: false,
          message: 'YouTube URL should contain a valid video ID',
          type: 'error'
        };
      }

      return {
        isValid: true,
        message: 'YouTube URL ready for transcript extraction and analysis',
        type: 'success'
      };
    } catch {
      return {
        isValid: false,
        message: 'Please enter a valid URL format',
        type: 'error'
      };
    }
  };

  const getEmptyMessage = (type: ContentType): string => {
    switch (type) {
      case 'text':
        return 'Enter financial content to begin analysis';
      case 'substack':
        return 'Enter a Substack article URL for content extraction';
      case 'youtube':
        return 'Enter a YouTube video URL for transcript analysis';
      default:
        return 'Enter content to begin analysis';
    }
  };

  const handleContentChange = useCallback((value: string, type: ContentType) => {
    setContent(prev => ({ ...prev, [type]: value }));
    setValidation(validateContent(value, type));
  }, [validateContent]);

  const handleTabChange = useCallback((newTab: ContentType) => {
    setActiveTab(newTab);
    const currentContent = content[newTab];
    setValidation(validateContent(currentContent, newTab));
  }, [content, validateContent]);

  const handleSubmit = useCallback(async () => {
    if (!validation.isValid || isLoading) return;

    const currentContent = content[activeTab];

    try {
      await onSubmit(currentContent, analysisType, activeTab);

      // Clear current tab content after successful submission
      setContent(prev => ({ ...prev, [activeTab]: '' }));
      setValidation({
        isValid: false,
        message: getEmptyMessage(activeTab),
        type: 'warning'
      });
    } catch (error) {
      console.error('Failed to submit content:', error);
    }
  }, [content, activeTab, analysisType, validation.isValid, isLoading, onSubmit]);

  const getValidationIcon = () => {
    switch (validation.type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-theme-success" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-theme-danger" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-theme-warning" />;
      default:
        return null;
    }
  };

  const getValidationColor = () => {
    switch (validation.type) {
      case 'success':
        return 'text-theme-success';
      case 'error':
        return 'text-theme-danger';
      case 'warning':
        return 'text-theme-warning';
      default:
        return 'text-theme-text-muted';
    }
  };

  const getTabIcon = (type: ContentType) => {
    switch (type) {
      case 'text':
        return <Type className="w-4 h-4" />;
      case 'substack':
        return <Globe className="w-4 h-4" />;
      case 'youtube':
        return <Video className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getTabLabel = (type: ContentType) => {
    switch (type) {
      case 'text':
        return 'Direct Text';
      case 'substack':
        return 'Substack Article';
      case 'youtube':
        return 'YouTube Video';
      default:
        return 'Content';
    }
  };

  const getPlaceholder = (type: ContentType) => {
    switch (type) {
      case 'text':
        return 'Paste research reports, market commentary, earnings analysis, or any financial content here for AutoGen agent analysis...';
      case 'substack':
        return 'https://example.substack.com/p/market-analysis-report';
      case 'youtube':
        return 'https://www.youtube.com/watch?v=example_video_id';
      default:
        return 'Enter content here...';
    }
  };

  const getAnalysisTypeIcon = (type: AnalysisType) => {
    switch (type) {
      case 'QUICK':
        return <Zap className="w-4 h-4" />;
      case 'COMPREHENSIVE':
        return <Brain className="w-4 h-4" />;
      case 'GAYED_FOCUSED':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getAnalysisDescription = (type: AnalysisType) => {
    switch (type) {
      case 'QUICK':
        return '30 seconds - Fast overview analysis';
      case 'COMPREHENSIVE':
        return '2-3 minutes - Deep market analysis';
      case 'GAYED_FOCUSED':
        return 'Enhanced with current signal context';
      default:
        return 'Standard analysis';
    }
  };

  return (
    <ContentCard
      title="Unified Content Analysis"
      subtitle="Analyze any financial content with AutoGen agent debates"
      className={className}
    >
      <div className="space-y-6">
        {/* Content Type Tabs */}
        <div className="border-b border-theme-border">
          <nav className="-mb-px flex space-x-8">
            {(['text', 'substack', 'youtube'] as ContentType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-theme-primary text-theme-primary'
                    : 'border-transparent text-theme-text-muted hover:text-theme-text hover:border-theme-border'
                }`}
                disabled={isLoading}
              >
                <div className="flex items-center space-x-2">
                  {getTabIcon(tab)}
                  <span>{getTabLabel(tab)}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Analysis Type Selection */}
        <div>
          <label className="block text-sm font-medium text-theme-text mb-3">
            Analysis Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(['QUICK', 'COMPREHENSIVE', 'GAYED_FOCUSED'] as AnalysisType[]).map((type) => (
              <button
                key={type}
                onClick={() => setAnalysisType(type)}
                disabled={isLoading}
                className={`flex items-center space-x-3 p-4 border rounded-theme transition-all ${
                  analysisType === type
                    ? 'border-theme-primary bg-theme-primary/10 text-theme-primary'
                    : 'border-theme-border bg-theme-card-secondary text-theme-text hover:border-theme-border-hover'
                }`}
              >
                {getAnalysisTypeIcon(type)}
                <div className="text-left">
                  <div className="font-medium text-sm">{type.replace('_', ' ')}</div>
                  <div className="text-xs opacity-75">{getAnalysisDescription(type)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content Input Area */}
        <div>
          <label className="block text-sm font-medium text-theme-text mb-2">
            {getTabLabel(activeTab)} Content
          </label>

          {activeTab === 'text' ? (
            <div>
              <textarea
                value={content.text}
                onChange={(e) => handleContentChange(e.target.value, 'text')}
                placeholder={getPlaceholder('text')}
                className="w-full h-48 px-4 py-3 border border-theme-border rounded-theme bg-theme-bg text-theme-text placeholder-theme-text-muted focus:ring-2 focus:ring-theme-primary focus:border-transparent resize-y"
                disabled={isLoading}
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-2">
                  {getValidationIcon()}
                  <span className={`text-sm ${getValidationColor()}`}>
                    {validation.message}
                  </span>
                </div>
                <span className="text-sm text-theme-text-muted">
                  {content.text.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <input
                type="url"
                value={content[activeTab]}
                onChange={(e) => handleContentChange(e.target.value, activeTab)}
                placeholder={getPlaceholder(activeTab)}
                className="w-full px-4 py-3 border border-theme-border rounded-theme bg-theme-bg text-theme-text placeholder-theme-text-muted focus:ring-2 focus:ring-theme-primary focus:border-transparent"
                disabled={isLoading}
              />
              <div className="flex items-center space-x-2 mt-2">
                {getValidationIcon()}
                <span className={`text-sm ${getValidationColor()}`}>
                  {validation.message}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Feature Information */}
        <div className="bg-theme-card-secondary border border-theme-border rounded-theme p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-theme-primary" />
              <span className="text-theme-text">AutoGen Agent Debates</span>
            </div>
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-theme-success" />
              <span className="text-theme-text">Signal Context Integration</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-theme-warning" />
              <span className="text-theme-text">Real-time Processing</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-theme-border">
          <div className="flex items-center space-x-2 text-sm text-theme-text-muted">
            <FileText className="w-4 h-4" />
            <span>
              {activeTab === 'text'
                ? 'Content will trigger AutoGen agent debate'
                : `${getTabLabel(activeTab)} will be extracted and analyzed by AutoGen agents`
              }
            </span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!validation.isValid || isLoading}
            className="inline-flex items-center px-6 py-3 bg-theme-primary text-white rounded-theme hover:bg-theme-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-3"></div>
                Processing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Start Analysis
              </>
            )}
          </button>
        </div>
      </div>
    </ContentCard>
  );
}

export default UnifiedContentInput;