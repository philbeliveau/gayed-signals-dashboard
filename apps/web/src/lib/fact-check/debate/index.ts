/**
 * Debate System Main Coordinator
 * Phase 3 - Debate System Engineer
 * 
 * Main orchestration system that coordinates all debate components
 */

import { 
  ExtractedClaim, 
  Investigation, 
  FactCheckSession, 
  ConsensusResult,
  DebateRound,
  AgentType,
  VeracityLevel
} from '../../../types/fact-check';

import { debateOrchestrator, DebateConfig, DebateSession } from './orchestrator';
import { conflictResolver, ConflictResolution } from './conflict-resolver';
import { consensusCalculator, VotingWeights, ConsensusMetrics } from './consensus-calculator';
import { memoryCoordinator, DebateProgress } from './memory-coordinator';

export interface DebateSystemConfig {
  debateConfig?: Partial<DebateConfig>;
  votingWeights?: Partial<VotingWeights>;
  enableRealTimeUpdates?: boolean;
  maxConcurrentDebates?: number;
  performanceTracking?: boolean;
}

export interface DebateSystemMetrics {
  totalDebates: number;
  averageDebateTime: number;
  consensusRate: number;
  conflictResolutionRate: number;
  accuracyMetrics: ConsensusMetrics;
  performanceBreakdown: {
    debatePhase: number;
    conflictResolution: number;
    consensusCalculation: number;
    memoryCoordination: number;
  };
}

export interface DebateResult {
  sessionId: string;
  claimId: string;
  finalConsensus: ConsensusResult;
  debateRounds: DebateRound[];
  conflictResolutions: ConflictResolution[];
  processingTime: number;
  participatingAgents: AgentType[];
  qualityMetrics: {
    evidenceQuality: number;
    argumentStrength: number;
    consensusConfidence: number;
    conflictResolutionSuccess: number;
  };
}

export class DebateSystemCoordinator {
  private config: DebateSystemConfig;
  private activeDebates: Map<string, DebateSession> = new Map();
  private systemMetrics: DebateSystemMetrics;
  private performanceLog: Array<{
    operation: string;
    duration: number;
    timestamp: number;
    success: boolean;
  }> = [];

  constructor(config: DebateSystemConfig = {}) {
    this.config = {
      enableRealTimeUpdates: true,
      maxConcurrentDebates: 10,
      performanceTracking: true,
      ...config
    };

    this.systemMetrics = {
      totalDebates: 0,
      averageDebateTime: 0,
      consensusRate: 0,
      conflictResolutionRate: 0,
      accuracyMetrics: {
        totalVotes: 0,
        unanimousDecisions: 0,
        majorityDecisions: 0,
        weightedDecisions: 0,
        expertOverrides: 0,
        averageConfidence: 0,
        consensusRate: 0
      },
      performanceBreakdown: {
        debatePhase: 0,
        conflictResolution: 0,
        consensusCalculation: 0,
        memoryCoordination: 0
      }
    };
  }

  /**
   * Initialize fact-check session with debate capabilities
   */
  async initializeFactCheckSession(session: FactCheckSession): Promise<void> {
    const startTime = Date.now();

    try {
      // Initialize memory coordination
      await memoryCoordinator.initializeSession(session);

      // Set up real-time subscriptions if enabled
      if (this.config.enableRealTimeUpdates) {
        this.setupRealTimeUpdates(session.id);
      }

      this.logPerformance('session_initialization', startTime, true);
    } catch (error) {
      this.logPerformance('session_initialization', startTime, false);
      throw new Error(`Failed to initialize fact-check session: ${error}`);
    }
  }

  /**
   * Process a claim through the complete debate system
   */
  async processClaimDebate(
    claim: ExtractedClaim,
    investigations: Investigation[]
  ): Promise<DebateResult> {
    const startTime = Date.now();
    
    try {
      // Check concurrent debate limit
      if (this.activeDebates.size >= (this.config.maxConcurrentDebates || 10)) {
        throw new Error('Maximum concurrent debates reached');
      }

      // Store claim in memory
      await memoryCoordinator.storeClaim(claim);

      // Store investigations
      for (const investigation of investigations) {
        await memoryCoordinator.storeInvestigation(investigation);
      }

      // Initialize debate session
      const debateSession = await debateOrchestrator.initializeDebate(
        claim.sessionId,
        claim,
        investigations,
        this.config.debateConfig
      );

      this.activeDebates.set(debateSession.sessionId, debateSession);

      // Process debate rounds
      const debateResult = await this.runDebateProcess(debateSession, investigations);

      // Cleanup
      this.activeDebates.delete(debateSession.sessionId);

      // Update metrics
      this.updateSystemMetrics(debateResult);

      this.logPerformance('claim_debate_processing', startTime, true);
      return debateResult;

    } catch (error) {
      this.logPerformance('claim_debate_processing', startTime, false);
      throw new Error(`Failed to process claim debate: ${error}`);
    }
  }

