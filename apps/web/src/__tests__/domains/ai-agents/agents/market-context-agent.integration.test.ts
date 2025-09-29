/**
 * Market Context Agent REAL DATA Integration Tests
 * Story 1.6 Implementation - REAL API Integration Only
 *
 * 🚨 CRITICAL: THESE TESTS USE REAL DATA ONLY
 * - FRED API: Live Federal Reserve economic data
 * - Perplexity MCP: Real-time market intelligence
 * - Web Search: Live market news sources
 * - NO MOCKS ALLOWED in this test suite
 */

import { MarketContextAgent } from '../../../../domains/ai-agents/agents/agents/market-context-agent';
import { ExtractedClaim } from '../../../../types/fact-check';

describe('MarketContextAgent Real Data Integration Tests', () => {
  let agent: MarketContextAgent;
  let realClaim: ExtractedClaim;

  beforeAll(() => {
    // Verify required environment variables for real API access
    const requiredVars = ['FRED_API_KEY', 'OPENAI_API_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables for real data testing: ${missingVars.join(', ')}`);
    }

    console.log('🔑 Real API credentials verified - proceeding with live data tests');
  });

  beforeEach(() => {
    // Create agent with real API access - NO MOCKS
    agent = new MarketContextAgent();

    // Real claim based on current economic conditions
    realClaim = {
      id: 'real-integration-test',
      text: 'Federal Reserve policy changes are affecting unemployment rates',
      claimText: 'Federal Reserve policy changes are affecting unemployment rates',
      category: 'ECONOMIC',
      confidence: 80,
      extractedAt: new Date().toISOString(),
      source: 'real-integration-test'
    };
  });

  describe('REAL FRED API Integration', () => {
    it('should fetch LIVE employment data from Federal Reserve', async () => {
      console.log('🏦 Testing REAL FRED API integration...');

      const investigation = await agent.investigateClaim(realClaim);

      // Verify REAL FRED data was retrieved
      expect(investigation).toBeDefined();
      expect(investigation.evidenceFound).toBeDefined();

      // Check for REAL economic indicators (not mocked)
      const fredEvidence = investigation.evidenceFound.filter(e =>
        e.source === 'Federal Reserve Economic Data (FRED)'
      );

      if (fredEvidence.length > 0) {
        console.log(`✅ REAL FRED data retrieved: ${fredEvidence.length} indicators`);

        // Verify real data characteristics
        fredEvidence.forEach(evidence => {
          expect(evidence.url).toContain('fred.stlouisfed.org');
          expect(evidence.content).toContain('Latest');
          expect(evidence.content).toMatch(/\d+\.\d+/); // Real numeric values
          expect(evidence.publishDate).toBeTruthy();
        });
      } else {
        console.log('⚠️ FRED API currently unavailable - testing graceful degradation');

        // Verify transparent unavailability handling
        expect(investigation.reasoning).toContain('FRED');
        expect(investigation.reasoning).toContain('unavailable');
        expect(investigation.reasoning).toContain('no synthetic data used');
      }

      // Verify SAFLA compliance with real data
      expect(investigation.saflaCompliant).toBe(true);
      expect(investigation.processingTimeMs).toBeGreaterThan(0);

      console.log(`📊 Investigation completed in ${investigation.processingTimeMs}ms`);
    }, 30000); // 30 second timeout for real API calls

    it('should handle REAL FRED API rate limiting gracefully', async () => {
      console.log('⚡ Testing REAL FRED API rate limiting...');

      // Make multiple rapid calls to test rate limiting
      const investigations = await Promise.allSettled([
        agent.investigateClaim({...realClaim, id: 'rate-test-1'}),
        agent.investigateClaim({...realClaim, id: 'rate-test-2'}),
        agent.investigateClaim({...realClaim, id: 'rate-test-3'})
      ]);

      // Verify all investigations completed (may have degraded performance)
      investigations.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value.saflaCompliant).toBe(true);
          console.log(`Investigation ${index + 1}: ${result.value.conclusion} (${result.value.processingTimeMs}ms)`);
        }
      });

      console.log('✅ Rate limiting handled gracefully');
    }, 45000);
  });

  describe('REAL Perplexity MCP Integration', () => {
    it('should fetch LIVE market intelligence from Perplexity', async () => {
      console.log('🌍 Testing REAL Perplexity MCP integration...');

      const marketClaim = {
        ...realClaim,
        claimText: 'Current Federal Reserve policy is impacting stock market volatility'
      };

      const investigation = await agent.investigateClaim(marketClaim);

      // Check for real market intelligence
      const perplexityEvidence = investigation.evidenceFound.filter(e =>
        e.source === 'Perplexity Market Intelligence'
      );

      if (perplexityEvidence.length > 0) {
        console.log(`✅ REAL Perplexity data retrieved: ${perplexityEvidence.length} sources`);

        // Verify real market intelligence characteristics
        perplexityEvidence.forEach(evidence => {
          expect(evidence.title).toBeTruthy();
          expect(evidence.content).toBeTruthy();
          expect(evidence.credibilityScore).toBeGreaterThan(0);
          expect(evidence.relevanceScore).toBeGreaterThan(0);

          // Should contain real financial domains
          const validDomains = ['federalreserve.gov', 'bls.gov', 'bloomberg.com', 'reuters.com', 'wsj.com'];
          const hasValidDomain = validDomains.some(domain => evidence.url.includes(domain));
          expect(hasValidDomain).toBe(true);
        });
      } else {
        console.log('⚠️ Perplexity MCP currently unavailable - testing graceful degradation');
        expect(investigation.reasoning).toContain('Perplexity');
        expect(investigation.reasoning).toContain('unavailable');
      }

      expect(investigation.saflaCompliant).toBe(true);
      console.log(`🎯 Market intelligence analysis: ${investigation.conclusion}`);
    }, 45000);
  });

  describe('REAL Web Search Integration', () => {
    it('should fetch LIVE market news from authorized sources', async () => {
      console.log('🔍 Testing REAL web search integration...');

      const newsClaim = {
        ...realClaim,
        claimText: 'Recent employment reports show significant economic trends'
      };

      const investigation = await agent.investigateClaim(newsClaim);

      // Check for real market news
      const webEvidence = investigation.evidenceFound.filter(e =>
        e.source === 'Market News Web Search'
      );

      if (webEvidence.length > 0) {
        console.log(`✅ REAL web search data retrieved: ${webEvidence.length} sources`);

        // Verify real news characteristics
        webEvidence.forEach(evidence => {
          expect(evidence.title).toBeTruthy();
          expect(evidence.content).toBeTruthy();
          expect(evidence.url).toMatch(/^https?:\/\//);

          // Should NOT contain placeholder domains
          expect(evidence.url).not.toContain('example.com');
          expect(evidence.url).not.toContain('test.com');
          expect(evidence.url).not.toContain('mock.com');
        });
      } else {
        console.log('⚠️ Web search currently unavailable - testing graceful degradation');
        expect(investigation.reasoning).toContain('Web');
        expect(investigation.reasoning).toContain('unavailable');
      }

      expect(investigation.saflaCompliant).toBe(true);
      console.log(`📰 News analysis completed: ${investigation.conclusion}`);
    }, 30000);
  });

  describe('REAL Data Performance Benchmarks', () => {
    it('should complete REAL data investigation within performance thresholds', async () => {
      console.log('⏱️ Testing REAL API performance benchmarks...');

      const startTime = Date.now();
      const investigation = await agent.investigateClaim(realClaim);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const reportedTime = investigation.processingTimeMs;

      console.log(`🚀 Performance Results:`);
      console.log(`   Total time: ${totalTime}ms`);
      console.log(`   Reported time: ${reportedTime}ms`);
      console.log(`   Evidence sources: ${investigation.evidenceFound.length}`);
      console.log(`   Sources searched: ${investigation.sourcesSearched.length}`);
      console.log(`   MCP services used: ${investigation.mcpUsed.length}`);

      // Performance thresholds for real API calls
      expect(totalTime).toBeLessThan(60000); // 60 seconds max
      expect(reportedTime).toBeGreaterThan(0); // Must have measurable processing time
      expect(investigation.evidenceFound).toBeDefined();
      expect(investigation.saflaCompliant).toBe(true);

      console.log('✅ Performance benchmarks met with real data');
    }, 65000);

    it('should handle REAL API failures with proper transparency', async () => {
      console.log('🛡️ Testing REAL API failure transparency...');

      // Test with actual network conditions
      const investigation = await agent.investigateClaim(realClaim);

      // Verify transparency in reasoning regardless of data availability
      expect(investigation.reasoning).toContain('DATA AVAILABILITY');

      if (investigation.evidenceFound.length === 0) {
        // If no real data available, must explicitly state this
        expect(investigation.reasoning).toContain('No real market data available');
        expect(investigation.reasoning).toContain('no synthetic data used');
        expect(investigation.conclusion).toBe('INSUFFICIENT_EVIDENCE');
      } else {
        // If real data available, must attribute sources
        expect(investigation.reasoning).toContain('Analysis based exclusively on real market data');
      }

      expect(investigation.saflaCompliant).toBe(true);
      console.log(`🔍 Transparency validation: ${investigation.reasoning.substring(0, 100)}...`);
    }, 30000);
  });

  describe('REAL Data SAFLA Protocol Validation', () => {
    it('should enforce SAFLA protocol with REAL external data', async () => {
      console.log('🛡️ Testing REAL data SAFLA protocol enforcement...');

      const investigation = await agent.investigateClaim(realClaim);

      // Get audit trail from agent
      const auditTrail = agent.getAuditTrail();

      expect(auditTrail).toBeDefined();
      expect(auditTrail.length).toBeGreaterThan(0);

      // Verify SAFLA validation was performed on real data
      auditTrail.forEach(entry => {
        expect(entry.saflaResult).toBeDefined();
        expect(entry.saflaResult.sourceProvenance).toBeDefined();
        expect(entry.timestamp).toBeGreaterThan(0);
        expect(entry.operation).toBeTruthy();
        expect(entry.mcpUsed).toBeTruthy();
      });

      // Verify validateRealDataOnly compliance
      const isRealDataCompliant = await agent.validateRealDataOnly();
      expect(isRealDataCompliant).toBe(true);

      console.log(`✅ SAFLA protocol enforced: ${auditTrail.length} audit entries`);
    }, 30000);
  });
});

/**
 * Test Environment Setup Validation
 */
describe('Real Data Test Environment', () => {
  it('should have required environment variables for real API testing', () => {
    // These must be set for real data testing
    expect(process.env.NODE_ENV).toBe('test');

    // Real API keys required (check existence, not values for security)
    const hasKeyPattern = (key: string) => key && key.length > 10 && !key.includes('mock');

    if (process.env.FRED_API_KEY) {
      expect(hasKeyPattern(process.env.FRED_API_KEY)).toBe(true);
      console.log('✅ FRED API key configured');
    } else {
      console.log('⚠️ FRED_API_KEY not set - some tests may be skipped');
    }

    if (process.env.OPENAI_API_KEY) {
      expect(hasKeyPattern(process.env.OPENAI_API_KEY)).toBe(true);
      console.log('✅ OpenAI API key configured');
    } else {
      console.log('⚠️ OPENAI_API_KEY not set - some tests may be skipped');
    }

    console.log('🔧 Real data test environment validated');
  });
});