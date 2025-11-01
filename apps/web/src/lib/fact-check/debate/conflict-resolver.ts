/**
 * Conflict Resolver
 * Phase 3 - Debate System Engineer
 * 
 * Identifies evidence contradictions and resolves source credibility conflicts
 */

import { 
  EvidenceConflict, 
  SourceEvidence, 
  AgentType, 
  DebateArgument 
} from '../../../types/fact-check';

export interface ConflictResolution {
  conflictId: string;
  resolutionMethod: 'CREDIBILITY_WEIGHTED' | 'TEMPORAL_PRIORITY' | 'SOURCE_AUTHORITY' | 'AGENT_CONSENSUS' | 'MANUAL_REVIEW';
  resolvedEvidence: SourceEvidence[];
  discardedEvidence: SourceEvidence[];
  confidenceScore: number;
  reasoning: string;
  resolvedAt: Date;
}

export interface CredibilityWeights {
  academicSources: number;
  governmentSources: number;
  newsSources: number;
  financialSources: number;
  socialSources: number;
  authorReputation: number;
  recentness: number;
  sourceVerification: number;
}

export class ConflictResolver {
  private defaultCredibilityWeights: CredibilityWeights = {
    academicSources: 0.9,
    governmentSources: 0.85,
    newsSources: 0.7,
    financialSources: 0.75,
    socialSources: 0.4,
    authorReputation: 0.8,
    recentness: 0.6,
    sourceVerification: 0.95
  };

  /**
   * Resolve all conflicts in a debate round
   */
  async resolveConflicts(
    conflicts: EvidenceConflict[],
    allEvidence: SourceEvidence[],
    weights?: Partial<CredibilityWeights>
  ): Promise<ConflictResolution[]> {
    const resolvedConflicts: ConflictResolution[] = [];
    const credibilityWeights = { ...this.defaultCredibilityWeights, ...weights };

    for (const conflict of conflicts) {
      try {
        const resolution = await this.resolveIndividualConflict(
          conflict,
          allEvidence,
          credibilityWeights
        );
        resolvedConflicts.push(resolution);
      } catch (error) {
        console.error(`Failed to resolve conflict: ${error}`);
        // Create a manual review resolution for failed cases
        resolvedConflicts.push(this.createManualReviewResolution(conflict));
      }
    }

    return resolvedConflicts;
  }

  /**
   * Resolve individual evidence conflict
   */
  private async resolveIndividualConflict(
    conflict: EvidenceConflict,
    allEvidence: SourceEvidence[],
    weights: CredibilityWeights
  ): Promise<ConflictResolution> {
    switch (conflict.conflictType) {
      case 'SOURCE_DISAGREEMENT':
        return this.resolveSourceDisagreement(conflict, weights);
      
      case 'TEMPORAL_DISCREPANCY':
        return this.resolveTemporalDiscrepancy(conflict, weights);
      
      case 'METHODOLOGY_DIFFERENCE':
        return this.resolveMethodologyDifference(conflict, weights);
      
      case 'INTERPRETATION_VARIANCE':
        return this.resolveInterpretationVariance(conflict, weights);
      
      default:
        throw new Error(`Unknown conflict type: ${conflict.conflictType}`);
    }
  }

  /**
   * Resolve conflicts where sources directly disagree
   */
  private async resolveSourceDisagreement(
    conflict: EvidenceConflict,
    weights: CredibilityWeights
  ): Promise<ConflictResolution> {
    const evidenceScores = conflict.conflictingEvidence.map(evidence => ({
      evidence,
      score: this.calculateCredibilityScore(evidence, weights)
    }));

    // Sort by credibility score
    evidenceScores.sort((a, b) => b.score - a.score);

    // Use top 60% of evidence by credibility
    const threshold = evidenceScores[0].score * 0.6;
    const resolvedEvidence = evidenceScores
      .filter(item => item.score >= threshold)
      .map(item => item.evidence);

    const discardedEvidence = evidenceScores
      .filter(item => item.score < threshold)
      .map(item => item.evidence);

    return {
      conflictId: `source-disagreement-${Date.now()}`,
      resolutionMethod: 'CREDIBILITY_WEIGHTED',
      resolvedEvidence,
      discardedEvidence,
      confidenceScore: Math.min(evidenceScores[0].score * 100, 95),
      reasoning: this.generateSourceDisagreementReasoning(evidenceScores, threshold),
      resolvedAt: new Date()
    };
  }