  /**
   * Run the complete debate process
   */
  private async runDebateProcess(
    session: DebateSession,
    investigations: Investigation[]
  ): Promise<DebateResult> {
    const debateStartTime = Date.now();
    const conflictResolutions: ConflictResolution[] = [];

    // Wait for debate completion
    while (session.status === 'DEBATING') {
      // Check for timeout
      if (Date.now() - debateStartTime > (session.config.timeoutPerRound * session.config.maxRounds)) {
        await debateOrchestrator.timeoutSession(session.sessionId);
        break;
      }

      // Small delay to prevent tight loop
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refresh session status
      const updatedSession = debateOrchestrator.getDebateSession(session.sessionId);
      if (updatedSession) {
        session = updatedSession;
      }
    }

    // Process conflict resolutions for all rounds
    for (const round of session.rounds) {
      if (round.evidenceConflicts.length > 0) {
        const startTime = Date.now();
        
        try {
          const resolutions = await conflictResolver.resolveConflicts(
            round.evidenceConflicts,
            round.arguments.flatMap(arg => arg.evidence)
          );
          
          conflictResolutions.push(...resolutions);
          this.logPerformance('conflict_resolution', startTime, true);
        } catch (error) {
          this.logPerformance('conflict_resolution', startTime, false);
          console.error('Conflict resolution failed:', error);
        }
      }
    }

    // Calculate final consensus if not already done
    let finalConsensus = session.finalConsensus;
    if (!finalConsensus && session.rounds.length > 0) {
      const startTime = Date.now();
      
      try {
        const lastRound = session.rounds[session.rounds.length - 1];
        finalConsensus = await consensusCalculator.calculateConsensus(
          session.claimId,
          lastRound.arguments,
          this.config.votingWeights
        );
        
        this.logPerformance('consensus_calculation', startTime, true);
      } catch (error) {
        this.logPerformance('consensus_calculation', startTime, false);
        
        // Create fallback consensus
        finalConsensus = {
          id: `fallback-${session.claimId}-${Date.now()}`,
          claimId: session.claimId,
          finalVeracity: 'INSUFFICIENT_EVIDENCE',
          confidenceScore: 0,
          consensusMethod: 'MAJORITY',
          supportingEvidence: [],
          reasoningSummary: 'Debate process failed to reach consensus due to system error',
          participatingAgents: investigations.map(inv => inv.agentType),
          agreementLevel: 0,
          createdAt: new Date()
        };
      }
    }

    // Store final consensus
    if (finalConsensus) {
      await memoryCoordinator.storeConsensus(finalConsensus);
    }

    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(
      session.rounds,
      conflictResolutions,
      finalConsensus!
    );

    const result: DebateResult = {
      sessionId: session.sessionId,
      claimId: session.claimId,
      finalConsensus: finalConsensus!,
      debateRounds: session.rounds,
      conflictResolutions,
      processingTime: Date.now() - debateStartTime,
      participatingAgents: investigations.map(inv => inv.agentType),
      qualityMetrics
    };

    return result;
  }

  /**
   * Calculate debate quality metrics
   */
  private calculateQualityMetrics(
    rounds: DebateRound[],
    resolutions: ConflictResolution[],
    consensus: ConsensusResult
  ): DebateResult['qualityMetrics'] {
    const totalEvidence = rounds.flatMap(round => 
      round.arguments.flatMap(arg => arg.evidence)
    );

    const evidenceQuality = totalEvidence.length > 0 ? 
      totalEvidence.reduce((sum, ev) => sum + ev.credibilityScore, 0) / totalEvidence.length : 0;

    const argumentStrength = rounds.length > 0 ?
      rounds.reduce((sum, round) => {
        const avgConfidence = round.arguments.reduce((s, arg) => s + arg.confidenceLevel, 0) / round.arguments.length;
        return sum + avgConfidence;
      }, 0) / rounds.length : 0;

    const conflictResolutionSuccess = resolutions.length > 0 ?
      resolutions.filter(res => res.resolutionMethod !== 'MANUAL_REVIEW').length / resolutions.length : 1;

    return {
      evidenceQuality,
      argumentStrength,
      consensusConfidence: consensus.confidenceScore,
      conflictResolutionSuccess: conflictResolutionSuccess * 100
    };
  }

  /**
   * Set up real-time updates for session
   */
  private setupRealTimeUpdates(sessionId: string): void {
    memoryCoordinator.subscribeToUpdates(sessionId, (update) => {
      // Could emit to WebSocket clients, update UI, etc.
      console.log(`[Real-time Update] ${update.updateType}:`, update.data);
    });
  }

  /**
   * Get session progress
   */
  getSessionProgress(sessionId: string): DebateProgress | null {
    return memoryCoordinator.getProgress(sessionId);
  }

