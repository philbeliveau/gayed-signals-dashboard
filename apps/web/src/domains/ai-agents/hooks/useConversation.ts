/**
 * useConversation Hook
 * Story 1.8: Multi-Agent Conversation Frontend Integration
 *
 * React hook for managing AutoGen conversation state and real-time updates
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  ConversationSession,
  ConversationStatus,
  AgentMessage,
  ConversationConsensus,
  ContentSource,
  ConversationEvent
} from '../types/conversation';
import type { ConsensusSignal } from '../../trading-signals/types/index';

interface UseConversationOptions {
  onMessage?: (message: AgentMessage) => void;
  onStatusChange?: (status: ConversationStatus) => void;
  onConsensus?: (consensus: ConversationConsensus) => void;
  onError?: (error: string) => void;
  autoCleanup?: boolean;
}

interface ConversationHookState {
  session: ConversationSession | null;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  messages: AgentMessage[];
  consensus: ConversationConsensus | null;
}

interface ConversationActions {
  startConversation: (content: ContentSource, signalContext?: ConsensusSignal) => Promise<void>;
  stopConversation: () => void;
  reconnect: () => void;
  clearError: () => void;
  exportConversation: (format: 'json' | 'pdf' | 'markdown') => Promise<void>;
}

export function useConversation(options: UseConversationOptions = {}):
  ConversationHookState & ConversationActions {

  const [state, setState] = useState<ConversationHookState>({
    session: null,
    isLoading: false,
    isConnected: false,
    error: null,
    messages: [],
    consensus: null
  });

  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  // Generate unique session ID
  const generateSessionId = useCallback(() => {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Update state helper
  const updateState = useCallback((updates: Partial<ConversationHookState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Handle WebSocket message
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📨 WebSocket message:', data);

      switch (data.type) {
        case 'agent_message':
          const message: AgentMessage = {
            id: data.data.id,
            agentId: data.data.agent_id,
            agentName: data.data.agent_name,
            content: data.data.content,
            messageType: data.data.message_type || 'analysis',
            confidence: data.data.confidence || 70,
            timestamp: new Date(data.timestamp),
            metadata: data.data.metadata || {}
          };

          setState(prev => ({
            ...prev,
            messages: [...prev.messages, message]
          }));

          options.onMessage?.(message);
          break;

        case 'status_update':
          const newStatus = data.data.status as ConversationStatus;
          updateState({
            session: state.session ? { ...state.session, status: newStatus } : null
          });
          options.onStatusChange?.(newStatus);
          break;

        case 'consensus_ready':
          const consensus: ConversationConsensus = {
            decision: data.data.consensus.decision,
            confidence: data.data.consensus.confidence,
            reasoning: data.data.consensus.reasoning,
            keyPoints: data.data.consensus.key_points || [],
            agentAgreement: data.data.consensus.agent_agreement || {},
            timestamp: new Date(data.data.consensus.timestamp)
          };

          updateState({ consensus });
          options.onConsensus?.(consensus);
          break;

        case 'error':
          const errorMessage = data.data.error || 'Unknown conversation error';
          updateState({ error: errorMessage, isLoading: false });
          options.onError?.(errorMessage);
          break;

        default:
          console.warn('Unknown WebSocket message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      updateState({ error: 'Failed to parse conversation update' });
    }
  }, [options, updateState, state.session]);

  // Handle WebSocket connection
  const connectWebSocket = useCallback((sessionId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `${backendUrl.replace('http', 'ws')}/api/v1/conversations/ws/${sessionId}`;
    console.log('🔌 Connecting to WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      updateState({ isConnected: true, error: null });
    };

    ws.onmessage = handleWebSocketMessage;

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      updateState({
        isConnected: false,
        error: 'Connection error. Please check your network.'
      });
    };

    ws.onclose = (event) => {
      console.log('🔌 WebSocket closed:', event.code, event.reason);
      updateState({ isConnected: false });

      // Auto-reconnect on unexpected close
      if (!event.wasClean && sessionIdRef.current && !reconnectTimeoutRef.current) {
        console.log('🔄 Attempting to reconnect...');
        reconnectTimeoutRef.current = setTimeout(() => {
          if (sessionIdRef.current) {
            connectWebSocket(sessionIdRef.current);
          }
          reconnectTimeoutRef.current = null;
        }, 3000);
      }
    };
  }, [backendUrl, handleWebSocketMessage, updateState]);

  // Start new conversation
  const startConversation = useCallback(async (
    content: ContentSource,
    signalContext?: ConsensusSignal
  ) => {
    if (state.isLoading) {
      console.warn('Conversation already starting...');
      return;
    }

    const sessionId = generateSessionId();
    sessionIdRef.current = sessionId;

    updateState({
      isLoading: true,
      error: null,
      messages: [],
      consensus: null
    });

    try {
      console.log('🚀 Starting conversation:', sessionId);

      // Create conversation session
      const response = await fetch(`${backendUrl}/api/v1/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          content_source: content,
          signal_context: signalContext,
          agents: ['financial_analyst', 'market_context', 'risk_challenger']
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start conversation');
      }

      const conversationData = await response.json();

      // Create session object
      const session: ConversationSession = {
        id: sessionId,
        status: 'initializing',
        agents: ['financial_analyst', 'market_context', 'risk_challenger'],
        messages: [],
        metrics: {
          startTime: Date.now(),
          messageCount: 0,
          averageResponseTime: 0,
          consensusReached: false,
          timeToConsensus: null
        },
        contentSource: content,
        signalContext,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      updateState({
        session,
        isLoading: false
      });

      // Connect WebSocket for real-time updates
      connectWebSocket(sessionId);

    } catch (error) {
      console.error('Failed to start conversation:', error);
      updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to start conversation'
      });
      sessionIdRef.current = null;
    }
  }, [state.isLoading, generateSessionId, updateState, backendUrl, connectWebSocket]);

  // Stop conversation
  const stopConversation = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User requested stop');
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    sessionIdRef.current = null;
    updateState({
      session: null,
      isConnected: false,
      isLoading: false,
      messages: [],
      consensus: null
    });

    console.log('🛑 Conversation stopped');
  }, [updateState]);

  // Reconnect WebSocket
  const reconnect = useCallback(() => {
    if (sessionIdRef.current && !state.isConnected) {
      connectWebSocket(sessionIdRef.current);
    }
  }, [sessionIdRef.current, state.isConnected, connectWebSocket]);

  // Clear error
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Export conversation
  const exportConversation = useCallback(async (format: 'json' | 'pdf' | 'markdown') => {
    if (!state.session) {
      throw new Error('No active conversation to export');
    }

    try {
      const exportData = {
        session: state.session,
        messages: state.messages,
        consensus: state.consensus,
        exportedAt: new Date().toISOString(),
        format
      };

      if (format === 'json') {
        // Download as JSON file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation_${state.session.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // For PDF/Markdown, would need backend processing
        console.log('PDF/Markdown export would require backend processing');
        throw new Error(`${format.toUpperCase()} export not yet implemented`);
      }

    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }, [state.session, state.messages, state.consensus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (options.autoCleanup !== false) {
        stopConversation();
      }
    };
  }, [stopConversation, options.autoCleanup]);

  // Auto-update session metrics
  useEffect(() => {
    if (state.session && state.messages.length > 0) {
      const updatedSession = {
        ...state.session,
        messages: state.messages,
        metrics: {
          ...state.session.metrics,
          messageCount: state.messages.length,
          consensusReached: state.consensus !== null,
          timeToConsensus: state.consensus
            ? Date.now() - state.session.metrics.startTime
            : null
        },
        updatedAt: new Date()
      };

      setState(prev => ({ ...prev, session: updatedSession }));
    }
  }, [state.messages, state.consensus]);

  return {
    // State
    session: state.session,
    isLoading: state.isLoading,
    isConnected: state.isConnected,
    error: state.error,
    messages: state.messages,
    consensus: state.consensus,

    // Actions
    startConversation,
    stopConversation,
    reconnect,
    clearError,
    exportConversation
  };
}