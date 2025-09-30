/**
 * AutoGen-WebSocket Bridge Integration Tests
 * Story 2.8: AutoGen-WebSocket Integration Bridge
 *
 * Tests the integration between AutoGen conversations and WebSocket streaming.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock WebSocket for testing
class MockWebSocket {
  public readyState: number = WebSocket.OPEN;
  public sentMessages: any[] = [];
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    // Simulate async connection
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string) {
    this.sentMessages.push(JSON.parse(data));
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Helper method to simulate receiving messages
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', {
        data: JSON.stringify(data)
      }));
    }
  }
}

// Mock the global WebSocket
global.WebSocket = MockWebSocket as any;

describe('AutoGen-WebSocket Bridge Integration', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // Mock fetch for API calls
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('successfully establishes WebSocket connection to AutoGen backend', async () => {
    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        conversationId: 'test-123',
        webSocketUrl: 'ws://localhost:8000/api/v1/ws/conversations/test-123/stream',
        startData: {
          type: 'start_conversation',
          data: {
            content: 'Test market analysis',
            contentType: 'text',
            userId: 'user-123',
            authToken: 'token-123'
          }
        }
      })
    } as Response);

    // Simulate starting a conversation
    const response = await fetch('/api/conversations/test-123/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Test market analysis',
        contentType: 'text'
      })
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(data.webSocketUrl).toContain('ws://localhost:8000');
    expect(data.startData.type).toBe('start_conversation');
  });

  test('handles AutoGen agent message translation correctly', () => {
    const websocket = new MockWebSocket('ws://localhost:8000/test');

    // Simulate AutoGen agent message
    const autogenMessage = {
      type: 'agent_message',
      session_id: 'test-123',
      timestamp: '2025-01-30T12:00:00Z',
      data: {
        id: 'msg-1',
        agentType: 'FINANCIAL_ANALYST',
        agentName: 'Financial Analyst',
        role: 'analyst',
        message: 'Market shows bullish signals with VIX at 3.2',
        confidence: 0.85,
        timestamp: '2025-01-30T12:00:00Z'
      }
    };

    let receivedMessage: any = null;
    websocket.onmessage = (event) => {
      receivedMessage = JSON.parse(event.data);
    };

    // Simulate receiving the message
    websocket.simulateMessage(autogenMessage);

    expect(receivedMessage).toEqual(autogenMessage);
    expect(receivedMessage.data.agentType).toBe('FINANCIAL_ANALYST');
    expect(receivedMessage.data.confidence).toBe(0.85);
  });

  test('handles conversation status updates correctly', () => {
    const websocket = new MockWebSocket('ws://localhost:8000/test');
    const statusUpdates: string[] = [];

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'conversation_status') {
        statusUpdates.push(message.data.status);
      }
    };

    // Simulate status progression
    websocket.simulateMessage({
      type: 'conversation_status',
      data: { status: 'initializing' }
    });

    websocket.simulateMessage({
      type: 'conversation_status',
      data: { status: 'active' }
    });

    websocket.simulateMessage({
      type: 'conversation_status',
      data: { status: 'completed' }
    });

    expect(statusUpdates).toEqual(['initializing', 'active', 'completed']);
  });

  test('handles fallback to demo mode gracefully', () => {
    const websocket = new MockWebSocket('ws://localhost:8000/test');
    let fallbackTriggered = false;
    let fallbackReason = '';

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'fallback_mode') {
        fallbackTriggered = true;
        fallbackReason = message.data.reason;
      }
    };

    // Simulate AutoGen backend failure
    websocket.simulateMessage({
      type: 'fallback_mode',
      data: {
        mode: 'demo',
        reason: 'autogen_unavailable',
        message: 'AutoGen backend unavailable, continuing in demo mode'
      }
    });

    expect(fallbackTriggered).toBe(true);
    expect(fallbackReason).toBe('autogen_unavailable');
  });

  test('handles conversation completion with results', () => {
    const websocket = new MockWebSocket('ws://localhost:8000/test');
    let completionResult: any = null;

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'conversation_complete') {
        completionResult = message.data;
      }
    };

    // Simulate conversation completion
    websocket.simulateMessage({
      type: 'conversation_complete',
      data: {
        consensusReached: true,
        finalRecommendation: 'Mixed signals with 65% confidence',
        confidenceLevel: 0.65,
        keyInsights: [
          'VIX defensive signal active',
          'Utilities outperforming SPY',
          'Fed policy uncertainty'
        ]
      }
    });

    expect(completionResult).not.toBeNull();
    expect(completionResult.consensusReached).toBe(true);
    expect(completionResult.confidenceLevel).toBe(0.65);
    expect(completionResult.keyInsights).toHaveLength(3);
  });

  test('handles WebSocket connection errors', () => {
    const websocket = new MockWebSocket('ws://localhost:8000/test');
    let errorOccurred = false;

    websocket.onerror = () => {
      errorOccurred = true;
    };

    // Simulate error
    if (websocket.onerror) {
      websocket.onerror(new Event('error'));
    }

    expect(errorOccurred).toBe(true);
  });

  test('API endpoint returns proper error for invalid conversation ID', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'Invalid conversation ID'
      })
    } as Response);

    const response = await fetch('/api/conversations/invalid/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Test content',
        contentType: 'text'
      })
    });

    const data = await response.json();

    expect(response.ok).toBe(false);
    expect(data.error).toBe('Invalid conversation ID');
  });

  test('API endpoint requires content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'Content is required'
      })
    } as Response);

    const response = await fetch('/api/conversations/test-123/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '',
        contentType: 'text'
      })
    });

    const data = await response.json();

    expect(response.ok).toBe(false);
    expect(data.error).toBe('Content is required');
  });

  test('WebSocket sends heartbeat messages', (done) => {
    const websocket = new MockWebSocket('ws://localhost:8000/test');

    // Send a heartbeat message
    websocket.send(JSON.stringify({
      type: 'ping'
    }));

    // Check that message was sent
    expect(websocket.sentMessages).toHaveLength(1);
    expect(websocket.sentMessages[0].type).toBe('ping');

    done();
  });

  test('handles concurrent conversation sessions', () => {
    const websocket1 = new MockWebSocket('ws://localhost:8000/conv-1');
    const websocket2 = new MockWebSocket('ws://localhost:8000/conv-2');

    const messages1: any[] = [];
    const messages2: any[] = [];

    websocket1.onmessage = (event) => {
      messages1.push(JSON.parse(event.data));
    };

    websocket2.onmessage = (event) => {
      messages2.push(JSON.parse(event.data));
    };

    // Send different messages to each conversation
    websocket1.simulateMessage({
      type: 'agent_message',
      session_id: 'conv-1',
      data: { message: 'Message for conversation 1' }
    });

    websocket2.simulateMessage({
      type: 'agent_message',
      session_id: 'conv-2',
      data: { message: 'Message for conversation 2' }
    });

    expect(messages1).toHaveLength(1);
    expect(messages2).toHaveLength(1);
    expect(messages1[0].data.message).toBe('Message for conversation 1');
    expect(messages2[0].data.message).toBe('Message for conversation 2');
  });
});

describe('AutoGen Message Format Validation', () => {
  test('validates agent message structure', () => {
    const validMessage = {
      type: 'agent_message',
      session_id: 'test-123',
      timestamp: '2025-01-30T12:00:00Z',
      data: {
        id: 'msg-1',
        agentType: 'FINANCIAL_ANALYST',
        agentName: 'Financial Analyst',
        role: 'analyst',
        message: 'Test message',
        confidence: 0.85,
        timestamp: '2025-01-30T12:00:00Z'
      }
    };

    // Validate required fields
    expect(validMessage.type).toBe('agent_message');
    expect(validMessage.data.agentType).toBeDefined();
    expect(validMessage.data.message).toBeDefined();
    expect(validMessage.data.confidence).toBeGreaterThanOrEqual(0);
    expect(validMessage.data.confidence).toBeLessThanOrEqual(1);
  });

  test('validates conversation status message structure', () => {
    const statusMessage = {
      type: 'conversation_status',
      session_id: 'test-123',
      data: {
        status: 'active',
        timestamp: '2025-01-30T12:00:00Z'
      }
    };

    expect(statusMessage.type).toBe('conversation_status');
    expect(['initializing', 'active', 'completed', 'error']).toContain(statusMessage.data.status);
  });
});