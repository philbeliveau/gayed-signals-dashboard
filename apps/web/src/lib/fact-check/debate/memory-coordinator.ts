/**
 * Memory Coordinator
 * Phase 3 - Debate System Engineer
 * 
 * Claude Flow integration and cross-agent communication
 */

import { 
  FactCheckSession, 
  AgentType, 
  ExtractedClaim, 
  Investigation, 
  DebateRound, 
  ConsensusResult,
  AgentCoordination,
  FactCheckUpdate
} from '../../../types/fact-check';

export interface MemoryEntry {
  id: string;
  sessionId: string;
  agentType?: AgentType;
  dataType: 'CLAIM' | 'INVESTIGATION' | 'DEBATE' | 'CONSENSUS' | 'COORDINATION' | 'UPDATE';
  data: any;
  timestamp: number;
  expiresAt?: number;
  metadata?: Record<string, any>;
}

export interface CrossAgentMessage {
  id: string;
  sessionId: string;
  fromAgent: AgentType;
  toAgent: AgentType | 'ALL';
  messageType: 'EVIDENCE_SHARE' | 'CONFLICT_ALERT' | 'CONSENSUS_REQUEST' | 'STATUS_UPDATE';
  payload: any;
  timestamp: number;
  acknowledged: boolean;
}

export interface DebateProgress {
  sessionId: string;
  claimId: string;
  currentPhase: 'EXTRACTION' | 'INVESTIGATION' | 'DEBATE' | 'CONSENSUS' | 'COMPLETE';
  totalClaims: number;
  processedClaims: number;
  activeAgents: AgentType[];
  estimatedTimeRemaining: number;
  lastUpdated: number;
  currentRound?: number;
}

export class MemoryCoordinator {
  private memoryStore: Map<string, MemoryEntry> = new Map();
  private messageQueue: CrossAgentMessage[] = [];
  private activeSubscriptions: Map<string, Set<(update: FactCheckUpdate) => void>> = new Map();
  private progressTracking: Map<string, DebateProgress> = new Map();

  /**
   * Initialize memory for fact-check session
   */
  async initializeSession(session: FactCheckSession): Promise<void> {
    const memoryEntry: MemoryEntry = {
      id: `session-${session.id}`,
      sessionId: session.id,
      dataType: 'COORDINATION',
      data: {
        sessionId: session.id,
        status: session.status,
        agentCount: session.agentCount,
        startTime: Date.now(),
        configuration: {
          topology: 'hierarchical',
          maxAgents: session.agentCount,
          strategy: 'parallel'
        }
      },
      timestamp: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      metadata: {
        version: '1.0',
        realDataCompliant: session.realDataCompliant
      }
    };

    this.memoryStore.set(memoryEntry.id, memoryEntry);

    // Initialize progress tracking
    this.progressTracking.set(session.id, {
      sessionId: session.id,
      claimId: '',
      currentPhase: 'EXTRACTION',
      totalClaims: 0,
      processedClaims: 0,
      activeAgents: [],
      estimatedTimeRemaining: 0,
      lastUpdated: Date.now()
    });

    // Store in Claude Flow memory
    await this.storeInClaudeFlow(`session/${session.id}`, memoryEntry.data);
  }

  /**
   * Store claim extraction data
   */
  async storeClaim(claim: ExtractedClaim): Promise<void> {
    const memoryEntry: MemoryEntry = {
      id: `claim-${claim.id}`,
      sessionId: claim.sessionId,
      dataType: 'CLAIM',
      data: claim,
      timestamp: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
      metadata: {
        priority: this.calculateClaimPriority(claim),
        complexity: this.estimateClaimComplexity(claim)
      }
    };

    this.memoryStore.set(memoryEntry.id, memoryEntry);
    await this.storeInClaudeFlow(`claim/${claim.sessionId}/${claim.id}`, claim);

    // Update progress
    this.updateProgress(claim.sessionId, 'EXTRACTION', {
      totalClaims: this.getClaimsForSession(claim.sessionId).length
    });

    // Broadcast update
    this.broadcastUpdate({
      sessionId: claim.sessionId,
      updateType: 'CLAIM_EXTRACTED',
      data: claim,
      timestamp: Date.now(),
      realTime: true
    });
  }

