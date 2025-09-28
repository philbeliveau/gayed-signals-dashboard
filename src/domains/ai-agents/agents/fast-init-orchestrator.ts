/**
 * Fast Initialization Orchestrator
 * Optimized for quick startup and demonstration
 */

import { FactCheckOrchestrator, FactCheckOrchestrationConfig } from './base-architecture';
import { ClaimExtractor } from './claim-extractor';
import { RealDataEnforcer } from '@/domains/risk-management/utils/real-data-enforcer';

export class FastInitOrchestrator extends FactCheckOrchestrator {
  constructor(config: FactCheckOrchestrationConfig) {
    super(config);
  }

  /**
   * Fast initialization with minimal MCP overhead
   */
  async quickStart(): Promise<void> {
    console.log('🚀 Quick start mode - minimal initialization');
    
    // Skip MCP coordination for speed
    console.log('⚡ Bypassing MCP coordination for demo speed');
    
    // Set up minimal local coordination
    this.mcpIntegration = {
      claudeFlowInitialized: false,
      swarmTopology: 'hierarchical',
      activeAgents: ['ACADEMIC', 'NEWS', 'FINANCIAL', 'SOCIAL', 'GOVERNMENT'] as any,
      coordination: {
        memoryNamespace: `fast-session-${this.config.sessionId}`,
        communicationChannel: `fast-channel-${this.config.sessionId}`,
        taskDistribution: {
          ACADEMIC: ['scientific_claims'],
          NEWS: ['current_events'],
          FINANCIAL: ['economic_data'],
          SOCIAL: ['social_trends'],
          GOVERNMENT: ['official_data']
        }
      }
    };

    console.log('✅ Fast initialization complete - ready for fact-checking');
  }
}

export function createFastOrchestrator(sessionId: string): FastInitOrchestrator {
  return new FastInitOrchestrator({
    sessionId,
    agentCount: 5,
    factCheckLevel: 'COMPREHENSIVE',
    mcpTimeout: 2000, // Reduced timeout
    maxDebateRounds: 2 // Reduced rounds for speed
  });
}