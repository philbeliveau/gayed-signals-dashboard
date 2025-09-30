/**
 * Integration tests for /api/content/text endpoint
 * Addresses TEST-002: API endpoint /api/content/text lacks integration tests
 */

import { NextRequest } from 'next/server';
import { POST } from '../../../../apps/web/src/app/api/content/text/route';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '../../../../apps/web/src/generated/prisma';

// Mock Clerk authentication
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn()
}));

// Mock Prisma client
jest.mock('../../../../apps/web/src/generated/prisma', () => {
  const mockPrisma = {
    conversation: {
      create: jest.fn()
    },
    agentMessage: {
      create: jest.fn()
    },
    $disconnect: jest.fn()
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma)
  };
});

// Mock DOMPurify
jest.mock('isomorphic-dompurify', () => ({
  sanitize: jest.fn((content: string) => content)
}));

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockPrismaClient = new PrismaClient() as jest.Mocked<PrismaClient>;

describe('/api/content/text POST endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default auth mock
    mockAuth.mockReturnValue({ userId: 'test-user-id' });

    // Default Prisma mocks
    (mockPrismaClient.conversation.create as jest.Mock).mockResolvedValue({
      id: 'test-conversation-id',
      userId: 'test-user-id',
      contentType: 'text',
      status: 'completed'
    });

    (mockPrismaClient.agentMessage.create as jest.Mock).mockResolvedValue({
      id: 'test-message-id',
      conversationId: 'test-conversation-id'
    });
  });

  describe('Authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockAuth.mockReturnValue({ userId: null });

      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Test financial content for market analysis',
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized - Authentication required');
    });

    it('processes request when user is authenticated', async () => {
      const validContent = 'This is comprehensive financial market analysis with investment strategies and portfolio management for optimal returns.';

      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: validContent,
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrismaClient.conversation.create).toHaveBeenCalled();
    });
  });

  describe('Request Validation', () => {
    it('returns 400 for invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid JSON in request body');
    });

    it('returns 400 for content too short', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Short',
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Content too short for meaningful analysis');
    });

    it('returns 400 for content too long', async () => {
      const longContent = 'a'.repeat(10001);

      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: longContent,
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Content exceeds maximum length limit');
    });

    it('accepts valid analysis types', async () => {
      const validContent = 'Financial market analysis with investment portfolio strategies and risk management approaches for better returns.';

      const analysisTypes = ['QUICK', 'COMPREHENSIVE', 'GAYED_FOCUSED'];

      for (const analysisType of analysisTypes) {
        const request = new NextRequest('http://localhost:3000/api/content/text', {
          method: 'POST',
          body: JSON.stringify({
            content: validContent,
            analysisType
          })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });

    it('defaults to COMPREHENSIVE analysis type', async () => {
      const validContent = 'Stock market investment strategies with portfolio diversification and financial risk assessment for optimal performance.';

      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: validContent
          // analysisType omitted
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Check that conversation was created with default analysis type
      expect(mockPrismaClient.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contentTitle: 'Direct Text Analysis - COMPREHENSIVE'
          })
        })
      );
    });
  });

  describe('Content Security Validation', () => {
    it('rejects content with malicious patterns', async () => {
      const maliciousContent = '<script>alert("xss")</script>' + 'financial market analysis '.repeat(10);

      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: maliciousContent,
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Security validation failed');
    });

    it('rejects spam-like content', async () => {
      const spamContent = 'AAAAAAAAAAAAAAAAAAAAAA financial market analysis with repeated characters for spam detection testing';

      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: spamContent,
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Security validation failed');
    });

    it('accepts clean financial content', async () => {
      const cleanContent = 'The financial markets showed strong performance today with portfolio management strategies focusing on risk assessment and investment returns.';

      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: cleanContent,
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Financial Relevance Scoring', () => {
    it('rejects content with low financial relevance', async () => {
      const nonFinancialContent = 'This is a very long text about cooking recipes and food preparation techniques that contains no financial keywords whatsoever for testing purposes.';

      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: nonFinancialContent,
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Content does not appear to be sufficiently financial or market-related');
    });

    it('accepts content with high financial relevance', async () => {
      const financialContent = 'Stock market investment analysis with portfolio diversification strategies, risk management, trading performance, and financial returns optimization.';

      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: financialContent,
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data?.relevanceScore).toBeGreaterThan(0.3);
    });
  });

  describe('Database Integration', () => {
    it('creates conversation record with correct data', async () => {
      const validContent = 'Financial market trends analysis with investment portfolio strategies and risk management for enhanced returns.';

      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: validContent,
          analysisType: 'QUICK'
        })
      });

      await POST(request);

      expect(mockPrismaClient.conversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'test-user-id',
          contentType: 'text',
          contentTitle: 'Direct Text Analysis - QUICK',
          contentContent: validContent,
          status: 'completed',
          consensusReached: true,
          metadata: expect.objectContaining({
            analysisType: 'QUICK',
            includeSignalContext: true
          })
        })
      });
    });

    it('creates agent message records', async () => {
      const validContent = 'Investment portfolio analysis with market diversification strategies and financial risk assessment for optimal trading returns.';

      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: validContent,
          analysisType: 'COMPREHENSIVE'
        })
      });

      await POST(request);

      // Should create 3 agent messages (Financial Analyst, Market Context, Risk Challenger)
      expect(mockPrismaClient.agentMessage.create).toHaveBeenCalledTimes(3);

      // Check that agent messages have correct structure
      const createCalls = (mockPrismaClient.agentMessage.create as jest.Mock).mock.calls;
      expect(createCalls[0][0].data).toMatchObject({
        conversationId: 'test-conversation-id',
        agentType: 'financial_analyst',
        agentName: 'Financial Analyst',
        messageOrder: 1
      });
    });

    it('disconnects from Prisma after processing', async () => {
      const validContent = 'Market analysis with trading strategies and portfolio management for financial investment optimization and risk control.';

      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: validContent,
          analysisType: 'COMPREHENSIVE'
        })
      });

      await POST(request);

      expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
    });
  });

  describe('Response Structure', () => {
    it('returns correct response structure for successful analysis', async () => {
      const validContent = 'Financial portfolio management with investment strategies, market analysis, and risk assessment for trading optimization.';

      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: validContent,
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        data: {
          textId: expect.any(String),
          relevanceScore: expect.any(Number),
          financialCategories: expect.any(Array),
          autoGenConversation: {
            conversationId: expect.any(String),
            agentResponses: expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(String),
                agentName: expect.any(String),
                agentType: expect.any(String),
                message: expect.any(String),
                confidence: expect.any(Number)
              })
            ]),
            consensus: expect.any(String),
            confidenceScore: expect.any(Number)
          },
          processingMetrics: {
            validationTime: expect.any(Number),
            conversationTime: expect.any(Number),
            totalProcessingTime: expect.any(Number)
          }
        }
      });
    });

    it('includes financial categories in response', async () => {
      const validContent = 'Stock market analysis with investment portfolio strategies, economic indicators, and corporate earnings for trading performance.';

      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: validContent,
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.data?.financialCategories).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: expect.any(String),
            relevance: expect.any(Number)
          })
        ])
      );
    });
  });

  describe('Error Handling', () => {
    it('handles database errors gracefully', async () => {
      (mockPrismaClient.conversation.create as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const validContent = 'Financial investment analysis with market strategies and portfolio optimization for enhanced trading returns.';

      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: validContent,
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
      expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
    });

    it('handles unexpected errors with generic message', async () => {
      (mockPrismaClient.conversation.create as jest.Mock).mockRejectedValue('Non-error object');

      const validContent = 'Market portfolio investment strategies with financial risk assessment and trading performance optimization.';

      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: validContent,
          analysisType: 'COMPREHENSIVE'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error occurred');
    });
  });

  describe('Performance Metrics', () => {
    it('includes processing time metrics in response', async () => {
      const validContent = 'Investment portfolio analysis with financial market strategies and risk management for trading optimization.';

      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: validContent,
          analysisType: 'QUICK'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.data?.processingMetrics).toMatchObject({
        validationTime: expect.any(Number),
        conversationTime: expect.any(Number),
        totalProcessingTime: expect.any(Number)
      });

      // Validation time should be reasonable (< 1000ms)
      expect(data.data?.processingMetrics.validationTime).toBeLessThan(1000);
      expect(data.data?.processingMetrics.totalProcessingTime).toBeGreaterThan(0);
    });
  });
});