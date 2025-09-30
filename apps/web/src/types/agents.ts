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
    signalContext?: Record<string, unknown>;
  };
}

// Live conversation types for WebSocket streaming
export type ConversationStatus = 'initializing' | 'active' | 'completed' | 'error';

export interface DataSource {
  source: string;
  url: string;
  timestamp: string;
  authenticated: boolean;
}

export interface DataIntegrity {
  validated: boolean;
  sources: string[];
  lastValidated: string;
  checksum: string;
}

export interface FactCheckDetails {
  claim: string;
  verified: boolean;
  sources: string[];
  confidence: number;
}

export interface LinkValidation {
  url: string;
  accessible: boolean;
  httpsSecure: boolean;
  domainVerified: boolean;
  lastChecked: string;
}

export interface SAFLAValidation {
  sourceAuthenticated: boolean;
  factValidated: boolean;
  linkVerified: boolean;
  authorityConfirmed: boolean;
  score: number;
  factCheckDetails?: FactCheckDetails;
  linkValidation?: LinkValidation;
}

export interface LiveConversationMessage {
  id: string;
  sessionId: string;
  agent: string;
  content: string;
  timestamp: number;
  confidence?: number;
  metadata?: Record<string, unknown>;
  // Financial data integrity fields
  dataSources?: DataSource[];
  dataIntegrity?: DataIntegrity;
  saflaValidation?: SAFLAValidation;
}

export interface ConversationResult {
  consensusReached: boolean;
  finalRecommendation: string;
  confidenceLevel: number;
  keyInsights: string[];
  processingMetrics?: {
    totalTime: number;
    messageCount: number;
    averageConfidence: number;
  };
}

export interface WebSocketMessage {
  type: 'agent-message' | 'conversation-status' | 'conversation-complete' | 'error' | 'heartbeat';
  data?: Record<string, unknown>;
  timestamp: number;
  sessionId?: string;
}