/**
 * Consensus Calculator
 * Phase 3 - Debate System Engineer
 * 
 * Democratic voting mechanisms and final veracity determination
 */

import { 
  ConsensusResult, 
  ConsensusMethod, 
  VeracityLevel, 
  DebateArgument, 
  AgentType, 
  SourceEvidence 
} from '../../../types/fact-check';

export interface VotingWeights {
  agentExpertise: Record<AgentType, number>;
  evidenceQuality: number;
  sourceCredibility: number;
  consensusThreshold: number;
  confidenceThreshold: number;
}

export interface VotingResult {
  veracity: VeracityLevel;
  confidenceScore: number;
  agreementLevel: number;
  participatingAgents: AgentType[];
  winningVotes: DebateArgument[];
  minorityVotes: DebateArgument[];
  abstentions: DebateArgument[];
}

export interface ConsensusMetrics {
  totalVotes: number;
  unanimousDecisions: number;
  majorityDecisions: number;
  weightedDecisions: number;
  expertOverrides: number;
  averageConfidence: number;
  consensusRate: number;
}

export class ConsensusCalculator {
  private defaultWeights: VotingWeights = {
    agentExpertise: {
      'ACADEMIC': 1.0,
      'GOVERNMENT': 0.9,
      'FINANCIAL': 0.8,
      'NEWS': 0.7,
      'SOCIAL': 0.5
    },
    evidenceQuality: 0.8,
    sourceCredibility: 0.9,
    consensusThreshold: 0.6, // 60% agreement required
    confidenceThreshold: 0.7 // 70% confidence required
  };

  /**
   * Calculate consensus from debate arguments
   */
  async calculateConsensus(
    claimId: string,
    debateArguments: DebateArgument[],
    weights?: Partial<VotingWeights>
  ): Promise<ConsensusResult> {
    const votingWeights = { ...this.defaultWeights, ...weights };
    
    if (debateArguments.length === 0) {
      return this.createInsufficientEvidenceResult(claimId);
    }

    // Try different consensus methods in order of preference
    const consensusMethods: Array<{
      method: ConsensusMethod;
      calculator: (args: DebateArgument[], weights: VotingWeights) => VotingResult | null;
    }> = [
      { method: 'UNANIMOUS', calculator: this.calculateUnanimousConsensus.bind(this) },
      { method: 'MAJORITY', calculator: this.calculateMajorityConsensus.bind(this) },
      { method: 'WEIGHTED_VOTE', calculator: this.calculateWeightedConsensus.bind(this) },
      { method: 'EXPERT_OVERRIDE', calculator: this.calculateExpertOverride.bind(this) }
    ];

    for (const { method, calculator } of consensusMethods) {
      const result = calculator(debateArguments, votingWeights);
      if (result && this.isValidConsensus(result, votingWeights)) {
        return this.buildConsensusResult(claimId, result, method, debateArguments);
      }
    }

    // If no consensus reached, return insufficient evidence
    return this.createInsufficientEvidenceResult(claimId, debateArguments);
  }

  /**
   * Calculate unanimous consensus (all agents agree)
   */
  private calculateUnanimousConsensus(
    debateArguments: DebateArgument[],
    weights: VotingWeights
  ): VotingResult | null {
    if (debateArguments.length < 2) return null;

    const positions = debateArguments.map(arg => arg.position);
    const uniquePositions = [...new Set(positions)];

    // Must have unanimous agreement (excluding neutrals)
    const nonNeutralPositions = positions.filter(pos => pos !== 'NEUTRAL');
    const nonNeutralUnique = [...new Set(nonNeutralPositions)];

    if (nonNeutralUnique.length !== 1) return null;

    const winningPosition = nonNeutralUnique[0];
    const winningVotes = debateArguments.filter(arg => arg.position === winningPosition);
    const abstentions = debateArguments.filter(arg => arg.position === 'NEUTRAL');

    // Calculate confidence as average of winning votes
    const avgConfidence = winningVotes.reduce((sum, arg) => sum + arg.confidenceLevel, 0) / winningVotes.length;

    return {
      veracity: this.positionToVeracity(winningPosition),
      confidenceScore: avgConfidence,
      agreementLevel: 100, // Perfect agreement
      participatingAgents: debateArguments.map(arg => arg.agentType),
      winningVotes,
      minorityVotes: [],
      abstentions
    };
  }

