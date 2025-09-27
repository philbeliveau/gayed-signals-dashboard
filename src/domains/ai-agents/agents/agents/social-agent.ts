/**
 * Social Agent - Specialized Fact-Checking Agent
 * Phase 2 Implementation - Autonomous MCP-Powered Agent
 * 
 * 🚨 CRITICAL: 100% AUTONOMOUS MCP OPERATION + SAFLA PROTOCOL
 * 
 * Specialization: Social sentiment analysis, Social media trends validation
 * MCP Services: Brave Search + Omnisearch MCP + Web Search
 */

import { BaseFactCheckAgent, SAFLAValidationResult } from './base-agent';
import { ExtractedClaim, Investigation, SourceEvidence, McpResponse, AgentType, VeracityLevel } from '../../../src/types/fact-check';

export class SocialAgent extends BaseFactCheckAgent {
  constructor() {
    super('SOCIAL');
    this.mcpServices = [
      'brave-search-mcp',
      'omnisearch-mcp',
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
   * Investigate social media claims and sentiment using multiple MCP sources
   */
  async investigateClaim(claim: ExtractedClaim): Promise<Investigation> {
    const startTime = Date.now();
    const investigation: Investigation = {
      id: `social-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      claimId: claim.id,
      agentType: 'SOCIAL',
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
      console.log(`📱 Social Agent investigating: "${claim.claimText}"`);

      // Store investigation start in coordination memory
      await this.storeInMemory(`investigations/social/${investigation.id}/started`, {
        claimId: claim.id,
        claimText: claim.claimText,
        timestamp: Date.now()
      });

      // STRATEGY 1: Brave Search for social media content
      const braveEvidence = await this.searchBraveSocial(claim);
      if (braveEvidence.length > 0) {
        investigation.evidenceFound.push(...braveEvidence);
        investigation.mcpUsed.push('brave-search-mcp');
        investigation.sourcesSearched.push('brave-social');
      }

      // STRATEGY 2: Omnisearch for comprehensive social analysis
      const omnisearchEvidence = await this.searchOmnisearchSocial(claim);
      if (omnisearchEvidence.length > 0) {
        investigation.evidenceFound.push(...omnisearchEvidence);
        investigation.mcpUsed.push('omnisearch-mcp');
        investigation.sourcesSearched.push('omnisearch-social');
      }

      // STRATEGY 3: Web Search for social platform verification
      const webEvidence = await this.searchWebSocial(claim);
      if (webEvidence.length > 0) {
        investigation.evidenceFound.push(...webEvidence);
        investigation.mcpUsed.push('@tongxiao/web-search-mcp-server');
        investigation.sourcesSearched.push('web-social');
      }

      // ANALYSIS: Analyze social sentiment and trends
      const analysis = await this.analyzeSocialEvidence(investigation.evidenceFound, claim);
      investigation.conclusion = analysis.veracity;
      investigation.confidenceScore = analysis.confidence;
      investigation.reasoning = analysis.reasoning;

      // SAFLA COMPLIANCE CHECK
      investigation.saflaCompliant = await this.validateRealDataOnly();

      // Store final investigation in coordination memory
      await this.storeInMemory(`investigations/social/${investigation.id}/completed`, {
        conclusion: investigation.conclusion,
        confidenceScore: investigation.confidenceScore,
        evidenceCount: investigation.evidenceFound.length,
        saflaCompliant: investigation.saflaCompliant,
        processingTimeMs: Date.now() - startTime
      });

      investigation.processingTimeMs = Date.now() - startTime;
      
      console.log(`✅ Social investigation completed: ${investigation.conclusion} (${investigation.confidenceScore}% confidence)`);
      
      return investigation;

    } catch (error) {
      console.error(`❌ Social Agent error:`, error);
      investigation.reasoning = `Investigation failed: ${error}`;
      investigation.saflaCompliant = false;
      investigation.processingTimeMs = Date.now() - startTime;
      return investigation;
    }
  }

  /**
   * Search Brave for social media content and discussions
   */
  private async searchBraveSocial(claim: ExtractedClaim): Promise<SourceEvidence[]> {
    try {
      const socialQuery = this.buildSocialQuery(claim.claimText);
      
      // Execute Brave Search MCP call with social focus
      const mcpCommand = `claude mcp call brave-search search --query "${socialQuery}" --search_type web --count 15 --safesearch moderate`;
      const mcpResult = await this.executeCommand(mcpCommand);
      
      const mcpResponse: McpResponse = JSON.parse(mcpResult);
      
      // SAFLA VALIDATION
      const saflaResult = await this.validateSAFLA(mcpResponse, 'brave');
      this.recordAuditTrail('brave-social-search', 'brave-search-mcp', mcpResponse, saflaResult);
      
      if (!saflaResult.isValid) {
        console.warn(`⚠️ SAFLA validation failed for Brave social search:`, saflaResult.errorMessages);
        return [];
      }

      return this.extractSocialEvidenceFromBrave(mcpResponse);

    } catch (error) {
      console.error(`Brave social search failed:`, error);
      return [];
    }
  }

  /**
   * Search Omnisearch for comprehensive social media analysis
   */
  private async searchOmnisearchSocial(claim: ExtractedClaim): Promise<SourceEvidence[]> {
    try {
      const socialQuery = this.buildOmnisearchQuery(claim.claimText);
      
      // Execute Omnisearch MCP call for social platforms
      const mcpCommand = `npx omnisearch-mcp search --query "${socialQuery}" --providers "kagi,tavily,brave" --enhance-social true --max-results 10`;
      const mcpResult = await this.executeCommand(mcpCommand);
      
      const mcpResponse: McpResponse = JSON.parse(mcpResult);
      
      // SAFLA VALIDATION
      const saflaResult = await this.validateSAFLA(mcpResponse, 'omnisearch');
      this.recordAuditTrail('omnisearch-social-search', 'omnisearch-mcp', mcpResponse, saflaResult);
      
      if (!saflaResult.isValid) {
        console.warn(`⚠️ SAFLA validation failed for Omnisearch social search:`, saflaResult.errorMessages);
        return [];
      }

      return this.extractSocialEvidenceFromOmnisearch(mcpResponse);

    } catch (error) {
      console.error(`Omnisearch social search failed:`, error);
      return [];
    }
  }

  /**
   * Search Web for social platform verification
   */
  private async searchWebSocial(claim: ExtractedClaim): Promise<SourceEvidence[]> {
    try {
      const socialQuery = this.buildWebSocialQuery(claim.claimText);
      
      // Execute Web Search MCP call with social platform restrictions
      const socialSites = "twitter.com,x.com,facebook.com,linkedin.com,reddit.com,youtube.com,instagram.com,tiktok.com";
      const mcpCommand = `npx @tongxiao/web-search-mcp-server search --query "${socialQuery}" --sites "${socialSites}" --max_results 20`;
      const mcpResult = await this.executeCommand(mcpCommand);
      
      const mcpResponse: McpResponse = JSON.parse(mcpResult);
      
      // SAFLA VALIDATION
      const saflaResult = await this.validateSAFLA(mcpResponse, 'web-search');
      this.recordAuditTrail('web-social-search', '@tongxiao/web-search-mcp-server', mcpResponse, saflaResult);
      
      if (!saflaResult.isValid) {
        console.warn(`⚠️ SAFLA validation failed for Web social search:`, saflaResult.errorMessages);
        return [];
      }

      return this.extractSocialEvidenceFromWeb(mcpResponse);

    } catch (error) {
      console.error(`Web social search failed:`, error);
      return [];
    }
  }

  /**
   * Build social media focused query
   */
  private buildSocialQuery(claimText: string): string {
    const socialKeywords = this.extractSocialKeywords(claimText);
    const hashtags = this.extractHashtags(claimText);
    const mentions = this.extractMentions(claimText);
    
    return `"${claimText}" ${socialKeywords.join(' ')} ${hashtags.join(' ')} ${mentions.join(' ')} social media trending viral`;
  }

  /**
   * Build Omnisearch query for social analysis
   */
  private buildOmnisearchQuery(claimText: string): string {
    const keywords = this.extractSocialKeywords(claimText);
    const sentiment = this.detectSentimentKeywords(claimText);
    
    return `"${claimText}" ${keywords.join(' ')} ${sentiment.join(' ')} social sentiment analysis trends`;
  }

  /**
   * Build web social query
   */
  private buildWebSocialQuery(claimText: string): string {
    const keywords = this.extractSocialKeywords(claimText);
    return `"${claimText}" ${keywords.join(' ')} social media discussion conversation`;
  }

  /**
   * Extract social media keywords
   */
  private extractSocialKeywords(claimText: string): string[] {
    const socialTerms = [
      'viral', 'trending', 'hashtag', 'mention', 'share', 'like',
      'retweet', 'comment', 'post', 'story', 'influencer', 'follower',
      'engagement', 'reach', 'impression', 'content', 'feed', 'timeline'
    ];
    
    const words = claimText.toLowerCase().split(/\s+/);
    return socialTerms.filter(term => 
      words.some(word => word.includes(term) || term.includes(word))
    );
  }

  /**
   * Extract hashtags from claim text
   */
  private extractHashtags(claimText: string): string[] {
    const hashtagPattern = /#[a-zA-Z0-9_]+/g;
    return claimText.match(hashtagPattern) || [];
  }

  /**
   * Extract mentions from claim text
   */
  private extractMentions(claimText: string): string[] {
    const mentionPattern = /@[a-zA-Z0-9_]+/g;
    return claimText.match(mentionPattern) || [];
  }

  /**
   * Detect sentiment-related keywords
   */
  private detectSentimentKeywords(claimText: string): string[] {
    const positiveTerms = ['love', 'great', 'awesome', 'amazing', 'fantastic', 'excellent', 'positive'];
    const negativeTerms = ['hate', 'terrible', 'awful', 'horrible', 'disgusting', 'negative', 'bad'];
    const neutralTerms = ['think', 'believe', 'opinion', 'view', 'perspective', 'neutral'];
    
    const text = claimText.toLowerCase();
    const found: string[] = [];
    
    positiveTerms.forEach(term => {
      if (text.includes(term)) found.push('positive', 'sentiment');
    });
    
    negativeTerms.forEach(term => {
      if (text.includes(term)) found.push('negative', 'sentiment');
    });
    
    neutralTerms.forEach(term => {
      if (text.includes(term)) found.push('neutral', 'opinion');
    });
    
    return [...new Set(found)];
  }

  /**
   * Extract social evidence from Brave Search response
   */
  private extractSocialEvidenceFromBrave(mcpResponse: McpResponse): SourceEvidence[] {
    try {
      const evidence: SourceEvidence[] = [];
      
      if (mcpResponse.rawData?.web?.results) {
        mcpResponse.rawData.web.results.forEach((result: any) => {
          if (this.isSocialPlatform(result.url)) {
            evidence.push({
              url: result.url,
              title: result.title,
              content: result.description || result.snippet,
              publishDate: result.age || result.published_date,
              sourceType: 'SOCIAL',
              credibilityScore: this.calculateSocialCredibility(result.url),
              relevanceScore: this.calculateSocialRelevance(result.description || ''),
              mcpUsed: 'brave-search-mcp',
              saflaValidated: true,
              verificationTimestamp: Date.now()
            });
          }
        });
      }

      return evidence;
    } catch (error) {
      console.error(`Error extracting Brave social evidence:`, error);
      return [];
    }
  }

  /**
   * Extract social evidence from Omnisearch response
   */
  private extractSocialEvidenceFromOmnisearch(mcpResponse: McpResponse): SourceEvidence[] {
    try {
      const evidence: SourceEvidence[] = [];
      
      if (mcpResponse.rawData?.results) {
        mcpResponse.rawData.results.forEach((result: any) => {
          if (this.isSocialPlatform(result.url)) {
            evidence.push({
              url: result.url,
              title: result.title,
              content: result.content || result.snippet,
              publishDate: result.date,
              sourceType: 'SOCIAL',
              credibilityScore: this.calculateOmnisearchSocialCredibility(result),
              relevanceScore: this.calculateSocialRelevance(result.content || ''),
              mcpUsed: 'omnisearch-mcp',
              saflaValidated: true,
              verificationTimestamp: Date.now()
            });
          }
        });
      }

      return evidence;
    } catch (error) {
      console.error(`Error extracting Omnisearch social evidence:`, error);
      return [];
    }
  }

  /**
   * Extract social evidence from Web Search response
   */
  private extractSocialEvidenceFromWeb(mcpResponse: McpResponse): SourceEvidence[] {
    try {
      const evidence: SourceEvidence[] = [];
      
      if (mcpResponse.rawData?.results) {
        mcpResponse.rawData.results.forEach((result: any) => {
          if (this.isSocialPlatform(result.url)) {
            evidence.push({
              url: result.url,
              title: result.title,
              content: result.snippet || result.description,
              publishDate: result.date,
              sourceType: 'SOCIAL',
              credibilityScore: this.calculateSocialCredibility(result.url),
              relevanceScore: this.calculateSocialRelevance(result.snippet || ''),
              mcpUsed: '@tongxiao/web-search-mcp-server',
              saflaValidated: true,
              verificationTimestamp: Date.now()
            });
          }
        });
      }

      return evidence;
    } catch (error) {
      console.error(`Error extracting web social evidence:`, error);
      return [];
    }
  }

  /**
   * Check if URL is from social media platform
   */
  private isSocialPlatform(url: string): boolean {
    const socialDomains = [
      'twitter.com', 'x.com', 'facebook.com', 'linkedin.com',
      'reddit.com', 'youtube.com', 'instagram.com', 'tiktok.com',
      'snapchat.com', 'pinterest.com', 'discord.com', 'telegram.org'
    ];
    
    return socialDomains.some(domain => url.includes(domain));
  }

  /**
   * Calculate social platform credibility score
   */
  private calculateSocialCredibility(url: string): number {
    const platformCredibility = {
      'linkedin.com': 80,      // Professional network, higher credibility
      'reddit.com': 70,        // Community moderation, varied credibility
      'youtube.com': 65,       // Video content, source dependent
      'twitter.com': 60,       // Real-time but unmoderated
      'x.com': 60,            // Same as Twitter
      'facebook.com': 55,      // Mixed content quality
      'instagram.com': 50,     // Visual content, less factual
      'tiktok.com': 45,       // Entertainment focused
      'snapchat.com': 40,      // Ephemeral content
      'pinterest.com': 40,     // Visual discovery
      'discord.com': 35,       // Private/gaming community
      'telegram.org': 35       // Messaging platform
    };

    for (const [domain, score] of Object.entries(platformCredibility)) {
      if (url.includes(domain)) {
        return score;
      }
    }

    return this.isSocialPlatform(url) ? 45 : 30;
  }

  /**
   * Calculate Omnisearch-specific social credibility
   */
  private calculateOmnisearchSocialCredibility(result: any): number {
    let score = this.calculateSocialCredibility(result.url);
    
    // Boost for enhanced social analysis
    if (result.sentiment_analysis) score += 10;
    if (result.engagement_metrics) score += 8;
    if (result.verification_status === 'verified') score += 15;
    if (result.source_authority === 'high') score += 12;
    
    return Math.min(score, 85); // Cap at 85 for social content
  }

  /**
   * Calculate social content relevance
   */
  private calculateSocialRelevance(content: string): number {
    if (!content) return 0;
    
    const socialRelevanceKeywords = [
      'discussion', 'conversation', 'debate', 'opinion', 'view',
      'trending', 'viral', 'popular', 'share', 'comment',
      'reaction', 'response', 'community', 'public', 'sentiment',
      'hashtag', 'mention', 'influence', 'engagement', 'reach'
    ];
    
    const contentLower = content.toLowerCase();
    const matches = socialRelevanceKeywords.filter(keyword => 
      contentLower.includes(keyword)
    ).length;
    
    return Math.min((matches / socialRelevanceKeywords.length) * 100, 100);
  }

  /**
   * Analyze all social evidence and determine veracity
   */
  private async analyzeSocialEvidence(evidence: SourceEvidence[], claim: ExtractedClaim): Promise<{
    veracity: VeracityLevel;
    confidence: number;
    reasoning: string;
  }> {
    if (evidence.length === 0) {
      return {
        veracity: 'INSUFFICIENT_EVIDENCE',
        confidence: 0,
        reasoning: 'No social media evidence found for this claim'
      };
    }

    // Analyze social sentiment and engagement
    const sentimentAnalysis = this.analyzeSocialSentiment(evidence, claim.claimText);
    const platformDistribution = this.analyzePlatformDistribution(evidence);
    const temporalPattern = this.analyzeTemporalPattern(evidence);
    
    // Calculate weighted credibility
    const totalCredibility = evidence.reduce((sum, ev) => sum + ev.credibilityScore, 0);
    const avgCredibility = totalCredibility / evidence.length;
    
    let veracity: VeracityLevel = 'INSUFFICIENT_EVIDENCE';
    let confidence = 0;
    
    // Social media claims are inherently less reliable for fact-checking
    // Focus on sentiment and discussion patterns rather than truth verification
    if (evidence.length >= 5 && avgCredibility >= 60) {
      if (sentimentAnalysis.consistency >= 0.8) {
        if (sentimentAnalysis.positiveRatio > 0.7) {
          veracity = 'UNVERIFIED'; // Social consensus but not factual verification
          confidence = Math.min(avgCredibility * 0.7, 70);
        } else if (sentimentAnalysis.negativeRatio > 0.7) {
          veracity = 'UNVERIFIED'; // Social skepticism but not factual refutation
          confidence = Math.min(avgCredibility * 0.7, 70);
        } else {
          veracity = 'INSUFFICIENT_EVIDENCE';
          confidence = Math.min(avgCredibility * 0.5, 50);
        }
      } else {
        veracity = 'INSUFFICIENT_EVIDENCE';
        confidence = Math.min(avgCredibility * 0.4, 40);
      }
    } else if (evidence.length >= 2 && avgCredibility >= 50) {
      veracity = 'UNVERIFIED';
      confidence = Math.min(avgCredibility * 0.3, 30);
    }

    const reasoning = `Social media analysis based on ${evidence.length} posts across ${platformDistribution.uniquePlatforms} platforms. ` +
      `Sentiment consistency: ${(sentimentAnalysis.consistency * 100).toFixed(1)}%, ` +
      `positive: ${(sentimentAnalysis.positiveRatio * 100).toFixed(1)}%, ` +
      `negative: ${(sentimentAnalysis.negativeRatio * 100).toFixed(1)}%. ` +
      `Average credibility: ${avgCredibility.toFixed(1)}%. ` +
      `Note: Social media evidence provides sentiment and discussion patterns, not factual verification.`;

    // Store analysis in coordination memory
    await this.storeInMemory(`analysis/social/${Date.now()}`, {
      evidenceCount: evidence.length,
      avgCredibility,
      sentimentAnalysis,
      platformDistribution,
      temporalPattern,
      veracity,
      confidence,
      reasoning
    });

    return { veracity, confidence, reasoning };
  }

  /**
   * Analyze social sentiment patterns
   */
  private analyzeSocialSentiment(evidence: SourceEvidence[], claimText: string): {
    consistency: number;
    positiveRatio: number;
    negativeRatio: number;
    neutralRatio: number;
  } {
    let positive = 0;
    let negative = 0;
    let neutral = 0;

    evidence.forEach(ev => {
      const content = ev.content.toLowerCase();
      
      const positiveWords = ['agree', 'support', 'true', 'correct', 'right', 'love', 'great', 'awesome'];
      const negativeWords = ['disagree', 'oppose', 'false', 'wrong', 'hate', 'terrible', 'awful'];
      
      const positiveScore = positiveWords.filter(word => content.includes(word)).length;
      const negativeScore = negativeWords.filter(word => content.includes(word)).length;
      
      if (positiveScore > negativeScore) {
        positive++;
      } else if (negativeScore > positiveScore) {
        negative++;
      } else {
        neutral++;
      }
    });

    const total = evidence.length;
    const positiveRatio = positive / total;
    const negativeRatio = negative / total;
    const neutralRatio = neutral / total;
    
    // Consistency is how much sentiment aligns in one direction
    const dominantRatio = Math.max(positiveRatio, negativeRatio, neutralRatio);
    const consistency = dominantRatio;

    return { consistency, positiveRatio, negativeRatio, neutralRatio };
  }

  /**
   * Analyze platform distribution
   */
  private analyzePlatformDistribution(evidence: SourceEvidence[]): {
    uniquePlatforms: number;
    platformCounts: Record<string, number>;
    dominantPlatform: string;
  } {
    const platformCounts: Record<string, number> = {};
    
    evidence.forEach(ev => {
      try {
        const domain = new URL(ev.url).hostname;
        platformCounts[domain] = (platformCounts[domain] || 0) + 1;
      } catch (error) {
        // Skip malformed URLs
      }
    });

    const uniquePlatforms = Object.keys(platformCounts).length;
    const dominantPlatform = Object.entries(platformCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';

    return { uniquePlatforms, platformCounts, dominantPlatform };
  }

  /**
   * Analyze temporal posting patterns
   */
  private analyzeTemporalPattern(evidence: SourceEvidence[]): {
    timeSpread: number;
    recentCount: number;
    olderCount: number;
  } {
    const now = Date.now();
    let recentCount = 0; // Within 7 days
    let olderCount = 0;
    const timestamps: number[] = [];

    evidence.forEach(ev => {
      if (ev.publishDate) {
        try {
          const timestamp = new Date(ev.publishDate).getTime();
          timestamps.push(timestamp);
          
          const ageInDays = (now - timestamp) / (1000 * 60 * 60 * 24);
          if (ageInDays <= 7) {
            recentCount++;
          } else {
            olderCount++;
          }
        } catch (error) {
          olderCount++; // Assume older if date parsing fails
        }
      } else {
        olderCount++; // Assume older if no date
      }
    });

    // Calculate time spread (range of posting times)
    let timeSpread = 0;
    if (timestamps.length >= 2) {
      const sorted = timestamps.sort((a, b) => a - b);
      timeSpread = (sorted[sorted.length - 1] - sorted[0]) / (1000 * 60 * 60 * 24); // Days
    }

    return { timeSpread, recentCount, olderCount };
  }
}