/**
 * AutoGen API Client for Agent Conversations
 *
 * Handles communication with the FastAPI AutoGen backend for:
 * - Creating and managing agent conversation sessions
 * - Real-time WebSocket streaming of agent debates
 * - Exporting conversation results for client presentations
 */

import {
  ConversationCreateRequest,
  ConversationResponse,
  AgentMessage,
  ConversationSession,
  ContentSource,
  ConversationStatus,
  AgentType,
  WebSocketMessage
} from '../types/autogen-types';

export class AutoGenError extends Error {
  constructor(
    message: string,
    public code: string = 'AUTOGEN_ERROR',
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AutoGenError';
  }
}

export class AutoGenClient {
  private readonly baseUrl: string;
  private readonly defaultTimeout: number;
  private readonly wsBaseUrl: string;
  private activeWebSockets: Map<string, WebSocket> = new Map();

  constructor(
    baseUrl: string = '/api/autogen',
    defaultTimeout: number = 30000
  ) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = defaultTimeout;

    // Convert HTTP URL to WebSocket URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.wsBaseUrl = `${wsProtocol}//${window.location.host}${baseUrl}`;
  }

  /**
   * Makes HTTP requests with error handling and authentication
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
      // Get authentication headers (integrates with existing Clerk auth)
      const authHeaders = await this.getAuthHeaders();

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new AutoGenError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          errorData.code || 'HTTP_ERROR',
          response.status,
          errorData
        );
      }

      const data = await response.json();
      return data;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof AutoGenError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new AutoGenError(`Request timeout after ${timeout}ms`, 'TIMEOUT_ERROR');
      }

      throw new AutoGenError(
        error instanceof Error ? error.message : 'Network error occurred',
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Get authentication headers for API requests
   * Integrates with existing Clerk authentication
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      // This would integrate with the existing Clerk auth pattern
      // For now, return empty headers as auth integration is pending
      return {};
    } catch (error) {
      console.warn('Failed to get authentication headers:', error);
      return {};
    }
  }

  /**
   * Create a new agent conversation session
   */
  async createConversation(request: ConversationCreateRequest): Promise<ConversationResponse> {
    try {
      const response = await this.makeRequest<ConversationResponse>(
        '/conversations',
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );

      return response;

    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation details and messages
   */
  async getConversation(conversationId: string): Promise<ConversationSession> {
    try {
      const response = await this.makeRequest<ConversationSession>(
        `/conversations/${conversationId}`
      );

      return response;

    } catch (error) {
      console.error(`Failed to get conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Start the agent debate for a conversation
   */
  async startConversation(conversationId: string): Promise<{ message: string; status: string }> {
    try {
      const response = await this.makeRequest<{ message: string; status: string }>(
        `/conversations/${conversationId}/start`,
        { method: 'POST' }
      );

      return response;

    } catch (error) {
      console.error(`Failed to start conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Connect to WebSocket for real-time conversation streaming
   */
  connectToConversationStream(
    conversationId: string,
    onMessage: (message: WebSocketMessage) => void,
    onError: (error: Event) => void = console.error,
    onClose: (event: CloseEvent) => void = () => {}
  ): WebSocket {
    const wsUrl = `${this.wsBaseUrl}/conversations/${conversationId}/stream`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`Connected to conversation stream: ${conversationId}`);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error for conversation ${conversationId}:`, error);
        onError(error);
      };

      ws.onclose = (event) => {
        console.log(`WebSocket closed for conversation ${conversationId}:`, event.code);
        this.activeWebSockets.delete(conversationId);
        onClose(event);
      };

      // Store active WebSocket
      this.activeWebSockets.set(conversationId, ws);

      return ws;

    } catch (error) {
      console.error(`Failed to connect to conversation stream ${conversationId}:`, error);
      throw new AutoGenError(
        'Failed to establish WebSocket connection',
        'WEBSOCKET_ERROR'
      );
    }
  }

  /**
   * Send command to conversation WebSocket
   */
  sendConversationCommand(
    conversationId: string,
    command: 'pause' | 'resume' | 'stop'
  ): boolean {
    const ws = this.activeWebSockets.get(conversationId);

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn(`WebSocket not available for conversation ${conversationId}`);
      return false;
    }

    try {
      ws.send(JSON.stringify({ command }));
      return true;
    } catch (error) {
      console.error(`Failed to send command ${command} to conversation ${conversationId}:`, error);
      return false;
    }
  }

  /**
   * Disconnect from conversation stream
   */
  disconnectFromConversationStream(conversationId: string): void {
    const ws = this.activeWebSockets.get(conversationId);

    if (ws) {
      ws.close();
      this.activeWebSockets.delete(conversationId);
    }
  }

  /**
   * Export conversation in specified format
   */
  async exportConversation(
    conversationId: string,
    format: 'markdown' | 'json' | 'summary' = 'markdown'
  ): Promise<{ content: string | object; format: string; exported_at: string }> {
    try {
      const response = await this.makeRequest<{
        conversation_id: string;
        format: string;
        content: string | object;
        exported_at: string;
      }>(`/conversations/${conversationId}/export?format=${format}`);

      return {
        content: response.content,
        format: response.format,
        exported_at: response.exported_at
      };

    } catch (error) {
      console.error(`Failed to export conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * List conversations with optional filtering
   */
  async listConversations(params?: {
    userId?: string;
    status?: ConversationStatus;
    limit?: number;
    offset?: number;
  }): Promise<{
    conversations: Array<{
      id: string;
      status: ConversationStatus;
      content_title: string;
      created_at: string;
      message_count: number;
    }>;
    total: number;
  }> {
    try {
      const searchParams = new URLSearchParams();

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, value.toString());
          }
        });
      }

      const endpoint = `/conversations${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const response = await this.makeRequest<{
        conversations: Array<{
          id: string;
          status: ConversationStatus;
          content_title: string;
          created_at: string;
          message_count: number;
        }>;
        total: number;
      }>(endpoint);

      return response;

    } catch (error) {
      console.error('Failed to list conversations:', error);
      throw error;
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<{ message: string }> {
    try {
      // Close WebSocket if active
      this.disconnectFromConversationStream(conversationId);

      const response = await this.makeRequest<{ message: string }>(
        `/conversations/${conversationId}`,
        { method: 'DELETE' }
      );

      return response;

    } catch (error) {
      console.error(`Failed to delete conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Health check for AutoGen service
   */
  async healthCheck(): Promise<{
    status: string;
    autogen_enabled: boolean;
    websocket_enabled: boolean;
    model: string;
  }> {
    try {
      const response = await this.makeRequest<{
        status: string;
        autogen_enabled: boolean;
        websocket_enabled: boolean;
        model: string;
        timestamp: string;
      }>('/health');

      return response;

    } catch (error) {
      console.error('AutoGen health check failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect all active WebSockets
   */
  disconnectAll(): void {
    this.activeWebSockets.forEach((ws, conversationId) => {
      this.disconnectFromConversationStream(conversationId);
    });
  }

  /**
   * Create content source helper
   */
  static createContentSource(
    type: 'text' | 'substack_article' | 'youtube_video' | 'market_report' | 'news_article',
    title: string,
    content: string,
    options?: {
      url?: string;
      author?: string;
      published_at?: string;
      metadata?: Record<string, any>;
    }
  ): ContentSource {
    return {
      type,
      title,
      content,
      url: options?.url,
      author: options?.author,
      published_at: options?.published_at ? new Date(options.published_at) : undefined,
      metadata: options?.metadata || {}
    };
  }
}

// Export singleton instance
export const autoGenClient = new AutoGenClient();
export default autoGenClient;