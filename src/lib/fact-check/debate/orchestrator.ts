/**
 * Debate Orchestrator
 * Phase 3 - Debate System Engineer
 * 
 * Manages multi-agent fact-checking sessions and coordinates debate rounds
 */

import { 
  AgentType, 
  ExtractedClaim, 
  Investigation, 
  DebateRound, 
  DebateArgument, 
  EvidenceConflict, 
  ConsensusResult,
  ConsensusMethod,
  VeracityLevel,
  SourceEvidence,
  FactCheckSession
} from '../../../types/fact-check';

export interface DebateConfig {
  maxRounds: number;
  consensusThreshold: number; // 0.5 = majority, 0.8 = supermajority
  timeoutPerRound: number; // milliseconds
  minimumEvidence: number;
  allowPartialConsensus: boolean;
}

export interface DebateSession {
  sessionId: string;
  claimId: string;
  config: DebateConfig;
  currentRound: number;
  participatingAgents: AgentType[];
  rounds: DebateRound[];
  finalConsensus?: ConsensusResult;
  status: 'INITIALIZING' | 'DEBATING' | 'CONSENSUS_REACHED' | 'TIMEOUT' | 'FAILED';
  startTime: number;
  endTime?: number;
}

export class DebateOrchestrator {
  private activeSessions: Map<string, DebateSession> = new Map();
  private defaultConfig: DebateConfig = {
    maxRounds: 3,
    consensusThreshold: 0.6, // 60% agreement
    timeoutPerRound: 120000, // 2 minutes
    minimumEvidence: 2,
    allowPartialConsensus: true
  };

  /**
   * Initialize a new debate session for a claim
   */
  async initializeDebate(
    sessionId: string,
    claim: ExtractedClaim,
    investigations: Investigation[],
    config?: Partial<DebateConfig>
  ): Promise<DebateSession> {
    const debateConfig = { ...this.defaultConfig, ...config };
    
    // Determine participating agents based on available investigations
    const participatingAgents = investigations
      .filter(inv => inv.claimId === claim.id)
      .map(inv => inv.agentType);

    if (participatingAgents.length < 2) {
      throw new Error('Insufficient agents for debate - minimum 2 required');
    }

    const debateSession: DebateSession = {
      sessionId: `debate-${claim.id}-${Date.now()}`,
      claimId: claim.id,
      config: debateConfig,
      currentRound: 0,
      participatingAgents,
      rounds: [],
      status: 'INITIALIZING',
      startTime: Date.now()
    };

    this.activeSessions.set(debateSession.sessionId, debateSession);

    // Start first debate round
    await this.startDebateRound(debateSession, investigations);

    return debateSession;
  }

  /**
   * Start a new debate round
   */
  private async startDebateRound(
    session: DebateSession,
    investigations: Investigation[]
  ): Promise<void> {
    session.currentRound++;
    session.status = 'DEBATING';

    const round: DebateRound = {
      id: `round-${session.sessionId}-${session.currentRound}`,
      claimId: session.claimId,
      roundNumber: session.currentRound,
      participatingAgents: session.participatingAgents,
      arguments: [],
      evidenceConflicts: [],
      createdAt: new Date()
    };

    // Generate arguments from each agent's investigation
    for (const agentType of session.participatingAgents) {
      const investigation = investigations.find(
        inv => inv.agentType === agentType && inv.claimId === session.claimId
      );

      if (investigation) {
        const argument = this.generateDebateArgument(investigation);
        round.arguments.push(argument);
      }
    }

    // Detect evidence conflicts
    round.evidenceConflicts = await this.detectEvidenceConflicts(round.arguments);

    // Calculate interim consensus
    round.interimConsensus = await this.calculateInterimConsensus(round.arguments);

    session.rounds.push(round);
    this.activeSessions.set(session.sessionId, session);

    // Check if consensus reached or max rounds exceeded
    if (this.isConsensusReached(round.interimConsensus, session.config) || 
        session.currentRound >= session.config.maxRounds) {
      await this.finalizeDebate(session);
    }
  }

