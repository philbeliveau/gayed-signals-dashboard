/**
 * Market Context Agent Tests
 * Story 1.6 Implementation - Comprehensive Testing
 *
 * Tests all acceptance criteria including:
 * - MCP service integration
 * - FRED API connection
 * - Real-time market analysis
 * - Economic context awareness
 * - Data integrity enforcement
 * - No-fallback data patterns
 */

import { MarketContextAgent } from '../../../../domains/ai-agents/agents/agents/market-context-agent';
import { ExtractedClaim } from '../../../../types/fact-check';
import { webSearchService } from '../../../../lib/fact-check/web-search-service';
import { createFREDClient } from '../../../../domains/market-data/services/fred-api-client';

// Mock external dependencies
jest.mock('../../../../lib/fact-check/web-search-service');
jest.mock('../../../../domains/market-data/services/fred-api-client');
jest.mock('../../../../domains/market-data/services/economic-data-pipeline');

const mockWebSearchService = webSearchService as jest.Mocked<typeof webSearchService>;
const mockCreateFREDClient = createFREDClient as jest.MockedFunction<typeof createFREDClient>;

describe('MarketContextAgent', () => {
  let agent: MarketContextAgent;
  let mockClaim: ExtractedClaim;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create agent instance
    agent = new MarketContextAgent();

    // Setup test claim
    mockClaim = {
      id: 'test-claim-123',
      text: 'Federal Reserve will raise interest rates due to high unemployment',
      claimText: 'Federal Reserve will raise interest rates due to high unemployment',
      category: 'ECONOMIC',
      confidence: 85,
      extractedAt: new Date().toISOString(),
      source: 'test-source'
    };
  });

  describe('Initialization (AC: 1, 2, 3)', () => {
    it('should initialize with correct MCP services', () => {
      const requirements = agent.getMcpRequirements();

      expect(requirements).toContain('@jschuller/perplexity-mcp');
      expect(requirements).toContain('@tongxiao/web-search-mcp-server');
      expect(requirements).toContain('fred-api-integration');
      expect(requirements).toContain('economic-data-pipeline');
    });

    it('should have FINANCIAL agent type for existing integrations', () => {
      expect(agent['agentType']).toBe('FINANCIAL');
    });

    it('should handle FRED client initialization failure gracefully', async () => {
      mockCreateFREDClient.mockImplementation(() => {
        throw new Error('FRED API key not configured');
      });

      const newAgent = new MarketContextAgent();
      expect(newAgent['fredClient']).toBeNull();
    });
  });

  describe('FRED API Integration (AC: 2, 3)', () => {
    const mockFREDClient = {
      getLatestIndicators: jest.fn(),
      getSeriesObservations: jest.fn(),
      getRateLimitStatus: jest.fn()
    };

    beforeEach(() => {
      mockCreateFREDClient.mockReturnValue(mockFREDClient as any);
    });

    it('should successfully fetch FRED economic indicators', async () => {
      // Set up a successful FRED client
      const successfulAgent = new MarketContextAgent();
      mockCreateFREDClient.mockReturnValue(mockFREDClient as any);
      successfulAgent['fredClient'] = mockFREDClient as any;

      mockFREDClient.getLatestIndicators.mockResolvedValue({
        housing: {
          'CSUSHPINSA': { value: 150.5, date: '2024-01-15' }
        },
        employment: {
          'UNRATE': { value: 3.7, date: '2024-01-15' }
        }
      });

      const investigation = await successfulAgent.investigateClaim(mockClaim);

      expect(mockFREDClient.getLatestIndicators).toHaveBeenCalled();
      expect(investigation.evidenceFound.some(e => e.source === 'Federal Reserve Economic Data (FRED)')).toBe(true);
      expect(investigation.mcpUsed).toContain('fred-api-integration');
      expect(investigation.sourcesSearched).toContain('fred-economic-data');
    });

    it('should handle FRED API unavailability without synthetic data (AC: 11, 12)', async () => {
      agent['fredClient'] = null; // Simulate unavailable FRED client

      const investigation = await agent.investigateClaim(mockClaim);

      expect(investigation.reasoning).toContain('FRED Economic Data');
      expect(investigation.reasoning).toContain('currently unavailable');
      expect(investigation.reasoning).toContain('no synthetic data used');
      expect(investigation.confidenceScore).toBeLessThan(100);
    });

    it('should identify relevant economic series from claim content', async () => {
      const unemploymentClaim = {
        ...mockClaim,
        claimText: 'Unemployment rate has reached historic lows'
      };

      mockFREDClient.getLatestIndicators.mockResolvedValue({
        housing: {},
        employment: {
          'UNRATE': { value: 3.7, date: '2024-01-15' },
          'PAYEMS': { value: 156000, date: '2024-01-15' }
        }
      });

      const investigation = await agent.investigateClaim(unemploymentClaim);

      expect(investigation.evidenceFound.some(e => e.content.includes('UNRATE'))).toBe(true);
    });
  });

  describe('Perplexity MCP Integration (AC: 1, 4, 6)', () => {
    it('should fetch market intelligence from Perplexity via web search', async () => {
      const mockSearchResults = [
        {
          title: 'Fed Policy Analysis',
          url: 'https://federalreserve.gov/policy-analysis',
          content: 'Federal Reserve policy indicates potential rate adjustments based on employment data',
          source: 'Federal Reserve',
          credibilityScore: 95,
          relevanceScore: 90,
          publishDate: '2024-01-15'
        }
      ];

      mockWebSearchService.searchForEvidence.mockResolvedValue(mockSearchResults);

      const investigation = await agent.investigateClaim(mockClaim);

      expect(mockWebSearchService.searchForEvidence).toHaveBeenCalledWith(
        expect.stringContaining('Federal Reserve policy market analysis'),
        expect.objectContaining({
          agentType: 'FINANCIAL',
          maxResults: 3,
          includeDomains: expect.arrayContaining(['federalreserve.gov', 'bls.gov'])
        })
      );

      expect(investigation.evidenceFound.some(e => e.source === 'Perplexity Market Intelligence')).toBe(true);
      expect(investigation.mcpUsed).toContain('@jschuller/perplexity-mcp');
    });

    it('should handle Perplexity unavailability with explicit notification (AC: 11, 12)', async () => {
      mockWebSearchService.searchForEvidence.mockRejectedValue(new Error('Perplexity API unavailable'));

      const investigation = await agent.investigateClaim(mockClaim);

      expect(investigation.reasoning).toContain('Perplexity Market Intelligence currently unavailable');
      expect(investigation.reasoning).toContain('no fallback data used');
    });
  });

  describe('Web Search Market Context (AC: 8)', () => {
    it('should gather market news from authorized financial sources', async () => {
      const mockSearchResults = [
        {
          title: 'Market Analysis: Fed Decision',
          url: 'https://reuters.com/markets/fed-decision',
          content: 'Market analysts expect Federal Reserve to consider employment indicators',
          source: 'Reuters',
          credibilityScore: 88,
          relevanceScore: 85,
          publishDate: '2024-01-15'
        }
      ];

      mockWebSearchService.searchForEvidence.mockResolvedValue(mockSearchResults);

      const investigation = await agent.investigateClaim(mockClaim);

      expect(mockWebSearchService.searchForEvidence).toHaveBeenCalledWith(
        expect.stringContaining('market news economic analysis'),
        expect.objectContaining({
          agentType: 'FINANCIAL',
          includeDomains: expect.arrayContaining(['reuters.com', 'bloomberg.com', 'wsj.com']),
          excludeDomains: expect.arrayContaining(['example.com', 'test.com', 'mock.com'])
        })
      );

      expect(investigation.evidenceFound.some(e => e.source === 'Market News Web Search')).toBe(true);
    });

    it('should maintain SAFLA compliance for all web sources', async () => {
      const mockSearchResults = [
        {
          title: 'Suspicious Source',
          url: 'https://example.com/fake-news',
          content: 'This is placeholder content',
          source: 'Unknown',
          credibilityScore: 30,
          relevanceScore: 20
        }
      ];

      mockWebSearchService.searchForEvidence.mockResolvedValue(mockSearchResults);

      const investigation = await agent.investigateClaim(mockClaim);

      // Should reject suspicious sources through SAFLA validation
      expect(investigation.evidenceFound.every(e => !e.url.includes('example.com'))).toBe(true);
    });
  });

  describe('Economic Context Analysis (AC: 6, 7)', () => {
    it('should provide Federal Reserve policy context when available', async () => {
      const mockEvidence = [
        {
          title: 'Fed Policy Update',
          url: 'https://federalreserve.gov/policy',
          content: 'Federal Reserve maintains accommodative monetary policy stance due to labor market conditions',
          source: 'Federal Reserve',
          credibilityScore: 95,
          relevanceScore: 90
        }
      ];

      mockWebSearchService.searchForEvidence.mockResolvedValue(mockEvidence);

      const investigation = await agent.investigateClaim(mockClaim);

      expect(investigation.reasoning).toContain('Federal Reserve Context:');
      expect(investigation.reasoning).toContain('accommodative monetary policy');
    });

    it('should integrate employment data with signal contextualization (AC: 7)', async () => {
      const mockFREDClient = {
        getLatestIndicators: jest.fn().mockResolvedValue({
          housing: {},
          employment: {
            'UNRATE': { value: 3.7, date: '2024-01-15' },
            'PAYEMS': { value: 156000, date: '2024-01-15' }
          }
        })
      };

      mockCreateFREDClient.mockReturnValue(mockFREDClient as any);

      const investigation = await agent.investigateClaim(mockClaim);

      expect(investigation.reasoning).toContain('Employment Indicators:');
      expect(investigation.reasoning).toContain('UNRATE: 3.7');
      expect(investigation.reasoning).toContain('PAYEMS: 156000');
    });
  });

  describe('Data Integrity and Quality Assurance (AC: 9, 10, 11, 12)', () => {
    it('should include specific source references for credibility (AC: 9)', async () => {
      const mockEvidence = [
        {
          title: 'BLS Employment Report',
          url: 'https://bls.gov/employment-report',
          content: 'Bureau of Labor Statistics employment data shows trends',
          source: 'Bureau of Labor Statistics',
          credibilityScore: 95,
          relevanceScore: 88,
          author: 'U.S. Bureau of Labor Statistics'
        }
      ];

      mockWebSearchService.searchForEvidence.mockResolvedValue(mockEvidence);

      const investigation = await agent.investigateClaim(mockClaim);

      expect(investigation.evidenceFound[0].url).toContain('bls.gov');
      expect(investigation.evidenceFound[0].author).toBe('U.S. Bureau of Labor Statistics');
      expect(investigation.reasoning).toContain('Bureau of Labor Statistics');
    });

    it('should enhance rather than replace existing signal accuracy (AC: 10)', async () => {
      // Test that agent provides context without contradicting signal calculations
      const investigation = await agent.investigateClaim(mockClaim);

      expect(investigation.reasoning).toContain('Analysis based exclusively on real market data');
      expect(investigation.reasoning).toContain('transparent source attribution');
    });

    it('should explicitly state when data is unavailable (AC: 11)', async () => {
      // Simulate all data sources unavailable
      agent['fredClient'] = null;
      mockWebSearchService.searchForEvidence.mockResolvedValue([]);

      const investigation = await agent.investigateClaim(mockClaim);

      expect(investigation.reasoning).toContain('DATA AVAILABILITY NOTICE:');
      expect(investigation.reasoning).toContain('currently unavailable');
      expect(investigation.reasoning).toContain('No synthetic or fallback data used');
      expect(investigation.conclusion).toBe('INSUFFICIENT_EVIDENCE');
    });

    it('should reduce confidence when data sources are missing (AC: 12)', async () => {
      // Simulate partial data availability
      mockWebSearchService.searchForEvidence
        .mockResolvedValueOnce([]) // Perplexity fails
        .mockResolvedValueOnce([ // Web search succeeds
          {
            title: 'Market News',
            url: 'https://reuters.com/markets',
            content: 'Market analysis content',
            source: 'Reuters',
            credibilityScore: 85,
            relevanceScore: 80
          }
        ]);

      const investigation = await agent.investigateClaim(mockClaim);

      expect(investigation.reasoning).toContain('confidence reduced by');
      expect(investigation.reasoning).toContain('% due to missing data sources');
      expect(investigation.confidenceScore).toBeLessThan(100);
    });

    it('should never use synthetic or fallback data', async () => {
      // Simulate complete data unavailability
      agent['fredClient'] = null;
      mockWebSearchService.searchForEvidence.mockResolvedValue([]);

      const investigation = await agent.investigateClaim(mockClaim);

      expect(investigation.evidenceFound).toHaveLength(0);
      expect(investigation.reasoning).toContain('maintaining financial-grade data integrity');
      expect(investigation.reasoning).not.toContain('estimated');
      expect(investigation.reasoning).not.toContain('simulated');
      expect(investigation.reasoning).not.toContain('placeholder');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle complete system failure gracefully', async () => {
      // Simulate all systems failing
      agent['fredClient'] = null;
      mockWebSearchService.searchForEvidence.mockRejectedValue(new Error('Network error'));

      const investigation = await agent.investigateClaim(mockClaim);

      expect(investigation.conclusion).toBe('INSUFFICIENT_EVIDENCE');
      expect(investigation.confidenceScore).toBe(0);
      expect(investigation.reasoning).toContain('No real market data available');
      expect(investigation.saflaCompliant).toBe(true);
    });

    it('should maintain audit trail for transparency', async () => {
      const mockEvidence = [
        {
          title: 'Test Source',
          url: 'https://federalreserve.gov/test',
          content: 'Test content',
          source: 'Federal Reserve',
          credibilityScore: 90,
          relevanceScore: 85
        }
      ];

      mockWebSearchService.searchForEvidence.mockResolvedValue(mockEvidence);

      await agent.investigateClaim(mockClaim);

      const auditTrail = agent.getAuditTrail();
      expect(auditTrail.length).toBeGreaterThan(0);
      expect(auditTrail.every(entry => entry.saflaResult)).toBeTruthy();
    });

    it('should validate real data compliance', async () => {
      const isCompliant = await agent.validateRealDataOnly();
      expect(isCompliant).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete investigation within reasonable time', async () => {
      const startTime = Date.now();

      mockWebSearchService.searchForEvidence.mockResolvedValue([]);

      const investigation = await agent.investigateClaim(mockClaim);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(30000); // 30 seconds max
      expect(investigation.processingTimeMs).toBeGreaterThan(0);
    });

    it('should handle rate limiting appropriately', async () => {
      // This would typically test FRED client rate limiting
      // For now, verify it doesn't throw unhandled errors
      const investigation = await agent.investigateClaim(mockClaim);
      expect(investigation).toBeDefined();
    });
  });
});

