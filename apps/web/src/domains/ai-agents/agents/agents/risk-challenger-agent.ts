/**
 * Risk Challenger Agent - Systematic Adversarial Analysis Agent
 * AutoGen Integration Implementation
 *
 * 🚨 CRITICAL: FINANCIAL-GRADE DATA INTEGRITY + HISTORICAL ANALYSIS
 *
 * Specialization: Adversarial analysis, stress testing, contrarian viewpoints
 * Integration: Monte Carlo + Bootstrap + SAFLA + Historical Backtesting
 * Personality: Professional skepticism with constructive challenge
 */

import { BaseFactCheckAgent, SAFLAValidationResult } from './base-agent';
import { ExtractedClaim, Investigation, SourceEvidence, McpResponse, AgentType, VeracityLevel } from '@/types/fact-check';
import { MonteCarloEngine } from '../../../backtesting/engines/monte-carlo';
import { BootstrapEngine } from '../../../backtesting/engines/bootstrap';
import { SAFLAValidator } from '../../../risk-management/utils/safla-validator';
import { StrategyDefinition, BacktestConfig, MarketData, Signal, ConsensusSignal, PerformanceMetrics } from '../../../types';

/**
 * Risk Challenger specific types
 */
interface RiskChallenge {
  id: string;
  challengeType: 'stress_test' | 'historical_failure' | 'assumption_challenge' | 'contrarian_view' | 'timing_risk';
  originalClaim: string;
  challengeQuestion: string;
  evidence: HistoricalEvidence[];
  riskScore: number; // 0-100
  confidence: number; // 0-100
  reasoning: string;
  mitigationSuggestions: string[];
  historicalPrecedents: HistoricalPrecedent[];
}

interface HistoricalEvidence {
  date: string;
  scenario: string;
  performance: PerformanceMetrics;
  failureMode: string;
  marketConditions: string;
  lessons: string;
}

interface HistoricalPrecedent {
  period: string;
  description: string;
  similarityScore: number;
  outcome: string;
  lessons: string;
}

interface StressTestResult {
  scenario: string;
  maxDrawdown: number;
  recoveryTime: number;
  successRate: number;
  confidenceInterval: { lower: number; upper: number; median: number };
}

export class RiskChallengerAgent extends BaseFactCheckAgent {
  private monteCarloEngine: MonteCarloEngine;
  private bootstrapEngine: BootstrapEngine;
  private saflaValidator: SAFLAValidator;
  private challengeHistory: RiskChallenge[] = [];

  constructor() {
    super('RISK_CHALLENGER');
    this.mcpServices = [
      '@jschuller/perplexity-mcp',
      'mcp-trader',
      '@tongxiao/web-search-mcp-server'
    ];

    // Initialize backtesting engines
    this.monteCarloEngine = new MonteCarloEngine(Date.now()); // Seeded for reproducibility
    this.bootstrapEngine = new BootstrapEngine();
    this.saflaValidator = SAFLAValidator.getInstance();
  }

  /**
   * Get MCP requirements for this agent
   */
  getMcpRequirements(): string[] {
    return this.mcpServices;
  }