  /**
   * Get active debate sessions
   */
  getActiveDebates(): DebateSession[] {
    return Array.from(this.activeDebates.values());
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): DebateSystemMetrics {
    return { ...this.systemMetrics };
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics(): {
    recentOperations: any[];
    averageTimes: Record<string, number>;
    successRates: Record<string, number>;
  } {
    const operations = this.performanceLog.slice(-100); // Last 100 operations
    
    const operationGroups = operations.reduce((groups, op) => {
      if (!groups[op.operation]) {
        groups[op.operation] = [];
      }
      groups[op.operation].push(op);
      return groups;
    }, {} as Record<string, typeof operations>);

    const averageTimes: Record<string, number> = {};
    const successRates: Record<string, number> = {};

    for (const [operation, ops] of Object.entries(operationGroups)) {
      averageTimes[operation] = ops.reduce((sum, op) => sum + op.duration, 0) / ops.length;
      successRates[operation] = ops.filter(op => op.success).length / ops.length;
    }

    return {
      recentOperations: operations,
      averageTimes,
      successRates
    };
  }

  /**
   * Update system metrics
   */
  private updateSystemMetrics(result: DebateResult): void {
    this.systemMetrics.totalDebates++;
    
    // Update average debate time
    const currentTotal = this.systemMetrics.averageDebateTime * (this.systemMetrics.totalDebates - 1);
    this.systemMetrics.averageDebateTime = (currentTotal + result.processingTime) / this.systemMetrics.totalDebates;

    // Update consensus rate
    const hasConsensus = result.finalConsensus.finalVeracity !== 'INSUFFICIENT_EVIDENCE';
    const currentConsensusTotal = this.systemMetrics.consensusRate * (this.systemMetrics.totalDebates - 1);
    this.systemMetrics.consensusRate = (currentConsensusTotal + (hasConsensus ? 1 : 0)) / this.systemMetrics.totalDebates;

    // Update conflict resolution rate
    const resolvedConflicts = result.conflictResolutions.filter(res => res.resolutionMethod !== 'MANUAL_REVIEW').length;
    const totalConflicts = result.conflictResolutions.length;
    if (totalConflicts > 0) {
      const currentResolutionTotal = this.systemMetrics.conflictResolutionRate * (this.systemMetrics.totalDebates - 1);
      const resolutionRate = resolvedConflicts / totalConflicts;
      this.systemMetrics.conflictResolutionRate = (currentResolutionTotal + resolutionRate) / this.systemMetrics.totalDebates;
    }
  }

  /**
   * Log performance metrics
   */
  private logPerformance(operation: string, startTime: number, success: boolean): void {
    if (!this.config.performanceTracking) return;

    const duration = Date.now() - startTime;
    
    this.performanceLog.push({
      operation,
      duration,
      timestamp: Date.now(),
      success
    });

    // Keep only last 1000 entries
    if (this.performanceLog.length > 1000) {
      this.performanceLog = this.performanceLog.slice(-1000);
    }

    // Update performance breakdown
    if (success) {
      switch (operation) {
        case 'claim_debate_processing':
          this.systemMetrics.performanceBreakdown.debatePhase = 
            (this.systemMetrics.performanceBreakdown.debatePhase + duration) / 2;
          break;
        case 'conflict_resolution':
          this.systemMetrics.performanceBreakdown.conflictResolution = 
            (this.systemMetrics.performanceBreakdown.conflictResolution + duration) / 2;
          break;
        case 'consensus_calculation':
          this.systemMetrics.performanceBreakdown.consensusCalculation = 
            (this.systemMetrics.performanceBreakdown.consensusCalculation + duration) / 2;
          break;
        case 'session_initialization':
          this.systemMetrics.performanceBreakdown.memoryCoordination = 
            (this.systemMetrics.performanceBreakdown.memoryCoordination + duration) / 2;
          break;
      }
    }
  }

  /**
   * Cleanup resources and expired data
   */
  async cleanup(): Promise<void> {
    // Cleanup orchestrator
    debateOrchestrator.cleanupCompletedSessions();
    
    // Cleanup memory coordinator
    memoryCoordinator.cleanupExpiredEntries();
    
    // Clear old performance logs
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.performanceLog = this.performanceLog.filter(log => log.timestamp > cutoff);
  }

  /**
   * Export session data for backup or analysis
   */
  async exportSessionData(sessionId: string): Promise<any> {
    return memoryCoordinator.exportSessionData(sessionId);
  }

  /**
   * Force stop a debate session
   */
  async forceStopDebate(sessionId: string, reason: string = 'Manual intervention'): Promise<void> {
    const session = this.activeDebates.get(sessionId);
    if (session) {
      await debateOrchestrator.timeoutSession(sessionId);
      this.activeDebates.delete(sessionId);
      
      console.log(`Debate session ${sessionId} force stopped: ${reason}`);
    }
  }
}

// Export singleton instance
export const debateSystemCoordinator = new DebateSystemCoordinator();

// Export all components
export {
  debateOrchestrator,
  conflictResolver,
  consensusCalculator,
  memoryCoordinator
};

// Types are already exported as interfaces or imported from other modules