  /**
   * Generate debate argument from agent investigation
   */
  private generateDebateArgument(investigation: Investigation): DebateArgument {
    // Map investigation conclusion to debate position
    let position: 'SUPPORTS' | 'REFUTES' | 'NEUTRAL';
    
    switch (investigation.conclusion) {
      case 'VERIFIED_TRUE':
        position = 'SUPPORTS';
        break;
      case 'VERIFIED_FALSE':
      case 'MISLEADING':
        position = 'REFUTES';
        break;
      default:
        position = 'NEUTRAL';
    }

    return {
      agentType: investigation.agentType,
      position,
      evidence: investigation.evidenceFound,
      reasoning: investigation.reasoning,
      confidenceLevel: investigation.confidenceScore,
      counterArguments: [] // To be populated in future rounds
    };
  }

  /**
   * Detect conflicts between evidence sources
   */
  private async detectEvidenceConflicts(arguments: DebateArgument[]): Promise<EvidenceConflict[]> {
    const conflicts: EvidenceConflict[] = [];
    
    // Compare evidence across different agent positions
    const supportingArgs = arguments.filter(arg => arg.position === 'SUPPORTS');
    const refutingArgs = arguments.filter(arg => arg.position === 'REFUTES');

    // Check for direct source disagreements
    for (const supportArg of supportingArgs) {
      for (const refuteArg of refutingArgs) {
        const conflictingEvidence = this.findConflictingEvidence(
          supportArg.evidence,
          refuteArg.evidence
        );

        if (conflictingEvidence.length > 0) {
          conflicts.push({
            conflictType: 'SOURCE_DISAGREEMENT',
            agentsInvolved: [supportArg.agentType, refuteArg.agentType],
            conflictingEvidence,
            resolutionStrategy: 'CREDIBILITY_WEIGHTED_ANALYSIS',
            resolved: false
          });
        }
      }
    }

    // Check for temporal discrepancies
    const temporalConflicts = this.detectTemporalConflicts(arguments);
    conflicts.push(...temporalConflicts);

    return conflicts;
  }

  /**
   * Find conflicting evidence between two sets
   */
  private findConflictingEvidence(
    evidence1: SourceEvidence[],
    evidence2: SourceEvidence[]
  ): SourceEvidence[] {
    const conflicting: SourceEvidence[] = [];

    for (const ev1 of evidence1) {
      for (const ev2 of evidence2) {
        // Same source but different conclusions
        if (ev1.url === ev2.url && ev1.content !== ev2.content) {
          conflicting.push(ev1, ev2);
        }
        
        // Similar sources with contradictory content
        if (this.areSourcesSimilar(ev1, ev2) && this.areContentsContradictory(ev1.content, ev2.content)) {
          conflicting.push(ev1, ev2);
        }
      }
    }

    return conflicting;
  }