  /**
   * Resolve conflicts based on timing
   */
  private async resolveTemporalDiscrepancy(
    conflict: EvidenceConflict,
    weights: CredibilityWeights
  ): Promise<ConflictResolution> {
    const evidenceWithDates = conflict.conflictingEvidence
      .filter(evidence => evidence.publishDate)
      .map(evidence => ({
        evidence,
        date: new Date(evidence.publishDate!),
        score: this.calculateCredibilityScore(evidence, weights)
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Most recent first

    if (evidenceWithDates.length === 0) {
      return this.createManualReviewResolution(conflict);
    }

    // Prefer more recent sources, but weight by credibility
    const scoredEvidence = evidenceWithDates.map((item, index) => {
      const recencyBonus = Math.max(0, 1 - (index * 0.1)); // Decrease bonus for older sources
      const finalScore = item.score * (1 + recencyBonus * weights.recentness);
      return { ...item, finalScore };
    });

    scoredEvidence.sort((a, b) => b.finalScore - a.finalScore);

    // Take top 70% by final score
    const cutoff = Math.ceil(scoredEvidence.length * 0.7);
    const resolvedEvidence = scoredEvidence.slice(0, cutoff).map(item => item.evidence);
    const discardedEvidence = scoredEvidence.slice(cutoff).map(item => item.evidence);

    return {
      conflictId: `temporal-discrepancy-${Date.now()}`,
      resolutionMethod: 'TEMPORAL_PRIORITY',
      resolvedEvidence,
      discardedEvidence,
      confidenceScore: Math.min(scoredEvidence[0].finalScore * 100, 90),
      reasoning: this.generateTemporalDiscrepancyReasoning(scoredEvidence, cutoff),
      resolvedAt: new Date()
    };
  }

  /**
   * Resolve conflicts from different methodologies
   */
  private async resolveMethodologyDifference(
    conflict: EvidenceConflict,
    weights: CredibilityWeights
  ): Promise<ConflictResolution> {
    // Group evidence by methodology indicators
    const methodologyGroups = this.groupEvidenceByMethodology(conflict.conflictingEvidence);
    
    // Score each group by aggregate credibility
    const groupScores = Object.entries(methodologyGroups).map(([methodology, evidence]) => {
      const avgScore = evidence.reduce((sum, ev) => 
        sum + this.calculateCredibilityScore(ev, weights), 0) / evidence.length;
      
      return {
        methodology,
        evidence,
        avgScore,
        count: evidence.length
      };
    });

    // Prefer methodologies with higher average credibility and more sources
    groupScores.sort((a, b) => {
      const scoreA = a.avgScore * (1 + Math.log(a.count) * 0.1);
      const scoreB = b.avgScore * (1 + Math.log(b.count) * 0.1);
      return scoreB - scoreA;
    });

    const resolvedEvidence = groupScores[0].evidence;
    const discardedEvidence = groupScores.slice(1).flatMap(group => group.evidence);

    return {
      conflictId: `methodology-difference-${Date.now()}`,
      resolutionMethod: 'SOURCE_AUTHORITY',
      resolvedEvidence,
      discardedEvidence,
      confidenceScore: Math.min(groupScores[0].avgScore * 100, 85),
      reasoning: this.generateMethodologyDifferenceReasoning(groupScores),
      resolvedAt: new Date()
    };
  }

  /**
   * Resolve conflicts from interpretation differences
   */
  private async resolveInterpretationVariance(
    conflict: EvidenceConflict,
    weights: CredibilityWeights
  ): Promise<ConflictResolution> {
    // For interpretation variance, we typically keep all evidence but flag uncertainty
    const evidenceScores = conflict.conflictingEvidence.map(evidence => ({
      evidence,
      score: this.calculateCredibilityScore(evidence, weights)
    }));

    // Sort by score but keep all evidence
    evidenceScores.sort((a, b) => b.score - a.score);

    return {
      conflictId: `interpretation-variance-${Date.now()}`,
      resolutionMethod: 'AGENT_CONSENSUS',
      resolvedEvidence: evidenceScores.map(item => item.evidence),
      discardedEvidence: [],
      confidenceScore: Math.max(40, Math.min(evidenceScores[0].score * 80, 75)), // Lower confidence for interpretation variance
      reasoning: this.generateInterpretationVarianceReasoning(evidenceScores),
      resolvedAt: new Date()
    };
  }

  /**
   * Calculate credibility score for evidence
   */
  private calculateCredibilityScore(evidence: SourceEvidence, weights: CredibilityWeights): number {
    let score = evidence.credibilityScore / 100; // Normalize to 0-1

    // Apply source type weight
    switch (evidence.sourceType) {
      case 'ACADEMIC':
        score *= weights.academicSources;
        break;
      case 'GOVERNMENT':
        score *= weights.governmentSources;
        break;
      case 'NEWS':
        score *= weights.newsSources;
        break;
      case 'FINANCIAL':
        score *= weights.financialSources;
        break;
      case 'SOCIAL':
        score *= weights.socialSources;
        break;
    }

    // Apply SAFLA validation weight
    if (evidence.saflaValidated) {
      score *= weights.sourceVerification;
    } else {
      score *= 0.8; // Penalty for non-validated sources
    }

    // Apply recency weight
    if (evidence.publishDate) {
      const age = Date.now() - new Date(evidence.publishDate).getTime();
      const ageInDays = age / (1000 * 60 * 60 * 24);
      const recencyMultiplier = Math.max(0.5, 1 - (ageInDays / 365) * 0.3); // Gradual decrease over a year
      score *= (1 + recencyMultiplier * weights.recentness * 0.2);
    }

    // Apply relevance score
    score *= (evidence.relevanceScore / 100);

    return Math.min(score, 1); // Cap at 1.0
  }

  /**
   * Group evidence by methodology indicators
   */
  private groupEvidenceByMethodology(evidence: SourceEvidence[]): Record<string, SourceEvidence[]> {
    const groups: Record<string, SourceEvidence[]> = {};

    for (const ev of evidence) {
      let methodology = 'general';

      // Detect methodology from content keywords
      const content = ev.content.toLowerCase();
      
      if (content.includes('study') || content.includes('research') || content.includes('analysis')) {
        methodology = 'research';
      } else if (content.includes('survey') || content.includes('poll')) {
        methodology = 'survey';
      } else if (content.includes('data') || content.includes('statistics')) {
        methodology = 'statistical';
      } else if (content.includes('expert') || content.includes('opinion')) {
        methodology = 'expert_opinion';
      } else if (content.includes('report') || content.includes('investigation')) {
        methodology = 'investigative';
      }

      if (!groups[methodology]) {
        groups[methodology] = [];
      }
      groups[methodology].push(ev);
    }

    return groups;
  }

  /**
   * Create manual review resolution for complex conflicts
   */
  private createManualReviewResolution(conflict: EvidenceConflict): ConflictResolution {
    return {
      conflictId: `manual-review-${Date.now()}`,
      resolutionMethod: 'MANUAL_REVIEW',
      resolvedEvidence: conflict.conflictingEvidence,
      discardedEvidence: [],
      confidenceScore: 30, // Low confidence for manual review cases
      reasoning: `Complex ${conflict.conflictType.toLowerCase().replace('_', ' ')} requires manual expert review. All evidence preserved for human analysis.`,
      resolvedAt: new Date()
    };
  }

  /**
   * Generate reasoning for source disagreement resolution
   */
  private generateSourceDisagreementReasoning(
    evidenceScores: Array<{evidence: SourceEvidence, score: number}>,
    threshold: number
  ): string {
    const resolved = evidenceScores.filter(item => item.score >= threshold);
    const discarded = evidenceScores.filter(item => item.score < threshold);

    const reasoning = `Resolved source disagreement using credibility weighting. ` +
      `Selected ${resolved.length} high-credibility sources (score ≥ ${(threshold * 100).toFixed(1)}) ` +
      `and discarded ${discarded.length} lower-credibility sources. ` +
      `Primary sources: ${resolved.slice(0, 2).map(item => item.evidence.sourceType).join(', ')}.`;

    return reasoning;
  }

  /**
   * Generate reasoning for temporal discrepancy resolution
   */
  private generateTemporalDiscrepancyReasoning(
    scoredEvidence: Array<{evidence: SourceEvidence, date: Date, finalScore: number}>,
    cutoff: number
  ): string {
    const resolved = scoredEvidence.slice(0, cutoff);
    const dateRange = resolved.length > 1 ? 
      ` spanning ${resolved[resolved.length - 1].date.getFullYear()} to ${resolved[0].date.getFullYear()}` : 
      ` from ${resolved[0].date.getFullYear()}`;

    return `Resolved temporal discrepancy by prioritizing recent, credible sources. ` +
      `Selected ${cutoff} sources${dateRange} with weighted recency and credibility scores. ` +
      `Most recent source: ${resolved[0].date.toLocaleDateString()}.`;
  }

  /**
   * Generate reasoning for methodology difference resolution
   */
  private generateMethodologyDifferenceReasoning(
    groupScores: Array<{methodology: string, evidence: SourceEvidence[], avgScore: number, count: number}>
  ): string {
    const selected = groupScores[0];
    
    return `Resolved methodology differences by selecting ${selected.methodology} approach ` +
      `with highest credibility (${(selected.avgScore * 100).toFixed(1)}% avg) from ${selected.count} sources. ` +
      `Alternative methodologies: ${groupScores.slice(1).map(g => g.methodology).join(', ')}.`;
  }

  /**
   * Generate reasoning for interpretation variance resolution
   */
  private generateInterpretationVarianceReasoning(
    evidenceScores: Array<{evidence: SourceEvidence, score: number}>
  ): string {
    return `Interpretation variance detected across ${evidenceScores.length} sources. ` +
      `All evidence preserved to maintain nuanced perspectives. ` +
      `Highest credibility source: ${(evidenceScores[0].score * 100).toFixed(1)}%. ` +
      `Requires careful consideration of multiple viewpoints in final determination.`;
  }

  /**
   * Get conflict resolution statistics
   */
  getResolutionStatistics(resolutions: ConflictResolution[]): {
    totalConflicts: number;
    resolutionMethods: Record<string, number>;
    avgConfidenceScore: number;
    manualReviewRate: number;
  } {
    const methodCounts = resolutions.reduce((acc, res) => {
      acc[res.resolutionMethod] = (acc[res.resolutionMethod] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgConfidence = resolutions.reduce((sum, res) => sum + res.confidenceScore, 0) / resolutions.length;
    const manualReviews = resolutions.filter(res => res.resolutionMethod === 'MANUAL_REVIEW').length;

    return {
      totalConflicts: resolutions.length,
      resolutionMethods: methodCounts,
      avgConfidenceScore: avgConfidence,
      manualReviewRate: manualReviews / resolutions.length
    };
  }
}

// Export singleton instance
export const conflictResolver = new ConflictResolver();