  /**
   * Calculate majority consensus (>50% agreement)
   */
  private calculateMajorityConsensus(
    debateArguments: DebateArgument[],
    weights: VotingWeights
  ): VotingResult | null {
    if (debateArguments.length < 3) return null; // Need at least 3 for meaningful majority

    const positionCounts = this.countPositions(debateArguments);
    const totalVotes = debateArguments.filter(arg => arg.position !== 'NEUTRAL').length;
    
    if (totalVotes === 0) return null;

    // Find majority position
    let majorityPosition: 'SUPPORTS' | 'REFUTES' | null = null;
    let maxCount = 0;

    for (const [position, count] of Object.entries(positionCounts)) {
      if (position !== 'NEUTRAL' && count > maxCount && count > totalVotes / 2) {
        majorityPosition = position as 'SUPPORTS' | 'REFUTES';
        maxCount = count;
      }
    }

    if (!majorityPosition) return null;

    const winningVotes = debateArguments.filter(arg => arg.position === majorityPosition);
    const minorityVotes = debateArguments.filter(arg => arg.position !== majorityPosition && arg.position !== 'NEUTRAL');
    const abstentions = debateArguments.filter(arg => arg.position === 'NEUTRAL');

    const avgConfidence = winningVotes.reduce((sum, arg) => sum + arg.confidenceLevel, 0) / winningVotes.length;
    const agreementLevel = (maxCount / totalVotes) * 100;

    return {
      veracity: this.positionToVeracity(majorityPosition),
      confidenceScore: avgConfidence,
      agreementLevel,
      participatingAgents: debateArguments.map(arg => arg.agentType),
      winningVotes,
      minorityVotes,
      abstentions
    };
  }

  /**
   * Calculate weighted consensus based on agent expertise and evidence quality
   */
  private calculateWeightedConsensus(
    debateArguments: DebateArgument[],
    weights: VotingWeights
  ): VotingResult | null {
    if (debateArguments.length < 2) return null;

    const weightedVotes = debateArguments.map(arg => {
      const agentWeight = weights.agentExpertise[arg.agentType] || 0.5;
      const evidenceWeight = this.calculateEvidenceWeight(arg.evidence, weights);
      const confidenceWeight = arg.confidenceLevel / 100;
      
      const totalWeight = agentWeight * evidenceWeight * confidenceWeight;
      
      return {
        argument: arg,
        weight: totalWeight
      };
    });

    // Group by position and sum weights
    const positionWeights = {
      SUPPORTS: 0,
      REFUTES: 0,
      NEUTRAL: 0
    };

    for (const vote of weightedVotes) {
      positionWeights[vote.argument.position] += vote.weight;
    }

    const totalWeight = Object.values(positionWeights).reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) return null;

    // Find winning position
    const winningEntry = Object.entries(positionWeights)
      .filter(([pos]) => pos !== 'NEUTRAL')
      .reduce((max, [pos, weight]) => weight > max[1] ? [pos, weight] : max, ['', 0]);

    const [winningPosition, winningWeight] = winningEntry;
    const agreementLevel = (winningWeight / totalWeight) * 100;

    // Check if weight threshold met
    if (agreementLevel < weights.consensusThreshold * 100) return null;

    const winningVotes = debateArguments.filter(arg => arg.position === winningPosition);
    const minorityVotes = debateArguments.filter(arg => arg.position !== winningPosition && arg.position !== 'NEUTRAL');
    const abstentions = debateArguments.filter(arg => arg.position === 'NEUTRAL');

    // Weighted average confidence
    const winningWeightedVotes = weightedVotes.filter(wv => wv.argument.position === winningPosition);
    const weightSum = winningWeightedVotes.reduce((sum, wv) => sum + wv.weight, 0);
    const weightedConfidence = winningWeightedVotes.reduce((sum, wv) => 
      sum + (wv.argument.confidenceLevel * wv.weight), 0) / weightSum;