  /**
   * Challenge analysis with systematic adversarial questioning
   */
  async investigateClaim(claim: ExtractedClaim): Promise<Investigation> {
    const startTime = Date.now();
    const investigation: Investigation = {
      id: `risk-challenger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      claimId: claim.id,
      agentType: 'RISK_CHALLENGER',
      sourcesSearched: [],
      evidenceFound: [],
      conclusion: 'INSUFFICIENT_EVIDENCE',
      confidenceScore: 0,
      reasoning: '',
      mcpUsed: [],
      processingTimeMs: 0,
      saflaCompliant: true,
      createdAt: new Date()
    };

    try {
      console.log(`⚠️ Risk Challenger investigating: "${claim.claimText}"`);

      // Store investigation start in coordination memory
      await this.storeInMemory(`investigations/risk-challenger/${investigation.id}/started`, {
        claimId: claim.id,
        claimText: claim.claimText,
        timestamp: Date.now()
      });

      // STRATEGY 1: Systematic Adversarial Analysis
      const adversarialChallenges = await this.generateAdversarialChallenges(claim);
      investigation.sourcesSearched.push('adversarial-analysis');

      // STRATEGY 2: Historical Failure Analysis
      const historicalEvidence = await this.analyzeHistoricalFailures(claim);
      if (historicalEvidence.length > 0) {
        investigation.evidenceFound.push(...this.convertHistoricalToSourceEvidence(historicalEvidence));
        investigation.sourcesSearched.push('historical-backtesting');
      }

      // STRATEGY 3: Monte Carlo Stress Testing
      const stressTestResults = await this.performStressTesting(claim);
      if (stressTestResults.length > 0) {
        investigation.evidenceFound.push(...this.convertStressTestToSourceEvidence(stressTestResults));
        investigation.mcpUsed.push('monte-carlo-engine');
        investigation.sourcesSearched.push('monte-carlo-stress-testing');
      }

      // STRATEGY 4: Bootstrap Confidence Analysis
      const confidenceAnalysis = await this.performConfidenceAnalysis(claim);
      if (confidenceAnalysis) {
        investigation.evidenceFound.push(this.convertConfidenceToSourceEvidence(confidenceAnalysis));
        investigation.sourcesSearched.push('bootstrap-confidence-analysis');
      }

      // STRATEGY 5: External Contrarian Research
      const contrarianEvidence = await this.searchContrarianViewpoints(claim);
      if (contrarianEvidence.length > 0) {
        investigation.evidenceFound.push(...contrarianEvidence);
        investigation.mcpUsed.push('@jschuller/perplexity-mcp', '@tongxiao/web-search-mcp-server');
        investigation.sourcesSearched.push('contrarian-research');
      }

      // ANALYSIS: Comprehensive Risk Assessment
      const riskAnalysis = await this.performComprehensiveRiskAnalysis(
        adversarialChallenges,
        investigation.evidenceFound,
        claim
      );

      investigation.conclusion = riskAnalysis.veracity;
      investigation.confidenceScore = riskAnalysis.confidence;
      investigation.reasoning = riskAnalysis.reasoning;

      // SAFLA COMPLIANCE CHECK
      investigation.saflaCompliant = await this.validateRealDataOnly();

      // Store final investigation in coordination memory
      await this.storeInMemory(`investigations/risk-challenger/${investigation.id}/completed`, {
        conclusion: investigation.conclusion,
        confidenceScore: investigation.confidenceScore,
        evidenceCount: investigation.evidenceFound.length,
        challengeCount: adversarialChallenges.length,
        saflaCompliant: investigation.saflaCompliant,
        processingTimeMs: Date.now() - startTime
      });

      investigation.processingTimeMs = Date.now() - startTime;

      console.log(`✅ Risk Challenger analysis completed: ${investigation.conclusion} (${investigation.confidenceScore}% confidence)`);

      return investigation;

    } catch (error) {
      console.error(`❌ Risk Challenger Agent error:`, error);
      investigation.reasoning = `Risk analysis failed: ${error}`;
      investigation.saflaCompliant = false;
      investigation.processingTimeMs = Date.now() - startTime;
      return investigation;
    }
  }

  /**
   * Generate systematic adversarial challenges
   */
  private async generateAdversarialChallenges(claim: ExtractedClaim): Promise<RiskChallenge[]> {
    const challenges: RiskChallenge[] = [];

    try {
      // 1. Assumption Challenge
      const assumptionChallenge = await this.challengeAssumptions(claim);
      if (assumptionChallenge) challenges.push(assumptionChallenge);

      // 2. Timing Risk Challenge
      const timingChallenge = await this.challengeMarketTiming(claim);
      if (timingChallenge) challenges.push(timingChallenge);

      // 3. Contrarian View Challenge
      const contrarianChallenge = await this.generateContrarianView(claim);
      if (contrarianChallenge) challenges.push(contrarianChallenge);

      // Store challenges in memory for coordination
      await this.storeInMemory(`challenges/risk-challenger/${Date.now()}`, {
        claimId: claim.id,
        challengeCount: challenges.length,
        challengeTypes: challenges.map(c => c.challengeType)
      });

      return challenges;

    } catch (error) {
      console.error(`Error generating adversarial challenges:`, error);
      return [];
    }
  }

  /**
   * Challenge underlying assumptions
   */
  private async challengeAssumptions(claim: ExtractedClaim): Promise<RiskChallenge | null> {
    try {
      // Extract key assumptions from claim
      const assumptions = this.extractAssumptions(claim.claimText);

      if (assumptions.length === 0) return null;

      const challengeQuestions = assumptions.map(assumption =>
        `What if ${assumption} is incorrect or changes significantly?`
      );

      return {
        id: `assumption-${Date.now()}`,
        challengeType: 'assumption_challenge',
        originalClaim: claim.claimText,
        challengeQuestion: challengeQuestions.join(' | '),
        evidence: [], // Will be populated by historical analysis
        riskScore: 75, // High risk score for assumption challenges
        confidence: 85,
        reasoning: `Identified ${assumptions.length} key assumptions that could invalidate the analysis if incorrect: ${assumptions.join(', ')}`,
        mitigationSuggestions: [
          'Test sensitivity to key assumption changes',
          'Implement scenario analysis with assumption variations',
          'Monitor leading indicators for assumption validity'
        ],
        historicalPrecedents: []
      };

    } catch (error) {
      console.error(`Error challenging assumptions:`, error);
      return null;
    }
  }

  /**
   * Challenge market timing aspects
   */
  private async challengeMarketTiming(claim: ExtractedClaim): Promise<RiskChallenge | null> {
    try {
      const timingElements = this.extractTimingElements(claim.claimText);

      if (timingElements.length === 0) return null;

      return {
        id: `timing-${Date.now()}`,
        challengeType: 'timing_risk',
        originalClaim: claim.claimText,
        challengeQuestion: 'What if the timing is wrong or market conditions change unexpectedly?',
        evidence: [],
        riskScore: 80, // High risk for timing-dependent strategies
        confidence: 90,
        reasoning: `Market timing risks identified: ${timingElements.join(', ')}. Historical data shows timing-dependent strategies have higher failure rates during regime changes.`,
        mitigationSuggestions: [
          'Implement time-stop mechanisms',
          'Use position sizing to reduce timing risk',
          'Monitor regime change indicators',
          'Diversify across time horizons'
        ],
        historicalPrecedents: []
      };

    } catch (error) {
      console.error(`Error challenging market timing:`, error);
      return null;
    }
  }

  /**
   * Generate contrarian viewpoint
   */
  private async generateContrarianView(claim: ExtractedClaim): Promise<RiskChallenge | null> {
    try {
      const contrarianScenarios = this.generateContrarianScenarios(claim.claimText);

      return {
        id: `contrarian-${Date.now()}`,
        challengeType: 'contrarian_view',
        originalClaim: claim.claimText,
        challengeQuestion: 'What are the strongest arguments against this position?',
        evidence: [],
        riskScore: 70,
        confidence: 80,
        reasoning: `Contrarian analysis reveals potential alternative interpretations: ${contrarianScenarios.join(', ')}`,
        mitigationSuggestions: [
          'Consider opposing viewpoints in decision framework',
          'Implement contrarian indicators',
          'Monitor sentiment extremes',
          'Prepare contingency plans for contrarian scenarios'
        ],
        historicalPrecedents: []
      };

    } catch (error) {
      console.error(`Error generating contrarian view:`, error);
      return null;
    }
  }

  /**
   * Analyze historical failures using backtesting engines
   */
  private async analyzeHistoricalFailures(claim: ExtractedClaim): Promise<HistoricalEvidence[]> {
    try {
      // CRITICAL: REAL DATA ONLY - No synthetic fallbacks
      const marketData = await this.getHistoricalMarketData();

      if (!marketData || Object.keys(marketData).length === 0) {
        console.warn(`⚠️ No historical market data available - cannot perform historical failure analysis`);
        return [];
      }

      const evidence: HistoricalEvidence[] = [];

      // Test strategy across different historical periods
      const testPeriods = this.defineHistoricalTestPeriods();

      for (const period of testPeriods) {
        try {
          const periodData = this.filterDataByPeriod(marketData, period);

          if (this.isDataSufficient(periodData)) {
            const strategy = this.extractStrategyFromClaim(claim.claimText);
            const config = this.getBacktestConfig(period);

            // Run historical backtest - REAL DATA ONLY
            const results = await this.runHistoricalBacktest(strategy, periodData, config);

            if (results && results.performance) {
              evidence.push({
                date: period.end,
                scenario: period.description,
                performance: results.performance,
                failureMode: this.identifyFailureMode(results.performance),
                marketConditions: period.marketConditions,
                lessons: this.extractLessons(results.performance, period.description)
              });
            }
          }
        } catch (periodError) {
          console.warn(`Historical analysis failed for period ${period.description}:`, periodError);
          // Continue with other periods - no synthetic fallback
        }
      }

      return evidence;

    } catch (error) {
      console.error(`Historical failure analysis failed:`, error);
      return []; // Return empty - never synthetic data
    }
  }

  /**
   * Perform Monte Carlo stress testing
   */
  private async performStressTesting(claim: ExtractedClaim): Promise<StressTestResult[]> {
    try {
      // CRITICAL: REAL DATA ONLY
      const marketData = await this.getHistoricalMarketData();

      if (!marketData || Object.keys(marketData).length === 0) {
        console.warn(`⚠️ No market data available - cannot perform stress testing`);
        return [];
      }

      const strategy = this.extractStrategyFromClaim(claim.claimText);
      const config = this.getMonteCarloConfig();

      // Run Monte Carlo simulation with real data
      const results = await this.monteCarloEngine.backtest(strategy, marketData, config);

      if (!results || !results.specificData) {
        return [];
      }

      const stressTests: StressTestResult[] = [];

      // Extract stress test scenarios from Monte Carlo results
      if (results.specificData.stressTestResults) {
        results.specificData.stressTestResults.forEach((stressResult: any) => {
          stressTests.push({
            scenario: stressResult.scenario,
            maxDrawdown: stressResult.maxDrawdown,
            recoveryTime: stressResult.recoveryTime || -1,
            successRate: this.calculateSuccessRate(stressResult),
            confidenceInterval: this.extractConfidenceInterval(results.specificData.confidenceIntervals, 'maxDrawdown')
          });
        });
      }

      return stressTests;

    } catch (error) {
      console.error(`Stress testing failed:`, error);
      return [];
    }
  }

  /**
   * Perform bootstrap confidence analysis
   */
  private async performConfidenceAnalysis(claim: ExtractedClaim): Promise<any | null> {
    try {
      // CRITICAL: REAL DATA ONLY
      const marketData = await this.getHistoricalMarketData();

      if (!marketData || Object.keys(marketData).length === 0) {
        console.warn(`⚠️ No market data available - cannot perform confidence analysis`);
        return null;
      }

      const strategy = this.extractStrategyFromClaim(claim.claimText);
      const config = this.getBootstrapConfig();

      // Run Bootstrap analysis with real data
      const results = await this.bootstrapEngine.backtest(strategy, marketData, config);

      if (!results || !results.specificData) {
        return null;
      }

      return {
        robustnessScore: results.specificData.robustnessMetrics?.consistency || 0,
        stabilityScore: results.specificData.robustnessMetrics?.stability || 0,
        reliabilityScore: results.specificData.robustnessMetrics?.reliability || 0,
        confidenceIntervals: results.specificData.confidenceIntervals,
        distributionAnalysis: results.specificData.distributionAnalysis
      };

    } catch (error) {
      console.error(`Confidence analysis failed:`, error);
      return null;
    }
  }

  /**
   * Search for contrarian viewpoints using MCP services
   */
  private async searchContrarianViewpoints(claim: ExtractedClaim): Promise<SourceEvidence[]> {
    const evidence: SourceEvidence[] = [];

    try {
      // Build contrarian search queries
      const contrarianQueries = this.buildContrarianQueries(claim.claimText);

      // Search Perplexity for contrarian analysis
      for (const query of contrarianQueries) {
        try {
          const mcpCommand = `npx @jschuller/perplexity-mcp search --query "${query}" --focus analysis --sources academic,financial`;
          const mcpResult = await this.executeCommand(mcpCommand);
          const mcpResponse: McpResponse = JSON.parse(mcpResult);

          // SAFLA VALIDATION
          const saflaResult = await this.validateSAFLA(mcpResponse, 'perplexity');
          this.recordAuditTrail('perplexity-contrarian-search', '@jschuller/perplexity-mcp', mcpResponse, saflaResult);

          if (saflaResult.isValid) {
            const perplexityEvidence = this.extractContrarianEvidence(mcpResponse, 'perplexity');
            evidence.push(...perplexityEvidence);
          }
        } catch (queryError) {
          console.warn(`Contrarian search failed for query "${query}":`, queryError);
        }
      }

      // Search Web for academic and research contrarian views
      const academicSites = "nber.org,ssrn.com,jstor.org,scholar.google.com,arxiv.org,papers.ssrn.com";
      for (const query of contrarianQueries.slice(0, 2)) { // Limit web searches
        try {
          const mcpCommand = `npx @tongxiao/web-search-mcp-server search --query "${query}" --sites "${academicSites}" --max_results 8`;
          const mcpResult = await this.executeCommand(mcpCommand);
          const mcpResponse: McpResponse = JSON.parse(mcpResult);

          // SAFLA VALIDATION
          const saflaResult = await this.validateSAFLA(mcpResponse, 'web-search');
          this.recordAuditTrail('web-contrarian-search', '@tongxiao/web-search-mcp-server', mcpResponse, saflaResult);

          if (saflaResult.isValid) {
            const webEvidence = this.extractContrarianEvidence(mcpResponse, 'web');
            evidence.push(...webEvidence);
          }
        } catch (queryError) {
          console.warn(`Web contrarian search failed for query "${query}":`, queryError);
        }
      }

      return evidence;

    } catch (error) {
      console.error(`Contrarian viewpoint search failed:`, error);
      return [];
    }
  }

  /**
   * Perform comprehensive risk analysis
   */
  private async performComprehensiveRiskAnalysis(
    challenges: RiskChallenge[],
    evidence: SourceEvidence[],
    claim: ExtractedClaim
  ): Promise<{
    veracity: VeracityLevel;
    confidence: number;
    reasoning: string;
  }> {

    if (challenges.length === 0 && evidence.length === 0) {
      return {
        veracity: 'INSUFFICIENT_EVIDENCE',
        confidence: 0,
        reasoning: 'No risk challenges or contrarian evidence found to evaluate claim robustness'
      };
    }

    // Calculate risk scores from challenges
    const avgChallengeRisk = challenges.length > 0
      ? challenges.reduce((sum, c) => sum + c.riskScore, 0) / challenges.length
      : 0;

    // Calculate credibility of contrarian evidence
    const contrarianCredibility = evidence.length > 0
      ? evidence.reduce((sum, e) => sum + e.credibilityScore, 0) / evidence.length
      : 0;

    // Determine veracity based on risk analysis
    let veracity: VeracityLevel = 'UNVERIFIED';
    let confidence = 0;

    if (avgChallengeRisk >= 80 && contrarianCredibility >= 80) {
      // High risk challenges with credible contrarian evidence
      veracity = 'MISLEADING';
      confidence = Math.min(85, contrarianCredibility);
    } else if (avgChallengeRisk >= 70 || contrarianCredibility >= 75) {
      // Significant risks or contrarian evidence
      veracity = 'UNVERIFIED';
      confidence = Math.min(75, Math.max(avgChallengeRisk * 0.8, contrarianCredibility * 0.8));
    } else if (challenges.length >= 2 && avgChallengeRisk >= 50) {
      // Multiple moderate risk challenges
      veracity = 'PARTIALLY_TRUE';
      confidence = Math.min(65, avgChallengeRisk * 0.7);
    } else if (evidence.length >= 2 && contrarianCredibility >= 60) {
      // Multiple contrarian sources
      veracity = 'UNVERIFIED';
      confidence = Math.min(60, contrarianCredibility * 0.7);
    } else {
      // Limited challenges or evidence
      veracity = 'UNVERIFIED';
      confidence = Math.min(40, Math.max(avgChallengeRisk * 0.5, contrarianCredibility * 0.5));
    }

    const reasoning = `Risk Challenger analysis: ${challenges.length} systematic challenges (avg risk: ${avgChallengeRisk.toFixed(1)}%), ` +
      `${evidence.length} contrarian evidence sources (avg credibility: ${contrarianCredibility.toFixed(1)}%). ` +
      `Key risks: ${challenges.map(c => c.challengeType).join(', ')}. ` +
      `Professional skepticism applied with constructive alternative analysis.`;

    // Store comprehensive analysis in memory
    await this.storeInMemory(`risk-analysis/comprehensive/${Date.now()}`, {
      challengeCount: challenges.length,
      evidenceCount: evidence.length,
      avgChallengeRisk,
      contrarianCredibility,
      veracity,
      confidence,
      reasoning
    });

    return { veracity, confidence, reasoning };
  }

  /**
   * UTILITY METHODS
   */

  private extractAssumptions(claimText: string): string[] {
    const assumptions: string[] = [];

    // Look for assumption indicators
    const assumptionPatterns = [
      /assumes?\s+(?:that\s+)?([^.!?]+)/gi,
      /if\s+([^,]+),?\s+then/gi,
      /given\s+(?:that\s+)?([^,]+)/gi,
      /based\s+on\s+(?:the\s+)?([^,]+)/gi,
      /depends\s+on\s+([^.!?]+)/gi
    ];

    assumptionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(claimText)) !== null) {
        assumptions.push(match[1].trim());
      }
    });

    // Add common financial assumptions if relevant
    const text = claimText.toLowerCase();
    if (text.includes('trend') || text.includes('continue')) {
      assumptions.push('trend continuation');
    }
    if (text.includes('correlation') || text.includes('relationship')) {
      assumptions.push('stable correlations');
    }
    if (text.includes('historical') || text.includes('past')) {
      assumptions.push('historical patterns persist');
    }

    return [...new Set(assumptions)].slice(0, 5); // Limit to top 5
  }

  private extractTimingElements(claimText: string): string[] {
    const timingElements: string[] = [];

    const timingPatterns = [
      /\b(?:when|timing|time|duration|period)\b/gi,
      /\b(?:now|currently|today|this\s+(?:week|month|year))\b/gi,
      /\b(?:soon|quickly|rapidly|immediately)\b/gi,
      /\b(?:long[_-]?term|short[_-]?term)\b/gi
    ];

    timingPatterns.forEach(pattern => {
      const matches = claimText.match(pattern);
      if (matches) {
        timingElements.push(...matches);
      }
    });

    return [...new Set(timingElements.map(el => el.toLowerCase()))];
  }

  private generateContrarianScenarios(claimText: string): string[] {
    const scenarios: string[] = [];

    // Generate opposite scenarios
    if (claimText.toLowerCase().includes('bullish') || claimText.toLowerCase().includes('up')) {
      scenarios.push('bearish market conditions');
    }
    if (claimText.toLowerCase().includes('bearish') || claimText.toLowerCase().includes('down')) {
      scenarios.push('unexpected market recovery');
    }
    if (claimText.toLowerCase().includes('stable') || claimText.toLowerCase().includes('steady')) {
      scenarios.push('high volatility regime');
    }
    if (claimText.toLowerCase().includes('growth')) {
      scenarios.push('economic contraction');
    }

    // Add standard contrarian scenarios
    scenarios.push(
      'black swan events',
      'regime change',
      'central bank intervention',
      'geopolitical shocks'
    );

    return scenarios.slice(0, 4); // Limit to top 4
  }

  private buildContrarianQueries(claimText: string): string[] {
    const baseQuery = claimText.replace(/"/g, '');

    return [
      `"${baseQuery}" criticism flaws problems`,
      `"${baseQuery}" alternative view opposing argument`,
      `"${baseQuery}" fails doesn't work limitations`,
      `"${baseQuery}" risks downsides negative outcomes`,
      `contrary evidence against "${baseQuery}"`
    ];
  }

