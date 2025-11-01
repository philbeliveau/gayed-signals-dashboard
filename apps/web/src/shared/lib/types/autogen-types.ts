/**
 * TypeScript types for AutoGen agent conversations.
 *
 * These types mirror the Pydantic models from the FastAPI backend
 * to ensure type safety across the full stack.
 */

// Enums
export enum ConversationStatus {
  INITIALIZED = 'initialized',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

export enum AgentType {
  FINANCIAL_ANALYST = 'financial_analyst',
  MARKET_CONTEXT = 'market_context',
  RISK_CHALLENGER = 'risk_challenger'
}

export enum ContentSourceType {
  TEXT = 'text',
  SUBSTACK_ARTICLE = 'substack_article',
  YOUTUBE_VIDEO = 'youtube_video',
  MARKET_REPORT = 'market_report',
  NEWS_ARTICLE = 'news_article'
}

// Core types
export interface ContentSource {
  type: ContentSourceType;
  title: string;
  content: string;
  url?: string;
  author?: string;
  published_at?: Date;
  metadata: Record<string, any>;
}

export interface AgentMessage {
  id: string;
  agent_type: AgentType;
  agent_name: string;
  content: string;
  confidence_level?: number;
  cited_sources: string[];
  signal_references: string[];
  timestamp: Date;
  message_order: number;
  metadata: Record<string, any>;
}

export interface ConversationSession {
  id: string;
  user_id: string;
  content_source: ContentSource;
  status: ConversationStatus;
  messages: AgentMessage[];
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  consensus_reached: boolean;
  final_recommendation?: string;
  confidence_score?: number;
  metadata: Record<string, any>;
}

// API Request/Response types
export interface ConversationCreateRequest {
  content: ContentSource;
  user_id: string;
  auto_start?: boolean;
  custom_prompt?: string;
}

export interface ConversationResponse {
  conversation_id: string;
  status: ConversationStatus;
  created_at: Date;
  content_source: ContentSource;
  message: string;
}

export interface AgentDebateState {
  conversation_id: string;
  status: ConversationStatus;
  current_round: number;
  max_rounds: number;
  agents_participated: AgentType[];
  last_speaker?: AgentType;
  next_speaker?: AgentType;
  debate_started_at?: Date;
  debate_completed_at?: Date;
}

export interface ConversationExport {
  conversation_id: string;
  title: string;
  content_source: ContentSource;
  export_format: 'markdown' | 'json' | 'summary';
  content: string | Record<string, any>;
  agents_summary: Record<AgentType, string>;
  key_insights: string[];
  final_recommendation?: string;
  confidence_score?: number;
  exported_at: Date;
}

// WebSocket types
export type WebSocketMessageType = 'agent_message' | 'status_update' | 'error' | 'debate_complete';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  conversation_id: string;
  data: AgentMessage | AgentDebateState | Record<string, any>;
  timestamp: Date;
}

// Analytics and metrics
export interface AgentPerformanceMetrics {
  agent_type: AgentType;
  total_messages: number;
  average_response_time: number;
  confidence_scores: number[];
  error_count: number;
  last_active?: Date;
  average_confidence: number;
}

export interface ConversationAnalytics {
  conversation_id: string;
  total_duration_seconds?: number;
  total_messages: number;
  agent_metrics: Record<AgentType, AgentPerformanceMetrics>;
  consensus_quality?: number;
  client_satisfaction?: number;
  generated_at: Date;
}

// Error types
export interface ConversationError {
  error_type: string;
  message: string;
  conversation_id?: string;
  timestamp: Date;
  details?: Record<string, any>;
}

// Component props and UI types
export interface ConversationDisplayProps {
  conversationId: string;
  showExportOptions?: boolean;
  enableWebSocket?: boolean;
  onConversationComplete?: (conversation: ConversationSession) => void;
  onError?: (error: ConversationError) => void;
}

export interface AgentMessageDisplayProps {
  message: AgentMessage;
  showConfidence?: boolean;
  showTimestamp?: boolean;
  className?: string;
}

export interface ConversationControlsProps {
  conversationId: string;
  status: ConversationStatus;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onExport?: (format: 'markdown' | 'json' | 'summary') => void;
  disabled?: boolean;
}

export interface CreateConversationFormProps {
  onSubmit: (request: ConversationCreateRequest) => void;
  loading?: boolean;
  error?: string;
  initialContent?: Partial<ContentSource>;
}

// Utility types for form handling
export type ConversationFormData = {
  title: string;
  content: string;
  contentType: ContentSourceType;
  url?: string;
  author?: string;
  autoStart: boolean;
  customPrompt?: string;
};

export type ConversationListItem = {
  id: string;
  status: ConversationStatus;
  content_title: string;
  created_at: string;
  message_count: number;
};

export type ConversationListResponse = {
  conversations: ConversationListItem[];
  total: number;
  limit: number;
  offset: number;
};

// Hook return types
export interface UseConversationReturn {
  conversation: ConversationSession | null;
  loading: boolean;
  error: string | null;
  createConversation: (request: ConversationCreateRequest) => Promise<void>;
  startConversation: () => Promise<void>;
  refreshConversation: () => Promise<void>;
  deleteConversation: () => Promise<void>;
}

export interface UseConversationStreamReturn {
  messages: AgentMessage[];
  status: ConversationStatus;
  connected: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  sendCommand: (command: 'pause' | 'resume' | 'stop') => boolean;
}

export interface UseConversationListReturn {
  conversations: ConversationListItem[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
}

// Validation schemas (for client-side validation)
export interface ContentSourceValidation {
  title: {
    required: true;
    minLength: 1;
    maxLength: 500;
  };
  content: {
    required: true;
    minLength: 10;
  };
  url?: {
    pattern: RegExp; // URL pattern
  };
  author?: {
    maxLength: 200;
  };
}

// Configuration types
export interface AutoGenClientConfig {
  baseUrl?: string;
  timeout?: number;
  enableWebSocket?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface AutoGenServiceHealth {
  status: 'healthy' | 'unhealthy' | 'disabled';
  autogen_enabled: boolean;
  websocket_enabled: boolean;
  model: string;
  timestamp: string;
  error?: string;
}

// Export helper type for better type inference
export type AutoGenTypes = {
  ConversationStatus: typeof ConversationStatus;
  AgentType: typeof AgentType;
  ContentSourceType: typeof ContentSourceType;
  ContentSource: ContentSource;
  AgentMessage: AgentMessage;
  ConversationSession: ConversationSession;
  ConversationCreateRequest: ConversationCreateRequest;
  ConversationResponse: ConversationResponse;
  WebSocketMessage: WebSocketMessage;
  ConversationError: ConversationError;
};