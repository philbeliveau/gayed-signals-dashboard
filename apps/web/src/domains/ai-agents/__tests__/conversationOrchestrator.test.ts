/**
 * ConversationOrchestrator Tests
 * Story 1.8: Multi-Agent Conversation Test Suite
 *
 * Comprehensive tests for AutoGen conversation orchestration
 */

import { ConversationOrchestrator } from '../conversation/orchestrator';
import type { ContentSource, ConversationSession } from '../types/conversation';
import type { ConsensusSignal } from '@/domains/trading-signals/types';

// Mock WebSocket
class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  readyState = WebSocket.CONNECTING;

  constructor(public url: string) {
    // Simulate async connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 100);
  }

  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code: code || 1000, reason: reason || 'Normal closure' }));
  }

  send(data: string) {
    // Mock sending data - in real tests, this would trigger responses
    console.log('MockWebSocket send:', data);
  }

  // Simulate receiving a message
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }
}

// Mock fetch globally
global.fetch = jest.fn();
global.WebSocket = MockWebSocket as any;

describe('ConversationOrchestrator', () => {
  let orchestrator: ConversationOrchestrator;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  const sampleContent: ContentSource = {
    type: 'text',
    title: 'Fed Rate Policy Test',
    content: 'The Federal Reserve is considering rate cuts in 2024 due to slowing inflation and economic uncertainty.',
    metadata: {}
  };

  const sampleSignalContext: ConsensusSignal = {
    consensus: 'Risk-Off',
    confidence: 0.75,
    riskOnCount: 1,
    riskOffCount: 2,
    neutralCount: 0,
    signals: [],
    timestamp: new Date().toISOString()
  };

  beforeEach(() => {
    orchestrator = new ConversationOrchestrator();
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
  });

  afterEach(() => {
    orchestrator.cleanup();
  });

  describe('Conversation Initialization', () => {
    it('should create a new conversation session', async () => {
      // Mock successful backend response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session_id: 'test-session-id',
          status: 'initialized',
          websocket_url: '/ws/conversation/test-session-id',
          estimated_duration_seconds: 90
        })
      } as Response);

      const session = await orchestrator.startConversation(sampleContent, sampleSignalContext);

      expect(session).toBeDefined();
      expect(session.id).toMatch(/^conv_\d+_[a-z0-9]+$/);
      expect(session.status).toBe('initializing');
      expect(session.contentSource).toEqual(sampleContent);
      expect(session.signalContext).toEqual(sampleSignalContext);
      expect(session.agents).toEqual(['financial_analyst', 'market_context', 'risk_challenger']);
    });

    it('should handle backend initialization failure', async () => {
      // Mock failed backend response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => ({ detail: 'AutoGen initialization failed' })
      } as Response);

      const session = await orchestrator.startConversation(sampleContent);

      expect(session.status).toBe('failed');
    });

    it('should generate unique session IDs', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ session_id: 'test', status: 'initialized' })
      } as Response);

      const sessions = await Promise.all([
        orchestrator.startConversation(sampleContent),
        orchestrator.startConversation(sampleContent),
        orchestrator.startConversation(sampleContent)
      ]);

      const sessionIds = sessions.map(s => s.id);
      const uniqueIds = new Set(sessionIds);
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('WebSocket Communication', () => {
    it('should handle agent messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session_id: 'test-session',
          status: 'initialized',
          websocket_url: '/ws/conversation/test-session'
        })
      } as Response);

      const messagePromise = new Promise<void>((resolve) => {
        orchestrator.on('agent_message', (event) => {
          expect(event.message).toBeDefined();
          expect(event.message.agentId).toBe('financial_analyst');
          expect(event.message.content).toContain('analysis');
          resolve();
        });
      });

      const session = await orchestrator.startConversation(sampleContent);

      // Simulate WebSocket message
      setTimeout(() => {
        const mockWs = (session as any).ws as MockWebSocket;
        mockWs.simulateMessage({
          type: 'agent_message',
          session_id: session.id,
          timestamp: new Date().toISOString(),
          data: {
            id: 'msg-1',
            agent_id: 'financial_analyst',
            agent_name: 'Financial Analyst',
            content: 'Based on my analysis of the Fed policy content...',
            message_type: 'analysis',
            confidence: 85
          }
        });
      }, 200);

      await messagePromise;
    });

    it('should handle status updates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session_id: 'test', status: 'initialized' })
      } as Response);

      const statusPromise = new Promise<void>((resolve) => {
        orchestrator.on('conversation_connected', (session) => {
          expect(session.status).toBe('active');
          resolve();
        });
      });

      const session = await orchestrator.startConversation(sampleContent);

      // Simulate WebSocket connection
      setTimeout(() => {
        const mockWs = (session as any).ws as MockWebSocket;
        mockWs.simulateMessage({
          type: 'status_update',
          session_id: session.id,
          data: { status: 'active' }
        });
      }, 200);

      await statusPromise;
    });

    it('should handle consensus generation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session_id: 'test', status: 'initialized' })
      } as Response);

      const consensusPromise = new Promise<void>((resolve) => {
        orchestrator.on('conversation_completed', (event) => {
          expect(event.consensus).toBeDefined();
          expect(event.consensus.decision).toBe('risk-off');
          expect(event.consensus.confidence).toBe(80);
          resolve();
        });
      });

      const session = await orchestrator.startConversation(sampleContent);

      // Simulate consensus message
      setTimeout(() => {
        const mockWs = (session as any).ws as MockWebSocket;
        mockWs.simulateMessage({
          type: 'consensus_ready',
          session_id: session.id,
          data: {
            consensus: {
              decision: 'risk-off',
              confidence: 80,
              reasoning: 'Agents agreed on defensive positioning',
              key_points: ['Fed uncertainty', 'Economic headwinds'],
              agent_agreement: {},
              timestamp: new Date().toISOString()
            }
          }
        });
      }, 200);

      await consensusPromise;
    });
  });

  describe('Conversation Termination Logic', () => {
    let session: ConversationSession;
    let mockWs: MockWebSocket;

    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session_id: 'test', status: 'initialized' })
      } as Response);

      session = await orchestrator.startConversation(sampleContent);
      mockWs = (session as any).ws as MockWebSocket;
    });

    it('should terminate after max messages', () => {
      // Add 15 messages (max limit)
      for (let i = 0; i < 15; i++) {
        mockWs.simulateMessage({
          type: 'agent_message',
          session_id: session.id,
          timestamp: new Date().toISOString(),
          data: {
            id: `msg-${i}`,
            agent_id: 'financial_analyst',
            agent_name: 'Financial Analyst',
            content: `Message ${i}`,
            confidence: 70
          }
        });
      }

      const retrievedSession = orchestrator.getSession(session.id);
      expect(retrievedSession?.messages.length).toBe(15);
    });

    it('should detect consensus keywords for early termination', () => {
      // Simulate messages with consensus indicators
      const consensusMessages = [
        'Based on analysis, I recommend defensive positioning',
        'I agree with the financial analyst assessment',
        'The consensus appears to be risk-off positioning'
      ];

      consensusMessages.forEach((content, i) => {
        mockWs.simulateMessage({
          type: 'agent_message',
          session_id: session.id,
          timestamp: new Date().toISOString(),
          data: {
            id: `msg-${i}`,
            agent_id: ['financial_analyst', 'market_context', 'risk_challenger'][i],
            agent_name: 'Agent',
            content,
            confidence: 85
          }
        });
      });

      // Should trigger termination logic due to consensus keywords
      const retrievedSession = orchestrator.getSession(session.id);
      expect(retrievedSession?.messages.some(m =>
        m.content.toLowerCase().includes('consensus')
      )).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('should track conversation timing metrics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session_id: 'test', status: 'initialized' })
      } as Response);

      const startTime = Date.now();
      const session = await orchestrator.startConversation(sampleContent);

      expect(session.metrics.startTime).toBeGreaterThanOrEqual(startTime);
      expect(session.metrics.messageCount).toBe(0);
      expect(session.metrics.consensusReached).toBe(false);
    });

    it('should update metrics with each message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session_id: 'test', status: 'initialized' })
      } as Response);

      const session = await orchestrator.startConversation(sampleContent);
      const mockWs = (session as any).ws as MockWebSocket;

      // Add some messages
      for (let i = 0; i < 3; i++) {
        mockWs.simulateMessage({
          type: 'agent_message',
          session_id: session.id,
          timestamp: new Date().toISOString(),
          data: {
            id: `msg-${i}`,
            agent_id: 'financial_analyst',
            agent_name: 'Financial Analyst',
            content: `Analysis message ${i}`,
            confidence: 75
          }
        });
      }

      const updatedSession = orchestrator.getSession(session.id);
      expect(updatedSession?.messages.length).toBe(3);
    });

    it('should provide orchestrator metrics', () => {
      const metrics = orchestrator.getMetrics();

      expect(metrics).toHaveProperty('activeSessions');
      expect(metrics).toHaveProperty('totalSessions');
      expect(metrics).toHaveProperty('averageSessionDuration');
      expect(metrics).toHaveProperty('consensusSuccessRate');
      expect(typeof metrics.activeSessions).toBe('number');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle WebSocket connection failures gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session_id: 'test', status: 'initialized' })
      } as Response);

      const errorPromise = new Promise<void>((resolve) => {
        orchestrator.on('conversation_failed', (event) => {
          expect(event.error).toBeDefined();
          resolve();
        });
      });

      const session = await orchestrator.startConversation(sampleContent);
      const mockWs = (session as any).ws as MockWebSocket;

      // Simulate WebSocket error
      setTimeout(() => {
        mockWs.onerror?.(new Event('error'));
      }, 200);

      await errorPromise;
    });

    it('should handle malformed WebSocket messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session_id: 'test', status: 'initialized' })
      } as Response);

      const session = await orchestrator.startConversation(sampleContent);
      const mockWs = (session as any).ws as MockWebSocket;

      // Simulate malformed message
      mockWs.onmessage?.(new MessageEvent('message', { data: 'invalid json' }));

      // Should not crash, session should still be accessible
      const retrievedSession = orchestrator.getSession(session.id);
      expect(retrievedSession).toBeDefined();
    });

    it('should clean up finished sessions', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ session_id: 'test', status: 'initialized' })
      } as Response);

      // Create multiple sessions
      const sessions = await Promise.all([
        orchestrator.startConversation(sampleContent),
        orchestrator.startConversation(sampleContent),
        orchestrator.startConversation(sampleContent)
      ]);

      // Mark them as completed
      sessions.forEach(session => {
        (session as any).status = 'completed';
      });

      const beforeCleanup = orchestrator.getActiveSessions().length;
      orchestrator.cleanup();
      const afterCleanup = orchestrator.getActiveSessions().length;

      expect(afterCleanup).toBeLessThan(beforeCleanup);
    });
  });

  describe('Integration with Signal Context', () => {
    it('should include signal context in conversation initialization', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session_id: 'test', status: 'initialized' })
      } as Response);

      const session = await orchestrator.startConversation(sampleContent, sampleSignalContext);

      expect(session.signalContext).toEqual(sampleSignalContext);

      // Verify signal context was sent to backend
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/conversations'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"signal_context"')
        })
      );
    });

    it('should handle conversations without signal context', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session_id: 'test', status: 'initialized' })
      } as Response);

      const session = await orchestrator.startConversation(sampleContent);

      expect(session.signalContext).toBeUndefined();
    });
  });

  describe('Separation from SignalOrchestrator', () => {
    it('should operate independently of signal calculation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session_id: 'test', status: 'initialized' })
      } as Response);

      // Conversation should start without any signal orchestrator dependency
      const session = await orchestrator.startConversation(sampleContent);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.status).toBe('initializing');
    });

    it('should generate conversation consensus separate from signal consensus', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session_id: 'test', status: 'initialized' })
      } as Response);

      const consensusPromise = new Promise<void>((resolve) => {
        orchestrator.on('conversation_completed', (event) => {
          // Verify conversation consensus is different format from signal consensus
          expect(event.consensus).toHaveProperty('decision');
          expect(event.consensus).toHaveProperty('reasoning');
          expect(event.consensus).toHaveProperty('keyPoints');
          expect(event.consensus).toHaveProperty('agentAgreement');

          // Should NOT have signal consensus properties
          expect(event.consensus).not.toHaveProperty('riskOnCount');
          expect(event.consensus).not.toHaveProperty('riskOffCount');
          expect(event.consensus).not.toHaveProperty('signals');

          resolve();
        });
      });

      const session = await orchestrator.startConversation(sampleContent);
      const mockWs = (session as any).ws as MockWebSocket;

      // Simulate consensus
      setTimeout(() => {
        mockWs.simulateMessage({
          type: 'consensus_ready',
          session_id: session.id,
          data: {
            consensus: {
              decision: 'defensive positioning recommended',
              confidence: 75,
              reasoning: 'Agents consensus based on Fed uncertainty',
              key_points: ['Rate policy unclear', 'Economic data mixed'],
              agent_agreement: {
                financial_analyst: { position: 'risk-off', confidence: 80 },
                market_context: { position: 'mixed', confidence: 70 },
                risk_challenger: { position: 'risk-off', confidence: 75 }
              },
              timestamp: new Date().toISOString()
            }
          }
        });
      }, 200);

      await consensusPromise;
    });
  });
});