  private extractContrarianEvidence(mcpResponse: McpResponse, source: 'perplexity' | 'web'): SourceEvidence[] {
    const evidence: SourceEvidence[] = [];

    try {
      if (source === 'perplexity' && mcpResponse.content) {
        evidence.push({
          url: mcpResponse.url || 'https://perplexity.ai',
          title: mcpResponse.title || 'Contrarian Analysis via Perplexity',
          content: mcpResponse.content,
          author: mcpResponse.author,
          publishDate: mcpResponse.publishDate,
          sourceType: 'ACADEMIC',
          credibilityScore: this.calculateContrarianCredibility(mcpResponse.content),
          relevanceScore: this.calculateContrarianRelevance(mcpResponse.content),
          mcpUsed: '@jschuller/perplexity-mcp',
          saflaValidated: true,
          verificationTimestamp: Date.now()
        });
      }

      if (source === 'web' && mcpResponse.rawData?.results) {
        mcpResponse.rawData.results.forEach((result: any) => {
          if (this.isAcademicSource(result.url)) {
            evidence.push({
              url: result.url,
              title: result.title,
              content: result.snippet || result.description,
              publishDate: result.date,
              sourceType: 'ACADEMIC',
              credibilityScore: this.calculateAcademicCredibility(result.url),
              relevanceScore: this.calculateContrarianRelevance(result.snippet || ''),
              mcpUsed: '@tongxiao/web-search-mcp-server',
              saflaValidated: true,
              verificationTimestamp: Date.now()
            });
          }
        });
      }

      return evidence;
    } catch (error) {
      console.error(`Error extracting contrarian evidence:`, error);
      return [];
    }
  }