  /**
   * Store agent investigation data
   */
  async storeInvestigation(investigation: Investigation): Promise<void> {
    const memoryEntry: MemoryEntry = {
      id: `investigation-${investigation.id}`,
      sessionId: investigation.claimId,
      agentType: investigation.agentType,
      dataType: 'INVESTIGATION',
      data: investigation,
      timestamp: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
      metadata: {
        processingTime: investigation.processingTimeMs,
        evidenceCount: investigation.evidenceFound.length,
        saflaCompliant: investigation.saflaCompliant
      }
    };

    this.memoryStore.set(memoryEntry.id, memoryEntry);
    await this.storeInClaudeFlow(`investigation/${investigation.claimId}/${investigation.agentType}`, investigation);

    // Update agent status
    this.updateAgentStatus(investigation.claimId, investigation.agentType, 'COMPLETED');

    // Check if all agents completed for this claim
    await this.checkInvestigationCompletion(investigation.claimId);

    // Broadcast update
    this.broadcastUpdate({
      sessionId: investigation.claimId,
      updateType: 'INVESTIGATION_STARTED',
      agentType: investigation.agentType,
      data: investigation,
      timestamp: Date.now(),
      realTime: true
    });
  }

  /**
   * Store debate round data
   */
  async storeDebateRound(debateRound: DebateRound): Promise<void> {
    const memoryEntry: MemoryEntry = {
      id: `debate-${debateRound.id}`,
      sessionId: debateRound.claimId,
      dataType: 'DEBATE',
      data: debateRound,
      timestamp: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
      metadata: {
        roundNumber: debateRound.roundNumber,
        argumentCount: debateRound.arguments.length,
        conflictCount: debateRound.evidenceConflicts.length
      }
    };

    this.memoryStore.set(memoryEntry.id, memoryEntry);
    await this.storeInClaudeFlow(`debate/${debateRound.claimId}/round-${debateRound.roundNumber}`, debateRound);

    // Update progress
    this.updateProgress(debateRound.claimId, 'DEBATE', {
      currentRound: debateRound.roundNumber
    });

    // Broadcast update
    this.broadcastUpdate({
      sessionId: debateRound.claimId,
      updateType: 'DEBATE_ROUND',
      data: debateRound,
      timestamp: Date.now(),
      realTime: true
    });
  }

  /**
   * Store consensus result
   */
  async storeConsensus(consensus: ConsensusResult): Promise<void> {
    const memoryEntry: MemoryEntry = {
      id: `consensus-${consensus.id}`,
      sessionId: consensus.claimId,
      dataType: 'CONSENSUS',
      data: consensus,
      timestamp: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // Keep consensus longer
      metadata: {
        veracity: consensus.finalVeracity,
        confidence: consensus.confidenceScore,
        method: consensus.consensusMethod,
        agentCount: consensus.participatingAgents.length
      }
    };

    this.memoryStore.set(memoryEntry.id, memoryEntry);
    await this.storeInClaudeFlow(`consensus/${consensus.claimId}`, consensus);

    // Update progress
    this.updateProgress(consensus.claimId, 'CONSENSUS', {
      processedClaims: this.getConsensusForSession(consensus.claimId).length
    });

    // Broadcast update
    this.broadcastUpdate({
      sessionId: consensus.claimId,
      updateType: 'CONSENSUS_REACHED',
      data: consensus,
      timestamp: Date.now(),
      realTime: true
    });
  }

  /**
   * Send cross-agent message
   */
  async sendMessage(message: Omit<CrossAgentMessage, 'id' | 'timestamp' | 'acknowledged'>): Promise<void> {
    const fullMessage: CrossAgentMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      acknowledged: false
    };

    this.messageQueue.push(fullMessage);

    // Store in memory
    const memoryEntry: MemoryEntry = {
      id: `message-${fullMessage.id}`,
      sessionId: fullMessage.sessionId,
      agentType: fullMessage.fromAgent,
      dataType: 'COORDINATION',
      data: fullMessage,
      timestamp: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      metadata: {
        messageType: fullMessage.messageType,
        target: fullMessage.toAgent
      }
    };

