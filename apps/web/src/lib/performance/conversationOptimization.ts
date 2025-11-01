'use client';

import { useMemo, useEffect, useCallback } from 'react';
import { LiveConversationMessage } from '@/types/agents';
import { useConversationStore } from '@/domains/ai-agents/stores/conversationStore';

interface VirtualizedMessage extends LiveConversationMessage {
  type?: 'message' | 'gap';
  count?: number;
}

/**
 * Virtual scrolling for large conversation histories
 * Improves performance by only rendering visible messages
 */
export function useVirtualizedMessages(
  messages: LiveConversationMessage[],
  containerHeight: number,
  itemHeight: number = 120
): VirtualizedMessage[] {
  return useMemo(() => {
    if (messages.length === 0) return [];

    const visibleItems = Math.ceil(containerHeight / itemHeight) + 4; // Buffer for smooth scrolling

    // If conversation is small, return all messages
    if (messages.length <= visibleItems) {
      return messages;
    }

    // For large conversations, show recent messages + some history with gap indicator
    const recentCount = Math.floor(visibleItems * 0.7);
    const historyCount = Math.floor(visibleItems * 0.3);
    const gapSize = messages.length - historyCount - recentCount;

    if (gapSize <= 0) {
      return messages;
    }

    const result: VirtualizedMessage[] = [
      // Show first few messages (conversation start)
      ...messages.slice(0, historyCount),
      // Gap indicator
      {
        id: 'gap-indicator',
        sessionId: messages[0]?.sessionId || '',
        agent: 'system',
        content: `... ${gapSize} messages ...`,
        timestamp: Date.now(),
        type: 'gap',
        count: gapSize,
      },
      // Show recent messages
      ...messages.slice(-recentCount),
    ];

    return result;
  }, [messages, containerHeight, itemHeight]);
}

/**
 * Message chunking for efficient rendering
 * Groups messages by time periods to reduce DOM nodes
 */
export function useMessageChunking(
  messages: LiveConversationMessage[],
  chunkSize: number = 10,
  timeGapThreshold: number = 5 * 60 * 1000 // 5 minutes
): LiveConversationMessage[][] {
  return useMemo(() => {
    if (messages.length === 0) return [];

    const chunks: LiveConversationMessage[][] = [];
    let currentChunk: LiveConversationMessage[] = [];

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const prevMessage = i > 0 ? messages[i - 1] : null;

      // Start new chunk if:
      // 1. Current chunk is at size limit
      // 2. Time gap is too large
      // 3. Agent changed (for visual grouping)
      const shouldStartNewChunk =
        currentChunk.length >= chunkSize ||
        (prevMessage && message.timestamp - prevMessage.timestamp > timeGapThreshold) ||
        (prevMessage && message.agent !== prevMessage.agent && currentChunk.length > 0);

      if (shouldStartNewChunk && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [message];
      } else {
        currentChunk.push(message);
      }
    }

    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }, [messages, chunkSize, timeGapThreshold]);
}

/**
 * Debounced state updates to prevent excessive re-renders
 */
export function useDebouncedConversationUpdates(delay: number = 100) {
  const { addMessage, updateStatus } = useConversationStore();

  const debouncedAddMessage = useCallback(
    debounce((message: LiveConversationMessage) => {
      addMessage(message);
    }, delay),
    [addMessage, delay]
  );

  const debouncedUpdateStatus = useCallback(
    debounce((status: any) => {
      updateStatus(status);
    }, delay),
    [updateStatus, delay]
  );

  return {
    debouncedAddMessage,
    debouncedUpdateStatus,
  };
}

/**
 * Memory management for conversation state
 * Automatically cleans up old data to prevent memory leaks
 */
export function useConversationMemoryManagement() {
  const store = useConversationStore();

  useEffect(() => {
    const cleanup = () => {
      const state = store;

      // Clean up active conversation if too many messages
      if (state.activeConversation.messages.length > 200) {
        console.warn('Cleaning up conversation messages to prevent memory issues');

        // Keep first 50 and last 100 messages
        const firstMessages = state.activeConversation.messages.slice(0, 50);
        const lastMessages = state.activeConversation.messages.slice(-100);

        const cleanedMessages = firstMessages.length + lastMessages.length > 200
          ? lastMessages
          : [...firstMessages, ...lastMessages];

        useConversationStore.setState({
          activeConversation: {
            ...state.activeConversation,
            messages: cleanedMessages,
          },
        });
      }

      // Clean up conversation history if too many stored
      if (state.conversationHistory.length > 50) {
        console.warn('Cleaning up conversation history to prevent memory issues');

        const recentHistory = state.conversationHistory
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 50);

        useConversationStore.setState({
          conversationHistory: recentHistory,
        });
      }
    };

    // Run cleanup every 5 minutes
    const interval = setInterval(cleanup, 5 * 60 * 1000);

    // Run cleanup when conversation completes
    const unsubscribe = useConversationStore.subscribe(
      (state) => state.activeConversation.status,
      (status) => {
        if (status === 'completed') {
          setTimeout(cleanup, 1000); // Delay to allow UI updates
        }
      }
    );

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [store]);
}

/**
 * Performance monitoring for conversation operations
 */
export function useConversationPerformanceMonitor() {
  const startTime = useCallback((operation: string) => {
    return {
      operation,
      start: performance.now(),
      end: (details?: any) => {
        const duration = performance.now() - this.start;

        if (duration > 100) { // Log slow operations
          console.warn(`Slow conversation operation: ${operation}`, {
            duration: `${duration.toFixed(2)}ms`,
            details,
          });
        }

        return duration;
      },
    };
  }, []);

  const measureAsync = useCallback(async <T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    const timer = startTime(operation);
    try {
      const result = await fn();
      timer.end({ success: true });
      return result;
    } catch (error) {
      timer.end({ success: false, error: error.message });
      throw error;
    }
  }, [startTime]);

  return {
    startTime,
    measureAsync,
  };
}

/**
 * Optimized message search for large conversations
 */
export function useMessageSearch(
  messages: LiveConversationMessage[],
  searchTerm: string,
  maxResults: number = 50
): LiveConversationMessage[] {
  return useMemo(() => {
    if (!searchTerm.trim()) return [];

    const term = searchTerm.toLowerCase();
    const results: LiveConversationMessage[] = [];

    // Search from most recent messages first (more likely to be relevant)
    for (let i = messages.length - 1; i >= 0 && results.length < maxResults; i--) {
      const message = messages[i];
      if (message.content.toLowerCase().includes(term)) {
        results.unshift(message); // Maintain chronological order
      }
    }

    return results;
  }, [messages, searchTerm, maxResults]);
}

/**
 * Debounce utility function
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle utility for high-frequency updates
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export default {
  useVirtualizedMessages,
  useMessageChunking,
  useDebouncedConversationUpdates,
  useConversationMemoryManagement,
  useConversationPerformanceMonitor,
  useMessageSearch,
  throttle,
};