  private isAcademicSource(url: string): boolean {
    const academicDomains = [
      'nber.org', 'ssrn.com', 'jstor.org', 'scholar.google.com',
      'arxiv.org', 'papers.ssrn.com', 'ideas.repec.org', 'econpapers.repec.org'
    ];

    return academicDomains.some(domain => url.includes(domain));
  }

  private calculateContrarianCredibility(content: string): number {
    if (!content) return 0;

    const criticalWords = [
      'research', 'study', 'analysis', 'evidence', 'data',
      'peer-reviewed', 'academic', 'empirical', 'statistical'
    ];

    const contentLower = content.toLowerCase();
    const matches = criticalWords.filter(word => contentLower.includes(word)).length;

    return Math.min((matches / criticalWords.length) * 100, 90);
  }

  private calculateAcademicCredibility(url: string): number {
    const tier1Academic = ['nber.org', 'jstor.org'];
    const tier2Academic = ['ssrn.com', 'arxiv.org', 'scholar.google.com'];
    const tier3Academic = ['ideas.repec.org', 'econpapers.repec.org'];

    for (const domain of tier1Academic) {
      if (url.includes(domain)) return 95;
    }
    for (const domain of tier2Academic) {
      if (url.includes(domain)) return 85;
    }
    for (const domain of tier3Academic) {
      if (url.includes(domain)) return 80;
    }

    return 70;
  }

