/**
 * Tests for Video Insights API with AutoGen integration.
 *
 * These tests validate the frontend integration with the enhanced
 * YouTube processing pipeline that includes AutoGen conversation triggers.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { videoInsightsAPI, VideoInsightsAPI } from '@/shared/lib/api/video-insights';
import {
  VideoSummaryRequest,
  VideoSummaryResponse,
  AutoGenConversationResult,
  FinancialRelevanceAnalysis,
  VideoWithAutoGen
} from '@/shared/types/video-insights';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('VideoInsightsAPI AutoGen Integration', () => {
  let api: VideoInsightsAPI;

  beforeEach(() => {
    api = new VideoInsightsAPI();
    jest.clearAllMocks();
  });

  describe('createVideoSummary with AutoGen', () => {
    it('should trigger AutoGen for financially relevant content', async () => {
      const request: VideoSummaryRequest = {
        youtube_url: 'https://youtube.com/watch?v=fed_policy_test',
        summary_mode: 'bullet',
        user_prompt: 'Analyze market implications',
        trigger_autogen_debate: true,
        include_signal_context: true
      };

      const mockResponse: VideoSummaryResponse = {
        video: {
          id: 'video_123',
          user_id: 'user_456',
          youtube_url: request.youtube_url,
          title: 'Fed Policy Impact on Markets',
          channel_name: 'Financial News',
          duration: 1200,
          published_at: '2024-01-15T10:00:00Z',
          status: 'complete',
          created_at: '2024-01-15T10:05:00Z'
        },
        autogen_conversation_id: 'conv_789',
        autogen_status: 'initialized',
        financial_relevance_score: 0.85
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await api.createVideoSummary(request);

      expect(fetch).toHaveBeenCalledWith(
        '/api/video-insights/simple-process',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            youtube_url: request.youtube_url,
            summary_mode: 'bullet',
            user_prompt: 'Analyze market implications',
            folder_id: undefined,
            save_to_database: true,
            trigger_autogen_debate: true,
            include_signal_context: true,
            custom_context: 'Analyze market implications'
          })
        })
      );

      expect(result.autogen_conversation_id).toBe('conv_789');
      expect(result.autogen_status).toBe('initialized');
      expect(result.financial_relevance_score).toBe(0.85);
    });

    it('should use regular endpoint when AutoGen is not requested', async () => {
      const request: VideoSummaryRequest = {
        youtube_url: 'https://youtube.com/watch?v=cooking_video',
        summary_mode: 'bullet',
        trigger_autogen_debate: false
      };

      const mockResponse: VideoSummaryResponse = {
        video: {
          id: 'video_124',
          user_id: 'user_456',
          youtube_url: request.youtube_url,
          title: 'Cooking Tutorial',
          channel_name: 'Cooking Channel',
          duration: 900,
          published_at: '2024-01-15T11:00:00Z',
          status: 'complete',
          created_at: '2024-01-15T11:05:00Z'
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await api.createVideoSummary(request);

      expect(fetch).toHaveBeenCalledWith(
        '/api/video-insights/videos/process',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            youtube_url: request.youtube_url,
            summary_mode: 'bullet',
            user_prompt: undefined,
            folder_id: undefined,
            save_to_database: true
          })
        })
      );
    });

    it('should handle invalid YouTube URLs', async () => {
      const request: VideoSummaryRequest = {
        youtube_url: 'invalid-url',
        summary_mode: 'bullet',
        trigger_autogen_debate: true
      };

      await expect(api.createVideoSummary(request)).rejects.toThrow(
        'Invalid YouTube URL: invalid-url'
      );
    });

    it('should handle API errors gracefully', async () => {
      const request: VideoSummaryRequest = {
        youtube_url: 'https://youtube.com/watch?v=error_test',
        summary_mode: 'bullet',
        trigger_autogen_debate: true
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({
          message: 'Processing failed',
          code: 'PROCESSING_ERROR'
        })
      } as Response);

      await expect(api.createVideoSummary(request)).rejects.toThrow(
        'Processing failed'
      );
    });

    it('should handle timeout errors for long processing', async () => {
      const request: VideoSummaryRequest = {
        youtube_url: 'https://youtube.com/watch?v=long_video',
        summary_mode: 'bullet',
        trigger_autogen_debate: true
      };

      // Mock fetch to simulate timeout
      (fetch as jest.MockedFunction<typeof fetch>).mockImplementationOnce(
        () => new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 100);
        })
      );

      await expect(api.createVideoSummary(request)).rejects.toThrow();
    });
  });

  describe('getAutoGenConversation', () => {
    it('should fetch AutoGen conversation details', async () => {
      const conversationId = 'conv_123456';
      const mockConversation = {
        conversation_id: conversationId,
        status: 'completed',
        content_source: {
          type: 'youtube_video',
          title: 'Market Analysis Video',
          content: 'Transcript and summary...',
          url: 'https://youtube.com/watch?v=test'
        },
        messages: [
          {
            id: 'msg_1',
            agent_type: 'financial_analyst',
            agent_name: 'Financial Analyst',
            content: 'This video discusses important market trends...',
            confidence_level: 0.85,
            timestamp: '2024-01-15T10:30:00Z',
            message_order: 0
          },
          {
            id: 'msg_2',
            agent_type: 'market_context',
            agent_name: 'Market Context',
            content: 'Current market conditions suggest...',
            confidence_level: 0.78,
            timestamp: '2024-01-15T10:31:00Z',
            message_order: 1
          }
        ],
        created_at: '2024-01-15T10:29:00Z',
        updated_at: '2024-01-15T10:32:00Z'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversation,
      } as Response);

      const result = await api.getAutoGenConversation(conversationId);

      expect(fetch).toHaveBeenCalledWith(
        `/api/video-insights/autogen/conversations/${conversationId}`,
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );

      expect(result.conversation_id).toBe(conversationId);
      expect(result.status).toBe('completed');
      expect(result.messages).toHaveLength(2);
    });

    it('should handle conversation not found', async () => {
      const conversationId = 'nonexistent_conv';

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({
          message: 'Conversation not found',
          code: 'CONVERSATION_NOT_FOUND'
        })
      } as Response);

      await expect(api.getAutoGenConversation(conversationId)).rejects.toThrow(
        'Conversation not found'
      );
    });
  });

  describe('exportAutoGenConversation', () => {
    it('should export conversation in markdown format', async () => {
      const conversationId = 'conv_123456';
      const format = 'markdown';

      const mockExport = {
        conversation_id: conversationId,
        format: format,
        content: '# Financial Analysis Debate\n\n**Content:** Market Analysis Video\n\n## Financial Analyst\n\nThis video discusses...',
        exported_at: '2024-01-15T12:00:00Z'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockExport,
      } as Response);

      const result = await api.exportAutoGenConversation(conversationId, format);

      expect(fetch).toHaveBeenCalledWith(
        `/api/video-insights/autogen/conversations/${conversationId}/export?format=${format}`,
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );

      expect(result.conversation_id).toBe(conversationId);
      expect(result.format).toBe(format);
      expect(result.content).toContain('# Financial Analysis Debate');
    });

    it('should export conversation in JSON format', async () => {
      const conversationId = 'conv_123456';
      const format = 'json';

      const mockExport = {
        conversation_id: conversationId,
        format: format,
        content: {
          messages: [],
          metadata: {},
          analysis: {}
        },
        exported_at: '2024-01-15T12:00:00Z'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockExport,
      } as Response);

      const result = await api.exportAutoGenConversation(conversationId, format);

      expect(result.format).toBe('json');
      expect(typeof result.content).toBe('object');
    });

    it('should default to markdown format', async () => {
      const conversationId = 'conv_123456';

      const mockExport = {
        conversation_id: conversationId,
        format: 'markdown',
        content: '# Financial Analysis Debate\n\n...',
        exported_at: '2024-01-15T12:00:00Z'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockExport,
      } as Response);

      await api.exportAutoGenConversation(conversationId);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('format=markdown'),
        expect.any(Object)
      );
    });
  });

  describe('URL validation', () => {
    it('should validate standard YouTube URLs', () => {
      const api = new VideoInsightsAPI();
      const validateMethod = (api as any).validateYouTubeUrl.bind(api);

      expect(validateMethod('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(validateMethod('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(validateMethod('http://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    });

    it('should validate short YouTube URLs', () => {
      const api = new VideoInsightsAPI();
      const validateMethod = (api as any).validateYouTubeUrl.bind(api);

      expect(validateMethod('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
      expect(validateMethod('http://youtu.be/dQw4w9WgXcQ')).toBe(true);
    });

    it('should validate embed YouTube URLs', () => {
      const api = new VideoInsightsAPI();
      const validateMethod = (api as any).validateYouTubeUrl.bind(api);

      expect(validateMethod('https://youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
      expect(validateMethod('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      const api = new VideoInsightsAPI();
      const validateMethod = (api as any).validateYouTubeUrl.bind(api);

      expect(validateMethod('https://google.com')).toBe(false);
      expect(validateMethod('invalid-url')).toBe(false);
      expect(validateMethod('https://youtube.com/watch')).toBe(false);
      expect(validateMethod('https://youtube.com/watch?v=')).toBe(false);
      expect(validateMethod('')).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      const request: VideoSummaryRequest = {
        youtube_url: 'https://youtube.com/watch?v=network_error',
        summary_mode: 'bullet'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(api.createVideoSummary(request)).rejects.toThrow(
        'Network error'
      );
    });

    it('should handle malformed JSON responses', async () => {
      const conversationId = 'conv_malformed';

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      } as Response);

      await expect(api.getAutoGenConversation(conversationId)).rejects.toThrow();
    });

    it('should handle request timeouts', async () => {
      const request: VideoSummaryRequest = {
        youtube_url: 'https://youtube.com/watch?v=timeout_test',
        summary_mode: 'bullet',
        trigger_autogen_debate: true
      };

      // Create a custom API instance with short timeout for testing
      const shortTimeoutAPI = new VideoInsightsAPI('/api/video-insights', 100);

      (fetch as jest.MockedFunction<typeof fetch>).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 200))
      );

      await expect(shortTimeoutAPI.createVideoSummary(request)).rejects.toThrow();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete video-to-conversation workflow', async () => {
      // Step 1: Process video with AutoGen
      const videoRequest: VideoSummaryRequest = {
        youtube_url: 'https://youtube.com/watch?v=workflow_test',
        summary_mode: 'bullet',
        trigger_autogen_debate: true,
        include_signal_context: true
      };

      const videoResponse: VideoSummaryResponse = {
        video: {
          id: 'video_workflow',
          user_id: 'user_123',
          youtube_url: videoRequest.youtube_url,
          title: 'Market Workflow Test',
          channel_name: 'Test Channel',
          duration: 600,
          published_at: '2024-01-15T10:00:00Z',
          status: 'complete',
          created_at: '2024-01-15T10:05:00Z'
        },
        autogen_conversation_id: 'conv_workflow',
        autogen_status: 'initialized',
        financial_relevance_score: 0.82
      };

      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => videoResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            conversation_id: 'conv_workflow',
            status: 'completed',
            messages: [
              {
                agent_type: 'financial_analyst',
                content: 'Analysis complete...'
              }
            ]
          }),
        } as Response);

      // Process video
      const videoResult = await api.createVideoSummary(videoRequest);
      expect(videoResult.autogen_conversation_id).toBe('conv_workflow');

      // Get conversation details
      const conversationResult = await api.getAutoGenConversation('conv_workflow');
      expect(conversationResult.status).toBe('completed');
    });
  });
});