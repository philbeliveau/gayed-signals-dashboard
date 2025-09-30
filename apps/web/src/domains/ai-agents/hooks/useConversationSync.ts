'use client';

import { useEffect, useCallback } from 'react';
import { useConversationStore } from '../stores/conversationStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WebSocketMessage } from '@/types/agents';

interface ConversationSyncOptions {
  autoReconnect?: boolean;
  heartbeatInterval?: number;
  onConnectionChange?: (connected: boolean) => void;
  onSyncError?: (error: any) => void;
}

export function useConversationSync(
  sessionId: string | null,
  options: ConversationSyncOptions = {}
) {
  const {
    autoReconnect = true,
    heartbeatInterval = 30000,
    onConnectionChange,
    onSyncError,
  } = options;

  const { syncWithWebSocket, activeConversation } = useConversationStore();

  // Create WebSocket URL based on session
  const wsUrl = sessionId ? `/api/conversations/${sessionId}/ws` : null;

  const handleMessage = useCallback((data: WebSocketMessage) => {
    try {
      // Sync message with conversation store
      syncWithWebSocket(data);
    } catch (error) {
      console.error('Failed to sync WebSocket message:', error);
      onSyncError?.(error);
    }
  }, [syncWithWebSocket, onSyncError]);

  const handleConnect = useCallback(() => {
    console.log(`Connected to conversation ${sessionId}`);
    onConnectionChange?.(true);
  }, [sessionId, onConnectionChange]);

  const handleDisconnect = useCallback(() => {
    console.log(`Disconnected from conversation ${sessionId}`);
    onConnectionChange?.(false);
  }, [sessionId, onConnectionChange]);

  const handleError = useCallback((error: Event) => {
    console.error('WebSocket connection error:', error);
    onSyncError?.(error);
  }, [onSyncError]);

  const { socket, isConnected, connectionState, sendMessage } = useWebSocket(wsUrl, {
    reconnectAttempts: autoReconnect ? 5 : 0,
    reconnectInterval: 3000,
    heartbeatInterval,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onError: handleError,
    onMessage: handleMessage,
  });

  // Join conversation room when connected
  useEffect(() => {
    if (socket && isConnected && sessionId) {
      sendMessage({
        type: 'join-conversation',
        sessionId,
        timestamp: Date.now(),
      });

      return () => {
        sendMessage({
          type: 'leave-conversation',
          sessionId,
          timestamp: Date.now(),
        });
      };
    }
  }, [socket, isConnected, sessionId, sendMessage]);

  // Send conversation events to backend
  const sendConversationEvent = useCallback((
    type: string,
    data: any
  ) => {
    if (!isConnected || !sessionId) {
      return false;
    }

    return sendMessage({
      type,
      data,
      sessionId,
      timestamp: Date.now(),
    });
  }, [isConnected, sessionId, sendMessage]);

  return {
    isConnected,
    connectionState,
    sendConversationEvent,
    activeSession: sessionId,
  };
}

export default useConversationSync;