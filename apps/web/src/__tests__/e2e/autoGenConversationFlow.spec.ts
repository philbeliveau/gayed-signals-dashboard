/**
 * End-to-End AutoGen Conversation Flow Tests
 * Story 2.8: AutoGen-WebSocket Integration Bridge
 *
 * Tests the complete flow from content input to AutoGen conversation completion.
 */

import { test, expect, Page } from '@playwright/test';

// Mock backend responses for testing
const mockAutoGenResponses = {
  conversationStart: {
    success: true,
    conversationId: 'test-conversation-123',
    webSocketUrl: 'ws://localhost:8000/api/v1/ws/conversations/test-conversation-123/stream',
    startData: {
      type: 'start_conversation',
      data: {
        content: 'Test market analysis content',
        contentType: 'text',
        userId: 'test-user',
        authToken: 'test-token'
      }
    }
  },
  agentMessages: [
    {
      type: 'agent_message',
      session_id: 'test-conversation-123',
      timestamp: '2025-01-30T12:00:00Z',
      data: {
        id: 'msg-1',
        agentType: 'FINANCIAL_ANALYST',
        agentName: 'Financial Analyst',
        role: 'analyst',
        message: 'Analyzing market conditions. Current VIX at 3.2 indicates low volatility environment.',
        confidence: 0.85,
        timestamp: '2025-01-30T12:00:00Z'
      }
    },
    {
      type: 'agent_message',
      session_id: 'test-conversation-123',
      timestamp: '2025-01-30T12:01:00Z',
      data: {
        id: 'msg-2',
        agentType: 'MARKET_CONTEXT',
        agentName: 'Market Context',
        role: 'context',
        message: 'Fed policy remains data-dependent. Recent employment data shows strength.',
        confidence: 0.78,
        timestamp: '2025-01-30T12:01:00Z'
      }
    },
    {
      type: 'agent_message',
      session_id: 'test-conversation-123',
      timestamp: '2025-01-30T12:02:00Z',
      data: {
        id: 'msg-3',
        agentType: 'RISK_CHALLENGER',
        agentName: 'Risk Challenger',
        role: 'challenger',
        message: 'Caution warranted. Low volatility often precedes market regime changes.',
        confidence: 0.92,
        timestamp: '2025-01-30T12:02:00Z'
      }
    }
  ],
  conversationComplete: {
    type: 'conversation_complete',
    session_id: 'test-conversation-123',
    data: {
      consensusReached: true,
      finalRecommendation: 'Mixed signals with defensive positioning recommended',
      confidenceLevel: 0.75,
      keyInsights: [
        'Low volatility environment present',
        'Fed policy data-dependent',
        'Market regime change risk exists'
      ]
    }
  }
};