  /**
   * Check if two sources are similar (same domain, similar topics)
   */
  private areSourcesSimilar(source1: SourceEvidence, source2: SourceEvidence): boolean {
    try {
      const url1 = new URL(source1.url);
      const url2 = new URL(source2.url);
      
      // Same domain
      if (url1.hostname === url2.hostname) return true;
      
      // Similar source types
      if (source1.sourceType === source2.sourceType) return true;
      
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if content appears contradictory
   */
  private areContentsContradictory(content1: string, content2: string): boolean {
    // Simple keyword-based contradiction detection
    const contradictoryPairs = [
      ['true', 'false'],
      ['correct', 'incorrect'],
      ['accurate', 'inaccurate'],
      ['confirmed', 'denied'],
      ['supports', 'contradicts'],
      ['increase', 'decrease'],
      ['rise', 'fall'],
      ['higher', 'lower']
    ];

    const content1Lower = content1.toLowerCase();
    const content2Lower = content2.toLowerCase();

    for (const [word1, word2] of contradictoryPairs) {
      if (content1Lower.includes(word1) && content2Lower.includes(word2)) {
        return true;
      }
      if (content1Lower.includes(word2) && content2Lower.includes(word1)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect temporal conflicts in evidence
   */
  private detectTemporalConflicts(arguments: DebateArgument[]): EvidenceConflict[] {
    const conflicts: EvidenceConflict[] = [];
    
    // Group evidence by time periods
    const timeGroups = new Map<string, { evidence: SourceEvidence[], agents: AgentType[] }>();
    
    for (const arg of arguments) {
      for (const evidence of arg.evidence) {
        if (evidence.publishDate) {
          const timeKey = this.getTimeGroupKey(evidence.publishDate);
          if (!timeGroups.has(timeKey)) {
            timeGroups.set(timeKey, { evidence: [], agents: [] });
          }
          timeGroups.get(timeKey)!.evidence.push(evidence);
          if (!timeGroups.get(timeKey)!.agents.includes(arg.agentType)) {
            timeGroups.get(timeKey)!.agents.push(arg.agentType);
          }
        }
      }
    }

    // Check for temporal inconsistencies
    for (const [timeKey, group] of timeGroups) {
      if (group.evidence.length > 1 && group.agents.length > 1) {
        const contradictory = group.evidence.filter((ev, i) => 
          group.evidence.slice(i + 1).some(other => 
            this.areContentsContradictory(ev.content, other.content)
          )
        );

        if (contradictory.length > 0) {
          conflicts.push({
            conflictType: 'TEMPORAL_DISCREPANCY',
            agentsInvolved: group.agents,
            conflictingEvidence: contradictory,
            resolutionStrategy: 'LATEST_SOURCE_PRIORITY',
            resolved: false
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Group evidence by time periods for temporal analysis
   */
  private getTimeGroupKey(publishDate: string): string {
    const date = new Date(publishDate);
    return `${date.getFullYear()}-${Math.floor(date.getMonth() / 3)}`; // Quarterly grouping
  }

  /**
   * Calculate interim consensus from current round arguments
   */
  private async calculateInterimConsensus(arguments: DebateArgument[]): Promise<ConsensusResult> {
    const supportingVotes = arguments.filter(arg => arg.position === 'SUPPORTS');
    const refutingVotes = arguments.filter(arg => arg.position === 'REFUTES');
    const neutralVotes = arguments.filter(arg => arg.position === 'NEUTRAL');

    // Calculate weighted scores
    const supportScore = supportingVotes.reduce((sum, arg) => sum + arg.confidenceLevel, 0);
    const refuteScore = refutingVotes.reduce((sum, arg) => sum + arg.confidenceLevel, 0);
    const neutralScore = neutralVotes.reduce((sum, arg) => sum + arg.confidenceLevel, 0);

    const totalScore = supportScore + refuteScore + neutralScore;
    
    let finalVeracity: VeracityLevel;
    let consensusMethod: ConsensusMethod;
    let agreementLevel: number;

    if (totalScore === 0) {
      finalVeracity = 'INSUFFICIENT_EVIDENCE';
      consensusMethod = 'MAJORITY';
      agreementLevel = 0;
    } else {
      const supportRatio = supportScore / totalScore;
      const refuteRatio = refuteScore / totalScore;
      const neutralRatio = neutralScore / totalScore;

      // Determine consensus method based on agreement distribution
      if (Math.max(supportRatio, refuteRatio, neutralRatio) > 0.8) {
        consensusMethod = 'UNANIMOUS';
        agreementLevel = Math.max(supportRatio, refuteRatio, neutralRatio) * 100;
      } else if (Math.max(supportRatio, refuteRatio) > 0.6) {
        consensusMethod = 'MAJORITY';
        agreementLevel = Math.max(supportRatio, refuteRatio) * 100;
      } else {
        consensusMethod = 'WEIGHTED_VOTE';
        agreementLevel = 50; // Balanced disagreement
      }

      // Determine final veracity
      if (supportRatio > 0.6) {
        finalVeracity = 'VERIFIED_TRUE';
      } else if (refuteRatio > 0.6) {
        finalVeracity = 'VERIFIED_FALSE';
      } else if (supportRatio > refuteRatio && supportRatio > 0.4) {
        finalVeracity = 'PARTIALLY_TRUE';
      } else if (refuteRatio > supportRatio && refuteRatio > 0.4) {
        finalVeracity = 'MISLEADING';
      } else {
        finalVeracity = 'INSUFFICIENT_EVIDENCE';
      }
    }

    return {
      id: `consensus-${Date.now()}`,
      claimId: arguments[0]?.evidence[0]?.url || 'unknown',
      finalVeracity,
      confidenceScore: agreementLevel,
      consensusMethod,
      supportingEvidence: arguments.flatMap(arg => arg.evidence),
      reasoningSummary: this.generateReasoningSummary(arguments, finalVeracity),
      participatingAgents: arguments.map(arg => arg.agentType),
      agreementLevel,
      minorityOpinions: this.extractMinorityOpinions(arguments, finalVeracity),
      createdAt: new Date()
    };
  }

  /**
   * Generate reasoning summary for consensus
   */
  private generateReasoningSummary(arguments: DebateArgument[], veracity: VeracityLevel): string {
    const agentCount = arguments.length;
    const supportCount = arguments.filter(arg => arg.position === 'SUPPORTS').length;
    const refuteCount = arguments.filter(arg => arg.position === 'REFUTES').length;
    const neutralCount = arguments.filter(arg => arg.position === 'NEUTRAL').length;

    let summary = `Analysis by ${agentCount} specialized agents: `;
    
    if (supportCount > refuteCount) {
      summary += `${supportCount} agents found supporting evidence, ${refuteCount} found contradictory evidence`;
    } else if (refuteCount > supportCount) {
      summary += `${refuteCount} agents found contradictory evidence, ${supportCount} found supporting evidence`;
    } else {
      summary += `Equal division of evidence (${supportCount} supporting, ${refuteCount} contradictory)`;
    }

    if (neutralCount > 0) {
      summary += `, ${neutralCount} found insufficient evidence for determination`;
    }

    summary += `. Consensus reached through ${veracity === 'VERIFIED_TRUE' || veracity === 'VERIFIED_FALSE' ? 'strong evidence correlation' : 'balanced evidence evaluation'}.`;

    return summary;
  }

  /**
   * Extract minority opinions from debate
   */
  private extractMinorityOpinions(arguments: DebateArgument[], majorityVeracity: VeracityLevel): DebateArgument[] {
    const majorityPosition = majorityVeracity === 'VERIFIED_TRUE' ? 'SUPPORTS' : 
                           majorityVeracity === 'VERIFIED_FALSE' ? 'REFUTES' : 'NEUTRAL';
    
    return arguments.filter(arg => arg.position !== majorityPosition);
  }

  /**
   * Check if consensus has been reached
   */
  private isConsensusReached(consensus: ConsensusResult, config: DebateConfig): boolean {
    return consensus.agreementLevel >= (config.consensusThreshold * 100);
  }

  /**
   * Finalize debate and generate final consensus
   */
  private async finalizeDebate(session: DebateSession): Promise<void> {
    session.status = 'CONSENSUS_REACHED';
    session.endTime = Date.now();

    // Use the most recent round's consensus as final
    const lastRound = session.rounds[session.rounds.length - 1];
    if (lastRound?.interimConsensus) {
      session.finalConsensus = {
        ...lastRound.interimConsensus,
        id: `final-consensus-${session.sessionId}`
      };
    }

    this.activeSessions.set(session.sessionId, session);
  }

  /**
   * Get active debate session
   */
  getDebateSession(sessionId: string): DebateSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): DebateSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Force timeout a session
   */
  async timeoutSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'TIMEOUT';
      session.endTime = Date.now();
      this.activeSessions.set(sessionId, session);
    }
  }

  /**
   * Clean up completed sessions
   */
  cleanupCompletedSessions(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [sessionId, session] of this.activeSessions) {
      if (session.endTime && session.endTime < cutoffTime) {
        this.activeSessions.delete(sessionId);
      }
    }
  }
}

// Export singleton instance
export const debateOrchestrator = new DebateOrchestrator();