describe('MarketContextAgent Integration Tests', () => {
  let agent: MarketContextAgent;

  beforeEach(() => {
    agent = new MarketContextAgent();
  });

  describe('End-to-End Investigation Flow', () => {
    it('should complete full investigation cycle with mixed data availability', async () => {
      const claim: ExtractedClaim = {
        id: 'integration-test-claim',
        text: 'Federal Reserve policy changes will impact housing market significantly',
        claimText: 'Federal Reserve policy changes will impact housing market significantly',
        category: 'ECONOMIC',
        confidence: 80,
        extractedAt: new Date().toISOString(),
        source: 'integration-test'
      };

      // Mock partial success scenario
      mockWebSearchService.searchForEvidence.mockResolvedValue([
        {
          title: 'Fed Housing Impact Analysis',
          url: 'https://federalreserve.gov/housing-impact',
          content: 'Federal Reserve policy decisions have historically influenced housing market dynamics',
          source: 'Federal Reserve',
          credibilityScore: 95,
          relevanceScore: 92,
          publishDate: '2024-01-15',
          author: 'Federal Reserve Board'
        }
      ]);

      const investigation = await agent.investigateClaim(claim);

      // Verify complete investigation structure
      expect(investigation.id).toContain('market-context-');
      expect(investigation.claimId).toBe(claim.id);
      expect(investigation.agentType).toBe('FINANCIAL');
      expect(investigation.evidenceFound).toBeDefined();
      expect(investigation.sourcesSearched).toBeDefined();
      expect(investigation.mcpUsed).toBeDefined();
      expect(investigation.reasoning).toBeDefined();
      expect(investigation.processingTimeMs).toBeGreaterThan(0);
      expect(investigation.saflaCompliant).toBe(true);
      expect(investigation.createdAt).toBeInstanceOf(Date);
    });
  });
});