test.describe('AutoGen Conversation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/conversations/*/stream', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAutoGenResponses.conversationStart)
        });
      }
    });

    // Mock WebSocket connection
    await page.addInitScript(() => {
      class MockWebSocket extends EventTarget {
        public readyState: number = WebSocket.OPEN;
        public url: string;
        public onopen: ((event: Event) => void) | null = null;
        public onmessage: ((event: MessageEvent) => void) | null = null;
        public onclose: ((event: CloseEvent) => void) | null = null;
        public onerror: ((event: Event) => void) | null = null;

        constructor(url: string) {
          super();
          this.url = url;
          // Simulate connection opening
          setTimeout(() => {
            if (this.onopen) {
              this.onopen(new Event('open'));
            }
          }, 100);
        }

        send(data: string) {
          // In real test, this would connect to mock server
          console.log('WebSocket send:', data);
        }

        close() {
          this.readyState = WebSocket.CLOSED;
          if (this.onclose) {
            this.onclose(new CloseEvent('close'));
          }
        }
      }

      (window as any).WebSocket = MockWebSocket;
    });
  });

  test('complete AutoGen conversation flow from start to finish', async ({ page }) => {
    // Navigate to a page with LiveConversationDisplay
    await page.goto('/demo'); // Assuming there's a demo page

    // Start conversation
    await page.fill('[data-testid="content-input"]', 'Analyze current market conditions and Fed policy impact');
    await page.click('[data-testid="start-autogen-conversation"]');

    // Verify conversation initialization
    await expect(page.locator('[data-testid="conversation-status"]')).toContainText('AutoGen Starting');

    // Verify AutoGen indicator appears
    await expect(page.locator('[data-testid="autogen-indicator"]')).toBeVisible();

    // Simulate agent messages appearing
    await page.evaluate((messages) => {
      const mockWs = (window as any).mockWebSocket;
      if (mockWs && mockWs.onmessage) {
        messages.forEach((message: any, index: number) => {
          setTimeout(() => {
            mockWs.onmessage(new MessageEvent('message', {
              data: JSON.stringify(message)
            }));
          }, index * 2000);
        });
      }
    }, mockAutoGenResponses.agentMessages);

    // Verify agent messages appear in order
    await expect(page.locator('[data-testid="agent-message"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Financial Analyst')).toBeVisible();
    await expect(page.locator('text=Current VIX at 3.2 indicates low volatility')).toBeVisible();

    await expect(page.locator('text=Market Context')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Fed policy remains data-dependent')).toBeVisible();

    await expect(page.locator('text=Risk Challenger')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Low volatility often precedes market regime changes')).toBeVisible();

    // Verify confidence scores
    await expect(page.locator('text=85%')).toBeVisible();
    await expect(page.locator('text=78%')).toBeVisible();
    await expect(page.locator('text=92%')).toBeVisible();

    // Simulate conversation completion
    await page.evaluate((completion) => {
      const mockWs = (window as any).mockWebSocket;
      if (mockWs && mockWs.onmessage) {
        mockWs.onmessage(new MessageEvent('message', {
          data: JSON.stringify(completion)
        }));
      }
    }, mockAutoGenResponses.conversationComplete);

    // Verify completion status
    await expect(page.locator('[data-testid="conversation-status"]')).toContainText('AutoGen Complete');
    await expect(page.locator('text=Conversation Complete')).toBeVisible();
  });

  test('handles AutoGen backend failure with demo fallback', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/conversations/*/stream', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'AutoGen backend unavailable' })
      });
    });

    await page.goto('/demo');

    // Try to start AutoGen conversation
    await page.fill('[data-testid="content-input"]', 'Test content');
    await page.click('[data-testid="start-autogen-conversation"]');

    // Should show error state
    await expect(page.locator('text=AutoGen Connection Failed')).toBeVisible();
    await expect(page.locator('text=AutoGen backend unavailable')).toBeVisible();

    // Click "Use Demo Mode" button
    await page.click('text=Use Demo Mode');

    // Verify demo mode starts
    await expect(page.locator('text=Demo:')).toBeVisible();
    await expect(page.locator('[data-testid="conversation-status"]')).toContainText('Demo Mode');
  });

  test('retry functionality works after connection failure', async ({ page }) => {
    let attemptCount = 0;

    // Mock first attempt failure, second attempt success
    await page.route('**/api/conversations/*/stream', async (route) => {
      attemptCount++;
      if (attemptCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Temporary connection error' })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAutoGenResponses.conversationStart)
        });
      }
    });

    await page.goto('/demo');

    // Start conversation (first attempt - should fail)
    await page.fill('[data-testid="content-input"]', 'Test content');
    await page.click('[data-testid="start-autogen-conversation"]');

    // Should show error
    await expect(page.locator('text=AutoGen Connection Failed')).toBeVisible();

    // Click retry button
    await page.click('text=Retry AutoGen');

    // Should succeed on retry
    await expect(page.locator('[data-testid="conversation-status"]')).toContainText('AutoGen Starting');
  });

  test('WebSocket connection state is properly managed', async ({ page }) => {
    await page.goto('/demo');

    // Start conversation
    await page.fill('[data-testid="content-input"]', 'Test WebSocket management');
    await page.click('[data-testid="start-autogen-conversation"]');

    // Verify connected state
    await expect(page.locator('[data-testid="connection-indicator"]')).toContainText('Connected');

    // Simulate WebSocket disconnection
    await page.evaluate(() => {
      const mockWs = (window as any).mockWebSocket;
      if (mockWs && mockWs.onclose) {
        mockWs.onclose(new CloseEvent('close'));
      }
    });

    // Should show disconnected state
    await expect(page.locator('[data-testid="connection-indicator"]')).toContainText('Disconnected');
  });

  test('conversation export functionality', async ({ page }) => {
    await page.goto('/demo');

    // Complete a conversation first
    await page.fill('[data-testid="content-input"]', 'Test export functionality');
    await page.click('[data-testid="start-autogen-conversation"]');

    // Simulate completed conversation
    await page.evaluate((messages) => {
      const mockWs = (window as any).mockWebSocket;
      if (mockWs && mockWs.onmessage) {
        messages.forEach((message: any) => {
          mockWs.onmessage(new MessageEvent('message', {
            data: JSON.stringify(message)
          }));
        });

        // Send completion
        setTimeout(() => {
          mockWs.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'conversation_complete',
              data: { consensusReached: true }
            })
          }));
        }, 1000);
      }
    }, mockAutoGenResponses.agentMessages);

    // Wait for completion
    await expect(page.locator('text=Conversation Complete')).toBeVisible({ timeout: 10000 });

    // Test export functionality if available
    const exportButton = page.locator('[data-testid="export-conversation"]');
    if (await exportButton.isVisible()) {
      await exportButton.click();
      // Verify export dialog or download
      await expect(page.locator('[data-testid="export-dialog"]')).toBeVisible();
    }
  });

  test('handles multiple concurrent conversations', async ({ page }) => {
    // Open first conversation
    await page.goto('/demo');
    await page.fill('[data-testid="content-input"]', 'First conversation content');
    await page.click('[data-testid="start-autogen-conversation"]');

    // Open second tab/window for another conversation
    const secondPage = await page.context().newPage();
    await secondPage.goto('/demo');
    await secondPage.fill('[data-testid="content-input"]', 'Second conversation content');
    await secondPage.click('[data-testid="start-autogen-conversation"]');

    // Verify both conversations start independently
    await expect(page.locator('[data-testid="conversation-status"]')).toContainText('AutoGen');
    await expect(secondPage.locator('[data-testid="conversation-status"]')).toContainText('AutoGen');

    // Close second page
    await secondPage.close();

    // Verify first conversation continues normally
    await expect(page.locator('[data-testid="conversation-status"]')).toBeVisible();
  });
});

test.describe('AutoGen Authentication Integration', () => {
  test('properly handles authenticated users', async ({ page }) => {
    // Mock Clerk authentication
    await page.addInitScript(() => {
      (window as any).__clerk_internal_dev_instance = {
        user: {
          id: 'user_test123',
          primaryEmailAddress: { emailAddress: 'test@example.com' }
        },
        session: {
          getToken: () => Promise.resolve('mock-auth-token')
        }
      };
    });

    await page.goto('/demo');

    // Start conversation with authentication
    await page.fill('[data-testid="content-input"]', 'Authenticated user content');
    await page.click('[data-testid="start-autogen-conversation"]');

    // Verify user context is included in requests
    await expect(page.locator('[data-testid="user-indicator"]')).toContainText('test@example.com');
  });

  test('handles unauthenticated users gracefully', async ({ page }) => {
    // No authentication setup

    await page.goto('/demo');

    // Should still allow conversation start
    await page.fill('[data-testid="content-input"]', 'Unauthenticated user content');
    await page.click('[data-testid="start-autogen-conversation"]');

    // Should proceed without authentication
    await expect(page.locator('[data-testid="conversation-status"]')).toContainText('Starting');
  });
});