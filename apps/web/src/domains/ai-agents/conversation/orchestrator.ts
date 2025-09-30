/**
 * AutoGen Conversation Orchestrator
 * Story 1.8: Multi-Agent Conversation Implementation
 *
 * 🚨 CRITICAL: Separate from SignalOrchestrator - Event-driven architecture
 *
 * Manages structured debates between three specialized AutoGen agents:
 * - Financial Analyst Agent
 * - Market Context Agent
 * - Risk Challenger Agent
 */

import type {
  AgentConversation,
  ConversationStatus,
  AgentMessage,
  ConversationConsensus,
  ContentSource,
  ConversationMetrics
} from '../types/conversation';
import type { ConsensusSignal } from '../../trading-signals/types/index';
import { EventEmitter } from 'events';

export interface ConversationConfig {
  maxMessages: number;
  timeoutSeconds: number;
  requiredAgents: string[];
  consensusThreshold: number;
}

export interface ConversationSession {
  id: string;
  status: ConversationStatus;
  agents: string[];
  messages: AgentMessage[];
  consensus?: ConversationConsensus;
  metrics: ConversationMetrics;
  contentSource: ContentSource;
  signalContext?: ConsensusSignal;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AutoGen Conversation Orchestrator
 * Event-driven orchestration of multi-agent financial debates
 */
export class ConversationOrchestrator extends EventEmitter {
  private static readonly DEFAULT_CONFIG: ConversationConfig = {
    maxMessages: 15, // 5 messages per agent max
    timeoutSeconds: 90, // Story requirement: 90 seconds
    requiredAgents: ['financial_analyst', 'market_context', 'risk_challenger'],
    consensusThreshold: 0.7
  };

  private activeSessions = new Map<string, ConversationSession>();
  private config: ConversationConfig;
  private backendEndpoint: string;

  constructor(config?: Partial<ConversationConfig>) {
    super();
    this.config = { ...ConversationOrchestrator.DEFAULT_CONFIG, ...config };
    this.backendEndpoint = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  }

