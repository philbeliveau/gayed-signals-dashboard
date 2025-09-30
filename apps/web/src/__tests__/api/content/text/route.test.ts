/**
 * Integration tests for /api/content/text endpoint
 * Addresses TEST-002: API endpoint /api/content/text lacks integration tests
 */

import { NextRequest } from 'next/server';
import { POST } from '../../../../app/api/content/text/route';
import { auth } from '@clerk/nextjs/server';

// Mock Clerk authentication
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn()
}));

// Mock Prisma client
const mockPrisma = {
  conversation: {
    create: jest.fn()
  },
  agentMessage: {
    create: jest.fn()
  },
  $disconnect: jest.fn()
};

jest.mock('../../../../generated/prisma', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

// Mock DOMPurify
jest.mock('isomorphic-dompurify', () => ({
  sanitize: jest.fn((content: string) => content)
}));

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('/api/content/text POST endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default auth mock
    mockAuth.mockReturnValue({ userId: 'test-user-id' });

    // Default Prisma mocks
    mockPrisma.conversation.create.mockResolvedValue({
      id: 'test-conversation-id',
      userId: 'test-user-id',
      contentType: 'text',
      status: 'completed'
    });

    mockPrisma.agentMessage.create.mockResolvedValue({
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
  });

  describe('Request Validation', () => {
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

    it('accepts valid financial content', async () => {
      const validContent = 'Financial market analysis with investment portfolio strategies and risk management approaches for better returns. This content contains sufficient financial keywords and length.';

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
      expect(mockPrisma.conversation.create).toHaveBeenCalled();
    });
  });

  describe('Database Integration', () => {
    it('creates conversation record with correct data', async () => {
      const validContent = 'Financial market trends analysis with investment portfolio strategies and risk management for enhanced returns and performance optimization.';

      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: validContent,
          analysisType: 'QUICK'
        })
      });

      await POST(request);

      expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'test-user-id',
          contentType: 'text',
          contentTitle: 'Direct Text Analysis - QUICK',
          contentContent: validContent,
          status: 'completed',
          consensusReached: true
        })
      });
    });

    it('creates agent message records', async () => {
      const validContent = 'Investment portfolio analysis with market diversification strategies and financial risk assessment for optimal trading returns and performance metrics.';

      const request = new NextRequest('http://localhost:3000/api/content/text', {
        method: 'POST',
        body: JSON.stringify({
          content: validContent,
          analysisType: 'COMPREHENSIVE'
        })
      });

      await POST(request);

      // Should create 3 agent messages (Financial Analyst, Market Context, Risk Challenger)
      expect(mockPrisma.agentMessage.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('Response Structure', () => {
    it('returns correct response structure for successful analysis', async () => {
      const validContent = 'Financial portfolio management with investment strategies, market analysis, and risk assessment for trading optimization and enhanced returns performance.';

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
            agentResponses: expect.any(Array),
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
  });
});