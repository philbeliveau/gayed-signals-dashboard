'use client';

import React, { useState, useCallback } from 'react';
import { MessageSquare, Send, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { ContentCard } from '../layout/ProfessionalLayout';

interface DirectTextInputProps {
  onSubmit: (content: string, analysisType: AnalysisType) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

type AnalysisType = 'QUICK' | 'COMPREHENSIVE' | 'GAYED_FOCUSED';

interface ValidationState {
  isValid: boolean;
  message: string;
  type: 'success' | 'warning' | 'error';
}

export function DirectTextInput({
  onSubmit,
  isLoading = false,
  className = ''
}: DirectTextInputProps) {
  const [content, setContent] = useState('');
  const [analysisType, setAnalysisType] = useState<AnalysisType>('COMPREHENSIVE');
  const [validation, setValidation] = useState<ValidationState>({
    isValid: false,
    message: 'Enter financial content to begin analysis',
    type: 'warning'
  });

  const MAX_LENGTH = 10000;
  const MIN_LENGTH = 50;

  const validateContent = useCallback((text: string): ValidationState => {
    if (text.length === 0) {
      return {
        isValid: false,
        message: 'Enter financial content to begin analysis',
        type: 'warning'
      };
    }

    if (text.length < MIN_LENGTH) {
      return {
        isValid: false,
        message: `Content too short. Minimum ${MIN_LENGTH} characters required for meaningful analysis.`,
        type: 'error'
      };
    }

    if (text.length > MAX_LENGTH) {
      return {
        isValid: false,
        message: `Content too long. Maximum ${MAX_LENGTH} characters allowed.`,
        type: 'error'
      };
    }

    // Basic financial relevance check (simplified for now)
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
  }, []);

  const handleContentChange = useCallback((value: string) => {
    setContent(value);
    setValidation(validateContent(value));
  }, [validateContent]);

  const handleSubmit = useCallback(async () => {
    if (!validation.isValid || isLoading) return;

    try {
      await onSubmit(content, analysisType);
      setContent('');
      setValidation({
        isValid: false,
        message: 'Enter financial content to begin analysis',
        type: 'warning'
      });
    } catch (error) {
      console.error('Failed to submit content:', error);
    }
  }, [content, analysisType, validation.isValid, isLoading, onSubmit]);

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

  return (
    <ContentCard
      title="Direct Text Analysis"
      subtitle="Paste financial content for AutoGen agent debate and analysis"
      className={className}
    >
      <div className="space-y-4">
        {/* Analysis Type Selection */}
        <div>
          <label className="block text-sm font-medium text-theme-text mb-2">
            Analysis Type
          </label>
          <select
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value as AnalysisType)}
            className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-bg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent"
            disabled={isLoading}
          >
            <option value="QUICK">Quick Analysis (30 seconds)</option>
            <option value="COMPREHENSIVE">Comprehensive Analysis (2-3 minutes)</option>
            <option value="GAYED_FOCUSED">Gayed Signal Focused (Enhanced with signal context)</option>
          </select>
        </div>

        {/* Text Input Area */}
        <div>
          <label className="block text-sm font-medium text-theme-text mb-2">
            Financial Content
          </label>
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Paste research reports, market commentary, earnings analysis, or any financial content here for AutoGen agent analysis..."
            className="w-full h-48 px-4 py-3 border border-theme-border rounded-theme bg-theme-bg text-theme-text placeholder-theme-text-muted focus:ring-2 focus:ring-theme-primary focus:border-transparent resize-y"
            disabled={isLoading}
          />

          {/* Character Count and Validation */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-2">
              {getValidationIcon()}
              <span className={`text-sm ${getValidationColor()}`}>
                {validation.message}
              </span>
            </div>
            <span className="text-sm text-theme-text-muted">
              {content.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-theme-border">
          <div className="flex items-center space-x-2 text-sm text-theme-text-muted">
            <FileText className="w-4 h-4" />
            <span>Content will trigger AutoGen agent debate</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!validation.isValid || isLoading}
            className="inline-flex items-center px-6 py-2 bg-theme-primary text-white rounded-theme hover:bg-theme-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Analyzing...
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4 mr-2" />
                Start Analysis
              </>
            )}
          </button>
        </div>
      </div>
    </ContentCard>
  );
}

export default DirectTextInput;