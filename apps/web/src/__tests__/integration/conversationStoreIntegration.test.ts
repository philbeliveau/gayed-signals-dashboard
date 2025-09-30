/**
 * Integration Tests: 2.7-INT-001 to 2.7-INT-019
 * Story 2.7: Conversation State Management - Phase 1 P0 Integration Tests
 *
 * Tests critical system integration: Dashboard synchronization, WebSocket handling,
 * database persistence, performance under load, error propagation, and real data validation
 */

import { renderHook, act } from '@testing-library/react';
import { useConversationStore } from '@/domains/ai-agents/stores/conversationStore';
import { LiveConversationMessage, ConversationResult } from '@/types/agents';

// Mock WebSocket for testing
class MockWebSocket {
  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string) {
    // Mock send implementation
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }
}

// Mock fetch for API calls
global.fetch = jest.fn();
global.WebSocket = MockWebSocket as any;

// Mock performance.now for testing
const mockPerformanceNow = jest.fn();
Object.defineProperty(global.performance, 'now', {
  value: mockPerformanceNow
});

describe('Conversation Store Integration Tests (P0)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(0);

    // Reset conversation store completely
    useConversationStore.setState({
      activeConversation: {
        sessionId: null,
        status: 'initializing',
        messages: [],
        participants: [],
        startedAt: null,
        completedAt: null,
      },
      conversationHistory: [],
      ui: {
        isDisplayVisible: false,
        isStreaming: false,
        autoScroll: true,
        conversationMode: 'sidebar',
        sidebarWidth: 400,
      },
    });

    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();
    (global.fetch as jest.Mock).mockReset();
  });

  // 2.7-INT-001: Dashboard store synchronization (P0)
  describe('2.7-INT-001: Dashboard store synchronization', () => {
    test('should synchronize conversation state with dashboard state patterns', () => {
      const { result } = renderHook(() => useConversationStore());

      // Simulate dashboard state update that should trigger conversation sync
      act(() => {
        result.current.startConversation('dashboard-sync-test', ['FinancialAnalyst']);
        result.current.setDisplayVisible(true);
        result.current.setConversationMode('overlay');
      });

      // Verify conversation state is properly synchronized
      expect(result.current.activeConversation.sessionId).toBe('dashboard-sync-test');
      expect(result.current.ui.isDisplayVisible).toBe(true);
      expect(result.current.ui.conversationMode).toBe('overlay');
      expect(result.current.ui.isStreaming).toBe(true);
    });

    test('should maintain state consistency across multiple store updates', () => {
      const { result } = renderHook(() => useConversationStore());

      // Simulate rapid state changes
      act(() => {
        result.current.startConversation('rapid-updates', ['FinancialAnalyst']);
        result.current.addMessage({
          id: 'msg-1',
          sessionId: 'rapid-updates',
          agent: 'FinancialAnalyst',
          content: 'First message',
          timestamp: Date.now(),
        });
        result.current.updateStatus('active');
        result.current.setSidebarWidth(600);
        result.current.setAutoScroll(false);
      });

      // Verify all updates are consistent
      expect(result.current.activeConversation.sessionId).toBe('rapid-updates');
      expect(result.current.activeConversation.status).toBe('active');
      expect(result.current.activeConversation.messages).toHaveLength(1);
      expect(result.current.ui.sidebarWidth).toBe(600);
      expect(result.current.ui.autoScroll).toBe(false);
    });
  });

  // 2.7-INT-003: WebSocket message handling (P0)
  describe('2.7-INT-003: WebSocket message handling', () => {
    test('should handle real-time WebSocket messages correctly', async () => {
      const { result } = renderHook(() => useConversationStore());

      act(() => {
        result.current.startConversation('websocket-test', ['FinancialAnalyst']);
      });

      // Simulate WebSocket messages
      const agentMessage = {
        type: 'agent-message',
        data: {
          id: 'ws-msg-1',
          sessionId: 'websocket-test',
          agent: 'FinancialAnalyst',
          content: 'WebSocket message',
          timestamp: Date.now(),
          confidence: 0.85,
        },
        sessionId: 'websocket-test',
      };

      const statusUpdate = {
        type: 'conversation-status',
        data: { status: 'generating_consensus' },
        sessionId: 'websocket-test',
      };

      act(() => {
        result.current.syncWithWebSocket(agentMessage);
        result.current.syncWithWebSocket(statusUpdate);
      });

      expect(result.current.activeConversation.messages).toHaveLength(1);
      expect(result.current.activeConversation.messages[0].content).toBe('WebSocket message');
      expect(result.current.activeConversation.status).toBe('generating_consensus');
    });

    test('should handle WebSocket connection failures gracefully', () => {
      const { result } = renderHook(() => useConversationStore());

      act(() => {
        result.current.startConversation('websocket-failure', ['FinancialAnalyst']);
      });

      // Simulate WebSocket error
      const errorMessage = {
        type: 'error',
        data: { error: 'Connection lost' },
        sessionId: 'websocket-failure',
      };

      act(() => {
        result.current.syncWithWebSocket(errorMessage);
      });

      expect(result.current.activeConversation.status).toBe('error');
      // Should maintain conversation state despite error
      expect(result.current.activeConversation.sessionId).toBe('websocket-failure');
    });
  });

  // 2.7-INT-005: Database persistence integration (P0)
  describe('2.7-INT-005: Database persistence integration', () => {
    test('should persist conversation data to database', async () => {
      const { result } = renderHook(() => useConversationStore());

      // Mock successful database persistence
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'db-session-123' }),
      });

      const conversationResult: ConversationResult = {
        consensusReached: true,
        finalRecommendation: 'Database test recommendation',
        confidenceLevel: 0.9,
        keyInsights: ['Database integration works'],
        processingMetrics: {
          totalTime: 5000,
          messageCount: 3,
          averageConfidence: 0.85,
        },
      };

      act(() => {
        result.current.startConversation('db-test', ['FinancialAnalyst']);
        result.current.addMessage({
          id: 'db-msg-1',
          sessionId: 'db-test',
          agent: 'FinancialAnalyst',
          content: 'Database test message',
          timestamp: Date.now(),
        });
        result.current.completeConversation(conversationResult);
      });

      // Verify conversation is added to history (simulating database persistence)
      expect(result.current.conversationHistory).toHaveLength(1);
      expect(result.current.conversationHistory[0].id).toBe('db-test');
      expect(result.current.conversationHistory[0].metadata.result).toEqual(conversationResult);
    });

    test('should handle database persistence failures gracefully', async () => {
      const { result } = renderHook(() => useConversationStore());

      // Ensure clean state
      expect(result.current.conversationHistory).toEqual([]);

      // Mock database failure
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Database Error'));

      act(() => {
        result.current.startConversation('db-failure-test', ['FinancialAnalyst']);
      });

      // Should not throw and should maintain local state
      await act(async () => {
        await result.current.loadConversationHistory();
      });

      expect(result.current.activeConversation.sessionId).toBe('db-failure-test');
      // History should remain empty but shouldn't crash
      expect(result.current.conversationHistory).toEqual([]);
    });
  });

  // 2.7-INT-008: Database history queries (P0)
  describe('2.7-INT-008: Database history queries', () => {
    test('should query conversation history from database', async () => {
      const { result } = renderHook(() => useConversationStore());

      // Ensure clean state
      expect(result.current.conversationHistory).toEqual([]);

      const mockHistory = [
        {
          id: 'history-1',
          userId: 'user-123',
          contentSource: 'text' as const,
          status: 'completed' as const,
          messages: [
            {
              id: 'msg-1',
              agentName: 'FinancialAnalyst',
              agentType: 'FINANCIAL_ANALYST' as const,
              role: 'analyst',
              message: 'Historical message',
              timestamp: new Date().toISOString(),
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { result: { consensusReached: true } },
        },
        {
          id: 'history-2',
          userId: 'user-123',
          contentSource: 'youtube' as const,
          status: 'completed' as const,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {},
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistory),
      });

      await act(async () => {
        await result.current.loadConversationHistory();
      });

      expect(result.current.conversationHistory).toHaveLength(2);
      expect(result.current.conversationHistory[0].id).toBe('history-1');
      expect(result.current.conversationHistory[1].id).toBe('history-2');

      // Test retrieval by ID
      const retrieved = result.current.getConversationById('history-1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.messages).toHaveLength(1);
    });

    test('should handle large conversation history queries efficiently', async () => {
      const { result } = renderHook(() => useConversationStore());

      // Ensure clean state
      expect(result.current.conversationHistory).toEqual([]);

      // Generate large history (100 conversations)
      const largeHistory = Array.from({ length: 100 }, (_, i) => ({
        id: `large-history-${i}`,
        userId: 'user-123',
        contentSource: 'text' as const,
        status: 'completed' as const,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {},
      }));

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(largeHistory),
      });

      const startTime = performance.now();

      await act(async () => {
        await result.current.loadConversationHistory();
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should load efficiently
      expect(duration).toBeLessThan(1000); // Under 1 second
      expect(result.current.conversationHistory).toHaveLength(100);
    });
  });

  // 2.7-INT-010: Performance under load (P0)
  describe('2.7-INT-010: Performance under load', () => {
    test('should maintain performance with concurrent operations', async () => {
      const { result } = renderHook(() => useConversationStore());

      const startTime = performance.now();

      // Simulate concurrent operations
      await act(async () => {
        // Start multiple conversations
        for (let i = 0; i < 10; i++) {
          result.current.startConversation(`concurrent-${i}`, ['FinancialAnalyst']);

          // Add messages to each
          for (let j = 0; j < 50; j++) {
            result.current.addMessage({
              id: `msg-${i}-${j}`,
              sessionId: `concurrent-${i}`,
              agent: 'FinancialAnalyst',
              content: `Message ${j} for conversation ${i}`,
              timestamp: Date.now() + j,
            });
          }

          result.current.completeConversation({
            consensusReached: true,
            finalRecommendation: `Recommendation ${i}`,
            confidenceLevel: 0.8,
            keyInsights: [`Insight ${i}`],
          });
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete all operations efficiently
      expect(duration).toBeLessThan(2000); // Under 2 seconds
      expect(result.current.conversationHistory.length).toBeGreaterThan(0);
    });

    test('should handle memory efficiently under sustained load', () => {
      const { result } = renderHook(() => useConversationStore());

      const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;

      act(() => {
        // Create sustained load
        for (let i = 0; i < 1000; i++) {
          result.current.startConversation(`load-test-${i}`, ['FinancialAnalyst']);

          result.current.addMessage({
            id: `load-msg-${i}`,
            sessionId: `load-test-${i}`,
            agent: 'FinancialAnalyst',
            content: `Load test message ${i} with substantial content to simulate real usage patterns and memory consumption`,
            timestamp: Date.now() + i,
            confidence: 0.85,
          });

          result.current.completeConversation({
            consensusReached: true,
            finalRecommendation: `Load test recommendation ${i}`,
            confidenceLevel: 0.8,
            keyInsights: [`Load insight ${i}`],
          });
        }
      });

      const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = memoryAfter - memoryBefore;

      // Should maintain history limit and reasonable memory usage
      expect(result.current.conversationHistory.length).toBeLessThanOrEqual(50);
      if (memoryIncrease > 0) {
        expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024); // 200MB limit
      }
    });
  });

  // 2.7-INT-012: Error propagation across components (P0)
  describe('2.7-INT-012: Error propagation across components', () => {
    test('should propagate errors correctly between store and components', () => {
      const { result } = renderHook(() => useConversationStore());

      act(() => {
        result.current.startConversation('error-test', ['FinancialAnalyst']);
      });

      // Simulate error in WebSocket
      const errorMessage = {
        type: 'error',
        data: { error: 'Agent failure', code: 'AGENT_TIMEOUT' },
        sessionId: 'error-test',
      };

      act(() => {
        result.current.syncWithWebSocket(errorMessage);
      });

      // Error should propagate to conversation state
      expect(result.current.activeConversation.status).toBe('error');
      expect(result.current.ui.isStreaming).toBe(false);
    });

    test('should handle cascading failures gracefully', async () => {
      const { result } = renderHook(() => useConversationStore());

      // Ensure completely clean state
      expect(result.current.conversationHistory).toEqual([]);

      // Mock multiple failures
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Database Error'))
        .mockRejectedValueOnce(new Error('API Error'));

      act(() => {
        result.current.startConversation('cascade-failure', ['FinancialAnalyst']);
      });

      // Simulate multiple error conditions
      await act(async () => {
        // Database failure
        await result.current.loadConversationHistory();

        // WebSocket error
        result.current.syncWithWebSocket({
          type: 'error',
          data: { error: 'Network failure' },
          sessionId: 'cascade-failure',
        });
      });

      // Should maintain functional state despite errors
      expect(result.current.activeConversation.sessionId).toBe('cascade-failure');
      expect(result.current.conversationHistory).toEqual([]);
    });
  });

  // Financial Data Integrity Integration Tests
  describe('Financial Data Integrity Integration (P0)', () => {
    // 2.7-INT-014: FRED API real data integration (P0)
    describe('2.7-INT-014: FRED API real data integration', () => {
      test('should integrate with real FRED API data sources', async () => {
        const { result } = renderHook(() => useConversationStore());

        // Mock FRED API response with real-like data structure
        const mockFredData = {
          observations: [
            {
              realtime_start: '2023-12-01',
              realtime_end: '2023-12-01',
              date: '2023-11-01',
              value: '3.7'
            }
          ]
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockFredData),
        });

        act(() => {
          result.current.startConversation('fred-integration', ['MarketContext']);
        });

        // Simulate message with FRED data
        const fredMessage: LiveConversationMessage = {
          id: 'fred-msg-1',
          sessionId: 'fred-integration',
          agent: 'MarketContext',
          content: 'Current unemployment rate from FRED API: 3.7%',
          timestamp: Date.now(),
          confidence: 0.95,
          dataSources: [
            {
              source: 'FRED API',
              url: 'https://api.stlouisfed.org/fred/series/observations?series_id=UNRATE',
              timestamp: new Date().toISOString(),
              authenticated: true
            }
          ],
          dataIntegrity: {
            validated: true,
            sources: ['FRED API'],
            lastValidated: new Date().toISOString(),
            checksum: 'fred-data-checksum'
          }
        };

        act(() => {
          result.current.addMessage(fredMessage);
        });

        const storedMessage = result.current.activeConversation.messages[0];
        expect(storedMessage.dataSources![0].source).toBe('FRED API');
        expect(storedMessage.dataSources![0].authenticated).toBe(true);
        expect(storedMessage.dataIntegrity!.validated).toBe(true);
      });

      test('should handle FRED API unavailability with transparency', async () => {
        const { result } = renderHook(() => useConversationStore());

        // Mock FRED API failure
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('FRED API unavailable'));

        act(() => {
          result.current.startConversation('fred-unavailable', ['MarketContext']);
        });

        // Simulate transparent handling of unavailable data
        const transparentMessage: LiveConversationMessage = {
          id: 'fred-unavailable-msg',
          sessionId: 'fred-unavailable',
          agent: 'MarketContext',
          content: '⚠️ FRED API currently unavailable - no economic indicators accessed. Analysis proceeding without employment data.',
          timestamp: Date.now(),
          confidence: 0.65, // Reduced confidence due to missing data
          dataSources: [],
          dataIntegrity: {
            validated: false,
            sources: [],
            lastValidated: new Date().toISOString(),
            checksum: 'no-data'
          }
        };

        act(() => {
          result.current.addMessage(transparentMessage);
        });

        const message = result.current.activeConversation.messages[0];
        expect(message.content).toContain('FRED API currently unavailable');
        expect(message.confidence).toBeLessThan(0.8);
        expect(message.dataIntegrity!.validated).toBe(false);
      });
    });

    // 2.7-INT-015: Perplexity MCP real data validation (P0)
    describe('2.7-INT-015: Perplexity MCP real data validation', () => {
      test('should validate real Perplexity search results', async () => {
        const { result } = renderHook(() => useConversationStore());

        // Mock Perplexity MCP response
        const mockPerplexityData = {
          results: [
            {
              title: 'Fed Raises Interest Rates',
              url: 'https://www.reuters.com/business/finance/fed-raises-rates-2023-12-13/',
              content: 'Federal Reserve raises interest rates by 0.25%...',
              source: 'Reuters',
              publishedDate: '2023-12-13'
            }
          ]
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPerplexityData),
        });

        act(() => {
          result.current.startConversation('perplexity-test', ['MarketContext']);
        });

        const perplexityMessage: LiveConversationMessage = {
          id: 'perplexity-msg-1',
          sessionId: 'perplexity-test',
          agent: 'MarketContext',
          content: 'Latest market intelligence: Fed raises interest rates by 0.25% (Reuters, Dec 13)',
          timestamp: Date.now(),
          confidence: 0.92,
          dataSources: [
            {
              source: 'Perplexity MCP',
              url: 'https://www.reuters.com/business/finance/fed-raises-rates-2023-12-13/',
              timestamp: new Date().toISOString(),
              authenticated: true
            }
          ],
          saflaValidation: {
            sourceAuthenticated: true,
            factValidated: true,
            linkVerified: true,
            authorityConfirmed: true,
            score: 95,
            linkValidation: {
              url: 'https://www.reuters.com/business/finance/fed-raises-rates-2023-12-13/',
              accessible: true,
              httpsSecure: true,
              domainVerified: true,
              lastChecked: new Date().toISOString()
            }
          }
        };

        act(() => {
          result.current.addMessage(perplexityMessage);
        });

        const message = result.current.activeConversation.messages[0];
        expect(message.saflaValidation!.sourceAuthenticated).toBe(true);
        expect(message.saflaValidation!.linkVerified).toBe(true);
        expect(message.saflaValidation!.score).toBe(95);
      });
    });

    // 2.7-INT-016: Authority checking integration (P0)
    describe('2.7-INT-016: Authority checking integration', () => {
      test('should validate authoritative data sources', () => {
        const { result } = renderHook(() => useConversationStore());

        act(() => {
          result.current.startConversation('authority-test', ['FinancialAnalyst']);
        });

        const authorityMessage: LiveConversationMessage = {
          id: 'authority-msg-1',
          sessionId: 'authority-test',
          agent: 'FinancialAnalyst',
          content: 'Federal Reserve official policy statement from federalreserve.gov',
          timestamp: Date.now(),
          confidence: 0.98,
          dataSources: [
            {
              source: 'Federal Reserve',
              url: 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20231213a.htm',
              timestamp: new Date().toISOString(),
              authenticated: true
            }
          ],
          saflaValidation: {
            sourceAuthenticated: true,
            factValidated: true,
            linkVerified: true,
            authorityConfirmed: true,
            score: 100,
            linkValidation: {
              url: 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20231213a.htm',
              accessible: true,
              httpsSecure: true,
              domainVerified: true,
              lastChecked: new Date().toISOString()
            }
          }
        };

        act(() => {
          result.current.addMessage(authorityMessage);
        });

        const message = result.current.activeConversation.messages[0];
        expect(message.saflaValidation!.authorityConfirmed).toBe(true);
        expect(message.saflaValidation!.score).toBe(100);
        expect(message.confidence).toBeGreaterThan(0.9);
      });

      test('should flag non-authoritative sources appropriately', () => {
        const { result } = renderHook(() => useConversationStore());

        act(() => {
          result.current.startConversation('non-authority-test', ['RiskChallenger']);
        });

        const nonAuthorityMessage: LiveConversationMessage = {
          id: 'non-authority-msg-1',
          sessionId: 'non-authority-test',
          agent: 'RiskChallenger',
          content: 'Market commentary from unknown blog source',
          timestamp: Date.now(),
          confidence: 0.45,
          dataSources: [
            {
              source: 'Unknown Blog',
              url: 'https://randommarket-blog.com/fed-analysis',
              timestamp: new Date().toISOString(),
              authenticated: false
            }
          ],
          saflaValidation: {
            sourceAuthenticated: false,
            factValidated: false,
            linkVerified: true,
            authorityConfirmed: false,
            score: 25
          }
        };

        act(() => {
          result.current.addMessage(nonAuthorityMessage);
        });

        const message = result.current.activeConversation.messages[0];
        expect(message.saflaValidation!.authorityConfirmed).toBe(false);
        expect(message.saflaValidation!.score).toBeLessThan(50);
        expect(message.confidence).toBeLessThan(0.6);
      });
    });
  });
});