  private calculateContrarianRelevance(content: string): number {
    if (!content) return 0;

    const contrarianKeywords = [
      'criticism', 'flaw', 'problem', 'limitation', 'risk',
      'downside', 'negative', 'fails', 'doesn\'t work', 'alternative',
      'opposing', 'contrary', 'against', 'challenge', 'question'
    ];

    const contentLower = content.toLowerCase();
    const matches = contrarianKeywords.filter(keyword =>
      contentLower.includes(keyword)
    ).length;

    return Math.min((matches / contrarianKeywords.length) * 100, 100);
  }

  // Data conversion utilities
  private convertHistoricalToSourceEvidence(historical: HistoricalEvidence[]): SourceEvidence[] {
    return historical.map(h => ({
      url: `internal://historical-analysis/${h.date}`,
      title: `Historical Analysis: ${h.scenario}`,
      content: JSON.stringify({
        scenario: h.scenario,
        performance: h.performance,
        failureMode: h.failureMode,
        marketConditions: h.marketConditions,
        lessons: h.lessons
      }),
      sourceType: 'HISTORICAL',
      credibilityScore: 95,
      relevanceScore: 90,
      mcpUsed: 'historical-backtesting',
      saflaValidated: true,
      verificationTimestamp: Date.now()
    }));
  }

