/**
 * AutoGen Conversation Types
 * Story 1.8: Multi-Agent Conversation Type Definitions
 *
 * Defines types for AutoGen agent conversations separate from signal processing
 */

/**
 * Conversation status throughout the debate lifecycle
 */
export type ConversationStatus =
  | 'initializing'    // Setting up AutoGen agents
  | 'active'          // Agents are debating
  | 'generating_consensus' // Final consensus generation
  | 'completed'       // Debate finished successfully
  | 'failed'          // Conversation failed
  | 'timeout';        // Exceeded 90-second limit

/**
 * Agent message types in the conversation
 */
export type AgentMessageType =
  | 'analysis'        // Financial/market analysis
  | 'context'         // Market context addition
  | 'challenge'       // Risk challenge or counterpoint
  | 'consensus'       // Final consensus statement
  | 'question'        // Question to another agent
  | 'response';       // Response to another agent's question

/**
 * Content source that triggers the conversation
 */
export interface ContentSource {
  type: 'text' | 'youtube' | 'substack' | 'article' | 'manual';
  title: string;
  content: string;
  url?: string;
  author?: string;
  publishDate?: Date;
  metadata?: Record<string, any>;
}

/**
 * Individual agent message in the conversation
 */
export interface AgentMessage {
  id: string;
  agentId: string;           // 'financial_analyst' | 'market_context' | 'risk_challenger'
  agentName: string;         // Human-readable agent name
  content: string;           // The agent's message content
  messageType: AgentMessageType;
  confidence: number;        // 0-100 confidence in their analysis
  timestamp: Date;
  metadata?: {
    referencedData?: string[];    // Data sources referenced
    signalContext?: any;          // Signal data used
    responseToMessageId?: string; // If responding to another agent
    keyPoints?: string[];         // Extracted key points
  };
}

/**
 * Conversation consensus (different from signal consensus)
 */
export interface ConversationConsensus {
  decision: string;          // Final decision/recommendation
  confidence: number;        // Overall confidence (0-100)
  reasoning: string;         // Explanation of the decision
  keyPoints: string[];       // Main points from the debate
  agentAgreement: Record<string, any>; // Agreement levels per agent
  timestamp: Date;
}

/**
 * Conversation performance metrics
 */
export interface ConversationMetrics {
  startTime: number;         // Unix timestamp
  messageCount: number;      // Total messages exchanged
  averageResponseTime: number; // Average time between messages (ms)
  consensusReached: boolean; // Whether consensus was achieved
  timeToConsensus: number | null; // Time to reach consensus (ms)
}

/**
 * Full conversation record
 */
export interface AgentConversation {
  id: string;
  status: ConversationStatus;
  contentSource: ContentSource;
  signalContext?: any;       // Optional signal context for reference
  agents: string[];          // List of participating agent IDs
  messages: AgentMessage[];  // All conversation messages
  consensus?: ConversationConsensus; // Final consensus if reached
  metrics: ConversationMetrics;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;           // User who initiated (for auth)
  exportFormats?: string[];  // Available export formats
}

/**
 * Type alias for backward compatibility
 */
export type ConversationSession = AgentConversation;

/**
 * Real-time conversation events
 */
export interface ConversationEvent {
  type: 'message' | 'status_change' | 'consensus_reached' | 'error';
  sessionId: string;
  timestamp: Date;
  data: any;
}

/**
 * Conversation export options
 */
export interface ConversationExport {
  format: 'json' | 'pdf' | 'markdown' | 'csv';
  includeMetrics: boolean;
  includeSignalContext: boolean;
  anonymizeAgents: boolean;
}

/**
 * AutoGen agent configuration
 */
export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  systemMessage: string;
  model: string;
  temperature: number;
  maxTokens: number;
  specialization: 'financial' | 'context' | 'risk';
}

/**
 * Conversation orchestration config
 */
export interface ConversationOrchestrationConfig {
  maxMessages: number;
  timeoutSeconds: number;
  requiredAgents: string[];
  consensusThreshold: number;
  enableInterruptions: boolean;
  enableQuestions: boolean;
}

/**
 * Backend AutoGen conversation request
 */
export interface AutoGenConversationRequest {
  session_id: string;
  content_source: ContentSource;
  signal_context?: any;
  agents: string[];
  config: ConversationOrchestrationConfig;
}

/**
 * Backend AutoGen conversation response
 */
export interface AutoGenConversationResponse {
  session_id: string;
  status: ConversationStatus;
  websocket_url: string;
  estimated_duration_seconds: number;
}

/**
 * WebSocket message format for real-time updates
 */
export interface ConversationWebSocketMessage {
  type: 'agent_message' | 'status_update' | 'consensus_ready' | 'error';
  session_id: string;
  timestamp: string;
  data: {
    agent_id?: string;
    agent_name?: string;
    content?: string;
    message_type?: AgentMessageType;
    confidence?: number;
    status?: ConversationStatus;
    consensus?: ConversationConsensus;
    error?: string;
    metadata?: Record<string, any>;
  };
}

/**
 * Conversation analytics
 */
export interface ConversationAnalytics {
  totalConversations: number;
  averageDuration: number;
  consensusSuccessRate: number;
  mostActiveAgent: string;
  averageMessagesPerConversation: number;
  topicDistribution: Record<string, number>;
  confidenceDistribution: {
    low: number;    // 0-40%
    medium: number; // 41-70%
    high: number;   // 71-100%
  };
}

/**
 * Error types specific to conversations
 */
export interface ConversationError {
  type: 'agent_failure' | 'timeout' | 'connection_error' | 'consensus_failure';
  message: string;
  agentId?: string;
  timestamp: Date;
  recoverable: boolean;
}