    this.memoryStore.set(memoryEntry.id, memoryEntry);
    await this.storeInClaudeFlow(`message/${fullMessage.sessionId}/${fullMessage.id}`, fullMessage);
  }

  /**
   * Get messages for specific agent
   */
  getMessagesForAgent(sessionId: string, agentType: AgentType): CrossAgentMessage[] {
    return this.messageQueue.filter(msg => 
      msg.sessionId === sessionId && 
      (msg.toAgent === agentType || msg.toAgent === 'ALL') &&
      !msg.acknowledged
    );
  }

  /**
   * Acknowledge message receipt
   */
  acknowledgeMessage(messageId: string): void {
    const message = this.messageQueue.find(msg => msg.id === messageId);
    if (message) {
      message.acknowledged = true;
    }
  }

  /**
   * Get session coordination data
   */
  getSessionCoordination(sessionId: string): AgentCoordination | null {
    const messages = this.messageQueue.filter(msg => msg.sessionId === sessionId);
    const sessionMemory = this.getSessionMemory(sessionId);

    if (!sessionMemory) return null;

    return {
      sessionId,
      activeAgents: this.getActiveAgents(sessionId),
      taskDistribution: this.getTaskDistribution(sessionId),
      communicationLog: messages.map(msg => ({
        fromAgent: msg.fromAgent,
        toAgent: msg.toAgent,
        message: JSON.stringify(msg.payload),
        timestamp: msg.timestamp,
        messageType: msg.messageType
      })),
      sharedMemory: sessionMemory
    };
  }

  /**
   * Subscribe to real-time updates
   */
  subscribeToUpdates(sessionId: string, callback: (update: FactCheckUpdate) => void): () => void {
    if (!this.activeSubscriptions.has(sessionId)) {
      this.activeSubscriptions.set(sessionId, new Set());
    }
    
    this.activeSubscriptions.get(sessionId)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.activeSubscriptions.get(sessionId)?.delete(callback);
      if (this.activeSubscriptions.get(sessionId)?.size === 0) {
        this.activeSubscriptions.delete(sessionId);
      }
    };
  }

  /**
   * Get session progress
   */
  getProgress(sessionId: string): DebateProgress | null {
    return this.progressTracking.get(sessionId) || null;
  }

  /**
   * Private helper methods
   */
  private async storeInClaudeFlow(key: string, data: any): Promise<void> {
    try {
      // Store in Claude Flow memory with TTL
      const memoryKey = `fact-check/${key}`;
      const value = JSON.stringify({
        data,
        timestamp: Date.now(),
        version: '1.0'
      });

      // This would integrate with Claude Flow MCP tools
      // For now, we'll use local storage simulation
      await this.simulateClaudeFlowStorage(memoryKey, value);
    } catch (error) {
      console.error('Failed to store in Claude Flow:', error);
    }
  }

  private async simulateClaudeFlowStorage(key: string, value: string): Promise<void> {
    // Simulate Claude Flow storage - in production this would use actual MCP tools
    // mcp__claude-flow__memory_usage with action: "store"
    console.log(`[Claude Flow Memory] Storing: ${key}`);
  }

  private calculateClaimPriority(claim: ExtractedClaim): 'high' | 'medium' | 'low' {
    if (claim.confidenceExtraction > 0.8) return 'high';
    if (claim.confidenceExtraction > 0.6) return 'medium';
    return 'low';
  }

  private estimateClaimComplexity(claim: ExtractedClaim): 'simple' | 'moderate' | 'complex' {
    const textLength = claim.claimText.length;
    if (textLength > 200) return 'complex';
    if (textLength > 100) return 'moderate';
    return 'simple';
  }

  private getClaimsForSession(sessionId: string): ExtractedClaim[] {
    return Array.from(this.memoryStore.values())
      .filter(entry => entry.sessionId === sessionId && entry.dataType === 'CLAIM')
      .map(entry => entry.data as ExtractedClaim);
  }

  private getConsensusForSession(sessionId: string): ConsensusResult[] {
    return Array.from(this.memoryStore.values())
      .filter(entry => entry.sessionId === sessionId && entry.dataType === 'CONSENSUS')
      .map(entry => entry.data as ConsensusResult);
  }

  private async checkInvestigationCompletion(claimId: string): Promise<void> {
    const investigations = Array.from(this.memoryStore.values())
      .filter(entry => entry.sessionId === claimId && entry.dataType === 'INVESTIGATION')
      .map(entry => entry.data as Investigation);

    // Check if we have investigations from all expected agents
    const expectedAgents: AgentType[] = ['ACADEMIC', 'NEWS', 'FINANCIAL', 'SOCIAL', 'GOVERNMENT'];
    const completedAgents = investigations.map(inv => inv.agentType);
    
    const allCompleted = expectedAgents.every(agent => completedAgents.includes(agent));
    
    if (allCompleted) {
      // All investigations complete - move to debate phase
      this.updateProgress(claimId, 'DEBATE', {
        activeAgents: expectedAgents
      });

      // Send message to trigger debate
      await this.sendMessage({
        sessionId: claimId,
        fromAgent: 'ACADEMIC', // Coordinator
        toAgent: 'ALL',
        messageType: 'CONSENSUS_REQUEST',
        payload: {
          phase: 'DEBATE_START',
          investigations: investigations
        }
      });
    }
  }

  private updateAgentStatus(sessionId: string, agentType: AgentType, status: string): void {
    const progress = this.progressTracking.get(sessionId);
    if (progress) {
      if (status === 'COMPLETED' && !progress.activeAgents.includes(agentType)) {
        progress.activeAgents.push(agentType);
      }
      progress.lastUpdated = Date.now();
    }
  }

  private updateProgress(sessionId: string, phase: DebateProgress['currentPhase'], updates: Partial<DebateProgress>): void {
    const progress = this.progressTracking.get(sessionId);
    if (progress) {
      Object.assign(progress, { ...updates, currentPhase: phase, lastUpdated: Date.now() });
    }
  }

  private broadcastUpdate(update: FactCheckUpdate): void {
    const subscribers = this.activeSubscriptions.get(update.sessionId);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          console.error('Error in update callback:', error);
        }
      });
    }
  }

  private getActiveAgents(sessionId: string): AgentType[] {
    const progress = this.progressTracking.get(sessionId);
    return progress?.activeAgents || [];
  }

  private getTaskDistribution(sessionId: string): Record<AgentType, string[]> {
    // Get current task assignments from memory
    const distribution: Record<AgentType, string[]> = {
      ACADEMIC: [],
      NEWS: [],
      FINANCIAL: [],
      SOCIAL: [],
      GOVERNMENT: []
    };

    const investigations = Array.from(this.memoryStore.values())
      .filter(entry => entry.sessionId === sessionId && entry.dataType === 'INVESTIGATION')
      .map(entry => entry.data as Investigation);

    investigations.forEach(inv => {
      distribution[inv.agentType].push(`Claim ${inv.claimId}`);
    });

    return distribution;
  }

  private getSessionMemory(sessionId: string): Record<string, any> {
    const sessionEntries = Array.from(this.memoryStore.values())
      .filter(entry => entry.sessionId === sessionId);

    const memory: Record<string, any> = {};
    sessionEntries.forEach(entry => {
      memory[entry.id] = entry.data;
    });

    return memory;
  }

  /**
   * Cleanup expired entries
   */
  cleanupExpiredEntries(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.memoryStore) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.memoryStore.delete(key);
      }
    }

    // Cleanup acknowledged messages older than 1 hour
    const cutoff = now - (60 * 60 * 1000);
    this.messageQueue = this.messageQueue.filter(msg => 
      !msg.acknowledged || msg.timestamp > cutoff
    );
  }

  /**
   * Export session data for backup
   */
  exportSessionData(sessionId: string): any {
    const sessionData = Array.from(this.memoryStore.values())
      .filter(entry => entry.sessionId === sessionId);

    const messages = this.messageQueue.filter(msg => msg.sessionId === sessionId);
    const progress = this.progressTracking.get(sessionId);

    return {
      sessionId,
      memoryEntries: sessionData,
      messages,
      progress,
      exportedAt: Date.now()
    };
  }
}

// Export singleton instance
export const memoryCoordinator = new MemoryCoordinator();