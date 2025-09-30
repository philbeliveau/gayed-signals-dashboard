/**
 * Test suite for unified conversation export API
 *
 * Tests the enhanced export functionality with multiple formats,
 * signal context integration, and professional formatting.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/conversations/[id]/export/route';

// Mock dependencies
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn()
}));

jest.mock('@/lib/services/conversation-service', () => ({
  conversationService: {
    getConversation: jest.fn()
  }
}));

jest.mock('@/domains/trading-signals/services/signalService', () => ({
  signalService: {
    calculateAllSignals: jest.fn()
  }
}));

import { auth } from '@clerk/nextjs/server';
import { conversationService } from '@/lib/services/conversation-service';
import { signalService } from '@/domains/trading-signals/services/signalService';

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockGetConversation = conversationService.getConversation as jest.MockedFunction<typeof conversationService.getConversation>;
const mockCalculateAllSignals = signalService.calculateAllSignals as jest.MockedFunction<typeof signalService.calculateAllSignals>;

describe('/api/conversations/[id]/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockConversation = {
    id: 'conv-123',
    status: 'completed',
    contentType: 'text',
    contentTitle: 'Market Analysis',
    contentAuthor: 'Test Author',
    contentUrl: 'https://example.com/article',
    createdAt: '2025-01-21T10:00:00Z',
    updatedAt: '2025-01-21T10:15:00Z',
    finalRecommendation: 'Bullish outlook based on signals',
    confidenceScore: 0.85,
    consensusReached: true,
    messages: [
      {
        id: 'msg-1',
        agentType: 'FINANCIAL_ANALYST',
        content: 'Analysis indicates positive market conditions',
        confidence: 0.9,
        timestamp: '2025-01-21T10:05:00Z',
        messageOrder: 1,
        reasoning: 'Based on signal analysis',
        citations: []
      },
      {
        id: 'msg-2',
        agentType: 'MARKET_CONTEXT',
        content: 'Current market environment supports this view',
        confidence: 0.8,
        timestamp: '2025-01-21T10:10:00Z',
        messageOrder: 2,
        reasoning: 'Market data confirms trend',
        citations: []
      }
    ]
  };

  const mockSignalData = {
    signals: [
      { type: 'utilities_spy', value: 0.95, strength: 'strong', risk: 'low' },
      { type: 'vix_defensive', value: 2.5, strength: 'moderate', risk: 'medium' }
    ],
    consensus: {
      recommendation: 'defensive',
      confidence: 0.85,
      risk: 'medium'
    },
    metadata: {
      calculatedAt: '2025-01-21T10:00:00Z',
      dataSource: 'yahoo-finance',
      cached: false
    }
  };

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockAuth.mockReturnValue({ userId: null });

      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/export');
      const response = await GET(request, { params: { id: 'conv-123' } });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized - Authentication required');
    });

    it('should proceed when user is authenticated', async () => {
      mockAuth.mockReturnValue({ userId: 'user-123' });
      mockGetConversation.mockResolvedValue(null); // Will trigger 404

      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/export');
      const response = await GET(request, { params: { id: 'conv-123' } });

      expect(response.status).toBe(404);
    });
  });

  describe('Conversation Access', () => {
    beforeEach(() => {
      mockAuth.mockReturnValue({ userId: 'user-123' });
    });

    it('should return 404 when conversation is not found', async () => {
      mockGetConversation.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/export');
      const response = await GET(request, { params: { id: 'conv-123' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Conversation not found or access denied');
    });

    it('should validate conversation ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversations/abc/export');
      const response = await GET(request, { params: { id: 'abc' } });

      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data.error).toBe('Invalid conversation ID format');
    });
  });

  describe('Export Formats', () => {
    beforeEach(() => {
      mockAuth.mockReturnValue({ userId: 'user-123' });
      mockGetConversation.mockResolvedValue(mockConversation);
      mockCalculateAllSignals.mockResolvedValue(mockSignalData);
    });

    it('should export conversation in JSON format', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/export?format=json');
      const response = await GET(request, { params: { id: 'conv-123' } });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const content = await response.text();
      const exportData = JSON.parse(content);

      expect(exportData.metadata.exportFormat).toBe('json');
      expect(exportData.conversation.id).toBe('conv-123');
      expect(exportData.messages).toHaveLength(2);
      expect(exportData.signalContext).toBeTruthy();
    });

    it('should export conversation in markdown format', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/export?format=markdown');
      const response = await GET(request, { params: { id: 'conv-123' } });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/markdown');

      const content = await response.text();
      expect(content).toContain('# AutoGen Financial Intelligence Analysis');
      expect(content).toContain('Market Analysis');
      expect(content).toContain('FINANCIAL_ANALYST Agent');
    });

    it('should export conversation in text format', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/export?format=txt');
      const response = await GET(request, { params: { id: 'conv-123' } });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain');

      const content = await response.text();
      expect(content).toContain('AUTOGEN FINANCIAL INTELLIGENCE CONVERSATION EXPORT');
      expect(content).toContain('Conversation ID: conv-123');
      expect(content).toContain('AGENT CONVERSATION TRANSCRIPT');
    });

    it('should return PDF generation data for PDF format', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/export?format=pdf');
      const response = await GET(request, { params: { id: 'conv-123' } });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const content = await response.text();
      const exportData = JSON.parse(content);
      expect(exportData.type).toBe('pdf-generation-data');
      expect(exportData.conversation).toBeTruthy();
    });

    it('should return Excel data for Excel format', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/export?format=excel');
      const response = await GET(request, { params: { id: 'conv-123' } });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const content = await response.text();
      const exportData = JSON.parse(content);
      expect(exportData.type).toBe('excel-data');
      expect(exportData.sheets.Summary).toBeTruthy();
      expect(exportData.sheets.Messages).toBeTruthy();
    });
  });

  describe('Export Options', () => {
    beforeEach(() => {
      mockAuth.mockReturnValue({ userId: 'user-123' });
      mockGetConversation.mockResolvedValue(mockConversation);
      mockCalculateAllSignals.mockResolvedValue(mockSignalData);
    });

    it('should include signal context when requested', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/export?format=json&includeSignalContext=true');
      const response = await GET(request, { params: { id: 'conv-123' } });

      expect(response.status).toBe(200);

      const content = await response.text();
      const exportData = JSON.parse(content);

      expect(exportData.signalContext).toBeTruthy();
      expect(exportData.signalContext.currentSignals).toHaveLength(2);
      expect(exportData.signalContext.marketConditions).toBeTruthy();
      expect(mockCalculateAllSignals).toHaveBeenCalledWith({ useCache: true });
    });

    it('should exclude signal context when not requested', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/export?format=json&includeSignalContext=false');
      const response = await GET(request, { params: { id: 'conv-123' } });

      expect(response.status).toBe(200);

      const content = await response.text();
      const exportData = JSON.parse(content);

      expect(exportData.signalContext).toBeNull();
      expect(mockCalculateAllSignals).not.toHaveBeenCalled();
    });

    it('should handle signal service errors gracefully', async () => {
      mockCalculateAllSignals.mockRejectedValue(new Error('Signal service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/export?format=json&includeSignalContext=true');
      const response = await GET(request, { params: { id: 'conv-123' } });

      expect(response.status).toBe(200);

      const content = await response.text();
      const exportData = JSON.parse(content);

      expect(exportData.signalContext).toBeTruthy();
      expect(exportData.signalContext.currentSignals).toHaveLength(0);
      expect(exportData.signalContext.marketConditions.dataSource).toBe('unavailable');
    });
  });

  describe('Content-Disposition Headers', () => {
    beforeEach(() => {
      mockAuth.mockReturnValue({ userId: 'user-123' });
      mockGetConversation.mockResolvedValue(mockConversation);
      mockCalculateAllSignals.mockResolvedValue(mockSignalData);
    });

    it('should set appropriate filename for each format', async () => {
      const formats = ['json', 'txt', 'markdown'];

      for (const format of formats) {
        const request = new NextRequest(`http://localhost:3000/api/conversations/conv-123/export?format=${format}`);
        const response = await GET(request, { params: { id: 'conv-123' } });

        expect(response.status).toBe(200);

        const contentDisposition = response.headers.get('Content-Disposition');
        expect(contentDisposition).toContain('attachment; filename=');
        expect(contentDisposition).toContain(`conversation-conv-123`);
        expect(contentDisposition).toContain(`.${format}`);
      }
    });
  });

  describe('Analytics Calculations', () => {
    beforeEach(() => {
      mockAuth.mockReturnValue({ userId: 'user-123' });
      mockGetConversation.mockResolvedValue(mockConversation);
      mockCalculateAllSignals.mockResolvedValue(mockSignalData);
    });

    it('should calculate conversation analytics correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/export?format=json');
      const response = await GET(request, { params: { id: 'conv-123' } });

      expect(response.status).toBe(200);

      const content = await response.text();
      const exportData = JSON.parse(content);

      expect(exportData.analytics.messageCount).toBe(2);
      expect(exportData.analytics.averageConfidence).toBe(85); // (90 + 80) / 2 = 85
      expect(exportData.analytics.agentParticipation).toEqual({
        'FINANCIAL_ANALYST': 1,
        'MARKET_CONTEXT': 1
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockAuth.mockReturnValue({ userId: 'user-123' });
    });

    it('should handle conversation service errors', async () => {
      mockGetConversation.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/export');
      const response = await GET(request, { params: { id: 'conv-123' } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Database connection failed');
      expect(data.processingTime).toBeDefined();
    });

    it('should validate export parameters', async () => {
      mockGetConversation.mockResolvedValue(mockConversation);

      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/export?format=invalid');
      const response = await GET(request, { params: { id: 'conv-123' } });

      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data.error).toBe('Invalid export parameters');
      expect(data.details).toBeDefined();
    });
  });
});