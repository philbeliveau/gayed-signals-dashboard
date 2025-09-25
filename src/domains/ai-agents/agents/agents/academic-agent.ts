/**
 * Academic Agent - Specialized Fact-Checking Agent
 * Phase 2 Implementation - Autonomous MCP-Powered Agent
 * 
 * 🚨 CRITICAL: 100% AUTONOMOUS MCP OPERATION + SAFLA PROTOCOL
 * 
 * Specialization: Peer-reviewed sources, Scientific claims validation
 * MCP Services: Perplexity + Elasticsearch + Web Search
 */

import { BaseFactCheckAgent, SAFLAValidationResult } from './base-agent';
import { ExtractedClaim, Investigation, SourceEvidence, McpResponse, AgentType, VeracityLevel } from '../../../src/types/fact-check';

export class AcademicAgent extends BaseFactCheckAgent {
  constructor() {
    super('ACADEMIC');
    this.mcpServices = [
      '@jschuller/perplexity-mcp',
      '@elastic/mcp-server-elasticsearch', 
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
   * Investigate academic/scientific claims using multiple MCP sources
   */
  async investigateClaim(claim: ExtractedClaim): Promise<Investigation> {
    const startTime = Date.now();
    const investigation: Investigation = {
      id: `academic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      claimId: claim.id,
      agentType: 'ACADEMIC',
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
      console.log(`🎓 Academic Agent investigating: "${claim.claimText}"`);

      // Store investigation start in coordination memory
      await this.storeInMemory(`investigations/academic/${investigation.id}/started`, {
        claimId: claim.id,
        claimText: claim.claimText,
        timestamp: Date.now()
      });

      // STRATEGY 1: Perplexity for academic paper search
      const perplexityEvidence = await this.searchPerplexityAcademic(claim);
      if (perplexityEvidence.length > 0) {
        investigation.evidenceFound.push(...perplexityEvidence);
        investigation.mcpUsed.push('@jschuller/perplexity-mcp');
        investigation.sourcesSearched.push('perplexity-academic');
      }

      // STRATEGY 2: Elasticsearch for indexed academic content
      const elasticsearchEvidence = await this.searchElasticsearchAcademic(claim);
      if (elasticsearchEvidence.length > 0) {
        investigation.evidenceFound.push(...elasticsearchEvidence);
        investigation.mcpUsed.push('@elastic/mcp-server-elasticsearch');
        investigation.sourcesSearched.push('elasticsearch-academic');
      }

      // STRATEGY 3: Web Search for additional academic sources
      const webSearchEvidence = await this.searchWebAcademic(claim);
      if (webSearchEvidence.length > 0) {
        investigation.evidenceFound.push(...webSearchEvidence);
        investigation.mcpUsed.push('@tongxiao/web-search-mcp-server');
        investigation.sourcesSearched.push('web-search-academic');
      }

      // ANALYSIS: Evaluate evidence and determine veracity
      const analysis = await this.analyzeAcademicEvidence(investigation.evidenceFound);
      investigation.conclusion = analysis.veracity;
      investigation.confidenceScore = analysis.confidence;
      investigation.reasoning = analysis.reasoning;

      // SAFLA COMPLIANCE CHECK
      investigation.saflaCompliant = await this.validateRealDataOnly();

      // Store final investigation in coordination memory
      await this.storeInMemory(`investigations/academic/${investigation.id}/completed`, {
        conclusion: investigation.conclusion,
        confidenceScore: investigation.confidenceScore,
        evidenceCount: investigation.evidenceFound.length,
        saflaCompliant: investigation.saflaCompliant,
        processingTimeMs: Date.now() - startTime
      });

      investigation.processingTimeMs = Date.now() - startTime;
      
      console.log(`✅ Academic investigation completed: ${investigation.conclusion} (${investigation.confidenceScore}% confidence)`);
      
      return investigation;

    } catch (error) {
      console.error(`❌ Academic Agent error:`, error);
      investigation.reasoning = `Investigation failed: ${error}`;
      investigation.saflaCompliant = false;
      investigation.processingTimeMs = Date.now() - startTime;
      return investigation;
    }
  }

  /**
   * Search Perplexity for academic papers and scientific content
   */
  private async searchPerplexityAcademic(claim: ExtractedClaim): Promise<SourceEvidence[]> {
    try {
      // Construct academic-focused query
      const academicQuery = this.buildAcademicQuery(claim.claimText);
      
      // Execute Perplexity MCP call
      const mcpCommand = `claude mcp call perplexity search --query "${academicQuery}" --focus academic --citations true`;
      const mcpResult = await this.executeCommand(mcpCommand);
      
      const mcpResponse: McpResponse = JSON.parse(mcpResult);
      
      // SAFLA VALIDATION
      const saflaResult = await this.validateSAFLA(mcpResponse, 'perplexity');
      this.recordAuditTrail('perplexity-academic-search', '@jschuller/perplexity-mcp', mcpResponse, saflaResult);
      
      if (!saflaResult.isValid) {
        console.warn(`⚠️ SAFLA validation failed for Perplexity academic search:`, saflaResult.errorMessages);
        return [];
      }

      // Parse and extract academic evidence
      return this.extractAcademicEvidenceFromPerplexity(mcpResponse);

    } catch (error) {
      console.error(`Perplexity academic search failed:`, error);
      return [];
    }
  }

  /**
   * Search Elasticsearch for indexed academic content
   */
  private async searchElasticsearchAcademic(claim: ExtractedClaim): Promise<SourceEvidence[]> {
    try {
      const academicQuery = this.buildElasticsearchQuery(claim.claimText);
      
      // Execute Elasticsearch MCP call
      const mcpCommand = `npx @elastic/mcp-server-elasticsearch search --index "academic_papers,scientific_journals" --query "${academicQuery}" --size 10`;
      const mcpResult = await this.executeCommand(mcpCommand);
      
      const mcpResponse: McpResponse = JSON.parse(mcpResult);
      
      // SAFLA VALIDATION
      const saflaResult = await this.validateSAFLA(mcpResponse, 'elasticsearch');
      this.recordAuditTrail('elasticsearch-academic-search', '@elastic/mcp-server-elasticsearch', mcpResponse, saflaResult);
      
      if (!saflaResult.isValid) {
        console.warn(`⚠️ SAFLA validation failed for Elasticsearch academic search:`, saflaResult.errorMessages);
        return [];
      }

      return this.extractAcademicEvidenceFromElasticsearch(mcpResponse);

    } catch (error) {
      console.error(`Elasticsearch academic search failed:`, error);
      return [];
    }
  }

  /**
   * Search Web for additional academic sources
   */
  private async searchWebAcademic(claim: ExtractedClaim): Promise<SourceEvidence[]> {
    try {
      const webQuery = this.buildWebAcademicQuery(claim.claimText);
      
      // Execute Web Search MCP call with academic site restrictions
      const mcpCommand = `npx @tongxiao/web-search-mcp-server search --query "${webQuery}" --sites "scholar.google.com,pubmed.ncbi.nlm.nih.gov,arxiv.org,jstor.org" --max_results 10`;
      const mcpResult = await this.executeCommand(mcpCommand);
      
      const mcpResponse: McpResponse = JSON.parse(mcpResult);
      
      // SAFLA VALIDATION
      const saflaResult = await this.validateSAFLA(mcpResponse, 'web-search');
      this.recordAuditTrail('web-academic-search', '@tongxiao/web-search-mcp-server', mcpResponse, saflaResult);
      
      if (!saflaResult.isValid) {
        console.warn(`⚠️ SAFLA validation failed for Web academic search:`, saflaResult.errorMessages);
        return [];
      }

      return this.extractAcademicEvidenceFromWeb(mcpResponse);

    } catch (error) {
      console.error(`Web academic search failed:`, error);
      return [];
    }
  }

  /**
   * Build academic-focused query for Perplexity
   */
  private buildAcademicQuery(claimText: string): string {
    // Extract key scientific terms
    const scientificKeywords = this.extractScientificKeywords(claimText);
    
    // Construct academic query with scientific modifiers
    return `academic research papers "${claimText}" ${scientificKeywords.join(' ')} peer-reviewed study findings`;
  }

  /**
   * Build Elasticsearch query for academic indices
   */
  private buildElasticsearchQuery(claimText: string): string {
    const keywords = this.extractScientificKeywords(claimText);
    
    return JSON.stringify({
      query: {
        bool: {
          should: [
            { match: { title: { query: claimText, boost: 3.0 } } },
            { match: { abstract: { query: claimText, boost: 2.0 } } },
            { match: { keywords: { query: keywords.join(' '), boost: 1.5 } } }
          ],
          filter: [
            { term: { peer_reviewed: true } },
            { range: { publication_year: { gte: 2010 } } }
          ]
        }
      },
      sort: [
        { citation_count: { order: "desc" } },
        { _score: { order: "desc" } }
      ]
    });
  }

  /**
   * Build web search query for academic sources
   */
  private buildWebAcademicQuery(claimText: string): string {
    const keywords = this.extractScientificKeywords(claimText);
    return `"${claimText}" ${keywords.join(' ')} academic study research paper`;
  }

  /**
   * Extract scientific keywords from claim text
   */
  private extractScientificKeywords(claimText: string): string[] {
    const scientificTerms = [
      'study', 'research', 'analysis', 'evidence', 'data', 'results', 
      'findings', 'conclusion', 'methodology', 'systematic review',
      'meta-analysis', 'clinical trial', 'peer-reviewed', 'journal'
    ];
    
    const words = claimText.toLowerCase().split(/\s+/);
    return scientificTerms.filter(term => 
      words.some(word => word.includes(term) || term.includes(word))
    );
  }

  /**
   * Extract academic evidence from Perplexity response
   */
  private extractAcademicEvidenceFromPerplexity(mcpResponse: McpResponse): SourceEvidence[] {
    try {
      const evidence: SourceEvidence[] = [];
      
      // Parse Perplexity response for academic sources
      if (mcpResponse.content && mcpResponse.url) {
        evidence.push({
          url: mcpResponse.url,
          title: mcpResponse.title || 'Academic Research via Perplexity',
          content: mcpResponse.content,
          author: mcpResponse.author,
          publishDate: mcpResponse.publishDate,
          sourceType: 'ACADEMIC',
          credibilityScore: this.calculateAcademicCredibility(mcpResponse.url),
          relevanceScore: this.calculateRelevanceScore(mcpResponse.content),
          mcpUsed: '@jschuller/perplexity-mcp',
          saflaValidated: true,
          verificationTimestamp: Date.now()
        });
      }

      return evidence;
    } catch (error) {
      console.error(`Error extracting Perplexity academic evidence:`, error);
      return [];
    }
  }

  /**
   * Extract academic evidence from Elasticsearch response
   */
  private extractAcademicEvidenceFromElasticsearch(mcpResponse: McpResponse): SourceEvidence[] {
    try {
      const evidence: SourceEvidence[] = [];
      
      // Parse Elasticsearch academic hits
      if (mcpResponse.rawData?.hits?.hits) {
        mcpResponse.rawData.hits.hits.forEach((hit: any) => {
          evidence.push({
            url: hit._source.doi_url || hit._source.url || `https://doi.org/${hit._source.doi}`,
            title: hit._source.title,
            content: hit._source.abstract || hit._source.content,
            author: hit._source.authors?.join(', '),
            publishDate: hit._source.publication_date,
            sourceType: 'ACADEMIC',
            credibilityScore: this.calculateElasticsearchCredibility(hit._source),
            relevanceScore: hit._score || 0,
            mcpUsed: '@elastic/mcp-server-elasticsearch',
            saflaValidated: true,
            verificationTimestamp: Date.now()
          });
        });
      }

      return evidence;
    } catch (error) {
      console.error(`Error extracting Elasticsearch academic evidence:`, error);
      return [];
    }
  }

  /**
   * Extract academic evidence from web search response
   */
  private extractAcademicEvidenceFromWeb(mcpResponse: McpResponse): SourceEvidence[] {
    try {
      const evidence: SourceEvidence[] = [];
      
      // Parse web search results for academic sources
      if (mcpResponse.rawData?.results) {
        mcpResponse.rawData.results.forEach((result: any) => {
          if (this.isAcademicSource(result.url)) {
            evidence.push({
              url: result.url,
              title: result.title,
              content: result.snippet || result.description,
              publishDate: result.date,
              sourceType: 'ACADEMIC',
              credibilityScore: this.calculateAcademicCredibility(result.url),
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
      console.error(`Error extracting web academic evidence:`, error);
      return [];
    }
  }

  /**
   * Check if URL is from academic source
   */
  private isAcademicSource(url: string): boolean {
    const academicDomains = [
      'scholar.google.com', 'pubmed.ncbi.nlm.nih.gov', 'arxiv.org',
      'jstor.org', 'springer.com', 'nature.com', 'science.org',
      'wiley.com', 'elsevier.com', 'sage.com', 'tandfonline.com',
      'ieee.org', 'acm.org', 'ams.org', 'aps.org'
    ];
    
    return academicDomains.some(domain => url.includes(domain));
  }

  /**
   * Calculate academic credibility score
   */
  private calculateAcademicCredibility(url: string): number {
    const highCredibilityDomains = {
      'nature.com': 95,
      'science.org': 95,
      'pubmed.ncbi.nlm.nih.gov': 90,
      'scholar.google.com': 85,
      'arxiv.org': 80,
      'jstor.org': 85,
      'springer.com': 80,
      'wiley.com': 80,
      'elsevier.com': 80
    };

    for (const [domain, score] of Object.entries(highCredibilityDomains)) {
      if (url.includes(domain)) {
        return score;
      }
    }

    return this.isAcademicSource(url) ? 70 : 50;
  }

  /**
   * Calculate Elasticsearch-specific credibility
   */
  private calculateElasticsearchCredibility(source: any): number {
    let score = 70; // Base academic score
    
    if (source.peer_reviewed) score += 20;
    if (source.citation_count > 100) score += 10;
    if (source.impact_factor > 5) score += 10;
    if (source.publication_year && source.publication_year > 2020) score += 5;
    
    return Math.min(score, 100);
  }

  /**
   * Calculate relevance score based on content
   */
  private calculateRelevanceScore(content: string): number {
    if (!content) return 0;
    
    const relevanceKeywords = [
      'study', 'research', 'findings', 'evidence', 'data',
      'analysis', 'results', 'conclusion', 'significant',
      'correlation', 'causation', 'methodology'
    ];
    
    const contentLower = content.toLowerCase();
    const matches = relevanceKeywords.filter(keyword => 
      contentLower.includes(keyword)
    ).length;
    
    return Math.min((matches / relevanceKeywords.length) * 100, 100);
  }

  /**
   * Analyze all academic evidence and determine veracity
   */
  private async analyzeAcademicEvidence(evidence: SourceEvidence[]): Promise<{
    veracity: VeracityLevel;
    confidence: number;
    reasoning: string;
  }> {
    if (evidence.length === 0) {
      return {
        veracity: 'INSUFFICIENT_EVIDENCE',
        confidence: 0,
        reasoning: 'No academic evidence found from peer-reviewed sources'
      };
    }

    // Calculate weighted scores
    const totalCredibility = evidence.reduce((sum, ev) => sum + ev.credibilityScore, 0);
    const avgCredibility = totalCredibility / evidence.length;
    const totalRelevance = evidence.reduce((sum, ev) => sum + ev.relevanceScore, 0);
    const avgRelevance = totalRelevance / evidence.length;
    
    // Determine veracity based on evidence quality and consistency
    let veracity: VeracityLevel = 'INSUFFICIENT_EVIDENCE';
    let confidence = 0;
    
    if (evidence.length >= 3 && avgCredibility >= 80 && avgRelevance >= 70) {
      // Check for consensus in high-quality evidence
      const supportingEvidence = evidence.filter(ev => 
        ev.content.toLowerCase().includes('support') || 
        ev.content.toLowerCase().includes('confirm') ||
        ev.content.toLowerCase().includes('evidence for')
      );
      
      const refutingEvidence = evidence.filter(ev =>
        ev.content.toLowerCase().includes('refute') ||
        ev.content.toLowerCase().includes('contradict') ||
        ev.content.toLowerCase().includes('evidence against')
      );

      if (supportingEvidence.length > refutingEvidence.length * 2) {
        veracity = 'VERIFIED_TRUE';
        confidence = Math.min(avgCredibility, 95);
      } else if (refutingEvidence.length > supportingEvidence.length * 2) {
        veracity = 'VERIFIED_FALSE';
        confidence = Math.min(avgCredibility, 95);
      } else {
        veracity = 'PARTIALLY_TRUE';
        confidence = Math.min(avgCredibility * 0.8, 80);
      }
    } else if (evidence.length >= 1 && avgCredibility >= 70) {
      veracity = 'UNVERIFIED';
      confidence = Math.min(avgCredibility * 0.6, 60);
    }

    const reasoning = `Academic analysis based on ${evidence.length} peer-reviewed sources. ` +
      `Average credibility: ${avgCredibility.toFixed(1)}%, relevance: ${avgRelevance.toFixed(1)}%. ` +
      `Evidence quality: ${evidence.length >= 3 ? 'High' : evidence.length >= 1 ? 'Medium' : 'Low'}.`;

    // Store analysis in coordination memory
    await this.storeInMemory(`analysis/academic/${Date.now()}`, {
      evidenceCount: evidence.length,
      avgCredibility,
      avgRelevance,
      veracity,
      confidence,
      reasoning
    });

    return { veracity, confidence, reasoning };
  }
}