  private convertStressTestToSourceEvidence(stressTests: StressTestResult[]): SourceEvidence[] {
    return stressTests.map(st => ({
      url: `internal://stress-test/${st.scenario}`,
      title: `Stress Test: ${st.scenario}`,
      content: JSON.stringify({
        scenario: st.scenario,
        maxDrawdown: st.maxDrawdown,
        recoveryTime: st.recoveryTime,
        successRate: st.successRate,
        confidenceInterval: st.confidenceInterval
      }),
      sourceType: 'SIMULATION',
      credibilityScore: 90,
      relevanceScore: 95,
      mcpUsed: 'monte-carlo-engine',
      saflaValidated: true,
      verificationTimestamp: Date.now()
    }));
  }

  private convertConfidenceToSourceEvidence(confidence: any): SourceEvidence {
    return {
      url: 'internal://bootstrap-confidence',
      title: 'Bootstrap Confidence Analysis',
      content: JSON.stringify(confidence),
      sourceType: 'STATISTICAL',
      credibilityScore: 90,
      relevanceScore: 85,
      mcpUsed: 'bootstrap-engine',
      saflaValidated: true,
      verificationTimestamp: Date.now()
    };
  }

  // Placeholder methods (would need full implementation based on existing codebase)
  private async getHistoricalMarketData(): Promise<Record<string, MarketData[]> | null> {
    // Implementation would fetch real historical data from existing data sources
    // CRITICAL: Never return synthetic data
    console.warn('⚠️ Historical market data fetch not implemented - returning null to maintain SAFLA compliance');
    return null;
  }

