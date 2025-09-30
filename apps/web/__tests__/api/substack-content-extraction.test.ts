/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../../src/app/api/content/substack/route';

// Mock Clerk authentication
jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn()
}));

const mockAuth = require('@clerk/nextjs').auth;

// Mock fetch for HTTP requests
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('Substack Content Extraction API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to authenticated user
    mockAuth.mockReturnValue({ userId: 'test-user-123' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Authentication', () => {
    test('should reject unauthenticated requests', async () => {
      mockAuth.mockReturnValue({ userId: null });

      const request = new NextRequest('http://localhost:3000/api/content/substack', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.substack.com/p/test-article'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('PROCESSING_FAILED');
      expect(data.error?.message).toContain('Unauthorized');
    });

    test('should accept authenticated requests', async () => {
      mockAuth.mockReturnValue({ userId: 'test-user-123' });

      const mockHtml = createMockSubstackHtml({
        title: 'Test Financial Article',
        author: 'John Doe',
        content: 'This is a financial market analysis discussing trading signals and investment strategies.',
        paywall: false
      });

      mockFetch.mockResolvedValueOnce(createMockResponse(mockHtml, 200));

      const request = new NextRequest('http://localhost:3000/api/content/substack', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.substack.com/p/test-article'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      expect(response.status).not.toBe(401);
    });
  });

  describe('URL Validation', () => {
    test('should reject invalid URLs', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/substack', {
        method: 'POST',
        body: JSON.stringify({
          url: 'not-a-valid-url'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      // Should be either 422 (validation) or 500 (processing), but should fail
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
      expect(data.error?.code).toMatch(/INVALID_URL|PROCESSING_FAILED/);
      expect(data.error?.message).toBeDefined();
    });

    test('should reject non-Substack URLs', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/substack', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://medium.com/article/test'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('INVALID_URL');
      expect(data.error?.message).toContain('Invalid Substack URL');
    });

    test('should accept valid Substack URLs', async () => {
      const validUrls = [
        'https://example.substack.com/p/test-article',
        'https://newsletter.substack.com/posts/financial-analysis',
        'https://substack.com/p/market-update'
      ];

      const mockHtml = createMockSubstackHtml({
        title: 'Valid Article',
        content: 'Financial content with market analysis and trading signals.',
        paywall: false
      });

      for (const url of validUrls) {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockHtml, 200));

        const request = new NextRequest('http://localhost:3000/api/content/substack', {
          method: 'POST',
          body: JSON.stringify({ url }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('Content Extraction', () => {
    test('should extract article content successfully', async () => {
      const mockHtml = createMockSubstackHtml({
        title: 'Market Analysis: Q4 2024',
        author: 'Financial Expert',
        content: 'Comprehensive market analysis discussing investment strategies, trading signals, and economic indicators.',
        publishDate: '2024-01-15T10:00:00Z',
        paywall: false
      });

      mockFetch.mockResolvedValueOnce(createMockResponse(mockHtml, 200));

      const request = new NextRequest('http://localhost:3000/api/content/substack', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.substack.com/p/market-analysis'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data?.extractedContent.title).toBe('Market Analysis: Q4 2024');
      expect(data.data?.extractedContent.author).toBe('Financial Expert');
      expect(data.data?.extractedContent.content).toContain('market analysis');
      expect(data.data?.extractedContent.wordCount).toBeGreaterThan(0);
      expect(data.data?.relevanceScore).toBeGreaterThan(40); // Should be financially relevant
    });

    test('should handle paywall detection', async () => {
      const mockHtml = createMockSubstackHtml({
        title: 'Premium Article',
        content: 'Preview content only',
        paywall: true
      });

      mockFetch.mockResolvedValueOnce(createMockResponse(mockHtml, 200));

      const request = new NextRequest('http://localhost:3000/api/content/substack', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.substack.com/p/premium-article'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(402);
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('PAYWALL_DETECTED');
      expect(data.error?.message).toContain('paywall');
    });

    test('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse('', 429));

      const request = new NextRequest('http://localhost:3000/api/content/substack', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.substack.com/p/test-article'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('RATE_LIMITED');
      expect(data.error?.retryAfter).toBe(300);
    });

    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const request = new NextRequest('http://localhost:3000/api/content/substack', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.substack.com/p/test-article'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('NETWORK_ERROR');
    });
  });

  describe('Financial Relevance Validation', () => {
    test('should accept highly relevant financial content', async () => {
      const mockHtml = createMockSubstackHtml({
        title: 'Trading Signals and Market Analysis',
        content: 'Detailed analysis of market trends, trading signals, investment strategies, economic indicators, and portfolio management techniques for successful investing.',
        paywall: false
      });

      mockFetch.mockResolvedValueOnce(createMockResponse(mockHtml, 200));

      const request = new NextRequest('http://localhost:3000/api/content/substack', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.substack.com/p/financial-analysis'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data?.relevanceScore).toBeGreaterThan(70);
      expect(data.data?.metadata.financialTermsFound.length).toBeGreaterThan(5);
    });

    test('should reject non-financial content', async () => {
      const mockHtml = createMockSubstackHtml({
        title: 'Travel Blog: My Trip to Europe',
        content: 'Had a wonderful time visiting Paris, Rome, and Barcelona. Great food and beautiful architecture everywhere.',
        paywall: false
      });

      mockFetch.mockResolvedValueOnce(createMockResponse(mockHtml, 200));

      const request = new NextRequest('http://localhost:3000/api/content/substack', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.substack.com/p/travel-blog'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error?.message).toContain('not financially relevant');
    });

    test('should skip relevance check when requested', async () => {
      const mockHtml = createMockSubstackHtml({
        title: 'Travel Blog: My Trip to Europe',
        content: 'Had a wonderful time visiting Paris, Rome, and Barcelona.',
        paywall: false
      });

      mockFetch.mockResolvedValueOnce(createMockResponse(mockHtml, 200));

      const request = new NextRequest('http://localhost:3000/api/content/substack', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.substack.com/p/travel-blog',
          options: {
            skipRelevanceCheck: true
          }
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data?.relevanceScore).toBe(100); // Default when skipped
    });
  });

  describe('Performance Requirements', () => {
    test('should complete extraction within 3 seconds', async () => {
      const mockHtml = createMockSubstackHtml({
        title: 'Performance Test Article',
        content: 'Quick financial analysis with market data and trading insights.',
        paywall: false
      });

      mockFetch.mockResolvedValueOnce(createMockResponse(mockHtml, 200));

      const startTime = Date.now();
      const request = new NextRequest('http://localhost:3000/api/content/substack', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.substack.com/p/performance-test'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const endTime = Date.now();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data?.metadata.extractionTime).toBeLessThan(3000);
      expect(endTime - startTime).toBeLessThan(3000);
    });

    test('should include performance metrics in response', async () => {
      const mockHtml = createMockSubstackHtml({
        title: 'Metrics Test',
        content: 'Financial content for testing metrics collection.',
        paywall: false
      });

      mockFetch.mockResolvedValueOnce(createMockResponse(mockHtml, 200));

      const request = new NextRequest('http://localhost:3000/api/content/substack', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.substack.com/p/metrics-test'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data?.metadata.extractionTime).toBeDefined();
      expect(data.data?.metadata.confidenceScore).toBeDefined();
      expect(data.data?.contentId).toBeDefined();
    });
  });

  describe('Security', () => {
    test('should not expose sensitive information in error responses', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Internal API key invalid'));

      const request = new NextRequest('http://localhost:3000/api/content/substack', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.substack.com/p/test-article'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      const responseString = JSON.stringify(data);
      expect(responseString).not.toContain('API key');
      expect(responseString).not.toContain('process.env');
      expect(responseString).not.toContain('OPENAI_API_KEY');
    });

    test('should sanitize extracted content', async () => {
      const mockHtml = createMockSubstackHtml({
        title: '<script>alert("xss")</script>Financial Analysis',
        content: 'Market analysis with <script>alert("bad")</script> potential XSS attempts in content.',
        paywall: false
      });

      mockFetch.mockResolvedValueOnce(createMockResponse(mockHtml, 200));

      const request = new NextRequest('http://localhost:3000/api/content/substack', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.substack.com/p/test-xss'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data?.extractedContent.title).not.toContain('<script>');
      expect(data.data?.extractedContent.content).not.toContain('<script>');
      expect(data.data?.extractedContent.title).toBe('Financial Analysis');
    });

    test('should limit content size', async () => {
      const longContent = 'Financial market analysis with trading signals and investment strategies. ' + 'A'.repeat(100000);
      const mockHtml = createMockSubstackHtml({
        title: 'Long Financial Article with Market Analysis',
        content: longContent,
        paywall: false
      });

      mockFetch.mockResolvedValueOnce(createMockResponse(mockHtml, 200));

      const request = new NextRequest('http://localhost:3000/api/content/substack', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.substack.com/p/long-article'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data?.extractedContent.title.length).toBeLessThanOrEqual(500);
      expect(data.data?.extractedContent.author.length).toBeLessThanOrEqual(200);
    });
  });

  describe('AutoGen Integration Placeholder', () => {
    test('should acknowledge AutoGen trigger request but not execute', async () => {
      const mockHtml = createMockSubstackHtml({
        title: 'AutoGen Test Article',
        content: 'Financial content for testing AutoGen integration placeholder.',
        paywall: false
      });

      mockFetch.mockResolvedValueOnce(createMockResponse(mockHtml, 200));

      const request = new NextRequest('http://localhost:3000/api/content/substack', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.substack.com/p/autogen-test',
          options: {
            triggerAutoGen: true
          }
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data?.autoGenTriggered).toBe(false);
      expect(data.data?.conversationId).toBeUndefined();
    });
  });
});

// Helper functions for creating mock data

function createMockSubstackHtml(options: {
  title?: string;
  author?: string;
  content?: string;
  publishDate?: string;
  paywall?: boolean;
}): string {
  const {
    title = 'Default Title',
    author = 'Default Author',
    content = 'Default content',
    publishDate = '2024-01-01T00:00:00Z',
    paywall = false
  } = options;

  const paywallContent = paywall ? '<div class="paywall-callout">Subscribe to continue reading</div>' : '';

  return `
    <html>
      <head>
        <title>${title}</title>
      </head>
      <body>
        <h1 class="post-title">${title}</h1>
        <span rel="author">${author}</span>
        <time datetime="${publishDate}">${publishDate}</time>
        <div class="available-content">
          <p>${content}</p>
          ${paywallContent}
        </div>
      </body>
    </html>
  `;
}

function createMockResponse(html: string, status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : status === 429 ? 'Too Many Requests' : 'Error',
    text: () => Promise.resolve(html),
    json: () => Promise.resolve({}),
    headers: new Headers(),
    url: 'https://example.substack.com/p/test',
    redirected: false,
    type: 'basic',
    body: null,
    bodyUsed: false,
    clone: function() { return this; },
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData())
  } as Response;
}