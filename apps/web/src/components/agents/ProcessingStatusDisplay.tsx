'use client';

import React from 'react';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  MessageSquare,
  Globe,
  Video,
  Type,
  Brain,
  TrendingUp,
  Shield,
  Zap
} from 'lucide-react';

interface ProcessingStatusDisplayProps {
  isLoading: boolean;
  contentType?: 'text' | 'substack' | 'youtube';
  analysisType?: 'QUICK' | 'COMPREHENSIVE' | 'GAYED_FOCUSED';
  stage?: 'extraction' | 'validation' | 'analysis' | 'complete';
  progress?: number;
  error?: string;
  className?: string;
}

interface ProcessingStage {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  estimatedTime: number; // seconds
}

export function ProcessingStatusDisplay({
  isLoading,
  contentType = 'text',
  analysisType = 'COMPREHENSIVE',
  stage = 'extraction',
  progress = 0,
  error,
  className = ''
}: ProcessingStatusDisplayProps) {
  const getContentTypeIcon = () => {
    switch (contentType) {
      case 'text':
        return <Type className="w-5 h-5" />;
      case 'substack':
        return <Globe className="w-5 h-5" />;
      case 'youtube':
        return <Video className="w-5 h-5" />;
      default:
        return <Type className="w-5 h-5" />;
    }
  };

  const getContentTypeLabel = () => {
    switch (contentType) {
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

  const getAnalysisTypeDetails = () => {
    switch (analysisType) {
      case 'QUICK':
        return {
          label: 'Quick Analysis',
          icon: <Zap className="w-4 h-4" />,
          time: '30 seconds',
          description: 'Fast overview analysis'
        };
      case 'COMPREHENSIVE':
        return {
          label: 'Comprehensive Analysis',
          icon: <Brain className="w-4 h-4" />,
          time: '2-3 minutes',
          description: 'Deep market analysis'
        };
      case 'GAYED_FOCUSED':
        return {
          label: 'Gayed Signal Focused',
          icon: <TrendingUp className="w-4 h-4" />,
          time: '1-2 minutes',
          description: 'Enhanced with signal context'
        };
      default:
        return {
          label: 'Standard Analysis',
          icon: <Brain className="w-4 h-4" />,
          time: '1-2 minutes',
          description: 'Standard processing'
        };
    }
  };

  const getProcessingStages = (): ProcessingStage[] => {
    const baseStages: ProcessingStage[] = [
      {
        id: 'extraction',
        label: contentType === 'text' ? 'Processing Input' : 'Content Extraction',
        description: contentType === 'text'
          ? 'Validating and sanitizing input text'
          : `Extracting content from ${getContentTypeLabel().toLowerCase()}`,
        icon: getContentTypeIcon(),
        estimatedTime: contentType === 'text' ? 2 : contentType === 'substack' ? 5 : 8
      },
      {
        id: 'validation',
        label: 'Financial Relevance',
        description: 'Analyzing financial content and calculating relevance score',
        icon: <Shield className="w-5 h-5" />,
        estimatedTime: 3
      },
      {
        id: 'analysis',
        label: 'AutoGen Agent Debate',
        description: 'Running multi-agent conversation and analysis',
        icon: <MessageSquare className="w-5 h-5" />,
        estimatedTime: analysisType === 'QUICK' ? 8 : analysisType === 'COMPREHENSIVE' ? 20 : 15
      },
      {
        id: 'complete',
        label: 'Analysis Complete',
        description: 'Finalizing results and generating consensus',
        icon: <CheckCircle className="w-5 h-5" />,
        estimatedTime: 2
      }
    ];

    return baseStages;
  };

  const getCurrentStageIndex = () => {
    const stages = getProcessingStages();
    return stages.findIndex(s => s.id === stage);
  };

  const getStageStatus = (stageIndex: number) => {
    const currentIndex = getCurrentStageIndex();

    if (error) {
      return currentIndex === stageIndex ? 'error' : currentIndex > stageIndex ? 'complete' : 'pending';
    }

    if (!isLoading) {
      return 'complete';
    }

    if (currentIndex > stageIndex) {
      return 'complete';
    } else if (currentIndex === stageIndex) {
      return 'active';
    } else {
      return 'pending';
    }
  };

  const getStageIcon = (stage: ProcessingStage, status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-theme-success" />;
      case 'active':
        return <Loader2 className="w-5 h-5 text-theme-primary animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-theme-danger" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-theme-border" />;
    }
  };

  const getTotalEstimatedTime = () => {
    return getProcessingStages().reduce((total, stage) => total + stage.estimatedTime, 0);
  };

  const analysisDetails = getAnalysisTypeDetails();

  if (!isLoading && !error) {
    return null;
  }

  return (
    <div className={`bg-theme-card border border-theme-border rounded-theme p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {getContentTypeIcon()}
            <h3 className="text-lg font-semibold text-theme-text">
              {error ? 'Processing Error' : 'Processing Content'}
            </h3>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm text-theme-text-muted">
          <Clock className="w-4 h-4" />
          <span>Est. {analysisDetails.time}</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-theme-danger/10 border border-theme-danger/20 rounded-theme">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-5 h-5 text-theme-danger" />
            <span className="font-medium text-theme-danger">Processing Failed</span>
          </div>
          <p className="text-sm text-theme-text-muted">{error}</p>
        </div>
      )}

      {/* Content Type and Analysis Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-theme-card-secondary rounded-theme p-4">
          <div className="flex items-center space-x-2 mb-2">
            {getContentTypeIcon()}
            <span className="font-medium text-theme-text">Content Type</span>
          </div>
          <span className="text-sm text-theme-text-muted">{getContentTypeLabel()}</span>
        </div>
        <div className="bg-theme-card-secondary rounded-theme p-4">
          <div className="flex items-center space-x-2 mb-2">
            {analysisDetails.icon}
            <span className="font-medium text-theme-text">Analysis Mode</span>
          </div>
          <span className="text-sm text-theme-text-muted">{analysisDetails.description}</span>
        </div>
      </div>

      {/* Progress Bar */}
      {isLoading && !error && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-theme-text">
              {getProcessingStages()[getCurrentStageIndex()]?.label || 'Processing...'}
            </span>
            <span className="text-sm text-theme-text-muted">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-theme-border rounded-full h-2">
            <div
              className="bg-theme-primary h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Processing Stages */}
      <div className="space-y-4">
        {getProcessingStages().map((stageItem, index) => {
          const status = getStageStatus(index);
          return (
            <div
              key={stageItem.id}
              className={`flex items-start space-x-4 p-3 rounded-theme transition-all ${
                status === 'active'
                  ? 'bg-theme-primary/10 border border-theme-primary/20'
                  : status === 'complete'
                  ? 'bg-theme-success/5 border border-theme-success/10'
                  : status === 'error'
                  ? 'bg-theme-danger/10 border border-theme-danger/20'
                  : 'bg-theme-card-secondary border border-transparent'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getStageIcon(stageItem, status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${
                    status === 'complete' ? 'text-theme-success' :
                    status === 'active' ? 'text-theme-primary' :
                    status === 'error' ? 'text-theme-danger' :
                    'text-theme-text-muted'
                  }`}>
                    {stageItem.label}
                  </h4>
                  <span className="text-xs text-theme-text-muted">
                    ~{stageItem.estimatedTime}s
                  </span>
                </div>
                <p className="text-xs text-theme-text-muted mt-1">
                  {stageItem.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Agent Activity Indicator */}
      {isLoading && stage === 'analysis' && !error && (
        <div className="mt-6 p-4 bg-theme-primary/5 border border-theme-primary/10 rounded-theme">
          <div className="flex items-center space-x-3 mb-3">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-theme-primary" />
              <span className="font-medium text-theme-text">AutoGen Agents Active</span>
            </div>
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-theme-primary rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
          <div className="text-sm text-theme-text-muted space-y-1">
            <div>• Financial Analyst: Analyzing market signals and trends</div>
            <div>• Market Context: Providing broader market perspective</div>
            <div>• Risk Challenger: Evaluating potential risks and uncertainties</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProcessingStatusDisplay;