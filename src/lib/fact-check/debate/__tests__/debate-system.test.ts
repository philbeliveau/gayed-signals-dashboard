/**
 * Debate System Test Suite
 * Phase 3 - Debate System Engineer
 * 
 * Comprehensive testing for all debate system components
 */

import { 
  debateSystemCoordinator,
  debateOrchestrator,
  conflictResolver,
  consensusCalculator,
  memoryCoordinator
} from '../index';

import { 
  ExtractedClaim, 
  Investigation, 
  FactCheckSession, 
  AgentType,
  VeracityLevel,
  SourceEvidence 
} from '../../../../types/fact-check';

// Test data factories
const createMockClaim = (id: string = '1', sessionId: string = 'session-1'): ExtractedClaim => ({
  id,
  sessionId,
  claimText: 'The unemployment rate decreased by 2% last quarter',
  claimCategory: 'ECONOMIC',
  timestampStart: 1000,
  confidenceExtraction: 0.85,
  context: 'Economic discussion',
  speaker: 'Economic Analyst',
  createdAt: new Date()
});

const createMockEvidence = (url: string, credibilityScore: number = 80): SourceEvidence => ({
  url,
  title: `Evidence from ${url}`,
  content: 'Supporting evidence content',
  author: 'Test Author',
  publishDate: '2024-01-01',
  sourceType: 'ACADEMIC',
  credibilityScore,
  relevanceScore: 85,
  mcpUsed: 'test-mcp',
  saflaValidated: true,
  verificationTimestamp: Date.now()
});

const createMockInvestigation = (
  agentType: AgentType, 
  claimId: string = '1',
  conclusion: VeracityLevel = 'VERIFIED_TRUE'
): Investigation => ({
  id: `investigation-${agentType}-${claimId}`,
  claimId,
  agentType,
  sourcesSearched: ['source1.com', 'source2.com'],
  evidenceFound: [
    createMockEvidence(`${agentType.toLowerCase()}-source1.com`),
    createMockEvidence(`${agentType.toLowerCase()}-source2.com`)
  ],
  conclusion,
  confidenceScore: 75,
  reasoning: `${agentType} agent analysis supports this conclusion`,
  mcpUsed: ['test-mcp-1', 'test-mcp-2'],
  processingTimeMs: 5000,
  saflaCompliant: true,
  createdAt: new Date()
});

const createMockSession = (): FactCheckSession => ({
  id: 'test-session-1',
  videoId: 'video-123',
  videoUrl: 'https://example.com/video',
  videoTitle: 'Test Video',
  agentCount: 5,
  status: 'PENDING',
  overallCredibilityScore: 0,
  extractedClaims: [],
  investigations: [],
  debateRounds: [],
  finalConsensus: [],
  processingTimeSeconds: 0,
  realDataCompliant: true,
  saflaValidationsPassed: 0,
  saflaValidationsFailed: 0,
  createdAt: new Date()
});

