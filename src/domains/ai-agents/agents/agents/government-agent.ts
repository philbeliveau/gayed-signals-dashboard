/**
 * Government Agent - Specialized Fact-Checking Agent
 * Phase 2 Implementation - Autonomous MCP-Powered Agent
 * 
 * 🚨 CRITICAL: 100% AUTONOMOUS MCP OPERATION + SAFLA PROTOCOL
 * 
 * Specialization: Official statistics validation, Policy claims verification
 * MCP Services: Web Search + Perplexity + Brave Search
 */

import { BaseFactCheckAgent, SAFLAValidationResult } from './base-agent';
import { ExtractedClaim, Investigation, SourceEvidence, McpResponse, AgentType, VeracityLevel } from '@/types/fact-check';

export class GovernmentAgent extends BaseFactCheckAgent {
  constructor() {
    super('GOVERNMENT');
    this.mcpServices = [
      '@tongxiao/web-search-mcp-server',
      '@jschuller/perplexity-mcp',
      'brave-search-mcp'
    ];
  }

  /**
   * Get MCP requirements for this agent
   */
  getMcpRequirements(): string[] {
    return this.mcpServices;
  }

  /**
   * Investigate government/policy claims using multiple MCP sources
   */
  async investigateClaim(claim: ExtractedClaim): Promise<Investigation> {
    const startTime = Date.now();
    const investigation: Investigation = {
      id: `government-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      claimId: claim.id,
      agentType: 'GOVERNMENT',
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
      console.log(`🏛️ Government Agent investigating: "${claim.claimText}"`);

      // Store investigation start in coordination memory
      await this.storeInMemory(`investigations/government/${investigation.id}/started`, {
        claimId: claim.id,
        claimText: claim.claimText,
        timestamp: Date.now()
      });

      // STRATEGY 1: Web Search for official government sources
      const webEvidence = await this.searchWebGovernment(claim);
      if (webEvidence.length > 0) {
        investigation.evidenceFound.push(...webEvidence);
        investigation.mcpUsed.push('@tongxiao/web-search-mcp-server');
        investigation.sourcesSearched.push('web-government');
      }

      // STRATEGY 2: Perplexity for policy analysis and official statements
      const perplexityEvidence = await this.searchPerplexityGovernment(claim);
      if (perplexityEvidence.length > 0) {
        investigation.evidenceFound.push(...perplexityEvidence);
        investigation.mcpUsed.push('@jschuller/perplexity-mcp');
        investigation.sourcesSearched.push('perplexity-government');
      }

      // STRATEGY 3: Brave Search for government documentation
      const braveEvidence = await this.searchBraveGovernment(claim);
      if (braveEvidence.length > 0) {
        investigation.evidenceFound.push(...braveEvidence);
        investigation.mcpUsed.push('brave-search-mcp');
        investigation.sourcesSearched.push('brave-government');
      }

      // ANALYSIS: Validate official sources and cross-reference
      const analysis = await this.analyzeGovernmentEvidence(investigation.evidenceFound, claim);
      investigation.conclusion = analysis.veracity;
      investigation.confidenceScore = analysis.confidence;
      investigation.reasoning = analysis.reasoning;

      // SAFLA COMPLIANCE CHECK
      investigation.saflaCompliant = await this.validateRealDataOnly();

      // Store final investigation in coordination memory
      await this.storeInMemory(`investigations/government/${investigation.id}/completed`, {
        conclusion: investigation.conclusion,
        confidenceScore: investigation.confidenceScore,
        evidenceCount: investigation.evidenceFound.length,
        saflaCompliant: investigation.saflaCompliant,
        processingTimeMs: Date.now() - startTime
      });

      investigation.processingTimeMs = Date.now() - startTime;
      
      console.log(`✅ Government investigation completed: ${investigation.conclusion} (${investigation.confidenceScore}% confidence)`);
      
      return investigation;

    } catch (error) {
      console.error(`❌ Government Agent error:`, error);
      investigation.reasoning = `Investigation failed: ${error}`;
      investigation.saflaCompliant = false;
      investigation.processingTimeMs = Date.now() - startTime;
      return investigation;
    }
  }

  /**
   * Search Web for official government sources
   */
  private async searchWebGovernment(claim: ExtractedClaim): Promise<SourceEvidence[]> {
    try {
      const governmentQuery = this.buildGovernmentQuery(claim.claimText);
      
      // Execute Web Search MCP call with government site restrictions
      const governmentSites = "whitehouse.gov,congress.gov,supremecourt.gov,state.gov,defense.gov,treasury.gov,justice.gov,nih.gov,cdc.gov,fda.gov,epa.gov,nasa.gov,nist.gov,census.gov,bls.gov,sec.gov,federalreserve.gov,who.int,un.org";
      const mcpCommand = `claude mcp call web-search search --query "${governmentQuery}" --sites "${governmentSites}" --max_results 15`;
      const mcpResult = await this.executeCommand(mcpCommand);
      
      const mcpResponse: McpResponse = JSON.parse(mcpResult);
      
      // SAFLA VALIDATION
      const saflaResult = await this.validateSAFLA(mcpResponse, 'web-search');
      this.recordAuditTrail('web-government-search', '@tongxiao/web-search-mcp-server', mcpResponse, saflaResult);
      
      if (!saflaResult.isValid) {
        console.warn(`⚠️ SAFLA validation failed for Web government search:`, saflaResult.errorMessages);
        return [];
      }

      return this.extractGovernmentEvidenceFromWeb(mcpResponse);

    } catch (error) {
      console.error(`Web government search failed:`, error);
      return [];
    }
  }

  /**
   * Search Perplexity for policy analysis and official statements
   */
  private async searchPerplexityGovernment(claim: ExtractedClaim): Promise<SourceEvidence[]> {
    try {
      const policyQuery = this.buildPolicyQuery(claim.claimText);
      
      // Execute Perplexity MCP call with government focus
      const mcpCommand = `npx @jschuller/perplexity-mcp search --query "${policyQuery}" --focus government --sources gov,official`;
      const mcpResult = await this.executeCommand(mcpCommand);
      
      const mcpResponse: McpResponse = JSON.parse(mcpResult);
      
      // SAFLA VALIDATION
      const saflaResult = await this.validateSAFLA(mcpResponse, 'perplexity');
      this.recordAuditTrail('perplexity-government-search', '@jschuller/perplexity-mcp', mcpResponse, saflaResult);
      
      if (!saflaResult.isValid) {
        console.warn(`⚠️ SAFLA validation failed for Perplexity government search:`, saflaResult.errorMessages);
        return [];
      }

      return this.extractGovernmentEvidenceFromPerplexity(mcpResponse);

    } catch (error) {
      console.error(`Perplexity government search failed:`, error);
      return [];
    }
  }

  /**
   * Search Brave for government documentation
   */
  private async searchBraveGovernment(claim: ExtractedClaim): Promise<SourceEvidence[]> {
    try {
      const documentQuery = this.buildDocumentQuery(claim.claimText);
      
      // Execute Brave Search MCP call with focus on official documents
      const mcpCommand = `npx brave-search-mcp search --query "${documentQuery}" --search_type web --count 12 --safesearch strict`;
      const mcpResult = await this.executeCommand(mcpCommand);
      
      const mcpResponse: McpResponse = JSON.parse(mcpResult);
      
      // SAFLA VALIDATION
      const saflaResult = await this.validateSAFLA(mcpResponse, 'brave');
      this.recordAuditTrail('brave-government-search', 'brave-search-mcp', mcpResponse, saflaResult);
      
      if (!saflaResult.isValid) {
        console.warn(`⚠️ SAFLA validation failed for Brave government search:`, saflaResult.errorMessages);
        return [];
      }

      return this.extractGovernmentEvidenceFromBrave(mcpResponse);

    } catch (error) {
      console.error(`Brave government search failed:`, error);
      return [];
    }
  }

  /**
   * Build government-focused query
   */
  private buildGovernmentQuery(claimText: string): string {
    const governmentKeywords = this.extractGovernmentKeywords(claimText);
    const agencies = this.extractAgencyReferences(claimText);
    
    return `"${claimText}" ${governmentKeywords.join(' ')} ${agencies.join(' ')} official government statistics data`;
  }

  /**
   * Build policy-focused query for Perplexity
   */
  private buildPolicyQuery(claimText: string): string {
    const policyKeywords = this.extractPolicyKeywords(claimText);
    
    return `"${claimText}" ${policyKeywords.join(' ')} policy official statement government position`;
  }

  /**
   * Build document-focused query for Brave
   */
  private buildDocumentQuery(claimText: string): string {
    const keywords = this.extractGovernmentKeywords(claimText);
    
    return `"${claimText}" ${keywords.join(' ')} official document report publication government`;
  }

  /**
   * Extract government-related keywords
   */
  private extractGovernmentKeywords(claimText: string): string[] {
    const governmentTerms = [
      'policy', 'law', 'regulation', 'statute', 'bill', 'act',
      'executive', 'legislative', 'judicial', 'federal', 'state',
      'agency', 'department', 'bureau', 'commission', 'administration',
      'official', 'statement', 'announcement', 'report', 'data',
      'statistics', 'census', 'survey', 'study', 'investigation'
    ];
    
    const words = claimText.toLowerCase().split(/\s+/);
    return governmentTerms.filter(term => 
      words.some(word => word.includes(term) || term.includes(word))
    );
  }

  /**
   * Extract policy-related keywords
   */
  private extractPolicyKeywords(claimText: string): string[] {
    const policyTerms = [
      'healthcare', 'education', 'immigration', 'defense', 'security',
      'economy', 'budget', 'tax', 'spending', 'infrastructure',
      'environment', 'climate', 'energy', 'technology', 'trade',
      'foreign', 'domestic', 'welfare', 'social', 'reform'
    ];
    
    const words = claimText.toLowerCase().split(/\s+/);
    return policyTerms.filter(term => 
      words.some(word => word.includes(term) || term.includes(word))
    );
  }

  /**
   * Extract agency references from claim text
   */
  private extractAgencyReferences(claimText: string): string[] {
    const agencies = [
      'CDC', 'FDA', 'NIH', 'EPA', 'NASA', 'FBI', 'CIA', 'NSA',
      'DOD', 'DOJ', 'DOE', 'DOT', 'HHS', 'DHS', 'USDA', 'DOL',
      'Treasury', 'Fed', 'SEC', 'CFTC', 'FTC', 'BLS', 'Census',
      'IRS', 'SSA', 'CMS', 'OSHA', 'NIST', 'NWS', 'NOAA'
    ];
    
    const text = claimText.toUpperCase();
    return agencies.filter(agency => text.includes(agency));
  }

  /**
   * Extract government evidence from Web Search response
   */
  private extractGovernmentEvidenceFromWeb(mcpResponse: McpResponse): SourceEvidence[] {
    try {
      const evidence: SourceEvidence[] = [];
      
      if (mcpResponse.rawData?.results) {
        mcpResponse.rawData.results.forEach((result: any) => {
          if (this.isOfficialGovernmentSource(result.url)) {
            evidence.push({
              url: result.url,
              title: result.title,
              content: result.snippet || result.description,
              publishDate: result.date,
              sourceType: 'GOVERNMENT',
              credibilityScore: this.calculateGovernmentCredibility(result.url),
              relevanceScore: this.calculateGovernmentRelevance(result.snippet || ''),
              mcpUsed: '@tongxiao/web-search-mcp-server',
              saflaValidated: true,
              verificationTimestamp: Date.now()
            });
          }
        });
      }

      return evidence;
    } catch (error) {
      console.error(`Error extracting web government evidence:`, error);
      return [];
    }
  }

  /**
   * Extract government evidence from Perplexity response
   */
  private extractGovernmentEvidenceFromPerplexity(mcpResponse: McpResponse): SourceEvidence[] {
    try {
      const evidence: SourceEvidence[] = [];
      
      if (mcpResponse.content && mcpResponse.url) {
        evidence.push({
          url: mcpResponse.url,
          title: mcpResponse.title || 'Government Policy Analysis via Perplexity',
          content: mcpResponse.content,
          author: mcpResponse.author,
          publishDate: mcpResponse.publishDate,
          sourceType: 'GOVERNMENT',
          credibilityScore: this.calculatePerplexityGovernmentCredibility(mcpResponse),
          relevanceScore: this.calculateGovernmentRelevance(mcpResponse.content),
          mcpUsed: '@jschuller/perplexity-mcp',
          saflaValidated: true,
          verificationTimestamp: Date.now()
        });
      }

      return evidence;
    } catch (error) {
      console.error(`Error extracting Perplexity government evidence:`, error);
      return [];
    }
  }

  /**
   * Extract government evidence from Brave Search response
   */
  private extractGovernmentEvidenceFromBrave(mcpResponse: McpResponse): SourceEvidence[] {
    try {
      const evidence: SourceEvidence[] = [];
      
      if (mcpResponse.rawData?.web?.results) {
        mcpResponse.rawData.web.results.forEach((result: any) => {
          if (this.isOfficialGovernmentSource(result.url)) {
            evidence.push({
              url: result.url,
              title: result.title,
              content: result.description || result.snippet,
              publishDate: result.age || result.published_date,
              sourceType: 'GOVERNMENT',
              credibilityScore: this.calculateGovernmentCredibility(result.url),
              relevanceScore: this.calculateGovernmentRelevance(result.description || ''),
              mcpUsed: 'brave-search-mcp',
              saflaValidated: true,
              verificationTimestamp: Date.now()
            });
          }
        });
      }

      return evidence;
    } catch (error) {
      console.error(`Error extracting Brave government evidence:`, error);
      return [];
    }
  }

  /**
   * Check if URL is from official government source
   */
  private isOfficialGovernmentSource(url: string): boolean {
    const governmentDomains = [
      '.gov', 'whitehouse.gov', 'congress.gov', 'supremecourt.gov',
      'state.gov', 'defense.gov', 'treasury.gov', 'justice.gov',
      'nih.gov', 'cdc.gov', 'fda.gov', 'epa.gov', 'nasa.gov',
      'nist.gov', 'census.gov', 'bls.gov', 'sec.gov', 'federalreserve.gov',
      'who.int', 'un.org', 'europa.eu', 'oecd.org', 'imf.org',
      'worldbank.org'
    ];
    
    return governmentDomains.some(domain => 
      url.includes(domain) || url.endsWith(domain)
    );
  }

  /**
   * Calculate government source credibility score
   */
  private calculateGovernmentCredibility(url: string): number {
    const tier1Government = {
      'whitehouse.gov': 100,
      'congress.gov': 100,
      'supremecourt.gov': 100,
      'treasury.gov': 100,
      'federalreserve.gov': 100
    };

    const tier2Government = {
      'cdc.gov': 95,
      'nih.gov': 95,
      'fda.gov': 95,
      'census.gov': 95,
      'bls.gov': 95,
      'sec.gov': 95,
      'epa.gov': 90,
      'nasa.gov': 90,
      'nist.gov': 90
    };

    const tier3Government = {
      'state.gov': 90,
      'defense.gov': 90,
      'justice.gov': 90,
      'who.int': 85,
      'un.org': 85,
      'oecd.org': 85
    };

    for (const [domain, score] of Object.entries(tier1Government)) {
      if (url.includes(domain)) return score;
    }

    for (const [domain, score] of Object.entries(tier2Government)) {
      if (url.includes(domain)) return score;
    }

    for (const [domain, score] of Object.entries(tier3Government)) {
      if (url.includes(domain)) return score;
    }

    return url.includes('.gov') ? 85 : (this.isOfficialGovernmentSource(url) ? 80 : 50);
  }

  /**
   * Calculate Perplexity government credibility
   */
  private calculatePerplexityGovernmentCredibility(mcpResponse: McpResponse): number {
    let score = 80; // Base score for government analysis via Perplexity
    
    const content = mcpResponse.content.toLowerCase();
    
    // Boost for official sources mentioned
    if (content.includes('official') || content.includes('government')) score += 10;
    if (content.includes('.gov') || content.includes('agency')) score += 8;
    if (content.includes('policy') || content.includes('regulation')) score += 5;
    
    // Boost for statistical data
    if (content.includes('statistics') || content.includes('data')) score += 7;
    if (content.includes('census') || content.includes('survey')) score += 6;
    
    return Math.min(score, 95);
  }

  /**
   * Calculate government content relevance
   */
  private calculateGovernmentRelevance(content: string): number {
    if (!content) return 0;
    
    const governmentRelevanceKeywords = [
      'official', 'policy', 'law', 'regulation', 'statute', 'government',
      'federal', 'state', 'agency', 'department', 'administration',
      'statistics', 'data', 'report', 'study', 'investigation',
      'announcement', 'statement', 'position', 'directive', 'order'
    ];
    
    const contentLower = content.toLowerCase();
    const matches = governmentRelevanceKeywords.filter(keyword => 
      contentLower.includes(keyword)
    ).length;
    
    return Math.min((matches / governmentRelevanceKeywords.length) * 100, 100);
  }

  /**
   * Analyze all government evidence and determine veracity
   */
  private async analyzeGovernmentEvidence(evidence: SourceEvidence[], claim: ExtractedClaim): Promise<{
    veracity: VeracityLevel;
    confidence: number;
    reasoning: string;
  }> {
    if (evidence.length === 0) {
      return {
        veracity: 'INSUFFICIENT_EVIDENCE',
        confidence: 0,
        reasoning: 'No official government sources found to verify this claim'
      };
    }

    // Analyze source authority and consistency
    const authorityAnalysis = this.analyzeSourceAuthority(evidence);
    const consistencyAnalysis = this.analyzeOfficialConsistency(evidence, claim.claimText);
    const recencyFactor = this.calculateGovernmentRecency(evidence);
    
    // Calculate weighted credibility
    const totalCredibility = evidence.reduce((sum, ev) => sum + ev.credibilityScore, 0);
    const avgCredibility = totalCredibility / evidence.length;
    
    let veracity: VeracityLevel = 'INSUFFICIENT_EVIDENCE';
    let confidence = 0;
    
    // Government sources provide high confidence for factual claims
    if (authorityAnalysis.tier1Sources > 0 && consistencyAnalysis.isConsistent) {
      veracity = 'VERIFIED_TRUE';
      confidence = Math.min(avgCredibility * recencyFactor, 95);
    } else if (authorityAnalysis.tier1Sources > 0 && !consistencyAnalysis.isConsistent) {
      veracity = 'VERIFIED_FALSE';
      confidence = Math.min(avgCredibility * recencyFactor, 95);
    } else if (authorityAnalysis.tier2Sources >= 2 && avgCredibility >= 90) {
      if (consistencyAnalysis.agreement >= 0.8) {
        veracity = consistencyAnalysis.supporting > consistencyAnalysis.contradicting ? 'VERIFIED_TRUE' : 'VERIFIED_FALSE';
        confidence = Math.min(avgCredibility * recencyFactor * 0.9, 85);
      } else {
        veracity = 'PARTIALLY_TRUE';
        confidence = Math.min(avgCredibility * recencyFactor * 0.7, 70);
      }
    } else if (evidence.length >= 2 && avgCredibility >= 80) {
      veracity = 'UNVERIFIED';
      confidence = Math.min(avgCredibility * 0.6, 60);
    } else if (evidence.length >= 1 && avgCredibility >= 70) {
      veracity = 'INSUFFICIENT_EVIDENCE';
      confidence = Math.min(avgCredibility * 0.4, 40);
    }

    const reasoning = `Government analysis based on ${evidence.length} official sources. ` +
      `Authority distribution: ${authorityAnalysis.tier1Sources} tier-1, ${authorityAnalysis.tier2Sources} tier-2, ${authorityAnalysis.tier3Sources} tier-3. ` +
      `Consistency: ${(consistencyAnalysis.agreement * 100).toFixed(1)}% agreement. ` +
      `Average credibility: ${avgCredibility.toFixed(1)}%, recency factor: ${(recencyFactor * 100).toFixed(1)}%.`;

    // Store analysis in coordination memory
    await this.storeInMemory(`analysis/government/${Date.now()}`, {
      evidenceCount: evidence.length,
      avgCredibility,
      authorityAnalysis,
      consistencyAnalysis,
      recencyFactor,
      veracity,
      confidence,
      reasoning
    });

    return { veracity, confidence, reasoning };
  }

  /**
   * Analyze source authority levels
   */
  private analyzeSourceAuthority(evidence: SourceEvidence[]): {
    tier1Sources: number;
    tier2Sources: number;
    tier3Sources: number;
  } {
    let tier1Sources = 0;
    let tier2Sources = 0;
    let tier3Sources = 0;

    evidence.forEach(ev => {
      const credibility = ev.credibilityScore;
      if (credibility >= 95) {
        tier1Sources++;
      } else if (credibility >= 85) {
        tier2Sources++;
      } else {
        tier3Sources++;
      }
    });

    return { tier1Sources, tier2Sources, tier3Sources };
  }

  /**
   * Analyze consistency among official sources
   */
  private analyzeOfficialConsistency(evidence: SourceEvidence[], claimText: string): {
    isConsistent: boolean;
    agreement: number;
    supporting: number;
    contradicting: number;
    neutral: number;
  } {
    let supporting = 0;
    let contradicting = 0;
    let neutral = 0;

    evidence.forEach(ev => {
      const content = ev.content.toLowerCase();
      
      const supportingWords = ['confirm', 'verify', 'official', 'accurate', 'correct', 'true'];
      const contradictingWords = ['deny', 'refute', 'incorrect', 'false', 'inaccurate', 'disputed'];
      
      const supportingScore = supportingWords.filter(word => content.includes(word)).length;
      const contradictingScore = contradictingWords.filter(word => content.includes(word)).length;
      
      if (supportingScore > contradictingScore) {
        supporting++;
      } else if (contradictingScore > supportingScore) {
        contradicting++;
      } else {
        neutral++;
      }
    });

    const total = supporting + contradicting + neutral;
    const agreement = total > 0 ? Math.max(supporting, contradicting) / total : 0;
    const isConsistent = agreement >= 0.8;

    return { isConsistent, agreement, supporting, contradicting, neutral };
  }

  /**
   * Calculate recency factor for government sources
   */
  private calculateGovernmentRecency(evidence: SourceEvidence[]): number {
    const now = Date.now();
    let totalRecency = 0;
    let scoredEvidence = 0;

    evidence.forEach(ev => {
      if (ev.publishDate) {
        try {
          const publishTime = new Date(ev.publishDate).getTime();
          const ageInDays = (now - publishTime) / (1000 * 60 * 60 * 24);
          
          let recencyScore = 1.0;
          if (ageInDays <= 30) recencyScore = 1.0;      // Current month
          else if (ageInDays <= 90) recencyScore = 0.95; // Last 3 months
          else if (ageInDays <= 365) recencyScore = 0.9; // This year
          else if (ageInDays <= 1095) recencyScore = 0.8; // Last 3 years
          else recencyScore = 0.7;                        // Older
          
          totalRecency += recencyScore;
          scoredEvidence++;
        } catch (error) {
          // If date parsing fails, assume moderate recency
          totalRecency += 0.8;
          scoredEvidence++;
        }
      } else {
        // No date available, assume moderate recency
        totalRecency += 0.8;
        scoredEvidence++;
      }
    });

    return scoredEvidence > 0 ? totalRecency / scoredEvidence : 0.8;
  }
}