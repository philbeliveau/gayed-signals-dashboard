/**
 * API Client for Video Insights
 * Handles communication with the FastAPI backend through Next.js proxy routes
 */

import {
  VideoSummaryRequest,
  VideoSummaryResponse,
  Video,
  VideoDetails,
  ProcessingStatus,
  SearchResult,
  VideoSearchParams,
  Folder,
  PromptTemplate,
  PromptValidationResult,
  BatchProcessingRequest,
  BatchProcessingResponse,
  ExportOptions,
  ApiResponse,
  PaginatedResponse,
  VideoInsightsError,
  YouTubeUrlError,
  ProcessingTimeoutError,
  TranscriptionError,
  SummarizationError,
} from '../types/video-insights';

class VideoInsightsAPI {
  private readonly baseUrl: string;
  private readonly defaultTimeout: number;
  private readonly videoProcessingTimeout: number;

  constructor(
    baseUrl: string = '/api/video-insights', 
    defaultTimeout: number = 30000,
    videoProcessingTimeout: number = 300000 // 5 minutes for video processing
  ) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = defaultTimeout;
    this.videoProcessingTimeout = videoProcessingTimeout;
  }

  /**
   * Validates a YouTube URL format
   */
  private validateYouTubeUrl(url: string): boolean {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)[a-zA-Z0-9_-]{11}(&.*)?$/;
    return youtubeRegex.test(url);
  }

  /**
   * Makes HTTP requests with error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs?: number
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeout = timeoutMs || this.defaultTimeout;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new VideoInsightsError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          errorData.code || 'HTTP_ERROR',
          response.status
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof VideoInsightsError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProcessingTimeoutError(`Request timeout after ${timeout}ms`);
      }

      throw new VideoInsightsError(
        error instanceof Error ? error.message : 'Network error occurred',
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Creates a new video summary request with AutoGen integration support
   */
  async createVideoSummary(request: VideoSummaryRequest): Promise<VideoSummaryResponse> {
    if (!this.validateYouTubeUrl(request.youtube_url)) {
      throw new YouTubeUrlError(request.youtube_url);
    }

    // Determine which endpoint to use based on AutoGen integration
    const endpoint = request.trigger_autogen_debate ? '/simple-process' : '/videos/process';

    // Build request body with AutoGen options
    const requestBody: any = {
      youtube_url: request.youtube_url,
      summary_mode: request.summary_mode || 'bullet',
      user_prompt: request.user_prompt,
      folder_id: request.folder_id,
      save_to_database: true // Enable database saving for AutoGen integration
    };

    // Add AutoGen-specific options if triggering debate
    if (request.trigger_autogen_debate) {
      requestBody.trigger_autogen_debate = true;
      requestBody.include_signal_context = request.include_signal_context || false;
      requestBody.custom_context = request.user_prompt; // Use user prompt as custom context
    }

    // FastAPI returns processing status directly
    const response = await this.makeRequest<VideoSummaryResponse>(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      },
      this.videoProcessingTimeout // Use longer timeout for video processing
    );

    return response;
  }

  /**
   * Gets video details with transcript and summaries
   */
  async getVideoDetails(videoId: string): Promise<VideoDetails> {
    // FastAPI returns video details directly, not wrapped in ApiResponse
    const response = await this.makeRequest<VideoDetails>(
      `/videos/${videoId}`
    );

    return response;
  }

  /**
   * Lists user videos with optional filtering
   */
  async listVideos(params: VideoSearchParams = {}): Promise<SearchResult> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    const endpoint = `/videos?${searchParams.toString()}`;
    
    try {
      const response = await this.makeRequest<any>(endpoint);

      // Handle different response formats from the FastAPI service
      if (response && typeof response === 'object') {
        // Check if it's the expected paginated format
        if (response.data && response.pagination) {
          return {
            videos: response.data || [],
            total_count: response.pagination?.total_count || 0,
            page: response.pagination?.page || 1,
            per_page: response.pagination?.per_page || 20,
            has_more: response.pagination?.has_next || false,
          };
        }
        
        // Check if it's a direct array response
        if (Array.isArray(response)) {
          return {
            videos: response,
            total_count: response.length,
            page: 1,
            per_page: response.length,
            has_more: false,
          };
        }
        
        // Check if videos are at the root level
        if (response.videos && Array.isArray(response.videos)) {
          return {
            videos: response.videos,
            total_count: response.total_count || response.videos.length,
            page: response.page || 1,
            per_page: response.per_page || response.videos.length,
            has_more: response.has_more || false,
          };
        }
        
        // If response has items or data at root level
        if (response.items && Array.isArray(response.items)) {
          return {
            videos: response.items,
            total_count: response.total || response.items.length,
            page: response.page || 1,
            per_page: response.limit || response.items.length,
            has_more: response.has_more || false,
          };
        }
      }
      
      // Fallback: return empty result
      console.warn('Unexpected API response format for listVideos:', response);
      return {
        videos: [],
        total_count: 0,
        page: 1,
        per_page: 20,
        has_more: false,
      };
      
    } catch (error) {
      console.error('Error in listVideos:', error);
      throw new VideoInsightsError(
        `Failed to fetch videos: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'VIDEO_LIST_ERROR'
      );
    }
  }

  /**
   * Gets processing status for a video task
   */
  async getProcessingStatus(taskId: string): Promise<ProcessingStatus> {
    // FastAPI returns processing status directly
    const response = await this.makeRequest<ProcessingStatus>(
      `/tasks/${taskId}/status`
    );

    return response;
  }

  /**
   * Deletes a video and its associated data
   */
  async deleteVideo(videoId: string): Promise<void> {
    // FastAPI returns success message directly
    await this.makeRequest<{ message: string }>(
      `/videos/${videoId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Updates a video's processing status
   */
  async updateVideoStatus(
    videoId: string,
    status: 'processing' | 'complete' | 'error',
    errorMessage?: string
  ): Promise<void> {
    // FastAPI expects video_status as query parameters, not body
    const params = new URLSearchParams({ video_status: status });
    if (errorMessage) {
      params.append('error_message', errorMessage);
    }

    await this.makeRequest<{ message: string }>(
      `/videos/${videoId}/status?${params.toString()}`,
      {
        method: 'PATCH'
      }
    );
  }

  /**
   * Regenerates a summary for a video
   */
  async regenerateSummary(
    videoId: string,
    mode: VideoSummaryRequest['summary_mode'],
    userPrompt?: string
  ): Promise<VideoSummaryResponse> {
    // FastAPI returns processing status directly
    const response = await this.makeRequest<VideoSummaryResponse>(
      `/videos/${videoId}/regenerate-summary`,
      {
        method: 'POST',
        body: JSON.stringify({ 
          summary_mode: mode, 
          user_prompt: userPrompt 
        }),
      },
      this.videoProcessingTimeout // Use longer timeout for regenerating summaries
    );

    return response;
  }

  /**
   * Folder management methods
   */
  async listFolders(): Promise<Folder[]> {
    // FastAPI returns folder array directly
    const response = await this.makeRequest<Folder[]>('/folders');
    return response;
  }

  async createFolder(name: string, parentId?: string): Promise<Folder> {
    // FastAPI returns folder object directly
    const response = await this.makeRequest<Folder>('/folders', {
      method: 'POST',
      body: JSON.stringify({ name, parent_id: parentId }),
    });

    return response;
  }

  async updateFolder(folderId: string, name: string): Promise<Folder> {
    // FastAPI returns updated folder object directly
    const response = await this.makeRequest<Folder>(
      `/folders/${folderId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ name }),
      }
    );

    return response;
  }

  async deleteFolder(folderId: string): Promise<void> {
    // FastAPI returns success message directly
    await this.makeRequest<{ message: string }>(
      `/folders/${folderId}`,
      { method: 'DELETE' }
    );
  }

  async moveVideoToFolder(videoId: string, folderId: string | null): Promise<void> {
    // FastAPI returns success message directly
    await this.makeRequest<{ message: string }>(
      `/videos/${videoId}/move`,
      {
        method: 'POST',
        body: JSON.stringify({ folder_id: folderId }),
      }
    );
  }

  /**
   * Prompt template methods
   */
  async listPromptTemplates(category?: string): Promise<PromptTemplate[]> {
    const endpoint = category 
      ? `/prompts/templates?category=${encodeURIComponent(category)}`
      : '/prompts/templates';
    
    // FastAPI returns template array directly
    const response = await this.makeRequest<PromptTemplate[]>(endpoint);
    return response;
  }

  async createPromptTemplate(template: Omit<PromptTemplate, 'id' | 'user_id' | 'usage_count' | 'created_at'>): Promise<PromptTemplate> {
    // FastAPI returns template object directly
    const response = await this.makeRequest<PromptTemplate>(
      '/prompts/templates',
      {
        method: 'POST',
        body: JSON.stringify(template),
      }
    );

    return response;
  }

  async validatePrompt(promptText: string): Promise<PromptValidationResult> {
    // FastAPI returns validation result directly
    const response = await this.makeRequest<PromptValidationResult>(
      '/prompts/validate',
      {
        method: 'POST',
        body: JSON.stringify({ prompt_text: promptText }),
      }
    );

    return response;
  }

  /**
   * Batch processing methods
   */
  async createBatchProcessing(request: BatchProcessingRequest): Promise<BatchProcessingResponse> {
    // FastAPI returns batch response directly
    const response = await this.makeRequest<BatchProcessingResponse>(
      '/batch/process',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
      this.videoProcessingTimeout // Use longer timeout for batch processing
    );

    return response;
  }

  async getBatchStatus(batchId: string): Promise<ProcessingStatus[]> {
    // FastAPI returns status array directly
    const response = await this.makeRequest<ProcessingStatus[]>(
      `/batch/${batchId}/status`
    );

    return response;
  }

  /**
   * Export methods
   */
  async exportVideo(videoId: string, options: ExportOptions): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/videos/${videoId}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new VideoInsightsError(
        'Failed to export video data',
        'EXPORT_ERROR',
        response.status
      );
    }

    return response.blob();
  }

  /**
   * Search across transcripts and summaries
   */
  async searchContent(query: string, folderId?: string): Promise<SearchResult> {
    const params = new URLSearchParams({ query });
    if (folderId) {
      params.append('folder_id', folderId);
    }

    try {
      const response = await this.makeRequest<any>(`/search?${params.toString()}`);

      // Handle different response formats from the FastAPI service
      if (response && typeof response === 'object') {
        // Check if it's the expected paginated format
        if (response.data && response.pagination) {
          return {
            videos: response.data || [],
            total_count: response.pagination?.total_count || 0,
            page: response.pagination?.page || 1,
            per_page: response.pagination?.per_page || 20,
            has_more: response.pagination?.has_next || false,
          };
        }
        
        // Check if it's a direct array response
        if (Array.isArray(response)) {
          return {
            videos: response,
            total_count: response.length,
            page: 1,
            per_page: response.length,
            has_more: false,
          };
        }
        
        // Check if videos are at the root level
        if (response.videos && Array.isArray(response.videos)) {
          return {
            videos: response.videos,
            total_count: response.total_count || response.videos.length,
            page: response.page || 1,
            per_page: response.per_page || response.videos.length,
            has_more: response.has_more || false,
          };
        }
        
        // If response has items or data at root level
        if (response.items && Array.isArray(response.items)) {
          return {
            videos: response.items,
            total_count: response.total || response.items.length,
            page: response.page || 1,
            per_page: response.limit || response.items.length,
            has_more: response.has_more || false,
          };
        }
      }
      
      // Fallback: return empty result
      console.warn('Unexpected API response format for searchContent:', response);
      return {
        videos: [],
        total_count: 0,
        page: 1,
        per_page: 20,
        has_more: false,
      };
      
    } catch (error) {
      console.error('Error in searchContent:', error);
      throw new VideoInsightsError(
        `Failed to search content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SEARCH_ERROR'
      );
    }
  }

  /**
   * Get AutoGen conversation details for a video
   */
  async getAutoGenConversation(conversationId: string): Promise<any> {
    try {
      const response = await this.makeRequest<any>(
        `/autogen/conversations/${conversationId}`,
        {},
        this.defaultTimeout
      );
      return response;
    } catch (error) {
      console.error('Error fetching AutoGen conversation:', error);
      throw new VideoInsightsError(
        `Failed to fetch AutoGen conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AUTOGEN_CONVERSATION_ERROR'
      );
    }
  }

  /**
   * Export AutoGen conversation in various formats
   */
  async exportAutoGenConversation(
    conversationId: string,
    format: 'markdown' | 'json' | 'summary' = 'markdown'
  ): Promise<any> {
    try {
      const response = await this.makeRequest<any>(
        `/autogen/conversations/${conversationId}/export?format=${format}`,
        {},
        this.defaultTimeout
      );
      return response;
    } catch (error) {
      console.error('Error exporting AutoGen conversation:', error);
      throw new VideoInsightsError(
        `Failed to export AutoGen conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AUTOGEN_EXPORT_ERROR'
      );
    }
  }

  /**
   * Health check for the API
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.makeRequest<{ status: string }>('/health');
      return true;
    } catch {
      return false;
    }
  }
}

// Export a singleton instance
export const videoInsightsAPI = new VideoInsightsAPI();
export { VideoInsightsAPI };
export default videoInsightsAPI;