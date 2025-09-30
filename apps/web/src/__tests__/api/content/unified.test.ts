/**
 * Unified Content API Endpoint Tests
 *
 * Tests for the unified content processing API that handles
 * text, Substack URLs, and YouTube videos with authentication and validation.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/content/unified/route';

// Mock Clerk authentication
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn()
}));

// Mock Prisma client
const mockPrisma = {
  conversation: {
    create: jest.fn(),
  },
  agentMessage: {
    create: jest.fn(),
  },
  $disconnect: jest.fn(),
};

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma
}));

// Mock DOMPurify
jest.mock('isomorphic-dompurify', () => ({
  sanitize: jest.fn((content: string) => content)
}));

describe('/api/content/unified', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { auth } = require('@clerk/nextjs/server');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DOMPurify = require('isomorphic-dompurify');

  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockReturnValue({ userId: 'user_test123' });
    DOMPurify.sanitize.mockImplementation((content: string) => content);
    mockPrisma.conversation.create.mockResolvedValue({
      id: 'conv_test123',
      userId: 'user_test123',
      contentType: 'text',
      status: 'completed'
    });
    mockPrisma.agentMessage.create.mockResolvedValue({
      id: 'msg_test123',
      conversationId: 'conv_test123'
    });
  });

  describe('Authentication', () => {
    it('requires authentication', async () => {
      auth.mockReturnValue({ userId: null });

      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content: 'Test financial content for analysis that meets minimum length requirements.'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized - Authentication required');
    });

    it('accepts authenticated requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content: 'This is a comprehensive financial analysis of market conditions that exceeds the minimum character requirement for processing.'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Input Validation', () => {
    it('validates JSON body format', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid JSON');
    });

    it('requires valid content type', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'invalid_type',
          content: 'Test content'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid content type');
    });

    it('validates required fields based on content type', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          // Missing content field
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('Text Content Processing', () => {
    it('processes valid text content successfully', async () => {
      const textContent = 'This is a comprehensive financial analysis of current market conditions and investment opportunities that exceeds the minimum character requirement.';

      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content: textContent,
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('textId');
      expect(data.data).toHaveProperty('autoGenConversation');
      expect(data.data.autoGenConversation).toHaveProperty('agentResponses');
    });

    it('validates minimum text length', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content: 'Short text', // Less than 50 characters
          analysisType: 'QUICK'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Content too short');
    });

    it('validates maximum text length', async () => {
      const longContent = 'a'.repeat(10001); // Exceeds 10,000 character limit

      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content: longContent,
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Content exceeds maximum length');
    });

    it('sanitizes content for security', async () => {
      const maliciousContent = '<script>alert("xss")</script>This is financial content for analysis that meets the minimum length requirements.';

      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content: maliciousContent,
          analysisType: 'COMPREHENSIVE'
        })
      });

      await POST(request);

      expect(DOMPurify.sanitize).toHaveBeenCalledWith(maliciousContent);
    });

    it('calculates financial relevance score', async () => {
      const financialContent = 'Market analysis shows strong performance in equity markets with rising bond yields and increasing volatility in the financial sector.';

      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content: financialContent,
          analysisType: 'GAYED_FOCUSED'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty('relevanceScore');
      expect(data.data.relevanceScore).toBeGreaterThan(0.3);
    });

    it('rejects non-financial content', async () => {
      const nonFinancialContent = 'This is a recipe for making chocolate chip cookies with flour, sugar, butter, and chocolate chips. Mix ingredients and bake.';

      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content: nonFinancialContent,
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not sufficiently financial');
    });
  });

  describe('Substack URL Processing', () => {
    it('validates Substack URL format', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'substack',
          url: 'https://invalid-site.com/article',
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid Substack URL');
    });

    it('accepts valid Substack URLs', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'substack',
          url: 'https://newsletter.substack.com/p/market-analysis',
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('substackId');
    });

    it('handles Substack extraction simulation', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'substack',
          url: 'https://financial.substack.com/p/investment-outlook',
          analysisType: 'QUICK'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.extractedContent).toHaveProperty('title');
      expect(data.data.extractedContent).toHaveProperty('content');
      expect(data.data.extractedContent).toHaveProperty('publishedDate');
    });
  });

  describe('YouTube URL Processing', () => {
    it('validates YouTube URL format', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'youtube',
          url: 'https://invalid-site.com/video',
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid YouTube URL');
    });

    it('accepts valid YouTube URLs', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'youtube',
          url: 'https://youtube.com/watch?v=test123',
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('videoId');
    });

    it('accepts YouTube short URLs', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'youtube',
          url: 'https://youtu.be/test123',
          analysisType: 'GAYED_FOCUSED'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.extractedContent).toHaveProperty('transcript');
    });
  });

  describe('Analysis Types', () => {
    it('handles QUICK analysis type', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content: 'Financial market analysis discussing investment opportunities and portfolio management strategies for institutional investors.',
          analysisType: 'QUICK'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.autoGenConversation.agentResponses).toHaveLength(3);
    });

    it('handles COMPREHENSIVE analysis type', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content: 'Comprehensive financial market analysis discussing investment opportunities, risk management, and portfolio strategies.',
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.autoGenConversation.agentResponses).toHaveLength(3);
    });

    it('handles GAYED_FOCUSED analysis type', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content: 'Market analysis focusing on sector rotation signals and defensive positioning strategies in volatile conditions.',
          analysisType: 'GAYED_FOCUSED'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.autoGenConversation.consensus).toContain('signal');
    });
  });

  describe('Database Operations', () => {
    it('stores conversation in database', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content: 'Financial analysis content that meets all requirements for processing and database storage.',
          analysisType: 'COMPREHENSIVE'
        })
      });

      await POST(request);

      expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_test123',
          contentType: 'text',
          status: 'completed',
          consensusReached: true
        })
      });
    });

    it('stores agent messages in database', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content: 'Financial analysis content for comprehensive agent message storage testing and validation.',
          analysisType: 'QUICK'
        })
      });

      await POST(request);

      expect(mockPrisma.agentMessage.create).toHaveBeenCalledTimes(3); // One for each agent response
    });

    it('disconnects from database after operation', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content: 'Content for testing database connection cleanup and proper resource management.',
          analysisType: 'COMPREHENSIVE'
        })
      });

      await POST(request);

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles database errors gracefully', async () => {
      mockPrisma.conversation.create.mockRejectedValueOnce(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content: 'Content for testing database error handling and graceful failure recovery.',
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Database connection failed');
    });

    it('handles unexpected errors', async () => {
      auth.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content: 'Content for testing unexpected error handling in the API endpoint.',
          analysisType: 'QUICK'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('ensures database cleanup on errors', async () => {
      mockPrisma.conversation.create.mockRejectedValueOnce(new Error('Test error'));

      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content: 'Content for testing database cleanup during error conditions.',
          analysisType: 'COMPREHENSIVE'
        })
      });

      await POST(request);

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });

  describe('Response Format', () => {
    it('returns correct response structure for successful requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content: 'Successful financial content analysis that should return properly structured response data.',
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('autoGenConversation');
      expect(data.data).toHaveProperty('processingMetrics');
      expect(data.data.processingMetrics).toHaveProperty('totalProcessingTime');
    });

    it('includes processing metrics in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/unified', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content: 'Content for validating processing metrics inclusion in API response structure.',
          analysisType: 'QUICK'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.data.processingMetrics).toHaveProperty('validationTime');
      expect(data.data.processingMetrics).toHaveProperty('conversationTime');
      expect(data.data.processingMetrics).toHaveProperty('totalProcessingTime');
      expect(typeof data.data.processingMetrics.totalProcessingTime).toBe('number');
    });
  });
});