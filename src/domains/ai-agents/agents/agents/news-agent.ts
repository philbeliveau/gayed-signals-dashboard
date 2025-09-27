/**
 * News Agent - Specialized Fact-Checking Agent
 * Phase 2 Implementation - Autonomous MCP-Powered Agent
 * 
 * 🚨 CRITICAL: 100% AUTONOMOUS MCP OPERATION + SAFLA PROTOCOL
 * 
 * Specialization: Current events validation, News source credibility
 * MCP Services: Brave Search + Web Search + Perplexity
 */

import { BaseFactCheckAgent, SAFLAValidationResult } from './base-agent';
import { ExtractedClaim, Investigation, SourceEvidence, McpResponse, AgentType, VeracityLevel } from '../../../src/types/fact-check';

export class NewsAgent extends BaseFactCheckAgent {
  constructor() {
    super('NEWS');
    this.mcpServices = [
      'brave-search-mcp',
      '@tongxiao/web-search-mcp-server',
      '@jschuller/perplexity-mcp'
    ];
  }

  /**
   * Get MCP requirements for this agent
   */
  getMcpRequirements(): string[] {
    return this.mcpServices;
  }

  /**
   * Investigate news/current events claims using multiple MCP sources
   */
  async investigateClaim(claim: ExtractedClaim): Promise<Investigation> {
    const startTime = Date.now();
    const investigation: Investigation = {
      id: `news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      claimId: claim.id,
      agentType: 'NEWS',
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
      console.log(`📰 News Agent investigating: "${claim.claimText}"`);

      // Store investigation start in coordination memory
      await this.storeInMemory(`investigations/news/${investigation.id}/started`, {
        claimId: claim.id,
        claimText: claim.claimText,
        timestamp: Date.now()
      });

      // STRATEGY 1: Brave Search for current news coverage
      const braveEvidence = await this.searchBraveNews(claim);
      if (braveEvidence.length > 0) {
        investigation.evidenceFound.push(...braveEvidence);
        investigation.mcpUsed.push('brave-search-mcp');
        investigation.sourcesSearched.push('brave-news');
      }

      // STRATEGY 2: Web Search for comprehensive news coverage
      const webEvidence = await this.searchWebNews(claim);
      if (webEvidence.length > 0) {
        investigation.evidenceFound.push(...webEvidence);
        investigation.mcpUsed.push('@tongxiao/web-search-mcp-server');
        investigation.sourcesSearched.push('web-news');
      }

      // STRATEGY 3: Perplexity for news analysis and fact-checking
      const perplexityEvidence = await this.searchPerplexityNews(claim);
      if (perplexityEvidence.length > 0) {
        investigation.evidenceFound.push(...perplexityEvidence);
        investigation.mcpUsed.push('@jschuller/perplexity-mcp');
        investigation.sourcesSearched.push('perplexity-news');
      }

      // ANALYSIS: Cross-reference news sources and check credibility
      const analysis = await this.analyzeNewsEvidence(investigation.evidenceFound, claim);
      investigation.conclusion = analysis.veracity;
      investigation.confidenceScore = analysis.confidence;
      investigation.reasoning = analysis.reasoning;

      // SAFLA COMPLIANCE CHECK
      investigation.saflaCompliant = await this.validateRealDataOnly();

      // Store final investigation in coordination memory
      await this.storeInMemory(`investigations/news/${investigation.id}/completed`, {
        conclusion: investigation.conclusion,
        confidenceScore: investigation.confidenceScore,
        evidenceCount: investigation.evidenceFound.length,
        saflaCompliant: investigation.saflaCompliant,
        processingTimeMs: Date.now() - startTime
      });

      investigation.processingTimeMs = Date.now() - startTime;
      
      console.log(`✅ News investigation completed: ${investigation.conclusion} (${investigation.confidenceScore}% confidence)`);
      
      return investigation;

    } catch (error) {
      console.error(`❌ News Agent error:`, error);
      investigation.reasoning = `Investigation failed: ${error}`;
      investigation.saflaCompliant = false;
      investigation.processingTimeMs = Date.now() - startTime;
      return investigation;
    }
  }

  /**
   * Search Brave for current news coverage
   */
  private async searchBraveNews(claim: ExtractedClaim): Promise<SourceEvidence[]> {
    try {
      const newsQuery = this.buildNewsQuery(claim.claimText);
      
      // Execute Brave Search MCP call with news focus
      const mcpCommand = `claude mcp call brave-search search --query "${newsQuery}" --search_type news --count 10 --freshness day`;
      const mcpResult = await this.executeCommand(mcpCommand);
      
      const mcpResponse: McpResponse = JSON.parse(mcpResult);
      
      // SAFLA VALIDATION
      const saflaResult = await this.validateSAFLA(mcpResponse, 'brave');
      this.recordAuditTrail('brave-news-search', 'brave-search-mcp', mcpResponse, saflaResult);
      
      if (!saflaResult.isValid) {
        console.warn(`⚠️ SAFLA validation failed for Brave news search:`, saflaResult.errorMessages);
        return [];
      }

      return this.extractNewsEvidenceFromBrave(mcpResponse);

    } catch (error) {
      console.error(`Brave news search failed:`, error);
      return [];
    }
  }

  /**
   * Search Web for comprehensive news coverage
   */
  private async searchWebNews(claim: ExtractedClaim): Promise<SourceEvidence[]> {
    try {
      const newsQuery = this.buildWebNewsQuery(claim.claimText);
      
      // Execute Web Search MCP call with news site restrictions
      const newsSites = "reuters.com,ap.org,bbc.com,cnn.com,nytimes.com,wsj.com,bloomberg.com,npr.org,cbsnews.com,abcnews.go.com";
      const mcpCommand = `npx @tongxiao/web-search-mcp-server search --query "${newsQuery}" --sites "${newsSites}" --max_results 15`;
      const mcpResult = await this.executeCommand(mcpCommand);
      
      const mcpResponse: McpResponse = JSON.parse(mcpResult);
      
      // SAFLA VALIDATION
      const saflaResult = await this.validateSAFLA(mcpResponse, 'web-search');
      this.recordAuditTrail('web-news-search', '@tongxiao/web-search-mcp-server', mcpResponse, saflaResult);
      
      if (!saflaResult.isValid) {
        console.warn(`⚠️ SAFLA validation failed for Web news search:`, saflaResult.errorMessages);
        return [];
      }

      return this.extractNewsEvidenceFromWeb(mcpResponse);

    } catch (error) {
      console.error(`Web news search failed:`, error);
      return [];
    }
  }

  /**
   * Search Perplexity for news analysis and fact-checking
   */
  private async searchPerplexityNews(claim: ExtractedClaim): Promise<SourceEvidence[]> {
    try {
      const factCheckQuery = this.buildFactCheckQuery(claim.claimText);
      
      // Execute Perplexity MCP call focused on fact-checking
      const mcpCommand = `npx @jschuller/perplexity-mcp search --query "${factCheckQuery}" --focus news --recent true`;
      const mcpResult = await this.executeCommand(mcpCommand);
      
      const mcpResponse: McpResponse = JSON.parse(mcpResult);
      
      // SAFLA VALIDATION
      const saflaResult = await this.validateSAFLA(mcpResponse, 'perplexity');
      this.recordAuditTrail('perplexity-news-search', '@jschuller/perplexity-mcp', mcpResponse, saflaResult);
      
      if (!saflaResult.isValid) {
        console.warn(`⚠️ SAFLA validation failed for Perplexity news search:`, saflaResult.errorMessages);
        return [];
      }

      return this.extractNewsEvidenceFromPerplexity(mcpResponse);

    } catch (error) {
      console.error(`Perplexity news search failed:`, error);
      return [];
    }
  }

  /**
   * Build news-focused query
   */
  private buildNewsQuery(claimText: string): string {
    const newsKeywords = this.extractNewsKeywords(claimText);
    return `"${claimText}" ${newsKeywords.join(' ')} news breaking report`;
  }

  /**
   * Build web news query with temporal focus
   */
  private buildWebNewsQuery(claimText: string): string {
    const keywords = this.extractNewsKeywords(claimText);
    const timeframe = this.determineTimeframe(claimText);
    return `"${claimText}" ${keywords.join(' ')} news ${timeframe}`;
  }

  /**
   * Build fact-checking focused query
   */
  private buildFactCheckQuery(claimText: string): string {
    return `fact check "${claimText}" verification true false accurate misinformation`;
  }

  /**
   * Extract news-relevant keywords
   */
  private extractNewsKeywords(claimText: string): string[] {
    const newsTerms = [
      'reported', 'announced', 'confirmed', 'denied', 'statement',
      'official', 'spokesperson', 'breaking', 'update', 'latest'
    ];
    
    const words = claimText.toLowerCase().split(/\s+/);
    const foundTerms = newsTerms.filter(term => 
      words.some(word => word.includes(term) || term.includes(word))
    );
    
    // Add temporal indicators if found
    const temporalIndicators = ['today', 'yesterday', 'this week', 'recently', 'now'];
    const temporalFound = temporalIndicators.filter(temporal =>
      claimText.toLowerCase().includes(temporal)
    );
    
    return [...foundTerms, ...temporalFound];
  }

  /**
   * Determine timeframe for search
   */
  private determineTimeframe(claimText: string): string {
    const text = claimText.toLowerCase();
    if (text.includes('today') || text.includes('now')) return 'today';
    if (text.includes('yesterday')) return 'yesterday';
    if (text.includes('this week') || text.includes('recently')) return 'week';
    if (text.includes('this month')) return 'month';
    return 'recent';
  }

  /**
   * Extract news evidence from Brave Search response
   */
  private extractNewsEvidenceFromBrave(mcpResponse: McpResponse): SourceEvidence[] {
    try {
      const evidence: SourceEvidence[] = [];
      
      if (mcpResponse.rawData?.news?.results) {
        mcpResponse.rawData.news.results.forEach((result: any) => {
          if (this.isCredibleNewsSource(result.url)) {
            evidence.push({
              url: result.url,
              title: result.title,
              content: result.description || result.snippet,
              author: result.author,
              publishDate: result.age || result.published_date,
              sourceType: 'NEWS',
              credibilityScore: this.calculateNewsCredibility(result.url),
              relevanceScore: this.calculateRelevanceScore(result.description || ''),
              mcpUsed: 'brave-search-mcp',
              saflaValidated: true,
              verificationTimestamp: Date.now()
            });
          }
        });
      }

      return evidence;
    } catch (error) {
      console.error(`Error extracting Brave news evidence:`, error);
      return [];
    }
  }

  /**
   * Extract news evidence from Web Search response
   */
  private extractNewsEvidenceFromWeb(mcpResponse: McpResponse): SourceEvidence[] {
    try {
      const evidence: SourceEvidence[] = [];
      
      if (mcpResponse.rawData?.results) {
        mcpResponse.rawData.results.forEach((result: any) => {
          if (this.isCredibleNewsSource(result.url)) {
            evidence.push({
              url: result.url,
              title: result.title,
              content: result.snippet || result.description,
              publishDate: result.date,
              sourceType: 'NEWS',
              credibilityScore: this.calculateNewsCredibility(result.url),
              relevanceScore: this.calculateRelevanceScore(result.snippet || ''),
              mcpUsed: '@tongxiao/web-search-mcp-server',
              saflaValidated: true,
              verificationTimestamp: Date.now()
            });
          }
        });
      }

      return evidence;
    } catch (error) {
      console.error(`Error extracting web news evidence:`, error);
      return [];
    }
  }

  /**
   * Extract news evidence from Perplexity response
   */
  private extractNewsEvidenceFromPerplexity(mcpResponse: McpResponse): SourceEvidence[] {
    try {
      const evidence: SourceEvidence[] = [];
      
      if (mcpResponse.content && mcpResponse.url) {
        evidence.push({
          url: mcpResponse.url,
          title: mcpResponse.title || 'Fact-Check Analysis via Perplexity',
          content: mcpResponse.content,
          author: mcpResponse.author,
          publishDate: mcpResponse.publishDate,
          sourceType: 'NEWS',
          credibilityScore: this.calculateFactCheckCredibility(mcpResponse.content),
          relevanceScore: this.calculateRelevanceScore(mcpResponse.content),
          mcpUsed: '@jschuller/perplexity-mcp',
          saflaValidated: true,
          verificationTimestamp: Date.now()
        });
      }

      return evidence;
    } catch (error) {
      console.error(`Error extracting Perplexity news evidence:`, error);
      return [];
    }
  }

  /**
   * Check if URL is from credible news source
   */
  private isCredibleNewsSource(url: string): boolean {
    const credibleDomains = [
      'reuters.com', 'ap.org', 'bbc.com', 'cnn.com', 'nytimes.com',
      'wsj.com', 'ft.com', 'bloomberg.com', 'npr.org', 'cbsnews.com',
      'abcnews.go.com', 'nbcnews.com', 'washingtonpost.com', 'usatoday.com',
      'pbs.org', 'theguardian.com', 'economist.com', 'time.com'
    ];
    
    return credibleDomains.some(domain => url.includes(domain));
  }

  /**
   * Calculate news source credibility score
   */
  private calculateNewsCredibility(url: string): number {
    const tierOneNews = {
      'reuters.com': 95,
      'ap.org': 95,
      'bbc.com': 90,
      'npr.org': 90,
      'pbs.org': 90
    };

    const tierTwoNews = {
      'nytimes.com': 85,
      'wsj.com': 85,
      'washingtonpost.com': 85,
      'ft.com': 85,
      'bloomberg.com': 85,
      'theguardian.com': 80,
      'economist.com': 85
    };

    const tierThreeNews = {
      'cnn.com': 75,
      'cbsnews.com': 75,
      'abcnews.go.com': 75,
      'nbcnews.com': 75,
      'usatoday.com': 70,
      'time.com': 70
    };

    for (const [domain, score] of Object.entries(tierOneNews)) {
      if (url.includes(domain)) return score;
    }

    for (const [domain, score] of Object.entries(tierTwoNews)) {
      if (url.includes(domain)) return score;
    }

    for (const [domain, score] of Object.entries(tierThreeNews)) {
      if (url.includes(domain)) return score;
    }

    return this.isCredibleNewsSource(url) ? 60 : 40;
  }

  /**
   * Calculate fact-check specific credibility
   */
  private calculateFactCheckCredibility(content: string): number {
    let score = 70; // Base score for fact-checking content
    
    const factCheckIndicators = [
      'verified', 'confirmed', 'fact-check', 'investigation',
      'evidence', 'source', 'official', 'documented'
    ];
    
    const contentLower = content.toLowerCase();
    const indicatorMatches = factCheckIndicators.filter(indicator =>
      contentLower.includes(indicator)
    ).length;
    
    score += indicatorMatches * 3;
    
    // Boost for authoritative language
    if (contentLower.includes('according to') || contentLower.includes('officials confirm')) {
      score += 10;
    }
    
    // Penalty for uncertain language
    if (contentLower.includes('allegedly') || contentLower.includes('reportedly')) {
      score -= 5;
    }
    
    return Math.min(score, 100);
  }

  /**
   * Calculate relevance score based on content
   */
  private calculateRelevanceScore(content: string): number {
    if (!content) return 0;
    
    const relevanceKeywords = [
      'confirm', 'verify', 'evidence', 'official', 'statement',
      'report', 'announce', 'investigation', 'fact', 'true',
      'false', 'accurate', 'incorrect', 'misleading'
    ];
    
    const contentLower = content.toLowerCase();
    const matches = relevanceKeywords.filter(keyword => 
      contentLower.includes(keyword)
    ).length;
    
    return Math.min((matches / relevanceKeywords.length) * 100, 100);
  }

  /**
   * Analyze all news evidence and determine veracity
   */
  private async analyzeNewsEvidence(evidence: SourceEvidence[], claim: ExtractedClaim): Promise<{
    veracity: VeracityLevel;
    confidence: number;
    reasoning: string;
  }> {
    if (evidence.length === 0) {
      return {
        veracity: 'INSUFFICIENT_EVIDENCE',
        confidence: 0,
        reasoning: 'No credible news sources found reporting on this claim'
      };
    }

    // Calculate source consensus
    const sourceConsensus = this.calculateSourceConsensus(evidence, claim.claimText);
    
    // Calculate weighted credibility
    const totalCredibility = evidence.reduce((sum, ev) => sum + ev.credibilityScore, 0);
    const avgCredibility = totalCredibility / evidence.length;
    
    // Calculate recency factor
    const recencyFactor = this.calculateRecencyFactor(evidence);
    
    let veracity: VeracityLevel = 'INSUFFICIENT_EVIDENCE';
    let confidence = 0;
    
    // Determine veracity based on consensus and credibility
    if (sourceConsensus.agreement >= 0.8 && avgCredibility >= 80) {
      if (sourceConsensus.supporting > sourceConsensus.refuting) {
        veracity = 'VERIFIED_TRUE';
        confidence = Math.min(avgCredibility * recencyFactor, 95);
      } else {
        veracity = 'VERIFIED_FALSE';
        confidence = Math.min(avgCredibility * recencyFactor, 95);
      }
    } else if (sourceConsensus.agreement >= 0.6 && avgCredibility >= 70) {
      if (sourceConsensus.supporting > sourceConsensus.refuting) {
        veracity = 'PARTIALLY_TRUE';
        confidence = Math.min(avgCredibility * recencyFactor * 0.8, 80);
      } else {
        veracity = 'MISLEADING';
        confidence = Math.min(avgCredibility * recencyFactor * 0.8, 80);
      }
    } else if (evidence.length >= 2 && avgCredibility >= 60) {
      veracity = 'UNVERIFIED';
      confidence = Math.min(avgCredibility * 0.6, 60);
    }

    const reasoning = `News analysis based on ${evidence.length} sources from credible news outlets. ` +
      `Source consensus: ${(sourceConsensus.agreement * 100).toFixed(1)}% agreement, ` +
      `${sourceConsensus.supporting} supporting vs ${sourceConsensus.refuting} refuting. ` +
      `Average credibility: ${avgCredibility.toFixed(1)}%, recency factor: ${(recencyFactor * 100).toFixed(1)}%.`;

    // Store analysis in coordination memory
    await this.storeInMemory(`analysis/news/${Date.now()}`, {
      evidenceCount: evidence.length,
      avgCredibility,
      sourceConsensus,
      recencyFactor,
      veracity,
      confidence,
      reasoning
    });

    return { veracity, confidence, reasoning };
  }

  /**
   * Calculate consensus among news sources
   */
  private calculateSourceConsensus(evidence: SourceEvidence[], claimText: string): {
    agreement: number;
    supporting: number;
    refuting: number;
    neutral: number;
  } {
    let supporting = 0;
    let refuting = 0;
    let neutral = 0;

    evidence.forEach(ev => {
      const content = ev.content.toLowerCase();
      const claim = claimText.toLowerCase();
      
      const supportingWords = ['confirm', 'verify', 'true', 'accurate', 'correct'];
      const refutingWords = ['deny', 'false', 'incorrect', 'misinformation', 'debunk'];
      
      const supportingScore = supportingWords.filter(word => content.includes(word)).length;
      const refutingScore = refutingWords.filter(word => content.includes(word)).length;
      
      if (supportingScore > refutingScore) {
        supporting++;
      } else if (refutingScore > supportingScore) {
        refuting++;
      } else {
        neutral++;
      }
    });

    const total = supporting + refuting + neutral;
    const agreement = total > 0 ? Math.max(supporting, refuting) / total : 0;

    return { agreement, supporting, refuting, neutral };
  }

  /**
   * Calculate recency factor for news relevance
   */
  private calculateRecencyFactor(evidence: SourceEvidence[]): number {
    const now = Date.now();
    let totalRecency = 0;
    let scoredEvidence = 0;

    evidence.forEach(ev => {
      if (ev.publishDate) {
        try {
          const publishTime = new Date(ev.publishDate).getTime();
          const ageInDays = (now - publishTime) / (1000 * 60 * 60 * 24);
          
          let recencyScore = 1.0;
          if (ageInDays <= 1) recencyScore = 1.0;        // Today
          else if (ageInDays <= 7) recencyScore = 0.9;   // This week
          else if (ageInDays <= 30) recencyScore = 0.8;  // This month
          else if (ageInDays <= 90) recencyScore = 0.7;  // Last 3 months
          else recencyScore = 0.6;                       // Older
          
          totalRecency += recencyScore;
          scoredEvidence++;
        } catch (error) {
          // If date parsing fails, assume moderate recency
          totalRecency += 0.7;
          scoredEvidence++;
        }
      }
    });

    return scoredEvidence > 0 ? totalRecency / scoredEvidence : 0.7;
  }
}