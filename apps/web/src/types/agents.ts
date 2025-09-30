// AutoGen agent types for direct text input and analysis

export type AnalysisType = 'QUICK' | 'COMPREHENSIVE' | 'GAYED_FOCUSED';

export interface TextAnalysisRequest {
  content: string;
  userId: string;
  analysisType: AnalysisType;
  includeSignalContext: boolean;
}

export interface AgentMessage {
  id: string;
  agentName: string;
  agentType: 'FINANCIAL_ANALYST' | 'MARKET_CONTEXT' | 'RISK_CHALLENGER';
  role: string;
  message: string;
  timestamp: string;
  confidence?: number;
}

export interface FinancialCategory {
  category: string;
  relevance: number;
  keywords: string[];
}

export interface TextAnalysisResponse {
  success: boolean;
  data?: {
    textId: string;
    relevanceScore: number;
    financialCategories: FinancialCategory[];
    autoGenConversation: {
      conversationId: string;
      agentResponses: AgentMessage[];
      consensus: string;
      confidenceScore: number;
    };
    processingMetrics: {
      validationTime: number;
      conversationTime: number;
      totalProcessingTime: number;
    };
  };
  error?: string;
}

export interface TextSecurityValidation {
  maxLength: 10000;
  allowedFormats: ['plain-text', 'markdown'];
  blockedPatterns: RegExp[];
  contentFiltering: {
    profanityFilter: boolean;
    spamDetection: boolean;
    phishingDetection: boolean;
  };
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedText: string;
  issues?: string[];
}

export interface ConversationSession {
  id: string;
  userId: string;
  contentSource: 'text' | 'youtube' | 'substack';
  status: 'initialized' | 'processing' | 'completed' | 'error';
  messages: AgentMessage[];
  createdAt: string;
  updatedAt: string;
  metadata?: {
    originalContent?: string;
    processingTime?: number;
    signalContext?: any;
  };
}