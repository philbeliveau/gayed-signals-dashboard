'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useConversationStore } from '@/domains/ai-agents/stores/conversationStore';
import { useConversationSync } from '@/domains/ai-agents/hooks/useConversationSync';
import { conversationSessionManager } from '@/lib/session/conversationSession';
import { useConversationMemoryManagement } from '@/lib/performance/conversationOptimization';
import { ConversationSession, LiveConversationMessage } from '@/types/agents';

interface ConversationContextType {
  // Session management
  createSession: (
    participants: string[],
    contentSource?: 'text' | 'youtube' | 'substack',
    sourceMetadata?: Record<string, any>
  ) => Promise<string>;
  endSession: () => void;
  loadSession: (sessionId: string) => Promise<boolean>;

  // History management
  getConversationHistory: () => ConversationSession[];
  deleteConversation: (sessionId: string) => Promise<void>;
  exportConversations: () => string;
  importConversations: (data: string) => Promise<boolean>;

  // Real-time state
  isConnected: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  activeSessionId: string | null;

  // Storage info
  storageInfo: {
    sessionCount: number;
    totalSize: number;
    averageSize: number;
    oldestSession: string | null;
  };

  // Cross-tab sync status
  isSyncEnabled: boolean;
  lastSyncUpdate: number | null;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

interface ConversationProviderProps {
  children: ReactNode;
  enableAutoCleanup?: boolean;
  enableCrossTabSync?: boolean;
}

export const ConversationProvider: React.FC<ConversationProviderProps> = ({
  children,
  enableAutoCleanup = true,
  enableCrossTabSync = true,
}) => {
  // Zustand store state
  const {
    activeConversation,
    conversationHistory,
    startConversation,
    completeConversation,
    clearActiveConversation,
    loadConversationHistory,
  } = useConversationStore();

  // Local state for context
  const [storageInfo, setStorageInfo] = useState({
    sessionCount: 0,
    totalSize: 0,
    averageSize: 0,
    oldestSession: null as string | null,
  });
  const [lastSyncUpdate, setLastSyncUpdate] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  // WebSocket sync
  const { isConnected, connectionState } = useConversationSync(
    activeConversation.sessionId,
    {
      onConnectionChange: (connected) => {
        console.log(`Conversation WebSocket ${connected ? 'connected' : 'disconnected'}`);
      },
      onSyncError: (error) => {
        console.error('Conversation sync error:', error);
      },
    }
  );

  // Memory management
  useConversationMemoryManagement();

  // Initialize on mount
  useEffect(() => {
    setMounted(true);

    const initialize = async () => {
      try {
        // Load conversation history from database
        await loadConversationHistory();

        // Update storage info
        updateStorageInfo();

        // Setup periodic cleanup if enabled
        if (enableAutoCleanup) {
          setupAutoCleanup();
        }

        // Setup cross-tab sync if enabled
        if (enableCrossTabSync) {
          setupCrossTabSync();
        }
      } catch (error) {
        console.error('Failed to initialize conversation context:', error);
      }
    };

    initialize();
  }, [enableAutoCleanup, enableCrossTabSync, loadConversationHistory]);

  // Session management functions
  const createSession = useCallback(async (
    participants: string[],
    contentSource?: 'text' | 'youtube' | 'substack',
    sourceMetadata?: Record<string, any>
  ): Promise<string> => {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Start conversation in store
      startConversation(sessionId, participants, contentSource, sourceMetadata);

      // Update storage info
      updateStorageInfo();

      return sessionId;
    } catch (error) {
      console.error('Failed to create conversation session:', error);
      throw new Error('Session creation failed');
    }
  }, [startConversation]);

  const endSession = useCallback(() => {
    try {
      clearActiveConversation();
      updateStorageInfo();
    } catch (error) {
      console.error('Failed to end conversation session:', error);
    }
  }, [clearActiveConversation]);

  const loadSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const session = conversationSessionManager.getConversationById(sessionId);

      if (!session) {
        console.warn(`Session ${sessionId} not found`);
        return false;
      }

      // Convert stored session to active conversation
      const liveMessages: LiveConversationMessage[] = session.messages.map(msg => ({
        id: msg.id,
        sessionId: session.id,
        agent: msg.agentName,
        content: msg.message,
        timestamp: new Date(msg.timestamp).getTime(),
        confidence: msg.confidence,
      }));

      // Start conversation with existing data
      startConversation(
        sessionId,
        [...new Set(session.messages.map(m => m.agentName))], // Extract unique agent names
        session.contentSource,
        session.metadata
      );

      // Add existing messages
      liveMessages.forEach(message => {
        useConversationStore.getState().addMessage(message);
      });

      return true;
    } catch (error) {
      console.error('Failed to load conversation session:', error);
      return false;
    }
  }, [startConversation]);

  // History management functions
  const getConversationHistory = useCallback((): ConversationSession[] => {
    return conversationHistory;
  }, [conversationHistory]);

  const deleteConversation = useCallback(async (sessionId: string): Promise<void> => {
    try {
      await conversationSessionManager.deleteConversation(sessionId);

      // Update store
      useConversationStore.getState().deleteConversation(sessionId);

      // Update storage info
      updateStorageInfo();
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  }, []);

  const exportConversations = useCallback((): string => {
    return conversationSessionManager.exportConversations();
  }, []);

  const importConversations = useCallback(async (data: string): Promise<boolean> => {
    try {
      const success = await conversationSessionManager.importConversations(data);

      if (success) {
        // Reload conversation history
        await loadConversationHistory();
        updateStorageInfo();
        setLastSyncUpdate(Date.now());
      }

      return success;
    } catch (error) {
      console.error('Failed to import conversations:', error);
      return false;
    }
  }, [loadConversationHistory]);

  // Utility functions
  const updateStorageInfo = useCallback(() => {
    const info = conversationSessionManager.getStorageInfo();
    setStorageInfo(info);
  }, []);

  const setupAutoCleanup = useCallback(() => {
    // Clean up old sessions every hour
    const cleanupInterval = setInterval(() => {
      conversationSessionManager.cleanupOldSessions();
      updateStorageInfo();
    }, 60 * 60 * 1000);

    return () => clearInterval(cleanupInterval);
  }, [updateStorageInfo]);

  const setupCrossTabSync = useCallback(() => {
    const cleanup = conversationSessionManager.setupCrossTabSync();

    // Listen for cross-tab updates
    const handleCrossTabUpdate = (event: CustomEvent) => {
      setLastSyncUpdate(Date.now());

      // Update local state with synced data
      useConversationStore.setState({
        conversationHistory: event.detail || [],
      });
    };

    window.addEventListener('conversationStorageUpdate', handleCrossTabUpdate as EventListener);

    return () => {
      cleanup();
      window.removeEventListener('conversationStorageUpdate', handleCrossTabUpdate as EventListener);
    };
  }, []);

  // Context value
  const contextValue: ConversationContextType = {
    // Session management
    createSession,
    endSession,
    loadSession,

    // History management
    getConversationHistory,
    deleteConversation,
    exportConversations,
    importConversations,

    // Real-time state
    isConnected,
    connectionState,
    activeSessionId: activeConversation.sessionId,

    // Storage info
    storageInfo,

    // Cross-tab sync
    isSyncEnabled: enableCrossTabSync,
    lastSyncUpdate,
  };

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <ConversationContext.Provider value={contextValue}>
        <div suppressHydrationWarning style={{ display: 'contents' }}>
          {children}
        </div>
      </ConversationContext.Provider>
    );
  }

  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversation = () => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
};

export default ConversationProvider;