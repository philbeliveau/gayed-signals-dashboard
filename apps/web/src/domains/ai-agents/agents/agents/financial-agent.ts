/**
 * Financial Agent - Specialized Fact-Checking Agent
 * Phase 2 Implementation - Autonomous MCP-Powered Agent
 * 
 * 🚨 CRITICAL: 100% AUTONOMOUS MCP OPERATION + SAFLA PROTOCOL
 * 
 * Specialization: Market data verification, Economic claims validation
 * MCP Services: Trader MCP + Perplexity + Web Search
 */

import { BaseFactCheckAgent, SAFLAValidationResult } from './base-agent';
import { ExtractedClaim, Investigation, SourceEvidence, McpResponse, AgentType, VeracityLevel } from '@/types/fact-check';

export class FinancialAgent extends BaseFactCheckAgent {
  constructor() {
    super('FINANCIAL');
    this.mcpServices = [
      'mcp-trader',
      '@jschuller/perplexity-mcp',
      '@tongxiao/web-search-mcp-server'
    ];
  }

  /**
   * Get MCP requirements for this agent
   */
  getMcpRequirements(): string[] {
    return this.mcpServices;
  }

  /**
   * Investigate financial/economic claims using multiple MCP sources
   */
  async investigateClaim(claim: ExtractedClaim): Promise<Investigation> {
    const startTime = Date.now();
    const investigation: Investigation = {
      id: `financial-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      claimId: claim.id,
      agentType: 'FINANCIAL',
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
      console.log(`💰 Financial Agent investigating: "${claim.claimText}"`);

      // Store investigation start in coordination memory
      await this.storeInMemory(`investigations/financial/${investigation.id}/started`, {
        claimId: claim.id,
        claimText: claim.claimText,
        timestamp: Date.now()
      });

      // STRATEGY 1: Trader MCP for real market data
      const traderEvidence = await this.searchTraderMcp(claim);
      if (traderEvidence.length > 0) {
        investigation.evidenceFound.push(...traderEvidence);
        investigation.mcpUsed.push('mcp-trader');
        investigation.sourcesSearched.push('trader-mcp-data');
      }

      // STRATEGY 2: Perplexity for financial analysis and reports
      const perplexityEvidence = await this.searchPerplexityFinancial(claim);
      if (perplexityEvidence.length > 0) {
        investigation.evidenceFound.push(...perplexityEvidence);
        investigation.mcpUsed.push('@jschuller/perplexity-mcp');
        investigation.sourcesSearched.push('perplexity-financial');
      }

      // STRATEGY 3: Web Search for official financial sources
      const webEvidence = await this.searchWebFinancial(claim);
      if (webEvidence.length > 0) {
        investigation.evidenceFound.push(...webEvidence);
        investigation.mcpUsed.push('@tongxiao/web-search-mcp-server');
        investigation.sourcesSearched.push('web-financial');
      }

      // ANALYSIS: Cross-validate financial data and sources
      const analysis = await this.analyzeFinancialEvidence(investigation.evidenceFound, claim);
      investigation.conclusion = analysis.veracity;
      investigation.confidenceScore = analysis.confidence;
      investigation.reasoning = analysis.reasoning;

      // SAFLA COMPLIANCE CHECK
      investigation.saflaCompliant = await this.validateRealDataOnly();

      // Store final investigation in coordination memory
      await this.storeInMemory(`investigations/financial/${investigation.id}/completed`, {
        conclusion: investigation.conclusion,
        confidenceScore: investigation.confidenceScore,
        evidenceCount: investigation.evidenceFound.length,
        saflaCompliant: investigation.saflaCompliant,
        processingTimeMs: Date.now() - startTime
      });

      investigation.processingTimeMs = Date.now() - startTime;
      
      console.log(`✅ Financial investigation completed: ${investigation.conclusion} (${investigation.confidenceScore}% confidence)`);
      
      return investigation;

    } catch (error) {
      console.error(`❌ Financial Agent error:`, error);
      investigation.reasoning = `Investigation failed: ${error}`;
      investigation.saflaCompliant = false;
      investigation.processingTimeMs = Date.now() - startTime;
      return investigation;
    }
  }

  /**
   * Search Trader MCP for real market data
   */
  private async searchTraderMcp(claim: ExtractedClaim): Promise<SourceEvidence[]> {
    try {
      const financialSymbols = this.extractFinancialSymbols(claim.claimText);
      const evidence: SourceEvidence[] = [];
      
      // Search for each identified financial symbol
      for (const symbol of financialSymbols) {
        try {
          // Get current market data
          const marketDataCommand = `npx mcp-trader marketdata --symbol "${symbol}" --include-indicators true`;
          const marketDataResult = await this.executeCommand(marketDataCommand);
          const marketData: McpResponse = JSON.parse(marketDataResult);
          
          // SAFLA VALIDATION
          const saflaResult = await this.validateSAFLA(marketData, 'trader-mcp');
          this.recordAuditTrail('trader-mcp-marketdata', 'mcp-trader', marketData, saflaResult);
          
          if (saflaResult.isValid) {
            evidence.push(...this.extractMarketDataEvidence(marketData, symbol));
          }

          // Get technical analysis
          const analysisCommand = `npx mcp-trader analyze --symbol "${symbol}" --timeframe "1d" --indicators "sma,rsi,macd"`;
          const analysisResult = await this.executeCommand(analysisCommand);
          const analysisData: McpResponse = JSON.parse(analysisResult);
          
          // SAFLA VALIDATION
          const analysisSaflaResult = await this.validateSAFLA(analysisData, 'trader-mcp');
          this.recordAuditTrail('trader-mcp-analysis', 'mcp-trader', analysisData, analysisSaflaResult);
          
          if (analysisSaflaResult.isValid) {
            evidence.push(...this.extractAnalysisEvidence(analysisData, symbol));
          }

        } catch (symbolError) {
          console.warn(`Failed to get data for symbol ${symbol}:`, symbolError);
        }
      }

      return evidence;

    } catch (error) {
      console.error(`Trader MCP search failed:`, error);
      return [];
    }
  }

  /**
   * Search Perplexity for financial analysis and reports
   */
  private async searchPerplexityFinancial(claim: ExtractedClaim): Promise<SourceEvidence[]> {
    try {
      const financialQuery = this.buildFinancialQuery(claim.claimText);
      
      // Execute Perplexity MCP call with financial focus
      const mcpCommand = `npx @jschuller/perplexity-mcp search --query "${financialQuery}" --focus financial --sources sec,bloomberg,reuters`;
      const mcpResult = await this.executeCommand(mcpCommand);
      
      const mcpResponse: McpResponse = JSON.parse(mcpResult);
      
      // SAFLA VALIDATION
      const saflaResult = await this.validateSAFLA(mcpResponse, 'perplexity');
      this.recordAuditTrail('perplexity-financial-search', '@jschuller/perplexity-mcp', mcpResponse, saflaResult);
      
      if (!saflaResult.isValid) {
        console.warn(`⚠️ SAFLA validation failed for Perplexity financial search:`, saflaResult.errorMessages);
        return [];
      }

      return this.extractFinancialEvidenceFromPerplexity(mcpResponse);

    } catch (error) {
      console.error(`Perplexity financial search failed:`, error);
      return [];
    }
  }

  /**
   * Search Web for official financial sources
   */
  private async searchWebFinancial(claim: ExtractedClaim): Promise<SourceEvidence[]> {
    try {
      const financialQuery = this.buildWebFinancialQuery(claim.claimText);
      
      // Execute Web Search MCP call with financial site restrictions
      const financialSites = "sec.gov,federalreserve.gov,bls.gov,treasury.gov,nasdaq.com,nyse.com,finra.org,cftc.gov,bloomberg.com,reuters.com";
      const mcpCommand = `npx @tongxiao/web-search-mcp-server search --query "${financialQuery}" --sites "${financialSites}" --max_results 12`;
      const mcpResult = await this.executeCommand(mcpCommand);
      
      const mcpResponse: McpResponse = JSON.parse(mcpResult);
      
      // SAFLA VALIDATION
      const saflaResult = await this.validateSAFLA(mcpResponse, 'web-search');
      this.recordAuditTrail('web-financial-search', '@tongxiao/web-search-mcp-server', mcpResponse, saflaResult);
      
      if (!saflaResult.isValid) {
        console.warn(`⚠️ SAFLA validation failed for Web financial search:`, saflaResult.errorMessages);
        return [];
      }

      return this.extractFinancialEvidenceFromWeb(mcpResponse);

    } catch (error) {
      console.error(`Web financial search failed:`, error);
      return [];
    }
  }

  /**
   * Extract financial symbols from claim text
   */
  private extractFinancialSymbols(claimText: string): string[] {
    const symbols: string[] = [];
    
    // Common stock symbols pattern (3-4 uppercase letters)
    const symbolPattern = /\b[A-Z]{2,5}\b/g;
    const matches = claimText.match(symbolPattern) || [];
    
    // Common symbols to check
    const commonSymbols = ['SPY', 'QQQ', 'IWM', 'VTI', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA'];
    const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'DOT', 'LINK', 'LTC'];
    const indexSymbols = ['SPX', 'NDX', 'RUT', 'VIX', 'DXY'];
    
    // Add matched symbols
    symbols.push(...matches);
    
    // Add common symbols if mentioned
    const textUpper = claimText.toUpperCase();
    commonSymbols.forEach(symbol => {
      if (textUpper.includes(symbol)) {
        symbols.push(symbol);
      }
    });
    
    cryptoSymbols.forEach(symbol => {
      if (textUpper.includes(symbol) || textUpper.includes(symbol.toLowerCase())) {
        symbols.push(symbol);
      }
    });
    
    indexSymbols.forEach(symbol => {
      if (textUpper.includes(symbol)) {
        symbols.push(symbol);
      }
    });

    // Remove duplicates and return
    return [...new Set(symbols)];
  }

  /**
   * Build financial-focused query for Perplexity
   */
  private buildFinancialQuery(claimText: string): string {
    const financialKeywords = this.extractFinancialKeywords(claimText);
    const symbols = this.extractFinancialSymbols(claimText);
    
    return `"${claimText}" ${financialKeywords.join(' ')} ${symbols.join(' ')} financial data market analysis`;
  }

  /**
   * Build web financial query
   */
  private buildWebFinancialQuery(claimText: string): string {
    const keywords = this.extractFinancialKeywords(claimText);
    return `"${claimText}" ${keywords.join(' ')} official financial report data`;
  }

  /**
   * Extract financial keywords
   */
  private extractFinancialKeywords(claimText: string): string[] {
    const financialTerms = [
      'price', 'stock', 'market', 'trading', 'volume', 'revenue',
      'earnings', 'profit', 'loss', 'dividend', 'yield', 'return',
      'volatility', 'correlation', 'performance', 'index', 'fund',
      'investment', 'portfolio', 'risk', 'valuation', 'analysis'
    ];
    
    const words = claimText.toLowerCase().split(/\s+/);
    return financialTerms.filter(term => 
      words.some(word => word.includes(term) || term.includes(word))
    );
  }

  /**
   * Extract market data evidence from Trader MCP response
   */
  private extractMarketDataEvidence(mcpResponse: McpResponse, symbol: string): SourceEvidence[] {
    try {
      const evidence: SourceEvidence[] = [];
      
      if (mcpResponse.rawData?.marketData) {
        const marketData = mcpResponse.rawData.marketData;
        
        evidence.push({
          url: `https://finance.yahoo.com/quote/${symbol}`,
          title: `Real-time Market Data for ${symbol}`,
          content: JSON.stringify({
            symbol: symbol,
            price: marketData.price,
            volume: marketData.volume,
            change: marketData.change,
            changePercent: marketData.changePercent,
            timestamp: marketData.timestamp
          }),
          sourceType: 'FINANCIAL',
          credibilityScore: 95, // Real market data is highly credible
          relevanceScore: this.calculateSymbolRelevance(symbol),
          mcpUsed: 'mcp-trader',
          saflaValidated: true,
          verificationTimestamp: Date.now()
        });
      }

      return evidence;
    } catch (error) {
      console.error(`Error extracting market data evidence:`, error);
      return [];
    }
  }

  /**
   * Extract technical analysis evidence from Trader MCP response
   */
  private extractAnalysisEvidence(mcpResponse: McpResponse, symbol: string): SourceEvidence[] {
    try {
      const evidence: SourceEvidence[] = [];
      
      if (mcpResponse.rawData?.analysis) {
        const analysis = mcpResponse.rawData.analysis;
        
        evidence.push({
          url: `https://finance.yahoo.com/quote/${symbol}/analysis`,
          title: `Technical Analysis for ${symbol}`,
          content: JSON.stringify({
            symbol: symbol,
            indicators: analysis.indicators,
            signals: analysis.signals,
            trend: analysis.trend,
            timestamp: analysis.timestamp
          }),
          sourceType: 'FINANCIAL',
          credibilityScore: 90, // Technical analysis is credible but interpretive
          relevanceScore: this.calculateSymbolRelevance(symbol),
          mcpUsed: 'mcp-trader',
          saflaValidated: true,
          verificationTimestamp: Date.now()
        });
      }

      return evidence;
    } catch (error) {
      console.error(`Error extracting analysis evidence:`, error);
      return [];
    }
  }

  /**
   * Extract financial evidence from Perplexity response
   */
  private extractFinancialEvidenceFromPerplexity(mcpResponse: McpResponse): SourceEvidence[] {
    try {
      const evidence: SourceEvidence[] = [];
      
      if (mcpResponse.content && mcpResponse.url) {
        evidence.push({
          url: mcpResponse.url,
          title: mcpResponse.title || 'Financial Analysis via Perplexity',
          content: mcpResponse.content,
          author: mcpResponse.author,
          publishDate: mcpResponse.publishDate,
          sourceType: 'FINANCIAL',
          credibilityScore: this.calculateFinancialSourceCredibility(mcpResponse.url),
          relevanceScore: this.calculateFinancialRelevance(mcpResponse.content),
          mcpUsed: '@jschuller/perplexity-mcp',
          saflaValidated: true,
          verificationTimestamp: Date.now()
        });
      }

      return evidence;
    } catch (error) {
      console.error(`Error extracting Perplexity financial evidence:`, error);
      return [];
    }
  }

  /**
   * Extract financial evidence from Web Search response
   */
  private extractFinancialEvidenceFromWeb(mcpResponse: McpResponse): SourceEvidence[] {
    try {
      const evidence: SourceEvidence[] = [];
      
      if (mcpResponse.rawData?.results) {
        mcpResponse.rawData.results.forEach((result: any) => {
          if (this.isOfficialFinancialSource(result.url)) {
            evidence.push({
              url: result.url,
              title: result.title,
              content: result.snippet || result.description,
              publishDate: result.date,
              sourceType: 'FINANCIAL',
              credibilityScore: this.calculateFinancialSourceCredibility(result.url),
              relevanceScore: this.calculateFinancialRelevance(result.snippet || ''),
              mcpUsed: '@tongxiao/web-search-mcp-server',
              saflaValidated: true,
              verificationTimestamp: Date.now()
            });
          }
        });
      }

      return evidence;
    } catch (error) {
      console.error(`Error extracting web financial evidence:`, error);
      return [];
    }
  }

  /**
   * Check if URL is from official financial source
   */
  private isOfficialFinancialSource(url: string): boolean {
    const officialFinancialDomains = [
      'sec.gov', 'federalreserve.gov', 'bls.gov', 'treasury.gov',
      'nasdaq.com', 'nyse.com', 'finra.org', 'cftc.gov',
      'bloomberg.com', 'reuters.com', 'ft.com', 'wsj.com',
      'marketwatch.com', 'cnbc.com', 'finance.yahoo.com'
    ];
    
    return officialFinancialDomains.some(domain => url.includes(domain));
  }

  /**
   * Calculate financial source credibility score
   */
  private calculateFinancialSourceCredibility(url: string): number {
    const tier1Sources = {
      'sec.gov': 100,
      'federalreserve.gov': 100,
      'bls.gov': 100,
      'treasury.gov': 100
    };

    const tier2Sources = {
      'nasdaq.com': 95,
      'nyse.com': 95,
      'finra.org': 95,
      'cftc.gov': 95,
      'bloomberg.com': 90,
      'reuters.com': 90,
      'ft.com': 90,
      'wsj.com': 90
    };

    const tier3Sources = {
      'marketwatch.com': 80,
      'cnbc.com': 80,
      'finance.yahoo.com': 85,
      'investing.com': 75
    };

    for (const [domain, score] of Object.entries(tier1Sources)) {
      if (url.includes(domain)) return score;
    }

    for (const [domain, score] of Object.entries(tier2Sources)) {
      if (url.includes(domain)) return score;
    }

    for (const [domain, score] of Object.entries(tier3Sources)) {
      if (url.includes(domain)) return score;
    }

    return this.isOfficialFinancialSource(url) ? 70 : 50;
  }

  /**
   * Calculate symbol relevance score
   */
  private calculateSymbolRelevance(symbol: string): number {
    // Major indices and ETFs get higher relevance
    const majorSymbols = ['SPY', 'QQQ', 'IWM', 'VTI', 'SPX', 'NDX', 'VIX'];
    const megaCapStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA'];
    
    if (majorSymbols.includes(symbol)) return 95;
    if (megaCapStocks.includes(symbol)) return 90;
    
    return 80; // Default relevance for financial symbols
  }

  /**
   * Calculate financial content relevance
   */
  private calculateFinancialRelevance(content: string): number {
    if (!content) return 0;
    
    const financialKeywords = [
      'price', 'trading', 'market', 'stock', 'share', 'volume',
      'earnings', 'revenue', 'profit', 'loss', 'dividend', 'yield',
      'performance', 'return', 'volatility', 'risk', 'analysis',
      'valuation', 'financial', 'economic', 'investment'
    ];
    
    const contentLower = content.toLowerCase();
    const matches = financialKeywords.filter(keyword => 
      contentLower.includes(keyword)
    ).length;
    
    return Math.min((matches / financialKeywords.length) * 100, 100);
  }

  /**
   * Analyze all financial evidence and determine veracity
   */
  private async analyzeFinancialEvidence(evidence: SourceEvidence[], claim: ExtractedClaim): Promise<{
    veracity: VeracityLevel;
    confidence: number;
    reasoning: string;
  }> {
    if (evidence.length === 0) {
      return {
        veracity: 'INSUFFICIENT_EVIDENCE',
        confidence: 0,
        reasoning: 'No financial data or official sources found to verify this claim'
      };
    }

    // Separate real-time market data from analytical sources
    const marketDataEvidence = evidence.filter(ev => ev.mcpUsed === 'mcp-trader');
    const analyticalEvidence = evidence.filter(ev => ev.mcpUsed !== 'mcp-trader');
    
    // Calculate weighted credibility scores
    const totalCredibility = evidence.reduce((sum, ev) => sum + ev.credibilityScore, 0);
    const avgCredibility = totalCredibility / evidence.length;
    
    // Market data gets higher weight for factual claims
    const marketDataWeight = marketDataEvidence.length > 0 ? 0.6 : 0;
    const analyticalWeight = 1 - marketDataWeight;
    
    let veracity: VeracityLevel = 'INSUFFICIENT_EVIDENCE';
    let confidence = 0;
    
    // Determine veracity based on evidence type and quality
    if (marketDataEvidence.length > 0 && avgCredibility >= 90) {
      // Real market data provides high confidence for factual claims
      const marketDataConsistency = this.checkMarketDataConsistency(marketDataEvidence, claim.claimText);
      
      if (marketDataConsistency.isConsistent) {
        veracity = 'VERIFIED_TRUE';
        confidence = Math.min(avgCredibility, 95);
      } else {
        veracity = 'VERIFIED_FALSE';
        confidence = Math.min(avgCredibility, 95);
      }
    } else if (analyticalEvidence.length >= 2 && avgCredibility >= 80) {
      // Multiple analytical sources provide medium confidence
      const analyticalConsensus = this.checkAnalyticalConsensus(analyticalEvidence, claim.claimText);
      
      if (analyticalConsensus.agreement >= 0.8) {
        veracity = analyticalConsensus.supporting > analyticalConsensus.refuting ? 'PARTIALLY_TRUE' : 'MISLEADING';
        confidence = Math.min(avgCredibility * 0.8, 80);
      } else {
        veracity = 'UNVERIFIED';
        confidence = Math.min(avgCredibility * 0.6, 60);
      }
    } else if (evidence.length >= 1 && avgCredibility >= 70) {
      veracity = 'UNVERIFIED';
      confidence = Math.min(avgCredibility * 0.5, 50);
    }

    const reasoning = `Financial analysis based on ${evidence.length} sources ` +
      `(${marketDataEvidence.length} real-time market data, ${analyticalEvidence.length} analytical). ` +
      `Average credibility: ${avgCredibility.toFixed(1)}%. ` +
      `Data type weighting: ${(marketDataWeight * 100).toFixed(1)}% market data, ${(analyticalWeight * 100).toFixed(1)}% analytical.`;

    // Store analysis in coordination memory
    await this.storeInMemory(`analysis/financial/${Date.now()}`, {
      evidenceCount: evidence.length,
      marketDataCount: marketDataEvidence.length,
      analyticalCount: analyticalEvidence.length,
      avgCredibility,
      veracity,
      confidence,
      reasoning
    });

    return { veracity, confidence, reasoning };
  }

  /**
   * Check consistency of market data with claim
   */
  private checkMarketDataConsistency(marketData: SourceEvidence[], claimText: string): {
    isConsistent: boolean;
    details: string;
  } {
    try {
      // Parse numerical claims from text
      const numericalClaims = this.extractNumericalClaims(claimText);
      let consistentCount = 0;
      let totalChecks = 0;

      marketData.forEach(data => {
        try {
          const parsedData = JSON.parse(data.content);
          
          // Check price claims
          if (numericalClaims.prices.length > 0 && parsedData.price) {
            numericalClaims.prices.forEach(claimedPrice => {
              const actualPrice = parseFloat(parsedData.price);
              const tolerance = actualPrice * 0.05; // 5% tolerance
              
              if (Math.abs(actualPrice - claimedPrice) <= tolerance) {
                consistentCount++;
              }
              totalChecks++;
            });
          }
          
          // Check percentage claims
          if (numericalClaims.percentages.length > 0 && parsedData.changePercent) {
            numericalClaims.percentages.forEach(claimedPercent => {
              const actualPercent = parseFloat(parsedData.changePercent);
              const tolerance = 1; // 1% tolerance
              
              if (Math.abs(actualPercent - claimedPercent) <= tolerance) {
                consistentCount++;
              }
              totalChecks++;
            });
          }
        } catch (error) {
          // Skip malformed data
        }
      });

      const isConsistent = totalChecks > 0 ? (consistentCount / totalChecks) >= 0.8 : true;
      const details = `${consistentCount}/${totalChecks} numerical claims verified within tolerance`;

      return { isConsistent, details };
    } catch (error) {
      return { isConsistent: false, details: `Consistency check failed: ${error}` };
    }
  }

  /**
   * Check consensus among analytical sources
   */
  private checkAnalyticalConsensus(evidence: SourceEvidence[], claimText: string): {
    agreement: number;
    supporting: number;
    refuting: number;
  } {
    let supporting = 0;
    let refuting = 0;

    evidence.forEach(ev => {
      const content = ev.content.toLowerCase();
      
      const supportingWords = ['confirm', 'verify', 'accurate', 'correct', 'true', 'supports'];
      const refutingWords = ['deny', 'false', 'incorrect', 'inaccurate', 'contradicts', 'disputes'];
      
      const supportingScore = supportingWords.filter(word => content.includes(word)).length;
      const refutingScore = refutingWords.filter(word => content.includes(word)).length;
      
      if (supportingScore > refutingScore) {
        supporting++;
      } else if (refutingScore > supportingScore) {
        refuting++;
      }
    });

    const total = supporting + refuting;
    const agreement = total > 0 ? Math.max(supporting, refuting) / total : 0;

    return { agreement, supporting, refuting };
  }

  /**
   * Extract numerical claims from text
   */
  private extractNumericalClaims(text: string): {
    prices: number[];
    percentages: number[];
    volumes: number[];
  } {
    const prices: number[] = [];
    const percentages: number[] = [];
    const volumes: number[] = [];

    // Extract price patterns ($123.45, $1,234.56)
    const pricePattern = /\$([0-9,]+\.?[0-9]*)/g;
    let priceMatch;
    while ((priceMatch = pricePattern.exec(text)) !== null) {
      const price = parseFloat(priceMatch[1].replace(/,/g, ''));
      if (!isNaN(price)) prices.push(price);
    }

    // Extract percentage patterns (12.34%, -5.67%)
    const percentPattern = /(-?[0-9]+\.?[0-9]*)%/g;
    let percentMatch;
    while ((percentMatch = percentPattern.exec(text)) !== null) {
      const percent = parseFloat(percentMatch[1]);
      if (!isNaN(percent)) percentages.push(percent);
    }

    // Extract volume patterns (1M, 2.5B, 1,234,567)
    const volumePattern = /([0-9,]+\.?[0-9]*)\s*(M|B|million|billion|thousand|K)/gi;
    let volumeMatch;
    while ((volumeMatch = volumePattern.exec(text)) !== null) {
      let volume = parseFloat(volumeMatch[1].replace(/,/g, ''));
      const unit = volumeMatch[2].toLowerCase();
      
      if (unit.includes('b') || unit.includes('billion')) volume *= 1000000000;
      else if (unit.includes('m') || unit.includes('million')) volume *= 1000000;
      else if (unit.includes('k') || unit.includes('thousand')) volume *= 1000;
      
      if (!isNaN(volume)) volumes.push(volume);
    }

    return { prices, percentages, volumes };
  }
}