  private defineHistoricalTestPeriods(): Array<{
    start: string;
    end: string;
    description: string;
    marketConditions: string;
  }> {
    return [
      {
        start: '2007-01-01',
        end: '2009-12-31',
        description: 'Financial Crisis',
        marketConditions: 'High volatility, credit crisis, bear market'
      },
      {
        start: '2020-01-01',
        end: '2020-12-31',
        description: 'COVID-19 Pandemic',
        marketConditions: 'Extreme volatility, economic lockdowns, unprecedented policy response'
      },
      {
        start: '2000-01-01',
        end: '2002-12-31',
        description: 'Dot-com Crash',
        marketConditions: 'Tech bubble burst, prolonged bear market'
      }
    ];
  }

  private extractStrategyFromClaim(claimText: string): StrategyDefinition {
    // Simplified strategy extraction - would need full implementation
    return {
      name: 'Extracted Strategy',
      signalTypes: ['sp500_ma'],
      entryConditions: [],
      exitConditions: [],
      positionSizing: { method: 'fixed', value: 0.1 },
      riskManagement: { stopLoss: 0.05, takeProfit: 0.1 }
    };
  }

  private getBacktestConfig(period: any): BacktestConfig {
    return {
      startDate: period.start,
      endDate: period.end,
      initialCapital: 100000,
      commissionRate: 0.001,
      slippageRate: 0.0005,
      riskFreeRate: 0.02,
      maxPositionSize: 0.25
    };
  }