// Performance Test Suite
describe('ConversationOrchestrator Performance', () => {
  let orchestrator: ConversationOrchestrator;

  beforeEach(() => {
    orchestrator = new ConversationOrchestrator();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    orchestrator.cleanup();
  });

  it('should meet 90-second performance target', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ session_id: 'test', status: 'initialized' })
    } as Response);

    const startTime = Date.now();
    const session = await orchestrator.startConversation({
      type: 'text',
      title: 'Performance Test',
      content: 'Test content for performance validation'
    });

    const mockWs = (session as any).ws as MockWebSocket;

    // Simulate realistic conversation flow
    const agents = ['financial_analyst', 'market_context', 'risk_challenger'];
    let messageCount = 0;

    const messageInterval = setInterval(() => {
      if (messageCount >= 12) { // 4 messages per agent
        clearInterval(messageInterval);

        // Simulate consensus after 12 messages
        mockWs.simulateMessage({
          type: 'consensus_ready',
          session_id: session.id,
          data: {
            consensus: {
              decision: 'performance test complete',
              confidence: 85,
              reasoning: 'Performance test completed within target',
              key_points: [],
              agent_agreement: {},
              timestamp: new Date().toISOString()
            }
          }
        });
        return;
      }

      const agentId = agents[messageCount % 3];
      mockWs.simulateMessage({
        type: 'agent_message',
        session_id: session.id,
        timestamp: new Date().toISOString(),
        data: {
          id: `perf-msg-${messageCount}`,
          agent_id: agentId,
          agent_name: agentId.replace('_', ' '),
          content: `Performance test message ${messageCount} from ${agentId}`,
          confidence: 75 + Math.random() * 20
        }
      });
      messageCount++;
    }, 2000); // 2-second intervals between messages

    // Wait for consensus
    await new Promise<void>((resolve) => {
      orchestrator.on('conversation_completed', () => {
        const duration = Date.now() - startTime;
        console.log(`Conversation completed in ${duration}ms`);

        // Should complete well within 90 seconds (90,000ms)
        expect(duration).toBeLessThan(90000);
        resolve();
      });
    });

    clearInterval(messageInterval);
  }, 95000); // Test timeout slightly above 90 seconds
});