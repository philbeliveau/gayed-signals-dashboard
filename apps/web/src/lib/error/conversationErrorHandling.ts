'use client';

import { useCallback, useEffect, useState } from 'react';
import { useConversationStore } from '@/domains/ai-agents/stores/conversationStore';
import { conversationSessionManager } from '@/lib/session/conversationSession';

export type ConversationErrorType =
  | 'websocket_connection_failed'
  | 'session_load_failed'
  | 'session_save_failed'
  | 'message_processing_failed'
  | 'storage_quota_exceeded'
  | 'network_error'
  | 'authentication_error'
  | 'validation_error'
  | 'unknown_error';

export interface ConversationError {
  type: ConversationErrorType;
  message: string;
  details?: any;
  timestamp: number;
  sessionId?: string;
  recoverable: boolean;
  retryable: boolean;
}

export interface RecoveryAction {
  label: string;
  action: () => Promise<boolean>;
  destructive?: boolean;
}

/**
 * Hook for comprehensive conversation error handling and recovery
 */
export function useConversationErrorHandling() {
  const [errors, setErrors] = useState<ConversationError[]>([]);
  const [isRecovering, setIsRecovering] = useState(false);

  const { activeConversation, clearActiveConversation, updateStatus } = useConversationStore();

  // Error reporting function
  const reportError = useCallback((
    type: ConversationErrorType,
    message: string,
    details?: any,
    sessionId?: string
  ): ConversationError => {
    const error: ConversationError = {
      type,
      message,
      details,
      timestamp: Date.now(),
      sessionId: sessionId || activeConversation.sessionId || undefined,
      recoverable: isRecoverableError(type),
      retryable: isRetryableError(type),
    };

    setErrors(prev => [error, ...prev.slice(0, 9)]); // Keep last 10 errors

    // Log to console for debugging
    console.error('Conversation error:', error);

    // Update conversation status if it's related to active session
    if (sessionId === activeConversation.sessionId || (!sessionId && activeConversation.sessionId)) {
      updateStatus('error');
    }

    return error;
  }, [activeConversation.sessionId, updateStatus]);

  // Clear errors
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // Clear specific error
  const clearError = useCallback((timestamp: number) => {
    setErrors(prev => prev.filter(error => error.timestamp !== timestamp));
  }, []);

  // Recovery actions for different error types
  const getRecoveryActions = useCallback((error: ConversationError): RecoveryAction[] => {
    const actions: RecoveryAction[] = [];

    switch (error.type) {
      case 'websocket_connection_failed':
        actions.push({
          label: 'Retry Connection',
          action: async () => {
            try {
              // Trigger WebSocket reconnection
              window.location.reload();
              return true;
            } catch {
              return false;
            }
          },
        });
        break;

      case 'session_load_failed':
        actions.push({
          label: 'Reload Session',
          action: async () => {
            try {
              if (error.sessionId) {
                const session = conversationSessionManager.getConversationById(error.sessionId);
                return !!session;
              }
              return false;
            } catch {
              return false;
            }
          },
        });
        actions.push({
          label: 'Start New Session',
          action: async () => {
            clearActiveConversation();
            return true;
          },
          destructive: true,
        });
        break;

      case 'session_save_failed':
        actions.push({
          label: 'Retry Save',
          action: async () => {
            try {
              // Attempt to save current conversation state
              if (activeConversation.sessionId) {
                // Convert current state to session format and save
                const session = {
                  id: activeConversation.sessionId,
                  userId: '', // Will be populated by auth context
                  contentSource: activeConversation.contentSource || 'text',
                  status: 'completed' as const,
                  messages: activeConversation.messages.map(msg => ({
                    id: msg.id,
                    agentName: msg.agent,
                    agentType: msg.agent as any,
                    role: msg.agent,
                    message: msg.content,
                    timestamp: new Date(msg.timestamp).toISOString(),
                    confidence: msg.confidence,
                  })),
                  createdAt: activeConversation.startedAt?.toISOString() || new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  metadata: activeConversation.sourceMetadata,
                };

                await conversationSessionManager.saveConversation(session);
                return true;
              }
              return false;
            } catch {
              return false;
            }
          },
        });
        break;

      case 'storage_quota_exceeded':
        actions.push({
          label: 'Clean Old Sessions',
          action: async () => {
            try {
              conversationSessionManager.cleanupOldSessions();
              return true;
            } catch {
              return false;
            }
          },
        });
        actions.push({
          label: 'Export & Clear History',
          action: async () => {
            try {
              // Trigger download of conversation history
              const data = conversationSessionManager.exportConversations();
              downloadConversationBackup(data);

              // Clear history after export
              useConversationStore.getState().clearHistory();
              return true;
            } catch {
              return false;
            }
          },
          destructive: true,
        });
        break;

      case 'network_error':
        actions.push({
          label: 'Retry Request',
          action: async () => {
            // Generic retry - specific implementation depends on context
            return false;
          },
        });
        break;

      case 'authentication_error':
        actions.push({
          label: 'Refresh Authentication',
          action: async () => {
            try {
              // Trigger auth refresh
              window.location.href = '/api/auth/refresh';
              return true;
            } catch {
              return false;
            }
          },
        });
        break;

      default:
        actions.push({
          label: 'Reset Session',
          action: async () => {
            clearActiveConversation();
            return true;
          },
          destructive: true,
        });
        break;
    }

    return actions;
  }, [activeConversation, clearActiveConversation]);

  // Execute recovery action
  const executeRecovery = useCallback(async (
    error: ConversationError,
    actionIndex: number
  ): Promise<boolean> => {
    const actions = getRecoveryActions(error);
    const action = actions[actionIndex];

    if (!action) return false;

    setIsRecovering(true);

    try {
      const success = await action.action();

      if (success) {
        clearError(error.timestamp);
      }

      return success;
    } catch (recoveryError) {
      console.error('Recovery action failed:', recoveryError);
      return false;
    } finally {
      setIsRecovering(false);
    }
  }, [getRecoveryActions, clearError]);

  // Auto-recovery for retryable errors
  useEffect(() => {
    const retryableErrors = errors.filter(error => error.retryable && !isRecovering);

    if (retryableErrors.length > 0) {
      const latestError = retryableErrors[0];
      const timeSinceError = Date.now() - latestError.timestamp;

      // Auto-retry after 5 seconds for retryable errors
      if (timeSinceError > 5000) {
        const actions = getRecoveryActions(latestError);
        const primaryAction = actions[0];

        if (primaryAction && !primaryAction.destructive) {
          executeRecovery(latestError, 0);
        }
      }
    }
  }, [errors, isRecovering, getRecoveryActions, executeRecovery]);

  return {
    errors,
    hasErrors: errors.length > 0,
    latestError: errors[0] || null,
    isRecovering,

    // Actions
    reportError,
    clearErrors,
    clearError,
    getRecoveryActions,
    executeRecovery,
  };
}

