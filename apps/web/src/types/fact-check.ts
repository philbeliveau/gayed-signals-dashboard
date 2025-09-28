/**
 * Fact-checking Types and Interfaces
 * 
 * Type definitions for the fact-checking agent system
 */

export type AgentType = 'ACADEMIC' | 'FINANCIAL' | 'GOVERNMENT' | 'NEWS' | 'SOCIAL' | 'BASE';

export type VeracityLevel = 
  | 'TRUE'
  | 'MOSTLY_TRUE'
  | 'PARTIALLY_TRUE'
  | 'MOSTLY_FALSE'
  | 'FALSE'
  | 'UNVERIFIED'
  | 'DISPUTED';

export interface ExtractedClaim {
  id: string;
  text: string;
  category: string;
  confidence: number;
  extractedAt: string;
  source?: string;
  metadata?: Record<string, any>;
  // Additional properties used by agents
  claimText?: string;
}

export interface SourceEvidence {
  url: string;
  title: string;
  content: string;
  author?: string;
  publishedAt?: string;
  credibilityScore: number;
  relevanceScore: number;
  source: string;
  metadata?: Record<string, any>;
}

export interface Investigation {
  id: string;
  claimId: string;
  agentType: AgentType;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  veracity?: VeracityLevel;
  confidence?: number;
  evidence?: SourceEvidence[];
  reasoning?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
  // Additional properties used by academic agent
  sourcesSearched?: string[];
  evidenceFound?: any[];
  conclusion?: string;
  confidenceScore?: number;
  mcpUsed?: string[];
  processingTimeMs?: number;
  saflaCompliant?: boolean;
  createdAt?: Date;
}

export interface McpResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface FactCheckResult {
  claimId: string;
  veracity: VeracityLevel;
  confidence: number;
  evidence: SourceEvidence[];
  reasoning: string;
  agentType: AgentType;
  timestamp: string;
}

export interface FactCheckSession {
  id: string;
  claims: ExtractedClaim[];
  investigations: Investigation[];
  results: FactCheckResult[];
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  completedAt?: string;
}