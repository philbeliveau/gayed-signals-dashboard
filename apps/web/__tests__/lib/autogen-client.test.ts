/**
 * Tests for AutoGen API Client
 *
 * These tests verify the web client functionality for:
 * - API communication with the FastAPI backend
 * - WebSocket connection management
 * - Error handling and retry logic
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AutoGenClient, AutoGenError } from '../../src/shared/lib/api/autogen-client';
import {
  ConversationCreateRequest,
  ContentSourceType,
  ConversationStatus,
  AgentType,
  WebSocketMessage
} from '../../src/shared/lib/types/autogen-types';

// Mock fetch globally
global.fetch = jest.fn();

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  readyState: WebSocket.OPEN,
  send: jest.fn(),
  close: jest.fn(),
  onopen: null,
  onmessage: null,
  onerror: null,
  onclose: null,
}));

// Mock window.location for WebSocket URL construction
delete (window as any).location;
(window as any).location = {
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: '',
  origin: 'http://localhost:3000',
  href: 'http://localhost:3000/'
};

describe('AutoGenClient', () => {
  let client: AutoGenClient;

  beforeEach(() => {
    client = new AutoGenClient('/api/autogen', 5000);
    jest.clearAllMocks();
  });

  afterEach(() => {
    client.disconnectAll();
  });

  describe('HTTP Requests', () => {
    it('should make successful API request', async () => {
      const mockResponse = {
        conversation_id: 'test-123',
        status: ConversationStatus.INITIALIZED,
        created_at: new Date(),
        content_source: {
          type: ContentSourceType.TEXT,
          title: 'Test Article',
          content: 'Test content'
        },
        message: 'Success'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const request: ConversationCreateRequest = {
        content: {
          type: ContentSourceType.TEXT,
          title: 'Test Article',
          content: 'This is test financial content for analysis.',
          metadata: {}
        },
        user_id: 'test-user-123'
      };

      const result = await client.createConversation(request);

      expect(fetch).toHaveBeenCalledWith(
        '/api/autogen/conversations',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(request),
        })
      );

      expect(result.conversation_id).toBe('test-123');
      expect(result.status).toBe(ConversationStatus.INITIALIZED);
    });

    it('should handle API error responses', async () => {
      const errorResponse = {
        message: 'Invalid request',
        code: 'VALIDATION_ERROR'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => errorResponse,
      });

      const request: ConversationCreateRequest = {
        content: {
          type: ContentSourceType.TEXT,
          title: '',  // Invalid empty title
          content: 'Test content',
          metadata: {}
        },
        user_id: 'test-user-123'
      };

      await expect(client.createConversation(request)).rejects.toThrow(AutoGenError);

      try {
        await client.createConversation(request);
      } catch (error) {
        expect(error).toBeInstanceOf(AutoGenError);
        expect((error as AutoGenError).code).toBe('VALIDATION_ERROR');
        expect((error as AutoGenError).status).toBe(400);
      }
    });

    it('should handle network errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const request: ConversationCreateRequest = {
        content: {
          type: ContentSourceType.TEXT,
          title: 'Test Article',
          content: 'Test content',
          metadata: {}
        },
        user_id: 'test-user-123'
      };

      await expect(client.createConversation(request)).rejects.toThrow(AutoGenError);

      try {
        await client.createConversation(request);
      } catch (error) {
        expect(error).toBeInstanceOf(AutoGenError);
        expect((error as AutoGenError).code).toBe('NETWORK_ERROR');
      }
    });

    it('should handle request timeouts', async () => {
      // Mock a delayed response that exceeds timeout
      (fetch as any).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      const client = new AutoGenClient('/api/autogen', 100); // 100ms timeout

      const request: ConversationCreateRequest = {
        content: {
          type: ContentSourceType.TEXT,
          title: 'Test Article',
          content: 'Test content',
          metadata: {}
        },
        user_id: 'test-user-123'
      };

      await expect(client.createConversation(request)).rejects.toThrow(AutoGenError);

      try {
        await client.createConversation(request);
      } catch (error) {
        expect(error).toBeInstanceOf(AutoGenError);
        expect((error as AutoGenError).code).toBe('TIMEOUT_ERROR');
      }
    });
  });

  describe('Conversation Management', () => {
    it('should get conversation details', async () => {
      const mockConversation = {
        id: 'test-123',
        user_id: 'user-123',
        content_source: {
          type: ContentSourceType.TEXT,
          title: 'Test Article',
          content: 'Test content'
        },
        status: ConversationStatus.COMPLETED,
        messages: [
          {
            id: 'msg-1',
            agent_type: AgentType.FINANCIAL_ANALYST,
            agent_name: 'financial_analyst',
            content: 'Analysis of the financial content...',
            confidence_level: 0.85,
            cited_sources: [],
            signal_references: [],
            timestamp: new Date(),
            message_order: 0,
            metadata: {}
          }
        ],
        created_at: new Date(),
        updated_at: new Date(),
        consensus_reached: false,
        metadata: {}
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversation,
      });

      const result = await client.getConversation('test-123');

      expect(fetch).toHaveBeenCalledWith(
        '/api/autogen/conversations/test-123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      expect(result.id).toBe('test-123');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].agent_type).toBe(AgentType.FINANCIAL_ANALYST);
    });

    it('should start conversation', async () => {
      const mockResponse = {
        message: 'Agent debate started successfully',
        conversation_id: 'test-123',
        status: 'running'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.startConversation('test-123');

      expect(fetch).toHaveBeenCalledWith(
        '/api/autogen/conversations/test-123/start',
        expect.objectContaining({
          method: 'POST',
        })
      );

      expect(result.status).toBe('running');
      expect(result.conversation_id).toBe('test-123');
    });

    it('should export conversation', async () => {
      const mockExport = {
        conversation_id: 'test-123',
        format: 'markdown',
        content: '# Financial Analysis\n\nAnalysis content...',
        exported_at: new Date().toISOString()
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockExport,
      });

      const result = await client.exportConversation('test-123', 'markdown');

      expect(fetch).toHaveBeenCalledWith(
        '/api/autogen/conversations/test-123/export?format=markdown',
        expect.any(Object)
      );

      expect(result.format).toBe('markdown');
      expect(result.content).toContain('# Financial Analysis');
    });

    it('should list conversations with filters', async () => {
      const mockList = {
        conversations: [
          {
            id: 'conv-1',
            status: ConversationStatus.COMPLETED,
            content_title: 'Article 1',
            created_at: new Date().toISOString(),
            message_count: 5
          }
        ],
        total: 1
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockList,
      });

      const result = await client.listConversations({
        userId: 'user-123',
        status: ConversationStatus.COMPLETED,
        limit: 10
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/autogen/conversations?userId=user-123&status=completed&limit=10',
        expect.any(Object)
      );

      expect(result.conversations).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should delete conversation', async () => {
      const mockResponse = {
        message: 'Conversation deleted successfully',
        conversation_id: 'test-123'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.deleteConversation('test-123');

      expect(fetch).toHaveBeenCalledWith(
        '/api/autogen/conversations/test-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );

      expect(result.message).toContain('deleted successfully');
    });
  });

  describe('WebSocket Management', () => {
    it('should connect to conversation stream', () => {
      const mockWebSocket = {
        readyState: WebSocket.OPEN,
        send: jest.fn(),
        close: jest.fn(),
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
      };

      (WebSocket as any).mockImplementationOnce(() => mockWebSocket);

      const onMessage = jest.fn();
      const onError = jest.fn();
      const onClose = jest.fn();

      const ws = client.connectToConversationStream(
        'test-123',
        onMessage,
        onError,
        onClose
      );

      expect(WebSocket).toHaveBeenCalledWith(
        'ws://localhost:3000/api/autogen/conversations/test-123/stream'
      );

      expect(ws).toBe(mockWebSocket);

      // Simulate WebSocket message
      const testMessage: WebSocketMessage = {
        type: 'agent_message',
        conversation_id: 'test-123',
        data: {
          id: 'msg-1',
          agent_type: AgentType.FINANCIAL_ANALYST,
          agent_name: 'financial_analyst',
          content: 'Test message',
          confidence_level: 0.8,
          cited_sources: [],
          signal_references: [],
          timestamp: new Date(),
          message_order: 0,
          metadata: {}
        },
        timestamp: new Date()
      };

      // Simulate receijestng a message
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify(testMessage)
        } as MessageEvent);
      }

      expect(onMessage).toHaveBeenCalledWith(testMessage);
    });

    it('should send conversation commands', () => {
      const mockWebSocket = {
        readyState: WebSocket.OPEN,
        send: jest.fn(),
        close: jest.fn(),
      };

      (WebSocket as any).mockImplementationOnce(() => mockWebSocket);

      client.connectToConversationStream('test-123', jest.fn());

      const success = client.sendConversationCommand('test-123', 'pause');

      expect(success).toBe(true);
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ command: 'pause' })
      );
    });

    it('should handle WebSocket disconnection', () => {
      const mockWebSocket = {
        readyState: WebSocket.OPEN,
        send: jest.fn(),
        close: jest.fn(),
      };

      (WebSocket as any).mockImplementationOnce(() => mockWebSocket);

      client.connectToConversationStream('test-123', jest.fn());

      client.disconnectFromConversationStream('test-123');

      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should fail to send command when WebSocket is not connected', () => {
      const success = client.sendConversationCommand('nonexistent', 'pause');
      expect(success).toBe(false);
    });
  });

  describe('Health Check', () => {
    it('should perform health check', async () => {
      const mockHealth = {
        status: 'healthy',
        autogen_enabled: true,
        websocket_enabled: true,
        model: 'gpt-4',
        timestamp: new Date().toISOString()
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealth,
      });

      const result = await client.healthCheck();

      expect(fetch).toHaveBeenCalledWith(
        '/api/autogen/health',
        expect.any(Object)
      );

      expect(result.status).toBe('healthy');
      expect(result.autogen_enabled).toBe(true);
      expect(result.model).toBe('gpt-4');
    });
  });

  describe('Content Source Helper', () => {
    it('should create content source with minimal data', () => {
      const contentSource = AutoGenClient.createContentSource(
        'text',
        'Test Article',
        'This is test content for analysis.'
      );

      expect(contentSource.type).toBe('text');
      expect(contentSource.title).toBe('Test Article');
      expect(contentSource.content).toBe('This is test content for analysis.');
      expect(contentSource.metadata).toEqual({});
    });

    it('should create content source with full options', () => {
      const contentSource = AutoGenClient.createContentSource(
        'substack_article',
        'Fed Policy Update',
        'Detailed analysis of Fed policy...',
        {
          url: 'https://example.com/article',
          author: 'Financial Analyst',
          published_at: '2024-01-15T10:00:00Z',
          metadata: { category: 'monetary-policy' }
        }
      );

      expect(contentSource.type).toBe('substack_article');
      expect(contentSource.url).toBe('https://example.com/article');
      expect(contentSource.author).toBe('Financial Analyst');
      expect(contentSource.published_at).toBeInstanceOf(Date);
      expect(contentSource.metadata).toEqual({ category: 'monetary-policy' });
    });
  });
});

describe('AutoGenError', () => {
  it('should create error with default values', () => {
    const error = new AutoGenError('Test error');

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('AUTOGEN_ERROR');
    expect(error.name).toBe('AutoGenError');
    expect(error.status).toBeUndefined();
    expect(error.details).toBeUndefined();
  });

  it('should create error with all properties', () => {
    const error = new AutoGenError(
      'Validation failed',
      'VALIDATION_ERROR',
      400,
      { field: 'title', reason: 'required' }
    );

    expect(error.message).toBe('Validation failed');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.status).toBe(400);
    expect(error.details).toEqual({ field: 'title', reason: 'required' });
  });
});