/**
 * Determine if an error type is recoverable
 */
function isRecoverableError(type: ConversationErrorType): boolean {
  const recoverableTypes: ConversationErrorType[] = [
    'websocket_connection_failed',
    'session_load_failed',
    'session_save_failed',
    'storage_quota_exceeded',
    'network_error',
  ];

  return recoverableTypes.includes(type);
}

/**
 * Determine if an error type is retryable automatically
 */
function isRetryableError(type: ConversationErrorType): boolean {
  const retryableTypes: ConversationErrorType[] = [
    'websocket_connection_failed',
    'network_error',
    'session_save_failed',
  ];

  return retryableTypes.includes(type);
}

/**
 * Download conversation backup file
 */
function downloadConversationBackup(data: string): void {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = `conversation-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Global error boundary for conversation-related errors
 */
export class ConversationErrorBoundary {
  private static instance: ConversationErrorBoundary;
  private errorHandlers: Set<(error: ConversationError) => void> = new Set();

  static getInstance(): ConversationErrorBoundary {
    if (!ConversationErrorBoundary.instance) {
      ConversationErrorBoundary.instance = new ConversationErrorBoundary();
    }
    return ConversationErrorBoundary.instance;
  }

  addErrorHandler(handler: (error: ConversationError) => void): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  reportGlobalError(
    type: ConversationErrorType,
    message: string,
    details?: any,
    sessionId?: string
  ): void {
    const error: ConversationError = {
      type,
      message,
      details,
      timestamp: Date.now(),
      sessionId,
      recoverable: isRecoverableError(type),
      retryable: isRetryableError(type),
    };

    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (handlerError) {
        console.error('Error handler failed:', handlerError);
      }
    });
  }
}

export default {
  useConversationErrorHandling,
  ConversationErrorBoundary,
};