    return {
      veracity: this.positionToVeracity(winningPosition as 'SUPPORTS' | 'REFUTES'),
      confidenceScore: weightedConfidence,
      agreementLevel,
      participatingAgents: debateArguments.map(arg => arg.agentType),
      winningVotes,
      minorityVotes,
      abstentions
    };
  }

  /**
   * Calculate expert override (highest expertise agent decides)
   */
  private calculateExpertOverride(
    debateArguments: DebateArgument[],
    weights: VotingWeights
  ): VotingResult | null {
    if (debateArguments.length === 0) return null;

    // Find highest expertise agent
    const expertArgument = debateArguments.reduce((max, arg) => {
      const currentExpertise = weights.agentExpertise[arg.agentType] || 0;
      const maxExpertise = weights.agentExpertise[max.agentType] || 0;
      
      return currentExpertise > maxExpertise ? arg : max;
    });

    if (expertArgument.position === 'NEUTRAL') return null;

    const winningVotes = [expertArgument];
    const minorityVotes = debateArguments.filter(arg => 
      arg.agentType !== expertArgument.agentType && arg.position !== 'NEUTRAL'
    );
    const abstentions = debateArguments.filter(arg => arg.position === 'NEUTRAL');

    return {
      veracity: this.positionToVeracity(expertArgument.position),
      confidenceScore: expertArgument.confidenceLevel,
      agreementLevel: 100, // Expert decision is final
      participatingAgents: debateArguments.map(arg => arg.agentType),
      winningVotes,
      minorityVotes,
      abstentions
    };
  }

  /**
   * Calculate evidence quality weight
   */
  private calculateEvidenceWeight(evidence: SourceEvidence[], weights: VotingWeights): number {
    if (evidence.length === 0) return 0.1; // Minimal weight for no evidence

    const avgCredibility = evidence.reduce((sum, ev) => sum + ev.credibilityScore, 0) / evidence.length;
    const avgRelevance = evidence.reduce((sum, ev) => sum + ev.relevanceScore, 0) / evidence.length;
    const saflaValidatedRatio = evidence.filter(ev => ev.saflaValidated).length / evidence.length;

    const qualityScore = (
      (avgCredibility / 100) * 0.4 +
      (avgRelevance / 100) * 0.3 +
      saflaValidatedRatio * 0.3
    );

    return Math.max(0.1, Math.min(1.0, qualityScore));
  }

  /**
   * Count positions from arguments
   */
  private countPositions(debateArguments: DebateArgument[]): Record<string, number> {
    return debateArguments.reduce((counts, arg) => {
      counts[arg.position] = (counts[arg.position] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  /**
   * Convert debate position to veracity level
   */
  private positionToVeracity(position: 'SUPPORTS' | 'REFUTES'): VeracityLevel {
    return position === 'SUPPORTS' ? 'VERIFIED_TRUE' : 'VERIFIED_FALSE';
  }

  /**
   * Check if consensus result is valid
   */
  private isValidConsensus(result: VotingResult, weights: VotingWeights): boolean {
    return result.confidenceScore >= weights.confidenceThreshold * 100 &&
           result.agreementLevel >= weights.consensusThreshold * 100;
  }

  /**
   * Build final consensus result
   */
  private buildConsensusResult(
    claimId: string,
    votingResult: VotingResult,
    method: ConsensusMethod,
    debateArguments: DebateArgument[]
  ): ConsensusResult {
    return {
      id: `consensus-${claimId}-${Date.now()}`,
      claimId,
      finalVeracity: votingResult.veracity,
      confidenceScore: votingResult.confidenceScore,
      consensusMethod: method,
      supportingEvidence: votingResult.winningVotes.flatMap(arg => arg.evidence),
      reasoningSummary: this.generateReasoningSummary(votingResult, method),
      participatingAgents: votingResult.participatingAgents,
      agreementLevel: votingResult.agreementLevel,
      minorityOpinions: votingResult.minorityVotes,
      createdAt: new Date()
    };
  }

  /**
   * Create insufficient evidence result
   */
  private createInsufficientEvidenceResult(
    claimId: string,
    debateArguments?: DebateArgument[]
  ): ConsensusResult {
    return {
      id: `insufficient-${claimId}-${Date.now()}`,
      claimId,
      finalVeracity: 'INSUFFICIENT_EVIDENCE',
      confidenceScore: 0,
      consensusMethod: 'MAJORITY',
      supportingEvidence: [],
      reasoningSummary: debateArguments ? 
        `Unable to reach consensus among ${debateArguments.length} agents. Insufficient evidence or conflicting assessments.` :
        'No evidence available for fact-checking assessment.',
      participatingAgents: debateArguments?.map(arg => arg.agentType) || [],
      agreementLevel: 0,
      minorityOpinions: debateArguments || [],
      createdAt: new Date()
    };
  }

  /**
   * Generate reasoning summary
   */
  private generateReasoningSummary(result: VotingResult, method: ConsensusMethod): string {
    const agentCount = result.participatingAgents.length;
    const winningCount = result.winningVotes.length;
    const minorityCount = result.minorityVotes.length;

    let summary = `${method.replace('_', ' ').toLowerCase()} consensus reached among ${agentCount} agents. `;
    
    switch (method) {
      case 'UNANIMOUS':
        summary += `All ${winningCount} agents agreed on ${result.veracity.toLowerCase()}.`;
        break;
      
      case 'MAJORITY':
        summary += `${winningCount} agents determined ${result.veracity.toLowerCase()}, ` +
                  `${minorityCount} agents disagreed. Agreement: ${result.agreementLevel.toFixed(1)}%.`;
        break;
      
      case 'WEIGHTED_VOTE':
        summary += `Weighted analysis considering agent expertise and evidence quality. ` +
                  `${winningCount} agents with higher credibility determined ${result.veracity.toLowerCase()}.`;
        break;
      
      case 'EXPERT_OVERRIDE':
        const expertAgent = result.winningVotes[0]?.agentType;
        summary += `Expert override by ${expertAgent} agent determined ${result.veracity.toLowerCase()}.`;
        break;
    }

    summary += ` Confidence: ${result.confidenceScore.toFixed(1)}%.`;

    return summary;
  }

  /**
   * Calculate consensus metrics for analysis
   */
  calculateMetrics(consensusResults: ConsensusResult[]): ConsensusMetrics {
    if (consensusResults.length === 0) {
      return {
        totalVotes: 0,
        unanimousDecisions: 0,
        majorityDecisions: 0,
        weightedDecisions: 0,
        expertOverrides: 0,
        averageConfidence: 0,
        consensusRate: 0
      };
    }

    const methodCounts = consensusResults.reduce((counts, result) => {
      counts[result.consensusMethod] = (counts[result.consensusMethod] || 0) + 1;
      return counts;
    }, {} as Record<ConsensusMethod, number>);

    const successfulConsensus = consensusResults.filter(
      result => result.finalVeracity !== 'INSUFFICIENT_EVIDENCE'
    );

    const avgConfidence = consensusResults.reduce(
      (sum, result) => sum + result.confidenceScore, 0
    ) / consensusResults.length;

    return {
      totalVotes: consensusResults.length,
      unanimousDecisions: methodCounts['UNANIMOUS'] || 0,
      majorityDecisions: methodCounts['MAJORITY'] || 0,
      weightedDecisions: methodCounts['WEIGHTED_VOTE'] || 0,
      expertOverrides: methodCounts['EXPERT_OVERRIDE'] || 0,
      averageConfidence: avgConfidence,
      consensusRate: successfulConsensus.length / consensusResults.length
    };
  }

  /**
   * Adjust voting weights based on performance
   */
  adjustWeights(
    currentWeights: VotingWeights,
    performance: ConsensusMetrics
  ): VotingWeights {
    const newWeights = { ...currentWeights };

    // Adjust consensus threshold based on success rate
    if (performance.consensusRate < 0.7) {
      newWeights.consensusThreshold = Math.max(0.5, newWeights.consensusThreshold - 0.05);
    } else if (performance.consensusRate > 0.9) {
      newWeights.consensusThreshold = Math.min(0.8, newWeights.consensusThreshold + 0.05);
    }

    // Adjust confidence threshold based on average confidence
    if (performance.averageConfidence < 60) {
      newWeights.confidenceThreshold = Math.max(0.6, newWeights.confidenceThreshold - 0.05);
    } else if (performance.averageConfidence > 85) {
      newWeights.confidenceThreshold = Math.min(0.8, newWeights.confidenceThreshold + 0.05);
    }

    return newWeights;
  }
}

// Export singleton instance
export const consensusCalculator = new ConsensusCalculator();