  /**
   * Start a new agent conversation session
   */
  async startConversation(
    contentSource: ContentSource,
    signalContext?: ConsensusSignal
  ): Promise<ConversationSession> {
    const sessionId = this.generateSessionId();

    console.log(`🎭 Starting AutoGen conversation: ${sessionId}`);

    const session: ConversationSession = {
      id: sessionId,
      status: 'initializing',
      agents: [...this.config.requiredAgents],
      messages: [],
      metrics: {
        startTime: Date.now(),
        messageCount: 0,
        averageResponseTime: 0,
        consensusReached: false,
        timeToConsensus: null
      },
      contentSource,
      signalContext,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.activeSessions.set(sessionId, session);

    // Emit event for session management
    this.emit('conversation_started', session);

    try {
      // Initialize conversation with backend AutoGen agents
      await this.initializeBackendConversation(session);

      // Start the debate flow
      await this.executeDebateFlow(session);

    } catch (error) {
      console.error(`❌ Conversation ${sessionId} failed:`, error);
      session.status = 'failed';
      this.emit('conversation_failed', { sessionId, error });
    }

    return session;
  }

  /**
   * Get active conversation session
   */
  getSession(sessionId: string): ConversationSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): ConversationSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Initialize conversation with backend AutoGen agents
   */
  private async initializeBackendConversation(session: ConversationSession): Promise<void> {
    try {
      const response = await fetch(`${this.backendEndpoint}/api/v1/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: session.id,
          content_source: session.contentSource,
          signal_context: session.signalContext,
          agents: session.agents,
          config: this.config
        })
      });

      if (!response.ok) {
        throw new Error(`Backend initialization failed: ${response.statusText}`);
      }

      session.status = 'active';
      session.updatedAt = new Date();

      console.log(`✅ AutoGen conversation initialized: ${session.id}`);

    } catch (error) {
      console.error(`Backend initialization error:`, error);
      throw error;
    }
  }

  /**
   * Execute structured debate flow
   */
  private async executeDebateFlow(session: ConversationSession): Promise<void> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Conversation timeout')), this.config.timeoutSeconds * 1000);
    });

    const conversationPromise = this.runConversationLoop(session);

    try {
      await Promise.race([conversationPromise, timeoutPromise]);
    } catch (error) {
      console.error(`Conversation flow error:`, error);
      session.status = 'failed';
      throw error;
    }
  }

  /**
   * Main conversation loop with WebSocket streaming
   */
  private async runConversationLoop(session: ConversationSession): Promise<void> {
    return new Promise((resolve, reject) => {
      // WebSocket connection to backend AutoGen conversation
      const ws = new WebSocket(`${this.backendEndpoint.replace('http', 'ws')}/ws/conversation/${session.id}`);

      ws.onopen = () => {
        console.log(`🔌 WebSocket connected for session: ${session.id}`);
        session.status = 'active';
        this.emit('conversation_connected', session);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleAgentMessage(session, data);

          // Check termination conditions
          if (this.shouldTerminateConversation(session)) {
            this.terminateConversation(session);
            ws.close();
            resolve();
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        session.status = 'failed';
        reject(error);
      };

      ws.onclose = () => {
        console.log(`🔌 WebSocket closed for session: ${session.id}`);
        if (session.status === 'active') {
          session.status = 'completed';
        }
      };

      // Store WebSocket reference for cleanup
      (session as any).ws = ws;
    });
  }

  /**
   * Handle incoming agent message
   */
  private handleAgentMessage(session: ConversationSession, messageData: any): void {
    const message: AgentMessage = {
      id: messageData.id,
      agentId: messageData.agent_id,
      agentName: messageData.agent_name,
      content: messageData.content,
      messageType: messageData.message_type || 'analysis',
      confidence: messageData.confidence || 0,
      timestamp: new Date(messageData.timestamp),
      metadata: messageData.metadata || {}
    };

    session.messages.push(message);
    session.metrics.messageCount++;
    session.updatedAt = new Date();

    // Calculate average response time
    if (session.messages.length > 1) {
      const responseTime = message.timestamp.getTime() - session.messages[session.messages.length - 2].timestamp.getTime();
      session.metrics.averageResponseTime =
        (session.metrics.averageResponseTime * (session.messages.length - 2) + responseTime) / (session.messages.length - 1);
    }

    console.log(`💬 Agent message from ${message.agentName}: ${message.content.substring(0, 100)}...`);

    // Emit real-time message event
    this.emit('agent_message', { sessionId: session.id, message });
  }

  /**
   * Check if conversation should terminate
   */
  private shouldTerminateConversation(session: ConversationSession): boolean {
    // Max messages reached
    if (session.messages.length >= this.config.maxMessages) {
      console.log(`🛑 Terminating: Max messages (${this.config.maxMessages}) reached`);
      return true;
    }

    // Consensus reached
    if (this.hasReachedConsensus(session)) {
      console.log(`🎯 Terminating: Consensus reached`);
      return true;
    }

    // All agents have contributed significantly
    if (this.allAgentsContributed(session)) {
      const lastMessages = session.messages.slice(-3);
      const recentConsensusIndicators = lastMessages.some(msg =>
        msg.content.toLowerCase().includes('consensus') ||
        msg.content.toLowerCase().includes('agreement') ||
        msg.content.toLowerCase().includes('conclusion')
      );

      if (recentConsensusIndicators) {
        console.log(`🤝 Terminating: All agents contributed with consensus indicators`);
        return true;
      }
    }

    return false;
  }

  /**
   * Check if consensus has been reached
   */
  private hasReachedConsensus(session: ConversationSession): boolean {
    if (session.messages.length < 6) return false; // Need at least 2 rounds

    const recentMessages = session.messages.slice(-6); // Last 6 messages
    const agentContributions = new Map<string, AgentMessage[]>();

    // Group recent messages by agent
    recentMessages.forEach(msg => {
      if (!agentContributions.has(msg.agentId)) {
        agentContributions.set(msg.agentId, []);
      }
      agentContributions.get(msg.agentId)!.push(msg);
    });

    // Check if agents are converging (high confidence + consensus keywords)
    const convergingAgents = Array.from(agentContributions.entries()).filter(([agentId, messages]) => {
      const latestMessage = messages[messages.length - 1];
      const hasConsensusKeywords = latestMessage.content.toLowerCase().match(
        /(agree|consensus|conclusion|recommend|final|decision)/
      );
      return latestMessage.confidence > 0.7 && hasConsensusKeywords;
    });

    return convergingAgents.length >= 2; // At least 2 agents agreeing
  }

  /**
   * Check if all agents have contributed meaningfully
   */
  private allAgentsContributed(session: ConversationSession): boolean {
    const agentMessageCounts = new Map<string, number>();

    session.messages.forEach(msg => {
      agentMessageCounts.set(msg.agentId, (agentMessageCounts.get(msg.agentId) || 0) + 1);
    });

    // Each agent should have at least 2 messages
    return this.config.requiredAgents.every(agentId =>
      (agentMessageCounts.get(agentId) || 0) >= 2
    );
  }

  /**
   * Terminate conversation and generate consensus
   */
  private async terminateConversation(session: ConversationSession): Promise<void> {
    try {
      session.status = 'generating_consensus';

      // Generate conversation consensus
      const consensus = await this.generateConsensus(session);
      session.consensus = consensus;
      session.metrics.consensusReached = true;
      session.metrics.timeToConsensus = Date.now() - session.metrics.startTime;

      session.status = 'completed';
      session.updatedAt = new Date();

      console.log(`🎯 Conversation completed: ${session.id}`);
      console.log(`📊 Consensus: ${consensus.decision} (${consensus.confidence}% confidence)`);

      this.emit('conversation_completed', { sessionId: session.id, consensus });

    } catch (error) {
      console.error(`Consensus generation failed:`, error);
      session.status = 'failed';
      this.emit('conversation_failed', { sessionId: session.id, error });
    }
  }

  /**
   * Generate conversation consensus from agent messages
   */
  private async generateConsensus(session: ConversationSession): Promise<ConversationConsensus> {
    try {
      const response = await fetch(`${this.backendEndpoint}/api/v1/conversations/${session.id}/consensus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Consensus generation failed: ${response.statusText}`);
      }

      const consensusData = await response.json();

      return {
        decision: consensusData.decision,
        confidence: consensusData.confidence,
        reasoning: consensusData.reasoning,
        keyPoints: consensusData.key_points || [],
        agentAgreement: consensusData.agent_agreement || {},
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Backend consensus generation failed:', error);

      // Fallback: Generate basic consensus from messages
      return this.generateFallbackConsensus(session);
    }
  }

  /**
   * Generate fallback consensus when backend fails
   */
  private generateFallbackConsensus(session: ConversationSession): ConversationConsensus {
    const agentDecisions = new Map<string, { decision: string; confidence: number }>();

    // Analyze final messages from each agent
    this.config.requiredAgents.forEach(agentId => {
      const agentMessages = session.messages.filter(msg => msg.agentId === agentId);
      if (agentMessages.length > 0) {
        const lastMessage = agentMessages[agentMessages.length - 1];

        // Simple sentiment analysis for decision
        const content = lastMessage.content.toLowerCase();
        let decision = 'neutral';

        if (content.includes('risk-off') || content.includes('defensive') || content.includes('bearish')) {
          decision = 'risk-off';
        } else if (content.includes('risk-on') || content.includes('bullish') || content.includes('growth')) {
          decision = 'risk-on';
        }

        agentDecisions.set(agentId, {
          decision,
          confidence: lastMessage.confidence
        });
      }
    });

    // Calculate overall consensus
    const decisions = Array.from(agentDecisions.values());
    const avgConfidence = decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length;

    const decisionCounts = new Map<string, number>();
    decisions.forEach(d => {
      decisionCounts.set(d.decision, (decisionCounts.get(d.decision) || 0) + 1);
    });

    const majoritydecision = Array.from(decisionCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'mixed';

    return {
      decision: majoritydecision,
      confidence: Math.round(avgConfidence),
      reasoning: `Fallback consensus based on agent message analysis. ${decisions.length} agents participated.`,
      keyPoints: [`Majority decision: ${majoritydecision}`, `Average confidence: ${avgConfidence.toFixed(1)}%`],
      agentAgreement: Object.fromEntries(agentDecisions),
      timestamp: new Date()
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up finished sessions
   */
  cleanup(): void {
    const expiredSessions = Array.from(this.activeSessions.entries())
      .filter(([_, session]) =>
        session.status === 'completed' ||
        session.status === 'failed' ||
        (Date.now() - session.createdAt.getTime()) > 300000 // 5 minutes
      );

    expiredSessions.forEach(([sessionId, session]) => {
      // Close WebSocket if still open
      if ((session as any).ws) {
        (session as any).ws.close();
      }

      this.activeSessions.delete(sessionId);
      console.log(`🧹 Cleaned up session: ${sessionId}`);
    });
  }

  /**
   * Get orchestrator metrics
   */
  getMetrics(): {
    activeSessions: number;
    totalSessions: number;
    averageSessionDuration: number;
    consensusSuccessRate: number;
  } {
    const sessions = Array.from(this.activeSessions.values());
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const totalDuration = completedSessions.reduce((sum, s) =>
      sum + (s.metrics.timeToConsensus || 0), 0
    );

    return {
      activeSessions: sessions.filter(s => s.status === 'active').length,
      totalSessions: sessions.length,
      averageSessionDuration: completedSessions.length > 0 ?
        totalDuration / completedSessions.length : 0,
      consensusSuccessRate: completedSessions.length > 0 ?
        completedSessions.filter(s => s.metrics.consensusReached).length / completedSessions.length : 0
    };
  }
}

// Export singleton instance
export const conversationOrchestrator = new ConversationOrchestrator();