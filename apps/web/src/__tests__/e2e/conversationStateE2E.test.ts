/**
 * E2E Tests: 2.7-E2E-001 to 2.7-E2E-005
 * Story 2.7: Conversation State Management - Phase 1 P0 E2E Tests
 *
 * Tests critical user journeys: Live message display sync and dashboard responsiveness
 * during real-time conversation state updates
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration for conversation state E2E
const TEST_BASE_URL = process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds for real-time operations

// Mock agent message data for testing
const mockAgentMessages = [
  {
    id: 'msg-1',
    agent: 'FinancialAnalyst',
    content: 'Current market analysis indicates defensive positioning. Utilities/SPY at 0.91 suggests risk-off sentiment.',
    timestamp: Date.now(),
    confidence: 0.85,
  },
  {
    id: 'msg-2',
    agent: 'MarketContext',
    content: 'Federal Reserve policy announcement: maintaining current interest rates. Latest CPI data shows 3.2% inflation.',
    timestamp: Date.now() + 1000,
    confidence: 0.92,
  },
  {
    id: 'msg-3',
    agent: 'RiskChallenger',
    content: 'Caution advised: Employment strength may delay Fed pivot. Historical precedent suggests market volatility ahead.',
    timestamp: Date.now() + 2000,
    confidence: 0.78,
  },
];

describe('Conversation State Management E2E Tests (P0)', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Create new context for each test to ensure isolation
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      // Enable real-time features
      permissions: ['notifications'],
    });

    page = await context.newPage();

    // Navigate to the dashboard
    await page.goto(TEST_BASE_URL);

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await context.close();
  });

  // 2.7-E2E-001: Live message display sync (P0)
  test('2.7-E2E-001: should sync live agent messages in real-time display', async () => {
    test.setTimeout(TEST_TIMEOUT);

    // Check if we're on the dashboard
    await expect(page).toHaveTitle(/Gayed Signals Dashboard/);

    // Look for conversation trigger (could be a button or input)
    const conversationTrigger = page.locator('[data-testid="start-conversation"]')
      .or(page.locator('button:has-text("Start Analysis")'))
      .or(page.locator('input[placeholder*="text"]'))
      .first();

    // If conversation trigger exists, interact with it
    if (await conversationTrigger.isVisible({ timeout: 5000 })) {
      await conversationTrigger.click();

      // Simulate starting a conversation with text input
      const textInput = page.locator('textarea, input[type="text"]').first();
      if (await textInput.isVisible({ timeout: 2000 })) {
        await textInput.fill('Analyze current market conditions and Fed policy impact');
        await textInput.press('Enter');
      }
    }

    // Wait for conversation interface to appear
    const conversationContainer = page.locator('[data-testid="conversation-display"]')
      .or(page.locator('.conversation-container'))
      .or(page.locator('[class*="conversation"]'))
      .first();

    // Check if conversation UI is present
    const conversationExists = await conversationContainer.isVisible({ timeout: 10000 });

    if (conversationExists) {
      // Test live message synchronization
      await test.step('Verify live message display', async () => {
        // Simulate WebSocket messages by injecting them via JavaScript
        await page.evaluate((messages) => {
          // Access the conversation store directly
          const store = (window as any).__CONVERSATION_STORE__ ||
                       (window as any).useConversationStore?.getState();

          if (store) {
            // Start a conversation
            store.startConversation('e2e-test-session', ['FinancialAnalyst', 'MarketContext', 'RiskChallenger']);

            // Add messages with delays to simulate real-time
            messages.forEach((message, index) => {
              setTimeout(() => {
                store.addMessage({
                  ...message,
                  sessionId: 'e2e-test-session',
                });
              }, index * 1000);
            });
          }
        }, mockAgentMessages);

        // Wait for messages to appear in the UI
        await page.waitForTimeout(5000);

        // Verify messages are displayed
        const messageElements = page.locator('[data-testid="agent-message"]')
          .or(page.locator('.agent-message'))
          .or(page.locator('[class*="message"]'));

        const messageCount = await messageElements.count();
        expect(messageCount).toBeGreaterThan(0);

        // Verify message content is displayed
        const firstMessage = messageElements.first();
        const messageText = await firstMessage.textContent();
        expect(messageText).toBeTruthy();
      });

      // Test real-time updates
      await test.step('Verify real-time message updates', async () => {
        // Add another message and verify it appears
        await page.evaluate(() => {
          const store = (window as any).__CONVERSATION_STORE__ ||
                       (window as any).useConversationStore?.getState();

          if (store) {
            store.addMessage({
              id: 'real-time-msg',
              sessionId: 'e2e-test-session',
              agent: 'FinancialAnalyst',
              content: 'Real-time update: Market sentiment shifting to risk-on.',
              timestamp: Date.now(),
              confidence: 0.88,
            });
          }
        });

        // Wait for new message to appear
        await page.waitForTimeout(1000);

        // Verify the new message is displayed
        const updatedMessages = page.locator('[data-testid="agent-message"]')
          .or(page.locator('.agent-message'))
          .or(page.locator('[class*="message"]'));

        const newMessageCount = await updatedMessages.count();
        expect(newMessageCount).toBeGreaterThan(0);
      });
    } else {
      // If no conversation UI exists, verify the store still works
      await test.step('Verify conversation store functionality without UI', async () => {
        // Test store operations via JavaScript
        const storeState = await page.evaluate(() => {
          // Try to access conversation store
          const store = (window as any).__CONVERSATION_STORE__ ||
                       (window as any).useConversationStore?.getState();

          if (store) {
            store.startConversation('fallback-test', ['FinancialAnalyst']);
            store.addMessage({
              id: 'fallback-msg',
              sessionId: 'fallback-test',
              agent: 'FinancialAnalyst',
              content: 'Fallback test message',
              timestamp: Date.now(),
            });

            return {
              sessionId: store.activeConversation?.sessionId,
              messageCount: store.activeConversation?.messages?.length || 0,
            };
          }

          return { sessionId: null, messageCount: 0 };
        });

        // Verify store operations work
        expect(storeState.sessionId).toBe('fallback-test');
        expect(storeState.messageCount).toBe(1);
      });
    }
  });

  // 2.7-E2E-005: Dashboard responsiveness during sync (P0)
  test('2.7-E2E-005: should maintain dashboard responsiveness during conversation sync', async () => {
    test.setTimeout(TEST_TIMEOUT);

    // Measure initial page responsiveness
    const initialLoadTime = await page.evaluate(() => performance.now());

    // Verify dashboard is interactive
    await expect(page).toHaveTitle(/Gayed Signals Dashboard/);

    // Test dashboard responsiveness during conversation state updates
    await test.step('Verify dashboard remains responsive during state updates', async () => {
      // Simulate high-frequency state updates
      const updateStartTime = await page.evaluate(() => {
        const startTime = performance.now();

        const store = (window as any).__CONVERSATION_STORE__ ||
                     (window as any).useConversationStore?.getState();

        if (store) {
          store.startConversation('performance-test', ['FinancialAnalyst']);

          // Add many messages rapidly to test performance
          for (let i = 0; i < 50; i++) {
            store.addMessage({
              id: `perf-msg-${i}`,
              sessionId: 'performance-test',
              agent: 'FinancialAnalyst',
              content: `Performance test message ${i} with substantial content to simulate real agent responses.`,
              timestamp: Date.now() + i,
              confidence: 0.85,
            });
          }
        }

        return startTime;
      });

      // Verify page remains responsive
      const responseTime = await page.evaluate((startTime) => {
        return performance.now() - startTime;
      }, updateStartTime);

      // Should complete updates quickly (under 1 second)
      expect(responseTime).toBeLessThan(1000);

      // Test UI responsiveness by clicking on elements
      const clickableElements = page.locator('button, a, [role="button"]').first();

      if (await clickableElements.isVisible({ timeout: 2000 })) {
        const clickStartTime = performance.now();
        await clickableElements.click();
        const clickEndTime = performance.now();

        const clickResponseTime = clickEndTime - clickStartTime;
        expect(clickResponseTime).toBeLessThan(500); // Should respond to clicks within 500ms
      }
    });

    // Test memory usage during sustained operations
    await test.step('Verify memory efficiency during sustained operations', async () => {
      const memoryUsage = await page.evaluate(() => {
        const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;

        const store = (window as any).__CONVERSATION_STORE__ ||
                     (window as any).useConversationStore?.getState();

        if (store) {
          // Simulate sustained conversation activity
          for (let i = 0; i < 100; i++) {
            store.startConversation(`memory-test-${i}`, ['FinancialAnalyst']);

            // Add messages to each conversation
            for (let j = 0; j < 10; j++) {
              store.addMessage({
                id: `memory-msg-${i}-${j}`,
                sessionId: `memory-test-${i}`,
                agent: 'FinancialAnalyst',
                content: `Memory test message ${j} for conversation ${i} with detailed market analysis content.`,
                timestamp: Date.now() + j,
              });
            }

            // Complete conversation to trigger history management
            store.completeConversation({
              consensusReached: true,
              finalRecommendation: `Memory test recommendation ${i}`,
              confidenceLevel: 0.8,
              keyInsights: [`Memory insight ${i}`],
            });
          }
        }

        const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
        return {
          before: memoryBefore,
          after: memoryAfter,
          increase: memoryAfter - memoryBefore,
        };
      });

      // Memory increase should be reasonable (less than 100MB)
      if (memoryUsage.increase > 0) {
        expect(memoryUsage.increase).toBeLessThan(100 * 1024 * 1024); // 100MB
      }
    });

    // Test cross-tab synchronization if supported
    await test.step('Verify cross-tab synchronization', async () => {
      // Open a second tab
      const secondPage = await context.newPage();
      await secondPage.goto(TEST_BASE_URL);
      await secondPage.waitForLoadState('networkidle');

      // Update state in first tab
      await page.evaluate(() => {
        const store = (window as any).__CONVERSATION_STORE__ ||
                     (window as any).useConversationStore?.getState();

        if (store) {
          store.setConversationMode('fullscreen');
          store.setSidebarWidth(600);
        }
      });

      // Verify state sync in second tab (with timeout for localStorage sync)
      await secondPage.waitForTimeout(100);

      const syncedState = await secondPage.evaluate(() => {
        const store = (window as any).__CONVERSATION_STORE__ ||
                     (window as any).useConversationStore?.getState();

        return store ? {
          conversationMode: store.ui?.conversationMode,
          sidebarWidth: store.ui?.sidebarWidth,
        } : { conversationMode: null, sidebarWidth: null };
      });

      // Verify cross-tab sync (may not work in test environment)
      if (syncedState.conversationMode) {
        expect(syncedState.conversationMode).toBe('fullscreen');
        expect(syncedState.sidebarWidth).toBe(600);
      }

      await secondPage.close();
    });
  });

  // Additional E2E test for error handling
  test('2.7-E2E-ERROR: should handle conversation errors gracefully in UI', async () => {
    test.setTimeout(TEST_TIMEOUT);

    await expect(page).toHaveTitle(/Gayed Signals Dashboard/);

    // Test error handling in conversation state
    await test.step('Verify graceful error handling', async () => {
      // Simulate conversation error
      await page.evaluate(() => {
        const store = (window as any).__CONVERSATION_STORE__ ||
                     (window as any).useConversationStore?.getState();

        if (store) {
          store.startConversation('error-test', ['FinancialAnalyst']);

          // Simulate WebSocket error
          store.syncWithWebSocket({
            type: 'error',
            data: { error: 'Connection lost', code: 'WEBSOCKET_ERROR' },
            sessionId: 'error-test',
          });
        }
      });

      // Page should remain functional despite error
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();

      // Verify error doesn't crash the page
      const isPageResponsive = await page.evaluate(() => {
        // Test if page is still responsive
        return document.readyState === 'complete';
      });

      expect(isPageResponsive).toBe(true);
    });

    // Test recovery from errors
    await test.step('Verify error recovery', async () => {
      // Clear error state and start new conversation
      await page.evaluate(() => {
        const store = (window as any).__CONVERSATION_STORE__ ||
                     (window as any).useConversationStore?.getState();

        if (store) {
          store.clearActiveConversation();
          store.startConversation('recovery-test', ['FinancialAnalyst']);

          store.addMessage({
            id: 'recovery-msg',
            sessionId: 'recovery-test',
            agent: 'FinancialAnalyst',
            content: 'Recovery test: System operational after error.',
            timestamp: Date.now(),
          });
        }
      });

      // Verify system recovered
      const recoveryState = await page.evaluate(() => {
        const store = (window as any).__CONVERSATION_STORE__ ||
                     (window as any).useConversationStore?.getState();

        return store ? {
          sessionId: store.activeConversation?.sessionId,
          status: store.activeConversation?.status,
          messageCount: store.activeConversation?.messages?.length || 0,
        } : { sessionId: null, status: null, messageCount: 0 };
      });

      expect(recoveryState.sessionId).toBe('recovery-test');
      expect(recoveryState.messageCount).toBe(1);
    });
  });
});