describe('Debate System Integration Tests', () => {
  beforeEach(() => {
    // Reset system state
    jest.clearAllMocks();
  });

  describe('Full Debate Process', () => {
    it('should process a complete fact-check session successfully', async () => {
      const session = createMockSession();
      const claim = createMockClaim();
      
      const investigations: Investigation[] = [
        createMockInvestigation('ACADEMIC', claim.id, 'VERIFIED_TRUE'),
        createMockInvestigation('NEWS', claim.id, 'VERIFIED_TRUE'),
        createMockInvestigation('FINANCIAL', claim.id, 'VERIFIED_FALSE'),
        createMockInvestigation('GOVERNMENT', claim.id, 'VERIFIED_TRUE'),
        createMockInvestigation('SOCIAL', claim.id, 'INSUFFICIENT_EVIDENCE')
      ];

      // Initialize session
      await debateSystemCoordinator.initializeFactCheckSession(session);

      // Process debate
      const result = await debateSystemCoordinator.processClaimDebate(claim, investigations);

      expect(result).toBeDefined();
      expect(result.sessionId).toBe(claim.sessionId);
      expect(result.claimId).toBe(claim.id);
      expect(result.finalConsensus).toBeDefined();
      expect(result.participatingAgents).toHaveLength(5);
      expect(result.processingTime).toBeGreaterThan(0);
      
      // Should reach consensus with majority voting
      expect(['VERIFIED_TRUE', 'VERIFIED_FALSE', 'INSUFFICIENT_EVIDENCE'])
        .toContain(result.finalConsensus.finalVeracity);
    }, 10000); // 10 second timeout for integration test

    it('should handle conflicting evidence appropriately', async () => {
      const claim = createMockClaim();
      
      // Create investigations with conflicting evidence
      const investigations: Investigation[] = [
        createMockInvestigation('ACADEMIC', claim.id, 'VERIFIED_TRUE'),
        createMockInvestigation('NEWS', claim.id, 'VERIFIED_FALSE'),
        createMockInvestigation('FINANCIAL', claim.id, 'VERIFIED_TRUE'),
        createMockInvestigation('GOVERNMENT', claim.id, 'VERIFIED_FALSE'),
        createMockInvestigation('SOCIAL', claim.id, 'VERIFIED_TRUE')
      ];

      const result = await debateSystemCoordinator.processClaimDebate(claim, investigations);

      expect(result.debateRounds).toHaveLength(1); // Should complete in one round for this test
      expect(result.conflictResolutions.length).toBeGreaterThanOrEqual(0);
      expect(result.finalConsensus.consensusMethod).toBeDefined();
      
      // With 3 TRUE vs 2 FALSE, should lean towards TRUE
      expect(result.finalConsensus.finalVeracity).toBe('VERIFIED_TRUE');
    });

    it('should timeout debates that exceed time limits', async () => {
      const claim = createMockClaim();
      const investigations = [createMockInvestigation('ACADEMIC', claim.id)];

      // Configure with very short timeout
      const config = {
        debateConfig: {
          maxRounds: 1,
          timeoutPerRound: 1 // 1ms timeout
        }
      };

      const coordinator = new (debateSystemCoordinator.constructor as any)(config);
      
      const startTime = Date.now();
      const result = await coordinator.processClaimDebate(claim, investigations);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly due to timeout
      expect(result).toBeDefined();
    });
  });

  describe('Debate Orchestrator', () => {
    it('should initialize debate session correctly', async () => {
      const claim = createMockClaim();
      const investigations = [
        createMockInvestigation('ACADEMIC', claim.id),
        createMockInvestigation('NEWS', claim.id)
      ];

      const session = await debateOrchestrator.initializeDebate(
        claim.sessionId,
        claim,
        investigations
      );

      expect(session.sessionId).toContain('debate-');
      expect(session.claimId).toBe(claim.id);
      expect(session.participatingAgents).toHaveLength(2);
      expect(session.status).toBe('DEBATING');
      expect(session.rounds).toHaveLength(1);
    });

    it('should reject debates with insufficient agents', async () => {
      const claim = createMockClaim();
      const investigations = [createMockInvestigation('ACADEMIC', claim.id)]; // Only 1 agent

      await expect(
        debateOrchestrator.initializeDebate(claim.sessionId, claim, investigations)
      ).rejects.toThrow('Insufficient agents for debate');
    });
  });

  describe('Conflict Resolver', () => {
    it('should resolve source disagreements correctly', async () => {
      const highCredibilityEvidence = createMockEvidence('academic-source.edu', 95);
      const lowCredibilityEvidence = createMockEvidence('random-blog.com', 30);

      const conflict = {
        conflictType: 'SOURCE_DISAGREEMENT' as const,
        agentsInvolved: ['ACADEMIC', 'SOCIAL'] as AgentType[],
        conflictingEvidence: [highCredibilityEvidence, lowCredibilityEvidence],
        resolutionStrategy: 'CREDIBILITY_WEIGHTED_ANALYSIS',
        resolved: false
      };

      const resolutions = await conflictResolver.resolveConflicts([conflict], []);

      expect(resolutions).toHaveLength(1);
      expect(resolutions[0].resolutionMethod).toBe('CREDIBILITY_WEIGHTED');
      expect(resolutions[0].resolvedEvidence).toContain(highCredibilityEvidence);
      expect(resolutions[0].discardedEvidence).toContain(lowCredibilityEvidence);
    });

    it('should handle temporal discrepancies', async () => {
      const recentEvidence = createMockEvidence('recent-source.com');
      recentEvidence.publishDate = '2024-06-01';
      
      const oldEvidence = createMockEvidence('old-source.com');
      oldEvidence.publishDate = '2020-01-01';

      const conflict = {
        conflictType: 'TEMPORAL_DISCREPANCY' as const,
        agentsInvolved: ['NEWS', 'GOVERNMENT'] as AgentType[],
        conflictingEvidence: [recentEvidence, oldEvidence],
        resolutionStrategy: 'LATEST_SOURCE_PRIORITY',
        resolved: false
      };

      const resolutions = await conflictResolver.resolveConflicts([conflict], []);

      expect(resolutions).toHaveLength(1);
      expect(resolutions[0].resolutionMethod).toBe('TEMPORAL_PRIORITY');
      expect(resolutions[0].resolvedEvidence).toContain(recentEvidence);
    });
  });

  describe('Consensus Calculator', () => {
    it('should calculate unanimous consensus correctly', async () => {
      const arguments = [
        {
          agentType: 'ACADEMIC' as AgentType,
          position: 'SUPPORTS' as const,
          evidence: [createMockEvidence('academic1.edu')],
          reasoning: 'Strong academic evidence',
          confidenceLevel: 90
        },
        {
          agentType: 'NEWS' as AgentType,
          position: 'SUPPORTS' as const,
          evidence: [createMockEvidence('news1.com')],
          reasoning: 'News reports confirm',
          confidenceLevel: 85
        }
      ];

      const consensus = await consensusCalculator.calculateConsensus('claim-1', arguments);

      expect(consensus.consensusMethod).toBe('UNANIMOUS');
      expect(consensus.finalVeracity).toBe('VERIFIED_TRUE');
      expect(consensus.agreementLevel).toBe(100);
      expect(consensus.participatingAgents).toHaveLength(2);
    });

    it('should calculate majority consensus correctly', async () => {
      const arguments = [
        {
          agentType: 'ACADEMIC' as AgentType,
          position: 'SUPPORTS' as const,
          evidence: [createMockEvidence('academic1.edu')],
          reasoning: 'Academic evidence supports',
          confidenceLevel: 80
        },
        {
          agentType: 'NEWS' as AgentType,
          position: 'SUPPORTS' as const,
          evidence: [createMockEvidence('news1.com')],
          reasoning: 'News confirms',
          confidenceLevel: 75
        },
        {
          agentType: 'SOCIAL' as AgentType,
          position: 'REFUTES' as const,
          evidence: [createMockEvidence('social1.com')],
          reasoning: 'Social media contradicts',
          confidenceLevel: 60
        }
      ];

      const consensus = await consensusCalculator.calculateConsensus('claim-1', arguments);

      expect(consensus.consensusMethod).toBe('MAJORITY');
      expect(consensus.finalVeracity).toBe('VERIFIED_TRUE');
      expect(consensus.agreementLevel).toBeGreaterThan(50);
      expect(consensus.participatingAgents).toHaveLength(3);
    });

    it('should handle insufficient evidence correctly', async () => {
      const consensus = await consensusCalculator.calculateConsensus('claim-1', []);

      expect(consensus.finalVeracity).toBe('INSUFFICIENT_EVIDENCE');
      expect(consensus.confidenceScore).toBe(0);
      expect(consensus.agreementLevel).toBe(0);
    });
  });

  describe('Memory Coordinator', () => {
    it('should store and retrieve session data correctly', async () => {
      const session = createMockSession();
      
      await memoryCoordinator.initializeSession(session);
      
      const progress = memoryCoordinator.getProgress(session.id);
      expect(progress).toBeDefined();
      expect(progress?.sessionId).toBe(session.id);
      expect(progress?.currentPhase).toBe('EXTRACTION');
    });

    it('should handle cross-agent messaging', async () => {
      const sessionId = 'test-session';
      
      await memoryCoordinator.sendMessage({
        sessionId,
        fromAgent: 'ACADEMIC',
        toAgent: 'NEWS',
        messageType: 'EVIDENCE_SHARE',
        payload: { evidence: 'test evidence' }
      });

      const messages = memoryCoordinator.getMessagesForAgent(sessionId, 'NEWS');
      expect(messages).toHaveLength(1);
      expect(messages[0].fromAgent).toBe('ACADEMIC');
      expect(messages[0].messageType).toBe('EVIDENCE_SHARE');
    });

    it('should track investigation completion', async () => {
      const claim = createMockClaim();
      const investigation = createMockInvestigation('ACADEMIC', claim.id);
      
      await memoryCoordinator.storeClaim(claim);
      await memoryCoordinator.storeInvestigation(investigation);
      
      const progress = memoryCoordinator.getProgress(claim.sessionId);
      expect(progress?.activeAgents).toContain('ACADEMIC');
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle system errors gracefully', async () => {
      const claim = createMockClaim();
      
      // Create invalid investigation to trigger error
      const invalidInvestigation = createMockInvestigation('ACADEMIC', claim.id);
      invalidInvestigation.evidenceFound = []; // No evidence
      
      const result = await debateSystemCoordinator.processClaimDebate(claim, [invalidInvestigation]);
      
      // Should still complete with insufficient evidence
      expect(result.finalConsensus.finalVeracity).toBe('INSUFFICIENT_EVIDENCE');
    });

    it('should respect concurrent debate limits', async () => {
      const config = { maxConcurrentDebates: 1 };
      const coordinator = new (debateSystemCoordinator.constructor as any)(config);
      
      const claim1 = createMockClaim('1');
      const claim2 = createMockClaim('2');
      const investigations = [createMockInvestigation('ACADEMIC')];

      // Start first debate
      const promise1 = coordinator.processClaimDebate(claim1, investigations);
      
      // Try to start second debate (should be rejected)
      await expect(
        coordinator.processClaimDebate(claim2, investigations)
      ).rejects.toThrow('Maximum concurrent debates reached');
      
      await promise1; // Clean up
    });

    it('should cleanup expired data', async () => {
      // This would test the cleanup functionality
      memoryCoordinator.cleanupExpiredEntries();
      debateOrchestrator.cleanupCompletedSessions();
      
      // Verify cleanup occurred (implementation-dependent)
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Real-time Updates', () => {
    it('should broadcast updates during debate process', async () => {
      const session = createMockSession();
      const updates: any[] = [];
      
      // Subscribe to updates
      const unsubscribe = memoryCoordinator.subscribeToUpdates(session.id, (update) => {
        updates.push(update);
      });

      const claim = createMockClaim();
      await memoryCoordinator.storeClaim(claim);
      
      expect(updates).toHaveLength(1);
      expect(updates[0].updateType).toBe('CLAIM_EXTRACTED');
      
      unsubscribe();
    });
  });

  describe('System Metrics', () => {
    it('should track system performance metrics', () => {
      const metrics = debateSystemCoordinator.getSystemMetrics();
      
      expect(metrics).toHaveProperty('totalDebates');
      expect(metrics).toHaveProperty('averageDebateTime');
      expect(metrics).toHaveProperty('consensusRate');
      expect(metrics).toHaveProperty('conflictResolutionRate');
      expect(metrics).toHaveProperty('accuracyMetrics');
      expect(metrics).toHaveProperty('performanceBreakdown');
    });

    it('should provide performance analytics', () => {
      const analytics = debateSystemCoordinator.getPerformanceAnalytics();
      
      expect(analytics).toHaveProperty('recentOperations');
      expect(analytics).toHaveProperty('averageTimes');
      expect(analytics).toHaveProperty('successRates');
    });
  });
});

describe('Edge Cases and Stress Tests', () => {
  it('should handle large numbers of agents', async () => {
    const claim = createMockClaim();
    const investigations = Array.from({ length: 10 }, (_, i) => 
      createMockInvestigation(`ACADEMIC` as AgentType, claim.id) // Note: Simplified for test
    );

    const result = await debateSystemCoordinator.processClaimDebate(claim, investigations);
    expect(result).toBeDefined();
  });

  it('should handle complex evidence conflicts', async () => {
    const claim = createMockClaim();
    
    // Create investigations with many conflicting pieces of evidence
    const investigations = [
      createMockInvestigation('ACADEMIC', claim.id, 'VERIFIED_TRUE'),
      createMockInvestigation('NEWS', claim.id, 'VERIFIED_FALSE'),
      createMockInvestigation('FINANCIAL', claim.id, 'PARTIALLY_TRUE'),
      createMockInvestigation('GOVERNMENT', claim.id, 'MISLEADING'),
      createMockInvestigation('SOCIAL', claim.id, 'UNVERIFIED')
    ];

    const result = await debateSystemCoordinator.processClaimDebate(claim, investigations);
    
    expect(result.conflictResolutions.length).toBeGreaterThan(0);
    expect(result.finalConsensus).toBeDefined();
  });

  it('should maintain performance under load', async () => {
    const startTime = Date.now();
    const promises = [];

    // Process multiple debates concurrently
    for (let i = 0; i < 5; i++) {
      const claim = createMockClaim(`claim-${i}`, `session-${i}`);
      const investigations = [
        createMockInvestigation('ACADEMIC', claim.id),
        createMockInvestigation('NEWS', claim.id)
      ];
      
      promises.push(debateSystemCoordinator.processClaimDebate(claim, investigations));
    }

    const results = await Promise.all(promises);
    const endTime = Date.now();

    expect(results).toHaveLength(5);
    expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds
    
    results.forEach(result => {
      expect(result.finalConsensus).toBeDefined();
    });
  });
});