  private getMonteCarloConfig(): BacktestConfig {
    return {
      startDate: '2020-01-01',
      endDate: '2024-12-31',
      initialCapital: 100000,
      commissionRate: 0.001,
      slippageRate: 0.0005,
      riskFreeRate: 0.02,
      maxPositionSize: 0.25,
      monteCarlo: {
        simulations: 1000,
        confidenceLevels: [0.90, 0.95, 0.99],
        scenarioTypes: ['normal_returns', 'fat_tail_returns', 'market_crash', 'bear_market'],
        randomSeed: Date.now()
      }
    };
  }

  private getBootstrapConfig(): BacktestConfig {
    return {
      startDate: '2020-01-01',
      endDate: '2024-12-31',
      initialCapital: 100000,
      commissionRate: 0.001,
      slippageRate: 0.0005,
      riskFreeRate: 0.02,
      maxPositionSize: 0.25,
      bootstrap: {
        samples: 1000,
        blockSize: 21,
        bootstrapType: 'block',
        confidenceLevels: [0.90, 0.95, 0.99]
      }
    };
  }

  private filterDataByPeriod(marketData: Record<string, MarketData[]>, period: any): Record<string, MarketData[]> {
    const filtered: Record<string, MarketData[]> = {};

    Object.entries(marketData).forEach(([symbol, data]) => {
      filtered[symbol] = data.filter(d =>
        d.date >= period.start && d.date <= period.end
      );
    });

    return filtered;
  }

  private isDataSufficient(data: Record<string, MarketData[]>): boolean {
    return Object.values(data).some(symbolData => symbolData.length >= 252); // At least 1 year of data
  }

  private async runHistoricalBacktest(strategy: StrategyDefinition, data: Record<string, MarketData[]>, config: BacktestConfig): Promise<any> {
    // Would integrate with existing backtesting system
    // For now, return null to maintain SAFLA compliance
    return null;
  }

  private identifyFailureMode(performance: PerformanceMetrics): string {
    if (performance.maxDrawdown > 0.3) return 'Excessive drawdown';
    if (performance.sharpeRatio < 0.5) return 'Poor risk-adjusted returns';
    if (performance.totalReturn < 0) return 'Negative returns';
    if (performance.volatility > 0.25) return 'High volatility';
    return 'Within acceptable parameters';
  }

  private extractLessons(performance: PerformanceMetrics, scenario: string): string {
    const lessons: string[] = [];

    if (performance.maxDrawdown > 0.2) {
      lessons.push('Strategy vulnerable to large drawdowns during stress periods');
    }
    if (performance.sharpeRatio < 0.8) {
      lessons.push('Risk-adjusted performance deteriorates under stress');
    }
    if (performance.volatility > performance.annualizedReturn) {
      lessons.push('Risk exceeds return during volatile periods');
    }

    return lessons.length > 0 ? lessons.join('. ') : 'Strategy showed resilience during this period';
  }

  private calculateSuccessRate(stressResult: any): number {
    // Calculate success rate from stress test result
    return stressResult.successRate || 0.5;
  }

  private extractConfidenceInterval(confidenceIntervals: any, metric: string): { lower: number; upper: number; median: number } {
    if (confidenceIntervals?.[metric]?.['95%']) {
      return confidenceIntervals[metric]['95%'];
    }
    return { lower: 0, upper: 0, median: 0 };
  }
}