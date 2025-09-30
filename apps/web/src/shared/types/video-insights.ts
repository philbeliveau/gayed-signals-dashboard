/**
 * TypeScript interfaces for Video Insights feature
 * Based on PRD specifications for YouTube Summary Tab
 */

export interface VideoSummaryRequest {
  youtube_url: string;
  user_prompt?: string;
  summary_mode: 'bullet' | 'executive' | 'action_items' | 'timeline' | 'custom';
  folder_id?: string;
  // AutoGen integration options
  trigger_autogen_debate?: boolean;
  include_signal_context?: boolean;
}

export interface Video {
  id: string;
  user_id: string;
  folder_id?: string;
  youtube_url: string;
  title: string;
  channel_name: string;
  duration: number; // seconds
  published_at: string;
  status: 'processing' | 'complete' | 'error';
  created_at: string;
  updated_at?: string;
  thumbnail_url?: string;
  view_count?: number;
  description?: string;
}

export interface TranscriptChunk {
  start_time: number;
  end_time: number;
  text: string;
}

export interface Transcript {
  id: string;
  video_id: string;
  full_text: string;
  chunks: TranscriptChunk[];
  language?: string;
  confidence_score?: number;
}

export interface Summary {
  id: string;
  video_id: string;
  user_prompt?: string;
  summary_text: string;
  mode: string;
  created_at: string;
  word_count?: number;
  key_points?: string[];
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
  video_count?: number;
  parent_id?: string;
}

export interface VideoSummaryResponse {
  video: Video;
  task_id?: string;
  estimated_completion_time?: number;
  // AutoGen integration results
  autogen_conversation_id?: string;
  autogen_status?: string;
  financial_relevance_score?: number;
}

export interface VideoDetails {
  video: Video;
  transcript?: Transcript;
  summaries: Summary[];
  folder?: Folder;
}

export interface ProcessingStatus {
  task_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  stage: 'downloading' | 'extracting' | 'transcribing' | 'summarizing' | 'complete';
  estimated_completion: number; // seconds
  error_message?: string;
}

export interface SearchResult {
  videos: Video[];
  total_count: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface VideoSearchParams {
  query?: string;
  folder_id?: string;
  status?: Video['status'];
  sort_by?: 'created_at' | 'title' | 'duration' | 'published_at';
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface PromptTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  prompt_text: string;
  category: 'financial' | 'technical' | 'meeting' | 'educational' | 'custom';
  is_public: boolean;
  variables: string[];
  usage_count: number;
  created_at: string;
}

export interface PromptValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  variables_detected: string[];
}

export interface ExportOptions {
  format: 'markdown' | 'pdf' | 'json' | 'txt';
  include_transcript: boolean;
  include_summaries: boolean;
  include_metadata: boolean;
}

export interface BatchProcessingRequest {
  playlist_url?: string;
  video_urls?: string[];
  folder_id?: string;
  summary_mode: VideoSummaryRequest['summary_mode'];
  user_prompt?: string;
}

export interface BatchProcessingResponse {
  batch_id: string;
  total_videos: number;
  estimated_completion_time: number;
  video_tasks: Array<{
    video_url: string;
    task_id: string;
    title?: string;
  }>;
}

// UI State interfaces
export interface VideoInsightsState {
  currentVideo: Video | null;
  videos: Video[];
  folders: Folder[];
  selectedFolder: Folder | null;
  searchQuery: string;
  selectedSummaryMode: VideoSummaryRequest['summary_mode'];
  isProcessing: boolean;
  processingStatus: ProcessingStatus | null;
  searchResults: SearchResult | null;
  loading: boolean;
  error: string | null;
}

// Component Props interfaces
export interface VideoInputProps {
  onSubmit: (request: VideoSummaryRequest) => Promise<void>;
  isProcessing: boolean;
  folders: Folder[];
  // AutoGen options
  showAutoGenOptions?: boolean;
  defaultTriggerAutoGen?: boolean;
}

export interface TranscriptViewerProps {
  transcript: Transcript;
  onTimestampClick: (time: number) => void;
  searchQuery?: string;
  highlightText?: string;
}

export interface SummaryPanelProps {
  video: Video;
  summaries: Summary[];
  onRegenerateSummary: (mode: VideoSummaryRequest['summary_mode'], prompt?: string) => Promise<void>;
  isRegenerating: boolean;
}

export interface FolderSidebarProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onFolderCreate: (name: string, parentId?: string) => Promise<void>;
  onFolderRename: (folderId: string, newName: string) => Promise<void>;
  onFolderDelete: (folderId: string) => Promise<void>;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status: 'success' | 'error';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Error types
export class VideoInsightsError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'VideoInsightsError';
  }
}

export class YouTubeUrlError extends VideoInsightsError {
  constructor(url: string) {
    super(`Invalid YouTube URL: ${url}`, 'INVALID_YOUTUBE_URL', 400);
  }
}

export class ProcessingTimeoutError extends VideoInsightsError {
  constructor(taskId: string) {
    super(
      `Processing timeout for task: ${taskId}`,
      'PROCESSING_TIMEOUT',
      408
    );
  }
}

export class TranscriptionError extends VideoInsightsError {
  constructor(reason: string) {
    super(`Transcription failed: ${reason}`, 'TRANSCRIPTION_ERROR', 500);
  }
}

export class SummarizationError extends VideoInsightsError {
  constructor(reason: string) {
    super(`Summarization failed: ${reason}`, 'SUMMARIZATION_ERROR', 500);
  }
}

// AutoGen Integration Types
export interface AutoGenConversationResult {
  conversation_id: string;
  status: 'initialized' | 'running' | 'completed' | 'error';
  financial_relevance_score: number;
  created_at: string;
  agent_messages?: AutoGenMessage[];
}

export interface AutoGenMessage {
  id: string;
  agent_type: 'financial_analyst' | 'market_context' | 'risk_challenger';
  agent_name: string;
  content: string;
  confidence_level?: number;
  timestamp: string;
  message_order: number;
}

export interface FinancialRelevanceAnalysis {
  relevance_score: number;
  financial_topics: string[];
  market_relevance: boolean;
  investment_relevance: boolean;
  reasoning: string;
}

export interface VideoWithAutoGen extends Video {
  autogen_conversation_id?: string;
  autogen_status?: string;
  financial_relevance_score?: number;
  has_financial_analysis?: boolean;
}